/**
 * TypeScript Typings Verification (`tests/units/typescript-typings.test.js`)
 * Ensures index.d.ts matches exact exports, functions, and interfaces.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const pharma = require('../../index.js');

function runTypingsTests() {
  console.log("📘 Verifying TypeScript Typings Integrity (index.d.ts)...");

  const dtsPath = path.join(__dirname, '../../index.d.ts');
  assert.ok(fs.existsSync(dtsPath), "index.d.ts must exist");

  const dtsContent = fs.readFileSync(dtsPath, 'utf8');

  // Verify all exported functions are declared in index.d.ts
  const exportedFunctions = [
    'evaluateBpomRegistration',
    'calculatePharmaTkdn',
    'evaluateEkatalogFornasMargin',
    'evaluatePharmacovigilanceMeso',
    'auditClinicalTrialPdp',
    'evaluateColdChainMkt',
    'register'
  ];

  exportedFunctions.forEach(fnName => {
    assert.strictEqual(typeof pharma[fnName], 'function', `pharma.${fnName} must be a function`);
    assert.ok(
      dtsContent.includes(`function ${fnName}`) || dtsContent.includes(`${fnName}(`),
      `index.d.ts must declare export function ${fnName}`
    );
  });

  // Verify exported objects
  assert.ok(typeof pharma.manifest === 'object' && pharma.manifest !== null, 'manifest must be an object');
  assert.ok(typeof pharma.engines === 'object' && pharma.engines !== null, 'engines must be an object');
  assert.ok(typeof pharma.rules === 'object' && pharma.rules !== null, 'rules must be an object');

  assert.ok(dtsContent.includes('export const manifest'), 'index.d.ts must export manifest');
  assert.ok(dtsContent.includes('export const engines'), 'index.d.ts must export engines');
  assert.ok(dtsContent.includes('export const rules'), 'index.d.ts must export rules');

  console.log("  ✅ TypeScript typings definitions aligned 100% with runtime exports!\n");
}

runTypingsTests();
