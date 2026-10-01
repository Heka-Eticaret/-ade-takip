## 2025-05-15 - Segmented controls and filter select accessibility
**Learning:** Segmented toggle button groups and status alerts in ReturnDashboard lack proper ARIA attributes, causing screen readers to miss active toggle states and dynamic status message updates.
**Action:** Always add `aria-pressed` and `role="group"` (with `aria-labelledby`) to segmented toggle controls, add `aria-label` to standalone select inputs, and use `role="status"`/`aria-live="polite"` on alert message containers.
