const crypto = require('crypto');

// Generate Mock Data
const numRows = 10000;
const columns = Array.from({length: 20}, (_, i) => `Col_${i}`);
const data = Array.from({length: numRows}, (_, i) => {
    let row = {};
    columns.forEach(col => {
        row[col] = `${Math.floor(Math.random() * 10000)}`;
    });
    return row;
});

const sortColumn = "Col_0";
const sortDirection = "asc";

console.log("Benchmarking sort function...");

function originalSort(data, columns, sortColumn, sortDirection) {
    let result = [...data];
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = String(a[sortColumn] || '');
        const bVal = String(b[sortColumn] || '');

        // Try numeric sort first
        const aNum = parseFloat(aVal.replace(/,/g, ''));
        const bNum = parseFloat(bVal.replace(/,/g, ''));

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // Fallback to string sort
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }
    return result;
}

function optimizedSort(data, columns, sortColumn, sortDirection) {
    if (!sortColumn) return [...data];

    // Schwartzian transform for faster sorting
    const mapped = data.map((row) => {
        const val = row[sortColumn];
        const strVal = typeof val === 'string' ? val : String(val || '');

        // Optimize numeric parsing: check if it contains comma, otherwise parseFloat directly
        const cleanStr = strVal.includes(',') ? strVal.replace(/,/g, '') : strVal;
        const numVal = parseFloat(cleanStr);

        return {
            row,
            strVal,
            numVal: isNaN(numVal) ? null : numVal,
            isNum: !isNaN(numVal)
        };
    });

    const isAsc = sortDirection === 'asc';

    mapped.sort((a, b) => {
        if (a.isNum && b.isNum) {
            return isAsc ? a.numVal - b.numVal : b.numVal - a.numVal;
        }

        return isAsc
            ? a.strVal.localeCompare(b.strVal)
            : b.strVal.localeCompare(a.strVal);
    });

    const numRows = mapped.length;
    const result = new Array(numRows);
    for (let i = 0; i < numRows; i++) {
        result[i] = mapped[i].row;
    }

    return result;
}

// Warmup
for (let i = 0; i < 5; i++) {
    originalSort(data, columns, sortColumn, sortDirection);
    optimizedSort(data, columns, sortColumn, sortDirection);
}

// Benchmark Original
console.time("Original sort");
for (let i = 0; i < 50; i++) {
    originalSort(data, columns, sortColumn, sortDirection);
}
console.timeEnd("Original sort");

// Benchmark Optimized
console.time("Optimized sort");
for (let i = 0; i < 50; i++) {
    optimizedSort(data, columns, sortColumn, sortDirection);
}
console.timeEnd("Optimized sort");
