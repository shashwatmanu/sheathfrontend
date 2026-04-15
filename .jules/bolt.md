
## 2024-05-30 - [Optimize Pagination Array Generation]
**Learning:** Generating a full array of all pages using `Array.from({ length: totalPages })` for large pagination counts is very slow due to O(n) array allocation and manipulation, scaling poorly as page count grows.
**Action:** Always construct static, adjacent arrays like `[currentPage - 1, currentPage, currentPage + 1]` and filter for validity to keep complexity O(1), ensuring performance does not degrade with large dataset sizes.
