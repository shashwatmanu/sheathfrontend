const { performance } = require('perf_hooks');

const generateData = (numRows) => {
  const data = [];
  for (let i = 0; i < numRows; i++) {
    const isNum = Math.random() > 0.5;
    data.push({
      sortKey: isNum ? (Math.random() * 10000).toFixed(2).toString() : `Str_${Math.random().toString(36).substring(7)}`
    });
  }
  return data;
};

const data = generateData(10000);
const sortColumn = 'sortKey';
const sortDirection = 'asc';

const runBaseline = () => {
  const start = performance.now();
  let result = [...data];
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
  const end = performance.now();
  return end - start;
};

const runOptimized = () => {
  const start = performance.now();
  let result = [...data];

  // Schwartzian transform
  const mapped = result.map((item, index) => {
    const val = String(item[sortColumn] || '');
    const num = parseFloat(val.replace(/,/g, ''));
    return {
      index,
      val,
      num: isNaN(num) ? null : num,
      isNum: !isNaN(num)
    };
  });

  mapped.sort((a, b) => {
    if (a.isNum && b.isNum) {
      return sortDirection === 'asc' ? a.num - b.num : b.num - a.num;
    }
    return sortDirection === 'asc'
      ? a.val.localeCompare(b.val)
      : b.val.localeCompare(a.val);
  });

  result = mapped.map(item => result[item.index]);

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
