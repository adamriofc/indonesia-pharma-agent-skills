/**
 * Unit & Invariant Tests for MKT Cold-Chain Engine (`tests/units/mkt-cold-chain.test.js`)
 *
 * Verifies:
 *   1. MKT calculation adherence to Haynes (1971) & USP <1079> formula
 *   2. Normal compliant cold-chain monitoring (2°C - 8°C)
 *   3. Transient excursions with MKT within specification (ACCEPTABLE_WITH_JUSTIFICATION)
 *   4. Freezing breach detection for freeze-sensitive biologicals (BREACH_QUARANTINE_MANDATED)
 *   5. Severe heat excursion & critical threshold breaches
 *   6. Controlled Room Temperature (CRT) evaluation (15°C - 25°C)
 *   7. Strict input validation and fail-closed error boundaries
 */

'use strict';

const assert = require('assert');
const path = require('path');

const { evaluateColdChainMkt } = require(path.join(__dirname, '../../engines/mkt-cold-chain-engine'));

function runMktTests() {
  console.log("🧪 Running Mean Kinetic Temperature (MKT) Cold-Chain Engine Tests...\n");

  // -------------------------------------------------------------
  // Test 1: Compliant Cold-Chain Storage (2°C - 8°C)
  // -------------------------------------------------------------
  console.log("  [1/6] Testing standard compliant cold-chain storage (2°C - 8°C)...");

  // Constant 5°C readings: MKT must equal exactly 5°C
  const constantReadings = [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0];
  const resConst = evaluateColdChainMkt({
    readings: constantReadings,
    storageCondition: 'COLD_CHAIN_2_8',
    samplingIntervalMinutes: 15
  });

  assert.strictEqual(resConst.auditVerdict.complianceStatus, 'COMPLIANT');
  assert.strictEqual(resConst.auditVerdict.isCompliant, true);
  assert.strictEqual(resConst.auditVerdict.requiresQuarantine, false);
  assert.strictEqual(resConst.metrics.minObservedCelsius, 5.0);
  assert.strictEqual(resConst.metrics.maxObservedCelsius, 5.0);
  assert.strictEqual(resConst.metrics.mktCelsius, 5.0);
  assert.strictEqual(resConst.metrics.arithmeticMeanCelsius, 5.0);
  assert.strictEqual(resConst.excursions.hasExcursions, false);

  // Normal fluctuating 3°C - 7°C readings
  const normalReadings = [3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 5.0, 4.2, 3.8];
  const resNormal = evaluateColdChainMkt({
    readings: normalReadings,
    storageCondition: 'COLD_CHAIN_2_8',
    samplingIntervalMinutes: 15
  });

  assert.strictEqual(resNormal.auditVerdict.complianceStatus, 'COMPLIANT');
  assert.strictEqual(resNormal.excursions.hasExcursions, false);
  // MKT is always higher than arithmetic mean for non-constant temperatures due to Arrhenius weighting
  assert.ok(resNormal.metrics.mktCelsius >= resNormal.metrics.arithmeticMeanCelsius);
  assert.ok(resNormal.metrics.mktCelsius <= 8.0 && resNormal.metrics.mktCelsius >= 2.0);

  // -------------------------------------------------------------
  // Test 2: Transient Excursion (Acceptable with APJ Justification)
  // -------------------------------------------------------------
  console.log("  [2/6] Testing transient excursion with acceptable MKT...");

  // 24 readings (6 hours total): mostly 4-5°C, but 2 readings spike to 9°C (30 mins door open during loading)
  const transientReadings = [
    4.0, 4.2, 4.1, 4.5, 4.3, 4.2, 4.0, 4.1,
    9.0, 9.2, // 30 mins excursion
    6.0, 5.5, 4.8, 4.5, 4.2, 4.1,
    4.0, 4.2, 4.1, 4.3, 4.2, 4.0, 4.1, 4.0
  ];

  const resTransient = evaluateColdChainMkt({
    readings: transientReadings,
    storageCondition: 'COLD_CHAIN_2_8',
    samplingIntervalMinutes: 15,
    productName: "Human Insulin Injection 100 IU/mL"
  });

  assert.strictEqual(resTransient.auditVerdict.complianceStatus, 'ACCEPTABLE_WITH_JUSTIFICATION');
  assert.strictEqual(resTransient.auditVerdict.riskLevel, 'MEDIUM');
  assert.strictEqual(resTransient.auditVerdict.requiresQuarantine, false);
  assert.strictEqual(resTransient.excursions.hasExcursions, true);
  assert.strictEqual(resTransient.excursions.upperExcursionCount, 2);
  assert.strictEqual(resTransient.excursions.upperExcursionHours, 0.5);
  // MKT must still be safely well under 8°C
  assert.ok(resTransient.metrics.mktCelsius < 6.0);
  assert.ok(resTransient.auditVerdict.mandatedActions.some(a => a.includes('Apoteker Penanggung Jawab')));

  // -------------------------------------------------------------
  // Test 3: Freeze Breach on Freeze-Sensitive Biologicals
  // -------------------------------------------------------------
  console.log("  [3/6] Testing freeze breach detection for freeze-sensitive vaccines...");

  // Temperatures dip below 0°C (e.g. -0.5°C)
  const freezeReadings = [4.0, 4.2, 3.0, 1.5, 0.2, -0.5, -0.8, 0.5, 2.5, 4.0];
  const resFreeze = evaluateColdChainMkt({
    readings: freezeReadings,
    storageCondition: 'COLD_CHAIN_2_8',
    samplingIntervalMinutes: 15,
    freezeSensitive: true,
    productName: "Hepatitis B Recombinant Vaccine"
  });

  assert.strictEqual(resFreeze.auditVerdict.complianceStatus, 'BREACH_QUARANTINE_MANDATED');
  assert.strictEqual(resFreeze.auditVerdict.riskLevel, 'CRITICAL');
  assert.strictEqual(resFreeze.auditVerdict.requiresQuarantine, true);
  assert.strictEqual(resFreeze.excursions.freezeCount, 2);
  assert.ok(resFreeze.auditVerdict.violations.some(v => v.includes('FREEZE_BREACH')));
  assert.ok(resFreeze.auditVerdict.mandatedActions.some(a => a.includes('QUARANTINED')));

  // -------------------------------------------------------------
  // Test 4: Critical High-Temperature Spike Breach
  // -------------------------------------------------------------
  console.log("  [4/6] Testing critical high temperature spike breach...");

  // Temperatures spike to 16.5°C (above critical threshold 15°C)
  const spikeReadings = [5.0, 5.5, 8.0, 12.0, 16.5, 17.0, 14.0, 8.0, 5.0];
  const resSpike = evaluateColdChainMkt({
    readings: spikeReadings,
    storageCondition: 'COLD_CHAIN_2_8',
    samplingIntervalMinutes: 15
  });

  assert.strictEqual(resSpike.auditVerdict.complianceStatus, 'BREACH_QUARANTINE_MANDATED');
  assert.strictEqual(resSpike.auditVerdict.riskLevel, 'CRITICAL');
  assert.strictEqual(resSpike.excursions.criticalUpperCount, 2);
  assert.ok(resSpike.auditVerdict.violations.some(v => v.includes('CRITICAL_TEMPERATURE_SPIKE')));

  // -------------------------------------------------------------
  // Test 5: Controlled Room Temperature (CRT 15°C - 25°C)
  // -------------------------------------------------------------
  console.log("  [5/6] Testing Controlled Room Temperature (CRT 15°C - 25°C)...");

  const crtReadings = [20.0, 21.5, 22.0, 23.0, 24.5, 22.0, 21.0, 20.5];
  const resCrt = evaluateColdChainMkt({
    readings: crtReadings,
    storageCondition: 'CONTROLLED_ROOM_15_25',
    samplingIntervalMinutes: 30
  });

  assert.strictEqual(resCrt.auditVerdict.complianceStatus, 'COMPLIANT');
  assert.strictEqual(resCrt.specification.minCelsius, 15.0);
  assert.strictEqual(resCrt.specification.maxCelsius, 25.0);
  assert.ok(resCrt.metrics.mktCelsius >= 20.0 && resCrt.metrics.mktCelsius <= 25.0);

  // -------------------------------------------------------------
  // Test 6: Input Validation & Boundary Errors
  // -------------------------------------------------------------
  console.log("  [6/6] Testing strict input validation & error boundaries...");

  // Less than 2 readings
  assert.throws(() => {
    evaluateColdChainMkt({ readings: [5.0] });
  }, /INVALID_INPUT/);

  // Invalid sampling interval
  assert.throws(() => {
    evaluateColdChainMkt({ readings: [5.0, 6.0], samplingIntervalMinutes: -10 });
  }, /INVALID_INPUT/);

  // Unrecognized storage condition
  assert.throws(() => {
    evaluateColdChainMkt({ readings: [5.0, 6.0], storageCondition: 'HOT_SAHARA' });
  }, /INVALID_INPUT/);

  // Reading containing NaN
  assert.throws(() => {
    evaluateColdChainMkt({ readings: [5.0, NaN] });
  }, /INVALID_INPUT/);

  console.log("✅ All Mean Kinetic Temperature (MKT) Tests Passed 100%!\n");
}

if (require.main === module) {
  runMktTests();
}

module.exports = { runMktTests };
