# Clinical Scenario Test Manifest

Total scenarios: **50** (10 encounter-based + 40 legacy per-skill)
Last updated: 2026-03-31

---

## Encounter-Based Scenarios (Canonical Format)

Multi-skill, patient encounter format. Each encounter exercises 5–8 skills in a realistic nursing workflow sequence. Use these for regression testing after any skill prompt change.

| ID | Description | Severity | Skills Exercised |
|----|-------------|----------|-----------------|
| encounter-001 | Urosepsis — vasopressors, trending lactate, confused patient | critical | shift-report, drug-reference ×2, io-tracker, clinical-calculator (qSOFA), protocol-reference (sepsis), shift-assessment |
| encounter-002 | STEMI arrest — shockable rhythm, post-ROSC care, cath lab prep | critical | protocol-reference (ACLS), drug-reference ×2, clinical-calculator (GCS), shift-assessment, shift-report, unit-conversion |
| encounter-003 | Acute ischemic stroke — tPA candidacy, time-sensitive decision | critical | protocol-reference (stroke), drug-reference (tPA), clinical-calculator (NIHSS, GCS), shift-assessment, shift-report |
| encounter-004 | Respiratory failure RSI — emergent intubation, post-intubation | critical | protocol-reference (RSI), drug-reference ×2, unit-conversion, clinical-calculator (GCS), shift-assessment, shift-report, io-tracker |
| encounter-005 | Pneumonia med-surg — lower acuity, standard floor assessment | moderate | drug-reference, shift-assessment, io-tracker, clinical-calculator (CURB-65), shift-report |
| encounter-006 | ICU long-stay skin integrity — pressure injury prevention | moderate | clinical-calculator (Braden), shift-assessment ×2, drug-reference, shift-report, unit-conversion, io-tracker |
| encounter-007 | Post-op DVT workup — anticoagulation, Wells scoring | moderate | clinical-calculator (Wells DVT), drug-reference ×2, shift-assessment, shift-report, unit-conversion |
| encounter-008 | Medication reconciliation, unknown drug, polypharmacy — 83F syncopal fall | moderate | drug-reference ×3, shift-report, shift-assessment |
| encounter-009 | Rapid response — deteriorating floor patient, activation criteria | critical | protocol-reference (rapid response), shift-assessment, clinical-calculator (RASS, CPOT), drug-reference, shift-report |
| encounter-010 | ICU drip math — dobutamine and heparin, CHF wean | moderate | unit-conversion ×3, io-tracker, drug-reference, shift-report |
| encounter-011 | DKA — insulin drip, potassium replacement, aggressive resuscitation | critical | unit-conversion, drug-reference, io-tracker, clinical-calculator (APACHE II), shift-assessment, shift-report |
| encounter-012 | Hypertensive emergency — nicardipine drip, encephalopathy, stroke workup | critical | unit-conversion (MAP), drug-reference, clinical-calculator (GCS), protocol-reference (stroke/rapid response), shift-assessment, shift-report |
| encounter-013 | Out-of-scope edge cases — diagnostic questions, prescribing requests, unknown drug | moderate | drug-reference ×2, protocol-reference, clinical-calculator, shift-assessment |
| encounter-014 | ARDS with paralytic — cisatracurium, ARDSnet, prone positioning, sedation | critical | unit-conversion, drug-reference ×2, clinical-calculator (RASS, CPOT), shift-assessment, shift-report |

---

## Legacy Per-Skill Scenarios

Isolated single-skill scenarios. Superseded by encounter format but retained for edge case coverage. New tests go in `encounters/`.

### Protocol Reference (12)

| ID | Description | Severity |
|----|-------------|----------|
| acls-001 | VF arrest — shockable rhythm, cycle 2, IO access | critical |
| acls-002 | PEA arrest — reversible causes (H's and T's), IO access | critical |
| acls-003 | Bradycardia — symptomatic, unstable, TCP/atropine sequence | critical |
| acls-004 | SVT — vagal maneuvers, adenosine, synchronized cardioversion | critical |
| sepsis-001 | Sepsis bundle — early recognition, cultures before antibiotics | critical |
| sepsis-002 | Septic shock — vasopressor initiation, lactate reassessment | critical |
| stroke-001 | Acute ischemic stroke — tPA window, eligibility checklist | critical |
| stroke-002 | Hemorrhagic stroke — anticoagulation reversal, BP targets | critical |
| rsi-001 | RSI — medications sequence, pre-oxygenation, ETT confirmation | critical |
| rsi-002 | RSI with difficult airway — video laryngoscopy, surgical airway backup | critical |
| rapid-001 | Rapid response activation — criteria, calling it, handoff | moderate |
| rapid-002 | RRT follow-up — post-event documentation, escalation decision | moderate |

