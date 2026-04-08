# Noah RN — Active Task Dashboard

> **This is the clean dashboard.** Start here every session. Update as you go.
> Last updated: 2026-04-08
>
> **Reading order for a fresh chat context:**
> 1. This file (TASKS.md) — what's active, what's next
> 2. `docs/PHASED-ROADMAP.md` — where we are in the 8 broad categories
> 3. `docs/local/STRATEGIC-CONTEXT.md` — strategic overlay (LOCAL ONLY, dual-target details)
> 4. `notes/noah-rn-strategic-agent-briefing.md` — source of truth for strategic decisions (LOCAL ONLY)
> 5. `docs/PENDING-WORK.md` — interview seed library for /deep-interview on a new branch

---

## Current State (2026-04-08)

- **Project stage:** Phase 3 (Polish + Portfolio) complete; transitioning to Phase 4 (Dual-Target Runtime + Vector B/C/D work)
- **Strategic framing:** Dual-target runtime (sandbox + production) after April 8 strategic briefing. See `docs/local/STRATEGIC-CONTEXT.md`.
- **Current runtime:** Claude Code plugin (dev harness, stays in place)
- **Sandbox target:** NemoClaw (wrapping OpenClaw) for testing, eval, red-teaming
- **Production target:** Future persistent agent platform (details LOCAL ONLY)
- **Clinical data status:** MIMIC-IV demo partially loaded into Medplum on tower (10.0.0.184:8103); real-time vitals not yet wired
- **Repository state:** Several uncommitted working-tree files from the last three sessions — see `git status` at end of file

---

## 🔥 Active (pick one, start here)

These are the 3 highest-leverage next actions. Pick ONE per session, complete it fully, then come back.

### A1. Sandbox portability prototype (4 hours) 🎯 HIGHEST LEVERAGE
**Category:** Cat. 1 — Dual-Target Runtime Portability
**What:** The 6-step experiment from `notes/noah-rn-strategic-agent-briefing.md` §2.2. Install NemoClaw at pinned SHA, copy ONE SKILL.md file, configure ONE MCP tool, register ONE bash hook, send a test clinical prompt via API, verify SKILL activation + MCP call + hook fire.
**Why now:** Single highest-leverage 4 hours in the entire project. Determines whether Cat. 1 is a real 5-6 week project or whether to re-evaluate the sandbox strategy. Go/no-go gate.
**Success criteria:**
- [ ] SKILL.md loads and activates without YAML modification
- [ ] MCP tool returns patient context data
- [ ] Bash hook fires and can block unsafe output (exit code 2)
- [ ] No modifications to existing artifacts beyond config files
**If it fails:** Evaluate Hermes Agent as alternative runtime (4 more hours, same test).
**/deep-interview seed:** No — this is execution, not requirements gathering. Just do it.

### A2. Encounter-scoped context assembly contract (1 week)
**Category:** Cat. 3 — Context Architecture
**What:** Define the stable interface `get_patient_context(patient_id) → structured context bundle` and implement it against MIMIC-IV data in Medplum. Includes category-tagged token counting (fhir_resource / rag_chunk / system_prompt / conversation_history / tool_result / tool_definitions).
**Why now:** This is the Vervaeke "optimal grip" problem made concrete. It's the primary design surface per the North Star. It blocks Cat. 2 (Eval) and Cat. 5 (Memory) and Cat. 6 (PHI pipeline placement). Can be worked independently of the sandbox prototype.
**Success criteria:**
- [ ] MCP tool `get_patient_context` has stable interface regardless of underlying assembly logic
- [ ] Returns timeline-ordered, trend-computed, gap-annotated context bundle
- [ ] Per-skill context profiles defined (what does each skill need from the encounter?)
- [ ] Token category counts tagged at assembly time
- [ ] Works against at least one real MIMIC-IV encounter
**/deep-interview seed:** Use path #2 from PENDING-WORK.md ("Encounter-Scoped Context Architecture").

### A3. Observability instrumentation (2 days)
**Category:** Cat. 7 — Observability & Optimization
**What:** Deploy Langfuse self-hosted via Docker Compose, wrap all LLM calls with `@observe()` decorators, implement category-tagged token counting at context assembly.
**Why now:** You can't improve what you can't measure. The 100:1 input-to-output token ratio and the 10× cache cost difference make this foundational. Should happen BEFORE A2 ideally, so that A2's work is instrumented from day one. It's also the fastest real feedback loop in the entire roadmap.
**Success criteria:**
- [ ] Langfuse running on Docker Compose (PostgreSQL + ClickHouse + Redis + S3)
- [ ] All LLM calls in noah-rn wrapped with `@observe()`
- [ ] Token counts per category visible in Langfuse dashboard
- [ ] Cost per skill invocation visible
- [ ] KV-cache hit rate measurable
**/deep-interview seed:** None needed — this is straightforward deployment work.

