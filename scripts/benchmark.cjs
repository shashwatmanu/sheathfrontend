const crypto = require('crypto');

// Setup mock window, document and Blob so we can test the DataModal logic
global.window = {
  URL: {
    createObjectURL: () => 'mock-url',
    revokeObjectURL: () => {}
  }
};
global.document = {
  createElement: () => ({
    click: () => {},
    setAttribute: () => {}
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};
global.Blob = class Blob {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }
};


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

console.log("Benchmarking handleExportCSV function...");

function originalExportCSV(filteredAndSortedData, columns) {
    const headers = columns.join(',');
    const rows = filteredAndSortedData.map(row =>
      columns.map(col => {
        const val = String(row[col] || '');
        // Escape quotes and wrap in quotes if contains comma
        return val.includes(',') || val.includes('"')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    return csv;
}


function optimizedExportCSV(filteredAndSortedData, columns) {
    // Write your optimized implementation here
    const numRows = filteredAndSortedData.length;
    const numCols = columns.length;

    // Pre-allocate array for all lines (headers + data)
    const csvLines = new Array(numRows + 1);
    csvLines[0] = columns.join(',');

    for (let r = 0; r < numRows; r++) {
        const row = filteredAndSortedData[r];
        const rowArray = new Array(numCols);

        for (let c = 0; c < numCols; c++) {
            const val = String(row[columns[c]] || '');
            // Only use regex if we have a quote
            if (val.includes('"')) {
                 rowArray[c] = `"${val.replace(/"/g, '""')}"`;
            } else if (val.includes(',')) {
                 rowArray[c] = `"${val}"`;
            } else {
                 rowArray[c] = val;
            }
        }
        csvLines[r + 1] = rowArray.join(',');
    }

    return csvLines.join('\n');
}

// Warmup
for (let i = 0; i < 5; i++) {
    originalExportCSV(data, columns);
    optimizedExportCSV(data, columns);
}

// Benchmark Original
console.time("Original handleExportCSV");
for (let i = 0; i < 50; i++) {
    originalExportCSV(data, columns);
}
console.timeEnd("Original handleExportCSV");

// Benchmark Optimized
console.time("Optimized handleExportCSV");
for (let i = 0; i < 50; i++) {
    optimizedExportCSV(data, columns);
}
console.timeEnd("Optimized handleExportCSV");
