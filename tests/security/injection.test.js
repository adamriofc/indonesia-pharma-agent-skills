/**
 * Prompt Injection Defense & Delimiter Isolation Security Tests (`tests/security/injection.test.js`)
 * Ensures all skills implement strict closed-boundary prompt isolation.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runInjectionSecurityTests() {
  console.log("🛡️ Running Pharmaceutical Prompt Injection Defense Tests...");
  const rootDir = path.join(__dirname, '../..');
  const skillsDir = path.join(rootDir, 'skills');

  assert.ok(fs.existsSync(skillsDir), "skills directory must exist");
  const skillFolders = fs.readdirSync(skillsDir);

  let verifiedCount = 0;

  skillFolders.forEach(folder => {
    const skillPath = path.join(skillsDir, folder, 'SKILL.md');
    if (!fs.existsSync(skillPath)) return;

    const content = fs.readFileSync(skillPath, 'utf8');

    // Strict boundary checks
    const hasOpenMarker = content.includes('[UNTRUSTED DATA PAYLOAD]');
    const hasCloseMarker = content.includes('[END PAYLOAD]');
    const hasSystemInstruction = content.includes('[SYSTEM INSTRUCTION]');

    assert.ok(hasSystemInstruction, `${folder}/SKILL.md must include [SYSTEM INSTRUCTION] block`);
    assert.ok(hasOpenMarker, `${folder}/SKILL.md must include [UNTRUSTED DATA PAYLOAD] boundary`);
    assert.ok(hasCloseMarker, `${folder}/SKILL.md must include [END PAYLOAD] closing delimiter`);

    // Verify closing delimiter appears AFTER opening marker
    const openIdx = content.indexOf('[UNTRUSTED DATA PAYLOAD]');
    const closeIdx = content.indexOf('[END PAYLOAD]');
    assert.ok(closeIdx > openIdx, `${folder}/SKILL.md closing delimiter must appear after opening marker`);

    verifiedCount++;
    console.log(`  ✓ ${folder} prompt isolation boundary verified.`);
  });

  assert.strictEqual(verifiedCount, 6, "Must verify exactly 6 pharmaceutical production skills");
  console.log(`  ✅ All ${verifiedCount} pharmaceutical skills enforce closed prompt isolation boundaries!\n`);
}

runInjectionSecurityTests();
