const crypto = require('crypto');

const columns = ['id', 'name', 'email', 'status', 'amount'];
const data = [];
for (let i = 0; i < 10000; i++) {
  data.push({
    id: i,
    name: 'User ' + i,
    email: 'user' + i + '@example.com',
    status: i % 2 === 0 ? 'active' : 'inactive',
    amount: (Math.random() * 1000).toFixed(2)
  });
}

const searchTerm = 'user500';
const search = searchTerm.toLowerCase();

function testSome() {
  const start = performance.now();
  for (let k = 0; k < 100; k++) {
    const result = data.filter(row =>
      columns.some(col =>
        String(row[col] || '').toLowerCase().includes(search)
      )
    );
  }
  const end = performance.now();
  console.log(`Some: ${end - start}ms`);
}

function testFor() {
  const start = performance.now();
  for (let k = 0; k < 100; k++) {
    const result = [];
    const numCols = columns.length;
    const numRows = data.length;
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
  }
  const end = performance.now();
  console.log(`For: ${end - start}ms`);
}

testSome();
testFor();
