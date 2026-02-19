## 2024-05-23 - Visual Component Performance
**Learning:** Visual components like `SparklesCore` (using `tsparticles`) and `Vortex` (using Canvas API) are used in critical paths (login, dashboard). `SparklesCore` was re-initializing the particles engine on every render due to non-memoized `options` object.
**Action:** Always memoize configuration objects passed to third-party visual libraries (like `tsparticles`, `three.js`, `react-three-fiber`) to prevent expensive re-initializations. Use `useMemo` for objects and `useCallback` for event handlers.
