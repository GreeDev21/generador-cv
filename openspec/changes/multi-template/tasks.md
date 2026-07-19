# Tasks: Multi-Template Support

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300–400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Foundation + Extraction (~180 lines) → PR 2: Integration (~170 lines) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Registry + Harvard extraction | PR 1 | Foundation; harvard.js self-contained, zero integration risk |
| 2 | Dispatcher refactor + wiring | PR 2 | Depends on PR 1; modifies preview.js, editor.js, data-store.js, CSS, HTML |

## Phase 1: Foundation — Registry

- [ ] 1.1 Create `js/templates/registry.js` — `GreedevCV.Templates` namespace with `register(name, renderFn)`, `get(name)`, `list()`. Pure JS, no DOM access.
- [ ] 1.2 Verify: in browser console, call `GreedevCV.Templates.register("test", () => "ok")`, `get("test")` returns function, `list()` includes `"test"`, `get("foo")` returns `undefined`.

## Phase 2: Extraction — Harvard Template

- [ ] 2.1 Create `js/templates/harvard.js` — extract `renderPreview()` body + helpers (`t()`, `formatDate()`, `buildContactLine()`, `HEADINGS`, `SKILL_CATEGORIES`) from `preview.js` into `GreedevCV.Templates.Harvard.render(data)`. Self-registers as `"harvard"` via `GreedevCV.Templates.register()`.
- [ ] 2.2 Add `<script>` tags for `js/templates/registry.js` and `js/templates/harvard.js` in `index.html` before `app.js`.
- [ ] 2.3 Verify: app loads without errors; `GreedevCV.Templates.get("harvard")` returns a function; `list()` includes `"harvard"`.

## Phase 3: Refactor — Preview Dispatcher

- [x] 3.1 Modify `js/preview.js` — remove `renderPreview()`, `t()`, `formatDate()`, `buildContactLine()`, `HEADINGS`, `SKILL_CATEGORIES`. Add `resolveAndRender(data)` that reads `versionConfig.template`, resolves via `registry.get()`, falls back to `"harvard"` + `console.warn`. Add `language` to `buildRenderData()` return.
- [x] 3.2 Modify `js/data-store.js` — add `template: "harvard"` to `buildVersionConfig()` default object (~line 284).
- [ ] 3.3 Verify: preview renders Harvard identically. Existing versions (no `template` field) default to `"harvard"`.

## Phase 4: Integration — Editor + CSS

- [x] 4.1 Modify `css/styles.css` — rename `.preview-*` classes to `.hr-*` (header, section, entry, bullets, skills). Keep `.preview-panel`, `.preview-empty` as shared infrastructure.
- [x] 4.2 Modify `js/editor.js` — add version settings section at top of `buildEditorHtml()` with `<select>` populated via `GreedevCV.Templates.list()`. Change handler calls `ds.updateVersion('template', value)`.
- [ ] 4.3 Verify: Harvard preview renders with `.hr-*` classes. Dropdown shows `"harvard"`. Switching template re-renders without page reload. Unsaved edits preserved during switch.

## Phase 5: Verification

- [ ] 5.1 Diff check: screenshot preview panel before and after change — must be pixel-identical.
- [ ] 5.2 Test fallback: set `template: "nonexistent"` in localStorage draft, reload, verify console.warn and Harvard renders.
- [ ] 5.3 Test persistence: select template, reload, verify version renders with chosen template.
