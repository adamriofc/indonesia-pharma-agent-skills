#!/usr/bin/env bash
# Ruleset SHA256 Checksum Management (`scripts/sha256sums.sh`)
# Generates or verifies cryptographic trust anchor hashes for statutory rulesets.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RULES_DIR="engines/rules"
CHECKSUM_FILE="SHA256SUMS.txt"

case "$1" in
  generate)
    echo "🔒 Generating SHA256 checksums for pharmaceutical statutory rulesets..."
    find "$RULES_DIR" -type f -name "*.json" | sort | xargs sha256sum > "$CHECKSUM_FILE"
    echo "✅ Checksums generated in $CHECKSUM_FILE:"
    cat "$CHECKSUM_FILE"
    ;;
  verify)
    echo "🔍 Verifying SHA256 integrity hashes for pharmaceutical statutory rulesets..."
    if [ ! -f "$CHECKSUM_FILE" ]; then
      echo "❌ Error: $CHECKSUM_FILE not found! Run '$0 generate' first."
      exit 1
    fi
    sha256sum -c "$CHECKSUM_FILE"
    echo "✅ All statutory ruleset integrity hashes verified successfully!"
    ;;
  *)
    echo "Usage: $0 {generate|verify}"
    exit 1
    ;;
esac
