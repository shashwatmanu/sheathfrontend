const { performance } = require('perf_hooks');

class MockContext {
    save() {}
    restore() {}
    beginPath() {}
    moveTo() {}
    lineTo() {}
    stroke() {}
    closePath() {}
    set lineCap(v) {}
    set lineWidth(v) {}
    set strokeStyle(v) {}
}

const ctx = new MockContext();
const iterations = 700;
const frames = 1000;

function drawWithSaveRestore() {
    for (let i = 0; i < iterations; i++) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, 10);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    }
}

function drawWithoutSaveRestore() {
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < iterations; i++) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, 10);
        ctx.stroke();
        ctx.closePath();
    }
    ctx.restore();
}

let start = performance.now();
for (let f = 0; f < frames; f++) drawWithSaveRestore();
console.log("With save/restore:", performance.now() - start, "ms");

start = performance.now();
for (let f = 0; f < frames; f++) drawWithoutSaveRestore();
console.log("Without save/restore:", performance.now() - start, "ms");
