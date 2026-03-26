
## 2024-05-28 - Optimize array filtering with internal closure in DataModal
**Learning:** In React components like `DataModal` that filter large datasets client-side, using `Array.prototype.some` inside `Array.prototype.filter` creates a new closure function for every single column check per row. This causes significant overhead and garbage collection pressure.
**Action:** Replace functional array methods like `.some()` or `.every()` with standard `for` loops inside the main `.filter()` callback for high-frequency search/filter operations to avoid closure allocation overhead.
