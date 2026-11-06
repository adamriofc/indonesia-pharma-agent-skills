#!/usr/bin/env node
/**
 * Automated Extension Release Gate & Quality Validator (`scripts/validate-extension.js`)
 *
 * Runs an exhaustive 16-check pipeline verifying the complete structural,
 * semantic, computational, and security integrity of `indonesia-pharma-agent-skills`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function validateExtension() {
  console.log("===================================================================");
  console.log("🛡️  AUTOMATED EXTENSION RELEASE GATE (16-CHECK EXPANDED PIPELINE)");
  console.log("===================================================================\n");

  let checks = 0;
  let errors = 0;

  // 1. Manifest Presence & Schema
  checks++;
  console.log("  [1/16] Verifying extension-manifest.json...");
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
  console.log("  [2/16] Verifying package.json alignment...");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (pkg.version !== manifest.version) {
    console.error(`❌ Version mismatch: package.json=${pkg.version}, manifest=${manifest.version}`);
    errors++;
  } else {
    console.log(`    ✅ Package version aligned: v${pkg.version}`);
  }

  // 3. Zero Dependencies Enforcement
  checks++;
  console.log("  [3/16] Enforcing Zero External Runtime Dependencies...");
  const deps = pkg.dependencies ? Object.keys(pkg.dependencies) : [];
  if (deps.length > 0) {
    console.error(`❌ Dependency violation: Found runtime dependencies: ${deps.join(', ')}`);
    errors++;
  } else {
    console.log(`    ✅ Zero external runtime dependencies confirmed`);
  }

  // 4. Skill Files & Prompt Injection Delimiters
  checks++;
  console.log("  [4/16] Verifying 6 skill documentation files & security delimiters...");
  manifest.skills.forEach(s => {
    const skillPath = path.join(ROOT, s.path);
    if (!fs.existsSync(skillPath)) {
      console.error(`❌ Missing skill file: ${s.path}`);
      errors++;
    } else {
      const content = fs.readFileSync(skillPath, 'utf8');
      if (!content.includes('[UNTRUSTED DATA PAYLOAD]') || !content.includes('[END PAYLOAD]')) {
        console.error(`❌ Skill ${s.id} missing injection defense delimiters!`);
        errors++;
      }
    }
  });
  console.log(`    ✅ All 6 skills verified with security injection defense boundaries`);

  // 5. Rulesets Integrity
  checks++;
  console.log("  [5/16] Validating statutory ruleset integrity...");
  const rules = ['bpom-pnbp.json', 'tkdn-pharma.json', 'fornas-procurement.json', 'meso-causality.json', 'cold-chain-specs.json'];
  rules.forEach(r => {
    const rPath = path.join(ROOT, 'engines/rules', r);
    if (!fs.existsSync(rPath)) {
      console.error(`❌ Missing ruleset: ${r}`);
      errors++;
    } else {
      try {
        JSON.parse(fs.readFileSync(rPath, 'utf8'));
      } catch (e) {
        console.error(`❌ Invalid JSON in ruleset ${r}: ${e.message}`);
        errors++;
      }
    }
  });
  console.log(`    ✅ All 5 statutory rulesets structurally valid`);

  // 6. Cryptographic SHA256 Ruleset Integrity
  checks++;
  console.log("  [6/16] Verifying SHA256 ruleset trust anchor checksums...");
  try {
    execSync('bash scripts/sha256sums.sh verify', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ All statutory ruleset SHA256 checksums verified`);
  } catch (e) {
    console.error(`❌ SHA256 Checksum verification failed: ${e.message}`);
    errors++;
  }

  // 7. Engine Function Exports
  checks++;
  console.log("  [7/16] Verifying 6 computational engine callable functions...");
  const pharma = require('../index.js');
  const expectedEngines = [
    'evaluateBpomRegistration',
    'calculatePharmaTkdn',
    'evaluateEkatalogFornasMargin',
    'evaluatePharmacovigilanceMeso',
    'auditClinicalTrialPdp',
    'evaluateColdChainMkt'
  ];
  expectedEngines.forEach(eng => {
    if (typeof pharma[eng] !== 'function') {
      console.error(`❌ Engine function missing or not callable: ${eng}`);
      errors++;
    }
  });
  console.log(`    ✅ All 6 computational engines exported and callable`);

  // 8. TypeScript Typings Alignment
  checks++;
  console.log("  [8/16] Verifying TypeScript index.d.ts typings integrity...");
  try {
    execSync('node tests/units/typescript-typings.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ TypeScript definitions aligned with exported runtime API`);
  } catch (e) {
    console.error(`❌ TypeScript typings test failed: ${e.message}`);
    errors++;
  }

  // 9. Execute Unit Tests
  checks++;
  console.log("  [9/16] Executing exhaustive pharma engine unit tests...");
  try {
    execSync('node tests/units/pharma-engines.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ All pharma engine unit tests passed`);
  } catch (e) {
    console.error(`❌ Engine unit tests failed: ${e.message}`);
    errors++;
  }

  // 10. Execute MKT Unit Tests
  checks++;
  console.log("  [10/16] Executing MKT Cold-Chain unit tests...");
  try {
    execSync('node tests/units/mkt-cold-chain.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ All MKT Cold-Chain tests passed`);
  } catch (e) {
    console.error(`❌ MKT Cold-Chain tests failed: ${e.message}`);
    errors++;
  }

  // 11. Execute Manifest Tests
  checks++;
  console.log("  [11/16] Executing manifest unit tests...");
  try {
    execSync('node tests/units/extension-manifest.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ Manifest unit tests passed`);
  } catch (e) {
    console.error(`❌ Manifest unit tests failed: ${e.message}`);
    errors++;
  }

  // 12. Execute Prompt Injection Security Tests
  checks++;
  console.log("  [12/16] Executing Prompt Injection defense tests...");
  try {
    execSync('node tests/security/injection.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ Closed boundary prompt isolation tests passed`);
  } catch (e) {
    console.error(`❌ Prompt injection tests failed: ${e.message}`);
    errors++;
  }

  // 13. Execute Adversarial Input Fuzzing Tests
  checks++;
  console.log("  [13/16] Executing Adversarial Input & Fuzzing security tests...");
  try {
    execSync('node tests/security/adversarial.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ Adversarial input & fuzzing tests passed`);
  } catch (e) {
    console.error(`❌ Adversarial security tests failed: ${e.message}`);
    errors++;
  }

  // 14. Execute Core Hub & Spoke Integration Test
  checks++;
  console.log("  [14/16] Executing Hub & Spoke Core Integration...");
  try {
    execSync('node tests/integration/core-integration.test.js', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ Hub & Spoke Core SDK & CLI integration verified`);
  } catch (e) {
    console.error(`❌ Core integration test failed: ${e.message}`);
    errors++;
  }

  // 15. Execute Package Smoke Installation Test
  checks++;
  console.log("  [15/16] Executing Package Smoke Tarball Pack & Installation...");
  try {
    execSync('bash scripts/package-smoke-test.sh', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ Isolated tarball pack & import execution verified`);
  } catch (e) {
    console.error(`❌ Package smoke test failed: ${e.message}`);
    errors++;
  }

  // 16. Execute Bubblewrap Kernel Sandbox Test
  checks++;
  console.log("  [16/16] Executing Bubblewrap unprivileged kernel sandbox test...");
  try {
    execSync('bash scripts/sandbox-test.sh', { cwd: ROOT, stdio: 'pipe' });
    console.log(`    ✅ Isolated Bubblewrap kernel sandbox test passed 100%`);
  } catch (e) {
    console.error(`❌ Sandbox test execution failed: ${e.message}`);
    errors++;
  }

  console.log("\n===================================================================");
  if (errors === 0) {
    console.log(`🏆 ALL 16 EXTENSION RELEASE GATE CHECKS PASSED PERFECTLY (100%)!`);
    console.log("   The extension is 100% compliant, rock-solid, and production-ready.");
    console.log("===================================================================\n");
    process.exit(0);
  } else {
    console.error(`💥 RELEASE GATE FAILED: ${errors} errors detected.`);
    console.log("===================================================================\n");
    process.exit(1);
  }
}

validateExtension();
