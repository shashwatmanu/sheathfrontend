const React = require('react');

// Simulate the data structure
const columns = ['id', 'name', 'status', 'amount'];
const data = [];
for (let i = 0; i < 10000; i++) {
  data.push({
    id: i,
    name: 'User ' + i,
    status: i % 2 === 0 ? 'active' : 'inactive',
    amount: (Math.random() * 1000).toFixed(2)
  });
}

// ---------------------------------------------------------
// Original logic
// ---------------------------------------------------------
function originalFilterAndSort(data, columns, searchTerm, sortColumn, sortDirection) {
  let result = [...data];

  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase();
    result = result.filter(row =>
      columns.some(col =>
        String(row[col] || '').toLowerCase().includes(search)
      )
    );
  }

  if (sortColumn) {
    result.sort((a, b) => {
      const aVal = String(a[sortColumn] || '');
      const bVal = String(b[sortColumn] || '');

      const aNum = parseFloat(aVal.replace(/,/g, ''));
      const bNum = parseFloat(bVal.replace(/,/g, ''));

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }

  return result;
}

// ---------------------------------------------------------
// Optimized logic
// ---------------------------------------------------------
function optimizedFilterAndSort(data, columns, searchTerm, sortColumn, sortDirection) {
  let result = [];
  const search = searchTerm.trim().toLowerCase();
  const hasSearch = search.length > 0;
  const numRows = data.length;
  const numCols = columns.length;

  if (hasSearch) {
    for (let i = 0; i < numRows; i++) {
      const row = data[i];
      let match = false;
      for (let j = 0; j < numCols; j++) {
        if (String(row[columns[j]] || '').toLowerCase().includes(search)) {
          match = true;
          break;
        }
      }
      if (match) {
        result.push(row);
      }
    }
  } else {
    result = [...data];
  }

  if (sortColumn) {
    const mapped = new Array(result.length);
    for (let i = 0; i < result.length; i++) {
      const row = result[i];
      const val = String(row[sortColumn] || '');

      let numVal = NaN;
      if (val) {
        const cleanVal = val.includes(',') ? val.replace(/,/g, '') : val;
        numVal = parseFloat(cleanVal);
      }

      mapped[i] = {
        index: i,
        row: row,
        value: val,
        num: numVal,
        isNum: !isNaN(numVal)
      };
    }

    mapped.sort((a, b) => {
      if (a.isNum && b.isNum) {
        return sortDirection === 'asc' ? a.num - b.num : b.num - a.num;
      }
      return sortDirection === 'asc'
        ? a.value.localeCompare(b.value)
        : b.value.localeCompare(a.value);
    });

    const sortedResult = new Array(mapped.length);
    for (let i = 0; i < mapped.length; i++) {
      sortedResult[i] = mapped[i].row;
    }
    result = sortedResult;
  }

  return result;
}

// ---------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------
const searchTerm = 'user';
const sortCol = 'amount';
const sortDir = 'desc';
const iterations = 50;

console.log(`Running benchmarks for ${iterations} iterations on ${data.length} rows...`);

const startOrig = performance.now();
for (let i = 0; i < iterations; i++) {
  originalFilterAndSort(data, columns, searchTerm, sortCol, sortDir);
}
const endOrig = performance.now();

const startOpt = performance.now();
for (let i = 0; i < iterations; i++) {
  optimizedFilterAndSort(data, columns, searchTerm, sortCol, sortDir);
}
const endOpt = performance.now();

const timeOrig = endOrig - startOrig;
const timeOpt = endOpt - startOpt;

console.log(`Original Time: ${timeOrig.toFixed(2)}ms`);
console.log(`Optimized Time: ${timeOpt.toFixed(2)}ms`);
console.log(`Speedup: ${((timeOrig - timeOpt) / timeOrig * 100).toFixed(2)}% faster`);
