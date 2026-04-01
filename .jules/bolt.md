## 2024-03-24 - DataModal Sorting Performance
**Learning:** In React components dealing with large datasets (e.g., `DataModal.jsx`), using `.replace(/,/g, '')` and `parseFloat` directly inside the `Array.prototype.sort()` callback leads to severe performance degradation due to O(N log N) regex parsing operations.
**Action:** Always use a Schwartzian transform (Decorate-Sort-Undecorate) to pre-calculate parsed numeric values and string representations in an O(N) pass before sorting. Additionally, avoiding `.replace()` when strings don't `.includes(',')` adds another measurable speedup.

## 2024-03-24 - TypeScript Build Errors in Next.js
**Learning:** During `pnpm build`, if the Next.js production build completes successfully but fails on the TypeScript checking step due to `tsconfig.json` configuration warnings (e.g., `ignoreDeprecations`), do not attempt to modify `tsconfig.json` to resolve it, as changing this file without instruction is strictly prohibited.
**Action:** Accept the TypeScript configuration warning as an environment constraint and proceed, provided the code changes are verified to be correct.
