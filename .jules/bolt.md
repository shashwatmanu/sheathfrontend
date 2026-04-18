## 2024-04-18 - Optimize Pagination Array Allocation
**Learning:** In pagination UI components, generating a full range array using `Array.from({ length: totalPages })` for simple range display scales poorly (O(N) time and space). It becomes noticeably slow for datasets with huge page counts (e.g., 100k+ pages).
**Action:** Instead, use a fixed-size array literal of adjacent page indices (e.g., `[cp-1, cp, cp+1]`) filtered for validity (e.g., `page >= 1 && page <= totalPages`) to achieve O(1) time and space complexity regardless of the total page count.
