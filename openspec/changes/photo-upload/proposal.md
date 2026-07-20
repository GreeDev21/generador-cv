# Proposal: Photo Upload + Modern Template

## Intent

Users need a profile photo on their CV. Agregar upload con Vercel Blob, un template Modern con sidebar que muestre la foto, y agregar foto al header del template Harvard existente.

## Scope

### In Scope
- `npm install @vercel/blob` + `api/cv/photo.js` — Vercel Function POST upload
- `personalInfo.photo` (string URL) en schema — `data-store.js` agrega `uploadPhoto(file)`
- Upload UI en editor: file input + preview (`js/editor.js`)
- `js/templates/modern.js` — template `"modern"` con sidebar (foto + contacto)
- `js/templates/harvard.js` — foto condicional en header
- `css/styles.css` — estilos upload, modern template, harvard photo

### Out of Scope
- Múltiples imágenes, edición/crop, almacenamiento local sin Blob

## Capabilities

### New Capabilities
- `photo-upload`: Upload foto via Vercel Blob, guardar URL en `personalInfo.photo`, mostrar en editor y templates

### Modified Capabilities
- `template-management`: Agregar template `"modern"`. Harvard template actualizado para mostrar foto condicionalmente.

## Approach

1. **API**: `api/cv/photo.js` POST — recibe file, llama `@vercel/blob put()`, devuelve `{ url }`. Requiere `BLOB_READ_WRITE_TOKEN`.
2. **DataStore**: `uploadPhoto(file)` → POST a `/api/cv/photo` → guarda URL via `updateBase('personalInfo.photo', url)`. Schema extendido — additive.
3. **Editor**: File input + preview img en Personal Info. Muestra foto existente si hay URL.
4. **Modern**: Layout 2-col (sidebar `.md-sidebar` con foto + contacto). CSS scoped `.md-*`.
5. **Harvard**: `<img class="hr-photo">` en header, solo si `photo` existe.

## Affected Areas

| Area | Impact |
|------|--------|
| `api/cv/photo.js` | New |
| `package.json` | Modified (dep) |
| `js/data-store.js` | Modified |
| `js/editor.js` | Modified |
| `js/templates/modern.js` | New |
| `js/templates/harvard.js` | Modified |
| `css/styles.css` | Modified |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `BLOB_READ_WRITE_TOKEN` not set | Low | Return 500 with clear message |
| Large upload (>4MB) | Low | Reject API + client-side |
| Missing `photo` in existing data | Low | Defaults to `undefined` — templates check before render |

## Rollback Plan

1. Remove `api/cv/photo.js` + `@vercel/blob` dep
2. Revert `data-store.js`, `editor.js`, `harvard.js`, `styles.css`
3. Delete `templates/modern.js`
4. Re-deploy — no data loss (additive field)

## Dependencies

- `BLOB_READ_WRITE_TOKEN` env var
- `@vercel/blob` npm package

## Success Criteria

- [ ] Upload PNG/JPG guarda URL en `personalInfo.photo` y persiste
- [ ] Modern template muestra foto en sidebar + layout correcto
- [ ] Harvard header muestra foto si `photo` existe
- [ ] Preview re-renderiza post-upload sin recargar
- [ ] Template selector incluye `"modern"` y cambia preview sin perder datos
