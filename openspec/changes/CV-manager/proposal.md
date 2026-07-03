# Proposal: CV Manager

## Intent

Local-only CV/resume manager with split-view editor/preview, Harvard template rendering, and JSON-based versioning. Zero build step, zero npm dependencies — plain HTML/CSS/JS.

## Scope

### In Scope
- **serve.js** — local HTTP server (Node.js stdlib only, ~30 lines)
- **DataStore** — load base pool + versions, switch versions, localStorage scratchpad
- **Preview** — live Harvard template rendering
- **Editor** — forms for personal info, summary, experience/skill selectors, bullet editing
- **App orchestrator** — save, new, duplicate, delete version lifecycle
- **CSS** — responsive layout, print styles for PDF export (Ctrl+P)

### Out of Scope
- Cloud sync or cloud storage
- Multiple CV templates (Harvard only)
- Authentication or user management
- PDF generation via library (OS print dialog only)
- Import from LinkedIn, JSON Resume, or other formats

## Capabilities

### New Capabilities
- `cv-data-store`: JSON two-tier data model, load/save/switch versions, localStorage scratchpad
- `cv-editor`: Form UI for all CV sections, data binding via `GreedevCV.Editor`
- `cv-preview`: Harvard template rendering with live preview via `GreedevCV.Preview`
- `cv-server`: Node.js HTTP server (stdlib, 0 npm) serving static files + `POST /api/save`

### Modified Capabilities
None — first change, no existing specs.

## Approach

- **Architecture**: IIFE modules on `window.GreedevCV.*` namespace. No frameworks, no build step.
- **Data model (two-tier)**: `data/cv.json` (base pool of all entries) + `data/versions/{id}.json` (selection by ID + per-experience bullet overrides). JSON schema includes a `schemaVersion` field for forward compat.
- **UI**: Split view — left editor forms, right live preview. Stacked on mobile (`<768px`). Editor hidden on print.
- **Persistence**: localStorage as scratchpad for instant save + Blob download to export JSON files. `serve.js` adds `POST /api/save` for direct filesystem writes.
- **Server**: `serve.js` solves Chrome's `file://` fetch blocking by serving HTTP on localhost.

## Affected Areas

All new — brand project. No existing files to modify.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Chrome blocks fetch from `file://` | High | serve.js serves HTTP on localhost |
| No direct FS write from browser | High | serve.js `POST /api/save` endpoint |
| JSON schema changes break existing versions | Med | `schemaVersion` field + DataStore validates on load |
| No test runner available | High | Manual verification checklist per phase |

## Rollback Plan

Trivial: `git checkout main` and delete `data/versions/*.json` if schema broke. All files are flat — no migrations. For serve.js, stop the process.

## Dependencies

- Node.js (already present in environment)
- Modern browser (Chrome/Firefox/Edge — ES6+ support)

## Success Criteria

- [ ] serve.js delivers index.html and assets on localhost without errors
- [ ] DataStore loads `cv.json` base pool, lists versions, switches between them
- [ ] Preview renders Harvard template with all sections (personal info, experiences, education, skills, projects)
- [ ] Editor form changes reflect in Preview immediately (live data binding)
- [ ] New version duplicates existing one, saves to `data/versions/{name}.json`
- [ ] Print CSS hides editor, shows full-width preview
- [ ] Split view stacks on mobile, side-by-side on desktop
