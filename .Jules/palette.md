# Palette's Journal

## 2026-07-22 - Segmented Action Buttons & Status Feedback Accessibility
**Learning:** Custom segmented button controls and state-toggle buttons in operation dashboards provide visual active states with CSS classes (like `.active` or `.selected`), but without `aria-pressed` or `role="group"`, screen reader users cannot perceive which status or decision is currently active. Furthermore, toast-like transient alert messages need `role="status"` and `role="alert"` with `aria-live` to be announced when actions succeed or fail.
**Action:** Always provide `aria-pressed` to custom segmented/toggle buttons, wrap button groups in a container with `role="group"` and `aria-label`, and announce dynamic feedback using ARIA live regions.
