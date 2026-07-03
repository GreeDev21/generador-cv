# skills-editing Specification

## Purpose

Allow users to add new skill items to existing categories and create entirely new skill categories with items, directly from the editor panel — without editing JSON files by hand. New items and categories write to the base pool (`data/cv.json`), auto-select in the active version, and persist to disk.

## Requirements

### Requirement: Add skill item to existing category

The editor MUST provide an inline form to append a skill item (e.g., "Python") to an existing skill category (e.g., "Languages").

The form MUST be rendered at the bottom of the Skills section in the editor panel.

When submitted, the editor MUST:
1. Read the current `base.skills` array from the DataStore state
2. Locate the category by its `category` string
3. Append the new item to that category's `items` array
4. Call `GreedevCV.DataStore.updateBase('skills', updatedArray)`
5. Call `GreedevCV.DataStore.saveBase()` to persist

Since the category is already selected in the active version, no `selectedSkills` update is necessary — the new item appears automatically in the Preview.

#### Scenario: Adds "Python" to "Languages"

- GIVEN the Skills section is visible in the editor
- AND the "Languages" category exists with items `["TypeScript", "JavaScript"]`
- AND "Languages" is already checked in `selectedSkills`
- WHEN the user selects "Languages" in the inline form, types "Python", and submits
- THEN `base.skills` is updated: the "Languages" category's `items` becomes `["TypeScript", "JavaScript", "Python"]`
- AND `saveBase()` is called
- AND the Preview immediately shows "Python" under "Languages"

#### Scenario: Form does not change `selectedSkills`

- GIVEN "Languages" has `selectedSkills` entry `"Languages"`
- WHEN a new item is added via this form
- THEN `selectedSkills` MUST remain unchanged (same `["Languages", ...]` as before)

### Requirement: Create new skill category with items

The editor MUST provide an inline form to create a brand-new skill category (e.g., "Databases") with an initial set of items (e.g., "PostgreSQL", "MongoDB").

The form MUST be rendered at the bottom of the Skills section, below the "add item to category" form.

When submitted, the editor MUST:
1. Generate a unique ID via `GreedevCV.DataStore.generateId()`
2. Construct a skill object `{ id: <generated>, category: <name>, items: [<items>] }`
3. Read the current `base.skills` array
4. Append the new skill object
5. Call `GreedevCV.DataStore.updateBase('skills', updatedArray)`
6. Push the new `category` string to `version.selectedSkills`
7. Call `GreedevCV.DataStore.updateVersion('selectedSkills', updatedSelected)`
8. Call `GreedevCV.DataStore.saveBase()` to persist

#### Scenario: Creates "Databases" category with items

- GIVEN the Skills section is visible in the editor
- AND the base pool has no "Databases" category
- WHEN the user enters category "Databases", items "PostgreSQL" and "MongoDB", and submits the "new category" form
- THEN a new skill object `{ id: "<uuid>", category: "Databases", items: ["PostgreSQL", "MongoDB"] }` is appended to `base.skills`
- AND `"Databases"` is appended to `version.selectedSkills`
- AND `saveBase()` is called
- AND the Preview immediately shows "Databases" with both items, checked

### Requirement: Distinct forms with clear labels

The editor MUST present two visually distinct inline forms:
- **"Add item"** form: category dropdown (populated from `base.skills`), item text input, submit button
- **"New category"** form: category name input, items text input (comma-separated or multi-line), submit button

Both forms MUST be enclosed in a container with class `inline-form` and MUST be hidden by default.

#### Scenario: Forms are collapsed by default

- GIVEN the Skills section is rendered in the editor
- WHEN the page loads
- THEN neither the "Add item" form nor the "New category" form is visible
- AND each has a toggle button to expand it (e.g., "+ Add skill" and "+ New category")

#### Scenario: Toggle expands and collapses the form

- GIVEN the "Add item" form is hidden
- WHEN the user clicks the "+ Add skill" toggle
- THEN the form becomes visible
- WHEN the user clicks the toggle again (or clicks a "Cancel" button)
- THEN the form is hidden again
- AND any partially entered data is cleared

### Requirement: Submit adds item and re-renders

When either inline form is submitted, the editor MUST:
1. Validate that required fields are non-empty
2. Call the appropriate DataStore methods
3. Leave the form visible in a "submitted" state (or fold it back with a brief confirmation)
4. Re-render the Skills section via the existing `GreedevCV:datachange` event

The Preview MUST reflect the new item or category immediately — no page reload required.

#### Scenario: Submit with empty fields is prevented

- GIVEN the "Add item" form is expanded with an empty item field
- WHEN the user clicks submit
- THEN the form does NOT submit
- AND a validation message is shown (e.g., "Item name is required")

## Acceptance Criteria

- [ ] User can add a skill item to an existing category → item appears in Preview
- [ ] User can create a new skill category with items → category and items appear in Preview, auto-selected
- [ ] Adding an item to an existing category does NOT change `selectedSkills`
- [ ] Creating a new category adds its name to `selectedSkills`
- [ ] Both forms are hidden by default, toggled via buttons
- [ ] Validation prevents empty submissions
- [ ] New items persist after page reload (base pool written to disk)
- [ ] All changes follow the existing IIFE + `datachange` event patterns
