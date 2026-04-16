# Clinician Dashboard Review — 2026-04-16

## Scope
Read-only review of `apps/clinician-dashboard` against `docs/plans/meta-harness-observability-dashboard-plan.md` Phase 4 intent.

## Confirmed strengths
- 6-tab shell is landed and matches the approved Phase 4 taxonomy.
- `App.tsx` includes correct tab semantics and keyboard navigation.
- Error boundaries isolate each panel.
- Dashboard fetch pipeline is coherent: built static JSON artifacts feed panel fetchers.
- `src/types.ts` covers the intended telemetry envelope shape.

## Findings promoted into execution

### Fixed / should remain fixed
1. **Explicit Tabler dependency**
   - `@tabler/icons-react` must be declared directly in `apps/clinician-dashboard/package.json`.
2. **No hardcoded OAuth fallback secrets**
   - `src/fhir/client.ts` must require `VITE_FHIR_CLIENT_ID` and `VITE_FHIR_CLIENT_SECRET`.
   - No fallback literals belong in source.
3. **Golden suite missing-index behavior must fail loudly**
   - Missing `golden-suite-index.json` should surface an operator-visible alert.
   - Trace-derived fallback is acceptable only when the golden index exists but is empty.
4. **Remove dead components**
   - `EvalDashboard.tsx`, `TerminalPanel.tsx`, and `SkillPanel.tsx` are legacy scaffolds and should not remain as unwired shadows.
5. **Consolidate timestamp parsing**
   - Shared filename timestamp parsing belongs in one utility, not duplicated across panels.

## Remaining architecture guidance
- Prefer landing richer real trace envelopes before another major UI expansion pass.
- Current local `useEffect` + fetch pattern is acceptable until data volume justifies caching.
- Add integration coverage for:
  - 6-tab shell keyboard navigation
  - missing eval index handling
  - trace summary rendering from fixture traces
- Keep the dashboard positioned as the observability sidecar, not the clinical chart.

## Verification checklist
- `npm run build --workspace apps/clinician-dashboard`
- `npm run build --workspace apps/nursing-station`
- `rg -n "be4fd047|3c3c4c3a-2993-424c-b46d-f58db0d7ca14" apps/clinician-dashboard`
- Confirm missing golden suite index now renders an alert instead of fabricated cases
- Confirm no remaining references to deleted legacy components
