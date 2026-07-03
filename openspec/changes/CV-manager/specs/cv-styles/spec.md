# cv-styles Specification

## Purpose

CSS architecture for the CV Manager: responsive split-view layout, Harvard template typography, print styles for PDF output, and CSS custom properties for theming. No CSS frameworks.

## Requirements

### Requirement: Split-view layout

The app container MUST use CSS Grid or Flexbox to create a side-by-side layout on desktop (`min-width: 768px`): editor panel on the left (40% width), preview panel on the right (60% width).

On viewports below `768px`, the layout MUST stack vertically: editor on top, preview below.

#### Scenario: Desktop split view

- GIVEN the viewport is `1200px` wide
- WHEN the app renders
- THEN `.editor-panel` occupies 40% width on the left, `.preview-panel` occupies 60% on the right

#### Scenario: Mobile stacked view

- GIVEN the viewport is `600px` wide
- WHEN the app renders
- THEN `.editor-panel` is above `.preview-panel`, both at full width

### Requirement: Harvard template styling

The preview panel MUST style the Harvard résumé with:

- Serif font stack: `Georgia, "Times New Roman", Times, serif` for body text
- Sans-serif for section headings: `"Helvetica Neue", Helvetica, Arial, sans-serif`
- Name in header: `font-size: 24px`, bold, centered
- Contact line: small (13px), centered, with interpunct separators (`·`)
- Section headings: uppercase, 11px, letter-spacing `1.5px`, bottom border `1px solid #333`
- Bullet points: `padding-left: 1.2em`, hanging indent style
- Date ranges: right-aligned, `color: #555`, `font-size: 13px`
- Company/institution names: bold
- Role/degree: normal weight, italic if desired
- Maximum width: `800px`, centered with auto margins

#### Scenario: Renders Harvard-styled preview

- GIVEN the preview renders a CV with all sections
- WHEN inspected
- THEN the name is 24px bold centered, section headings are uppercase with bottom border, and body text is Georgia serif

### Requirement: Print CSS

The print stylesheet MUST apply the following:

```css
@page {
  size: letter;
  margin: 0.75in 0.75in;
}
```

- `.editor-panel`: `display: none` — hidden on print
- `body`: `background: white; color: black`
- All text: `font-size: 11pt` for body, `14pt` for name, `10pt` for section headings
- Links: `color: inherit; text-decoration: none` (URLs are not printed)
- Preview panel: `width: 100%; max-width: none; box-shadow: none`
- Section headings bottom border remains visible
- Avoid page breaks inside experience entries (`page-break-inside: avoid`)

#### Scenario: Print hides editor and styles preview

- GIVEN the user triggers `window.print()` (Ctrl+P)
- WHEN `@media print` applies
- THEN `.editor-panel` is hidden, `.preview-panel` spans full width with print typography
- AND no page breaks occur inside experience blocks

### Requirement: CSS custom properties

The stylesheet MUST use `:root` CSS custom properties (`--color-*`, `--radius`, `--font-*`) for theming. All color values MUST reference custom properties, not raw hexes in component styles.

Default theme:

| Property | Value |
|----------|-------|
| `--color-bg` | `#fafafa` |
| `--color-text` | `#1a1a1a` |
| `--color-primary` | `#2563eb` |
| `--color-border` | `#e5e7eb` |
| `--radius` | `6px` |
| `--font-sans` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| `--font-serif` | `Georgia, 'Times New Roman', Times, serif` |

### Requirement: Editor form styles

Editor forms MUST use consistent spacing: `16px` padding between sections, `8px` gap between related fields. Inputs, selects, and textareas MUST use full width, `border: 1px solid var(--color-border)`, `border-radius: var(--radius)`, and `padding: 8px 12px`. On focus, inputs MUST show `border-color: var(--color-primary)` with a subtle `box-shadow`.

Checkboxes and toggles MUST have a minimum touch target of `44x44px` for mobile accessibility.

## Acceptance Criteria

- [ ] Desktop shows side-by-side split, mobile shows stacked
- [ ] Preview uses serif body font, sans-serif headings, uppercase section headers
- [ ] Print preview hides editor, shows full-width preview with letter page margins
- [ ] Page breaks avoid splitting experience entries
- [ ] All colors reference CSS custom properties
- [ ] Editor inputs show focus ring with primary color
- [ ] Checkboxes have 44x44px minimum touch target
