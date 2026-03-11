## 2024-03-11 - Next.js ESLint configuration error
**Learning:** `pnpm lint` consistently fails with `TypeError: Converting circular structure to JSON` because of a bug or incompatibility with the installed ESLint configuration or `@eslint/eslintrc` version when using Next.js 16.1.0 and eslint 9.x.
**Action:** Do not rely on `pnpm lint` in this project structure. Manually verify changes via testing and running the application if possible, or fall back to code inspection.
