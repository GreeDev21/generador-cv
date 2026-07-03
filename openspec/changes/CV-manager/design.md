# Design: CV Manager

## Technical Approach

Four IIFE modules on `window.GreedevCV.*` namespace, zero build step. DataStore owns all state (base pool + version config) and emits `datachange` events. Editor mutates state through DataStore; Preview reads it reactively. App orchestrates lifecycle. serve.js is a separate Node.js stdlib HTTP server.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| **IIFE modules over ES modules** | ES modules via `<script type="module">` | IIFEs work on `file://` protocol without a server. ES modules require HTTP. Since serve.js is optional, IIFEs keep the app usable without the server. |
| **Global event bus via DOM CustomEvent** | Pub/ub class, Proxy-based reactivity | Zero dependencies. DataStore dispatches `GreedevCV:datachange` on `document`. Editor/Preview subscribe via `addEventListener`. Simple, decoupled, testable by dispatching events manually. |
| **Two-tier data model** (base pool + version config overlay) | Single file per version with full copy | Base pool avoids data duplication across versions. Version configs are small deltas (selections + bullet overrides). Merge happens in Preview at render time. |
| **localStorage scratchpad as JSON string** | IndexedDB, OPFS | localStorage is synchronous, ergonomic for a single string. 5MB limit is ample for CV data (~100KB). Debounced writes at 500ms prevent thrashing. |
| **serve.js as separate process** | Embed server in JS via Service Worker | Service Workers don't work on `file://`. A separate Node process is the simplest way to serve HTTP and receive POST. The app degrades gracefully when server is absent (Blob download fallback). |
| **CSS Grid for split view** | Flexbox, float-based | Grid gives explicit 40/60 split control, simpler responsive reflow via `grid-template-columns: 1fr` on mobile. |

## Module Interfaces

### `GreedevCV.DataStore`

| Method | Signature | Description |
|--------|-----------|-------------|
| `init()` | `async () => void` | Fetch `data/cv.json`, load versions, check localStorage draft. Emits `datachange` on success, `error` on failure. |
| `getState()` | `() => DataStoreState` | Returns current state object (base, version, merged, versions list). |
| `update(path, value)` | `(string, any) => void` | Mutates merged data at dot-path (e.g. `"personalInfo.name"`), debounces localStorage, emits `datachange`. |
| `switchVersion(id)` | `(string) => void` | Loads version config, merges with base, emits `datachange`. |
| `listVersions()` | `() => Array<{id, label}>` | Returns available version manifests. |
| `newVersion()` | `() => string` | Creates blank version config, returns new ID. |
| `duplicateVersion(id)` | `(string) => string` | Clones version with new ID and " (copy)" label. |
| `deleteVersion(id)` | `(string) => boolean` | Removes version. Returns `false` if it's the last one. |
| `saveToServer()` | `async () => boolean` | POSTs current version to `/api/save`. Returns `false` on failure. |
| `export()` | `() => void` | Triggers Blob download of current merged data as JSON. |

**Events dispatched on `document`**:

| Event | Detail | When |
|-------|--------|------|
| `GreedevCV:datachange` | `{ base, version, merged }` | Any state mutation |
| `GreedevCV:error` | `{ message }` | Init failure, network error |
| `GreedevCV:saved` | `{ source: 'server'\|'local' }` | Save completed |
| `GreedevCV:versionlist` | `{ versions }` | Version list loaded/changed |

### `GreedevCV.Editor`

| Method | Signature | Description |
|--------|-----------|-------------|
| `init(container)` | `(HTMLElement) => void` | Renders all editor forms into container. Subscribes to `datachange`. |
| `render(data)` | `(MergedData) => void` | Re-renders forms from current data. |
| `destroy()` | `() => void` | Cleans up event listeners. |

Editor creates input elements with `data-path` attributes (e.g. `data-path="personalInfo.name"`) so the onChange handler can call `DataStore.update(path, value)` generically — no per-field wiring.

### `GreedevCV.Preview`

| Method | Signature | Description |
|--------|-----------|-------------|
| `init(container)` | `(HTMLElement) => void` | Creates preview DOM, subscribes to `datachange`. |
| `render(data)` | `(MergedData) => void` | Renders Harvard template into container. |
| `destroy()` | `() => void` | Cleans up. |

Renders via string interpolation + `innerHTML` (no XSS risk — all data is user-authored JSON). Debounced at 100ms.

### `GreedevCV.App`

