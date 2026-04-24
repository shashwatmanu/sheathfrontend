const crypto = require('crypto');

// Generate Mock Data
const numRows = 10000;
const columns = Array.from({length: 20}, (_, i) => `Col_${i}`);
const data = Array.from({length: numRows}, (_, i) => {
    let row = {};
    columns.forEach(col => {
        row[col] = `Value_${Math.floor(Math.random() * 10000)}`;
    });
    return row;
});

const searchTerm = "value_123";

console.log("Benchmarking filter function...");

function originalFilter(data, columns, searchTerm) {
    let result = [...data];
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(row =>
        columns.some(col =>
          String(row[col] || '').toLowerCase().includes(search)
        )
      );
    }
    return result;
}

function optimizedFilter(data, columns, searchTerm) {
    if (!searchTerm.trim()) return [...data];

    const search = searchTerm.toLowerCase();
    const result = [];
    const numRows = data.length;
    const numCols = columns.length;

    for (let i = 0; i < numRows; i++) {
        const row = data[i];
        let match = false;

        for (let j = 0; j < numCols; j++) {
            const val = row[columns[j]];
            if (val != null) {
                // If it's already a string, skip the explicit String() conversion for better performance
                const strVal = typeof val === 'string' ? val : String(val);
                if (strVal.toLowerCase().includes(search)) {
                    match = true;
                    break;
                }
            }
        }

        if (match) {
            result.push(row);
        }
    }

    return result;
}

// Warmup
for (let i = 0; i < 5; i++) {
    originalFilter(data, columns, searchTerm);
    optimizedFilter(data, columns, searchTerm);
}

// Benchmark Original
console.time("Original filter");
for (let i = 0; i < 50; i++) {
    originalFilter(data, columns, searchTerm);
}
console.timeEnd("Original filter");

// Benchmark Optimized
console.time("Optimized filter");
for (let i = 0; i < 50; i++) {
    optimizedFilter(data, columns, searchTerm);
}
console.timeEnd("Optimized filter");
