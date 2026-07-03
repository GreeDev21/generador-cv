# Schema v1 → v2 Migration Specification

## Purpose

The current CV data model stores all user-facing strings as plain text (e.g. `"summary": "Frontend Designer..."`). To support bilingual EN/ES editing and rendering, the schema must evolve to version 2 where every translatable string becomes a `{ en, es }` object. This spec defines the automatic migration that runs when `DataStore.init()` loads data with `schemaVersion: 1`.

## Requirements

### Requirement: v1 detection on init

`DataStore.init()` MUST detect when the loaded `data/cv.json` has `schemaVersion: 1` (integer) and automatically run the migration before any other processing.

#### Scenario: v1 data triggers migration

- GIVEN `data/cv.json` contains `"schemaVersion": 1`
- WHEN `DataStore.init()` fetches the file
- THEN the migration function runs BEFORE `emitChange()` is called
- AND `state.base.schemaVersion` becomes `2`

#### Scenario: v2 data skips migration

- GIVEN `data/cv.json` contains `"schemaVersion": 2`
- WHEN `DataStore.init()` fetches the file
- THEN the migration function is NOT called
- AND `state.base.schemaVersion` remains `2`

#### Scenario: schema version mismatch

- GIVEN `data/cv.json` contains `"schemaVersion": <anything other than 1 or 2>`
- WHEN `DataStore.init()` fetches the file
- THEN `GreedevCV:error` is dispatched with `"Unsupported schema version"`
- AND the app renders the error state

### Requirement: translatable fields conversion

The migration MUST wrap every translatable string into `{ en: original, es: original }`. Both languages start with the same English text.

#### Scenario: summary is migrated

- GIVEN `base.summary` is `"Frontend Designer & Developer..."`
- AFTER migration
- THEN `base.summary` equals `{ "en": "Frontend Designer & Developer...", "es": "Frontend Designer & Developer..." }`

#### Scenario: experience translatable fields are migrated

- GIVEN `base.experiences[0].role` is `"Co-founder · Design & Frontend"`
- AND `base.experiences[0].location` is `"Argentina"`
- AND `base.experiences[0].bullets` is `["Building digital products...", "Leading design..."]`
- AFTER migration
- THEN `base.experiences[0].role` equals `{ "en": "Co-founder · Design & Frontend", "es": "Co-founder · Design & Frontend" }`
- AND `base.experiences[0].location` equals `{ "en": "Argentina", "es": "Argentina" }`
- AND `base.experiences[0].bullets[0]` equals `{ "en": "Building digital products...", "es": "Building digital products..." }`

#### Scenario: education translatable fields are migrated

- GIVEN `base.education[0].degree` is `"Tecnicatura"`
- AND `base.education[0].field` is `"Análisis de Sistemas"`
- AND `base.education[0].achievements` is `[]`
- AFTER migration
- THEN `base.education[0].degree` equals `{ "en": "Tecnicatura", "es": "Tecnicatura" }`
- AND `base.education[0].field` equals `{ "en": "Análisis de Sistemas", "es": "Análisis de Sistemas" }`
- AND `base.education[0].achievements` remains `[]` (empty array is unchanged)

#### Scenario: project translatable fields are migrated

- GIVEN `base.projects[0].name` is `"Portfolio"`
- AND `base.projects[0].description` is `"Personal portfolio built with Astro"`
- AND `base.projects[0].bullets` is `["Contact form...", "Bilingual EN/ES..."]`
- AFTER migration
- THEN `base.projects[0].name` equals `{ "en": "Portfolio", "es": "Portfolio" }`
- AND `base.projects[0].description` equals `{ "en": "Personal portfolio built with Astro", "es": "Personal portfolio built with Astro" }`
- AND `base.projects[0].bullets[0]` equals `{ "en": "Contact form...", "es": "Contact form..." }`

### Requirement: non-translatable fields remain unchanged

