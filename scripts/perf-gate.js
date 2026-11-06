#!/usr/bin/env node
/**
 * Performance Gate & Throughput Regression Test (`scripts/perf-gate.js`)
 * Benchmarks engine execution speed and enforces maximum latency boundaries.
 */

'use strict';

const assert = require('assert');
const {
  evaluateColdChainMkt,
  calculatePharmaTkdn,
  evaluateBpomRegistration
} = require('../index.js');

function runPerfGate() {
  console.log("⚡ Running Pharmaceutical Engine Performance Gate...");

  const iterations = 10000;

  // 1. Benchmark evaluateColdChainMkt
  const readings = [4.2, 4.5, 5.0, 5.8, 6.2, 5.0, 4.3];
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    evaluateColdChainMkt({ readings, storageCondition: 'COLD_CHAIN_2_8' });
  }
  const t1 = process.hrtime.bigint();
  const mktElapsedMs = Number(t1 - t0) / 1e6;
  const mktOpsPerSec = Math.round((iterations / (mktElapsedMs / 1000)));

  console.log(`  [1/3] evaluateColdChainMkt: ${iterations} runs in ${mktElapsedMs.toFixed(2)} ms (${mktOpsPerSec.toLocaleString()} ops/sec)`);
  assert.ok(mktElapsedMs < 500, `MKT execution too slow: ${mktElapsedMs}ms`);

  // 2. Benchmark calculatePharmaTkdn
  const tkdnInput = { apiScore: 75.0, rndScore: 50.0, formulationScore: 80.0, packagingScore: 100.0, bmpScore: 10.0 };
  const t2 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    calculatePharmaTkdn(tkdnInput);
  }
  const t3 = process.hrtime.bigint();
  const tkdnElapsedMs = Number(t3 - t2) / 1e6;
  const tkdnOpsPerSec = Math.round((iterations / (tkdnElapsedMs / 1000)));

  console.log(`  [2/3] calculatePharmaTkdn: ${iterations} runs in ${tkdnElapsedMs.toFixed(2)} ms (${tkdnOpsPerSec.toLocaleString()} ops/sec)`);
  assert.ok(tkdnElapsedMs < 500, `TKDN execution too slow: ${tkdnElapsedMs}ms`);

  // 3. Benchmark evaluateBpomRegistration
  const bpomInput = { category: 'OBAT_BARU', subType: 'registrasi_kombinasi_baru', qualifyingCriteria: ['sra_approved'] };
  const t4 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    evaluateBpomRegistration(bpomInput);
  }
  const t5 = process.hrtime.bigint();
  const bpomElapsedMs = Number(t5 - t4) / 1e6;
  const bpomOpsPerSec = Math.round((iterations / (bpomElapsedMs / 1000)));

  console.log(`  [3/3] evaluateBpomRegistration: ${iterations} runs in ${bpomElapsedMs.toFixed(2)} ms (${bpomOpsPerSec.toLocaleString()} ops/sec)`);
  assert.ok(bpomElapsedMs < 500, `BPOM execution too slow: ${bpomElapsedMs}ms`);

  console.log("  ✅ All pharmaceutical engines operate within ultra-low latency bounds (< 0.05 ms/op)!\n");
}

runPerfGate();
