# Agent Context

> Repo note: these files live under `.noah-pi-runtime/` in git and mount as `/runtime/.pi` in the isolated lane. Runtime-relative `.pi/...` paths below refer to that mounted surface.

## Canonical sources

- `.pi/SYSTEM.md` — runtime system prompt
- `packages/workflows/*/SKILL.md` — authoritative clinical workflow contracts
- `packages/workflows/*/dependencies.yaml` — Pi-native workflow dependency manifests
- `services/clinical-mcp/` — EHR/chart context and FHIR access boundary
- `services/sim-harness/` — monitor/simulation context substrate
- `clinical-resources/` — curated protocols, reference data, templates
- `memory/` — patient and session memory (placeholder)
- `docs/ARCHITECTURE.md` — system boundary map

## Workflow surface

Current Noah RN clinical workflows resolve from `packages/workflows/`, not `.pi/skills/`.

Active dependency manifests now cover all current workflows:

- **shift-report** — complex, FHIR context via clinical-mcp
- **shift-assessment** — complex narrative → 15-system assessment structure
- **unit-conversion** — moderate, pure bash tool
- **neuro-calculator** — moderate, GCS/NIHSS/RASS/CPOT
- **risk-calculator** — moderate, Wells PE/DVT, CURB-65, Braden
- **acuity-calculator** — moderate, APACHE II, NEWS2
- **drug-reference** — moderate, OpenFDA lookup + high-alert list
- **protocol-reference** — moderate, knowledge-backed protocol lookup
- **io-tracker** — moderate, I&O categorization and net balance
- **hello-nurse** — simple, plugin verification/easter egg

## Content rule

Clinical content stays authoritative in `packages/workflows/`.

Pi-native bridge code lives in `.noah-pi-runtime/`:
- extensions
- runtime system prompt
- project-local Pi docs/prompts

Shared renderer/runtime contracts that the bridge should respect live in `packages/agent-harness/`:
- `packages/agent-harness/shift-report-renderer.mjs` — shared Shift Report renderer and renderer-input contract

Noah RN assembles clinical workspace context from multiple lanes:
- EHR/chart context
- memory
- clinical resources
- patient monitor / simulation context

The bridge now exposes renderer-ready lane coverage derived from context planning. Keep that lane vocabulary aligned with the shared renderer:
- `ehr/chart`
- `memory`
- `clinical-resources`
- `patient-monitor/simulation`

Do not treat `.noah-pi-runtime/skills/` as the source of Noah RN clinical workflow truth.
