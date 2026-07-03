# Design: CV i18n (EN/ES)

## Technical Approach

Schema v2 wraps translatable strings as `{ en, es }` objects. `DataStore.init()` detects v1 on load, runs `migrateToV2()` on base pool and version config, then auto-persists. Language state lives in `activeVersion.language` — stored in version config, default `"en"`. Editor renders two labeled inputs per translatable field; Preview resolves `field[language]` at render time. Language toggle sets state, dispatches `GreedevCV:languagechange`, Preview re-renders.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| **Language ownership** | Stored in version config (`activeVersion.language`) | Standalone DataStore field, App state | Follows existing pattern — version config is the version's full state. Language persists with version, follows version switches. |
| **Events** | `setLanguage()` dispatches `GreedevCV:languagechange` only (not `datachange`) | Dispatch both | Editor must NOT re-render on language toggle (shows both languages). Preview handles both `datachange` + `languagechange`. Keeps events decoupled. |
| **Migration strategy** | Pure function `migrateToV2(data)` called inline in `init()` after fetch | Separate module, service worker | Same IIFE pattern as rest of codebase. Pure function is testable. Deep-clone not needed since `init()` owns the freshly-fetched object. |
| **Editor field rendering** | Conditional branches inside `buildEditorHtml()` via `isTranslatable()` helper | Separate template per field type | Minimal diff — existing field rows get a `buildBilingualInput()` call instead of `buildInput()`. No new templates needed. |
| **Preview language resolution** | `buildRenderData(base, version, lang)` calls `resolveField(field, lang)` helper | Wrapper proxy around data | Explicit parameter is testable and doesn't hide the dependency. Helper handles both `string` and `{en,es}` transparently. |
| **Inline forms** | Single input per field, value duplicated as `{ en: val, es: val }` | Two inputs per field | Speed of creation — user typing once is faster. Can refine translations in the main editor later. |

## Translatable vs Non-Translatable

| Translatable (→ `{ en, es }`) | Non-Translatable (unchanged) |
|-------------------------------|------------------------------|
| `base.summary` | All `personalInfo.*` fields |
| `experiences[].role`, `experiences[].location` | `experiences[].company`, dates, id, current |
| `experiences[].bullets[*]` | `experiences[].id` |
| `education[].degree`, `education[].field` | `education[].institution`, dates, gpa, id |
| `education[].achievements[*]` | `projects[].technologies[*]`, url, id |
| `projects[].name`, `projects[].description` | `skills[*].*` (all) |
| `projects[].bullets[*]` | Version sections, ids, dates, labels |
| `version.summary`, `version.targetRole`, `version.targetCompany` | `version.experienceBullets` keys |
| `version.experienceBullets[expId][*]` | |

## Data Flow

```
Language toggle click
  ↓
App → DataStore.setLanguage("es")
  ↓
state.activeVersion.language = "es"
debouncedSaveDraft()
dispatch('GreedevCV:languagechange', { language: "es" })
  ↓
Preview (listens to both datachange + languagechange):
  read DataStore.getLanguage() → "es"
  buildRenderData(base, version, "es")
    → resolveField(summary, "es") → "Resumen..."
    → exp.bullets.map(b => resolveField(b, "es"))
    → edu.achievements.map(a => resolveField(a, "es"))
  renderPreview(data)
  ↓
App.langToggle: update button text/aria-label

Migration flow:
init()
  ↓
fetch base (v1) → migrateToV2(base) → state.base = migrated (v2)
fetch versions
fetch activeVersion → migrateToV2(version) → state.activeVersion = migrated
saveBase() + save() (persist v2)
  ↓
emitChange() (language defaults to "en")
```

## File Changes

| File | Change |
|------|--------|
| `js/data-store.js` | Accept `schemaVersion` 1 or 2 in `init()`. Add `migrateToV2()` as internal function. Add `getLanguage()`, `setLanguage()`. Add `language: 'en'` to `newVersion()`. `emitChange()` calls `getLanguage()` (included in detail). Dispatch `GreedevCV:languagechange`. |
| `js/editor.js` | Add `buildBilingualInput(label, store, path, enVal, esVal)` and `buildBilingualTextarea(...)`. Add `isTranslatable(path)` helper. `buildEditorHtml()` calls bilingual builders for translatable paths, single builders for non-translatable. Bullet editor renders two textareas per bullet with `data-lang`. Inline form submissions set `{ en: val, es: val }` on translatable fields. |
| `js/preview.js` | `buildRenderData(base, version, language)` — default `"en"`. Add `resolveField(field, lang)` — if string return as-is, else `field[lang] || ''`. Apply to all translatable fields in data composition (summary, role, location, bullets, degree, field, achievements, name, description). Add language badge in preview header. Handle `GreedevCV:languagechange` + `datachange`. |
| `app.js` | Add language toggle button in `header-controls` block. Wire click → `DataStore.setLanguage()`. Listen to `GreedevCV:languagechange` → update button text/aria. Listen to `datachange` → update button from `DataStore.getLanguage()`. |
| `css/styles.css` | Add `.lang-badge` (EN blue, ES green), `.editor-bilingual` (flex row for two inputs), `.lang-toggle` button styles, `.preview-lang-badge`. |
| `index.html` | Add `<button id="lang-toggle">` inside `.header-controls`. |

