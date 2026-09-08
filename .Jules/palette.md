## 2025-03-08 - Accessible Live Regions and Segmented Controls
**Learning:** Segmented toggle buttons (like status actions and filters) in this app lack screen reader state communication unless `aria-pressed` is explicitly defined. Dynamic status alert banners also require `role="status"` / `role="alert"` with `aria-live` to announce state updates automatically without shift in focus.
**Action:** Always add `aria-pressed` to custom segmented buttons and `role="status"/"alert"` with `aria-live` on notification/alert banners in React components.
