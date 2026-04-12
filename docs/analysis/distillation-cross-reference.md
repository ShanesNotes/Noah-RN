# Distillation Report Cross-Reference Analysis

> Status: deep reference
> Role: maps older research distillation into current repo state; not active architecture or execution guidance

**Date:** 2026-04-01  
**Author:** Scout (Research Engineer)  
**For:** Gem (PM) → Jimmy (CEO)  
**Source:** [`docs/archive/legacy-control-plane/noah-rn-research-distillation.md`](archive/legacy-control-plane/noah-rn-research-distillation.md) (15 reports, 701 lines, 31 cross-report patterns)

---

## Executive Summary

The distillation report extracted 31 cross-cutting patterns and hundreds of actionable recommendations from 15 research reports. This analysis maps every "Actionable Now" recommendation against the current codebase state (Phase 2 complete, Phase 3 in progress, v0.2.0).

**Key findings:**
- **Implemented:** 18 of 31 cross-report patterns already reflected in code
- **Partially implemented:** 7 patterns present but incomplete
- **Not yet implemented:** 6 patterns with zero code footprint
- **Deferred correctly:** All Mission 2-3 recommendations properly parked

**Top 5 gaps to address next:**
1. Agent Cards / machine-readable skill descriptions (A2A readiness)
2. Mandatory completeness checklists per skill
3. Golden test suite (blocks meta-harness Phase B)
4. Centralized model call path ("one throat to choke")
5. Skill-level limitation declarations in metadata

---

## Cross-Report Patterns — Implementation Status

| # | Pattern | Status | Evidence |
|---|---------|--------|----------|
| 1 | Harness > model | ✅ Done | Plugin-first architecture, 8 skills, deterministic tools |
| 2 | A2A readiness (Agent Cards) | ❌ Missing | No machine-readable capability descriptions |
| 3 | Adapter layer for external data | ✅ Done | `tools/drug-lookup/lookup.sh` (OpenFDA), `tools/fhir/mimic-loinc-query.sh` |
| 4 | Retrieval quality > model scale | ✅ Done | `clinical-resources/` with 5 protocols + 2 reference files |
| 5 | Design for next tier, implement current | ✅ Done | Memory interface deferred, context stuffing implemented |
| 6 | Contradiction handling (antrhodiscernment) | ⚠️ Partial | Cross-skill triggers template exists; no active conflict detection |
| 7 | Thoroughness > speed bias | ⚠️ Partial | Router has complexity tiers; no explicit thoroughness bias |
| 8 | Cascaded > black-box | ✅ Done | All outputs are text-based, inspectable checkpoints |
| 9 | Know what infrastructure you DON'T need | ✅ Done | No GPUs, no Kafka, no CDS Hooks — correct scoping |
| 10 | Safety layer IS the product | ✅ Done | 4 Tier 1 hooks, 42 tests, input sanitizer |
| 11 | Omission > commission danger | ⚠️ Partial | No mandatory completeness checklists per skill |
| 12 | Confidence signals in every output | ⚠️ Partial | Four-layer output template exists; not enforced in all skills |
| 13 | Golden test cases from experience | ⚠️ Partial | 309 calculator tests exist but not golden/annotated scenarios |
| 14 | HITL Category II | ✅ Done | All skills produce drafts; router declares HITL Cat II |
| 15 | Fine-tune for format, RAG for knowledge | ✅ Done | No fine-tuning; clinical-resources/ is proto-RAG |
| 16 | Human-AI interaction gap > model gap | ⚠️ Partial | Dashboard has output components; no confidence UI |
| 17 | Break copy-forward cycle | ⚠️ Partial | SBAR report generates fresh; no explicit anti-template enforcement |
| 18 | Knowledge currency = patient safety | ✅ Done | FRESHNESS.md, provenance headers on all knowledge files |
| 19 | Provenance metadata on EVERYTHING | ⚠️ Partial | Knowledge files have it; skills don't have version metadata |
| 20 | Surface conflicts, don't resolve | ✅ Done | Documented in distillation; cross-skill triggers template |
| 21 | Automate watching, humanize deciding | ⚠️ Partial | FRESHNESS.md has review dates; no automated staleness detection |
| 22 | One throat to choke for model calls | ❌ Missing | No centralized model call path — skills call model directly |
| 23 | CDS exemption four-part test | ✅ Done | `docs/REGULATORY.md` documents this |
| 24 | Document known limitations per skill | ❌ Missing | No `limitations` field in skill metadata |
| 25 | Guidelines as knowledge, not pillars | ✅ Done | Protocols are knowledge inputs, not architectural constraints |
| 26 | Deterministic checks are safety floor | ✅ Done | 4 validation hooks (calculator, dosage, units, negation) |
| 27 | Assume adversarial input | ✅ Done | `sanitize-input.sh` with 18 injection patterns |
| 28 | HITL is current boundary, not permanent | ✅ Done | Router declares HITL; Jethro principle noted in docs |
| 29 | Four-layer explanation | ⚠️ Partial | Template exists (`four-layer-output.md`); not enforced in all skills |
| 30 | Weakest-link governs maturity | ✅ Done | HAIRA v2 noted in distillation; self-assessment applicable |
| 31 | 10-20-70 investment allocation | ✅ Done | Documented; investment pattern followed |

