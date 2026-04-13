## 2024-04-13 - Optimize Canvas Context save/restore
**Learning:** In high-frequency canvas render loops (e.g., `components/ui/vortex.tsx`), repeatedly calling `ctx.save()` and `ctx.restore()` inside inner per-item loops is highly expensive.
**Action:** Extract `ctx.save()` and `ctx.restore()` to wrap the entire loop, manually resetting non-static properties per iteration, which yields substantial performance gains. However, do not combine `ctx.save()` and `ctx.restore()` across multiple distinct compositing steps, as it risks canvas context leakage.
