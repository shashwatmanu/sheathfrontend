## 2025-05-27 - Polling Layout Thrashing in Animation Loops
**Learning:** Found a component (`Hyperspeed.jsx`) polling `clientWidth`/`clientHeight` inside a `requestAnimationFrame` loop. This forces layout calculation on every frame, which is a major performance killer.
**Action:** Use `ResizeObserver` for observing size changes instead of polling in the render loop. Also, ensure event listeners using `bind(this)` are properly removed by storing the bound function reference.
