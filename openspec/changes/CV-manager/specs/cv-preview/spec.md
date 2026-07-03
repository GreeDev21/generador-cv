# cv-preview Specification

## Purpose

Live Harvard template renderer powered by `GreedevCV.Preview`. Renders the merged CV data as a formatted résumé in the right panel. Updates instantly when DataStore emits a change event.

## Requirements

### Requirement: Harvard template layout

The preview MUST render the Harvard résumé template with the following structure:

- **Header**: Name (large, centered), contact line (email | phone | location | website | LinkedIn | GitHub)
- **Summary section**: Single paragraph (hidden if `sections.summary` is false)
- **Experience section**: Each entry with company, role, location, date range, and bullet list
- **Education section**: Each entry with institution, degree, field, GPA, achievements
- **Skills section**: Grouped by category with comma-separated items
- **Projects section**: Each entry with name, description, technologies, and bullets

#### Scenario: Renders full CV with all sections

- GIVEN the merged CV data has all sections enabled and populated
- WHEN `GreedevCV.Preview.render()` is called
- THEN the preview contains: header with name and contact, summary paragraph, 2+ experience entries with bullets, education entries, skills categories, and project entries

### Requirement: Live data binding

The preview MUST subscribe to DataStore's `version-change` event and re-render automatically.

The preview MUST re-render when any field in the merged data changes (debounced at 100ms).

#### Scenario: Updates preview on data change

- GIVEN the preview is rendered with "John" as the name
- WHEN the editor changes name to "Jane" in the DataStore
- THEN within 200ms the preview header updates to show "Jane"

### Requirement: Conditional section rendering

The preview MUST check `versionConfig.sections.*` booleans and only render sections set to `true`.

If a section has no items (e.g., `selectedExperiences` is empty), the preview MUST omit that section entirely.

#### Scenario: Hides empty experience section

- GIVEN `sections.experience` is `true` but `selectedExperiences` is an empty array
- WHEN the preview renders
- THEN the "Experience" heading and section are absent from the DOM

#### Scenario: Omits disabled section

- GIVEN `sections.projects` is `false` even though projects data exists
- WHEN the preview renders
- THEN the projects section is not rendered

### Requirement: Bullet override merging

For each experience in `selectedExperiences`, the preview MUST check `versionConfig.experienceBullets[exp-id]`. If present and non-empty, use those bullets; otherwise use base pool bullets.

#### Scenario: Uses custom bullets when available

- GIVEN experience "exp-1" has 3 base bullets and `experienceBullets["exp-1"]` has 2 custom bullets
- WHEN the preview renders exp-1
- THEN only the 2 custom bullets are displayed

### Requirement: Print-ready output

The preview container MUST have class `preview-panel`. When printed, it MUST span full width (editor hidden). Typography MUST use a serif font stack (Georgia, "Times New Roman", serif) sized for print. Ink colors MUST be black/dark gray only.

## Acceptance Criteria

- [ ] Preview renders all 5 sections in Harvard template layout
- [ ] Changing editor data updates Preview within 200ms
- [ ] Disabled sections are not rendered
- [ ] Empty sections (no selected items) are not rendered
- [ ] Custom bullets from version config override base bullets
- [ ] Print output shows full-width preview with serif fonts, no editor
