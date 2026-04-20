## 2024-05-24 - Optimization Pattern: Merging getPointAtLength calls in SVG animations
**Learning:** Querying `getPointAtLength` multiple times per frame is an expensive layout operation. In `components/ui/moving-border.tsx`, using separate `useTransform` hooks for `x` and `y` axes caused redundant queries.
**Action:** Merge multiple `useTransform` hooks into a single hook that queries `getPointAtLength` once and returns the combined transform string.
