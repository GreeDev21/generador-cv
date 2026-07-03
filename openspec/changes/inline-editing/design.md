# Design: Inline Section Editing

## Technical Approach

Extend `GreedevCV.DataStore` with `generateId()` and `saveBase()`, then add expandable inline forms at the bottom of each editor section (skills, experiences, education, projects). Each form validates required fields, creates a new item in the base pool via `updateBase()`, auto-selects it in the active version via `updateVersion()`, and persists the base pool to disk via `saveBase()` (fire-and-forget). Re-render is driven by the existing `GreedevCV:datachange` event — no new event wiring needed.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| Form location | Separate panel vs inline at bottom of each section | Inline keeps the add action in context with the selector list. User sees existing items, then the "+" button to add more. |
| Form visibility | Always visible vs toggle button | Toggle button ("+ Add experience") — avoids clutter. Four sections with visible forms would be overwhelming. |
| Save strategy | Batch all adds vs save per add | Save immediately after each add (fire-and-forget). No undo/redo for base mutations, so batching adds complexity without benefit. |
| Form reset | Manual clear vs auto-reset | Auto-reset after successful add. User can add multiple entries in sequence without manually clearing. |
| Validation | Toast vs inline messages | Inline validation next to each required field — consistent with form UX convention. Toast only for server errors (save failure). |
| Save helper | Two parallel fetch+fallback paths vs shared internal helper | Refactor `save()` into an internal `saveToServer(path, content)` that both `save()` and `saveBase()` call. Avoids duplicating the Blob fallback logic. |

## DataStore API Changes

### `GreedevCV.DataStore.generateId()`
- **Signature**: `function generateId() { ... }` → already exists as private function
- **Change**: add `generateId: generateId` to the public export object
- **Behavior**: `crypto.randomUUID()` when available, fallback `Date.now() + '-' + Math.random().toString(36).slice(2)`

### `GreedevCV.DataStore.saveBase()`
- **Signature**: `async function saveBase() → Promise<boolean>`
- **Description**: Persists `state.base` to `POST /api/save` with `{ path: 'data/cv.json', content: state.base }`
- **Fallback**: Blob download if server unreachable (same pattern as `save()`)
- **Guard**: returns `false` if `state.base` is null
- **Implementation**: refactor `save()` into a shared internal `saveToServer(path, content)` called by both public methods

### Internal refactor: `saveToServer(path, content)`
```js
function saveToServer(path, content) {
  // HTTP POST + Blob fallback (extracted from existing save())
  // dispatch('GreedevCV:saved', { source: 'server'|'local' })
  // return boolean
}
```

## Editor Inline Forms

All forms follow the same skeleton inside each section's `buildEditorHtml()`:

```html
<button type="button" class="inline-form-toggle">+ Add {item}</button>
<div class="inline-form">
  <!-- fields -->
  <div class="inline-form-actions">
    <button type="button" class="inline-form-submit">Add</button>
    <button type="button" class="inline-form-cancel">Cancel</button>
  </div>
</div>
```

### Skills Section — Two forms

**"Add item to category" form**:
- `<select>` populated from `base.skills[].category` (e.g. "Languages", "Frameworks")
- `<input type="text">` for item name (required)
- On submit: find category by name in `base.skills`, push item to `.items`, call `updateBase('skills', updatedArray)`, call `saveBase()`
- No `selectedSkills` mutation — category is already selected

**"New category" form**:
- `<input type="text">` for category name (required)
- `<input type="text">` for items (comma-separated, required)
- On submit: `generateId()`, create `{ id, category, items }`, append to base.skills, push category to `selectedSkills`, `updateBase()`, `updateVersion()`, `saveBase()`

### Experience Section

Fields: company (text, required), role (text, required), location (text), startDate (text, YYYY-MM, required), endDate (text, YYYY-MM), current (checkbox), bullets (textarea, optional).

On submit:
1. Validate company, role, startDate non-empty
2. `var id = ds.generateId();`
3. Construct object with the schema from `data/cv.json` experiences
4. Clone `base.experiences`, push new object → `ds.updateBase('experiences', updated)`
5. Clone `version.selectedExperiences`, push new ID → `ds.updateVersion('selectedExperiences', updated)`
6. `ds.saveBase()` fire-and-forget
7. Reset form fields

