const fs = require('fs');
const path = require('path');

const generateData = (numRows, numCols) => {
  const data = [];
  const columns = Array.from({ length: numCols }, (_, i) => `col${i}`);
  for (let i = 0; i < numRows; i++) {
    const row = {};
    for (let j = 0; j < numCols; j++) {
      row[columns[j]] = `Value ${i} - ${j}`;
    }
    data.push(row);
  }
  return { data, columns };
};

const { data, columns } = generateData(10000, 20);
const searchTerm = "Value 999";

const runBaseline = () => {
  const start = performance.now();
  let result = [...data];
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase();
    result = result.filter(row =>
      columns.some(col =>
        String(row[col] || '').toLowerCase().includes(search)
      )
    );
  }
  const end = performance.now();
  return end - start;
};

const runOptimized = () => {
  const start = performance.now();
  let result = [...data];
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase();
    const numCols = columns.length;
    const filtered = [];
    for (let i = 0; i < result.length; i++) {
      const row = result[i];
      let match = false;
      for (let j = 0; j < numCols; j++) {
        const val = row[columns[j]];
        if (val != null && String(val).toLowerCase().includes(search)) {
          match = true;
          break;
        }
      }
      if (match) {
        filtered.push(row);
      }
    }
    result = filtered;
  }
  const end = performance.now();
  return end - start;
};

let baselineTime = 0;
let optimizedTime = 0;
const iterations = 50;

// warm up
for(let i = 0; i < 5; i++) {
  runBaseline();
  runOptimized();
}

for(let i = 0; i < iterations; i++) {
  baselineTime += runBaseline();
  optimizedTime += runOptimized();
}

console.log(`Baseline Avg: ${(baselineTime / iterations).toFixed(2)}ms`);
console.log(`Optimized Avg: ${(optimizedTime / iterations).toFixed(2)}ms`);
console.log(`Improvement: ${(((baselineTime - optimizedTime) / baselineTime) * 100).toFixed(2)}%`);
