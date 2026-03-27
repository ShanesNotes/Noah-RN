# Phase 2a Design Spec: Clinical Calculators + I&O Tracker

> Approved 2026-03-27. Implementation complete same session.

## Context

Phase 1 delivered 4 production clinical skills + 1 tool (drug-lookup). Phase 2 adds deterministic tools and cross-skill intelligence. This spec covers the first two Phase 2 deliverables: 8 clinical calculator tools with a unified skill, and an I&O tracker skill.

## Design Decisions

- **Full tool coverage for calculators, skill-only for I&O.** Calculators need deterministic scoring (LLMs get APACHE II wrong). I&O is fundamentally free-text parsing -- the "tool" work is just summing.
- **One unified clinical-calculator skill**, individual tool scripts underneath. Nurse says "calculate GCS" or "Braden score" and the skill routes internally.
- **I&O tracker: both modes** -- single dump (all I&O at once) and incremental (add entries within conversation). State lives in conversation context only (no persistence, no PHI).
- **Default dietary estimate with Tier 2 caveat.** ~300mL standard tray, proportional for percentages. Labeled as estimate, nurse can override.

## Deliverables

| Component | Type | Location |
|-----------|------|----------|
| 8 calculator scripts | Tools | `tools/clinical-calculators/*.sh` |
| Shared library | Tool lib | `tools/clinical-calculators/lib/common.sh` |
| 8 test suites | Tests | `tests/clinical-calculators/test_*.sh` |
| Clinical calculator | Skill | `plugin/skills/clinical-calculator/SKILL.md` |
| I&O tracker | Skill | `plugin/skills/io-tracker/SKILL.md` |

## Calculator Tools

All scripts: `set -euo pipefail`, named CLI args, `--help`, JSON output via jq, exit codes 0/1/2.

| Calculator | Inputs | Score Range | Categories |
|-----------|--------|-------------|------------|
| GCS | eye (1-4), verbal (1-5), motor (1-6) | 3-15 | severe/moderate/mild |
| NIHSS | 15 items (1a-11) | 0-42 | no symptoms/minor/moderate/mod-severe/severe |
| APACHE II | 12 physiology + age + chronic + fio2 + arf | 0-71 | low/moderate/high/very high/critical |
| Wells PE | 7 binary criteria | 0-12.5 | low/moderate/high + simplified PE unlikely/likely |
| CURB-65 | 5 binary criteria | 0-5 | low/moderate/high |
| Braden | 6 subscales (friction max=3) | 6-23 | very high risk to no risk (lower=worse) |
| RASS | single score | -5 to +4 | term per score (lookup table) |
| CPOT | 4 subscales (0-2) | 0-8 | no significant pain / significant pain |

## I&O Tracker Skill

Free-text parsing into intake/output categories with totaling and net balance. Handles meal percentages (~300mL standard tray), IV rate x time, blood product standard volumes, CBI net calculations, and ice chip 30% conversion. Incremental mode merges follow-up entries with prior context.

## Test Results

249 assertions across 8 test suites, all passing. All offline (no network dependency).
