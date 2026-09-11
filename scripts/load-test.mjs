import { performance } from 'node:perf_hooks';

const base = process.env.LOAD_BASE_URL ?? 'http://localhost:4000/api';
const durationMs = Number(process.env.LOAD_DURATION_SECONDS ?? 30) * 1000;
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 25);
const maxP95 = Number(process.env.LOAD_MAX_P95_MS ?? 500);
const minRps = Number(process.env.LOAD_MIN_RPS ?? 20);
const paths = ['/health', '/catalog/categories', '/catalog/products?perPage=12', '/content/blog', '/content/faq'];
const latencies = [];
let total = 0; let failed = 0; let cursor = 0;
const started = performance.now();

async function worker() {
  while (performance.now() - started < durationMs) {
    const path = paths[cursor++ % paths.length];
    const before = performance.now();
    try {
      const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) failed++;
      await response.arrayBuffer();
    } catch { failed++; }
    latencies.push(performance.now() - before); total++;
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
latencies.sort((a, b) => a - b);
const elapsed = (performance.now() - started) / 1000;
const p95 = latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] ?? 0;
const rps = total / elapsed;
const errorRate = total ? failed / total : 1;
console.log(JSON.stringify({ total, failed, errorRate, rps, p95Ms: p95, concurrency, elapsedSeconds: elapsed }, null, 2));
if (errorRate > 0.01 || p95 > maxP95 || rps < minRps) process.exitCode = 1;
