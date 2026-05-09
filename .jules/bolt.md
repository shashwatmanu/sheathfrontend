## 2024-05-09 - O(1) Pagination Array Allocation
**Learning:** In React components with pagination, dynamically generating an array of all possible pages (e.g., `Array.from({ length: totalPages })`) and then filtering it for a small adjacent window introduces a severe memory allocation and performance penalty of O(N) where N is total pages.
**Action:** Always compute adjacent pages mathematically by creating a small fixed-size array literal (e.g., `[currentPage - 1, currentPage, currentPage + 1]`) and validating bounds (e.g., `>= 1 && <= totalPages`).
