# Drug Reference — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a drug lookup tool (bash/curl/jq) and a contextual skill that distills FDA label data into bedside-useful quick-reference output.

**Architecture:** Two components — a deterministic bash tool that queries OpenFDA and returns structured JSON, and a SKILL.md that reads the nurse's question, calls the tool, then formats only the relevant sections in nurse-to-nurse tone. Tool fetches, skill interprets.

**Tech Stack:** Bash, curl, jq, OpenFDA Drug Label API. No external dependencies beyond standard CLI tools.

**Spec:** `docs/superpowers/specs/2026-03-26-drug-reference-design.md`

**API quirks discovered during research:**
- `openfda.pharm_class_epc` is often null — use `description` field as fallback for drug class
- Warnings field name varies across labels: check `warnings`, `warnings_and_precautions`, AND `warnings_and_cautions`
- Text fields are arrays of strings (e.g., `["text..."]`)
- `boxed_warning` is a text field (not boolean) — present when it exists, absent when not
- Searching `(openfda.brand_name:"X"+openfda.generic_name:"X")` covers both

---

### Task 1: Write the drug lookup tool with tests

**Files:**
- Create: `tools/drug-lookup/lookup.sh`
- Create: `tests/drug-lookup/test_lookup.sh`

- [ ] **Step 1: Create test directory**

```bash
mkdir -p tests/drug-lookup
```

- [ ] **Step 2: Write the test script**

Create `tests/drug-lookup/test_lookup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL="$SCRIPT_DIR/../../tools/drug-lookup/lookup.sh"
PASS=0
FAIL=0

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    if [[ "$expected" == "$actual" ]]; then
        echo "  PASS: $desc"
        ((PASS++))
    else
        echo "  FAIL: $desc"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        ((FAIL++))
    fi
}

assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -qi "$needle"; then
        echo "  PASS: $desc"
        ((PASS++))
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        echo "    actual: ${haystack:0:200}..."
        ((FAIL++))
    fi
}

echo "=== Drug Lookup Tool Tests ==="
echo ""

# Test 1: jq is available
echo "Test 1: jq dependency"
if command -v jq &>/dev/null; then
    echo "  PASS: jq is installed"
    ((PASS++))
else
    echo "  FAIL: jq is not installed"
    ((FAIL++))
fi

# Test 2: Tool is executable
echo "Test 2: Tool is executable"
if [[ -x "$TOOL" ]]; then
    echo "  PASS: lookup.sh is executable"
    ((PASS++))
else
    echo "  FAIL: lookup.sh is not executable"
    ((FAIL++))
fi

# Test 3: Query known generic name
echo "Test 3: Query generic name (metoprolol)"
result=$("$TOOL" "metoprolol")
status=$(echo "$result" | jq -r '.status')
generic=$(echo "$result" | jq -r '.drug.generic_name')
assert_eq "status is ok" "ok" "$status"
assert_contains "generic name contains metoprolol" "metoprolol" "$generic"

# Test 4: Query known brand name
echo "Test 4: Query brand name (Lopressor)"
result=$("$TOOL" "Lopressor")
status=$(echo "$result" | jq -r '.status')
generic=$(echo "$result" | jq -r '.drug.generic_name')
assert_eq "status is ok" "ok" "$status"
assert_contains "resolves to metoprolol" "metoprolol" "$generic"

# Test 5: Result has required fields
echo "Test 5: Required fields present"
result=$("$TOOL" "metoprolol")
for field in generic_name brand_name route dosage_and_administration contraindications drug_interactions; do
    val=$(echo "$result" | jq -r ".drug.$field")
    if [[ "$val" != "null" && -n "$val" ]]; then
        echo "  PASS: field '$field' present"
        ((PASS++))
    else
        echo "  FAIL: field '$field' missing or null"
        ((FAIL++))
    fi
done

# Test 6: Nonexistent drug returns error
echo "Test 6: Nonexistent drug"
result=$("$TOOL" "zzzznotadrug12345")
status=$(echo "$result" | jq -r '.status')
error=$(echo "$result" | jq -r '.error')
assert_eq "status is error" "error" "$status"
assert_eq "error type is no_match" "no_match" "$error"

# Test 7: No argument returns error
echo "Test 7: No argument"
result=$("$TOOL" 2>&1 || true)
status=$(echo "$result" | jq -r '.status' 2>/dev/null || echo "parse_error")
assert_eq "status is error" "error" "$status"

# Test 8: Drug with boxed warning
echo "Test 8: Boxed warning (amiodarone)"
result=$("$TOOL" "amiodarone")
boxed=$(echo "$result" | jq -r '.drug.boxed_warning')
if [[ "$boxed" != "null" && -n "$boxed" ]]; then
    echo "  PASS: boxed_warning present for amiodarone"
    ((PASS++))
else
    echo "  FAIL: boxed_warning missing for amiodarone"
    ((FAIL++))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
```

