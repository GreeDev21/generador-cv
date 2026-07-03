# cv-editor Specification

## Purpose

Form-based editor UI for all CV sections powered by `GreedevCV.Editor`. Provides data binding, section toggles, experience/skill/project selectors, and inline bullet editing. Left panel in split view.

## Requirements

### Requirement: Personal info form

The editor MUST render text inputs for name, email, phone, location, website, LinkedIn, and GitHub with labels.

Each field MUST be bound to `DataStore.basePool.personalInfo` — changes update the data store immediately.

#### Scenario: Edits personal info

- GIVEN the editor is rendered
- WHEN the user types a new name in the "Name" input
- THEN the DataStore's `personalInfo.name` updates on every keystroke
- AND the Preview reflects the change immediately

### Requirement: Summary editor

The editor MUST render a `<textarea>` for the summary with a character count.

#### Scenario: Edits summary

- GIVEN the editor is rendered
- WHEN the user modifies the summary textarea
- THEN DataStore.summary is updated on each keystroke
- AND the character count updates

### Requirement: Version-aware section selectors

For each of experience, education, skills, and projects, the editor MUST render a list of checkboxes or toggles sourced from the base pool.

Checked items populate the version's `selectedExperiences` / `selectedEducation` / `selectedSkills` / `selectedProjects`.

#### Scenario: Toggles an experience on/off

- GIVEN the version's `selectedExperiences` is `["exp-1"]`
- WHEN the user unchecks "exp-1" and checks "exp-2"
- THEN `selectedExperiences` becomes `["exp-2"]`
- AND the Preview hides exp-1 and shows exp-2

### Requirement: Bullet editing per experience

The editor MUST render an editable bullet list for each selected experience. The user MAY add, edit, reorder, and remove bullets.

Bullet changes update `versionConfig.experienceBullets[exp-id]`.

If `experienceBullets[exp-id]` is empty or undefined, the editor falls back to base pool bullets.

#### Scenario: Adds a custom bullet

- GIVEN the experience "exp-1" is selected and has 3 base bullets
- WHEN the user adds a 4th custom bullet in the editor
- THEN `versionConfig.experienceBullets["exp-1"]` contains `["...", "...", "...", "new bullet"]`
- AND the Preview shows 4 bullets for that experience

### Requirement: Section visibility toggles

The editor MUST render a toggle for each section (summary, education, experience, skills, projects) that controls the version's `sections.*` boolean flags.

Toggling a section OFF MUST remove it from the rendered Preview.

#### Scenario: Hides skills section

- GIVEN `sections.skills` is `true`
- WHEN the user toggles skills OFF in the editor
- THEN `sections.skills` becomes `false`
- AND the Preview hides the entire skills section

### Requirement: Editor hidden on print

The editor panel MUST have class `editor-panel` and MUST be hidden when `@media print` applies.

#### Scenario: Editor is not printed

- GIVEN the user opens the Print dialog (Ctrl+P)
- WHEN the print stylesheet applies
- THEN `.editor-panel` has `display: none`

## Acceptance Criteria

- [ ] Personal info fields render and update Preview live
- [ ] Summary textarea shows character count and updates Preview
- [ ] Section checkboxes toggle which items appear in Preview
- [ ] Bullet editor adds/edits/removes custom bullets per experience
- [ ] Section visibility toggles show/hide entire sections in Preview
- [ ] Editor is hidden in print output
