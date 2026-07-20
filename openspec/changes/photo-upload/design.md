# Design: Photo Upload + Modern Template

## Technical Approach

Single `api/cv/photo.js` handling both POST (upload) and GET (serve) via method routing — same pattern as `pool.js`. Upload uses `@vercel/blob put()` with `@vercel/blob del()` for replacement. GET proxies the image through an authenticated endpoint so the real Blob URL is never exposed. Templates follow existing self-registering IIFE pattern. JWT passed as query param for `<img>` tags (can't set Bearer headers from markup).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `api/cv/photo.js` single file vs POST/GET split | Single file mirrors `pool.js` pattern; split is cleaner for growing endpoints | **Single file** — matches codebase convention |
| JWT in query param for GET `<img>` vs cookie vs signed URL | Cookie leaks across origins; signed URL adds complexity; query param works with existing JWT + localStorage | **Query param** `?token=xxx` — minimal change, works with `<img src>` natively |
| Template Modern: standalone IIFE vs inline in registry | IIFE matches Harvard pattern exactly; inline violates separation | **Standalone `js/templates/modern.js`** — self-registers, same pattern as Harvard |
| Multipart upload: raw fetch vs apiFetch modification | `apiFetch` forces `Content-Type: application/json` which breaks `FormData`; modifying it risks existing callers | **Raw `fetch()` in `DataStore.uploadPhoto()`** — no risk to existing JSON endpoints |

## Data Flow

```
POST /api/cv/photo (multipart)
  Editor File Input → FormData → fetch(BEARER) → Vercel Function
    ├─ requireAuth → 401 if invalid
    ├─ validate MIME+size → 413/415 if invalid
    ├─ @vercel/blob put() → { url }
    ├─ GET old URL → @vercel/blob del() if replacing
    ├─ UPDATE cv_pools SET data->'personalInfo'->>'photo' = url
    └─ 200 { url }

GET /api/cv/photo?token=xxx
  <img src="..."> → Vercel Function
    ├─ requireAuth (query param) → 401 if invalid
    ├─ SELECT data->'personalInfo'->>'photo' FROM cv_pools
    ├─ if null → 404
    └─ fetch(blobUrl) → pipe response with correct Content-Type

Editor → DataStore.uploadPhoto(file)
  └─ on success: updateBase('personalInfo.photo', url) → emitChange → re-render
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `api/cv/photo.js` | Create | POST upload + GET serve with `@vercel/blob` |
| `package.json` | Modify | Add `@vercel/blob` dependency |
| `js/data-store.js` | Modify | Add `uploadPhoto(file)` to public API; add `personalInfo.photo: ''` to `buildDefaultData()` equivalent (line 344 seed data) |
| `js/editor.js` | Modify | Add photo preview `<img>`, file input, Upload/Remove buttons in Personal Info section |
| `js/templates/modern.js` | Create | 2-column layout template, self-registers as `"modern"` |
| `js/templates/harvard.js` | Modify | Conditional `<img class="hr-photo">` in header when `data.personalInfo.photo` exists |
| `css/styles.css` | Modify | Add `.hr-photo`, `.md-*` (modern template), and upload UI styles |

## Interfaces / Contracts

```js
// API POST /api/cv/photo
Request:  multipart/form-data { file: Blob }
Response: { url: string, filename: string }  // 200
Errors:   401, 413, 415, 500

// API GET /api/cv/photo?token=<jwt>
Response: image bytes with Content-Type header  // 200
Errors:   401, 404

// DataStore.uploadPhoto(file)
// Returns Promise<string|null> — the Blob URL or null on failure

// Template Modern
GreedevCV.Templates.register('modern', render);
// render(data) → HTML string, same contract as Harvard
// data.personalInfo.photo → string | undefined
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | POST upload valid/invalid files | Deploy to Vercel, test with curl |
| Manual | GET serve authenticated/anonymous | Browser `<img>` tag and curl |
| Manual | Editor upload flow | Browser file input → preview → save |
| Manual | Template render (modern + harvard photo) | Toggle templates in editor, verify DOM |

## Open Questions

- None — all decisions resolved against existing codebase patterns.
