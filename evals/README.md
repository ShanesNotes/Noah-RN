# Evals

This directory is the **meta-harness center** for Noah RN. Authoritative workflow contracts live in `packages/workflows/`; this surface is where those workflows are exercised, scored, and regressed.

Use this surface for:
- trace corpora
- candidate diffs and reviews
- eval harness artifacts
- score outputs

Related boundaries:
- `packages/workflows/` — authoritative workflow contracts
- `services/clinical-mcp/` — agent-facing context boundary (produces patient context used in traces)
- `services/sim-harness/` — Clinical Sim Harness (live L0 physiology via Pulse); supplies simulated encounters for workflow evals
- `tools/trace/` — trace tooling
