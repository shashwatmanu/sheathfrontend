## 2026-01-30 - SVG Geometry in Animation Loops
**Learning:** Calling `getTotalLength()` inside `useAnimationFrame` forces geometry recalculation on every frame, causing performance issues.
**Action:** Cache geometric values in state/ref and update them only when necessary (e.g., via `ResizeObserver`).
