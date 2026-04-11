
## 2024-04-12 - Canvas Context Overload in Render Loops
**Learning:** In high-frequency canvas render loops (e.g., `vortex.tsx`), repeatedly calling `ctx.save()` and `ctx.restore()` inside inner per-item loops (like rendering 700+ individual particles) is a significant performance bottleneck due to the overhead of pushing/popping the canvas state stack.
**Action:** Extract `ctx.save()` and `ctx.restore()` to wrap the entire loop, setting static properties (like `lineCap`) outside the loop, and manually managing dynamic properties per iteration to drastically reduce overhead while preserving visual correctness.
