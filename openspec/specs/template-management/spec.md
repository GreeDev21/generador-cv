# Template Management Specification

## Purpose

Desacoplar el renderizado visual del dispatcher de preview. Templates son pluggables, se seleccionan por versión, y renderizan con CSS aislado sin leaks entre sí.

## Requirements

### Requirement: Template Registry API

`GreedevCV.Templates` MUST expose `register(name, renderFn)`, `get(name)`, and `list()`.

#### Scenario: register and resolve a template

- GIVEN no template named `"modern"` is registered
- WHEN `GreedevCV.Templates.register("modern", renderFn)` is called
- THEN `GreedevCV.Templates.get("modern")` returns `renderFn`
- AND `GreedevCV.Templates.list()` includes `"modern"`

#### Scenario: get returns undefined for unknown template

- GIVEN no template named `"foo"` is registered
- WHEN `GreedevCV.Templates.get("foo")` is called
- THEN it returns `undefined`

### Requirement: Default Harvard Template

`"harvard"` MUST be registered at app startup and MUST be available before any version renders.

#### Scenario: harvard is always available

- GIVEN the app has initialized
- WHEN `GreedevCV.Templates.get("harvard")` is called
- THEN it returns a function that accepts a `data` object and returns an HTML string

### Requirement: Template Field in Version Config

Each version config MUST carry a `template` field defaulting to `"harvard"` for backward compatibility.

#### Scenario: existing versions without template field

- GIVEN a version config lacks `template`
- WHEN the version is loaded
- THEN `versionConfig.template` defaults to `"harvard"`

#### Scenario: template persists across reloads

- GIVEN the user selects `"modern"` for a version
- WHEN the version is saved and the page is reloaded
- THEN the version renders with the `"modern"` template

### Requirement: Template Selector in Editor

The editor MUST display a template `<select>` in the version settings panel, populated with all registered templates.

#### Scenario: switching template re-renders preview

- GIVEN the preview shows the `"harvard"` template
- WHEN the user selects `"modern"` from the dropdown
- THEN `DataStore.updateVersionConfig({ template: "modern" })` is called
- AND the preview re-renders with the `"modern"` template without a page reload

#### Scenario: switching template preserves unsaved edits

- GIVEN the user has unsaved changes in a form field
- WHEN the user changes the template selector
- THEN the preview re-renders with the new template
- AND the unsaved edits remain intact in the editor

### Requirement: Preview Delegates to Active Template

The preview MUST resolve `versionConfig.template` via the registry and invoke its `render(data)` function. `buildRenderData()` MUST remain template-agnostic.

#### Scenario: unknown template falls back to harvard

- GIVEN `versionConfig.template` is set to `"nonexistent"`
- WHEN the preview renders
- THEN it falls back to `"harvard"`
- AND a warning is logged to the console

### Requirement: CSS Scoping by Template

Each template MUST prefix its CSS classes with a unique prefix (`.hr-*` for Harvard, `.md-*` for Modern) to prevent style leaks between templates.

#### Scenario: no style interference between templates

- GIVEN a CSS rule `.hr-title { font-family: serif; }` exists
- WHEN the Modern template renders an element with class `.md-title`
- THEN `.md-title` does NOT inherit `font-family: serif` from `.hr-title`

#### Scenario: both templates can render simultaneously

- GIVEN the user switches from `"harvard"` to `"modern"`
- WHEN both DOM trees coexist momentarily during re-render
- THEN all Harvard elements use only `.hr-*` classes
- AND all Modern elements use only `.md-*` classes
- AND no class name appears in both prefixes
