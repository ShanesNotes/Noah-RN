# Prompt Scaffolding Audit

**NOA-121** | Author: Claude (Founding Engineer) | Date: 2026-04-04
**Parent**: NOA-104 Refactor - Reorg

> **Update 2026-04-12**: `clinical-calculator` was subsequently split into `neuro-calculator`, `risk-calculator`, and `acuity-calculator`. All skills were optimized per this audit's recommendations. See `packages/workflows/clinical-calculator/SKILL.md` for the split notice.

## Executive Summary

Audited all 7 skill prompts in `plugin/skills/*/SKILL.md` for procedural scaffolding that constrains SOTA models. Found **35-45% of prompt content is reducible** across skills, driven by three systemic patterns:

1. **Cross-skill duplication** (~210 lines total): Disclaimer pool, trace logging, and universal rules are copy-pasted identically across all 7 skills.
2. **Procedural hand-holding** (~15-25% per skill): Step-by-step instructions for things a SOTA model infers from context (parse input, detect intent, format output).
3. **Obvious directives**: "Do not ask clarifying questions about the input. Parse what is provided." — a SOTA model does this when given outcome specs.

**Safety-critical content is well-separated and should be preserved intact.** The clinical reference data (thresholds, flag criteria, high-alert lists, system frameworks) is the product — it stays.

---

## Cross-Cutting Findings (Apply to All 7 Skills)

### Finding 1: Disclaimer Pool Duplication — EXTRACT

The same 5 disclaimers (30 lines) are duplicated verbatim in every skill. Total: **~210 lines of identical content**.

**Recommendation**: Extract to a shared template (`knowledge/templates/disclaimers.md` or plugin-level convention). Each skill references it with one line: "Append a random disclaimer from the shared pool."

**Estimated savings**: 29 lines per skill x 7 skills = **203 lines**.

### Finding 2: Trace Logging Boilerplate — EXTRACT

Identical init/input/output/hooks/done trace pattern appears in every skill (~20 lines each). Total: **~140 lines of identical content**.

**Recommendation**: Extract to a shared convention doc or make tracing an infrastructure concern (hook/wrapper). Each skill gets one line: "This skill is traced per the standard trace protocol."

**Estimated savings**: 18 lines per skill x 7 skills = **126 lines**.

### Finding 3: Universal Rules Duplication — CONSOLIDATE

These rules appear in nearly identical form across multiple skills:
- "Output is copy-paste ready. No conversational preamble."
- "Do not fabricate findings the nurse did not report."
- "Do not diagnose, recommend interventions, or suggest orders."
- Provenance footer pattern
- Cross-skill suggestion pattern
- Evidence & Confidence tier definitions (Tier 1/2/3 framework)

**Recommendation**: Consolidate into a plugin-level `CONVENTIONS.md` that all skills inherit. Each skill only lists its **skill-specific** rules and tier assignments.

**Estimated savings**: 10-15 lines per skill = **70-105 lines**.

### Finding 4: "Receive Input" Steps — REMOVE

Every skill starts with a step telling the model to accept the nurse's input and parse it. This is what the model does by default when given an outcome spec.

**Current** (shift-assessment, Step 1):
```
### Step 1: Receive Input

Accept the nurse's free-text clinical narrative. This can be:
- Dense ICU-style with abbreviations and clinical shorthand
- Casual med-surg description
- Partial — just a few systems mentioned
- Any combination of the above

Do not ask clarifying questions about the input. Parse what is provided.
```

**Recommended**: Remove entirely. The outcome spec ("Transform free-text clinical narrative into a structured, systems-organized nursing assessment") already implies this. The one useful rule ("Don't ask clarifying questions") belongs in Important Rules.

---

## Per-Skill Analysis

### 1. shift-assessment (261 lines)

