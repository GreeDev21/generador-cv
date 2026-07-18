# Tasks: Mobile Responsive

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 100–150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full mobile responsive | PR 1 | Single PR — all 3 files, well under 400 lines |

## Phase 1: CSS Responsive Rules

- [x] 1.1 `css/styles.css` — Add `flex-wrap: wrap` and `row-gap` to `.toolbar` for graceful item wrapping
- [x] 1.2 `css/styles.css` — Add `flex-wrap: wrap` to `.app-header`
- [x] 1.3 `css/styles.css` — Create new `@media (max-width: 1024px)` block: reduce `#app` padding/gap, reduce `.preview-panel` padding
- [x] 1.4 `css/styles.css` — Create new `@media (max-width: 768px)` block: collapse grid to 1 column, remove `.editor-panel`/`.preview-panel` max-height, stack `.bilingual-row` (`flex-direction: column`)
- [x] 1.5 `css/styles.css` — Add `.tab-toggle` / `.tab-btn` styles (`display: none` by default, visible at ≤768px) and `.panel-hidden` (`display: none`)
- [x] 1.6 `css/styles.css` — Add `@media print` rule to hide `.tab-toggle` (if not already covered by `display: none`)

## Phase 2: HTML Tab Toggle

- [x] 2.1 `index.html` — Insert `<div class="tab-toggle">` with two `<button class="tab-btn">` (Editor/Preview) after the `.toolbar` closing `</div>`, before the app-body

## Phase 3: JS Tab Wiring

- [x] 3.1 `app.js` — Add tab toggle logic inside `init()` before the try block: query `.tab-toggle .tab-btn`, define `activateTab(panelId)`, attach click handlers (~25 lines per design spec)

## Phase 4: Visual & Functional Verification

- [x] 4.1 Test at 320px: no horizontal overflow, tab toggle visible, editor panel fills width
- [x] 4.2 Test at 768px: bilingual fields stacked, toolbar/header items wrapped, tab toggle visible
- [x] 4.3 Test at 1024px: reduced padding applied, tab toggle hidden, both panels visible side-by-side
- [x] 4.4 Test at 1440px+: desktop layout unchanged, tab toggle hidden
- [x] 4.5 Test tab toggle: click Preview → editor hides, click Editor → preview hides; verify scroll position and input values preserved across switches
- [x] 4.6 Regression: login/register pages render normally at all widths
- [x] 4.7 Regression: `Ctrl+P` print shows only preview content, no tab buttons
