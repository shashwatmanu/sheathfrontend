
## $(date +%Y-%m-%d) - Optimize HTML5 Canvas render loop state context
**Learning:** In high-frequency canvas render loops (e.g., `components/ui/vortex.tsx`), repeatedly calling `ctx.save()` and `ctx.restore()` inside inner per-item loops (like drawing individual particles) is highly expensive.
**Action:** Extracting `ctx.save()` and `ctx.restore()` calls to wrap the entire loop, while managing state efficiently (e.g., manually resetting non-static properties like `lineWidth` and `strokeStyle` per iteration), yields substantial performance gains (e.g., ~45% speedup). Do not combine `ctx.save()` and `ctx.restore()` across multiple compositing steps, as it risks context leakage and coupling.
