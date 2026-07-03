# Proposal: CV i18n (EN/ES)

## Intent

Current CV is English-only. User needs bilingual (EN/ES) support: toggle language, edit both versions, render selected language. Requires schema change so translatable strings carry both languages.

## Scope

### In Scope
- Schema v2 migration (translatable fields → `{ en, es }` objects)
- Language toggle in UI (global, not per-version)
- Bilingual editor fields (EN + ES inputs side by side)
- Language-aware preview rendering
- v1→v2 data migration on load

### Out of Scope
- Auto-translation (DeepL, GPT, etc.)
- More than 2 languages
- Per-version language override
- Schema v1 backward-compat in renderer (migration is one-time)

## Capabilities

### New Capabilities
- `cv-i18n`: Bilingual CV support — schema v2, language toggle, bilingual editor fields, language-aware preview

### Modified Capabilities
None — no existing specs in `openspec/specs/`.

## Approach

1. **Schema v2**: `schemaVersion: 2`. Translatable strings → `{ en, es }`. Non-translatable unchanged.
2. **Data migration**: `DataStore` detects v1 on load, wraps each translatable string into `{ en: original, es: original }`. Saves migrated v2.
3. **Language state**: Add `language: "en"|"es"` to version config. `DataStore` exposes `getLocalized(field)`.
4. **Editor**: Translatable fields render two labeled inputs (EN/ES).
5. **Preview**: Calls `getLocalized()` for every translatable field.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `data/cv.json` | Modified | v2 schema: translatable fields → `{ en, es }` |
| `data/versions/*.json` | Modified | Add `language`; translatable overrides → objects |
| `js/data-store.js` | Modified | v1→v2 migration, `getLocalized()` |
| `js/editor.js` | Modified | Two inputs per translatable field |
| `js/preview.js` | Modified | Language-aware rendering |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data loss if v1→v2 migration fails | Med | In-memory copy; rollback via git revert |
| User edits only one language | Low | Editor shows both fields; toggle preserves data |
| v1 files loaded outside app | Med | Auto-migration on load; v1 preserved in git |

## Rollback Plan

`git revert` schema migration + JS module changes. v1 data intact in git history.

## Dependencies

None.

## Success Criteria

- [ ] Language toggle switches preview between EN and ES instantly
- [ ] All translatable fields render in selected language (summary, role, bullets, degree, field, achievements, project name/description, targetRole, targetCompany)
- [ ] Editor shows both EN and ES inputs for every translatable field
- [ ] Migration: loading v1 data auto-converts to v2, original content preserved as EN
- [ ] Non-translatable fields (email, phone, dates, tech names) remain unchanged
