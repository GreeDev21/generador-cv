# Tasks: Photo Upload + Modern Template

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 360–455 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: API + Data Model → PR 2: Templates + Editor + CSS |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | API endpoint + DataStore photo support | PR 1 (base: develop) | Independent; no UI dependency |
| 2 | Modern template + Harvard photo + Editor UI + CSS | PR 2 (base: PR 1 branch) | Depends on PR 1 for `uploadPhoto()` |

## Phase 1: Dependency

- [ ] 1.1 Add `"@vercel/blob": "^0.24.0"` to `package.json` dependencies and run `npm install`

## Phase 2: API

- [ ] 2.1 Create `api/cv/photo.js` with method routing (POST + GET), mirroring `api/cv/pool.js` auth pattern via `require('../_lib/auth')` and `require('../_lib/db')`
- [ ] 2.2 POST handler: parse multipart via `await req.formData()`, validate MIME (`image/png`, `image/jpeg`, `image/webp`) → 415, validate size ≤2MB → 413, call `put()` from `@vercel/blob`, delete old blob if `personalInfo.photo` exists, UPDATE `cv_pools` JSON path `personalInfo.photo`, return `{ url, filename }`
- [ ] 2.3 GET handler: extract `?token=` query param, call `requireAuth` with query-based JWT, SELECT `data->'personalInfo'->>'photo'` from `cv_pools`, 404 if null, `fetch(blobUrl)` and pipe response with forwarded `Content-Type`

## Phase 3: Data Model

- [ ] 3.1 In `js/data-store.js` line 344 seed block: add `photo: ''` inside `personalInfo: {}` for new users
- [ ] 3.2 Add `uploadPhoto(file)` to public API: build `FormData`, raw `fetch` to `/api/cv/photo` with Bearer token, on success call `updateBase('personalInfo.photo', url)` and `emitChange()`, return URL or null on failure

## Phase 4: Templates

- [ ] 4.1 Create `js/templates/modern.js` as self-registering IIFE: `GreedevCV.Templates.register('modern', render)`. 2-column HTML: `.md-sidebar` (photo `<img class="md-photo">` if `data.personalInfo?.photo`, contact links, skills) + `.md-main` (summary, experience, education, projects). Reuse Harvard heading translation map and section-rendering logic
- [ ] 4.2 In `js/templates/harvard.js` header section: add conditional `<img class="hr-photo" src="...">` when `data.personalInfo?.photo` is truthy, before the name element

## Phase 5: Editor + CSS Integration

- [ ] 5.1 In `js/editor.js` Personal Info section (after line 668): add photo preview `<img>` + hidden file input + "Upload Photo" button. On file select: show instant preview, call `DataStore.uploadPhoto(file)`, update preview on success
- [ ] 5.2 In `css/styles.css`: add `.hr-photo` (circular, 80px, header float), `.md-sidebar` / `.md-photo` / `.md-main` (2-col layout, scoped styles), `.photo-upload-*` (preview, button, file input hidden wrapper)

## Verification

- [ ] V.1 Deploy to Vercel: upload PNG/JPG/WEBP → verify URL saved in DB and preview updates
- [ ] V.2 Test rejection: upload .gif → expect 415; upload >2MB → expect 413
- [ ] V.3 Toggle template to "modern" → verify sidebar with photo renders; toggle to "harvard" → verify photo in header
- [ ] V.4 Confirm template selector lists both "harvard" and "modern"
