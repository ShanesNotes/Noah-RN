# Noah RN — Known Limitations

## Patient Population

| Limitation | Rationale |
|-----------|-----------|
| Adult patients only | Calculators (GCS, APACHE II, etc.) use adult-validated scoring criteria. Pediatric/neonatal/obstetric weights, normals, and thresholds differ enough to require separate implementations. |
| Hospital/acute care only | Protocols assume ICU, ED, or med-surg context. Outpatient, home health, and long-term care have different workflows, personnel, and intervention thresholds. |

## Clinical Scope

| Limitation | Rationale |
|-----------|-----------|
| 5 protocols only (ACLS, sepsis, stroke, rapid response, RSI) | Scope-locked to universal acute care. Surgical, oncology, cath lab, transplant, and specialty protocols require facility-specific customization outside current phase. |
| Drug reference = FDA labeling via OpenFDA only | API coverage. No off-label guidance, compounding, or investigational drugs — none are in FDA labeling by definition. |
| Single-source drug interaction checking | OpenFDA is the available deterministic source. Any single database misses up to 44% of clinically significant interactions. Always verify with pharmacy for high-stakes decisions. |
| Calculators use published scoring criteria only | Facility-modified scores (e.g., modified Braden, custom RASS protocol) are not modeled. No local config mechanism yet. |
| No imaging, waveform, or monitoring integration | Out of scope by architecture. Text-only I/O; image analysis would break CDS exemption (see REGULATORY.md). |

## Data & Privacy

| Limitation | Rationale |
|-----------|-----------|
| No PHI handling, storage, or logging | By design. Architectural constraint, not a gap. Nurse provides verbal context; nothing persists. |
| No session persistence | Stateless by design. Each interaction is independent; no cross-session patient tracking. |
| No production/runtime EHR integration | Hard constraint. Noah does not connect to live EHRs in production. A local dev-only FHIR validation harness exists for build-time testing and demo loading. |

## Technical

| Limitation | Rationale |
|-----------|-----------|
| Requires Claude Code runtime | Skills are prompt-based and non-functional without Claude Code. Not a standalone application. |
| Drug lookup requires network (OpenFDA API) | External API dependency. No offline cache implemented. See DEGRADATION.md for fallback. |
| Output quality is model-dependent | Prompt behavior may shift across model versions. Re-run golden test suite after any model update before clinical use. |
| Calculators work offline; skills do not | Calculators are standalone bash scripts. Skills require the model for synthesis and reasoning. |

## Safety

| Limitation | Rationale |
|-----------|-----------|
| All outputs require nurse review | HITL Category II by design. Noah is a clipboard, not a clinician. |
| Confidence calibration is heuristic | Tier labels (1/2/3) are prompt-driven, not statistically validated against outcome data. |
| Completeness checklists are prompt instructions | Only Tier 1 hooks are programmatically enforced. Checklist adherence in skills depends on model compliance. |
| LLM outputs may hallucinate | Deterministic tools (calculators, drug lookup) do not. Generative skill output always requires clinical judgment. |

## Known Gaps (Future Phases)

| Gap | Status |
|-----|--------|
| Cross-institutional protocol support | Requires local config mechanism — not built yet. |
| Voice input/output | Not planned for current phase. |
| Multi-language support | English only. No localization infrastructure. |
| Adversarial testing / red-teaming | Not completed. Golden test suite covers expected use, not adversarial inputs. |
| Automated golden test suite | Currently manually validated. Automation planned. |
| No AllergyIntolerance resources in the MIMIC demo | The imported demo does not provide allergy data, so allergy-driven CDS cannot be exercised end-to-end. |
| No Braden/fall-risk/wound/restraint/nursing-assessment scale data in the FHIR demo | Those nursing assessment scales are not represented in the conversion. |
| No clinical notes in the FHIR conversion | The FHIR demo is structured-data only; narrative notes are not included. |
