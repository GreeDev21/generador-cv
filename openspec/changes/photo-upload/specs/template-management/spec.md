# Delta for Template Management

## ADDED Requirements

### Requirement: Modern Template Registered

`"modern"` MUST be registered at app startup alongside `"harvard"`, using `GreedevCV.Templates.register()`. It MUST be available before any version renders.

#### Scenario: modern is available at startup

- GIVEN the app has initialized
- WHEN `GreedevCV.Templates.get("modern")` is called
- THEN it returns a function that accepts a `data` object and returns an HTML string

#### Scenario: modern appears in template selector

- GIVEN the app has initialized
- WHEN `GreedevCV.Templates.list()` is called
- THEN the result includes `"modern"` alongside `"harvard"`

### Requirement: Modern Template Layout

The `"modern"` render function MUST produce a 2-column layout with a left sidebar (class `.md-sidebar`) containing the photo and contact info, and a right column for the main CV body.

#### Scenario: modern renders with photo in sidebar

- GIVEN `data.photo` contains a valid URL
- WHEN the `"modern"` render function is invoked
- THEN the output contains `<img class="md-photo" src="...">` inside `.md-sidebar`

#### Scenario: modern renders without photo

- GIVEN `data.photo` is `undefined`
- WHEN the `"modern"` render function is invoked
- THEN the `.md-sidebar` renders contact info
- AND no `<img>` element appears

### Requirement: Conditional Photo in Harvard Header

The `"harvard"` render function MUST conditionally include an `<img class="hr-photo">` in the header section when `data.photo` contains a valid URL.

#### Scenario: harvard header shows photo when available

- GIVEN `data.photo` contains a valid URL
- WHEN the `"harvard"` render function is invoked
- THEN the header includes `<img class="hr-photo" src="{url}">`

#### Scenario: harvard header omits photo when absent

- GIVEN `data.photo` is `undefined`
- WHEN the `"harvard"` render function is invoked
- THEN the header renders without any `<img>` element
- AND the existing Harvard layout is unchanged
