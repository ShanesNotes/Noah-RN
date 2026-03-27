# Drug Reference — Design Spec

## Purpose

Look up drug information via OpenFDA and return contextually relevant, distilled results based on what the nurse is asking. Default output is quick-reference — nurse-to-nurse tone, 3-5 lines, the stuff you actually need at the bedside. Full FDA label data available on request.

This is a reminder tool for licensed professionals, not a teaching tool.

## Architecture

Two components:

### Tool: `tools/drug-lookup/lookup.sh`

Bash script that queries the OpenFDA Drug Label API. Deterministic — no LLM in the data path.

**Input:** Drug name (generic or brand)
**Output:** Structured JSON with extracted label fields
**Error handling:** Returns structured error JSON on API failure, no match, or rate limit

The tool does one thing: fetch and structure FDA data. It does not interpret, filter, or format for the nurse. That's the skill's job.

### Skill: `plugin/skills/drug-reference/SKILL.md`

Receives the nurse's question, calls the tool via Bash, then selects and formats relevant sections based on conversational context.

**The skill is the clinical lens.** It translates FDA label language into bedside-useful output.

## Tool Specification

### API Details

**Endpoint:** `https://api.fda.gov/drug/label.json`

**Query:** Search by drug name across `openfda.brand_name` and `openfda.generic_name` fields.

Example: `https://api.fda.gov/drug/label.json?search=(openfda.brand_name:"metoprolol"+openfda.generic_name:"metoprolol")&limit=1`

**Rate limits:** 240 requests/minute without API key, 120,000/day with free key. No key needed for MVP — usage will be well under limits.

**No dependencies:** Pure bash + curl + jq (jq for JSON parsing — already standard on most systems).

### Extracted Fields

The tool extracts these fields from the first matching label result:

| Field | FDA Label Source | Notes |
|-------|-----------------|-------|
| generic_name | `openfda.generic_name` | Normalized generic name |
| brand_name | `openfda.brand_name` | Common brand name(s) |
| pharm_class | `openfda.pharm_class_epc` | Established pharmacologic class |
| route | `openfda.route` | Administration route(s) |
| dosage_and_administration | `dosage_and_administration` | Full dosage text from label |
| warnings | `warnings` | Warnings including precautions |
| boxed_warning | `boxed_warning` | Black box warning if present |
| adverse_reactions | `adverse_reactions` | Adverse reaction text |
| contraindications | `contraindications` | Contraindication text |
| drug_interactions | `drug_interactions` | Interaction text from label |

### Output Format

```json
{
  "status": "ok",
  "drug": {
    "generic_name": "metoprolol tartrate",
    "brand_name": ["Lopressor"],
    "pharm_class": ["Beta-Adrenergic Blocker [EPC]"],
    "route": ["ORAL", "INTRAVENOUS"],
    "dosage_and_administration": "...",
    "warnings": "...",
    "boxed_warning": null,
    "adverse_reactions": "...",
    "contraindications": "...",
    "drug_interactions": "..."
  }
}
```

### Error Format

```json
{
  "status": "error",
  "error": "no_match | api_error | rate_limit",
  "message": "No FDA label found for 'metoprololl'. Did you mean metoprolol?"
}
```

On `no_match`: The tool attempts fuzzy matching by truncating the search term and re-querying. If still no match, returns the error with the original query for the skill to handle (suggest corrections).

## Skill Specification

### Output Philosophy

**Default: distilled quick-reference.** Nurse-to-nurse tone. 3-5 lines. The stuff that matters at 3am.

```
Metoprolol (Lopressor) — beta-blocker, antihypertensive
Routes: PO, IV push (IV: give over 1 min)
Check HR and SBP before admin. Hold HR <60, SBP <100 per facility protocol.
Monitor: bradycardia, hypotension, dizziness.
```

**On request: full extraction.** Nurse says "tell me more", "full reference", "expand", or "details" → skill renders the complete FDA label breakdown in structured sections.

The skill defaults to distilled. It never dumps the full monograph unprompted.

### Contextual Routing

The skill reads the nurse's question and selects which fields to emphasize:

