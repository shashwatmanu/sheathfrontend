## 2025-05-17 - React Hooks in JSX
**Learning:** Calling hooks like `useMemo` inline within JSX props violates React's Rules of Hooks.
**Action:** Always declare hooks at the top level of the component function.

## 2025-05-17 - TypeScript and tsparticles
**Learning:** `@tsparticles` options objects require explicit `ISourceOptions` typing to pass strict TypeScript builds, as inference may fail for union types like `mode: "bounce"`.
**Action:** Import `ISourceOptions` from `@tsparticles/engine` and type the configuration object.
