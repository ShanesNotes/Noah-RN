# Session Summary: 2026-04-13 — System Prompt & Skill Promotion

## Agent

Claude Code (local workspace, not the Pi agent on tower).

## Scope

Changes to `.pi/`, `memory/`, and `tools/`. No changes to runtime code, services, packages, apps, or clinical content (except hello-nurse which is a behavioral fork). Codex agent was working concurrently in `services/clinical-mcp/` — no file overlap.

This is a follow-on lane summary, not the full 2026-04-13 `.pi` work log. Earlier shift-report and prompt-promotion work from the same day is captured in `2026-04-13-pi-fundamentals-and-optimization.md`.

---

## 1. `.pi/SYSTEM.md` — Runtime System Prompt

Replaced placeholder stub. This is the system prompt for the Pi agent on tower.

- Ethical preamble in polytonic Greek (Matthew 22:37-39, Hippocratic oath)
- One-line safety: "Use tools for computation. Report gaps, never fill them. Provenance traces to source."
- Skills loaded on demand via `.pi/skills/*/SKILL.md`
- No persona, no routing framework, no output format mandate
- `${toolsList}` and `${guidelines}` template vars for Pi runtime injection

**Gap identified by review**: SYSTEM.md does not instruct the Pi runtime to load `dependencies.yaml` files. The README says dependencies.yaml is authoritative for Pi-native wiring, but the system prompt only points to `SKILL.md`. This is unresolved.

---

## 2. Skill Promotions — 9 skills to `.pi/skills/`

8 promoted this session. shift-report was promoted 2026-04-12 (prior session).

Each promoted skill has:
- `SKILL.md` with `pi:` frontmatter block added to the `packages/workflows/` source
- `dependencies.yaml` declaring tools, extensions, knowledge assets, services, router metadata

**Verbatim copies** (clinical content matches `packages/workflows/` source, only `pi:` frontmatter added):
- unit-conversion
- neuro-calculator
- risk-calculator
- acuity-calculator
- drug-reference
- protocol-reference
- io-tracker

**Behavioral fork** (intentionally rewritten, does NOT sync with packages/workflows/ source):
- hello-nurse — rewritten from canned version dump to personality skill with easter egg (κύριε ἐλέησον → καὶ τῷ πνεύματί σου). Router metadata diverges from clinical-router.md (documented in dependencies.yaml).

**Remaining unpromoted**: shift-assessment

---

## 3. `tools/utf8-smoke-test.sh`

Validates polytonic Greek in SYSTEM.md survives file-read pipelines. 5 checks: 3 string matches, encoding check, byte-level U+1F08 verification. Passes locally. Needs to run on tower.

---

## 4. `memory/README.md`

Five-tier table matching TASKS.md #6: encounter canvas, provider session, provider persistent, longitudinal patient, task-local agent. Placeholder only.

---

## 5. Meta-file Updates

| File | Change |
|------|--------|
| `.pi/README.md` | Rewritten from "scaffold" language to current inventory |
| `.pi/AGENTS.md` | Rewritten to list all 9 promoted skills |
| `.pi/MIGRATION-MAP.md` | Rewritten. Counts 9 promoted, 1 remaining. Notes hello-nurse as behavioral fork. |
| `.pi/skills/SELECTION-BRIDGE.md` | All 9 promotions recorded. Next candidate: shift-assessment |
| `.pi/skills/MIGRATION-MAP.md` | All 9 promotions recorded. hello-nurse marked as behavioral fork. |

---

## 6. `.pi/prompts/codex-task-shift-report-worker.md`

Prompt authored for Codex agent to build Task → DocumentReference → Task completion worker in `services/clinical-mcp/`. Handed off to Codex. Not executed by this agent.

---

## Files Created/Modified

```
.pi/SYSTEM.md                                          (rewritten)
.pi/README.md                                          (rewritten)
.pi/AGENTS.md                                          (rewritten)
.pi/MIGRATION-MAP.md                                   (rewritten)
.pi/skills/SELECTION-BRIDGE.md                         (updated)
.pi/skills/MIGRATION-MAP.md                            (updated)
.pi/skills/unit-conversion/SKILL.md                    (new)
.pi/skills/unit-conversion/dependencies.yaml           (new)
.pi/skills/neuro-calculator/SKILL.md                   (new)
.pi/skills/neuro-calculator/dependencies.yaml          (new)
.pi/skills/risk-calculator/SKILL.md                    (new)
.pi/skills/risk-calculator/dependencies.yaml           (new)
.pi/skills/acuity-calculator/SKILL.md                  (new)
.pi/skills/acuity-calculator/dependencies.yaml         (new)
.pi/skills/drug-reference/SKILL.md                     (new)
.pi/skills/drug-reference/dependencies.yaml            (new)
.pi/skills/protocol-reference/SKILL.md                 (new)
.pi/skills/protocol-reference/dependencies.yaml        (new)
.pi/skills/io-tracker/SKILL.md                         (new)
.pi/skills/io-tracker/dependencies.yaml                (new)
.pi/skills/hello-nurse/SKILL.md                        (new — behavioral fork)
.pi/skills/hello-nurse/dependencies.yaml               (new)
.pi/prompts/codex-task-shift-report-worker.md          (new)
tools/utf8-smoke-test.sh                               (new)
memory/README.md                                       (new)
```

25 files. 19 new, 6 rewritten/updated.

## Known Gaps

- SYSTEM.md does not reference dependencies.yaml — Pi runtime may not load them
- hello-nurse diverges from clinical-router.md router metadata (documented but not reconciled)
- shift-assessment remains unpromoted
