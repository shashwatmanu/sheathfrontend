const columns = ['id', 'name', 'amount'];
const data = [];
for (let i = 0; i < 10000; i++) {
  data.push({
    id: i,
    name: 'User ' + i,
    amount: (Math.random() * 1000).toFixed(2)
  });
}

const sortColumn = 'amount';
const sortDirection = 'asc';

function testStandardSort() {
  const start = performance.now();
  for (let k = 0; k < 100; k++) {
    const result = [...data];
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
  const end = performance.now();
  console.log(`Standard Sort: ${end - start}ms`);
}

function testSchwartzianSort() {
  const start = performance.now();
  for (let k = 0; k < 100; k++) {
    const mapped = data.map((item, i) => {
      const val = String(item[sortColumn] || '');
      const num = parseFloat(val.replace(/,/g, ''));
      return { index: i, value: val, num: num, isNum: !isNaN(num) };
    });

    mapped.sort((a, b) => {
      if (a.isNum && b.isNum) {
        return sortDirection === 'asc' ? a.num - b.num : b.num - a.num;
      }
      return sortDirection === 'asc'
        ? a.value.localeCompare(b.value)
        : b.value.localeCompare(a.value);
    });

    const result = new Array(data.length);
    for (let i = 0; i < mapped.length; i++) {
      result[i] = data[mapped[i].index];
    }
  }
  const end = performance.now();
  console.log(`Schwartzian Sort: ${end - start}ms`);
}

testStandardSort();
testSchwartzianSort();
