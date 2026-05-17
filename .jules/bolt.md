## 2024-03-24 - [Extract Canvas State Modifications from High-Frequency Render Loops]
**Learning:** In high-frequency canvas render loops (like particle engines at 60FPS), repeatedly calling `ctx.save()` and `ctx.restore()` or setting static properties (like `ctx.lineCap`) inside inner, per-item loops introduces significant redundant operations overhead.
**Action:** Extract `ctx.save()`, `ctx.restore()`, and static property assignments to wrap the outermost loop possible, so that only dynamic properties are updated per particle inside the inner loop.
