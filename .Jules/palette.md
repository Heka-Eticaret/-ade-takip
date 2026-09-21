## 2025-09-21 - Avoid Interactive Controls Inside Label Elements
**Learning:** Nesting interactive controls like toggle `<button>` inside `<label>` elements causes invalid HTML nesting and causes screen readers and testing tools (like Playwright `get_by_label`) to treat the button text as part of the input's label text.
**Action:** Always place input controls and adjacent buttons inside a wrapper container (e.g. `div.form-group`), keeping `<label>` separate and linked explicitly via `htmlFor` and `id`.
