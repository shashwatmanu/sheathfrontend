## 2024-03-01 - [Avoid array allocation in React renders]
**Learning:** Generating arrays using `Array.from()` inside a React render function for display elements (like pagination) can become a bottleneck when the number of pages is high. Even though we filter it immediately, the entire array is still allocated in memory on every render.
**Action:** Replace `Array.from` with fixed-size arrays or generator functions if we only need a specific subset of items. For adjacent items (e.g. `[i-1, i, i+1]`), construct the literal directly and bounds check it.
