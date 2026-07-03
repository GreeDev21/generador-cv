# Language-Aware Preview Specification

## Purpose

The preview currently renders whatever string it finds in the merged data. With bilingual data, each translatable field is a `{ en, es }` object. The preview must extract the value for the active language when rendering, while continuing to use non-translatable fields directly. The user must also see which language is currently being displayed.

## Requirements

### Requirement: buildRenderData accepts language parameter

`Preview.buildRenderData(base, version)` MUST accept an optional `language` parameter. When provided, it extracts translatable fields using the selected language.

#### Scenario: existing callers without language work

- GIVEN `buildRenderData(base, version)` is called without a `language` argument
- WHEN it runs
- THEN it defaults to `"en"`
- AND the preview renders English content

#### Scenario: buildRenderData with explicit language

- GIVEN `buildRenderData(base, version, "es")` is called
- WHEN it runs
- THEN all translatable fields in the returned data are the Spanish versions

### Requirement: translatable fields use field[language]

For every translatable field in the composed data, `buildRenderData` MUST extract `field[language]` rather than using `field` directly.

#### Scenario: summary resolves to language value

- GIVEN `base.summary` is `{ "en": "Frontend Designer...", "es": "Diseñador Frontend..." }`
- AND `version.summary` is `{ "en": "Custom EN", "es": "Personalizado ES" }`
- WHEN `buildRenderData(base, version, "es")` runs
- THEN `data.summary` equals `"Personalizado ES"` (version override in ES)

#### Scenario: experience role resolves to language value

- GIVEN `base.experiences[0].role` is `{ "en": "Co-founder", "es": "Cofundador" }`
- WHEN `buildRenderData(base, version, "es")` runs
- THEN the experience's `role` in the composed data equals `"Cofundador"`

#### Scenario: experience location resolves to language value

- GIVEN `base.experiences[0].location` is `{ "en": "Argentina", "es": "Argentina" }`
- WHEN `buildRenderData(base, version, "es")` runs
- THEN the experience's `location` equals `"Argentina"` (same in both languages)

#### Scenario: experience bullets resolve to language value

- GIVEN `base.experiences[0].bullets` is `[{ "en": "Building...", "es": "Construyendo..." }]`
- WHEN `buildRenderData(base, version, "en")` runs
- THEN the experience's `bullets[0]` equals `"Building..."`

#### Scenario: version bullet overrides respect language

- GIVEN `version.experienceBullets["exp-1"]` is `[{ "en": "Custom EN", "es": "Personalizado ES" }]`
- WHEN `buildRenderData(base, version, "es")` runs
- THEN the experience's bullets use `"Personalizado ES"` from the version override

#### Scenario: education degree and field resolve to language value

- GIVEN `base.education[0].degree` is `{ "en": "Technician", "es": "Tecnicatura" }`
- AND `base.education[0].field` is `{ "en": "Systems Analysis", "es": "Análisis de Sistemas" }`
- WHEN `buildRenderData(base, version, "es")` runs
- THEN `data.education[0].degree` equals `"Tecnicatura"`
- AND `data.education[0].field` equals `"Análisis de Sistemas"`

#### Scenario: project name and description resolve to language value

- GIVEN `base.projects[0].name` is `{ "en": "Portfolio", "es": "Portafolio" }`
- WHEN `buildRenderData(base, version, "es")` runs
- THEN `data.projects[0].name` equals `"Portafolio"`

#### Scenario: project bullets resolve to language value

- GIVEN `base.projects[0].bullets` is `[{ "en": "Contact form", "es": "Formulario de contacto" }]`
- WHEN `buildRenderData(base, version, "en")` runs
- THEN `data.projects[0].bullets[0]` equals `"Contact form"`

### Requirement: non-translatable fields used directly

Fields that are not translatable MUST be used directly without any language resolution, exactly as today.

#### Scenario: personalInfo fields used directly

- GIVEN `base.personalInfo.name` is `"Agustín Burgos"` (plain string)
- WHEN `buildRenderData(base, version, "es")` runs
- THEN `data.personalInfo.name` equals `"Agustín Burgos"` directly

#### Scenario: experience company used directly

- GIVEN `base.experiences[0].company` is `"WebXpert"` (plain string)
- WHEN `buildRenderData(base, version, "es")` runs
- THEN the experience's `company` equals `"WebXpert"` directly

#### Scenario: dates used directly

- GIVEN `base.experiences[0].startDate` is `"2025-01"`
- WHEN `buildRenderData(base, version, "es")` runs
- THEN `startDate` is `"2025-01"` directly

#### Scenario: skills category and items used directly

- GIVEN `base.skills[0].category` is `"Languages"`
- WHEN `buildRenderData(base, version, "es")` runs
- THEN `skill.category` equals `"Languages"` directly
- AND `skill.items` is the original array

### Requirement: language indicator in preview header

The preview MUST display a visual indicator showing which language the content is rendered in.

#### Scenario: preview header shows language badge

- GIVEN the preview is rendering in Spanish
- WHEN the preview template renders
- THEN the rendered HTML includes a language badge or text (e.g. `<span class="preview-lang-badge">ES</span>`)
- AND it is placed in the preview header area

#### Scenario: language badge updates on switch

- GIVEN the preview shows "EN" badge
- WHEN the language switches to Spanish
- THEN the badge updates to "ES"

### Requirement: language is passed through the event chain

The `GreedevCV:languagechange` event and `GreedevCV:datachange` event MUST carry the language so the Preview can use it.

#### Scenario: datachange event carries language

- GIVEN `DataStore.getLanguage()` returns `"es"`
- WHEN `GreedevCV:datachange` is dispatched (triggered by any state mutation)
- THEN `event.detail.language` equals `"es"`

#### Scenario: Preview reads language from event or getLanguage

- GIVEN the Preview handles a `GreedevCV:datachange` event
- WHEN it calls `buildRenderData(base, version)`
- THEN it passes the language from `event.detail.language` or falls back to `DataStore.getLanguage()`

### Requirement: language-aware merge applies to version overrides

Version-level fields (`summary`, `targetRole`, `targetCompany`) that override base values MUST also resolve the language.

#### Scenario: version summary override is language-aware

- GIVEN `version.summary` is `{ "en": "Custom EN Summary", "es": "Resumen ES Personalizado" }`
- AND `base.summary` is `{ "en": "Base EN", "es": "Base ES" }`
- WHEN `buildRenderData(base, version, "es")` runs
- THEN `data.summary` equals `"Resumen ES Personalizado"` (version wins, ES selected)

## Acceptance Criteria

- [ ] `buildRenderData(base, version, language)` extracts translatable fields using `field[language]`
- [ ] Without language argument, defaults to `"en"`
- [ ] Non-translatable fields are used directly (no language resolution)
- [ ] Version bullet overrides (experienceBullets) respect language
- [ ] Version translatable fields (summary, targetRole, targetCompany) respect language
- [ ] Preview header shows a language badge (EN/ES)
- [ ] Language badge updates when language changes
- [ ] The preview re-renders on `GreedevCV:languagechange` or `GreedevCV:datachange` with the correct language
- [ ] All translatable fields in the Harvard template render in the selected language
