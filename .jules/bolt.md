## 2024-04-19 - [O(1) Pagination Array]
**Learning:** [In UI pagination components, using \`Array.from({ length: totalPages })\` and then filtering creates a massive array in memory for large datasets (e.g. 10k pages) that degrades frontend performance, especially when run on every render/state change.]
**Action:** [Use a fixed-size array literal representing the adjacent pages (e.g., \`[current-1, current, current+1]\`) and filter for validity (\`page >= 1 && page <= totalPages\`) instead, which achieves O(1) time and space complexity regardless of the total page count.]
