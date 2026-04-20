## 2024-05-18 - [SVG Path Animation Optimization]
**Learning:** In components using `motion/react` with SVG path animations (like `MovingBorder`), splitting transforms into multiple `useTransform` hooks that query `getPointAtLength` individually (e.g., one for `x`, one for `y`) results in expensive DOM layout calculations multiple times per frame.
**Action:** Merge multiple `useTransform` hooks that query `getPointAtLength` into a single hook returning the combined transform string. This halves the expensive geometry computations per frame and avoids layout thrashing.
