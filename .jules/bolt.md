## 2024-10-24 - [SVG Path Animation Optimization]
**Learning:** `getPointAtLength` is an expensive DOM method. Calling it multiple times per frame for individual coordinates (e.g., `x` and `y`) in components like Aceternity's `MovingBorder` doubles the performance cost unnecessarily.
**Action:** Combine multiple `useTransform` hooks that query `getPointAtLength` into a single hook that extracts all needed coordinates and returns the combined transform string. This halves the DOM layout calculations per frame.