- [ ] **Step 3: Run tests to verify they fail (tool doesn't exist yet)**

```bash
chmod +x tests/drug-lookup/test_lookup.sh
bash tests/drug-lookup/test_lookup.sh
```

Expected: Failures (tool not found / not executable).

- [ ] **Step 4: Write the lookup tool**

Create `tools/drug-lookup/lookup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Noah RN — OpenFDA Drug Label Lookup
# Queries the FDA Drug Label API and returns structured JSON.
# Usage: lookup.sh <drug_name>

ENDPOINT="https://api.fda.gov/drug/label.json"

if [[ $# -lt 1 || -z "${1:-}" ]]; then
    echo '{"status":"error","error":"no_input","message":"Usage: lookup.sh <drug_name>"}'
    exit 0
fi

DRUG="$1"
DRUG_ENCODED=$(echo "$DRUG" | sed 's/ /+/g')

# Search both brand and generic name fields
SEARCH="(openfda.brand_name:\"${DRUG_ENCODED}\"+openfda.generic_name:\"${DRUG_ENCODED}\")"
URL="${ENDPOINT}?search=${SEARCH}&limit=1"

# Fetch from OpenFDA
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" "$URL" 2>/dev/null || echo -e "\n000")
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -1)

# Handle HTTP errors
if [[ "$HTTP_CODE" == "000" ]]; then
    echo '{"status":"error","error":"api_error","message":"OpenFDA is unreachable. Check network connection."}'
    exit 0
fi

if [[ "$HTTP_CODE" == "429" ]]; then
    echo '{"status":"error","error":"rate_limit","message":"OpenFDA rate limit hit. Wait a few seconds and retry."}'
    exit 0
fi

# Check for results
RESULT_COUNT=$(echo "$HTTP_BODY" | jq -r '.results | length' 2>/dev/null || echo "0")

if [[ "$RESULT_COUNT" == "0" || "$RESULT_COUNT" == "null" ]]; then
    echo "{\"status\":\"error\",\"error\":\"no_match\",\"message\":\"No FDA label found for '${DRUG}'.\"}"
    exit 0
fi

# Extract structured fields from first result
echo "$HTTP_BODY" | jq '{
    status: "ok",
    drug: {
        generic_name: (.results[0].openfda.generic_name // ["unknown"])[0],
        brand_name: ((.results[0].openfda.brand_name // ["unknown"]) | join(", ")),
        pharm_class: (
            (.results[0].openfda.pharm_class_epc // [])[0] //
            ((.results[0].description // [""])[0] | split(".")[0])
        ),
        route: ((.results[0].openfda.route // []) | join(", ")),
        dosage_and_administration: ((.results[0].dosage_and_administration // ["Not available"])[0]),
        warnings: (
            (.results[0].warnings // .results[0].warnings_and_precautions // .results[0].warnings_and_cautions // ["Not available"])[0]
        ),
        boxed_warning: ((.results[0].boxed_warning // [null])[0]),
        adverse_reactions: ((.results[0].adverse_reactions // ["Not available"])[0]),
        contraindications: ((.results[0].contraindications // ["Not available"])[0]),
        drug_interactions: ((.results[0].drug_interactions // ["Not available"])[0])
    }
}'
```

- [ ] **Step 5: Make tool executable**

```bash
chmod +x tools/drug-lookup/lookup.sh
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
bash tests/drug-lookup/test_lookup.sh
```

Expected: All tests pass (may take a few seconds for API calls).

- [ ] **Step 7: Commit**

```bash
git add tools/drug-lookup/lookup.sh tests/drug-lookup/test_lookup.sh
git commit -m "feat: add OpenFDA drug lookup tool with tests"
```

---

### Task 2: Write the drug-reference SKILL.md

**Files:**
- Create: `plugin/skills/drug-reference/SKILL.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p plugin/skills/drug-reference
```

- [ ] **Step 2: Write the SKILL.md**

Create `plugin/skills/drug-reference/SKILL.md`:

````markdown
---
name: drug-reference
description: This skill should be used when the user asks to "look up a drug", "drug reference", "what is [drug name]", "tell me about [medication]", "hold parameters", "side effects of", "black box warning", "high alert", or asks any question about a specific medication's dosing, administration, warnings, or interactions.
---

# Drug Reference

Look up drug information via the OpenFDA Drug Label API. Returns distilled, bedside-useful output — not a textbook. Default is a quick-reference (3-5 lines). Full label data available on request.

## Workflow

### Step 1: Identify the Drug

Extract the drug name from the nurse's question. Accept generic names, brand names, or common abbreviations. If the nurse mentions multiple drugs, look up each one separately.

### Step 2: Check High-Alert Status

Before calling the tool, check if the drug matches any entry on this ISMP high-alert list. This check is independent of the API call.

**High-alert medications (common inpatient subset):**
- Anticoagulants: heparin, warfarin, enoxaparin, lovenox, coumadin
- Insulins: all forms (regular, lispro, aspart, glargine, NPH, humalog, novolog, lantus)
- Opioids (IV): morphine, hydromorphone, fentanyl, dilaudid, meperidine
- Opioids (other high-risk): methadone, transdermal fentanyl (duragesic)
- Sedation: propofol, dexmedetomidine (precedex), midazolam (versed), ketamine infusions
- Vasoactive: norepinephrine (levophed), epinephrine, vasopressin, dopamine, dobutamine, milrinone, phenylephrine (neosynephrine)
- Neuromuscular blockers: cisatracurium, rocuronium, vecuronium, succinylcholine
- Concentrated electrolytes: IV potassium (KCl), IV magnesium, hypertonic saline (3% NaCl), IV calcium
- Thrombolytics: alteplase (tPA), tenecteplase
- Antiarrhythmics: amiodarone (cordarone, pacerone), lidocaine
- Chemotherapy: all agents
- Other: digoxin, nitroprusside (nipride)

If the drug is high-alert, flag at the TOP of every response:

```
⚠ HIGH-ALERT MEDICATION — independent double-check required per facility policy
```

### Step 3: Call the Lookup Tool

Run the drug lookup tool:

```bash
bash tools/drug-lookup/lookup.sh "<drug_name>"
```

The tool returns structured JSON with these fields:
- `generic_name`, `brand_name` — drug identification
- `pharm_class` — pharmacologic class (may be extracted from description if API field is empty)
- `route` — administration routes
- `dosage_and_administration` — FDA dosing text
- `warnings` — warnings/precautions (field name varies across labels)
- `boxed_warning` — black box warning text (null if none)
- `adverse_reactions` — side effects
- `contraindications` — when NOT to give
- `drug_interactions` — known interactions from label

If the tool returns an error:
- `no_match`: "No FDA label found for '[drug]'. Check spelling."
- `api_error`: "OpenFDA is unreachable. Try again in a moment."
- `rate_limit`: "OpenFDA rate limit hit. Wait a few seconds and retry."

Report errors plainly. No apologies, no filler.

### Step 4: Format Output Based on Context

Read the nurse's original question and select the appropriate output depth.

**Default — distilled quick-reference (3-5 lines):**

Use for general questions like "what is [drug]?", "tell me about [drug]", or when intent is unclear.

Format:
```
[Generic] ([Brand]) — [class]
Routes: [routes]. [Key admin notes if relevant]
[1-2 key bedside points: what to check, what to watch for]
Monitor: [key monitoring parameters]
```

Example:
```
Metoprolol (Lopressor) — beta-blocker, antihypertensive
Routes: PO, IV push (IV: give over 1 min)
Check HR and SBP before admin. Hold HR <60, SBP <100 per facility protocol.
Monitor: bradycardia, hypotension, dizziness.
```

**Focused — specific field based on question:**

| Question Pattern | Show |
|-----------------|------|
| "Hold parameters for [drug]" | Warnings, contraindications, key thresholds |
| "Side effects of [drug]" | Adverse reactions, warnings |
| "Can I push [drug] IV?" | Route, admin method from dosage_and_administration |
| "Interactions with [drug]" | Drug interactions section |
| "Black box warning for [drug]" | Boxed warning text |

Keep focused responses to 3-8 lines. Distill the FDA prose — don't dump raw label text.

**Full — complete extraction on request:**

Triggered by: "tell me everything", "full reference", "expand", "more detail", "full monograph"

Render all available fields in structured sections:
```
[Generic] ([Brand]) — [class]
Routes: [routes]

DOSAGE & ADMINISTRATION
[distilled from dosage_and_administration]

WARNINGS
[distilled from warnings]

BOXED WARNING (if present)
[boxed_warning text]

CONTRAINDICATIONS
[distilled from contraindications]

ADVERSE REACTIONS
[distilled from adverse_reactions]

DRUG INTERACTIONS
[distilled from drug_interactions]
```

### Step 5: Append Disclaimer

After every response (including errors), append a randomly selected disclaimer:

```
---
Noah RN — not a substitute for using your noggin. Stay focused.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — trust your gut, verify with your eyes. This is just a tool.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — you're the nurse, I'm the clipboard. Double-check everything.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — clinical decision support, not clinical decisions. You got this.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — I organize, you validate. Your assessment > my output.
Verify all findings against your assessment and facility policies.
```

Select ONE randomly. Always include — never omit, even on errors.

## Important Rules

- Distill FDA label prose into bedside language. Do not dump raw label text.
- Default to quick-reference. Only go full when explicitly asked.
- Do not fabricate drug information. If the tool returns "Not available" for a field, say so.
- Do not diagnose or recommend treatments. This is a reference tool.
- Do not make up hold parameters, titration ranges, or dosing that isn't in the FDA label. If the label doesn't specify, say "per facility protocol" — do not guess.
- Preserve the nurse's drug name convention. If they say "levo", use "levo" alongside the formal name.
- Output must be copy-paste ready. No conversational framing.
- The high-alert flag appears on EVERY response for a high-alert drug, including focused and full responses.
````

- [ ] **Step 3: Commit**

```bash
git add plugin/skills/drug-reference/SKILL.md
git commit -m "feat: add drug-reference skill (Phase 1, Skill 2)"
```

---

### Task 3: Validate plugin and remove stale .gitkeep

**Files:**
- Remove: `tools/drug-lookup/.gitkeep` (replaced by actual file)

- [ ] **Step 1: Remove .gitkeep from tools/drug-lookup (now has real content)**

```bash
rm tools/drug-lookup/.gitkeep
```

- [ ] **Step 2: Validate plugin**

```bash
claude plugin validate ./plugin
```

Expected: `Validation passed`

- [ ] **Step 3: Commit**

```bash
git add -A tools/drug-lookup/.gitkeep
git commit -m "chore: remove stale .gitkeep from tools/drug-lookup"
```

---

### Task 4: Test — Quick reference query

**Purpose:** Verify the full pipeline: tool call, contextual formatting, distilled output.

- [ ] **Step 1: Test tool directly**

```bash
bash tools/drug-lookup/lookup.sh "metoprolol"
```

Verify: Returns valid JSON with `status: "ok"` and populated fields.

- [ ] **Step 2: Test skill via claude**

```bash
claude -p "What is metoprolol?" --plugin-dir ./plugin --output-format text
```

Verify:
- Output is 3-5 lines, distilled, not raw FDA text
- Contains: generic name, brand name, class, routes, key bedside points
- Disclaimer appended
- No conversational preamble

---

### Task 5: Test — High-alert drug

- [ ] **Step 1: Test with heparin**

```bash
claude -p "Tell me about heparin" --plugin-dir ./plugin --output-format text
```

Verify:
- `⚠ HIGH-ALERT MEDICATION` flag appears at top
- Quick-reference output follows
- Disclaimer appended

---

### Task 6: Test — Focused query

- [ ] **Step 1: Test hold parameters**

```bash
claude -p "Hold parameters for lisinopril" --plugin-dir ./plugin --output-format text
```

Verify:
- Output focuses on warnings/contraindications/thresholds
- Does NOT dump full monograph
- Disclaimer appended

---

### Task 7: Test — Error handling

- [ ] **Step 1: Test nonexistent drug**

```bash
claude -p "What is zzzznotadrug?" --plugin-dir ./plugin --output-format text
```

Verify:
- Clean error message: "No FDA label found..."
- Disclaimer still appended
- No stack traces or raw JSON

---

### Task 8: Iterate on issues

- [ ] **Step 1: Review notes from Tasks 4-7**

Collect all observed issues.

- [ ] **Step 2: Fix tool issues (if any)**

Edit `tools/drug-lookup/lookup.sh` for any API parsing or error handling problems.

- [ ] **Step 3: Fix skill issues (if any)**

Edit `plugin/skills/drug-reference/SKILL.md` for formatting, routing, or disclaimer issues.

- [ ] **Step 4: Re-run failing tests**

```bash
bash tests/drug-lookup/test_lookup.sh
```

Plus re-run any failing claude scenarios.

- [ ] **Step 5: Commit fixes**

```bash
git add tools/drug-lookup/lookup.sh plugin/skills/drug-reference/SKILL.md
git commit -m "fix: address drug-reference test feedback"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run tool tests**

```bash
bash tests/drug-lookup/test_lookup.sh
```

Expected: All pass.

- [ ] **Step 2: Validate plugin**

```bash
claude plugin validate ./plugin
```

Expected: `Validation passed`

- [ ] **Step 3: Verify clean git state**

```bash
git status
git log --oneline -8
```

Expected: Clean working tree.

---

## Verification Summary

The skill is complete when:
1. `bash tests/drug-lookup/test_lookup.sh` — all tests pass
2. `claude plugin validate ./plugin` — passes
3. Quick-reference query returns distilled 3-5 line output
4. High-alert drug shows `⚠ HIGH-ALERT MEDICATION` flag
5. Focused query returns only relevant sections
6. Error case returns clean message with disclaimer
7. Disclaimer appears on every response
8. No raw FDA label text in default output
