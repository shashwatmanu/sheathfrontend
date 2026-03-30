## 2024-05-24 - [Pagination Range Array Optimization]
**Learning:** Creating a large array of `totalPages` size using `Array.from` and then filtering it to find adjacent pages is an O(N) operation that impacts rendering performance for tables with many pages.
**Action:** Replace `Array.from` with a fixed-size array literal of adjacent pages `[currentPage - 1, currentPage, currentPage + 1]` and bounds check it to achieve O(1) performance in pagination logic.
