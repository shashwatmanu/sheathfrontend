## 2025-02-20 - Schwartzian Transform for Client-Side Sorting
**Learning:** In React components that handle large client-side data grids (e.g., `DataModal.jsx`), sorting logic that involves string-to-number conversions (like stripping commas and running `parseFloat`) inside the array `sort` callback causes massive performance degradation due to redundant $O(N \log N)$ allocations and computations.
**Action:** Always extract string manipulation and numerical parsing out of the comparator and apply a Schwartzian Transform (decorate, sort, undecorate) to parse the sorting keys only once in a linear pass.

## 2025-02-20 - Closure Overhead in Array Methods
**Learning:** Combining nested higher-order array methods (`filter` with an inner `some`) on large datasets incurs measurable performance penalties from continuous closure creation and iterator execution. Replacing them with standard `for` loops provides raw execution speedup (~40-60%) for large datasets in V8.
**Action:** When working with large static arrays in a frontend rendering cycle, use standard `for` loops instead of `.filter()` and `.map()` for data aggregation, but only apply this when benchmarking proves significant gains.
