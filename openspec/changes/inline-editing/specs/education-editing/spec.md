# education-editing Specification

## Purpose

Allow users to create new education entries directly from the editor panel — without editing JSON files by hand. New entries write to the base pool (`data/cv.json`), auto-select in the active version, and persist to disk.

## Requirements

### Requirement: Inline education creation form

The editor MUST render a collapsible inline form at the bottom of the Education section in the editor panel for adding a new education entry.

The form MUST include input fields for:
- **Institution** (text, required)
- **Degree** (text, required)
- **Field** (text, required)
- **Start date** (text, pattern `YYYY-MM`, required)
- **End date** (text, pattern `YYYY-MM` or empty for current, optional)
- **GPA** (text, optional)
- **Current** (checkbox, optional — when checked, end date is cleared and disabled)

The form MUST be hidden by default and expandable via a toggle button labeled "+ Add education".

#### Scenario: Form is collapsed by default

- GIVEN the Education section is rendered in the editor
- WHEN the page loads
- THEN the inline form is not visible
- AND a toggle button "+ Add education" is present

#### Scenario: Toggle expands and collapses the form

- GIVEN the inline form is hidden
- WHEN the user clicks "+ Add education"
- THEN the form appears (class `inline-form open`)
- WHEN the user clicks "Cancel" or the toggle again
- THEN the form is hidden and input values are cleared

### Requirement: Form submission creates new education entry

When the user fills in the form and clicks "Add", the editor MUST:

1. Validate that `institution`, `degree`, `field`, and `startDate` are non-empty
2. Generate a unique ID via `GreedevCV.DataStore.generateId()`
3. Construct an education object:
   ```js
   {
     id: "<generated-uuid>",
     institution: "<institution>",
     degree: "<degree>",
     field: "<field>",
     startDate: "<startDate>",
     endDate: "<endDate or null>",
     current: <true/false>,
     gpa: "<gpa>",
     achievements: []
   }
   ```
4. Read the current `base.education` array from the DataStore state
5. Append the new education object
6. Call `GreedevCV.DataStore.updateBase('education', updatedArray)`
7. Push the new ID to `version.selectedEducation`
8. Call `GreedevCV.DataStore.updateVersion('selectedEducation', updatedSelected)`
9. Call `GreedevCV.DataStore.saveBase()` to persist

#### Scenario: Creates a new education entry

- GIVEN the Education section is visible in the editor
- AND the base pool has 1 education entry
- AND the form is expanded with valid data
- WHEN the user fills in institution "MIT", degree "B.S.", field "Computer Science", startDate "2022-09", and clicks "Add"
- THEN a new education object with a unique ID is appended to `base.education` (now 2 entries)
- AND the new ID is appended to `version.selectedEducation`
- AND `saveBase()` is called
- AND the Preview immediately shows the new education entry

### Requirement: Validation prevents incomplete submissions

The form MUST validate required fields before submitting. If `institution`, `degree`, `field`, or `startDate` are empty when the user clicks "Add", the form MUST NOT submit and MUST show inline validation messages.

#### Scenario: Rejects submission with missing field

- GIVEN the form is expanded with institution filled but degree empty
- WHEN the user clicks "Add"
- THEN no DataStore mutation occurs
- AND a message "Degree is required" is shown near the degree field

### Requirement: Form respects existing data patterns

The education object schema MUST match the existing base pool schema exactly:
- `id`: generated via `generateId()`
- `current`: boolean derived from the "Current" checkbox
- `endDate`: `null` when `current` is true, otherwise the entered value
- `achievements`: initialized as an empty array `[]`

#### Scenario: Current checkbox sets endDate to null

- GIVEN the form is expanded with endDate filled as "2026-06"
- WHEN the user checks "Current"
- THEN the endDate field is cleared and disabled
- AND the resulting object has `endDate: null` and `current: true`

## Acceptance Criteria

- [ ] "+ Add education" toggle is present and hidden by default
- [ ] Toggle expands/collapses the inline form and clears inputs on collapse
- [ ] Form creates a new education object in the base pool with a unique ID
- [ ] New education ID is appended to `selectedEducation` (auto-selected)
- [ ] `saveBase()` is called after creation
- [ ] Preview shows the new education immediately
- [ ] Validation prevents empty required fields
- [ ] `achievements` initializes as empty array
- [ ] "Current" checkbox clears and disables the end date field
- [ ] New education entry persists after page reload
