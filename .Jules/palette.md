## 2025-05-18 - Accessibility for toolbar select controls and keyboard focus indicators

**Learning:** Unlabeled select inputs in toolbars rely solely on default option text for context, making them difficult for screen reader users to navigate effectively. Additionally, interactive buttons and inputs need explicit `:focus-visible` ring outlines to provide keyboard users with clear visual feedback without affecting pointer interactions.
**Action:** Always provide explicit `aria-label` attributes for icon/filter controls that lack visible `<label>` tags, and define standard `:focus-visible` styling across interactive elements in `globals.css`.
