# cv-data-store Specification

## Purpose

Two-tier JSON data model that loads the base CV pool (`data/cv.json`), manages version configs (`data/versions/{id}.json`), provides localStorage scratchpad for instant save, and exposes `GreedevCV.DataStore` on the global namespace.

## Requirements

### Requirement: Load base pool

`GreedevCV.DataStore` MUST fetch `data/cv.json` on init and parse it as the base pool.

If `data/cv.json` is missing or malformed, the store MUST emit an error event and halt.

The base pool MUST validate against the `greedev-cv-1.0` schema — `schemaVersion` MUST be `1`.

#### Scenario: Loads cv.json successfully

- GIVEN `data/cv.json` exists with valid `greedev-cv-1.0` schema
- WHEN `GreedevCV.DataStore.init()` is called
- THEN the base pool is loaded into memory with all sections (personalInfo, summary, experiences, education, skills, projects)

#### Scenario: Fails gracefully on missing cv.json

- GIVEN `data/cv.json` does not exist
- WHEN `GreedevCV.DataStore.init()` is called
- THEN an error event is emitted with message "Missing data/cv.json"
- AND the app shows an error state

### Requirement: Version list and switching

The store MUST load all `.json` files from `data/versions/` and list them by their `id` and `label` fields.

The store MUST support switching the active version by ID, merging the version config over the base pool.

When switching, the store MUST emit a `version-change` event with the merged CV data payload.

#### Scenario: Lists available versions

- GIVEN `data/versions/` contains `full.json` and `summary.json`
- WHEN `DataStore.listVersions()` is called
- THEN it returns an array with entries for `full` and `summary`

#### Scenario: Switches active version

- GIVEN `data/versions/full.json` configures `sections.summary: true` and `selectedExperiences: ["exp-1"]`
- WHEN `DataStore.switchVersion("full")` is called
- THEN the merged CV payload includes `summary` from the base pool AND only `exp-1` from experiences
- AND a `version-change` event is emitted

### Requirement: localStorage scratchpad

The store MUST save the current editor state to `localStorage` under key `greedevcv-draft` on every change (debounced at 500ms).

On init, the store MUST check for a localStorage draft and offer to restore it if newer than the last saved version.

#### Scenario: Auto-saves draft to localStorage

- GIVEN the editor modifies a field
- WHEN 500ms pass without further changes
- THEN `localStorage["greedevcv-draft"]` contains the current editor state as JSON

#### Scenario: Restores draft on reload

- GIVEN `localStorage["greedevcv-draft"]` exists with a draft timestamp newer than the version's `updated` field
- WHEN `DataStore.init()` runs
- THEN the draft data is used instead of the saved version data
- AND a notice is shown: "Unsaved draft restored"

### Requirement: Export and download

The store MUST support generating a Blob download of the current CV state as a JSON file.

The store MUST support saving via `POST /api/save` (if the server is available), falling back to Blob download if the server is unreachable.

#### Scenario: Triggers Blob download

- GIVEN the user clicks "Download JSON"
- WHEN `DataStore.export()` is called
- THEN a Blob URL is created and a download of `cv-export.json` is triggered

#### Scenario: Falls back to download when server unreachable

- GIVEN the server is not running
- WHEN `DataStore.save()` is called
- THEN the store attempts `POST /api/save` once, and on failure falls back to Blob download

## JSON Schema

### Base pool (`data/cv.json`)

```json
{
  "$schema": "greedev-cv-1.0",
  "schemaVersion": 1,
  "personalInfo": { "name": "string", "email": "string", "phone": "string", "location": "string", "website": "string", "linkedin": "string", "github": "string" },
  "summary": "string",
  "experiences": [{ "id": "string", "company": "string", "role": "string", "location": "string", "startDate": "YYYY-MM", "endDate": "YYYY-MM|null", "current": "boolean", "bullets": ["string"] }],
  "education": [{ "id": "string", "institution": "string", "degree": "string", "field": "string", "startDate": "YYYY-MM", "endDate": "YYYY-MM", "gpa": "string", "achievements": ["string"] }],
  "skills": [{ "id": "string", "category": "string", "items": ["string"] }],
  "projects": [{ "id": "string", "name": "string", "description": "string", "technologies": ["string"], "url": "string", "bullets": ["string"] }]
}
```

### Version config (`data/versions/{id}.json`)

```json
{
  "$schema": "greedev-version-1.0",
  "id": "string", "label": "string", "created": "date", "updated": "date",
  "targetRole": "string", "targetCompany": "string",
  "summary": "string (overrides base)",
  "sections": { "summary": "boolean", "education": "boolean", "experience": "boolean", "skills": "boolean", "projects": "boolean" },
  "selectedExperiences": ["string (IDs)"],
  "selectedEducation": ["string (IDs)"],
  "selectedSkills": ["string (category names)"],
  "selectedProjects": ["string (IDs)"],
  "experienceBullets": { "exp-id": ["custom bullet strings"] }
}
```

## Acceptance Criteria

- [ ] `DataStore.init()` loads cv.json without errors and exposes all sections
- [ ] `DataStore.listVersions()` returns correct version labels
- [ ] Switching versions updates the merged CV data and emits events
- [ ] Editor changes persist to localStorage and restore on reload
- [ ] Blob download produces a valid JSON file
- [ ] POST /api/save is attempted first; fallback to Blob download works
