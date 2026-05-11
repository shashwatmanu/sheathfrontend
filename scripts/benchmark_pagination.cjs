const { performance } = require('perf_hooks');

const totalPages = 10000;
const currentPage = 5000;

function approach1() {
  return Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(page =>
      page === currentPage ||
      page === currentPage - 1 ||
      page === currentPage + 1
    );
}

function approach2() {
  return [currentPage - 1, currentPage, currentPage + 1]
    .filter(page => page >= 1 && page <= totalPages);
}

const N = 10000;

let start = performance.now();
for (let i = 0; i < N; i++) {
  approach1();
}
let end = performance.now();
console.log(`Approach 1 (Array.from): ${(end - start).toFixed(2)}ms`);

start = performance.now();
for (let i = 0; i < N; i++) {
  approach2();
}
end = performance.now();
console.log(`Approach 2 (Fixed array): ${(end - start).toFixed(2)}ms`);
