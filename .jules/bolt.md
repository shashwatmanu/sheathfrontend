## 2024-04-08 - SVG Path Animation Optimization in Framer Motion
**Learning:** For SVG path animations using `motion/react` (e.g., `MovingBorder`), creating separate `useTransform` hooks that query `getPointAtLength` for each coordinate independently is highly inefficient, as it triggers expensive DOM layout calculations per coordinate per frame.
**Action:** When animating along a path, merge multiple `useTransform` hooks into a single hook that queries `getPointAtLength` once and returns the combined transform string to halve the DOM calculation overhead.
