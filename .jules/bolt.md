
## 2024-05-20 - [Performance] Canvas Operations Optimization
**Learning:** `ctx.save()` and `ctx.restore()` in Canvas API are highly expensive when called in rapid succession, such as within a per-particle rendering loop (e.g., in `components/ui/vortex.tsx`). Benchmarks showed that removing these operations from an inner loop running 700 times per frame improved particle rendering performance from ~51ms to ~13ms for 10k iterations.
**Action:** When working with canvas visual components, extract shared canvas state modifications (like `ctx.lineCap`) outside of rendering loops, and wrap the entire loop in a single `save`/`restore` block instead of maintaining strict state isolation per particle.
