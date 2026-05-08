## 2024-05-08 - [Optimize Pagination Array Allocation]
**Learning:** Using `Array.from({ length: totalPages })` to generate page buttons scales linearly with `totalPages`, consuming unnecessary CPU and memory for basic pagination UI updates, especially with large numbers of pages.
**Action:** Replace `Array.from({ length: totalPages })` in pagination components with an O(1) literal array calculation (e.g. `[currentPage - 1, currentPage, currentPage + 1].filter(...)`) to ensure fast and scalable rendering regardless of total page count.
