## 2024-04-21 - [O(1) Array literals for Pagination]
**Learning:** In pagination UI components where you only need to show a few adjacent page numbers, creating a full array sequence with `Array.from({ length: totalPages })` creates O(N) memory allocation and processing time, which can become noticeable with extremely large page counts.
**Action:** Replace `Array.from` with an O(1) fixed-size array literal of adjacent page indices (e.g., `[cp-1, cp, cp+1]`) filtered for bounds validity (`page >= 1 && page <= totalPages`) to eliminate memory and processing overhead.
