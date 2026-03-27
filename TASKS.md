# Noah RN — Tasks

## Current Phase
Phase 1 complete. Review fixes applied. Phase 2 (Tools + Intelligence) next per ARCHITECTURE.md.

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
- [ ] **ISMP high-alert list gaps** — Missing: D50, pancuronium, sulfonylureas, intrathecal meds, IV sodium phosphate.
- [ ] **OpenFDA query logic** — `+` in the search may be AND not OR. Tests pass but verify the query semantics are correct.
- [x] **Shift-report LINES & ACCESS duplicates ASSESSMENT system 12** — Added dedup instruction. *(fixed 2026-03-27)*
- [ ] **Tool path is relative** — `tools/drug-lookup/lookup.sh` in drug-reference SKILL.md breaks if CWD isn't repo root.
- [ ] **Test suite requires live network** — test_lookup.sh has no offline mode. Document the dependency at minimum.

### Nitpick
- [ ] **Sepsis fluids trigger** — SSC says lactate ≥2 warrants consideration, spec says ≥4. Clarify with Shane.
- [x] **ARCHITECTURE.md naming mismatch** — Fixed protocol-checklist → protocol-reference. *(fixed 2026-03-27)*
- [ ] **test_lookup.sh arithmetic pattern** — Replace `((PASS++)) || true` with `PASS=$((PASS + 1))`.

## Codex Integration
- [x] **Fix Codex MCP filesystem scope** — Fixed. Launcher symlinks auth.json, local config.toml, filesystem MCP points to noah-rn. *(fixed 2026-03-27)*

## Phase 2 Queue (from ARCHITECTURE.md)
- [ ] Clinical calculators (GCS, NIHSS, APACHE II, Wells, CURB-65, Braden, RASS, CPOT)
- [ ] Unit conversion tool (weight-based dosing, drip rate calculations, I&O totals)
- [ ] Agent routing — dispatch skill for nursing context
- [ ] Cross-skill awareness (assessment findings trigger relevant protocol suggestions)
