## 2025-03-09 - [Reduce Layout Thrashing in SVG Path Animations]
**Learning:** For React components animating along SVG paths (like `MovingBorder`), calculating `x` and `y` separately using `useTransform` with `getPointAtLength` causes layout thrashing because it forces the browser to evaluate the SVG path twice per frame.
**Action:** Combine the transforms into a single `useTransform` hook that queries `getPointAtLength` once and returns the complete composite CSS `transform` string. This cuts expensive DOM layout calculations by half.
