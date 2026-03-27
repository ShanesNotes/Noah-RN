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
- Neuromuscular blockers: cisatracurium, rocuronium, vecuronium, pancuronium, succinylcholine
- Concentrated electrolytes: IV potassium (KCl), IV magnesium, hypertonic saline (3% NaCl), IV calcium, IV sodium phosphate
- Concentrated dextrose: D50, D10W infusions
- Thrombolytics: alteplase (tPA), tenecteplase
- Antiarrhythmics: amiodarone (cordarone, pacerone), lidocaine
- Oral hypoglycemics: sulfonylureas (glipizide, glyburide, glimepiride)
- Intrathecal medications: all agents administered via intrathecal route
- Chemotherapy: all agents
- Other: digoxin, nitroprusside (nipride)

If the drug is high-alert, flag at the TOP of every response:

```
⚠ HIGH-ALERT MEDICATION — independent double-check required per facility policy
```

### Step 3: Call the Lookup Tool

Run the drug lookup tool. First find the noah-rn repo root by locating the tool, then execute it:

```bash
bash "$(git rev-parse --show-toplevel)/tools/drug-lookup/lookup.sh" "<drug_name>"
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
Check HR and BP before admin. Hold parameters per facility protocol.
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
