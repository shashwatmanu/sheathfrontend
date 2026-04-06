// scripts/benchmark_history_optimization.js
const { performance } = require('perf_hooks');

// Mock large dataset (~10,000 items)
const generateMockData = (size) => {
    const data = [];
    const users = ['userA', 'userB', 'userC', 'userD'];
    for (let i = 0; i < size; i++) {
        data.push({
            run_id: `run_${i}`,
            username: users[i % users.length],
            summary: {
                total_amount: Math.random() * 10000,
                unique_patients: Math.floor(Math.random() * 50)
            }
        });
    }
    return data;
};

const reconciliations = generateMockData(10000);
const ITERATIONS = 1000;

console.log(`Running benchmark with dataset size: ${reconciliations.length}, iterations: ${ITERATIONS}`);

// --- OLD LOGIC ---
const oldLogic = () => {
    const totalAmountProcessed = reconciliations.reduce((acc, curr) => acc + (curr.summary?.total_amount || 0), 0);
    const uniquePatientsProcessed = reconciliations.reduce((acc, curr) => acc + (curr.summary?.unique_patients || 0), 0);

    const selectedUser = "userA";
    const filteredReconciliations = selectedUser === "all"
        ? reconciliations
        : reconciliations.filter(r => r.username === selectedUser);

    return { totalAmountProcessed, uniquePatientsProcessed, filteredCount: filteredReconciliations.length };
};

// --- NEW LOGIC (Single Pass) ---
const newLogic = () => {
    let totalAmountProcessed = 0;
    let uniquePatientsProcessed = 0;

    // Single pass using for loop
    for (let i = 0; i < reconciliations.length; i++) {
        const summary = reconciliations[i].summary;
        if (summary) {
            totalAmountProcessed += (summary.total_amount || 0);
            uniquePatientsProcessed += (summary.unique_patients || 0);
        }
    }

    const selectedUser = "userA";
    // Memoized equivalent calculation
    const filteredReconciliations = selectedUser === "all"
        ? reconciliations
        : reconciliations.filter(r => r.username === selectedUser);

    return { totalAmountProcessed, uniquePatientsProcessed, filteredCount: filteredReconciliations.length };
};

// Warmup
for (let i = 0; i < 100; i++) {
    oldLogic();
    newLogic();
}

// Measure Old Logic
const startOld = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    oldLogic();
}
const endOld = performance.now();
const oldTime = endOld - startOld;

// Measure New Logic
const startNew = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    newLogic();
}
const endNew = performance.now();
const newTime = endNew - startNew;

console.log(`\nResults:`);
console.log(`Old Logic (Double Reduce): ${oldTime.toFixed(2)}ms`);
console.log(`New Logic (Single For Loop): ${newTime.toFixed(2)}ms`);

const speedup = ((oldTime - newTime) / oldTime * 100).toFixed(2);
console.log(`\nPerformance Improvement: ${speedup}% faster`);