The migration MUST NOT modify fields that carry structured or non-linguistic data.

#### Scenario: personal info plain fields stay as strings

- GIVEN `base.personalInfo.name` is `"Agustín Burgos"`
- AND `base.personalInfo.email` is `"agus.ez.bug@gmail.com"`
- AFTER migration
- THEN `base.personalInfo.name` is STILL `"Agustín Burgos"` (string, not object)
- AND `base.personalInfo.email` is STILL `"agus.ez.bug@gmail.com"` (string, not object)
- AND all `personalInfo` fields (`name`, `email`, `phone`, `location`, `website`, `linkedin`, `github`) remain plain strings

#### Scenario: experience non-translatable fields stay unchanged

- GIVEN `base.experiences[0].company` is `"WebXpert"`
- AND `base.experiences[0].startDate` is `"2025-01"`
- AND `base.experiences[0].current` is `true`
- AFTER migration
- THEN `base.experiences[0].company` is STILL `"WebXpert"`
- AND `base.experiences[0].startDate` is STILL `"2025-01"`
- AND `base.experiences[0].current` is STILL `true`

#### Scenario: skills stay unchanged

- GIVEN `base.skills[0].category` is `"Languages"`
- AND `base.skills[0].items` is `["TypeScript", "JavaScript", "Python"]`
- AFTER migration
- THEN `base.skills[0].category` is STILL `"Languages"`
- AND `base.skills[0].items` is STILL `["TypeScript", "JavaScript", "Python"]`

### Requirement: version config translatable fields migration

The migration MUST also convert translatable fields in the version config (`targetRole`, `targetCompany`, `summary`).

#### Scenario: version config targetRole is migrated

- GIVEN `activeVersion.targetRole` is `"Frontend Developer"`
- AFTER migration
- THEN `activeVersion.targetRole` equals `{ "en": "Frontend Developer", "es": "Frontend Developer" }`

#### Scenario: version config summary is migrated

- GIVEN `activeVersion.summary` is `""`
- AFTER migration
- THEN `activeVersion.summary` equals `{ "en": "", "es": "" }`

### Requirement: auto-save migrated data as v2

Immediately after migration, the DataStore MUST persist the migrated data to the server (or Blob fallback) so subsequent loads start with v2.

#### Scenario: migration triggers save

- GIVEN migration has completed successfully
- WHEN `DataStore.init()` continues after migration
- THEN `DataStore.saveBase()` is called to persist the migrated base pool
- AND the server (or Blob fallback) receives the v2 schema

#### Scenario: init validation accepts v2

- GIVEN the migration has set `schemaVersion: 2`
- WHEN `DataStore.init()` continues its normal flow
- THEN it MUST accept `schemaVersion: 2` as valid (no error thrown)
- AND proceed to load version list and version config

### Requirement: migration function signature

The migration MUST be a pure function that receives data and returns migrated data, so it can be tested in isolation.

#### Scenario: migration is idempotent

- GIVEN v2 data with `schemaVersion: 2`
- WHEN `migrateToV2(data)` is called
- THEN it returns the data unchanged (early return guard)

#### Scenario: migration handles nested arrays

- GIVEN an experience with empty bullets array `[]`
- WHEN migration runs
- THEN the empty array remains `[]` (no error, no wrapping)

## Acceptance Criteria

- [ ] Loading `data/cv.json` with `schemaVersion: 1` auto-migrates to v2 without user prompt
- [ ] Every translatable string in the base pool becomes `{ en: original, es: original }`
- [ ] Non-translatable fields are never wrapped
- [ ] Version config `targetRole`, `targetCompany`, `summary` are also migrated
- [ ] Migrated data is saved to the server immediately
- [ ] Subsequent loads find `schemaVersion: 2` and skip migration
- [ ] Migration can be unit-tested as a pure function
- [ ] Migration is idempotent: calling it on v2 data is a no-op
