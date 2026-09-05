## 2026-03-31 - Segmented Control ARIA Toggle States & Unlabeled Filters
**Learning:** Custom segmented button controls and raw `<select>` elements in dashboard toolbars often omit accessibility semantics like `aria-pressed` and `aria-label`. Without `aria-pressed`, screen reader users cannot perceive which toggle state is active.
**Action:** Always add `aria-pressed={isActive}` on custom button-based segmented controls or status toggles, and add explicit `aria-label` to filter dropdowns.
