# Palette's Journal

## 2026-07-22 - Filtered Empty State Recovery Patterns
**Learning:** In operation-heavy dashboards with default active filters (like `decisionFilter = "bekliyor"`), users encountering an empty state are often confused whether the system has no data at all or just no items under the current filter. Providing explicit context and a 1-click filter reset or new entry action eliminates friction without cluttering the UI.
**Action:** Always differentiate between full dataset emptiness vs zero filter matches, and offer a dedicated button to clear filters or trigger the primary creation workflow directly from the empty state.
