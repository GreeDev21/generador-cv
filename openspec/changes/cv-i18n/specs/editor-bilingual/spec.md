# Bilingual Editor Fields Specification

## Purpose

The editor currently shows a single input per field. With bilingual support, translatable fields must display two inputs side by side — one for English, one for Spanish — so users can enter and edit both language versions independently. Non-translatable fields remain as single inputs. Both values are preserved in the data model as `{ en, es }` objects.

## Requirements

### Requirement: translatable fields show two labeled inputs

Every translatable field in the editor MUST render two `<input>` or `<textarea>` elements with explicit language labels, positioned side by side.

#### Scenario: summary textarea is bilingual

- GIVEN `base.summary` is `{ "en": "Frontend Designer...", "es": "Diseñador Frontend..." }`
- WHEN the editor renders the Summary section
- THEN the summary field shows TWO textareas
- AND the first textarea is labeled "EN" and contains `"Frontend Designer..."`
- AND the second textarea is labeled "ES" and contains `"Diseñador Frontend..."`

#### Scenario: experience role input is bilingual

- GIVEN `base.experiences[0].role` is `{ "en": "Co-founder", "es": "Cofundador" }`
- WHEN the editor renders the Experience inline form
- THEN the "Role" field shows TWO inputs labeled "EN" and "ES"
- AND they display the respective language values

#### Scenario: bullet editor textareas are bilingual

- GIVEN `base.experiences[0].bullets` is `[{ "en": "Building products", "es": "Construyendo productos" }]`
- WHEN the bullet editor renders for this experience
- THEN each bullet row shows TWO textareas
- AND the first is labeled "EN" with the English bullet
- AND the second is labeled "ES" with the Spanish bullet

#### Scenario: education degree and field are bilingual

- GIVEN `base.education[0].degree` is `{ "en": "Technician", "es": "Tecnicatura" }`
- AND `base.education[0].field` is `{ "en": "Systems Analysis", "es": "Análisis de Sistemas" }`
- WHEN the editor renders the Education section
- THEN both "Degree" and "Field" show EN/ES input pairs

#### Scenario: education achievements are bilingual

- GIVEN `base.education[0].achievements` has items
- WHEN the education inline form renders
- THEN achievement fields show EN/ES textarea pairs

#### Scenario: project name and description are bilingual

- GIVEN `base.projects[0].name` is `{ "en": "Portfolio", "es": "Portafolio" }`
- WHEN the Projects inline form renders
- THEN the "Name" and "Description" fields show EN/ES input pairs

### Requirement: non-translatable fields remain single input

Fields that are not translatable MUST render as a single input with no language label, exactly as they do today.

#### Scenario: personal info stays single input

- GIVEN `base.personalInfo.name` is `"Agustín Burgos"` (plain string)
- WHEN the editor renders Personal Info
- THEN each personal info field shows ONE input (no EN/ES split)
- AND there are no language labels

#### Scenario: experience company is single input

- GIVEN `base.experiences[0].company` is `"WebXpert"` (plain string)
- WHEN the inline form renders
- THEN the "Company" field shows ONE input with value `"WebXpert"`

#### Scenario: technology names are single input

- GIVEN `base.projects[0].technologies` is `["Astro", "Vercel"]`
- WHEN the inline form renders
- THEN the "Technologies" field shows ONE input

### Requirement: data-path + data-lang pattern for editor binding

The editor MUST use `data-path` for the field path and `data-lang` for the language suffix on each input. The generic change handler constructs the nested setter call accordingly.

#### Scenario: EN input has data-lang="en"

- GIVEN a translatable field `summary`
- WHEN the editor renders
- THEN the EN textarea has `data-store="version" data-path="summary" data-lang="en"`
- AND the ES textarea has `data-store="version" data-path="summary" data-lang="es"`

#### Scenario: change handler writes nested property

- GIVEN the user types in the ES summary textarea (`data-lang="es"`)
- WHEN the change event fires
- THEN `DataStore.updateVersion("summary", { "en": existingEn, "es": newValue })` is called
- OR alternatively `handleChange` reads `data-lang` and calls `setNested(obj, path + '.es', value)`

### Requirement: inline form submission creates bilingual objects

When the user submits an inline form to create a new experience, education, or project entry, translatable fields MUST be stored as `{ en, es }` objects where both values are initialized to the entered text.

#### Scenario: new experience role is bilingual

- GIVEN the user fills "Role" input with `"Engineer"` in a new experience inline form
- WHEN the form is submitted
- THEN the new experience's `role` field is `{ "en": "Engineer", "es": "Engineer" }`

#### Scenario: new project name is bilingual

- GIVEN the user fills "Name" input with `"My App"` in a new project inline form
- WHEN the form is submitted
- THEN the new project's `name` field is `{ "en": "My App", "es": "My App" }`

### Requirement: version config translatable fields are bilingual

The editor sections that edit version-level fields (`targetRole`, `targetCompany`, `summary`) MUST also show bilingual inputs.

#### Scenario: version targetRole is bilingual

- GIVEN `activeVersion.targetRole` is `{ "en": "Frontend Developer", "es": "Desarrollador Frontend" }`
- WHEN the editor renders (e.g. in a version metadata section)
- THEN the targetRole field shows two labeled inputs
- AND the EN input shows `"Frontend Developer"`
- AND the ES input shows `"Desarrollador Frontend"`

### Requirement: both values preserved on edit

When the user edits one language, the other language's value MUST NOT be lost.

#### Scenario: editing ES preserves EN

- GIVEN `summary` is `{ "en": "Hello", "es": "Hola" }`
- WHEN the user edits ES from `"Hola"` to `"Hola mundo"`
- THEN `summary.en` is still `"Hello"`
- AND `summary.es` is `"Hola mundo"`

## Acceptance Criteria

- [ ] Every translatable field shows two labeled inputs (EN/ES) side by side
- [ ] Non-translatable fields show a single input (unchanged)
- [ ] `data-path` and `data-lang` attributes are used for binding
- [ ] The change handler writes to the correct language sub-path
- [ ] Inline form submissions create `{ en, es }` objects for translatable fields
- [ ] Editing one language never overwrites the other
- [ ] Version config translatable fields (targetRole, targetCompany, summary) are also bilingual
