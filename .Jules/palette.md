# Palette's Journal - Critical Learnings

This journal documents critical UX and accessibility learnings, recurring patterns, and key constraints for the project.

## 2025-05-18 - Password Visibility and Screen Reader Feedback
**Learning:** Auth forms with auto-generated or complex operator credentials often cause high user error rates on login when users cannot inspect what they typed before submitting. Adding an accessible show/hide toggle alongside `role="alert"` on login error banners significantly improves error recovery and reduces failed sign-in attempts.
**Action:** Always provide accessible show/hide affordances with appropriate `aria-label` and `aria-pressed` for password inputs, and ensure dynamic form error messages use `role="alert"`.
