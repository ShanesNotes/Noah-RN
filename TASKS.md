# Noah RN — Tasks

## Current Phase
Phase 2 complete. Phase 3 (Polish + Portfolio) next.

## Review Backlog (from Phase 0+1 code review, 2026-03-26)

### Critical — must fix before portfolio-ready
- [x] **Command injection in lookup.sh** — URL-encode via jq @uri. *(Claude — fixed 2026-03-27)*
- [x] **Malformed JSON in lookup.sh error path** — Build error JSON via jq --arg. *(Claude — fixed 2026-03-27)*
- [x] **lookup.sh exits 0 on all errors** — exit 1 for input/no-match, exit 2 for API. *(Claude — fixed 2026-03-27)*
- [x] **Default code-blue → VF/pVT bias** — Now presents BOTH arrest algorithms. *(Codex — fixed 2026-03-27)*
- [x] **Amiodarone in stable wide irregular tachy** — Removed, marked expert-consult-only. *(Codex — fixed 2026-03-27)*
- [x] **Hold threshold fabrication risk** — Removed hardcoded thresholds from example. *(Codex — fixed 2026-03-27)*

### Warning — should fix
- [x] **ACLS TTM outdated** — Updated to prevent fever ≤37.5°C (post-TTM2). *(fixed 2026-03-27)*
- [x] **ACLS bradycardia threshold** — Fixed HR <50 → <60. *(fixed 2026-03-27)*
- [x] **RSI ETT size notation** — Fixed "F" → "mm". *(fixed 2026-03-27)*
- [x] **RSI propofol dose inconsistency** — Narrative now says 1.5 mg/kg (range 1-2). *(fixed 2026-03-27)*
- [x] **Stroke tPA exclusion list incomplete** — Added DOACs, LMWH, prior ICH, AVM. *(fixed 2026-03-27)*
- [x] **ISMP high-alert list gaps** — Added pancuronium, D50/D10W, sulfonylureas, intrathecal meds, IV sodium phosphate. *(fixed 2026-03-27)*
- [x] **OpenFDA query logic** — Verified: grouped `+` behaves as OR. Switched to explicit OR for clarity. *(fixed 2026-03-27)*
- [x] **Shift-report LINES & ACCESS duplicates ASSESSMENT system 12** — Added dedup instruction. *(fixed 2026-03-27)*
- [x] **Tool path is relative** — Now resolves via `git rev-parse --show-toplevel`. *(fixed 2026-03-27)*
- [x] **Test suite requires live network** — Documented dependency in test header. *(fixed 2026-03-27)*

### Nitpick
- [x] **Sepsis fluids trigger** — SSC 2021 lactate >= 2 for reassessment. Current phrasing ('lactic > 2ish') confirmed correct bedside guidance. Reviewed 2026-03-30.
- [x] **ARCHITECTURE.md naming mismatch** — Fixed protocol-checklist → protocol-reference. *(fixed 2026-03-27)*
- [x] **test_lookup.sh arithmetic pattern** — Minor style issue; left as-is. `((PASS++)) || true` is functionally correct.

## Codex Integration
- [x] **Fix Codex MCP filesystem scope** — Fixed. Launcher symlinks auth.json, local config.toml, filesystem MCP points to noah-rn. *(fixed 2026-03-27)*

## Phase 2 Progress
- [x] Clinical calculators — 9 tools (added Wells DVT) + unified skill + 309 tests *(2026-03-27)*
- [x] I&O tracker skill — free-text parsing, categorization, dual-mode *(2026-03-27)*
- [x] Unit conversion tool — dose, drip, unit subcommands + 99 tests *(2026-03-29)*
- [x] Agent routing — clinical-router agent with cross-skill awareness *(2026-03-29)*
- [x] Cross-skill awareness — trigger rules + router integration *(2026-03-29)*
- [x] Skill metadata schema — all 8 skills enriched with full frontmatter *(2026-03-29)*
- [x] Four-layer output format — all skills updated *(2026-03-29)*
- [x] Knowledge provenance — 5 protocol files with YAML headers + FRESHNESS.md *(2026-03-29)*
- [x] Tier 1 safety hooks — 4 deterministic hooks + 42 tests *(2026-03-29)*
- [x] Documentation — DEGRADATION.md, REGULATORY.md, LIMITATIONS.md *(2026-03-29)*
- [x] ARCHITECTURE.md updated for Phase 2 *(2026-03-29)*

## Architectural Decisions

### Tier 2 Hooks — Converted to Prompt Instructions *(2026-03-29)*

- **Decision**: Tier 2 context-aware hooks (specified in Phase 2 PRD) were converted to prompt
  instructions rather than implemented as shell hook scripts.
- **Why**: Deterministic shell cannot evaluate clinical context (e.g., "is this finding clinically
  significant given the patient's current state?"). LLM prompt logic handles Tier 2 better than
  bash conditionals. Right-sizing analysis confirmed prompt instructions are sufficient for this layer.
- **Where**: Implemented across:
  - `plugin/agents/clinical-router.md` — cross-skill trigger suggestions surfaced as Tier 2
  - All 8 skill `SKILL.md` files — Tier 2 confidence labeling on bedside guidance
  - `knowledge/templates/four-layer-output.md` — output contract requiring Tier 2 labels
  - `knowledge/templates/cross-skill-triggers.md` — trigger rules with Tier 2 suggestion cap
- **See also**: `docs/ARCHITECTURE.md` PRD Right-Sizing Decisions table.
