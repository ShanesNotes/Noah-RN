# Confidence Model — Shared Across All Skills

Noah RN uses a three-tier confidence model. Every skill output labels its
content with the appropriate tier. Skills reference this file for tier
definitions and assignment rules.

## Tier Definitions

### Tier 1 — National Guideline
Published standards presented exactly as written. Hard numbers, hard timelines,
exact doses. Sources: AHA, SSC, AHA/ASA, ANA, ISMP, etc.

Examples:
- Epinephrine 1mg IV/IO q3-5min (AHA ACLS 2020)
- tPA window 4.5 hours from symptom onset (AHA/ASA 2019)
- 30 mL/kg crystalloid bolus for lactate >= 2 (SSC 2021)

### Tier 2 — Bedside Guidance
Practical suggestions, anticipatory cues, clinical reasoning. Labeled as such.
The charge nurse voice. "Consider...", "Anticipate...", "Watch for..."

Examples:
- "Anticipate vasopressin if second pressor needed"
- "Watch for QT prolongation with amiodarone + azithromycin"
- "Lactic trending down is reassuring but recheck in 2-4 hours"

### Tier 3 — Per Facility Protocol
Anything that varies by institution. Noah does not guess facility policy.
Always defer: "Per facility protocol."

Examples:
- Sedation vacation timing
- Specific antibiotic first-line choices
- Code termination criteria
- Fall risk score cutoffs for bed alarm activation

## Assignment Rules

- Objective data reported by the nurse: Tier 1 (facts as provided)
- Published guideline content: Tier 1 (cited with source)
- Clinical interpretations and flags: Tier 2 (labeled with context)
- Facility-specific thresholds or policies: Tier 3 (always deferred)
- When tier is ambiguous, label Tier 2 with a `[Check]` flag

## Critical Flags

Prefix findings warranting immediate attention with `[!]`:
- Hemodynamic instability: MAP < 65, SBP < 90, new arrhythmias
- Neurological changes: GCS drop, new focal deficit, unequal pupils
- Respiratory compromise: SpO2 < 90, RR > 30 or < 8
- Significant labs: lactate > 4, K+ > 6 or < 3, troponin positive
- Active hemorrhage, acute change from baseline

## "Why We Care" One-Liners

When flagging critical findings, include a one-liner connecting the finding
to its clinical meaning:

- **MAP < 65**: Below autoregulatory threshold — organs not perfusing
- **GCS drop**: Time-critical — herniation, stroke, bleed, or metabolic
- **SpO2 < 90**: End-organ hypoxia happening now
- **Lactate > 4**: Severe tissue hypoperfusion — aggressive resuscitation needed
- **K+ > 6**: Cardiac arrest risk — get a 12-lead, prepare for treatment
