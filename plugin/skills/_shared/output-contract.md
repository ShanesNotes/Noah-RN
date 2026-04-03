# Output Contract — Shared Across All Skills

Every skill output follows this contract. Skills reference this file instead of
duplicating these sections.

## Four-Layer Output Format

### Layer 1: Summary
The actionable clinical synthesis. Copy-paste ready. No conversational preamble.
This is the skill's primary output format (tables, checklists, structured text).

### Layer 2: Evidence
Inline source citations on clinical claims.

Format: `(Source: [guideline body] [year])` after the relevant statement.

Examples:
- "Epi 1mg IV/IO q3-5min (Source: AHA ACLS 2020)"
- "30 mL/kg crystalloid for lactate > 2 (Source: SSC 2021)"
- "tPA window 4.5 hours (Source: AHA/ASA 2019)"

For deterministic tool output, cite the tool and scoring system:
"(Source: GCS — Teasdale & Jennett 1974, standard scoring)"

Do not fabricate citations. If no authoritative source is known, omit the citation.

### Layer 3: Confidence
Label each logical section with its confidence tier:

- **(Tier 1 — national guideline)**: Published standards presented exactly.
  Hard numbers, hard timelines, exact doses. AHA, SSC, AHA/ASA, etc.
- **(Tier 2 — bedside guidance)**: Practical suggestions, anticipatory cues,
  clinical reasoning. "Consider...", "Anticipate...", "Watch for..."
- **(Tier 3 — per facility protocol)**: Anything that varies by institution.
  Never guess facility policy. Always defer: "Per facility protocol."

Place tier labels inline or as section markers. Label each logical section or
when the tier changes within a section. Don't label every line.

Flag uncertain sections with `[Check]` prefix:
`[Check] Confirm dosing per your facility's weight-based protocol`

### Layer 4: Provenance Footer
Every response ends with:

```
---
noah-rn v0.2 | [skill_name] v[skill_version] | [primary_source] ([year])
Clinical decision support — verify against facility protocols and current patient data.
```

## Disclaimer Pool

Select ONE randomly per invocation. Always include — never omit.

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

## Cross-Skill Suggestions

When output reveals findings matching conditions in
`knowledge/templates/cross-skill-triggers.md`, surface up to 2 suggestions
after the primary output:

```
---
Based on [finding]: consider reviewing [protocol/skill].
[One-line clinical rationale from cross-skill-triggers.md.]
```

Rules:
- Suggestions only. Never invoke another skill autonomously.
- Maximum 2 per output.
- Only suggest if the finding is clearly present.
- Don't suggest what the nurse already asked for.

## Why This Contract Exists

- **Evidence**: 57% of LLM citations are post-rationalized. Inline attribution
  forces grounded output.
- **Confidence**: Tier labels prevent automation bias — the nurse knows what to
  double-check. High-confidence outputs overridden 1.7% vs low-confidence 81.3%.
- **Provenance**: Audit trail closure. When guidelines update, previous outputs
  remain correctly attributed.
- **Disclaimers**: Not legal decoration — the design philosophy. "You're the
  nurse, I'm the clipboard" is literal.
