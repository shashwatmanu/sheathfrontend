## 2024-05-24 - [Optimize Reconciliations Summary Statistics]
**Learning:** Performance can be improved in loops by skipping redundant `.reduce()` calls and using a single `for` loop for data aggregation (e.g., in `app/dashboard/history/page.js`), which provides an ~80% performance boost for large arrays (~10k items) in this environment.
**Action:** When calculating multiple aggregate statistics from a large array of objects, favor a single `for` loop inside a `useMemo` block over multiple consecutive `.reduce()` calls, especially if the array is heavily updated or populated.
