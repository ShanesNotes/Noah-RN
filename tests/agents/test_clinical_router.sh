#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROUTER="$REPO_ROOT/packages/agent-harness/router/clinical-router.md"
SKILLS_DIR="$REPO_ROOT/packages/workflows"
TRIGGERS="$REPO_ROOT/clinical-resources/templates/cross-skill-triggers.md"
PASS=0
FAIL=0

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    if [[ "$expected" == "$actual" ]]; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -qi "$needle"; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        echo "    actual: $(echo "$haystack" | head -5)"
        FAIL=$((FAIL + 1))
    fi
}

assert_not_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -qi "$needle"; then
        echo "  FAIL: $desc"
        echo "    unexpected content: $needle"
        echo "    actual: $(echo "$haystack" | head -5)"
        FAIL=$((FAIL + 1))
    else
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    fi
}

assert_not_empty() {
    local desc="$1" value="$2"
    if [[ -n "$value" ]]; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc (empty)"
        FAIL=$((FAIL + 1))
    fi
}

# ── File Existence ──────────────────────────────────────────────────────────

echo ""
echo "=== Router File Existence ==="

if [[ -f "$ROUTER" ]]; then
    echo "  PASS: clinical-router.md exists"
    PASS=$((PASS + 1))
else
    echo "  FAIL: clinical-router.md not found"
    FAIL=$((FAIL + 1))
    echo ""
    echo "Results: $PASS passed, $FAIL failed"
    exit 1
fi

# ── Frontmatter Structure ───────────────────────────────────────────────────

echo ""
echo "=== Frontmatter Validation ==="

FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$ROUTER" | head -n -1 | tail -n +2)

assert_contains "has name field" "^name:" "$FRONTMATTER"
assert_contains "has description field" "^description:" "$FRONTMATTER"
assert_contains "has model field" "^model:" "$FRONTMATTER"
assert_contains "has tools field" "^tools:" "$FRONTMATTER"

# ── Agent Card Metadata (A2A Readiness) ─────────────────────────────────────

echo ""
echo "=== Agent Card (A2A) ==="

assert_contains "has agent_card block" "^agent_card:" "$FRONTMATTER"
assert_contains "agent_card has schema" "schema:" "$FRONTMATTER"
assert_contains "agent_card has name" "name: noah-rn-router" "$FRONTMATTER"
assert_contains "agent_card has version" "version:" "$FRONTMATTER"
assert_contains "agent_card has description" "description:" "$FRONTMATTER"
assert_contains "agent_card has capabilities" "capabilities:" "$FRONTMATTER"
assert_contains "agent_card has input_modalities" "input_modalities:" "$FRONTMATTER"
assert_contains "agent_card has output_modalities" "output_modalities:" "$FRONTMATTER"
assert_contains "agent_card has hitl_category II" 'hitl_category: "II"' "$FRONTMATTER"
assert_contains "agent_card has limitations" "limitations:" "$FRONTMATTER"
assert_contains "agent_card has supported_skills" "supported_skills:" "$FRONTMATTER"

# ── Skill Coverage ──────────────────────────────────────────────────────────

echo ""
echo "=== Skill Coverage ==="

# Every workflow skill directory must appear in the router's intent map or available skills
ROUTER_CONTENT=$(cat "$ROUTER")

