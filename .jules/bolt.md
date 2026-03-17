## 2026-03-17 - [Optimize SVG Path Animations]
**Learning:** Calling `getPointAtLength` on SVG path elements is an expensive DOM layout calculation. Using multiple `useTransform` hooks that separately query `.x` and `.y` properties of `getPointAtLength` forces the browser to evaluate the length point multiple times per frame.
**Action:** Combine transform logic into a single `useTransform` hook when querying SVG paths, returning the complete transform string. This halves the computational cost per animation frame.
