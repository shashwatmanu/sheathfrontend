## 2024-03-04 - [Optimize SVG Path Animations]
**Learning:** `getPointAtLength` is an expensive DOM method that forces layout calculation. In Aceternity/motion React UI components like `MovingBorder`, it is commonly called twice per frame (once for `x`, once for `y`) inside separate `useTransform` hooks.
**Action:** Always combine `x` and `y` calculations into a single `useTransform` hook returning the full transform string for SVG path animations. This halves the work done per animation frame.
