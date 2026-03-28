
## 2025-02-17 - [O(1) Pagination Array Generation]
**Learning:** In React components dealing with large datasets and pagination (e.g., `components/ui/DataModal.jsx`), using `Array.from({ length: totalPages })` simply to find the few adjacent pages to display around `currentPage` creates severe memory allocations (O(N)) on every render when `totalPages` is large (e.g., 100,000 pages).
**Action:** Instead of dynamically generating arrays of size `totalPages` to filter down, directly create literal arrays of the target slice `[currentPage - 1, currentPage, currentPage + 1]` and filter for validity (`page >= 1 && page <= totalPages`) for O(1) performance.
