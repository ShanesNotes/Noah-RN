# `noah-guardrails`

Responsibility:
- enforce Noah RN runtime discipline at the Pi bridge layer

Current capabilities:
- injects pre-turn guardrail reminders for likely Noah RN workflows
- warns when a likely patient-bound workflow lacks an explicit or active patient
- blocks raw `bash` access to Noah deterministic tools when Pi-native wrapper tools exist

Primary rules:
- prefer `noah_*` tools over direct shell invocation
- do not do calculator/conversion math in-model when deterministic Noah tools exist
- require patient identity discipline for patient-bound workflows

This extension is not a second clinical policy layer. It only protects the Noah RN harness boundaries already defined in `packages/workflows/`, `tools/`, and `services/clinical-mcp/`.
