# Proposal: Inline Section Editing

## Intent

Users can only select from existing items in the editor. They cannot add new
skills, experiences, education, or projects — all operations that require
modifying the base pool (`data/cv.json`).

## Scope

### In Scope
- Add skill item to existing category (e.g., add "Python" to "Languages")
- Create new skill category with items
- Add new experience entry (company, role, dates, bullets)
- Add new education entry (institution, degree, field, dates)
- Add new project entry (name, description, url, technologies, bullets)
- Auto-select new items in active version
- Persist base pool changes via `POST /api/save`

### Out of Scope
- Delete or edit existing base-pool items (use JSON files directly)
- Reorder items in the base pool
- Undo/redo for base pool changes

## Capabilities

### New Capabilities
- `inline-section-editing`: Inline creation forms in the editor panel. New items
  write to the base pool and auto-select in the active version.

### Modified Capabilities
None — no existing specs in `openspec/specs/`.

## Approach

1. **DataStore**: Expose `generateId()`, add `saveBase()` → sends
   `{ path: 'data/cv.json', content: state.base }` to `POST /api/save`.
   Already supported by `serve.js` — no server changes needed.
2. **Editor**: Add expandable inline forms at the bottom of each section.
   Each form generates a unique ID, pushes to the base pool via `updateBase()`,
   auto-selects in the version via `updateVersion()`, then calls `saveBase()`.
3. **Auto-selection**: After a base mutation, immediately append the new item ID
   (or category name for skills) to the version's corresponding `selected*` array.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `js/data-store.js` | Modified | Expose `generateId`, add `saveBase()` |
| `js/editor.js` | Modified | Inline forms per section, wired to DataStore |
| `serve.js` | None | Already supports saving to any path |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Duplicate IDs on rapid adds | Low | `crypto.randomUUID()` via `generateId()` |
| Save conflicts (base vs version) | Low | Base save is fire-and-forget after version save |
| UI clutter from many inline forms | Medium | Expandable forms, hidden by default |

## Rollback Plan

Revert changes to `js/data-store.js` and `js/editor.js`. No schema changes —
existing data is unaffected.

## Dependencies

None.

## Success Criteria

- [ ] Add "Python" to "Languages" category → appears in preview immediately
- [ ] Create a new skill category with items → visible and auto-selected
- [ ] Add a new experience → auto-selected in preview
- [ ] Add a new education entry → auto-selected in preview
- [ ] Add a new project → auto-selected in preview
- [ ] All new items persist after page reload (base pool written to disk)
