const XLSX = require('xlsx');
const { performance } = require('perf_hooks');

// Generate a large dataset
const rows = [];
const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
for (let i = 0; i < 50000; i++) {
  const row = {};
  cols.forEach(col => {
    row[col] = `Row ${i} Col ${col} - ${Math.random()}`;
  });
  rows.push(row);
}

// Create workbook
const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

// Write to buffer
const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
console.log(`Generated Excel buffer size: ${(excelBuffer.length / 1024 / 1024).toFixed(2)} MB`);

// Measure parsing time
console.log("Starting parsing benchmark...");
const start = performance.now();

const workbook = XLSX.read(excelBuffer, { type: 'buffer' }); // mimics type: 'array'
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

const end = performance.now();
console.log(`Parsing took: ${(end - start).toFixed(2)} ms`);
console.log(`Parsed rows: ${jsonData.length}`);