---

## ⏭ Up Next (1-3 sessions out)

Ranked roughly in execution order, but dependencies noted. Pick based on what makes sense after the active item completes.

### U1. Sandbox bring-up (full) — after A1 succeeds
**Category:** Cat. 1
**What:** Complete the 8 immediate actions from the strategic briefing §8: install with pinned SHA, create clinical blueprint, map skills, wire MCP, wire hooks, run one golden test, create `build-*.sh`, create handler JSON files, create tool JSON schemas.
**Depends on:** A1 (prototype validates portability assumption)
**Time:** 1 week
**/deep-interview seed:** Path #5 in PENDING-WORK.md ("Clinical Router v2") has overlapping content; new dedicated seed in PENDING-WORK.md (see §"New Work from 2026-04-08")

### U2. Dynamic eval harness (first run against MIMIC-IV) — after A2 + A3
**Category:** Cat. 2 — Data & Eval Foundation
**What:** Run one skill against one MIMIC-IV encounter via the context assembly layer, score the output against a golden rubric, capture the trace in Langfuse. First real eval signal.
**Depends on:** A2 (context assembly contract), A3 (observability)
**Time:** 3-5 days
**/deep-interview seed:** Path #1 in PENDING-WORK.md ("Dynamic Eval Harness & Golden Test Suite")

### U3. PHI de-identification baseline (Presidio + reversible tokenization)
**Category:** Cat. 6 — Safety & Privacy
**What:** Microsoft Presidio with custom `MedicalNERRecognizer`, SNOMED CT clinical allowlist, reversible tokenization for ONE skill (patient summary). Query-time placement.
**Why now:** Blocks any clinical deployment with real patient data. Unblocks mobile distribution (Cat. 8). Can run in parallel with A2/A3.
**Time:** 2 weeks
**/deep-interview seed:** New seed needed — see PENDING-WORK.md "P1: PHI Pipeline Implementation" (added 2026-04-08)

### U4. Custom healthcare PHI patterns for sandbox privacy router
**Category:** Cat. 1 + Cat. 6 intersection
**What:** Extend the sandbox privacy router `operator.yaml` with MRN, ICD-10, FHIR identifiers, LOINC codes, RxNorm IDs, 42 CFR Part 2 indicators, MVA/trauma triggers, indirect identifier heuristics, disease-surname allowlist.
**Depends on:** U1 (sandbox running)
**Time:** 1 week
**/deep-interview seed:** New seed — PENDING-WORK.md "P2: Healthcare PHI Patterns for Sandbox Privacy Router" (added 2026-04-08)

### U5. MIMIC-IV-Note narratives → DocumentReference
**Category:** Cat. 2
**What:** Map MIMIC-IV-Note de-identified H&Ps, progress notes, discharge summaries to Medplum DocumentReference resources linked to existing Encounters.
**Depends on:** Ongoing MIMIC-IV demo load (already in progress)
**Time:** 3-4 days
**/deep-interview seed:** Path #4 in PENDING-WORK.md

---

## 🔒 Blocked / Waiting

### B1. Letta memory integration
**Category:** Cat. 5 — Memory Architecture
**Blocked on:** Sandbox bring-up (U1). Letta integrates more cleanly with OpenClaw than Claude Code; wait until U1 is done to avoid double work.
**Note:** Can still do research/spec work for provider census blackboard architecture while blocked.

### B2. Provider census memory (the novel work)
**Category:** Cat. 5 Layer C
**Blocked on:** B1 (Letta integration), A2 (context assembly), A3 (observability for cognitive load estimation)
**Note:** This is the most publishable contribution in the roadmap. Preserve the blocker chain; don't try to shortcut.

### B3. CDS Hooks service / EHR integration surface
**Category:** Cat. 8
**Blocked on:** Cat. 6 (PHI pipeline) complete, stable product surface chosen
**Note:** Wait for real product surface decision before building this.

### B4. Clinical knowledge graph (SNOMED CT → Neo4j)
**Category:** Cat. 4
**Blocked on:** Not strictly blocked — can start SNOMED CT ICU subset selection research anytime. Full load + hybrid retrieval is a 6-8 week project, depends on context architecture being stable.
**Note:** Lower priority than PHI pipeline and sandbox bring-up.

### B5. Production runtime packaging script
**Category:** Cat. 1 (sub-work item)
**Blocked on:** Target platform being available. The script template is in `notes/noah-rn-strategic-agent-briefing.md` §5 but the target format is forecasted, not published.
**Note:** Do not commit the packaging script to GitHub until target platform is public.

