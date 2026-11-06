#!/usr/bin/env bash
# Package Smoke Installation & Module Export Test (`scripts/package-smoke-test.sh`)
# Packs repository tarball, installs in isolated temp environment, and verifies module exports.
# Compatible with read-only host environments & sandboxes (tmpfs cache).

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR=$(mktemp -d /tmp/pharma-smoke-XXXXXX)
CACHE_DIR=$(mktemp -d /tmp/pharma-cache-XXXXXX)

cleanup() {
  rm -rf "$TEMP_DIR" "$CACHE_DIR"
  if [ -n "$TARBALL_PATH" ] && [ -f "$TARBALL_PATH" ]; then
    rm -f "$TARBALL_PATH"
  fi
}
trap cleanup EXIT

echo "📦 Running Pharma Package Smoke Installation & Export Test..."

cd "$ROOT_DIR"
TARBALL=$(npm pack --pack-destination "$TEMP_DIR" --cache "$CACHE_DIR" --quiet | tail -n 1)
TARBALL_PATH="$TEMP_DIR/$TARBALL"

if [ ! -f "$TARBALL_PATH" ]; then
  echo "❌ Error: Tarball was not created at expected path: $TARBALL_PATH"
  exit 1
fi

echo "  [1/3] Created package tarball: $TARBALL"

cd "$TEMP_DIR"
npm init -y --cache "$CACHE_DIR" > /dev/null
npm install "$TARBALL_PATH" --cache "$CACHE_DIR" --quiet > /dev/null

echo "  [2/3] Successfully installed tarball into isolated temp environment: $TEMP_DIR"

# Verify module requiring and execution
node -e "
const pkg = require('indonesia-pharma-agent-skills/package.json');
console.log('    ✓ Package name:', pkg.name, 'v' + pkg.version);

const pharma = require('indonesia-pharma-agent-skills');
if (typeof pharma.evaluateColdChainMkt !== 'function') throw new Error('Missing evaluateColdChainMkt');
if (typeof pharma.calculatePharmaTkdn !== 'function') throw new Error('Missing calculatePharmaTkdn');

const mkt = pharma.evaluateColdChainMkt({
  readings: [4.2, 4.5, 5.0, 5.2, 4.8],
  storageCondition: 'COLD_CHAIN_2_8'
});
if (mkt.auditVerdict.complianceStatus !== 'COMPLIANT') throw new Error('MKT compliance status mismatch');
console.log('    ✓ Engine evaluateColdChainMkt required & executed successfully (MKT = ' + mkt.metrics.mktCelsius + '°C)');

const tkdn = pharma.calculatePharmaTkdn({
  apiScore: 80,
  rndScore: 50,
  formulationScore: 90,
  packagingScore: 100,
  bmpScore: 10
});
if (tkdn.tkdnScorePercent !== 73.5) throw new Error('TKDN score mismatch');
console.log('    ✓ Engine calculatePharmaTkdn required & executed successfully (TKDN = ' + tkdn.tkdnScorePercent + '%)');
"

echo "  [3/3] Standalone tarball installation and execution verified 100%!"
echo "✅ Package smoke test PASSED!"