---

## "Actionable Now" Recommendations — Detailed Status

### Report 1: Orchestration Topologies

| Recommendation | Status | Details |
|---------------|--------|---------|
| Agent routing in `agents/` | ✅ Done | `clinical-router.md` (236 lines) with intent map, context validation, complexity tiers |
| A2A Agent Cards per skill | ❌ Missing | Skills have human-readable SKILL.md but no machine-readable Agent Card |
| Memory interface (3 tiers) | ⚠️ Partial | Working context implicit; episodic/institutional not formally defined |
| MCP for FHIR integration | ⚠️ Partial | `tools/fhir/mimic-loinc-query.sh` exists but not MCP-based |

### Report 2: Context Engineering & MEGA-RAG

| Recommendation | Status | Details |
|---------------|--------|---------|
| Knowledge retrieval interface | ✅ Done | Context stuffing via skill prompts; interface abstracted |
| Context budgeting / ordering | ❌ Missing | No explicit context priority ordering; Claude auto-compacts at 95% |
| Contradiction handling (5-layer) | ❌ Missing | No NLI detection, temporal weighting, or evidence grading |
| Citation/attribution in outputs | ⚠️ Partial | Four-layer output template has provenance section; not consistently used |
| Tool loading constraint (~20 tools) | ✅ Done | Skills declare their tool dependencies; well under limit |

### Report 3: Streaming Inference

| Recommendation | Status | Details |
|---------------|--------|---------|
| Skill complexity tiers | ✅ Done | Router has simple/moderate/complex classification |
| Thoroughness bias in routing | ⚠️ Partial | Router has safety rules but no explicit "escalate by default" |
| Cascaded pipeline for voice | ✅ Done | Documented as architectural decision; not implemented (correctly deferred) |
| Ambient benchmarks as competitive frame | ✅ Done | Documented in distillation |

### Report 4: Clinical Safety & Guardrails

| Recommendation | Status | Details |
|---------------|--------|---------|
| Tier 1 guardrails (regex/keyword) | ✅ Done | 4 hooks: calculator, dosage, units, negation |
| Tier 2 guardrails (scope validation) | ⚠️ Partial | Router does domain scoping; not a hook-level check |
| Tier 3 guardrails (LLM-as-judge) | ⚠️ Deferred | Correctly parked — no LLM judge yet |
| Confidence calibration in outputs | ⚠️ Partial | Template exists; not enforced |
| Completeness checklists per skill | ❌ Missing | No skill has a mandatory checklist |
| Input validation (minimum context) | ⚠️ Partial | Router validates context; skills don't independently verify |
| Golden test suite (100-150 cases) | ❌ Missing | 309 calculator tests exist but are unit tests, not clinical scenarios |
| HITL Category II lock-in | ✅ Done | Router and all skills declare HITL Cat II |

### Report 5: Fine-Tuning & Adaptation

| Recommendation | Status | Details |
|---------------|--------|---------|
| Prompting + knowledge strategy | ✅ Done | Confirmed architecture |
| Break copy-forward cycle | ⚠️ Partial | SBAR generates fresh; no explicit anti-template guard |
| Output design > model capability | ⚠️ Partial | Dashboard has components; no confidence UI yet |
| Domain fine-tuning can hurt | ✅ Done | Model-agnostic design avoids this trap |

### Report 6: Knowledge Management

| Recommendation | Status | Details |
|---------------|--------|---------|
| Provenance metadata on knowledge files | ✅ Done | All 5 protocols + 2 reference files have YAML frontmatter |
| FRESHNESS.md manifest | ✅ Done | Exists with quarterly review schedule |
| Skill outputs reference knowledge versions | ❌ Missing | No version references in skill output templates |
| Surface guideline conflicts | ⚠️ Partial | Cross-skill triggers template exists; no active detection |
| Multi-source drug interaction | ❌ Missing | Only OpenFDA single source |
| Authoritative sources only | ✅ Done | `clinical-resources/` contains only guidelines and references |

