
## 2025-02-20 - [Profile Page Admin Chart Rendering]
**Learning:** The application aggregated data for chart generation inside a loop over the last 7 days (`last7Days.map`) with an inner loop mapping over all `recentData` while continuously converting string dates and filtering. This O(N*M) nested loop scales poorly when visualizing long or complex datasets.
**Action:** Always replace O(N*M) aggregation nested loops with O(N+M) logic using HashMaps (`{}`) or `Set()` for immediate indexing and a single data pass, significantly reducing operations and instantiation of objects per element.
