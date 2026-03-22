
## 2024-03-22 - [Vortex Canvas Render Loop Optimization]
**Learning:** In high-frequency canvas render loops (like the Aceternity UI `Vortex` component), calling `ctx.save()` and `ctx.restore()` redundantly inside inner per-particle loops is extremely expensive due to browser DOM state thrashing.
**Action:** When auditing canvas components, hoist static property assignments (like `ctx.lineCap`) and `save`/`restore` boundaries outside of iterative particle loops wherever state bleeding is not an issue.