Current checkbox: when checked, clear and disable endDate field; store `endDate: null`, `current: true`.

### Education Section

Fields: institution (text, req), degree (text, req), field (text, req), startDate (text, YYYY-MM, req), endDate (text, YYYY-MM), gpa (text), current (checkbox).

On submit:
1. Validate institution, degree, field, startDate non-empty
2. `generateId()`, construct object with `achievements: []`
3. Push to `base.education` → `updateBase('education', updated)`
4. Push ID to `selectedEducation` → `updateVersion('selectedEducation', updated)`
5. `saveBase()` fire-and-forget

### Projects Section

Fields: name (text, req), description (textarea), url (text), technologies (text, comma-separated), bullets (textarea).

On submit:
1. Validate name non-empty
2. `generateId()`, parse technologies: `input.split(',').map(t => t.trim()).filter(Boolean)`
3. Parse bullets: split textarea by newline, filter empty
4. Push to `base.projects` → `updateBase('projects', updated)`
5. Push ID to `selectedProjects` → `updateVersion('selectedProjects', updated)`
6. `saveBase()` fire-and-forget

## Data Flow (per add operation)

```
User fills form → clicks "Add"
       ↓
Editor validates required fields
  invalid → show inline messages
       ↓ valid
Editor calls DataStore.generateId() → UUID string
       ↓
Editor constructs new item object (matches base schema)
       ↓
Editor clones base array → push new item → updateBase(path, array)
       ↓
Editor clones version selected* array → push new ID → updateVersion(path, array)
       ↓
Editor calls saveBase() (fire-and-forget — no await)
       ↓
updateBase/updateVersion → setState → debounced saveDraft → emitChange()
       ↓
  Editor re-renders (GreedevCV:datachange) → Preview re-renders
       ↓
  saveBase() → POST /api/save → { path: 'data/cv.json', content: base }
    success → GreedevCV:saved { source: 'server' }
    fail    → Blob download → GreedevCV:saved { source: 'local' }
```

## CSS Additions

| Class | Purpose |
|-------|---------|
| `.inline-form` | Container, hidden by default (`display: none`) |
| `.inline-form.open` | Visible state (`display: block`) |
| `.inline-form-toggle` | "+ Add ..." button |
| `.inline-form-actions` | Flex row for Add/Cancel buttons |
| `.inline-form-field` | Form field wrapper (label + input) |
| `.inline-form-error` | Validation message (hidden by default) |
| `.inline-form-error.visible` | Shows validation message |

No new CSS imports — add these classes to the existing `styles.css`.

## Error Handling

| Scenario | Detection | UX |
|----------|-----------|-----|
| Required field empty on submit | Check `value.trim() === ''` | Show `.inline-form-error.visible` below the field, e.g. "Company is required" |
| `saveBase()` server unreachable | `fetch` throws | Toast notification: "Base pool saved locally. Server unavailable." |
| `state.base` null on `saveBase()` | Guard clause | Return `false`, no feedback needed (cannot happen during normal flow) |
| Multiple rapid submits | Disable submit button after first click | Prevent duplicate items with same ID |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `js/data-store.js` | Modify | Expose `generateId`, add `saveBase()`, refactor `save()` via `saveToServer()` internal helper |
| `js/editor.js` | Modify | Add inline forms HTML in `buildEditorHtml()`, add form handlers in `handleClick()`, add validation |
| `css/styles.css` | Modify | Add inline-form CSS classes |

## Data Schema Reference

New items MUST match existing base pool schema exactly:

```
experience: { id, company, role, location, startDate, endDate, current, bullets }
education:  { id, institution, degree, field, startDate, endDate, current, gpa, achievements }
skill:      { id, category, items }
project:    { id, name, description, technologies, url, bullets }
```

All new items are pushed to the END of their respective arrays. No reordering.

## Open Questions

None — all design decisions are resolved by the specs and proposal.