| Method | Signature | Description |
|--------|-----------|-------------|
| `init()` | `async () => void` | Boot sequence: DataStore → Editor → Preview. On error: renders error state. |
| `handleNewVersion()` | `() => void` | Creates, saves, switches to new version. |
| `handleDuplicate()` | `() => void` | Duplicates active version. |
| `handleDelete()` | `() => void` | Deletes active version (blocked if last). |
| `handleSave()` | `async () => void` | Save to server → fallback to download. |
| `handleDownload()` | `() => void` | Blob export. |

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│                    App.init()                        │
│  DOMContentLoaded → DataStore.init()                 │
│       ↓                                              │
│  DataStore fetches data/cv.json + versions           │
│       ↓                                              │
│  dispatch 'GreedevCV:datachange' on document          │
│       ↓                                              │
│  ┌──────────────────┐     ┌──────────────────┐      │
│  │  Editor.render()  │     │  Preview.render() │      │
│  │  (left panel)     │     │  (right panel)    │      │
│  └──────┬───────────┘     └────────▲──────────┘      │
│         │                          │                  │
│         │  User edits field        │                  │
│         │  → onChange fires        │                  │
│         ▼                          │                  │
│  DataStore.update(path, value)     │                  │
│  → setState → debounce localStorage│                  │
│  → dispatch 'GreedevCV:datachange'─┼──────────────────┘
│                                    │                  │
│  Version CRUD:                     │                  │
│  App.handleNewVersion()            │                  │
│  → DataStore.newVersion()          │                  │
│  → DataStore.switchVersion(id)     │                  │
│  → dispatch 'GreedevCV:datachange'─┼──────────────────┘
│                                    │                  │
│  Save flow:                        │                  │
│  App.handleSave()                  │                  │
│  → DataStore.saveToServer()        │                  │
│  → fetch POST /api/save            │                  │
│  → fail? → DataStore.export()      │                  │
│  → dispatch 'GreedevCV:saved'      │                  │
└─────────────────────────────────────────────────────┘
```

## State Management

### DataStore State Shape

```js
{
  basePool: {
    schemaVersion: 1,
    personalInfo: { name, email, phone, location, website, linkedin, github },
    summary: "",
    experiences: [{ id, company, role, location, startDate, endDate, current, bullets }],
    education: [{ id, institution, degree, field, startDate, endDate, gpa, achievements }],
    skills: [{ id, category, items }],
    projects: [{ id, name, description, technologies, url, bullets }]
  },
  versionConfig: {
    id, label, created, updated, targetRole, targetCompany,
    summary: "string (overrides base)",
    sections: { summary, education, experience, skills, projects },
    selectedExperiences: [],
    selectedEducation: [],
    selectedSkills: [],
    selectedProjects: [],
    experienceBullets: { "exp-id": ["bullet text"] }
  },
  merged: {
    // Computed: basePool filtered by versionConfig selections,
    // with versionConfig.summary overriding base, and
    // versionConfig.experienceBullets overriding base bullets
  },
  versions: [{ id, label, created, updated }],
  dirty: false,
  draftRestored: false
}
```

### Update Flow

1. `Editor.onChange` reads `input.dataset.path` and `input.value`
2. Calls `DataStore.update(path, value)` which does a deep clone, mutates at path
3. Recomputes `merged` — filters selections, applies overrides
4. Debounce-writes to `localStorage.greedevcv-draft` (500ms)
5. Dispatches `GreedevCV:datachange` with full state
6. Preview catches event → re-renders (100ms debounce independently)
7. Editor catches event → re-renders (so toggle/section changes reflect)

## Component Tree

```
div#app
├── header
│   ├── h1 "Greedev CV"
│   ├── p.subtitle
│   ├── select#version-selector (version list)
│   └── toolbar buttons [New, Duplicate, Delete, Save, Download]
├── main.split-view
│   ├── aside.editor-panel (40%)
│   │   ├── section.personal-info
│   │   │   └── inputs [name, email, phone, location, website, linkedin, github]
│   │   ├── section.summary-editor
│   │   │   └── textarea + char count
│   │   ├── section.section-toggles
│   │   │   └── toggles [summary, education, experience, skills, projects]
│   │   ├── section.experience-selector
│   │   │   ├── checkboxes per experience from base
│   │   │   └── bullet editor per checked experience
│   │   ├── section.education-selector
│   │   │   └── checkboxes per education from base
│   │   ├── section.skills-selector
│   │   │   └── category toggles
│   │   └── section.projects-selector
│   │       └── checkboxes per project from base
│   └── article.preview-panel (60%)
│       └── Harvard template CV render
└── div#notification (error/success toast)
```

## CSS Architecture

### Layout Strategy

```
.split-view {
  display: grid;
  grid-template-columns: 2fr 3fr;  /* 40/60 */
  gap: 24px;
  min-height: calc(100vh - header);
}

@media (max-width: 767px) {
  .split-view {
    grid-template-columns: 1fr;    /* stacked */
  }
}
```

### Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| ≥768px | Side-by-side: editor 40% / preview 60% |
| <768px | Stacked: editor above preview, both full-width |

### Print Specifics

```css
@page {
  size: letter;
  margin: 0.75in;
}

