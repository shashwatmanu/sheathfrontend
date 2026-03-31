const { performance } = require('perf_hooks');

// Simulating the exact state structure and render cycle context
function simulateDataModalPaginationRender(totalPages, currentPage) {
  const start = performance.now();
  let result = null;
  // Doing this a lot of times to amplify the difference
  for (let iter = 0; iter < 10000; iter++) {
    result = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(page =>
        page === currentPage ||
        page === currentPage - 1 ||
        page === currentPage + 1
      );
  }
  const end = performance.now();
  return { result, time: end - start };
}

function optimizedDataModalPaginationRender(totalPages, currentPage) {
  const start = performance.now();
  let result = null;
  // Doing this a lot of times to amplify the difference
  for (let iter = 0; iter < 10000; iter++) {
    const pages = [currentPage - 1, currentPage, currentPage + 1];
    result = pages.filter(page => page >= 1 && page <= totalPages);
  }
  const end = performance.now();
  return { result, time: end - start };
}

console.log("=== Testing with Total Pages = 1000 ===");
let res1 = simulateDataModalPaginationRender(1000, 500);
console.log("Original (Array.from length 1000):", res1.time.toFixed(2), "ms");

let res2 = optimizedDataModalPaginationRender(1000, 500);
console.log("Optimized (Fixed length 3):       ", res2.time.toFixed(2), "ms");

console.log("\n=== Testing with Total Pages = 10000 ===");
res1 = simulateDataModalPaginationRender(10000, 500);
console.log("Original (Array.from length 10000):", res1.time.toFixed(2), "ms");

res2 = optimizedDataModalPaginationRender(10000, 500);
console.log("Optimized (Fixed length 3):        ", res2.time.toFixed(2), "ms");

console.log("\nVerify results are identical:", JSON.stringify(res1.result) === JSON.stringify(res2.result));
