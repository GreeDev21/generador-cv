# Design: Multi-Template Support

## Technical Approach

Strategy Pattern + Registry, zero framework. Extract the Harvard renderer from `preview.js` into a pluggable template module. `preview.js` becomes a thin dispatcher that resolves the active template from `versionConfig.template`, delegates `render(data)`, and inserts the returned HTML.

## Architecture Decisions

### Decision: Strategy Pattern with Global Registry

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Switch/case in preview.js | Tight coupling, every new template modifies core | ❌ |
| **Strategy + `GreedevCV.Templates`** | Each template is self-contained, core is stable | ✅ |
| Web Components / Shadow DOM | Over-engineered for zero-build project, no style leaks needed | ❌ |

### Decision: `render(data)` Returns HTML String

Template renderers are pure functions — receive composed data, return HTML. No DOM access, no side effects. The preview dispatcher handles `innerHTML` assignment.

### Decision: CSS `.hr-*` Prefix

All existing `.preview-*` classes become `.hr-*`. Shared infrastructure (`.preview-panel`, `.preview-empty`) stays as-is. Each template gets a unique prefix (`.hr-`, `.md-`). No style leaks between templates.

### Decision: `template` Field in Version Config

Field `template: "harvard"` added to `buildVersionConfig()`. Nullish coalescing in preview dispatcher ensures `versionConfig.template || 'harvard'` — existing versions without the field default safely.

## Data Flow

```
DataStore.getState()
       │
       ▼
buildRenderData(base, version, language)
       │  (returns { personalInfo, summary, sections, experiences, … , language })
       ▼
preview.js dispatcher
       │
       ├─ resolves versionConfig.template → registry.get(name)
       ├─ fallback: 'harvard' + console.warn
       │
       ▼
template.render(data)
       │  (returns HTML string)
       ▼
container.innerHTML = html
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `js/templates/registry.js` | **Create** | `GreedevCV.Templates` namespace: `register(name, renderFn)`, `get(name)`, `list()` |
| `js/templates/harvard.js` | **Create** | Extracted render logic from `preview.js` as `GreedevCV.Templates.Harvard.render(data)` + self-registers as `"harvard"` |
| `js/preview.js` | **Modify** | Remove `renderPreview()`, `t()`, `formatDate()`, `buildContactLine()`, `HEADINGS`, `SKILL_CATEGORIES`. Keep: `buildRenderData()` (add `language` to return), event handlers, `container`. Add internal `resolveAndRender(data)` dispatcher |
| `js/data-store.js` | **Modify** | Add `template: "harvard"` to `buildVersionConfig()` default object (line ~284) |
| `js/editor.js` | **Modify** | Add version settings section at top of `buildEditorHtml()` with `<select>` for templates, populated via `GreedevCV.Templates.list()`. Change handler calls `ds.updateVersion('template', value)` |
| `css/styles.css` | **Modify** | Rename `.preview-*` classes to `.hr-*` (header, section, entry, bullets, skills). Keep `.preview-panel`, `.preview-empty` as shared |
| `index.html` | **Modify** | Add `<script>` tags for `js/templates/registry.js` and `js/templates/harvard.js` before `app.js` |

## Interfaces / Contracts

### Template Registry (`window.GreedevCV.Templates`)

```js
/**
 * Register a template renderer.
 * @param {string} name     — unique key, e.g. "harvard"
 * @param {Function} render — function(data) → HTML string
 */
register(name, renderFn)

/**
 * Get a registered renderer by name.
 * @param {string} name
 * @returns {Function|undefined}
 */
get(name)

/**
 * List all registered template names.
 * @returns {string[]}
 */
list()
```

### Renderer Contract

```js
/**
 * @param {object} data — composed data from buildRenderData()
 *   { personalInfo, summary, sections, experiences, education,
 *     skills, projects, language }
 * @returns {string} HTML string (no DOM access)
 */
function render(data) { /* ... */ }
```

### Version Config Change

```js
// Added to buildVersionConfig() return object:
template: "harvard"   // string — name of active template
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| **Diff** | Harvard renders identically after extraction | Manual diff: load app, screenshot before/after. Compare pixel output of preview panel. Any visual diff = bug |
| **Registry** | register/get/list round-trip | Open browser console, call `GreedevCV.Templates.register/get/list`, verify |
| **Fallback** | Unknown template falls to harvard | Set `template: "nonexistent"` in localStorage draft, reload, verify console.warn and harvard render |
| **Editor** | Template selector populates + switches | Open dropdown, verify options match registered templates. Select, verify preview re-renders |

## Migration / Rollback

No migration. Existing version configs lack `template` — dispatcher defaults to `"harvard"`. Rollback: `git checkout -- js/ css/` + remove `js/templates/` dir + revert `index.html` script tags.

## Open Questions

- None — approach, decisions, and contracts are fully specified by proposal and spec.
