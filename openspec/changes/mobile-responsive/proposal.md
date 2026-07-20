# Proposal: mobile-responsive

## Intent

The CV editor is unusable on screens below 768px: toolbar buttons overflow, the header collapses, bilingual fields cram side-by-side, and the two-column layout (editor + preview) leaves no room for actual content. This change makes the app functional on mobile without adding a framework or build step.

## Scope

### In Scope
- Add breakpoints at 1024px and 768px to `css/styles.css`
- Add `flex-wrap` to toolbar and header for overflow prevention
- Stack bilingual fields vertically on mobile (no more side-by-side)
- Implement a JS tab-switcher (~30 lines) to toggle between editor and preview panels on mobile
- Preserve scroll position and editor state when switching panels

### Out of Scope
- Auth pages (already have their own breakpoint at 480px — no changes needed)
- Touch gestures (swipe, pinch-zoom, etc.)
- Print styles — unchanged
- JSON schema or data model changes

## Capabilities

### New Capabilities
None — this is a pure responsive/enhancement change with no new business capabilities.

### Modified Capabilities
None — no existing capability specs change at the requirements level.

## Approach

1. **CSS breakpoints** — add `@media (max-width: 1024px)` and `@media (max-width: 768px)` to `styles.css`. At 768px: collapse the two-column grid to single column, stack bilingual fields, and hide one panel at a time.
2. **Flex-wrap** — add `flex-wrap: wrap` to toolbar and header containers so items wrap instead of overflowing.
3. **Tab toggle** — add two small buttons (Editor / Preview) above the main content area in `index.html`. Wire them in `app.js`: clicking a tab shows the corresponding panel, hides the other, and preserves scroll position.
4. **State preservation** — the tab toggle hides panels via `display: none` but does not detach them from the DOM. Editor state (unsaved input, scroll position on each panel) is preserved naturally.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `css/styles.css` | Modified | Add breakpoints at 1024px and 768px, flex-wrap, responsive layout rules |
| `index.html` | Modified | Add tab toggle buttons (Editor / Preview) |
| `app.js` | Modified | Wire tab toggle behavior, panel switching (~30 lines) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tab toggle loses editor scroll position | Low | Use `display: none` — DOM stays intact, scroll pos preserved |
| Bilingual fields cramped on mid-size screens (768-1024px) | Med | Stack at 768px breakpoint, keep side-by-side at 1024px |
| Tab buttons conflict with existing toolbar | Low | Place tabs above the editor/preview split, not inside the toolbar |

## Rollback Plan

Revert changes to the four affected files via `git checkout`:
- `git checkout -- css/styles.css index.html app.js`
- Verify the app loads and layouts match pre-change state on desktop and mobile.

## Dependencies

None — zero external dependencies, no build step, no framework.

## Success Criteria

- [ ] App layout does not overflow horizontally on any screen width from 320px to 1920px
- [ ] Toolbar and header items wrap gracefully at narrow widths (no cutoff, no horizontal scroll)
- [ ] Bilingual fields stack vertically at 768px and below
- [ ] Tab toggle shows/hides editor and preview panels without losing unsaved input or scroll position
- [ ] Server-rendered pages (login, register) remain unaffected
