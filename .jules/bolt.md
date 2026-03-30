## 2024-05-24 - Memoization in @tsparticles/react
**Learning:** `SparklesCore` component was passing inline object definitions and callbacks to the `options` and `particlesLoaded` props of `<Particles>`. This triggers costly React re-renders and re-initializations of the heavy particles engine on every render cycle.
**Action:** Always wrap `options` configuration object with `useMemo` typed with `ISourceOptions`, and wrap callbacks passed to the engine (like `particlesLoaded`) with `useCallback` to maintain referential equality.
