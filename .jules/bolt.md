## 2024-05-16 - Replace Nested Loops with Hash Map Aggregation
**Learning:** Using multiple loops (like `.filter`, `.map`, and nested loops within `.map`) and repeatedly calling `new Date().toISOString()` inside iteration for chart data aggregation leads to massive performance overhead ($O(N \times D)$ complexity and high memory allocation).
**Action:** Replace nested aggregation loops with a single-pass hash map to pre-calculate counts (achieving $O(N + D)$ complexity). Replace full `Date` instantiation with simple string slicing (`substring(0, 10)`) when the date string format allows it.