for skill_dir in "$SKILLS_DIR"/*/; do
    [[ -f "$skill_dir/SKILL.md" ]] || continue
    skill_name=$(basename "$skill_dir")
    assert_contains "router references skill: $skill_name" "$skill_name" "$ROUTER_CONTENT"
done

# ── Intent Map Completeness ─────────────────────────────────────────────────

echo ""
echo "=== Intent Map ==="

assert_contains "has intent map section" "Intent Map" "$ROUTER_CONTENT"
assert_contains "maps score_calculation intent" "score_calculation" "$ROUTER_CONTENT"
assert_contains "maps medication_query intent" "medication_query" "$ROUTER_CONTENT"
assert_contains "maps fluid_balance intent" "fluid_balance" "$ROUTER_CONTENT"
assert_contains "maps protocol_lookup intent" "protocol_lookup" "$ROUTER_CONTENT"
assert_contains "maps patient_assessment intent" "patient_assessment" "$ROUTER_CONTENT"
assert_contains "maps shift_handoff intent" "shift_handoff" "$ROUTER_CONTENT"
assert_contains "maps unit_math intent" "unit_math" "$ROUTER_CONTENT"
assert_contains "maps plugin_check intent" "plugin_check" "$ROUTER_CONTENT"

# ── Context Requirements ────────────────────────────────────────────────────

echo ""
echo "=== Context Requirements ==="

assert_contains "has context requirements section" "Context Requirements" "$ROUTER_CONTENT"
assert_contains "clinical-calculator needs component values" "component values" "$ROUTER_CONTENT"
assert_contains "drug-reference needs medication name" "medication name" "$ROUTER_CONTENT"
assert_contains "io-tracker needs fluid entries" "fluid entries" "$ROUTER_CONTENT"
assert_contains "shift-assessment needs clinical narrative" "clinical narrative" "$ROUTER_CONTENT"
assert_contains "unit-conversion needs numeric value" "numeric value" "$ROUTER_CONTENT"

# ── Complexity Tier Assignment ──────────────────────────────────────────────

echo ""
echo "=== Complexity Tier ==="

assert_contains "has complexity tier section" "Complexity Tier" "$ROUTER_CONTENT"
assert_contains "defines simple tier" "simple" "$ROUTER_CONTENT"
assert_contains "defines moderate tier" "moderate" "$ROUTER_CONTENT"
assert_contains "defines complex tier" "complex" "$ROUTER_CONTENT"

# ── Routing Logic ───────────────────────────────────────────────────────────

echo ""
echo "=== Routing Logic ==="

assert_contains "handles single-skill routing" "Single-Skill Routing" "$ROUTER_CONTENT"
assert_contains "handles multi-skill routing" "Multi-Skill Routing" "$ROUTER_CONTENT"
assert_contains "handles ambiguous routing" "Ambiguous" "$ROUTER_CONTENT"
assert_contains "handles out-of-scope" "Out-of-Scope" "$ROUTER_CONTENT"
assert_contains "handles missing context" "Missing Mandatory Context" "$ROUTER_CONTENT"

# ── Multi-Skill Contract ───────────────────────────────────────────────────

echo ""
echo "=== Multi-Skill Contract ==="

assert_contains "routes multi-skill requests through actual skills" "route through the actual skills" "$ROUTER_CONTENT"
assert_contains "defines concrete multi-skill handoff pattern" "This request needs skill-a + skill-b" "$ROUTER_CONTENT"
assert_contains "consolidates skill outputs after routing" "Consolidate skill outputs" "$ROUTER_CONTENT"
assert_contains "preserves skill completeness contract" "completeness" "$ROUTER_CONTENT"
assert_contains "preserves skill disclaimer contract" "disclaimer" "$ROUTER_CONTENT"
assert_contains "preserves skill provenance contract" "provenance" "$ROUTER_CONTENT"
assert_contains "preserves skill outputs unchanged inside consolidation" "complete output unchanged" "$ROUTER_CONTENT"
assert_contains "router footer is additive" "router footer is additive" "$ROUTER_CONTENT"
assert_not_contains "does not tell router to read files directly" "Read relevant knowledge files" "$ROUTER_CONTENT"
assert_not_contains "does not tell router to invoke Bash directly" "Invoke calculator tools via Bash" "$ROUTER_CONTENT"
assert_not_contains "does not tell router to structure the response itself" "Structure the full response covering each domain" "$ROUTER_CONTENT"

# ── Cross-Skill Awareness ──────────────────────────────────────────────────

echo ""
echo "=== Cross-Skill Awareness ==="

assert_contains "references cross-skill triggers" "cross-skill-triggers.md" "$ROUTER_CONTENT"
assert_contains "limits suggestions to max 2" "maximum 2" "$ROUTER_CONTENT"
assert_contains "suggestions only — no autonomous invocation" "Never autonomously invoke" "$ROUTER_CONTENT"

# ── Safety Rules ────────────────────────────────────────────────────────────

echo ""
echo "=== Safety Rules ==="

assert_contains "no autonomous clinical decisions" "Never make autonomous clinical decisions" "$ROUTER_CONTENT"
assert_contains "no fabricated data" "Never fabricate clinical data" "$ROUTER_CONTENT"
assert_contains "deterministic calculations via tools" "tools (Bash)" "$ROUTER_CONTENT"
assert_contains "never infer missing data" "NEVER infer" "$ROUTER_CONTENT"

# ── Output Format ───────────────────────────────────────────────────────────

echo ""
echo "=== Output Format ==="

assert_contains "four-layer format reference" "four-layer-output.md" "$ROUTER_CONTENT"
assert_contains "summary layer" "Summary" "$ROUTER_CONTENT"
assert_contains "evidence layer" "Evidence" "$ROUTER_CONTENT"
assert_contains "confidence layer" "Confidence" "$ROUTER_CONTENT"
assert_contains "provenance footer" "Provenance footer" "$ROUTER_CONTENT"
assert_contains "provenance includes skills invoked" "Skills invoked" "$ROUTER_CONTENT"
assert_contains "provenance includes complexity tier" "Complexity:" "$ROUTER_CONTENT"

# ── Charge Nurse Voice ──────────────────────────────────────────────────────

echo ""
echo "=== Charge Nurse Voice ==="

assert_contains "practical ranges over rigid cutoffs" "Practical ranges" "$ROUTER_CONTENT"
assert_contains "per facility protocol" "Per facility protocol" "$ROUTER_CONTENT"
assert_contains "thoroughness rule" "Thoroughness" "$ROUTER_CONTENT"

# ── Supported Skills Match Actual Directories ───────────────────────────────

echo ""
echo "=== Agent Card Skills vs Actual Skills ==="

AGENT_CARD_SKILLS=$(sed -n '/supported_skills:/,/^[^ ]/p' "$ROUTER" | grep '^\s*- ' | sed 's/.*- //' | sort)
ACTUAL_SKILLS=$(find "$SKILLS_DIR" -maxdepth 1 -mindepth 1 -type d -exec test -f "{}/SKILL.md" \; -printf '%f\n' | sort)

assert_eq "supported_skills matches skill directories" "$ACTUAL_SKILLS" "$AGENT_CARD_SKILLS"

# ── Results ─────────────────────────────────────────────────────────────────

echo ""
echo "====================================="
echo "Results: $PASS passed, $FAIL failed"
echo "====================================="

[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
