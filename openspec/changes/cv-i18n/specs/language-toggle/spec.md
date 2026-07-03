# Language Toggle Specification

## Purpose

Users need to switch between English and Spanish CV content without leaving the editor. The language toggle provides a UI control in the app header that changes the active language globally, persists the preference to the version config, and notifies all modules so they re-render with the selected language.

## Requirements

### Requirement: language toggle UI

The app header MUST display a language toggle control that shows the current language and allows switching between `"en"` and `"es"`.

#### Scenario: toggle renders in header

- GIVEN the app has initialized
- WHEN the DOM is rendered
- THEN there is a visible language toggle control in the header (e.g. a button or select showing "EN" or "ES")
- AND the toggle displays the current language from the active version config

#### Scenario: toggle switches language

- GIVEN the toggle shows "EN"
- WHEN the user clicks the toggle
- THEN the toggle switches to show "ES"
- AND `DataStore.setLanguage("es")` is called
- AND `activeVersion.language` is set to `"es"`

#### Scenario: toggle cycles between EN and ES

- GIVEN the current language is `"en"`
- WHEN the user clicks the toggle twice
- THEN the language cycles: `"en"` → `"es"` → `"en"`

### Requirement: DataStore language API

`DataStore` MUST expose `setLanguage(lang)` and `getLanguage()` methods for reading and writing the current language.

#### Scenario: setLanguage updates version config

- GIVEN `activeVersion.language` is `"en"`
- WHEN `DataStore.setLanguage("es")` is called
- THEN `state.activeVersion.language` equals `"es"`
- AND the localStorage draft is updated (debounced)

#### Scenario: getLanguage returns current value

- GIVEN `activeVersion.language` is `"es"`
- WHEN `DataStore.getLanguage()` is called
- THEN it returns `"es"`

#### Scenario: getLanguage defaults to "en"

- GIVEN `activeVersion.language` is not set (undefined)
- WHEN `DataStore.getLanguage()` is called
- THEN it returns `"en"`

#### Scenario: language is persisted in version config

- GIVEN the user switches language to `"es"`
- WHEN the version is saved to the server via `DataStore.save()`
- THEN the saved JSON file includes `"language": "es"`
- AND on subsequent load, the language is restored

### Requirement: GreedevCV:languagechange event

`DataStore.setLanguage()` MUST dispatch a `GreedevCV:languagechange` event on `document` so that Editor, Preview, and App can react.

#### Scenario: languagechange event carries language

- GIVEN the current language is `"en"`
- WHEN `DataStore.setLanguage("es")` is called
- THEN a custom event `GreedevCV:languagechange` is dispatched
- AND `event.detail.language` equals `"es"`

#### Scenario: Preview re-renders on language change

- GIVEN the Preview is showing English content
- WHEN `GreedevCV:languagechange` fires
- THEN `Preview` re-renders with Spanish content within 100ms debounce

#### Scenario: Editor doesn't re-render on language change

- GIVEN the Editor is showing bilingual fields
- WHEN `GreedevCV:languagechange` fires
- THEN the Editor does NOT re-render (it shows both languages always)

#### Scenario: version selector re-population NOT triggered

- GIVEN `GreedevCV:languagechange` fires
- THEN `populateVersionSelector()` is NOT called (language switch does not change version list)

### Requirement: current language indicator

The toggle MUST clearly indicate which language is currently active, both visually and via an ARIA attribute for accessibility.

#### Scenario: toggle shows active language

- GIVEN the current language is `"en"`
- WHEN the toggle renders
- THEN the toggle text includes "EN"
- AND the toggle has `aria-label="Current language: English. Click to switch to Spanish."`
- AND the toggle has `data-current-lang="en"`

#### Scenario: toggle updates on switch

- GIVEN the current language is `"en"`
- WHEN the user switches to `"es"`
- THEN the toggle text updates to show "ES"
- AND `aria-label` updates to `"Current language: Spanish. Click to switch to English."`
- AND `data-current-lang` updates to `"es"`

### Requirement: language toggle is global, not per-version

The language toggle affects how the current version renders, but it's a user preference stored IN the version config itself. When switching versions, the language follows whatever was last set in that version.

#### Scenario: language follows version

- GIVEN version A has `language: "en"` and version B has `language: "es"`
- WHEN the user switches from version A to version B
- THEN the toggle updates to show "ES"
- AND the preview re-renders in Spanish

## Acceptance Criteria

- [ ] Language toggle renders in the app header with current language indicator
- [ ] Clicking the toggle switches between EN and ES
- [ ] `DataStore.setLanguage(lang)` persists the language to version config
- [ ] `DataStore.getLanguage()` returns current language (defaults to "en")
- [ ] `GreedevCV:languagechange` event fires on language switch
- [ ] Preview re-renders on language change; Editor does not
- [ ] Language preference persists across page reloads (via version config)
- [ ] Language follows the active version when switching versions
- [ ] Toggle has proper ARIA labels for accessibility