| Section | Lines | Verdict | Rationale |
|---------|-------|---------|-----------|
| YAML frontmatter | 46 | **KEEP** | Metadata, description, completeness checklist — all functional |
| Intro paragraph | 2 | **KEEP** | Outcome spec — this is what stays |
| Trace Logging | 20 | **EXTRACT** | Cross-skill duplication (Finding 2) |
| Step 1: Receive Input | 8 | **REMOVE** | SOTA model infers this from outcome spec |
| Step 2: Infer Acuity | 28 | **REFACTOR** | Indicator lists are valuable reference (KEEP). Procedural framing is bloat. Convert to outcome spec: "Infer acuity from content. Here are the indicators:" |
| Step 3: Organize Into Systems | 22 | **REFACTOR** | The 15-system list is the product (KEEP). Remove procedural wrapper: "Map the nurse's input to..." |
| Step 4: Flag Critical Findings | 27 | **KEEP** | Thresholds + clinical rationale = safety-critical reference data |
| Step 5: Detect Gaps | 10 | **REFACTOR** | Reduce to 3-line outcome spec: "Prompt once for missing systems. One chance, then skip." |
| Step 6: Render Output | 16 | **REFACTOR** | Format example is product (KEEP). Remove obvious directives ("Only include systems that have data") |
| Disclaimer | 30 | **EXTRACT** | Cross-skill duplication (Finding 1) |
| Trace finalize | 15 | **EXTRACT** | Cross-skill duplication (Finding 2) |
| Evidence & Confidence | 12 | **REFACTOR** | Keep tier assignments, extract tier definitions to plugin-level |
| Cross-Skill Suggestions | 3 | **KEEP** | Short enough |
| Provenance Footer | 4 | **KEEP** | Required |
| Important Rules | 8 | **KEEP** | Safety-critical behavioral constraints |

**Estimated reduction**: ~100 lines (38%)

**Before** (Step 2 — procedural):
```markdown
### Step 2: Infer Acuity

Determine the care setting from input content. Do not ask the nurse to specify.

**ICU indicators** (any of these -> ICU depth):
- Ventilator settings (AC, SIMV, PS, CPAP with specific parameters)
- Vasoactive drips (levophed, vasopressin, epinephrine, dobutamine, milrinone)
[... 20 more lines of indicators ...]

**Effect on output depth:**
- ICU: All 15 systems potentially active. Expect granular hemodynamics...
- Med-surg: Core systems active. Simplify to basic vitals...
- Outpatient: Focus to relevant systems only...
```

**After** (outcome spec):
```markdown
## Acuity Detection

Infer care setting (ICU / Med-surg / Outpatient) from clinical content. Do not ask.

**Indicators**: Vent settings, vasoactive drips, art lines, sedation scores, paralytics = ICU.
Ambulatory status, PO meds, discharge planning = Med-surg. No lines/devices/monitoring = Outpatient.

**Depth scales with acuity**: ICU = all 15 systems, granular. Med-surg = core systems, functional status. Outpatient = relevant systems only.
```

---

### 2. drug-reference (279 lines)

