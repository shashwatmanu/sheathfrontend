# Bolt's Journal - Critical Learnings

## 2024-05-22 - [ESLint Circular Dependency]
**Learning:** The project's eslint configuration is broken due to a circular dependency in `@eslint/eslintrc` or related packages, likely due to version mismatch or config format issues (using `eslint.config.mjs` but dependencies might expect older format or vice versa).
**Action:** Do not rely on `npm run lint` for verification in this environment. Rely on manual code inspection and structural correctness.

## 2024-05-22 - [Inline Objects in React Components]
**Learning:** Heavy visualization components like `Particles` (from `tsparticles`) or Three.js wrappers often take configuration objects as props. Defining these inline triggers expensive re-initializations on every render.
**Action:** Always memoize configuration objects (using `useMemo` or static constants) when passing them to third-party visualization libraries.
