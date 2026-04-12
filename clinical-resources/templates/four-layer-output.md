# Four-Layer Output Format

Every clinical skill output must follow this structure. This is additive to the
skill's existing output — the current format becomes the Summary layer.

## Output Layers

### Layer 1: Summary
The actionable clinical synthesis. This is what the nurse needs right now.
Copy-paste ready. No conversational preamble. Straight to the data.

This is the skill's existing output format (tables, checklists, structured text).

### Layer 2: Evidence
Inline source citations on clinical claims. Brief, not exhaustive.

Format: `(Source: [guideline body] [year])` after the relevant statement.

Examples:
- "Epi 1mg IV/IO q3-5min (Source: AHA ACLS 2020)"
- "30 mL/kg crystalloid for lactate > 2 (Source: SSC 2021)"
- "tPA window 4.5 hours (Source: AHA/ASA 2019)"

For deterministic tool output (calculators, drug lookup), cite the tool and
scoring system: "(Source: GCS — Teasdale & Jennett 1974, standard scoring)"

### Layer 3: Confidence
Label each section with its confidence tier:

- **(Tier 1 — national guideline)**: Published standards presented exactly.
  Hard numbers, hard timelines, exact doses. AHA, SSC, AHA/ASA, etc.
- **(Tier 2 — bedside guidance)**: Practical suggestions, anticipatory cues,
  clinical reasoning. Labeled as such. "Consider...", "Anticipate...",
  "Watch for..."
- **(Tier 3 — per facility protocol)**: Anything that varies by institution.
  Never guess facility policy. Always defer: "Per facility protocol."

Place tier labels inline or as section markers. Don't label every line —
label each logical section or when the tier changes within a section.

Flag uncertain sections with `[Check]` prefix:
`[Check] Confirm dosing per your facility's weight-based protocol`

### Layer 4: Provenance Footer
Every response ends with:

```
---
noah-rn v0.2 | [skill_name] v[skill_version] | [primary_source] ([year])
Clinical decision support — verify against facility protocols and current patient data.
```

### Layer 5: Disclaimer
Include 5 randomly selected disclaimers from the skill's existing disclaimer pool.
This layer is unchanged from current implementation.

## Implementation in SKILL.md

Add this block to each skill's output section (after existing output format):

```
## Output Format

[existing output instructions stay here]

### Evidence & Confidence
- Cite sources inline: "(Source: [body] [year])" after clinical claims
- Label sections with confidence tier: (Tier 1 — national guideline),
  (Tier 2 — bedside guidance), or (Tier 3 — per facility protocol)
- Flag uncertain sections: "[Check] ..."

### Provenance Footer
End every response with:
---
noah-rn v0.2 | [this skill name] v[version] | [source] ([year])
Clinical decision support — verify against facility protocols and current patient data.
```

## Why This Matters

- **Evidence**: 57% of LLM citations are post-rationalized. Requiring inline
  source attribution forces grounded output.
- **Confidence**: High-confidence outputs overridden 1.7% vs low-confidence
  81.3%. Tier labels prevent automation bias — the nurse knows what to
  double-check.
- **Provenance**: Audit trail closure. When the ACLS guideline updates from
  2020 to 2027, previous outputs remain correctly attributed.
