## 2024-05-23 - SVG Path Animation Performance
**Learning:** Animating SVG paths using `getPointAtLength` is computationally expensive as it requires layout calculations. Calling it multiple times per frame (e.g., once for X, once for Y in separate `useTransform` hooks) causes significant performance degradation and layout thrashing in React/motion animations.
**Action:** Always combine multiple queries into a single hook returning a consolidated string or object, ensuring `getPointAtLength` is evaluated at most once per animation frame.
