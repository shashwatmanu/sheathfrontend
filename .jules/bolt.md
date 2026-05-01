## 2025-03-05 - Pagination Array Generation Optimization
**Learning:** Generating a full range array using `Array.from({ length: totalPages })` for simple range display in pagination UI is highly inefficient for large datasets, operating in O(N) time and memory complexity.
**Action:** Use a fixed-size array literal of adjacent page indices filtered for validity (e.g., `[currentPage - 1, currentPage, currentPage + 1].filter(page => page >= 1 && page <= totalPages)`) to achieve O(1) time and space complexity regardless of the total page count.