| Section | Lines | Verdict | Rationale |
|---------|-------|---------|-----------|
| YAML frontmatter | 38 | **KEEP** | Functional metadata |
| Intro paragraph | 2 | **KEEP** | Outcome spec |
| Trace Logging | 20 | **EXTRACT** | Finding 2 |
| Step 1: Identify the Drug | 3 | **REMOVE** | Obvious from context |
| Step 2: High-Alert Check | 34 | **KEEP** | Safety-critical reference list with clinical rationale |
| Step 3: Call the Lookup Tool | 24 | **REFACTOR** | Tool syntax is needed. Remove: "First find the noah-rn repo root by locating the tool" (1 line has the path), field descriptions are useful but "If the tool returns an error" handling is obvious for SOTA |
| Step 4: Format Output | 42 | **REFACTOR** | Format examples are product (KEEP). Remove procedural wrapper: "Read the nurse's original question and select the appropriate output depth." Compress the question-pattern table (currently 7 lines for 5 patterns — keep as-is, it's compact) |
| Disclaimer | 30 | **EXTRACT** | Finding 1 |
| Trace finalize | 15 | **EXTRACT** | Finding 2 |
| Evidence & Confidence | 10 | **REFACTOR** | Keep tier assignments, extract definitions |
| Provenance Footer | 5 | **KEEP** | Required |
| Cross-Skill Suggestions | 8 | **KEEP** | Compact and useful |
| Important Rules | 11 | **KEEP** | Safety-critical constraints |

**Estimated reduction**: ~95 lines (34%)

**Before** (Step 3 — procedural):
```markdown
### Step 3: Call the Lookup Tool

Run the drug lookup tool. First find the noah-rn repo root by locating the tool, then execute it:

\`\`\`bash
bash "$(git rev-parse --show-toplevel)/tools/drug-lookup/lookup.sh" "<drug_name>"
\`\`\`

The tool returns structured JSON with these fields:
- `generic_name`, `brand_name` -- drug identification
[... 8 field descriptions ...]

If the tool returns an error:
- `no_match`: "No FDA label found for '[drug]'. Check spelling."
- `api_error`: "OpenFDA is unreachable. Try again in a moment."
- `rate_limit`: "OpenFDA rate limit hit. Wait a few seconds and retry."

Report errors plainly. No apologies, no filler.
```

**After** (outcome spec):
```markdown
## Tool

\`\`\`bash
bash "$(git rev-parse --show-toplevel)/tools/drug-lookup/lookup.sh" "<drug_name>"
\`\`\`

Returns JSON: `generic_name`, `brand_name`, `pharm_class`, `route`, `dosage_and_administration`, `warnings`, `boxed_warning`, `adverse_reactions`, `contraindications`, `drug_interactions`.

Relay errors plainly. No filler.
```

---

### 3. protocol-reference (179 lines)

| Section | Lines | Verdict | Rationale |
|---------|-------|---------|-----------|
| YAML frontmatter | 38 | **KEEP** | Functional metadata |
| Intro paragraph | 2 | **KEEP** | Outcome spec — already tight |
| Trace Logging | 20 | **EXTRACT** | Finding 2 |
| Step 1: Identify the Protocol | 12 | **REFACTOR** | Mapping table is product (KEEP). Remove wrapper: "Match the nurse's question to one of the 5 available protocols" |
| Step 2: Read the Knowledge File | 2 | **REMOVE** | "Use the Read tool to load the matched protocol file" — SOTA model knows how to read a file |
| Step 3: Present the Algorithm | 10 | **KEEP** | Default/focused behavior spec is valuable and compact |
| Disclaimer | 30 | **EXTRACT** | Finding 1 |
| Trace finalize | 15 | **EXTRACT** | Finding 2 |
| Evidence & Confidence | 14 | **REFACTOR** | Keep tier assignments. Compact but has extractable tier definitions |
| Cross-Skill Suggestions | 3 | **KEEP** | Compact |
| Provenance Footer | 4 | **KEEP** | Required |
| Important Rules | 8 | **KEEP** | Behavioral constraints |

**Estimated reduction**: ~70 lines (39%)

This is already the leanest skill. Most reduction comes from extracting duplicated cross-skill boilerplate. The clinical content is tight.

---

### 4. shift-report (273 lines)

| Section | Lines | Verdict | Rationale |
|---------|-------|---------|-----------|
| YAML frontmatter | 36 | **KEEP** | Functional metadata |
| Intro + framework note | 6 | **KEEP** | Outcome spec |
| Trace Logging | 20 | **EXTRACT** | Finding 2 |
| Step 1: Receive Input | 8 | **REMOVE** | Same pattern as shift-assessment |
| Step 2: Infer Acuity | 8 | **REFACTOR** | Says "Same rules as shift-assessment" then re-lists indicators. Should just reference shift-assessment or the shared convention |
| Step 3: Organize Into 7 Sections | 70 | **REFACTOR** | Section format examples are the product (KEEP all). Remove procedural wrapper (3 lines). The section definitions themselves are compact and necessary |
| Step 4: Detect Gaps | 10 | **REFACTOR** | Same pattern as shift-assessment. Reduce to 3-line outcome spec |
| Disclaimer | 30 | **EXTRACT** | Finding 1 |
| Trace finalize | 15 | **EXTRACT** | Finding 2 |
| Evidence & Confidence | 8 | **REFACTOR** | Keep tier assignments |
| Cross-Skill Suggestions | 3 | **KEEP** | Compact |
| Provenance Footer | 4 | **KEEP** | Required |
| Important Rules | 10 | **KEEP** | Safety-critical. "Preserve the nurse's clinical voice" is the product |

**Estimated reduction**: ~95 lines (35%)

**Before** (Step 2 — redundant cross-reference):
```markdown
### Step 2: Infer Acuity

Same rules as shift-assessment. Determine care setting from content -- do not ask.

**ICU indicators**: Vent settings, vasoactive drips, art line/CVP/PA values, sedation scores, paralytic agents, multiple invasive access devices, continuous monitoring.

**Med-surg indicators**: Ambulatory status, diet tolerance, PO meds, discharge planning, fall risk focus.

**Effect on output**:
- ICU: All 7 sections with full depth. Lines & Access fully detailed. Active Issues & Plan is critical.
- Med-surg: Core sections. Lines & Access simplified. Active Issues focused on discharge trajectory.
```

**After** (shared convention reference):
```markdown
## Acuity

Infer per shared acuity convention. ICU = full depth all sections. Med-surg = core sections, discharge trajectory focus.
```

---

### 5. clinical-calculator (281 lines)

| Section | Lines | Verdict | Rationale |
|---------|-------|---------|-----------|
| YAML frontmatter | 37 | **KEEP** | Functional metadata |
| Intro + calculator table | 15 | **KEEP** | Product — the calculator table is essential reference |
| Trace Logging | 20 | **EXTRACT** | Finding 2 |
| Step 1: Detect Calculator | 6 | **REMOVE** | "Identify which calculator the nurse wants" — obvious |
| Step 2: Collect Input | 22 | **REFACTOR** | The two-mode concept (all-at-once vs guided) is useful. The per-calculator input guidance for NIHSS, APACHE II, Wells, NEWS2 is valuable reference (KEEP). Remove procedural framing |
| Step 3: Call the Tool | 18 | **KEEP** | Tool argument formats are essential reference for 10 calculators |
| Step 4: Format Output | 12 | **KEEP** | Output format spec + "Why we care" lines are the product |
| Evidence & Confidence | 12 | **REFACTOR** | Keep tier assignments and source citations |
| Provenance Footer | 5 | **KEEP** | Required |
| Step 5: Contextual Flags | 22 | **KEEP** | Safety-critical thresholds — this is core product |
| Cross-Skill Suggestions | 5 | **KEEP** | Compact |
| Disclaimer | 30 | **EXTRACT** | Finding 1 |
| Trace finalize | 15 | **EXTRACT** | Finding 2 |
| Important Rules | 10 | **KEEP** | Critical: "do not calculate scores yourself -- always call the tool" |

**Estimated reduction**: ~95 lines (34%)

---

### 6. io-tracker (309 lines)

| Section | Lines | Verdict | Rationale |
|---------|-------|---------|-----------|
| YAML frontmatter | 31 | **KEEP** | Functional metadata |
| Intro + category tables | 28 | **KEEP** | Product — intake/output category reference |
| Trace Logging | 20 | **EXTRACT** | Finding 2 |
| Step 1: Receive Input | 7 | **REMOVE** | Same pattern |
| Step 2: Parse and Categorize | 12 | **REFACTOR** | Category mapping examples are useful reference (KEEP). Remove "Map each mentioned fluid to the correct category" wrapper |
| Step 3: Handle Special Cases | 38 | **KEEP** | Meal %, IV rate calcs, ice chips, CBI, blood product volumes — this is clinical reference data, not procedure. Valuable and safety-relevant |
| Step 4: Calculate Totals | 10 | **REFACTOR** | Tool invocation is needed. "Do not total volumes in the model" is critical (KEEP). Remove procedural framing |
| Step 5: Format Output | 20 | **KEEP** | Format example is product |
| Step 6: Incremental Mode | 12 | **REFACTOR** | Behavior spec is needed but could be 5 lines instead of 12 |
| Step 7: Clinical Flags | 22 | **KEEP** | Safety-critical thresholds with clinical rationale |
| Disclaimer | 30 | **EXTRACT** | Finding 1 |
| Trace finalize | 15 | **EXTRACT** | Finding 2 |
| Evidence & Confidence | 8 | **REFACTOR** | Keep tier assignments |
| Provenance Footer | 4 | **KEEP** | Required |
| Cross-Skill Suggestions | 8 | **KEEP** | Compact |
| Important Rules | 12 | **KEEP** | Safety constraints |

**Estimated reduction**: ~110 lines (36%)

**Before** (Step 6 — Incremental Mode):
```markdown
### Step 6: Incremental Mode

If the nurse provides follow-up entries in the same conversation:
- Keep the prior normalized entries from the last `track.sh` output state
- Add the new entries
- Re-run `track.sh` with the previous state plus the new entries
- Re-render the full summary with updated totals
- Mark new entries visually (prefix with `+` in the Details column)

Example follow-up:
\`\`\`
Nurse: "also had emesis 150cc coffee ground, and foley another 200"
\`\`\`

Updated summary includes the original entries plus the new ones, with totals
recomputed by the deterministic tool.
```

**After** (outcome spec):
```markdown
## Incremental Mode

Follow-up entries in the same conversation: merge with prior state, re-run `track.sh`, re-render full summary. Mark new entries with `+` in Details column.
```

---

### 7. unit-conversion (284 lines)

| Section | Lines | Verdict | Rationale |
|---------|-------|---------|-----------|
| YAML frontmatter | 30 | **KEEP** | Functional metadata |
| Intro + mode table | 12 | **KEEP** | Product — mode table is essential |
| Trace Logging | 20 | **EXTRACT** | Finding 2 |
| Step 1: Detect Mode | 8 | **REMOVE** | Examples are mildly useful but a SOTA model maps these from the mode table |
| Step 2: Collect Inputs | 30 | **REFACTOR** | Per-mode input specs and supported conversions list are reference (KEEP). Remove procedural framing ("ask for if not provided") — the model knows to collect missing inputs |
| Step 3: Call the Tool | 16 | **KEEP** | Tool syntax per mode is essential reference |
| Step 4: Format Output | 40 | **REFACTOR** | Format specs per mode are product (KEEP). "Why we care" lines are product (KEEP). Remove procedural wrapper |
| Evidence & Confidence | 6 | **REFACTOR** | Keep tier assignments |
| Provenance Footer | 5 | **KEEP** | Required |
| Disclaimer | 30 | **EXTRACT** | Finding 1 |
| Trace finalize | 15 | **EXTRACT** | Finding 2 |
| Cross-Skill Suggestions | 6 | **KEEP** | Compact |
| Important Rules | 10 | **KEEP** | Safety constraints — "do not do arithmetic yourself" is critical |

**Estimated reduction**: ~100 lines (35%)

---

## Summary Table

| Skill | Current Lines | Estimated Reducible | % Reduction | Primary Savings |
|-------|--------------|-------------------|-------------|-----------------|
| shift-assessment | 261 | ~100 | 38% | Extract disclaimers/trace, remove Step 1, refactor acuity/gaps to outcome specs |
| drug-reference | 279 | ~95 | 34% | Extract disclaimers/trace, remove Step 1, compress tool docs |
| protocol-reference | 179 | ~70 | 39% | Extract disclaimers/trace, remove Step 2, already lean |
| shift-report | 273 | ~95 | 35% | Extract disclaimers/trace, remove Step 1, deduplicate acuity from shift-assessment |
| clinical-calculator | 281 | ~95 | 34% | Extract disclaimers/trace, remove Step 1, compress input collection |
| io-tracker | 309 | ~110 | 36% | Extract disclaimers/trace, remove Step 1, compress incremental mode |
| unit-conversion | 284 | ~100 | 35% | Extract disclaimers/trace, remove Step 1, compress input collection |
| **Total** | **1,866** | **~665** | **~36%** | |

## Recommended Extraction Targets

These shared artifacts would eliminate the bulk of cross-skill duplication:

| New Artifact | Content | Lines Saved |
|-------------|---------|-------------|
| `knowledge/templates/disclaimers.md` | 5 disclaimer variants | 203 lines (29/skill x 7) |
| `plugin/CONVENTIONS.md` | Trace protocol, universal rules, tier definitions, provenance pattern | 126+ lines |
| Shared acuity convention (in CONVENTIONS.md) | ICU/Med-surg/Outpatient indicators and depth rules | 16 lines (shift-report dedup) |

## Safety-Critical Sections Explicitly Marked KEEP

The following content categories MUST be preserved in any refactoring:

1. **Clinical threshold lists**: Critical finding flags (shift-assessment Step 4), high-alert medication list (drug-reference Step 2), calculator flag thresholds (clinical-calculator Step 5), I&O clinical flags (io-tracker Step 7)
2. **"Why we care" one-liners**: Clinical rationale attached to thresholds and flags
3. **Confidence tier assignments**: Per-skill Tier 1/2/3 classifications for specific content types
4. **Deterministic-first rules**: "Always call the tool" (clinical-calculator, io-tracker), "Do not do arithmetic yourself" (unit-conversion), "Do not total volumes in the model" (io-tracker)
5. **Anti-fabrication rules**: "Do not add clinical findings the nurse did not report" (shift-assessment, shift-report)
6. **Important Rules sections**: Every skill's Important Rules section contains behavioral safety constraints
7. **Output format specifications**: The format examples are the product specification
8. **System/section frameworks**: 15-system assessment (shift-assessment), 7-section report (shift-report)
9. **Tool invocation syntax**: All tool argument formats (clinical-calculator, unit-conversion, io-tracker, drug-reference)
10. **Provenance footers**: Required per skill

## Implementation Notes

- This audit is read-only. No skill files were modified.
- Recommended implementation order: (1) Create shared artifacts, (2) Refactor one skill as proof-of-concept, (3) Validate with clinical scenario testing, (4) Apply pattern to remaining skills.
- The proof-of-concept skill should be **protocol-reference** — it's the leanest and most straightforward to refactor, providing a template for the others.
- Each refactored skill should be tested against the clinical scenarios in the test suite before the next skill is refactored.