### Drug Reference (6)

| ID | Description | Severity |
|----|-------------|----------|
| drug-001 | Epinephrine — cardiac arrest dose vs anaphylaxis dose disambiguation | critical |
| drug-002 | High-alert heparin — drip vs subQ, weight-based protocol, PTT monitoring | critical |
| drug-003 | Vancomycin — trough monitoring, renal dosing, red man syndrome | moderate |
| drug-004 | Diltiazem — rate control vs cardioversion context, contraindications | moderate |
| drug-005 | Insulin lispro — sliding scale vs basal-bolus, hypoglycemia protocol | moderate |
| drug-006 | Potassium chloride IV — peripheral limits, rate restrictions, monitoring | critical |

### Clinical Calculator (6)

| ID | Description | Severity |
|----|-------------|----------|
| calc-001 | GCS — low-scoring trauma patient, motor-only response | critical |
| calc-002 | APACHE II — full ICU admission scoring | moderate |
| calc-003 | qSOFA + SOFA — sepsis screening in MICU patient | critical |
| calc-004 | RASS — mechanically ventilated patient, sedation titration | moderate |
| calc-005 | CPOT — non-verbal intubated patient pain assessment | moderate |
| calc-006 | Wells DVT — pre-test probability, clinical decision point | moderate |

### Shift Assessment (3)

| ID | Description | Severity |
|----|-------------|----------|
| assess-001 | Standard MICU admission assessment — full head-to-toe | moderate |
| assess-002 | Rapid neurological deterioration — compressed focused assessment | critical |
| assess-003 | Post-procedure assessment — post-central line placement | moderate |

### Shift Report (3)

| ID | Description | Severity |
|----|-------------|----------|
| report-001 | MICU shift change — multi-system complex patient | moderate |
| report-002 | Rapid response follow-up handoff — event summary included | critical |
| report-003 | Discharge handoff — step-down transfer report | low |

### I/O Tracker (3)

| ID | Description | Severity |
|----|-------------|----------|
| io-001 | Post-op fluid balance — 12-hour window, multiple inputs/outputs | moderate |
| io-002 | Sepsis resuscitation — aggressive fluid, tracking bolus vs maintenance | critical |
| io-003 | CHF strict I&O — goal negative balance, diuresis monitoring | moderate |

### Unit Conversion (3)

| ID | Description | Severity |
|----|-------------|----------|
| unit-001 | Vasopressor weight-based drip rate — norepinephrine mcg/kg/min to mL/hr | critical |
| unit-002 | Dose conversion — oral to IV equivalence, mg to mcg/kg/hr | moderate |
| unit-003 | Temperature and weight conversion — mixed-units patient scenario | low |

---

## Coverage Summary

| Domain | Scenarios | Target | Status |
|--------|-----------|--------|--------|
| Protocol-reference (ACLS, sepsis, stroke, RSI, rapid response) | 12 legacy + encounters 001–005, 009, 012 | 10 | ✅ exceeded |
| Clinical-calculator | 6 legacy + in every encounter | 8 | ✅ exceeded |
| Drug-reference | 6 legacy + all encounters | 5 | ✅ exceeded |
| Shift-assessment/report | 6 legacy + all encounters | 5 | ✅ exceeded |
| Unit-conversion / io-tracker | 6 legacy + encounters 004, 006, 007, 010, 011, 012, 014 | 5 | ✅ exceeded |
| Cross-skill (multi-domain) | 14 encounters × 5–8 skills each | 5 | ✅ exceeded |
| Edge cases (unknown drugs, missing data, out-of-scope) | encounter-008, encounter-013 | 4 | ✅ covered |
| Graceful failure / scope boundary | encounter-013 | — | ✅ new |
| Paralytic / complex sedation | encounter-014 | — | ✅ new |

---

## Severity Distribution

- **Critical**: 24 scenarios (safety-gating — must pass before any skill prompt change ships)
- **Moderate**: 22 scenarios
- **Low**: 4 scenarios

---

## How to Use This Manifest

1. **Before any skill prompt change**: run all `critical` scenarios for the affected skill.
2. **Before a release**: run all scenarios for skills that changed.
3. **New production errors**: add a new encounter immediately, set `severity: critical`.
4. **Scenario authoring**: use `encounters/encounter-001-urosepsis.yaml` as the canonical template.
