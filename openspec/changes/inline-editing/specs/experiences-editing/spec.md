# experiences-editing Specification

## Purpose

Allow users to create new experience entries directly from the editor panel — without editing JSON files by hand. New experiences write to the base pool (`data/cv.json`), auto-select in the active version, and persist to disk. The UX mirrors existing patterns (event delegation, `data-path` bindings, `GreedevCV:datachange` re-render).

## Requirements

### Requirement: Inline experience creation form

The editor MUST render a collapsible inline form at the bottom of the Experience section in the editor panel for adding a new experience entry.

The form MUST include input fields for:
- **Company** (text, required) — bound conceptually to `company`
- **Role** (text, required) — bound conceptually to `role`
- **Location** (text, optional)
- **Start date** (text, pattern `YYYY-MM`, required)
- **End date** (text, pattern `YYYY-MM` or empty for current, optional)
- **Current** (checkbox, optional — when checked, end date is cleared and disabled)
- **Bullets** (multi-line textarea or dynamic list, optional) — initial bullet entries

The form MUST be hidden by default and expandable via a toggle button labeled "+ Add experience".

#### Scenario: Form is collapsed by default

- GIVEN the Experience section is rendered in the editor
- WHEN the page loads
- THEN the inline form is not visible
- AND a toggle button "+ Add experience" is present

#### Scenario: Toggle expands and collapses the form

- GIVEN the inline form is hidden
- WHEN the user clicks "+ Add experience"
- THEN the form slides down or appears (class `inline-form open`)
- WHEN the user clicks "Cancel" or the toggle again
- THEN the form is hidden and input values are cleared

### Requirement: Form submission creates new experience

When the user fills in the form and clicks "Add" (or equivalent submit button), the editor MUST:

1. Validate that `company`, `role`, and `startDate` are non-empty
2. Generate a unique ID via `GreedevCV.DataStore.generateId()`
3. Construct an experience object:
   ```js
   {
     id: "<generated-uuid>",
     company: "<company>",
     role: "<role>",
     location: "<location>",
     startDate: "<startDate>",
     endDate: "<endDate or null>",
     current: <true/false>,
     bullets: ["<bullet 1>", "<bullet 2>", ...]
   }
   ```
4. Read the current `base.experiences` array from the DataStore state
5. Append the new experience object
6. Call `GreedevCV.DataStore.updateBase('experiences', updatedArray)`
7. Push the new ID to `version.selectedExperiences`
8. Call `GreedevCV.DataStore.updateVersion('selectedExperiences', updatedSelected)`
9. Call `GreedevCV.DataStore.saveBase()` to persist

#### Scenario: Creates a new experience entry

- GIVEN the Experience section is visible in the editor
- AND the base pool has 2 experiences
- AND the form is expanded with valid data
- WHEN the user fills in company "Acme Corp", role "Engineer", location "Remote", startDate "2026-01", and clicks "Add"
- THEN a new experience object with a unique ID is appended to `base.experiences` (now 3 entries)
- AND the new ID is appended to `version.selectedExperiences`
- AND `saveBase()` is called
- AND the Preview immediately shows the new experience

#### Scenario: Current checkbox clears end date

- GIVEN the form is expanded
- WHEN the user checks "Current"
- THEN the end date field is cleared and disabled (or hidden)
- AND the resulting object has `endDate: null` and `current: true`

### Requirement: Validation prevents incomplete submissions

The form MUST validate required fields before submitting. If `company`, `role`, or `startDate` are empty when the user clicks "Add", the form MUST NOT submit and MUST show inline validation messages.

#### Scenario: Rejects submission with missing company

- GIVEN the form is expanded with an empty company field
- WHEN the user clicks "Add"
- THEN no DataStore mutation occurs
- AND a message "Company is required" is shown near the company field

### Requirement: Submitted form resets or confirms

After successful submission, the form SHOULD either:
- Reset to empty ready for another entry, OR
- Collapse with a brief confirmation (e.g., the item appears in the selector list above)

The form MUST NOT remain filled with stale data after submission.

## Acceptance Criteria

- [ ] "+ Add experience" toggle is present and hidden by default
- [ ] Toggle expands/collapses the inline form and clears inputs on collapse
- [ ] Form creates a new experience object in the base pool with a unique ID
- [ ] New experience ID is appended to `selectedExperiences` (auto-selected)
- [ ] `saveBase()` is called after creation
- [ ] Preview shows the new experience immediately
- [ ] Validation prevents empty required fields
- [ ] "Current" checkbox clears and disables the end date field
- [ ] New experience persists after page reload
