## 2024-03-24 - O(N + M) Chart Aggregation
**Learning:** Replaced O(N × M) nested loop with O(N + M) single-pass hash map for chart data aggregation in `app/dashboard/profile/page.js`. For large arrays rendering frontend charts, nested `.forEach()` causes severe iteration overhead during React's render phase.
**Action:** Always extract distinct loops. Initialize array keys in one loop, perform a single-pass aggregate of raw data in a hash map, and then map the hash map directly to the final layout to dramatically speed up frontend dashboard components.
