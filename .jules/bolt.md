
## 2024-06-25 - O(1) Pagination Array Optimization
**Learning:** Generating a full array for pagination ranges using `Array.from({ length: totalPages })` has O(N) complexity and creates significant memory/performance issues when dealing with massive datasets (e.g., millions of pages). In this codebase, doing so just to display neighbors caused performance lags when rendering the DataModal.
**Action:** Replace `Array.from()` with a fixed-size array literal of adjacent page indices `[currentPage - 1, currentPage, currentPage + 1]`, filtering for validity using bounds (`page >= 1 && page <= totalPages`), achieving O(1) time and space complexity regardless of total page counts.