@media print {
  .editor-panel { display: none; }
  .preview-panel {
    width: 100%;
    max-width: none;
    box-shadow: none;
  }
  body { background: white; color: black; font-size: 11pt; }
  .preview-name { font-size: 14pt; }
  .preview-section-heading { font-size: 10pt; }
  a { color: inherit; text-decoration: none; }
  .experience-entry { page-break-inside: avoid; }
}
```

### CSS Custom Properties (already in styles.css, extend with preview-specific)

```css
:root {
  --font-serif: Georgia, 'Times New Roman', Times, serif;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --color-bg: #fafafa;
  --color-text: #1a1a1a;
  --color-primary: #2563eb;
  --color-border: #e5e7eb;
  --radius: 6px;
}
```

## serve.js Design

### Route Table

| Method | Path | Handler | Security |
|--------|------|---------|----------|
| GET | `/` or any path | `serveStatic` — reads file from `process.cwd()`, sets MIME from extension | Path traversal check: reject paths containing `..` |
| POST | `/api/save` | `handleSave` — parses JSON body, validates `filePath` prefix, writes to disk | `filePath` MUST start with `data/` and contain no `..` |
| ANY | Other | Returns `404 "Not found"` | — |

### Handler Pseudocode

```
serveStatic(urlPath):
  safePath = urlPath === '/' ? 'index.html' : urlPath
  if safePath contains '..' → 403
  fullPath = path.join(cwd, safePath)
  if !exists → 404 "Not found"
  read → set MIME → 200

handleSave(req):
  if req.method !== 'POST' → 405
  parse JSON body
  if !body.filePath or !body.data → 400
  if body.filePath contains '..' or !startsWith('data/') → 500 { error: "Invalid path" }
  fullPath = path.join(cwd, body.filePath)
  mkdir -p path.dirname(fullPath)
  writeFile(fullPath, JSON.stringify(body.data, null, 2))
  → 200 { ok: true }
```

## Error Handling

| Scenario | Detection | User Feedback |
|----------|-----------|---------------|
| `data/cv.json` missing | DataStore `fetch` fails with 404 | Renders error message in `#app main`: "CV data not found. Create data/cv.json to get started." |
| Malformed JSON in cv.json | `JSON.parse` throws | `GreedevCV:error` → App renders "Invalid CV data format" |
| Invalid `schemaVersion` | `!== 1` check | `GreedevCV:error` → "Unsupported schema version. Expected 1." |
| Network error on fetch | `fetch` throws (catch) | Same as file missing — user sees the init error |
| POST /api/save fails | `fetch` throws or non-200 response | App shows red notification "Server unreachable. Downloaded instead." + triggers Blob download |
| Path traversal in POST | `serve.js` validates prefix | 500 response `{ ok: false, error: "Invalid path" }` |
| Deletion of last version | `DataStore.deleteVersion` checks `versions.length === 1` | Toast: "Cannot delete the last version" |
| localStorage quota exceeded | `setItem` throws `QuotaExceededError` | Console warning + data still works in memory |

## File Dependencies

### Load Order (index.html)

```html
<script src="data-store.js"></script>   <!-- 1. State layer — no deps -->
<script src="editor.js"></script>       <!-- 2. UI layer — depends on DataStore -->
<script src="preview.js"></script>      <!-- 3. UI layer — depends on DataStore -->
<script src="app.js"></script>          <!-- 4. Orchestrator — depends on all above -->
```

Order matters: `app.js` references `GreedevCV.DataStore`, `GreedevCV.Editor`, `GreedevCV.Preview`. Each IIFE attaches to `window.GreedevCV` at script execution time, so DataStore must execute first.

### File Dependency Graph

```
data-store.js  (standalone — no internal deps)
    ↑
editor.js  ─── reads DataStore.getState(), calls DataStore.update()
preview.js ─── reads DataStore.getState() on datachange event
    ↑
app.js ─── calls DataStore.init(), creates Editor/Preview instances
```

## Open Questions

- [ ] **Draft restoration UX**: Should we auto-restore the localStorage draft or show a prompt? Spec says "offer to restore" — implement as a bar notification with "Restore" / "Discard" buttons.
- [ ] **Experience bullet reorder**: Spec says user "may reorder" bullets. Drag-and-drop or up/down buttons? Up/down buttons are simpler and accessible — go with that unless requirements specify drag.
- [ ] **UUID generation**: For new version IDs, use `crypto.randomUUID()` (available in all modern browsers) or `Date.now() + Math.random()` fallback.
- [ ] **Delete from server**: Delete version spec says "via POST /api/save delete or localStorage state" — serve.js only has POST /api/save for writes. Delete endpoint or DELETE method? Simplest: serve.js should accept DELETE /api/save with `{ filePath }` body, or we handle deletion via localStorage state tracking and only remove from version list in memory. For MVP: delete from version list in memory + localStorage draft. Server file deletion added later if needed.
