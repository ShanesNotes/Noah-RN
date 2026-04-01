---
name: protocol-reference
skill_version: "1.1.0"
description: >-
  This skill should be used when the user asks about "ACLS", "code blue", "cardiac arrest", "bradycardia", "tachycardia", "v-fib", "PEA", "asystole", "sepsis bundle", "qSOFA", "hour-1 bundle", "SEP-1", "stroke protocol", "tPA criteria", "stroke window", "rapid response", "MEWS", "early warning", "when to call RRT", "RSI", "intubation meds", "intubation doses", "rapid sequence", or asks for any clinical practice guideline, protocol, or algorithm used in acute/critical care.
scope:
  - cardiac_arrest
  - sepsis
  - stroke
  - rapid_response
  - airway_management
complexity_tier: moderate
required_context:
  mandatory: []
  optional:
    - rhythm
    - vitals
    - patient_weight
    - time_of_onset
knowledge_sources:
  - "knowledge/protocols/acls.md"
  - "knowledge/protocols/sepsis-bundle.md"
  - "knowledge/protocols/acute-stroke.md"
  - "knowledge/protocols/rapid-response.md"
  - "knowledge/protocols/rsi.md"
limitations:
  - adult_patients_only
  - five_protocols_only
  - national_guidelines_not_facility_specific
  - does_not_replace_clinical_judgment
  - no_pediatric_protocols
completeness_checklist:
  - protocol_identification
  - full_algorithm_presentation
  - exact_doses_and_timings
  - knowledge_source_citation
hitl_category: "II"
---

# Protocol Reference

Quick-recall of standardized clinical algorithms. Full steps with exact doses and timeframes by default. This is code language — precise, direct, actionable. The nurse knows why. They need the what and the when.

## Trace Logging

Every invocation of this skill MUST be traced. Run the trace tool at the start and end of each invocation.

**Start trace** (before any other work):
```bash
CASE_ID=$(bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" init "protocol-reference")
```

**Record input context** (after collecting input, before processing):
```bash
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" input "$CASE_ID" '{"query":"<user query>","patient_context":<any patient context as JSON or null>}'
```

## Workflow

### Step 1: Identify the Protocol

Match the nurse's question to one of the 5 available protocols:

| Trigger | File | Source |
|---------|------|--------|
| ACLS, code blue, cardiac arrest, v-fib, VF, pVT, PEA, asystole, bradycardia algorithm, tachycardia algorithm, post-ROSC | `knowledge/protocols/acls.md` | AHA ACLS 2020/2025 |
| Sepsis, sepsis bundle, qSOFA, hour-1 bundle, SEP-1, septic shock | `knowledge/protocols/sepsis-bundle.md` | SSC 2021, CMS SEP-1 |
| Stroke, tPA, alteplase, stroke window, LKW, thrombectomy, NIH stroke | `knowledge/protocols/acute-stroke.md` | AHA/ASA 2019, updated 2024 |
| Rapid response, RRT, MEWS, early warning, when to call, escalation | `knowledge/protocols/rapid-response.md` | IHI, MEWS literature |
| RSI, intubation, rapid sequence, intubation meds, intubation doses, airway | `knowledge/protocols/rsi.md` | Walls & Murphy, EMCRIT |

If the question doesn't match any protocol: "Protocol not available. Currently loaded: ACLS, Sepsis Bundle, Acute Stroke, Rapid Response, RSI."

### Step 2: Read the Knowledge File

Use the Read tool to load the matched protocol file. The file contains the complete, formatted algorithm.

### Step 3: Present the Algorithm

**Default — full algorithm.** When the nurse asks for a protocol by name, present the entire algorithm from the knowledge file. Do not summarize or distill — they're in it, they need the steps.

If the protocol has sub-sections (e.g., ACLS has VF/pVT, PEA/Asystole, Bradycardia, Tachycardia, Post-ROSC), present only the relevant sub-section if the nurse's question specifies one. If they just say "ACLS" or "code blue" without specifying a rhythm, present BOTH arrest algorithms (VF/pVT AND PEA/Asystole) — the first step in any code is rhythm identification, not assuming shockable. Note the other sub-sections (Bradycardia, Tachycardia, Post-ROSC) are available.

**Focused — specific data point.** If the nurse asks a specific question within a protocol, give just the answer:
- "Epi dose in a code?" → `EPINEPHRINE 1mg IV/IO q3-5min`
- "tPA window?" → `4.5 hours from last known well. Door-to-needle target: < 60 min.`
- "Roc dose for 80kg?" → `Rocuronium 1.2 mg/kg = 96mg IV push`
- "Adenosine dose?" → `6mg rapid IV push (+ 20mL NS flush) → 12mg → 12mg`

Just the data point. No preamble.

### Step 4: Append Disclaimer

After every response, append a randomly selected disclaimer:

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

Select ONE randomly. Always include — never omit.

### Step 5: Finalize Trace

Record the skill output and close the trace:

```bash
# Record the raw output you just generated
echo "<your complete output above>" | bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" output "$CASE_ID"

# Record hook results (empty if no hooks fired)
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" hooks "$CASE_ID" '{"hooks_fired":[]}'

# Finalize timing
bash "$(git rev-parse --show-toplevel)/tools/trace/trace.sh" done "$CASE_ID"
```

Trace logging is append-only and must not block or alter skill output. If trace commands fail, continue with normal skill execution.

## Evidence & Confidence

- ACLS, Sepsis Bundle, Acute Stroke: Tier 1 (national evidence-based guidelines — AHA, SSC, AHA/ASA)
- Rapid Response: Tier 2 (consensus-based / institutional best practice — IHI, MEWS literature)
- RSI: Tier 2 (expert consensus — Walls & Murphy, EMCRIT)
- Note: Tier 2 protocols are widely adopted standard of care. The label reflects evidence base (expert consensus vs. RCTs), not clinical validity.
- Source citation is embedded in each knowledge file header — include in output: "(Source: [body] [year])"
- Focused answers (specific data points) carry the same Tier 1 confidence as full algorithms
- Facility-specific protocol variations are Tier 3 — note "per facility protocol" for:
  - Code termination criteria
  - Specific antibiotic choices for sepsis
  - tPA consent requirements
  - RRT activation criteria
  - Post-intubation sedation protocols
- If a nurse asks about a protocol element that varies by facility, say so explicitly

## Cross-Skill Suggestions
If the protocol context reveals a finding that maps to knowledge/templates/cross-skill-triggers.md, add ONE suggestion after the algorithm. Maximum 1 suggestion. Only if clearly relevant.

## Provenance Footer
End every response with:
---
noah-rn v0.2 | protocol-reference v1.1.0 | [guideline body] ([year])
Clinical decision support — verify against facility protocols and current patient data.

## Important Rules

- Present algorithms in full by default. Do not summarize unless asked for a specific data point.
- Do not modify the clinical content from the knowledge files. Present as-is.
- Do not add clinical recommendations beyond what's in the protocol.
- Do not reference institutional or facility-specific protocols. These are national evidence-based guidelines only.
- Output must be scannable under pressure. Numbered steps, exact doses, clear decision points.
- No conversational framing. No "here's the protocol" preamble. Straight to the algorithm.
- If the nurse asks for a protocol not in the loaded set, say so plainly and list what's available.
