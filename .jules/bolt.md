
## 2024-05-23 - Unoptimized tsparticles Options Object
**Learning:** The `SparklesCore` component was re-creating the `tsparticles` options object on every render, causing the entire particle engine to potentially re-initialize. This is a heavy operation. Even though `useMemo` was imported, it wasn't used for the options object.
**Action:** Always verify that expensive configuration objects passed to third-party libraries (like `tsparticles` or `chart.js`) are memoized using `useMemo`.
