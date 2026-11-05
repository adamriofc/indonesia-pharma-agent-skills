/**
 * Core Integration & Dual Installation Test (`tests/integration/core-integration.test.js`)
 *
 * Verifies end-to-end integration between:
 *   - Core: `indonesia-business-agent-skills` (v6.21.0)
 *   - Satelit: `indonesia-pharma-agent-skills` (v1.0.0)
 *
 * Tests programmatic SDK registration, engine routing, and CLI interoperability.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');

const CORE_PATH = path.resolve(__dirname, '../../../indonesian-business-agent-skills');
const PHARMA_PATH = path.resolve(__dirname, '../..');

function runCoreIntegrationTests() {
  console.log("🔗 Running Core + Pharma Satellite Integration Tests...\n");

  // 1. Check Core Availability
  console.log("  [1/4] Checking Core SDK presence at: " + CORE_PATH);
  let coreSdk = null;
  let coreVersion = 'unknown';
  try {
    coreSdk = require(CORE_PATH);
    const corePkg = require(path.join(CORE_PATH, 'package.json'));
    coreVersion = coreSdk.version || corePkg.version;
    console.log(`    ✅ Core SDK loaded: v${coreVersion}`);
  } catch (err) {
    console.warn(`    ⚠️  Core repo not found at relative path. Skipping local SDK tests: ${err.message}`);
    return;
  }

  // 2. Programmatic Registration via SDK
  console.log("  [2/4] Testing programmatic registration in Core Extension Registry...");
  const pharmaMod = require(PHARMA_PATH);

  // Clear any existing test state in core registry
  coreSdk.extensions.clearExtensions();

  const receipt = pharmaMod.register(coreSdk.extensions);
  assert.strictEqual(receipt.success, true);
  assert.strictEqual(receipt.extensionId, 'pharma-id');
  assert.strictEqual(receipt.skillCount, 6);
  assert.strictEqual(receipt.engineCount, 6);
  assert.strictEqual(coreSdk.extensions.hasExtension('pharma-id'), true);

  const extensions = coreSdk.extensions.listExtensions();
  assert.strictEqual(extensions.length, 1);
  assert.strictEqual(extensions[0].id, 'pharma-id');
  assert.strictEqual(extensions[0].skills.length, 6);
  assert.strictEqual(extensions[0].engineNames.length, 6);
  console.log("    ✅ Satellite registered successfully in Core registry");

  // 3. Execution of Extension Engines via Core SDK
  console.log("  [3/4] Testing execution of pharma engines via Core SDK router...");

  // 3a. Execute Cold Chain MKT via coreSdk.extensions.executeExtensionEngine
  const mktResult = coreSdk.extensions.executeExtensionEngine('evaluateColdChainMkt', {
    readings: [4.0, 4.5, 5.0, 5.5, 6.0, 5.2, 4.8],
    storageCondition: 'COLD_CHAIN_2_8',
    samplingIntervalMinutes: 15,
    productName: "Insulin Batch 99A"
  });
  assert.strictEqual(mktResult.auditVerdict.complianceStatus, 'COMPLIANT');
  assert.strictEqual(mktResult.productName, 'Insulin Batch 99A');
  assert.ok(mktResult.metrics.mktCelsius >= 4.0 && mktResult.metrics.mktCelsius <= 6.0);
  console.log(`    ✅ evaluateColdChainMkt executed via Core: MKT = ${mktResult.metrics.mktCelsius}°C (${mktResult.auditVerdict.complianceStatus})`);

  // 3b. Execute TKDN Pharma via Core SDK
  const tkdnResult = coreSdk.extensions.executeExtensionEngine('calculatePharmaTkdn', {
    apiScore: 50.0,
    rndScore: 60.0,
    formulationScore: 80.0,
    packagingScore: 100.0,
    bmpScore: 10.0
  });
  assert.ok(tkdnResult.tkdnScorePercent > 0);
  assert.strictEqual(typeof tkdnResult.procurementEligibility.isMandatoryProcurement, 'boolean');
  console.log(`    ✅ calculatePharmaTkdn executed via Core: TKDN = ${tkdnResult.tkdnScorePercent}% (Combined = ${tkdnResult.combinedScorePercent}%)`);

  // 3c. Execute BPOM Registration via Core SDK
  const bpomResult = coreSdk.extensions.executeExtensionEngine('evaluateBpomRegistration', {
    category: "OBAT_COPY",
    subType: "registrasi_copy_uji_be",
    includePraRegistrasi: true
  });
  assert.strictEqual(bpomResult.totalPnbpFeeIdr, 31000000);
  assert.strictEqual(bpomResult.evaluationPathway.pathway, 'JALUR_150_HARI');
  console.log(`    ✅ evaluateBpomRegistration executed via Core: Fee = Rp ${bpomResult.totalPnbpFeeIdr.toLocaleString('id-ID')} (${bpomResult.evaluationPathway.pathway})`);

  // 4. CLI Execution via Core Binary
  console.log("  [4/4] Testing CLI invocation with --extension flag...");
  const cliBin = path.join(CORE_PATH, 'bin/cli.js');
  const cliCmd = `node "${cliBin}" --extension "${PHARMA_PATH}" extensions run --engine evaluateColdChainMkt --data '{"readings":[4.0,5.0,4.5],"storageCondition":"COLD_CHAIN_2_8"}'`;
  
  const stdout = execSync(cliCmd, { encoding: 'utf8' });
  const parsedCliOutput = JSON.parse(stdout);
  assert.strictEqual(parsedCliOutput.auditVerdict.complianceStatus, 'COMPLIANT');
  assert.strictEqual(parsedCliOutput.storageCondition, 'COLD_CHAIN_2_8');
  console.log("    ✅ Core CLI with --extension flag executed flawlessly");

  console.log("\n🎉 ALL CORE + PHARMA INTEGRATION TESTS PASSED 100%!\n");
}

if (require.main === module) {
  runCoreIntegrationTests();
}

module.exports = { runCoreIntegrationTests };
