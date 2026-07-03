# Tasks: CV i18n (EN/ES)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 400-440 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Maybe — borderline; proceed as single PR, split only if overrun |
| Suggested split | Phase 1 (DataStore) → Phases 2+3+4 (Editor + Preview + App + CSS) |
| Delivery strategy | ask-on-risk |
| Open questions to resolve | 1 (bullet editor layout: stacked vs side by side) |

### Decision Needed Before Apply

The design has one open question that affects implementation:

- **Bullet editor layout**: Each bullet currently renders one textarea. With bilingual support, each bullet needs two textareas (EN + ES). The design asks: should these be side by side (consistent with other bilingual fields) or stacked (space-saving for long bullets)? **Side-by-side** is the recommendation (consistency), but this is not final.

Resolution needed before Phase 2.4.

### Suggested Work Units (if chained)

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DataStore: migration + language state | PR 1 | Standalone data layer, ~60 lines |
| 2 | Editor + Preview + App + CSS | PR 2 | Depends on PR 1; full UI feature, ~340 lines |

---

## Phase 1: DataStore — Migration + Language State

- [ ] 1.1 Add `migrateToV2(data)` pure function — recursive helper `wrap(v)` that converts plain strings to `{ en: v, es: v }` for all translatable paths: `summary`, `experiences[].role/location/bullets`, `education[].degree/field/achievements`, `projects[].name/description/bullets`, plus version fields `targetRole`, `targetCompany`, `summary`, `experienceBullets[*]`. Idempotent: v2 data returns unchanged. Empty arrays remain empty.
- [ ] 1.2 Wire migration into `init()` — relax schema check to accept `schemaVersion` 1 or 2. After loading `state.base`, call `migrateToV2(state.base)`. After loading `state.activeVersion`, call `migrateToV2(state.activeVersion)`. Then call `saveBase()` + `save()` to persist v2 to server. Run BEFORE `emitChange()`.
- [ ] 1.3 Add `setLanguage(lang)` — validates `lang` is `"en"` or `"es"` (guard clause for invalid), sets `state.activeVersion.language`, calls `debouncedSaveDraft()`, dispatches `GreedevCV:languagechange` with `{ language: lang }`. Add `getLanguage()` — returns `state.activeVersion.language` or `"en"` as default.
- [ ] 1.4 Add `language` to `emitChange()` detail — include `language: getLanguage()` so consumers like Preview get it without a separate call.
- [ ] 1.5 Add `language: 'en'` default to `newVersion()` — new version objects include `language: 'en'`.

## Phase 2: Editor — Bilingual Field Rendering

- [ ] 2.1 Add `buildBilingualInput(label, store, path, enVal, esVal)` and `buildBilingualTextarea(label, store, path, enVal, esVal)` — render two `.editor-field` elements side by side inside `.editor-bilingual` container. Each input has `data-store`, `data-path`, and `data-lang="en"|"es"`. Language badges (`lang-badge lang-en` / `lang-badge lang-es`) label each input. The EN input comes first.
- [ ] 2.2 Add `isTranslatable(path)` helper with a map of known translatable paths (`summary`, `targetRole`, `targetCompany`, and base-pool paths for experiences/education/projects). Used by `buildEditorHtml()` to decide which builder to call.
- [ ] 2.3 Convert summary section to bilingual — replace single textarea `data-path="summary"` with `buildBilingualTextarea('Summary', 'version', 'summary', version.summary?.en || base.summary?.en, version.summary?.es || base.summary?.es)`. Keep char count showing combined or EN length.
- [ ] 2.4 Convert bullet editor to bilingual — each bullet row renders TWO textareas: one with `data-lang="en"` and one with `data-lang="es"`. Both share same `data-bullet-for` and `data-bullet-index`. Add language badges to each textarea. `handleBulletChange()` reads `data-lang` to write `experienceBullets[expId][idx].en` / `.es`.
- [ ] 2.5 Update `handleChange()` to read `data-lang` attribute — when present, append `.en` or `.es` suffix to the dot-path before calling `setNested()`. When absent (non-translatable field), behavior unchanged. This preserves the other language's value when editing one language.
- [ ] 2.6 Update inline form submissions (experience, education, projects) — translatable fields (role, location, degree, field, name, description) wrap the entered value as `{ en: val, es: val }` in the constructed object. Non-translatable fields (company, institution, dates, technologies) stay as plain values.
- [ ] 2.7 Add `data-lang="en"` and `data-lang="es"` to bullet editor textarea removers — `handleChange` delegation needs `data-lang` on all data-bearing elements. The bullet toggle, add/remove buttons skip `data-lang` (they use `data-exp` / `data-bullet-for` / `data-bullet-index`).