## Per-Module Implementation Details

### DataStore — Migration (`migrateToV2`)

```js
function migrateToV2(data) {
  if (!data || data.schemaVersion >= 2) return data;
  var wrap = function(v) {
    if (v === null || v === undefined || typeof v === 'object') return v;
    return { en: v, es: v };
  };
  // Base pool
  if (typeof data.summary === 'string') data.summary = wrap(data.summary);
  (data.experiences || []).forEach(function(exp) {
    exp.role = wrap(exp.role);
    exp.location = wrap(exp.location);
    exp.bullets = (exp.bullets || []).map(wrap);
  });
  (data.education || []).forEach(function(edu) {
    edu.degree = wrap(edu.degree);
    edu.field = wrap(edu.field);
    edu.achievements = (edu.achievements || []).map(wrap);
  });
  (data.projects || []).forEach(function(proj) {
    proj.name = wrap(proj.name);
    proj.description = wrap(proj.description);
    proj.bullets = (proj.bullets || []).map(wrap);
  });
  // Version config
  if (typeof data.targetRole === 'string') data.targetRole = wrap(data.targetRole);
  if (typeof data.targetCompany === 'string') data.targetCompany = wrap(data.targetCompany);
  if (typeof data.summary === 'string') data.summary = wrap(data.summary); // version summary
  if (data.experienceBullets) {
    Object.keys(data.experienceBullets).forEach(function(key) {
      data.experienceBullets[key] = (data.experienceBullets[key] || []).map(wrap);
    });
  }
  data.schemaVersion = 2;
  return data;
}
```

Called in `init()`:
```js
state.base = migrateToV2(state.base);
// ... after schema version check relaxed to accept 1 or 2
// ... after loading active version:
state.activeVersion = migrateToV2(state.activeVersion);
// Then saveBase() + save() to persist v2
```

### Editor — Bilingual field rendering

`buildEditorHtml()` gains an `isTranslatable` map for data-paths. For bullet rows, each bullet renders two textareas with `data-lang="en"` and `data-lang="es"`, and `data-bullet-for` + `data-bullet-index` identical on both. `handleChange` reads `data-lang`, appends `.en` / `.es` to the path, calls `updateBase` / `updateVersion` with the compound dot-path (e.g. `summary.en`). `setNested()` handles this natively — it sets `obj.summary.en = value`, preserving other keys.

### Preview — Language resolution

```js
function resolveField(field, lang) {
  if (typeof field === 'string') return field;
  return field && field[lang] !== undefined ? field[lang] : '';
}

function buildRenderData(base, version, language) {
  language = language || 'en';
  // For each translatable field: resolveField(field, language)
  var summary = resolveField(version.summary || base.summary, language);
  // Experience role, location, bullets: same pattern
  var experiences = (base.experiences || []).filter(...).map(function(exp) {
    var bullets = (version.experienceBullets && version.experienceBullets[exp.id])
      ? version.experienceBullets[exp.id].map(function(b) { return resolveField(b, language); })
      : (exp.bullets || []).map(function(b) { return resolveField(b, language); });
    return {
      role: resolveField(exp.role, language),
      location: resolveField(exp.location, language),
      bullets: bullets,
      // non-translatable fields unchanged
    };
  });
  // ... same for education, projects
}
```

## CSS Additions

```css
/* Language toggle in header */
.lang-toggle {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 12px; font-size: 0.8125rem; font-weight: 600;
  border: 2px solid var(--color-border); border-radius: var(--radius-sm);
  background: var(--color-surface); cursor: pointer;
}
.lang-toggle:hover { border-color: var(--color-primary); }

/* Language badges on editor inputs */
.lang-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 20px; font-size: 0.6875rem; font-weight: 700;
  border-radius: 3px; flex-shrink: 0;
}
.lang-badge.lang-en { background: #dbeafe; color: #1d4ed8; }
.lang-badge.lang-es { background: #dcfce7; color: #15803d; }

/* Bilingual input row (EN + ES side by side) */
.editor-bilingual { display: flex; gap: 8px; margin-bottom: 6px; }
.editor-bilingual .editor-field { flex: 1; margin-bottom: 0; }

/* Preview language badge */
.preview-lang-badge {
  display: inline-block; padding: 2px 8px; font-size: 0.6875rem;
  font-weight: 700; font-family: var(--font-sans);
  border-radius: 3px; text-transform: uppercase;
}
```

## Error Handling

| Scenario | Detection | UX |
|----------|-----------|-----|
| v1 data absent after migration | `schemaVersion` still 1 after call | Error dispatched (defensive — should not happen) |
| `language` set to invalid value | Guard clause in `setLanguage()` | Silently ignored |
| Version config missing `language` | `getLanguage()` defaults to `"en"` | Works, just shows EN |
| Migration on malformed v1 data | `typeof` checks fail → field stays as-is | Non-fatal — field may render as object in preview (rare) |
| saveBase/save after migration fails | Existing error flow | Blob download fallback |

## Open Questions

- [ ] Should bullet editor show EN/ES textareas stacked (current bullet-row pattern) or side by side in a grid? Side-by-side for consistency with other bilingual fields, but may be cramped for long bullets.
- [ ] For inline forms (add experience/education/project), how many inputs per translatable field? Decision: one input → `{ en: val, es: val }` on submit. Keeps forms fast.
