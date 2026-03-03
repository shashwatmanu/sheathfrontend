## 2024-03-03 - [Optimize MovingBorder SVGs]
**Learning:** Calling DOM methods like `getPointAtLength` multiple times per frame via `useTransform` creates redundant layout calculations.
**Action:** When tracking `x` and `y` from an SVG path using `framer-motion` or `motion/react`, merge multiple `useTransform` hooks into a single hook returning the combined transform string to halve calculation cost.