| Question Pattern | Primary Fields | Example |
|-----------------|---------------|---------|
| "What is [drug]?" | Class, route, quick bedside notes | General quick-ref |
| "Hold parameters for [drug]" | Warnings, contraindications, dosage thresholds | What to check before giving |
| "Side effects of [drug]" | Adverse reactions, warnings | ADR focus |
| "Can I push [drug] IV?" | Route, dosage_and_administration | Admin route/method |
| "Interactions with [drug]" | Drug interactions from label | FDA-listed interactions |
| "Black box warning for [drug]" | Boxed warning | Just the BBW |
| "Tell me everything about [drug]" | All extracted fields | Full monograph |

When in doubt about intent, default to the quick-reference format.

### High-Alert Medication Flagging

The ISMP high-alert medication list is checked against the drug name. If the drug is high-alert, flag prominently at top of every response:

```
⚠ HIGH-ALERT MEDICATION — independent double-check required per facility policy
```

**ISMP high-alert list (common inpatient subset):**
- Anticoagulants: heparin, warfarin, enoxaparin
- Insulins: all forms
- Opioids: all IV forms, methadone, transdermal fentanyl
- Sedation agents: propofol, dexmedetomidine, midazolam/ketamine infusions
- Vasoactive agents: norepinephrine, epinephrine, vasopressin, dopamine, dobutamine, milrinone, phenylephrine
- Neuromuscular blocking agents: cisatracurium, rocuronium, vecuronium, succinylcholine
- Concentrated electrolytes: IV potassium, IV magnesium, hypertonic saline, IV calcium
- Thrombolytics: alteplase, tenecteplase
- Antiarrhythmics: amiodarone, lidocaine
- Chemotherapy agents: all
- Digoxin
- Nitroprusside

This list is hardcoded in the skill (not API-dependent). It's a static check against the drug name/class.

### Error Handling

- **No match:** "No FDA label found for '[query]'. Check spelling — common alternatives: [suggestions if available]."
- **API failure:** "OpenFDA is unreachable. Try again in a moment."
- **Rate limit:** "OpenFDA rate limit hit. Wait a few seconds and retry."

Errors are reported plainly. No apologies, no filler.

### Clinical Safety Disclaimer

Same rotating pool as Skill 1, appended to every output:

```
---
Noah RN — [rotating disclaimer]
Verify all findings against your assessment and facility policies.
```

**IMPORTANT:** Always include the disclaimer in every response, including error responses.

## Scope Boundaries

**In scope (v1):**
- OpenFDA Drug Label API lookup
- Structured field extraction via bash/curl/jq tool
- Contextual output routing based on nurse's question
- Distilled quick-reference as default, full on request
- High-alert medication flagging (hardcoded ISMP list)
- Error handling for no-match, API failure, rate limits

**Out of scope — future iterations:**
- Curated titration parameters (vasopressors, sedation, insulin, heparin)
- Curated initiation doses by indication
- IV compatibility tool/MCP (separate skill — common ICU drug pairings)
- RxNorm integration for better name resolution
- Deterministic interaction checking via dedicated API
- Drug-to-drug interaction database
- OpenFDA API key registration (not needed at MVP volume)
- Caching/offline mode

## File Map

| File | Purpose |
|------|---------|
| `tools/drug-lookup/lookup.sh` | Bash script — queries OpenFDA, returns structured JSON |
| `plugin/skills/drug-reference/SKILL.md` | Skill — contextual routing, formatting, nursing lens |

## Testing

### Tool tests (bash)
- Query known drug (metoprolol) → valid JSON with all fields
- Query brand name (Lopressor) → resolves to same drug
- Query misspelled name → error JSON with suggestion
- Query nonexistent drug → clean error
- Verify jq dependency available

### Skill tests (interactive via `claude --plugin-dir ./plugin`)
- "What is metoprolol?" → distilled 3-5 line quick-ref
- "Hold parameters for lisinopril" → focused on warnings/thresholds
- "Tell me everything about amiodarone" → full extraction
- "What about heparin?" → high-alert flag appears
- Drug not found → clean error message
- Verify disclaimer on every response

## Future Hooks

- IV compatibility skill will complement this for "can I run X with Y?" questions
- Curated titration data in `knowledge/drug-data/` will overlay on top of FDA data for ICU-specific params
- Phase 2 cross-skill awareness: shift-assessment flags a drug → drug-reference auto-provides relevant info
