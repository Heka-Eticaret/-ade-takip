## 2025-05-18 - Segmented controls accessibility in ReturnDashboard
**Learning:** Custom segmented button groups using `.active` / `.selected` classes for visual selection state do not implicitly announce their state to screen readers.
**Action:** Always wrap segmented button groups in `role="group"` with an `aria-label`, and supply explicit `aria-pressed={boolean}` attributes to individual toggle options.