---

## ✅ Recently Completed (for context)

- **2026-04-08:** Gitignored `notes/` and `docs/local/` to protect LOCAL ONLY strategic material
- **2026-04-08:** Category 1 of PHASED-ROADMAP.md rewritten from "Foundation Migration" to "Dual-Target Runtime Portability" after strategic briefing
- **2026-04-08:** Created `docs/local/STRATEGIC-CONTEXT.md` bridge doc reconciling committed docs with strategic briefing
- **2026-04-07:** Created `docs/PHASED-ROADMAP.md` — 8 broad categories synthesized from 6 Opus PRD docs
- **2026-04-05:** Created `docs/PENDING-WORK.md` — 25 exploration paths with interview seeds
- **2026-04-05:** README restructured as dual-pillar platform (harness + simulated production environment)
- **2026-04-05:** Medplum wiring complete — MCP server + dashboard retargeted from HAPI to Medplum with OAuth2
- **2026-04-05:** MIMIC-IV demo data load initiated into Medplum (tower)
- **2026-04-01:** NEWS2 calculator + SSC 2026 sepsis bundle update + distillation cross-reference analysis

---

## 🚨 Hard Constraints (never violate)

1. **No Claude models in the sandbox runtime** — OpenClaw ToS violation. Use OpenRouter free-tier (Qwen3-Coder, Gemma-3, Llama-4-Scout, Nemotron) for non-PHI; vLLM or NIM (NOT Ollama) for PHI local.
2. **No PHI without the PHI pipeline** — until Cat. 6 U3 is done, do not send real patient data through any LLM call.
3. **Deterministic bash hooks are irreducible** — they survive every runtime change. Never remove or bypass them.
4. **No clinical calculations from LLM** — scores, doses, conversions are ALWAYS tool calls. LLM orchestrates; tools produce numbers.
5. **Strategic/platform-specific details stay LOCAL ONLY** — `notes/` and `docs/local/` are gitignored. Never commit Conway/target-platform specifics to GitHub.
6. **Every artifact must be dual-target portable** — if a design choice couples to one runtime, redesign until it works in both.
7. **No autonomous order entry or diagnostic conclusions** — HITL validation tiers enforced: auto-accept / provider-confirm / hard-block.
8. **Four-layer output format mandatory** — Summary / Evidence / Confidence / Provenance on every skill output.
9. **Landlock hard_requirement in the sandbox** — never silent fallback. L7 enforcement `enforce`, never `audit`.
10. **Pin NemoClaw to commit SHA** — never `latest`. Document pin in `infrastructure/nemoclaw/PINNED-VERSION`.

---

## 📂 Uncommitted Working-Tree Files

As of 2026-04-08 (before this session's edits), these were uncommitted:

```
 M .gitignore                                           (added notes/ and docs/local/ this session)
 M research/youtube/index.json                          (new Claude Mythos report from 2026-04-05)
 M tools/youtube-poll/processed.json
?? docs/PENDING-WORK.md                                 (April 5, still uncommitted)
?? docs/PHASED-ROADMAP.md                               (April 7, still uncommitted)
?? research/Medplum-data-enrichment.txt                 (from earlier)
?? research/youtube/2026-04-01-claude-mythos-changes-everything.md  (April 5)
?? research/youtube/2026-04-05-your-agent-produces-at-100x.md       (recent)
```

**This session adds:**
```
?? docs/TASKS.md                                        (this file)
?? docs/local/STRATEGIC-CONTEXT.md                      (gitignored)
   + updates to docs/PHASED-ROADMAP.md Cat. 1           (rewritten)
   + updates to docs/PENDING-WORK.md                    (new seeds)
```

**Commit recommendation when you're ready:** batch these into logical commits — one for the YouTube report + index update, one for the docs (PENDING-WORK, PHASED-ROADMAP, TASKS), one for .gitignore. The `docs/local/` directory and `notes/` are gitignored and won't appear in commits.

---

## 💭 How to Use This Dashboard

- **Start of session:** Read the Active section. Pick ONE item. Do not jump between active items.
- **During session:** Check off sub-items as you go. Update the status line if blocked.
- **End of session:** Move completed items to "Recently Completed." Promote Up-Next items to Active if appropriate. Update blockers if new dependencies surface.
- **When starting a new work branch:** Grab the `/deep-interview` seed from the relevant Active or Up-Next item. If no seed exists, write one here FIRST, then run /deep-interview with it.
- **When the strategic ground shifts:** Update `docs/local/STRATEGIC-CONTEXT.md` first, then reflect changes in the public docs (TASKS.md, PHASED-ROADMAP.md, PENDING-WORK.md).
