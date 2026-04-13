# Session Summary: Pi Fundamentals, Skill Promotion & Optimization

**Date:** 2026-04-13
**Agent:** Claude (Opus 4.6 via Claude Code)
**Human:** Shane (project owner, 10+ year ICU nurse)
**Branch:** `refactor/repo-topology-stabilization`
**Scope:** Teaching session → implementation → optimization → stale reference sweep → Gemini task prep

Historical note: later same-day follow-on work promoted additional Pi-native skills and rewrote the system-prompt lane docs. See `2026-04-13-system-prompt-and-skill-promotion.md` for that continuation.

---

## Session Intent

Shane is new to Pi and asked for a fundamentals walkthrough (#1–#4), then asked to implement, optimize, and clean up what was discovered.

---

## Work Completed

### 1. Pi Fundamentals Teaching (no file changes)

Walked through four sequential topics:
1. **Extensions** — How `noah-router`, `medplum-context`, and `noah-clinical-tools` bridge Pi to existing systems
2. **Current Workflows** — Full skill library audit (8 skills), shared CONVENTIONS.md, OPTIMIZATION-STANDARD.md, registry.json
3. **Building a Real Skill** — Shift-report promoted from scaffold to Pi-native
4. **Understanding Prompts** — Three-mode pattern (narrative, patient-ID, unclear), single vs multi-skill vs sequential prompts

### 2. Shift-Report Pi-Native Promotion

**New file created:**
- `.pi/skills/shift-report/dependencies.yaml` — Declarative dependency manifest (extensions, knowledge assets, services, conventions, router metadata)

**Files modified (8):**
- `.pi/skills/shift-report/SKILL.md` — Promoted from stub → full contract with `pi:` frontmatter block (input_modes, extension bindings, router_scope, authoritative_source)
- `.pi/skills/shift-report/README.md` — Rewritten with authority model, dependency summary, execution flow diagram
- `.pi/prompts/shift-handoff.md` — Promoted from stub → real prompt template with 3 modes (narrative, patient-ID, unclear), output contract, safety boundaries
- `.pi/prompts/rapid-assessment.md` — Promoted from stub → multi-skill prompt (shift-assessment + protocol-reference + neuro/risk/acuity-calculator)
- `.pi/prompts/new-admission.md` — Promoted from stub → sequential multi-skill prompt (assessment → handoff → lookups)
- `.pi/prompts/README.md` — Updated with prompt taxonomy, three-mode pattern, runtime connection diagram
- `.pi/SYSTEM.md` — Updated: "first migration target" → "first promoted workflow" with artifact links
- `.pi/AGENTS.md` — Updated: end-to-end Pi-native path, split authority model (clinical content vs Pi wiring)
- `.pi/skills/SELECTION-BRIDGE.md` — Updated: shift-report listed as promoted, next candidates identified
- `.pi/skills/MIGRATION-MAP.md` — Updated: promotion recorded, sync rule documented

**Design decisions:**
- Additive to `packages/workflows/` — no authoritative surfaces touched
- Clear authority split: `packages/workflows/` owns clinical content, `.pi/` owns Pi wiring
- `pi:` frontmatter block integrates into existing SKILL.md YAML without conflict
- Both YAML files (SKILL.md frontmatter + dependencies.yaml) parse cleanly

### 3. Workflow Optimization (5 skills optimized)

Applied OPTIMIZATION-STANDARD.md checklist: removed procedural wrappers ("Receive Input", "Detect Calculator", "Read the nurse's question"), compressed tables, preserved all clinical reference data.

| Skill | Before | After | Saved | Notes |
|-------|--------|-------|-------|-------|
| clinical-calculator | 10,870 | — | — | Split (see below) |
| drug-reference | 8,315 | 5,915 | 2,400 | ✅ Under 6KB moderate budget |
| io-tracker | 9,104 | 5,477 | 3,627 | ✅ Under 6KB moderate budget |
| protocol-reference | 6,417 | 4,782 | 1,635 | ✅ Under 6KB moderate budget |
| unit-conversion | 6,495 | 4,458 | 2,037 | ✅ Reclassified simple→moderate |

**Zero clinical content lost.** All tool invocation syntax, flag thresholds, "why we care" lines, high-alert lists, output format templates, and safety rules preserved exactly.

### 4. Clinical Calculator Split (1 skill → 3 skills)

The monolithic `clinical-calculator` (10 calculators, 310% over simple budget) was split into three skills matching bedside workflow clusters:

| New Skill | Calculators | Clinical Cluster |
|-----------|------------|-----------------|
| `neuro-calculator` | GCS, NIHSS, RASS, CPOT | Neuro check / sedation titration |
| `risk-calculator` | Wells PE/DVT, CURB-65, Braden | Risk screening / prevention |
| `acuity-calculator` | APACHE II, NEWS2 | Severity tracking / early warning |

**Files created (3):**
- `packages/workflows/neuro-calculator/SKILL.md`
- `packages/workflows/risk-calculator/SKILL.md`
- `packages/workflows/acuity-calculator/SKILL.md`

**Files modified for split:**
- `packages/workflows/clinical-calculator/SKILL.md` — Replaced with split-notice redirect
- `packages/workflows/registry.json` — v2: 10 skills, retired section for clinical-calculator
- `packages/agent-harness/workflow-dependencies.json` — v2: three new entries with `split_from` provenance
- `packages/agent-harness/router/clinical-router.md` — Intent map: `score_calculation` → `neuro_scoring`, `risk_scoring`, `acuity_scoring`; supported_skills updated
- `packages/workflows/hello-nurse/SKILL.md` — Skill count 8→10, calculator listing updated
- `packages/workflows/README.md` — Skill list updated + retired section

All three new skills reclassified to `moderate` tier (each carries multi-calculator reference data). All at ✅ under 6KB budget.

### 5. Test Updates

**Files modified (4):**
- `tests/agents/test_workflow_registry_consumer.sh` — Asserts 10 skills + new names
- `tests/agents/test_clinical_router.sh` — Asserts 3 new intents; gracefully skips `status: split` skills; filters retired skills from directory comparison
- `tests/clinical-scenarios/MANIFEST.md` — All 14 encounter rows + 6 legacy calc rows updated to new skill names
- 12 encounter YAML fixtures updated (`skill: clinical-calculator` → appropriate neuro/risk/acuity-calculator)
- 6 legacy per-skill YAML fixtures in `tests/clinical-scenarios/clinical-calculator/` updated

**Files created (1):**
- `tests/skills/acuity-calculator/test_apache2_prompt_contract.sh` — APACHE II contract test pointing to new skill

**File replaced (1):**
- `tests/skills/clinical-calculator/test_apache2_prompt_contract.sh` — Now redirects to acuity-calculator test

**Test results: 97/97 passing, 0 failures across 4 suites.** These four suites validate the registry, router, tools registry, and APACHE II skill contract structurally. They do **not** exercise the Pi prompt surface, encounter YAML fixtures, or legacy per-skill fixtures.

### 6. Stale Reference Sweep (docs, wiki, evals)

**Active docs updated (content changed):**
- `docs/DEMO.md` — Demo commands `/clinical-calculator` → `/neuro-calculator` and `/acuity-calculator`
- `docs/foundations/dashboard-cloud-context.md` — Skill count and list
- `docs/analysis/meta-harness-research-report.md` — 2 skill refs
- `docs/analysis/safety-compliance-report.md` — 1 skill source ref
- `evals/product/proposer-prompt.md` — Skill list 8→10 with new names
- `wiki/concepts/semantic-vs-functional-correctness.md` — Example skill ref
- `wiki/concepts/skill-three-tier-organization.md` — 1 row → 3 rows

**Historical docs annotated (note added, content preserved):**
- `evals/product/prompt-scaffolding-audit.md`
- `evals/product/analysis/failure-modes.md`
- `evals/product/candidates/candidate-1/diff/failure-modes.md`
- `evals/product/candidates/candidate-1/RATIONALE.md`
- `evals/product/reviews/candidate-1-review.md`

**Left as-is (correct decision):**
- `docs/archive/`, `notes/`, `.omc/`, `research/archive/` — Historical snapshots, changing would falsify record
- `research/youtube/` — Refs are to `tools/clinical-calculators/` (tool directory), not the skill
- All trace JSON files — Historical test data
- `tools/clinical-calculators/` refs in extensions — Correct (tool family, not skill)

### 7. Gemini Task Prompt

**File created:**
- `.agents/prompts/gemini-dashboard-redesign.md` — Full task prompt for Gemini 3.1 Pro to redesign the clinician dashboard with pi.dev minimalist aesthetic

**Task scope:** Theme simplification, layout redesign, component-level visual polish, skill list update for calculator split. Explicitly constrains Gemini from touching data fetching, FHIR client, types, or clinical logic.

**Why Gemini:** Visual design intuition, component-level refactoring, aesthetic pattern matching. No cross-file clinical contract dependencies or safety-critical logic.

---

## Invariants Maintained

- `packages/workflows/` remains authoritative for clinical content
- `.pi/` is authoritative only for Pi-native wiring (dependencies.yaml, pi: frontmatter, prompt templates)
- All deterministic tools still called via bash — no model-computed scores/math
- All safety rules, anti-fabrication rules, and Important Rules sections preserved exactly
- No clinical thresholds, flag criteria, or "why we care" lines were modified
- Confidence tier system (Tier 1/2/3) unchanged
- Trace logging protocol unchanged
- Cross-skill trigger rules unchanged

## Test Results

```
test_workflow_registry_consumer.sh     9/9   ✅
test_clinical_router.sh               81/81  ✅
test_tools_registry_consumer.sh        5/5   ✅
test_apache2_prompt_contract.sh        2/2   ✅
────────────────────────────────────────────
Total                                 97/97  ✅
```

**Coverage note:** These four suites validate the registry, router, tools registry, and APACHE II skill contract structurally. They do **not** exercise the Pi prompt surface (`.pi/prompts/*`), the encounter YAML fixtures (`tests/clinical-scenarios/encounters/*`), or the legacy per-skill fixtures (`tests/clinical-scenarios/clinical-calculator/*`). Full scenario-driven validation requires running the encounter corpus against the live agent, which is outside the scope of these structural tests.

## Files Changed Summary

Counts below reflect this session's work only. The branch (`refactor/repo-topology-stabilization`) contains additional unrelated changes not covered by this summary.

| Category | Modified | Created | Notes |
|----------|----------|---------|-------|
| `.pi/` (skills, prompts, system, summaries) | 10 | 2 | Shift-report promotion + prompt wiring |
| `packages/workflows/` | 8 | 3 | 5 optimized, 1 split→3, 1 redirect |
| `packages/agent-harness/` | 3 | 0 | Registry, deps, router |
| `tests/` | 5 + 18 fixtures | 1 | Registry/router/contract tests + encounter/legacy YAML fixtures |
| `docs/` | 5 | 0 | Demo, foundations, analysis |
| `wiki/` | 2 | 0 | Concepts |
| `evals/` | 6 | 0 | Proposer prompt + 5 historical annotations |
| `.agents/prompts/` | 0 | 1 | Gemini dashboard task |

## Recommended Follow-ups

1. **Promote remaining skills to Pi-native** — `neuro-calculator` and `unit-conversion` are clean candidates (moderate tier, deterministic, no service dependencies)
2. **Run Gemini on dashboard redesign** — Prompt is ready at `.agents/prompts/gemini-dashboard-redesign.md`
3. **Memory layer design** — `new-admission.md` prompt references future memory integration for patient continuity across shifts
4. **Consider `complexity_tier` vocabulary update** — The optimization standard's byte budgets assume `simple` means small reference surface, but multi-calculator skills proved that `simple` execution complexity ≠ small reference data. May want to add a `reference_density` field alongside `complexity_tier`.
