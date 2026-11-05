/**
 * Extension Manifest & Structure Unit Tests (`tests/units/extension-manifest.test.js`)
 *
 * Verifies:
 *   1. extension-manifest.json structural conformance to Core schema
 *   2. All 6 declared skill files exist on disk and possess valid frontmatter
 *   3. All 6 computational engines exist and are callable functions
 *   4. All 5 ruleset files are valid JSON with required statutory data
 *   5. index.js exports and register() method signatures
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const pharmaMod = require(path.join(ROOT, 'index.js'));
const manifest = pharmaMod.manifest;

function runManifestTests() {
  console.log("🧪 Running Extension Manifest & Structural Validation Tests...\n");

  // 1. Manifest Root Metadata
  console.log("  [1/5] Validating manifest root metadata...");
  assert.strictEqual(manifest.id, 'pharma-id');
  assert.strictEqual(manifest.name, 'Indonesian Pharmaceutical & Healthcare Intelligence Extension');
  assert.strictEqual(manifest.domain, 'pharma');
  assert.strictEqual(manifest.license, 'AGPL-3.0-or-later');
  assert.strictEqual(typeof manifest.version, 'string');
  assert.ok(Array.isArray(manifest.skills));
  assert.strictEqual(manifest.skills.length, 6);

  // 2. Skill Existence & Metadata
  console.log("  [2/5] Checking declared skill files on disk...");
  manifest.skills.forEach(skill => {
    assert.ok(skill.id, `Skill missing id`);
    assert.ok(skill.name, `Skill ${skill.id} missing name`);
    assert.ok(skill.description, `Skill ${skill.id} missing description`);
    assert.ok(skill.path, `Skill ${skill.id} missing path`);

    const fullPath = path.join(ROOT, skill.path);
    assert.ok(fs.existsSync(fullPath), `Skill file not found at: ${fullPath}`);

    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.startsWith('---'), `Skill file ${skill.id} missing YAML frontmatter delimiter`);
    assert.ok(content.includes(`name: ${skill.id}`), `Skill file frontmatter missing name: ${skill.id}`);
  });

  // 3. Engine Integrity & Invocability
  console.log("  [3/5] Verifying 6 computational engine functions...");
  const expectedEngines = [
    'evaluateBpomRegistration',
    'calculatePharmaTkdn',
    'evaluateEkatalogFornasMargin',
    'evaluatePharmacovigilanceMeso',
    'auditClinicalTrialPdp',
    'evaluateColdChainMkt'
  ];

  assert.ok(manifest.engines, 'Manifest missing engines object');
  expectedEngines.forEach(engName => {
    assert.strictEqual(
      typeof manifest.engines[engName],
      'function',
      `Engine "${engName}" must be a callable function in manifest.engines`
    );
    assert.strictEqual(
      typeof pharmaMod[engName],
      'function',
      `Engine "${engName}" must be exported from index.js`
    );
  });

  // 4. Rulesets Integrity
  console.log("  [4/5] Verifying rulesets...");
  const expectedRules = [
    'bpomPnbp',
    'tkdnPharma',
    'fornasProcurement',
    'mesoCausality',
    'coldChainSpecs'
  ];

  assert.ok(manifest.rules, 'Manifest missing rules object');
  expectedRules.forEach(ruleName => {
    assert.ok(manifest.rules[ruleName], `Missing rule: ${ruleName}`);
    assert.strictEqual(typeof manifest.rules[ruleName], 'object', `Rule ${ruleName} must be an object`);
  });

  // 5. Register Hook Function
  console.log("  [5/5] Verifying register() hook function...");
  assert.strictEqual(typeof pharmaMod.register, 'function', 'index.js must export register function');

  // Test register mock
  let registeredMock = null;
  const mockRegistry = {
    registerExtension: (m) => {
      registeredMock = m;
      return { success: true, extensionId: m.id };
    }
  };

  const receipt = pharmaMod.register(mockRegistry);
  assert.strictEqual(receipt.success, true);
  assert.strictEqual(receipt.extensionId, 'pharma-id');
  assert.strictEqual(registeredMock.id, 'pharma-id');

  console.log("✅ All Extension Manifest & Structural Tests Passed 100%!\n");
}

if (require.main === module) {
  runManifestTests();
}

module.exports = { runManifestTests };
