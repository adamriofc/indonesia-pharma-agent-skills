/**
 * Adversarial Security & Input Fuzzing Tests (`tests/security/adversarial.test.js`)
 * Tests parameter hijacking, invalid types, NaN, Infinity, negative values, and code injection.
 */

'use strict';

const assert = require('assert');
const {
  evaluateColdChainMkt,
  calculatePharmaTkdn,
  evaluateBpomRegistration,
  evaluateEkatalogFornasMargin,
  evaluatePharmacovigilanceMeso,
  auditClinicalTrialPdp
} = require('../../index.js');

function runAdversarialTests() {
  console.log("🛡️ Running Adversarial Input & Fuzzing Security Tests...");

  // 1. Cold Chain MKT Input Fuzzing & Boundary Defense
  console.log("  [1/6] Testing Cold Chain MKT Engine Input Boundaries...");
  assert.throws(() => evaluateColdChainMkt({ readings: "DROP TABLE temperatures;" }), /INVALID_INPUT/);
  assert.throws(() => evaluateColdChainMkt({ readings: [] }), /INVALID_INPUT/);
  assert.throws(() => evaluateColdChainMkt({ readings: [4.0, NaN, 5.0] }), /INVALID_INPUT/);
  assert.throws(() => evaluateColdChainMkt({ readings: [4.0, Infinity, 5.0] }), /INVALID_INPUT/);
  assert.throws(() => evaluateColdChainMkt({ readings: [4.0, -300.0, 5.0] }), /INVALID_INPUT/); // Below absolute zero
  assert.throws(() => evaluateColdChainMkt({ readings: [4.0, 5.0], storageCondition: "UNKNOWN_CONDITION" }), /INVALID_INPUT/);
  console.log("    ✓ MKT Cold-Chain throws INVALID_INPUT on malicious strings, NaN, Infinity, and invalid conditions");

  // 2. TKDN Farmasi Fuzzing
  console.log("  [2/6] Testing TKDN Farmasi Engine Input Boundaries...");
  assert.throws(() => calculatePharmaTkdn({ apiScore: -10 }), /INVALID_INPUT/);
  assert.throws(() => calculatePharmaTkdn({ apiScore: 150 }), /INVALID_INPUT/);
  assert.throws(() => calculatePharmaTkdn({ rndScore: NaN }), /INVALID_INPUT/);
  assert.throws(() => calculatePharmaTkdn({ bmpScore: -5 }), /INVALID_INPUT/);
  assert.throws(() => calculatePharmaTkdn({ bmpScore: NaN }), /INVALID_INPUT/);
  assert.throws(() => calculatePharmaTkdn({ apiScore: "alert('pwned')" }), /INVALID_INPUT/);
  console.log("    ✓ TKDN Farmasi throws INVALID_INPUT on out-of-bounds percentages, strings, and NaN");

  // 3. BPOM Registration Fuzzing
  console.log("  [3/6] Testing BPOM Registration Engine Input Boundaries...");
  assert.throws(() => evaluateBpomRegistration({ category: "INVALID_CAT" }), /INVALID_INPUT/);
  assert.throws(() => evaluateBpomRegistration("string_payload"), /INVALID_INPUT/);
  assert.throws(() => evaluateBpomRegistration(null), /INVALID_INPUT/);
  console.log("    ✓ BPOM Registration strictly validates statutory categories and object schemas");

  // 4. E-Katalog Tender Fuzzing
  console.log("  [4/6] Testing E-Katalog Fornas Tender Engine Input Boundaries...");
  assert.throws(() => evaluateEkatalogFornasMargin({ cogsPerUnit: -1000 }), /INVALID_INPUT/);
  assert.throws(() => evaluateEkatalogFornasMargin({ cogsPerUnit: NaN }), /INVALID_INPUT/);
  assert.throws(() => evaluateEkatalogFornasMargin({ cogsPerUnit: 5000, lkppCeilingPrice: -200 }), /INVALID_INPUT/);
  assert.throws(() => evaluateEkatalogFornasMargin({ cogsPerUnit: 5000, lkppCeilingPrice: 10000, paymentTermsDays: -30 }), /INVALID_INPUT/);
  assert.throws(() => evaluateEkatalogFornasMargin({ cogsPerUnit: 5000, lkppCeilingPrice: 10000, annualCostOfFundPercent: -5 }), /INVALID_INPUT/);
  console.log("    ✓ E-Katalog Margin enforces non-negative monetary figures and valid interest rates");

  // 5. MESO Pharmacovigilance Fuzzing
  console.log("  [5/6] Testing MESO Pharmacovigilance Engine Input Boundaries...");
  assert.throws(() => evaluatePharmacovigilanceMeso({}), /INVALID_INPUT/);
  assert.throws(() => evaluatePharmacovigilanceMeso({ eventDate: "not-a-valid-date" }), /INVALID_INPUT/);
  assert.throws(() => evaluatePharmacovigilanceMeso({ eventDate: "2026-05-10", reportDate: "2026-05-01" }), /INVALID_INPUT/);
  console.log("    ✓ MESO Pharmacovigilance strictly bounds temporal onset and chronology parameters");

  // 6. Clinical Trial PDP Compliance Fuzzing
  console.log("  [6/6] Testing Clinical Trial PDP Compliance Engine Input Boundaries...");
  assert.throws(() => auditClinicalTrialPdp("invalid_payload"), /INVALID_INPUT/);
  assert.throws(() => auditClinicalTrialPdp(null), /INVALID_INPUT/);
  console.log("    ✓ Clinical Trial PDP enforces strict object payloads and input contracts");

  console.log("  ✅ All 6 pharmaceutical engines passed adversarial security and injection fuzzing!\n");
}

runAdversarialTests();
