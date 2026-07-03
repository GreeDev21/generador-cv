# Tasks: CV Manager

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 750-900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | serve.js+DataStore → Preview+Editor → App+CSS |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | serve.js + DataStore + data files | PR 1 | Server + data layer, standalone foundation |
| 2 | Preview + Editor | PR 2 | Depends on PR 1; all UI rendering |
| 3 | App orchestrator + index.html + CSS | PR 3 | Depends on PR 2; wiring + polish |

## Phase 1: Server + Data Files

- [x] 1.1 Create `serve.js` — Node stdlib HTTP: GET static serving, POST /api/save, path traversal check (reject `..`), PORT env (default 3000), MIME types, 404 handler, plus GET /api/versions endpoint
- [x] 1.2 Create `data/cv.json` — sample base pool with personalInfo, summary, 2+ experiences, education, 2+ skill categories, projects
- [x] 1.3 Create `data/versions/default.json` (was full.json) — sample version config with selected items, section toggles, custom bullet overrides

## Phase 2: DataStore Module

- [x] 2.1 Create `js/data-store.js` IIFE on `GreedevCV.DataStore` — `init()` fetches cv.json + versions list, `getState()`, `setActiveVersion(id)`, schema validation, `GreedevCV:datachange` event dispatch, `updateBase()`, `updateVersion()`, `save()`, `newVersion()`, `deleteVersion()`
- [ ] 2.2 Add `update(path, value)` with dot-path mutate, debounced localStorage `greedevcv-draft` at 500ms, draft restore on init with offer prompt
- [ ] 2.3 Add `saveToServer()` with POST + Blob download fallback, `newVersion()`, `duplicateVersion(id)`, `deleteVersion(id)` with last-version guard

## Phase 3: Preview Module

- [x] 3.1 Create `preview.js` IIFE on `GreedevCV.Preview` — renders Harvard template: header (name + contact), summary paragraph, experience entries (right-aligned dates, bullets), education, skills by category, projects
- [x] 3.2 Add event subscription to `GreedevCV:datachange`, 100ms debounced re-render, bullet override merge from `experienceBullets`, conditional section rendering when toggled off or empty

## Phase 4: Editor Module

- [x] 4.1 Create `editor.js` IIFE on `GreedevCV.Editor` — personalInfo form, summary textarea + char count, section visibility toggles, generic `data-path` onChange calling `DataStore.updateBase/updateVersion`, subscribe to datachange for re-render
- [x] 4.2 Add section selectors: checkboxes for experiences/education/projects, category toggles for skills, sourced from base pool, synced to version config arrays
- [x] 4.3 Add bullet editor per selected experience: add/edit/remove bullets, fallback to base bullets when experienceBullets entry is empty

## Phase 5: Orchestration + HTML

- [x] 5.1 Rewrite `app.js` as `GreedevCV.App` IIFE — boot sequence (DataStore.init → Editor.init → Preview.init), error state render in main, version CRUD handlers (new/duplicate/delete/save), server status indicator
- [x] 5.2 Update `index.html` — header with h1 + toolbar (version selector, New/Duplicate/Delete/Save buttons), section#editor-panel, section#preview-panel, div#notification, scripts loaded in order: data-store.js → editor.js → preview.js → app.js

## Phase 6: CSS

- [x] 6.1 Add split-view grid layout (`2fr 3fr`), responsive breakpoint at 768px (stacked, `1fr`), header + toolbar styles
- [x] 6.2 Add Harvard template preview styling: serif body (Georgia), sans-serif headings, uppercase 11px section headings with bottom border, right-aligned dates, 1400px max-width centered
- [x] 6.3 Add editor form styles: section spacing 20px, inputs full-width with border-radius + focus ring (primary color), checkbox labels, bullet editor with add/remove, toast notifications
- [x] 6.4 Add print CSS: @page letter 0.75in margins, hide .editor-panel, full-width .preview-panel, serif 11pt body/14pt name/10pt headings, page-break-inside on experience entries, no link decoration
