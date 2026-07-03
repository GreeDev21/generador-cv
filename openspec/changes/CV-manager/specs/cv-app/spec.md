# cv-app Specification

## Purpose

Application orchestrator `GreedevCV.App` that coordinates DataStore, Editor, and Preview. Manages version lifecycle: init, save, new, duplicate, delete. Exposes top-level actions and renders the initial UI.

## Requirements

### Requirement: Boot sequence

`GreedevCV.App.init()` MUST sequence initialization: load DataStore → render Editor → render Preview.

If DataStore initialization fails (missing cv.json), the app MUST render an error message in `#app main` in place of the split view.

#### Scenario: Boots successfully

- GIVEN `data/cv.json` and version files exist
- WHEN `App.init()` is called on DOMContentLoaded
- THEN DataStore loads base pool and versions, Editor renders forms in `.editor-panel`, Preview renders CV in `.preview-panel`

#### Scenario: Shows error on missing data

- GIVEN `data/cv.json` does not exist
- WHEN `App.init()` is called
- THEN `#app main` contains a styled error message: "CV data not found. Create data/cv.json to get started."

### Requirement: Version lifecycle

The app MUST provide actions accessible from a toolbar/header:

- **New version**: Creates a new version config with blank selections, auto-generates `id` and `created` timestamp, saves to `data/versions/{id}.json`, switches to it.
- **Duplicate version**: Copies the current version config with a new `id`, appends " (copy)" to `label`, switches to it.
- **Delete version**: Removes the version file from disk (via POST /api/save delete or localStorage state), switches to the first remaining version or resets to base pool.
- **Save version**: Writes current version config to storage (localStorage + POST /api/save).

The app MUST prevent deleting the last remaining version — at least one version MUST exist.

#### Scenario: Creates new version

- GIVEN the app is loaded with existing versions
- WHEN the user clicks "New Version"
- THEN a new version config is created with empty selections, `id` is a UUID-like string, `created` is the current ISO date
- AND the Editor resets to empty selections
- AND the Preview shows only sections that are enabled by default

#### Scenario: Duplicates current version

- GIVEN version "full" has label "Full CV" and 5 selected experiences
- WHEN the user clicks "Duplicate Version"
- THEN a new version appears with label "Full CV (copy)" and identical selections
- AND the new version becomes active

#### Scenario: Deletes a version

- GIVEN there are 3 versions and version "old" is active
- WHEN the user clicks "Delete Version" and confirms
- THEN version "old" is removed
- AND the first remaining version becomes active

#### Scenario: Blocks deletion of last version

- GIVEN there is exactly 1 version
- WHEN the user clicks "Delete Version"
- THEN a message states "Cannot delete the last version"
- AND the version remains unchanged

### Requirement: Download and server save

The app toolbar MUST include "Download JSON" (Blob export) and "Save to Server" buttons.

"Save to Server" MUST show a loading state during the POST request and a success/error notification.

#### Scenario: Save to server succeeds

- GIVEN the server is running on localhost:3000
- WHEN the user clicks "Save to Server"
- THEN a loading indicator appears, the POST completes, and a green "Saved" notification appears

#### Scenario: Save to server fails

- GIVEN the server is NOT running
- WHEN the user clicks "Save to Server"
- THEN a loading indicator appears, the POST fails, and a red "Server unreachable. Downloaded instead." notification appears with a Blob download triggered

## Acceptance Criteria

- [ ] App boots and renders editor + preview split view
- [ ] Error state renders when cv.json is missing
- [ ] New version creates empty config and switches to it
- [ ] Duplicate version copies all selections with new id
- [ ] Delete version removes it and switches to another
- [ ] Deleting last version is blocked with message
- [ ] Save to Server shows loading then success/error feedback
- [ ] Download JSON triggers Blob download