## Phase 3: Preview — Language-Aware Rendering

- [ ] 3.1 Add `resolveField(field, lang)` helper — if `typeof field === 'string'` return field as-is (backward compat), else return `field[lang]` or `''`. This is safe for both migrated v2 objects and any remaining plain strings.
- [ ] 3.2 Add optional `language` parameter to `buildRenderData(base, version, language)` — defaults to `'en'`. Pass it through to all field resolution.
- [ ] 3.3 Apply `resolveField()` to all translatable fields in `buildRenderData()`: summary, experiences role/location/bullets, education degree/field/achievements (if any), projects name/description/bullets, and version bullet overrides from `experienceBullets[expId]`.
- [ ] 3.4 Listen to `GreedevCV:languagechange` event — add handler `handleLanguageChange(e)` that reads `e.detail.language`, calls `buildRenderData(lastBase, lastVersion, language)`, and re-renders (no debounce or 100ms debounce consistent with datachange handler). The Preview's `init()` subscribes to both `GreedevCV:datachange` and `GreedevCV:languagechange`.
- [ ] 3.5 Show language badge in preview header — render `<span class="preview-lang-badge">EN</span>` or `<span class="preview-lang-badge">ES</span>` in the `.preview-header` block, reflecting the current language.

## Phase 4: App — Language Toggle UI + CSS

- [ ] 4.1 Add language toggle button to `index.html` — `<button id="lang-toggle" class="btn lang-toggle" data-current-lang="en" aria-label="Current language: English. Click to switch to Spanish.">EN</button>` inside `.header-controls`.
- [ ] 4.2 Wire toggle click in `app.js` — read `DataStore.getLanguage()`, toggle `"en"` ↔ `"es"`, call `DataStore.setLanguage(nextLang)`. Update button text and `aria-label` immediately.
- [ ] 4.3 Listen to `GreedevCV:languagechange` + `GreedevCV:datachange` in App — update toggle text, `data-current-lang`, and `aria-label` from `DataStore.getLanguage()`. Version selector re-population is NOT triggered on language change.
- [ ] 4.4 Add CSS for language toggle (`.lang-toggle` — styled as header button with border + hover), language badges (`.lang-badge.lang-en` blue, `.lang-badge.lang-es` green), bilingual editor row (`.editor-bilingual` — flex row with gap), preview language badge (`.preview-lang-badge` — small uppercase badge in header). Add print CSS to hide `.lang-toggle` and `preview-lang-badge`.

---

## Open Questions for Implementation

1. **Bullet editor layout**: Side-by-side or stacked textareas for EN/ES bullets? Design currently defaults to side-by-side for consistency.
2. **Char count for bilingual summary**: Show count for active language, for both, or total? Simplified approach: show EN char count only.
3. **Inline form bullet entry**: The inline "Add experience" form has a single bullets textarea (one per line). Should this also be bilingual (two textareas)? Design decision: single input → all bullets wrapped as `{ en: val, es: val }`.

## Dependencies

- Phase 1 must be complete before Phases 2, 3, 4
- Phases 2 and 3 are independent of each other (can be parallel)
- Phase 4 depends on Phase 1 (needs `setLanguage`/`getLanguage`)
- Phase 4 layout depends on Phase 2 CSS additions
