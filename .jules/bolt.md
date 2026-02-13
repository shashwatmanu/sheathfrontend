## 2024-05-22 - Unstable Configuration Object in Animation Components
**Learning:** Third-party animation libraries (like `@tsparticles/react`) often perform expensive re-initializations if their configuration object reference changes. Defining these objects inline in the render loop causes a new reference on every render, triggering unnecessary and costly re-renders of the canvas/animation engine.
**Action:** Always wrap large configuration objects (especially for third-party libs) in `useMemo` to ensure reference stability across renders. Wrap callback props in `useCallback`.
