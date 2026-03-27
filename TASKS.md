# Noah RN — Tasks

## Current Phase
Phase 1 complete. Phase 2 (Tools + Intelligence) next per ARCHITECTURE.md.

## Review Backlog (from Phase 0+1 code review, 2026-03-26)

### Critical — must fix before portfolio-ready
- [ ] **Command injection in lookup.sh** — URL-encode drug name input (currently only handles spaces via sed). Use `jq -rn --arg d "$1" '$d|@uri'` or equivalent.
- [ ] **Malformed JSON in lookup.sh error path** — Drug names with quotes/backslashes break the error JSON at line 42. Use jq to construct error JSON safely.
- [ ] **lookup.sh exits 0 on all errors** — API failures and no-match should exit non-zero so callers can distinguish success from structured error.

### Warning — should fix
- [ ] **ACLS TTM outdated** — acls.md:76 says 32-36°C. Post-TTM2 trial guidance: prevent fever >37.5°C. Validate with Shane's clinical judgment.
- [ ] **ACLS bradycardia threshold** — acls.md:34 says HR <50. AHA defines symptomatic bradycardia as HR <60 with symptoms. Shane to confirm.
- [ ] **RSI ETT size notation** — rsi.md:11 says "7.0-7.5F" — F reads as French gauge. Should be mm ID. Fix: "7.0-7.5 (F), 7.5-8.0 (M)".
- [ ] **RSI propofol dose inconsistency** — Narrative says 1-2 mg/kg, weight table uses 1.5 mg/kg. Pick one.
- [ ] **Stroke tPA exclusion list incomplete** — Missing: DOACs within 48h, prior ICH, known AVM/aneurysm, current LMWH within 24h.
- [ ] **ISMP high-alert list gaps** — Missing: D50, pancuronium, sulfonylureas, intrathecal meds, IV sodium phosphate.
- [ ] **OpenFDA query logic** — `+` in the search may be AND not OR. Tests pass but verify the query semantics are correct.
- [ ] **Shift-report LINES & ACCESS duplicates ASSESSMENT system 12** — Add dedup instruction to SKILL.md (assessment lists lines, section 4 details what's running through them).
- [ ] **Tool path is relative** — `tools/drug-lookup/lookup.sh` in drug-reference SKILL.md breaks if CWD isn't repo root.
- [ ] **Test suite requires live network** — test_lookup.sh has no offline mode. Document the dependency at minimum.

### Nitpick
- [ ] **Sepsis fluids trigger** — SSC says lactate ≥2 warrants consideration, spec says ≥4. Clarify with Shane.
- [ ] **ARCHITECTURE.md naming mismatch** — Still says "protocol-checklist", skill is "protocol-reference".
- [ ] **test_lookup.sh arithmetic pattern** — Replace `((PASS++)) || true` with `PASS=$((PASS + 1))`.

## Codex Integration
- [ ] **Fix Codex MCP filesystem scope** — Codex filesystem server is scoped to ~/orthodoxphronema. Needs noah-rn added as allowed directory for cross-model reviews to work.

## Phase 2 Queue (from ARCHITECTURE.md)
- [ ] Clinical calculators (GCS, NIHSS, APACHE II, Wells, CURB-65, Braden, RASS, CPOT)
- [ ] Unit conversion tool (weight-based dosing, drip rate calculations, I&O totals)
- [ ] Agent routing — dispatch skill for nursing context
- [ ] Cross-skill awareness (assessment findings trigger relevant protocol suggestions)
