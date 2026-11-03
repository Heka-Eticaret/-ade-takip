# Palette's Journal

## 2025-05-18 - Filter-Aware Empty State Quick Actions
**Learning:** When users filter return lists into an empty state, instructing them in static text to "clear filters or add a return" creates friction without actionable buttons. Providing contextual actions directly in the empty state container (e.g. conditional "Filtreleri Temizle" when filters/search are dirty, and "+ Yeni İade Ekle" when the form is closed) coupled with `role="status"` gives both keyboard/mouse users and assistive tech immediate paths forward.
**Action:** Always complement empty state instructional copy with actionable inline controls corresponding to the recommended actions.
