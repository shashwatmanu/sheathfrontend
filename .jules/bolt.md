## 2024-06-25 - Avoid Array.from for Pagination Windows
**Learning:** Generating full array ranges via `Array.from({ length: totalPages })` just to extract a small 3-page window (e.g., `currentPage - 1`, `currentPage`, `currentPage + 1`) introduces unnecessary $O(N)$ memory allocation and filtering overhead. For large datasets, this blocks the main thread on every page turn.
**Action:** Always prefer O(1) literal arrays like `[cp-1, cp, cp+1].filter(p => p >= 1 && p <= totalPages)` for generating localized UI page numbers instead of generating and filtering full range arrays.
