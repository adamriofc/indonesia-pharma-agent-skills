#!/usr/bin/env node
/**
 * Automated Extension Release Gate & Quality Validator (`scripts/validate-extension.js`)
 *
 * Runs an exhaustive 10-check pipeline verifying the complete structural,
 * semantic, and computational integrity of `indonesia-pharma-agent-skills`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function validateExtension() {
  console.log("===================================================================");
  console.log("🛡️  AUTOMATED EXTENSION RELEASE GATE (10-CHECK PIPELINE)");
  console.log("===================================================================\n");

  let checks = 0;
  let errors = 0;

  // 1. Manifest Presence & Schema
  checks++;
  console.log("  [1/10] Verifying extension-manifest.json...");
  const manifestPath = path.join(ROOT, 'extension-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error("❌ extension-manifest.json missing!");
    errors++;
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.id !== 'pharma-id' || manifest.skills.length !== 6) {
      console.error(`❌ Manifest content mismatch: id=${manifest.id}, skills=${manifest.skills.length}`);
      errors++;
    } else {
      console.log(`    ✅ Manifest verified: id=${manifest.id}, v${manifest.version}, ${manifest.skills.length} skills`);
    }
  }

  // 2. Package.json Version Alignment
  checks++;
  console.log("  [2/10] Verifying package.json alignment...");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (pkg.version !== manifest.version) {
    console.error(`❌ Version mismatch: package.json=${pkg.version}, manifest=${manifest.version}`);
    errors++;
  } else {
    console.log(`    ✅ Package version aligned: v${pkg.version}`);
  }

  // 3. Zero External Dependencies
  checks++;
  console.log("  [3/10] Enforcing Zero External Runtime Dependencies...");
  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
    console.error(`❌ External runtime dependencies detected: ${JSON.stringify(pkg.dependencies)}`);
    errors++;
  } else {
    console.log("    ✅ Zero external runtime dependencies confirmed");
  }

  // 4. Skills on Disk & Frontmatter
  checks++;
  console.log("  [4/10] Verifying 6 skill documentation files & security delimiters...");
  let skillErrors = 0;
  manifest.skills.forEach(s => {
    const sPath = path.join(ROOT, s.path);
    if (!fs.existsSync(sPath)) {
      console.error(`❌ Skill file missing: ${s.path}`);
      skillErrors++;
    } else {
      const content = fs.readFileSync(sPath, 'utf8');
      if (!content.includes('[UNTRUSTED DATA PAYLOAD]') || !content.includes('[END PAYLOAD]')) {
        console.error(`❌ Skill ${s.id} missing injection defense boundary delimiters!`);
        skillErrors++;
      }
    }
  });
  if (skillErrors === 0) {
    console.log("    ✅ All 6 skills verified with security injection defense boundaries");
  } else {
    errors += skillErrors;
  }

  // 5. Ruleset JSON Files
  checks++;
  console.log("  [5/10] Validating statutory ruleset integrity...");
  const rules = ['bpom-pnbp.json', 'tkdn-pharma.json', 'fornas-procurement.json', 'meso-causality.json', 'cold-chain-specs.json'];
  let ruleErrors = 0;
  rules.forEach(r => {
    const rPath = path.join(ROOT, 'engines/rules', r);
    if (!fs.existsSync(rPath)) {
      console.error(`❌ Rule file missing: ${r}`);
      ruleErrors++;
    } else {
      try {
        JSON.parse(fs.readFileSync(rPath, 'utf8'));
      } catch (e) {
        console.error(`❌ Invalid JSON in rule ${r}: ${e.message}`);
        ruleErrors++;
      }
    }
  });
  if (ruleErrors === 0) {
    console.log(`    ✅ All ${rules.length} statutory rulesets structurally valid`);
  } else {
    errors += ruleErrors;
  }

  // 6. Engine Invocability
  checks++;
  console.log("  [6/10] Verifying 6 computational engine callable functions...");
  const pharmaMod = require(path.join(ROOT, 'index.js'));
  const expectedEngines = [
    'evaluateBpomRegistration',
    'calculatePharmaTkdn',
    'evaluateEkatalogFornasMargin',
    'evaluatePharmacovigilanceMeso',
    'auditClinicalTrialPdp',
    'evaluateColdChainMkt'
  ];
  let engineErrors = 0;
  expectedEngines.forEach(eng => {
    if (typeof pharmaMod[eng] !== 'function') {
      console.error(`❌ Missing engine export: ${eng}`);
      engineErrors++;
    }
  });
  if (engineErrors === 0) {
    console.log("    ✅ All 6 computational engines exported and callable");
  } else {
    errors += engineErrors;
  }

  // 7. Unit Tests
  checks++;
  console.log("  [7/10] Executing exhaustive pharma engine unit tests...");
  try {
    execSync('node tests/units/pharma-engines.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log("    ✅ All pharma engine unit tests passed");
  } catch (err) {
    console.error(`❌ Pharma engine unit tests failed: ${err.message}`);
    errors++;
  }

  // 8. MKT Cold-Chain Unit Tests
  checks++;
  console.log("  [8/10] Executing MKT Cold-Chain unit tests...");
  try {
    execSync('node tests/units/mkt-cold-chain.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log("    ✅ All MKT Cold-Chain tests passed");
  } catch (err) {
    console.error(`❌ MKT Cold-Chain tests failed: ${err.message}`);
    errors++;
  }

  // 9. Extension Manifest Unit Tests
  checks++;
  console.log("  [9/10] Executing manifest unit tests...");
  try {
    execSync('node tests/units/extension-manifest.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log("    ✅ Manifest unit tests passed");
  } catch (err) {
    console.error(`❌ Manifest unit tests failed: ${err.message}`);
    errors++;
  }

  // 10. Core Integration Tests
  checks++;
  console.log("  [10/10] Executing Hub & Spoke Core Integration tests...");
  try {
    execSync('node tests/integration/core-integration.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log("    ✅ Core integration tests passed 100%");
  } catch (err) {
    console.error(`❌ Core integration tests failed: ${err.message}`);
    errors++;
  }

  console.log("\n===================================================================");
  if (errors === 0) {
    console.log(`🎉 RELEASE GATE PASSED: All ${checks}/10 checks passed with 0 errors!`);
    console.log("===================================================================");
    process.exit(0);
  } else {
    console.error(`❌ RELEASE GATE FAILED: ${errors} errors detected across ${checks} checks!`);
    console.log("===================================================================");
    process.exit(1);
  }
}

if (require.main === module) {
  validateExtension();
}

module.exports = { validateExtension };
