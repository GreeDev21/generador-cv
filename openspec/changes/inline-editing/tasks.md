# Tasks: Inline Section Editing

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 340–380 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |

### Suggested Work Units

| Unit | Goal | Notes |
|------|------|-------|
| 1 | DataStore additions | Expose `generateId`, extract `saveToServer`, add `saveBase` |
| 2 | Skills forms | "Add item to category" + "New category" forms |
| 3 | Experience form | Collapsible form, validation, submit with auto-select |
| 4 | Education form | Collapsible form, validation, submit with auto-select |
| 5 | Projects form | Collapsible form, technologies parsing, submit with auto-select |
| 6 | CSS | Inline-form classes, validation error styles |

All units fit within a single PR (~360 lines). No chained PRs needed.

---

## Phase 1: DataStore Additions

- [ ] 1.1 Expose `generateId()` on `GreedevCV.DataStore` public API — add `generateId: generateId` to the export object at the bottom of `js/data-store.js`. Already exists as a private function; no implementation change.

- [ ] 1.2 Extract internal `saveToServer(path, content)` helper from the existing `save()` method in `js/data-store.js`. Move the `fetch` POST + Blob download fallback + `GreedevCV:saved` dispatch into a separate function that both `save()` and the new `saveBase()` will call. `save()` delegates its logic to `saveToServer()`. No behavioral change to `save()`.

- [ ] 1.3 Add `saveBase()` public method to `GreedevCV.DataStore` in `js/data-store.js`. Calls `saveToServer('data/cv.json', state.base)`. Guards against `state.base === null` (return `false`). Returns `true`/`false` per the shared helper. Does NOT save the active version — only the base pool.

## Phase 2: Skills Inline Editing

- [ ] 2.1 Add "Add item to category" form in the Skills section of the editor (`js/editor.js`, `buildEditorHtml()`). Form includes: category dropdown (`<select>` populated from `base.skills[].category`), item name `<input>` (required), Add + Cancel buttons. Add submit handler in `handleClick()` that validates item name non-empty, finds the category by name in `base.skills`, pushes the new item to `.items`, calls `ds.updateBase('skills', updatedArray)`, then `ds.saveBase()`. No `selectedSkills` mutation.

- [ ] 2.2 Add "New category" form in the Skills section below the add-item form (`js/editor.js`, `buildEditorHtml()`). Form includes: category name `<input>` (required), items `<input>` (comma-separated, required), Add + Cancel buttons. Add submit handler in `handleClick()` that validates both fields, calls `ds.generateId()`, constructs a skill object `{ id, category, items }`, appends to `base.skills`, pushes category to `version.selectedSkills`, calls `ds.updateBase()`, `ds.updateVersion()`, and `ds.saveBase()`.

## Phase 3: Experience Inline Editing

- [ ] 3.1 Add collapsible experience creation form at the bottom of the Experience section (`js/editor.js`, `buildEditorHtml()`). Fields: company (req), role (req), location, startDate (req, YYYY-MM), endDate (YYYY-MM), current (checkbox), bullets (textarea). Add submit handler in `handleClick()` that validates company, role, startDate non-empty; when current is checked, clears and disables endDate, stores `endDate: null`, `current: true`. Calls `ds.generateId()`, constructs experience object matching base schema, appends to `base.experiences`, pushes ID to `version.selectedExperiences`, calls `ds.updateBase()`, `ds.updateVersion()`, `ds.saveBase()`. Auto-resets form after submit.

## Phase 4: Education Inline Editing

- [ ] 4.1 Add collapsible education creation form at the bottom of the Education section (`js/editor.js`, `buildEditorHtml()`). Fields: institution (req), degree (req), field (req), startDate (req, YYYY-MM), endDate (YYYY-MM), gpa, current (checkbox). Add submit handler in `handleClick()` that validates institution, degree, field, startDate non-empty; `current` clears endDate. Constructs education object with `achievements: []`. Appends to `base.education`, pushes ID to `version.selectedEducation`, calls `ds.updateBase()`, `ds.updateVersion()`, `ds.saveBase()`. Auto-resets form after submit.

## Phase 5: Projects Inline Editing

- [ ] 5.1 Add collapsible project creation form at the bottom of the Projects section (`js/editor.js`, `buildEditorHtml()`). Fields: name (req), description (textarea), url, technologies (comma-separated text), bullets (textarea). Add submit handler in `handleClick()` that validates name non-empty; parses technologies via `input.split(',').map(t => t.trim()).filter(Boolean)`; parses bullets by splitting textarea on newlines. Constructs project object, appends to `base.projects`, pushes ID to `version.selectedProjects`, calls `ds.updateBase()`, `ds.updateVersion()`, `ds.saveBase()`. Auto-resets form after submit.

## Phase 6: CSS

- [ ] 6.1 Add inline-form CSS classes to `css/styles.css`:
  - `.inline-form` — container, `display: none` by default
  - `.inline-form.open` — visible state, `display: block`, add top margin for spacing from selectors above
  - `.inline-form-toggle` — "+ Add ..." button styled similar to `.add-bullet` (dashed border, primary color)
  - `.inline-form-actions` — flex row for Add/Cancel buttons, gap between them, top margin
  - `.inline-form-field` — form field wrapper (label + input/select/textarea stacked vertically), bottom margin
  - `.inline-form-error` — validation message, `display: none` by default, red text, small font
  - `.inline-form-error.visible` — shows validation message

All new classes at the end of the file, before the responsive section.
