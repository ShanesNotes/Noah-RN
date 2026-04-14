# Clinical Simulation Harness Scaffold

> **Status (2026-04-13): historical. Superseded.**
>
> This document predated the agent-native architecture lane. Its 7-layer scaffold (Layers 0–6) conflated implementation topology with truth/projection semantics. The scaffold-salvage audit classified it **REWRITE** for that reason.
>
> The canonical simulation architecture is now defined by:
>
> - `docs/foundations/invariant-kernel-simulation-architecture.md` — 8 kernel invariants
> - `docs/foundations/foundational-contracts-simulation-architecture.md` — 9 contracts (Patient Truth, Projections, Clock, Monitor/Alarm, Charting, Scenario/Intervention, Obligations, Eval/Trace, Research-Hook)
>
> Supporting artifacts:
>
> - `docs/foundations/scaffold-salvage-audit-simulation.md` — classification of the original scaffold surfaces
> - `docs/foundations/brownfield-mapping-simulation-architecture.md` — move/rewrite/retire map
> - `docs/foundations/contract-consistency-review-simulation-architecture.md` — amendment backlog (applied 2026-04-13)
> - `docs/foundations/encounter-validation-simulation-architecture.md` — acceptance scenarios
> - `docs/foundations/execution-packet-simulation-architecture.md` — implementation lanes A–F
> - `docs/foundations/sim-harness-waveform-vision-contract.md` — KEPT; enforces the monitor-as-avatar invariant at L1
>
> The workspace center at `services/sim-harness/` remains the live-runtime boundary inside Clinical Workspace. Agents still never talk to it directly — all access goes through `services/clinical-mcp/`. Everything else in the original document should be read through the lens of the kernel + contracts.