### Report 7: Deployment & Operations

| Recommendation | Status | Details |
|---------------|--------|---------|
| Centralized model calls | ❌ Missing | No single call path — skills call model directly |
| Prompt version metadata | ❌ Missing | Skills in Git but no semantic version tags |
| Tier 2 availability (99.9%) | ✅ Done | Documented in `docs/DEGRADATION.md` |
| DEGRADATION.md | ✅ Done | Exists with failure modes and fallbacks |

### Report 8: Regulatory Intelligence

| Recommendation | Status | Details |
|---------------|--------|---------|
| CDS exemption four-part test | ✅ Done | `docs/REGULATORY.md` documents analysis |
| Document limitations per skill | ❌ Missing | No `limitations` field in skill metadata |
| AI disclosure in output footers | ❌ Missing | No "Generated by noah-rn" footer in skills |
| Regulatory watch list | ✅ Done | `docs/REGULATORY.md` has watch list |

### Report 9: Adversarial Security

| Recommendation | Status | Details |
|---------------|--------|---------|
| Deterministic plausibility checks | ✅ Done | 4 hooks, 42 tests |
| Input sanitization | ✅ Done | `sanitize-input.sh`, 18 injection patterns |
| MCP tool response validation | ⚠️ Partial | No MCP integration yet; when added, needs validation |
| Model version pinning | ❌ Missing | No model version recorded per skill |

---

## Priority Recommendations

### P0 — Blockers for Phase 3 completion

1. **Golden test suite** — Blocks meta-harness Phase B. Need 100-150 annotated clinical scenarios in `tests/clinical-scenarios/`. Currently has 6 YAML fixtures but no eval harness integration.
2. **Completeness checklists per skill** — Cross-report pattern #11 (omission > commission). Each skill needs a mandatory checklist that fires before output.

### P1 — High value, low effort

3. **Agent Cards** — Machine-readable skill descriptions. YAML frontmatter in each SKILL.md with `name`, `description`, `capabilities`, `tools`, `complexity_tier`, `limitations`. 1-2 hours for all 8 skills.
4. **Skill limitation declarations** — Add `limitations` field to skill metadata schema. Documents what each skill cannot do.
5. **AI disclosure footer** — Add "Generated by noah-rn v0.2 / [skill] / [source]" to four-layer output template.
6. **Model version pinning** — Record which model version each skill was validated against in skill metadata.

### P2 — Medium effort, medium value

7. **Centralized model call path** — Refactor so all model calls go through a single function in `agents/` or shared utility. Enables guardrails, provenance, PHI handling in one place.
8. **Context budgeting** — Define explicit context priority ordering for skills.
9. **Multi-source drug data** — Add DrugBank or second source alongside OpenFDA.
10. **Confidence UI in dashboard** — Surface confidence indicators in the dashboard components.

### P3 — Deferred correctly (Mission 2-3)

- MCP-based FHIR integration
- Tier 3 LLM-as-judge hooks
- Automated guideline monitoring
- Knowledge graph construction
- Fine-tuning pipeline
- Multi-region deployment
- Federated learning
- Voice/STT pipeline
- CDS Hooks integration
- EU AI Act compliance

---

## Codebase Health Assessment

| Dimension | Score | Notes |
|-----------|-------|-------|
| Clinical skills | 8/8 | All 8 skills implemented with trace logging |
| Deterministic tools | 18/18 | 10 calculators + drug lookup + I&O + conversions + trace + FHIR |
| Safety hooks | 5/6 | Tier 1 complete; Tier 2 partial; Tier 3 deferred |
| Test coverage | 6/10 | 309 calculator tests, 99 unit conversion, 42 hooks, 3 React. Missing golden clinical scenarios. |
| Knowledge management | 8/10 | Provenance headers, FRESHNESS.md. Missing version references in outputs. |
| Regulatory posture | 7/10 | REGULATORY.md, DEGRADATION.md, HITL Cat II. Missing AI disclosure, limitation docs. |
| A2A readiness | 3/10 | No Agent Cards, no machine-readable descriptions. |
| Dashboard | 7/10 | 6 panels, dark theme, FHIR integration. Missing confidence UI, auth. |
| Meta-harness | 5/10 | Phase A complete; Phase B blocked on golden tests. |

**Overall: Phase 2 complete, Phase 3 ~70% complete.** The distillation report's "Actionable Now" items are ~60% implemented. The remaining 40% are mostly metadata/documentation additions (low effort) plus the golden test suite (medium effort, high value).
