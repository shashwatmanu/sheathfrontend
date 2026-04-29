
## 2024-05-24 - Sorting Optimization with Schwartzian Transform
**Learning:** In frontend components handling large datasets (like `DataModal`), applying array sorting with inline transformations (e.g., `parseFloat(strVal.replace(/,/g, ''))`) recalculates the transformations for every comparison ($O(N \log N)$ times).
**Action:** Use a Schwartzian transform (decorate-sort-undecorate) to pre-calculate sort keys in an $O(N)$ pass before sorting. When doing this, ensure you preserve the original string in the decorated object to perfectly match the previous fallback behavior for non-numeric comparisons.
