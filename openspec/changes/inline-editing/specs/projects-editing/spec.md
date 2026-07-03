# projects-editing Specification

## Purpose

Allow users to create new project entries directly from the editor panel — without editing JSON files by hand. New projects write to the base pool (`data/cv.json`), auto-select in the active version, and persist to disk.

## Requirements

### Requirement: Inline project creation form

The editor MUST render a collapsible inline form at the bottom of the Projects section in the editor panel for adding a new project entry.

The form MUST include input fields for:
- **Name** (text, required)
- **Description** (textarea, optional)
- **URL** (text, optional)
- **Technologies** (text input or tag-style input, optional — comma-separated or multi-entry)
- **Bullets** (multi-line textarea or dynamic list, optional) — initial bullet entries

The form MUST be hidden by default and expandable via a toggle button labeled "+ Add project".

#### Scenario: Form is collapsed by default

- GIVEN the Projects section is rendered in the editor
- WHEN the page loads
- THEN the inline form is not visible
- AND a toggle button "+ Add project" is present

#### Scenario: Toggle expands and collapses the form

- GIVEN the inline form is hidden
- WHEN the user clicks "+ Add project"
- THEN the form appears (class `inline-form open`)
- WHEN the user clicks "Cancel" or the toggle again
- THEN the form is hidden and input values are cleared

### Requirement: Form submission creates new project

When the user fills in the form and clicks "Add", the editor MUST:

1. Validate that `name` is non-empty
2. Generate a unique ID via `GreedevCV.DataStore.generateId()`
3. Construct a project object:
   ```js
   {
     id: "<generated-uuid>",
     name: "<name>",
     description: "<description>",
     url: "<url>",
     technologies: ["<tech 1>", "<tech 2>", ...],
     bullets: ["<bullet 1>", "<bullet 2>", ...]
   }
   ```
4. Parse `technologies` from the input — split comma-separated values, trim whitespace, filter empty strings
5. Parse `bullets` from the textarea — split by newline or collect from dynamic list
6. Read the current `base.projects` array from the DataStore state
7. Append the new project object
8. Call `GreedevCV.DataStore.updateBase('projects', updatedArray)`
9. Push the new ID to `version.selectedProjects`
10. Call `GreedevCV.DataStore.updateVersion('selectedProjects', updatedSelected)`
11. Call `GreedevCV.DataStore.saveBase()` to persist

#### Scenario: Creates a new project entry

- GIVEN the Projects section is visible in the editor
- AND the base pool has 1 project
- AND the form is expanded with valid data
- WHEN the user fills in name "My App", description "A sample project", URL "https://myapp.dev", technologies "React,Node.js", bullets "Built the frontend\nWrote the API", and clicks "Add"
- THEN a new project object with a unique ID is appended to `base.projects` (now 2 entries)
- AND `technologies` is stored as `["React", "Node.js"]`
- AND `bullets` is stored as `["Built the frontend", "Wrote the API"]`
- AND the new ID is appended to `version.selectedProjects`
- AND `saveBase()` is called
- AND the Preview immediately shows the new project

### Requirement: Validation requires at minimum the project name

The form MUST validate that `name` is non-empty before submitting. If `name` is empty when the user clicks "Add", the form MUST NOT submit and MUST show an inline validation message.

All other fields (description, URL, technologies, bullets) are optional — an empty value MUST store as an empty string or empty array, not `null` or `undefined`.

#### Scenario: Rejects empty project name

- GIVEN the form is expanded with an empty name field
- WHEN the user clicks "Add"
- THEN no DataStore mutation occurs
- AND a message "Project name is required" is shown near the name field

#### Scenario: Creates project with only a name

- GIVEN the form is expanded
- WHEN the user enters only "My App" as the name and clicks "Add"
- THEN the project object is created with `name: "My App"`, `description: ""`, `url: ""`, `technologies: []`, `bullets: []`
- AND `saveBase()` is called
- AND the new project appears in the Preview

### Requirement: Technologies field parsing

The technologies input MUST accept a comma-separated string. The editor MUST split on `,`, trim whitespace from each entry, and filter out empty strings before storing.

If the user enters "React, Node.js, " (trailing comma and space), the stored array MUST be `["React", "Node.js"]`.

#### Scenario: Parses comma-separated technologies

- GIVEN the technologies field contains "React, Node.js,   , Tailwind"
- WHEN the form is submitted
- THEN `technologies` is stored as `["React", "Node.js", "Tailwind"]` (empty entries filtered)

## Acceptance Criteria

- [ ] "+ Add project" toggle is present and hidden by default
- [ ] Toggle expands/collapses the inline form and clears inputs on collapse
- [ ] Form creates a new project object in the base pool with a unique ID
- [ ] New project ID is appended to `selectedProjects` (auto-selected)
- [ ] `saveBase()` is called after creation
- [ ] Preview shows the new project immediately
- [ ] Validation prevents empty project name
- [ ] All other fields accept empty values gracefully
- [ ] Technologies are parsed from comma-separated string
- [ ] Bullets are collected from textarea or list input
- [ ] New project persists after page reload
