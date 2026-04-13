#!/usr/bin/env bash
set -euo pipefail

# UTF-8 Smoke Test — validates that polytonic Greek in SYSTEM.md
# survives the runtime file-read pipeline.
#
# Run on tower after deploying to confirm Docker/Pi handles the encoding.
# Usage: bash tools/utf8-smoke-test.sh

SYSTEM_MD="${1:-$(git rev-parse --show-toplevel)/.pi/SYSTEM.md}"

if [[ ! -f "$SYSTEM_MD" ]]; then
  echo "FAIL: $SYSTEM_MD not found"
  exit 1
fi

# These are the exact Greek strings from the system prompt.
# If any fail to match, the file was corrupted in transit or by the runtime.
EXPECTED_STRINGS=(
  "Ἀγαπήσεις κύριον τὸν θεόν σου"
  "Ἀγαπήσεις τὸν πλησίον σου ὡς σεαυτόν"
  "ἐπὶ δηλήσει δὲ καὶ ἀδικίῃ εἴρξειν"
)

PASS=0
FAIL=0
inc_pass() { PASS=$((PASS + 1)); }
inc_fail() { FAIL=$((FAIL + 1)); }

for expected in "${EXPECTED_STRINGS[@]}"; do
  if grep -qF "$expected" "$SYSTEM_MD"; then
    echo "PASS: found «${expected:0:40}…»"
    inc_pass
  else
    echo "FAIL: missing «${expected:0:40}…»"
    inc_fail
  fi
done

# Byte-level check: confirm the file is valid UTF-8
if file "$SYSTEM_MD" | grep -qi 'utf-8\|unicode'; then
  echo "PASS: file reports UTF-8 encoding"
  inc_pass
else
  ENCODING=$(file "$SYSTEM_MD")
  echo "WARN: file encoding report: $ENCODING"
  # Not a hard fail — some systems report 'Unicode text' without saying UTF-8
fi

# Specific byte sequence check for Ἀ (U+1F08) = E1 BC 88 in UTF-8
if xxd "$SYSTEM_MD" | grep -q 'e1bc88'; then
  echo "PASS: U+1F08 (Ἀ) byte sequence E1 BC 88 present"
  inc_pass
else
  # Try without xxd spacing variance
  if od -A x -t x1z "$SYSTEM_MD" | grep -q 'e1  bc  88\|e1 bc 88'; then
    echo "PASS: U+1F08 (Ἀ) byte sequence present (od)"
    inc_pass
  else
    echo "WARN: could not confirm U+1F08 byte sequence — may be a tooling issue, check manually"
  fi
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [[ $FAIL -gt 0 ]]; then
  echo "⚠ Greek text did not survive. Check encoding at each stage: git, Docker COPY/mount, Pi file reader."
  exit 1
else
  echo "✓ Ethical foundation intact."
  exit 0
fi
