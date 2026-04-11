const { performance } = require('perf_hooks');

// Mock CanvasRenderingContext2D
class MockContext {
    constructor() {
        this.saveCount = 0;
        this.restoreCount = 0;
        this.lineCap = '';
        this.lineWidth = 0;
        this.strokeStyle = '';
    }
    save() { this.saveCount++; }
    restore() { this.restoreCount++; }
    beginPath() {}
    moveTo(x, y) {}
    lineTo(x, y) {}
    stroke() {}
    closePath() {}
}

const ctx = new MockContext();
const iterations = 700;

function drawParticleUnoptimized(ctx) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 1;
    ctx.strokeStyle = `hsla(220,100%,60%,0.5)`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1, 1);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
}

function drawParticleOptimized(ctx) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = `hsla(220,100%,60%,0.5)`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1, 1);
    ctx.stroke();
    ctx.closePath();
}

function testUnoptimized() {
    for (let i = 0; i < iterations; i++) {
        drawParticleUnoptimized(ctx);
    }
}

function testOptimized() {
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < iterations; i++) {
        drawParticleOptimized(ctx);
    }
    ctx.restore();
}

// Warmup
for (let i = 0; i < 1000; i++) {
    testUnoptimized();
    testOptimized();
}

const startUnopt = performance.now();
for (let i = 0; i < 1000; i++) {
    testUnoptimized();
}
const endUnopt = performance.now();

const startOpt = performance.now();
for (let i = 0; i < 1000; i++) {
    testOptimized();
}
const endOpt = performance.now();

console.log(`Unoptimized: ${(endUnopt - startUnopt).toFixed(2)}ms`);
console.log(`Optimized: ${(endOpt - startOpt).toFixed(2)}ms`);
