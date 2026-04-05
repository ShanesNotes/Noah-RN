# Noah RN

Noah RN is an agent-native clinical workspace harness built for bedside nursing. It packages deterministic tools, structured skills, and a FHIR-integrated development environment into a system that gets out of the LLM's way and maximizes patient context awareness.

Version: **0.3.0**

## What is Noah RN?

Noah RN is a Claude Code plugin and companion project engineered by a 14-year ICU nurse. The system is built around one principle: clinical AI should be deterministic where math and lookup must be exact, structured where nursing context needs organization, and explicit about where the model should stop and defer to the nurse.

It is **not** an ambient scribing product, a documentation tool, or a general-purpose chatbot. It complements documentation platforms — it doesn't compete with them.

## What It Does

- **Skills-based workflows** for assessment, handoff, protocol recall, and bedside math
- **Deterministic tooling** — 10 clinical calculators, drug lookup, unit/dose/drip conversions
- **FHIR-integrated development environment** — Medplum platform on local infrastructure with Synthea synthetic patients
- **Clinical workspace dashboard** — React-based dev harness for visualizing vitals, labs, meds, and context assembly
- **MCP server** — Model Context Protocol server for patient context assembly and hemodynamic simulation
- **Pharmacokinetic simulation** — Hill equation dose-response models for pressor titration training scenarios

## Skills Catalog

8 skills, each mapping to a real nursing task:

| Skill | What it does |
|-------|-------------|
| `clinical-calculator` | Routes to deterministic calculators (GCS, NIHSS, APACHE II, Wells, CURB-65, Braden, RASS, CPOT) |
| `drug-reference` | Medication facts, warnings, high-alert context via OpenFDA |
| `io-tracker` | Parses free-text intake/output into categorized totals and balance |
| `protocol-reference` | National guidance for ACLS, sepsis, stroke, rapid response, RSI |
| `shift-assessment` | Organizes assessment narrative into system-by-system format |
| `shift-report` | Converts handoff narrative into structured SBAR-style report |
| `unit-conversion` | Dose, drip, and unit conversions — deterministic, not LLM-generated |
| `hello-nurse` | Plugin health check |

## Architecture

Hybrid plugin + project. Deterministic-first: if a score can be computed or a unit converted by a tool, Noah uses the tool path.

```text
noah-rn/
├── plugin/                       # Installable Claude Code plugin
│   ├── skills/                   # 8 clinical skills
│   ├── agents/                   # clinical-router (multi-skill orchestration)
│   └── hooks/                    # Tier 1 safety floor (input sanitization + validators)
├── dashboard/                    # React 19 + Mantine clinical workspace (dev harness)
├── mcp-server/                   # MCP server (context assembly + simulation)
├── tools/                        # Deterministic CLI tools (calculators, drug lookup, conversions)
├── knowledge/                    # Curated protocols, drug data, templates
├── infrastructure/               # Medplum Docker stack (postgres, redis, server, app)
├── tests/                        # Test scripts + 80+ clinical scenario fixtures
├── optimization/                 # Eval harness + candidate optimization
├── research/                     # Deep research artifacts (Medplum, architecture)
└── docs/                         # Architecture, FHIR integration, compliance
```

## Infrastructure

**FHIR Platform:** [Medplum](https://medplum.com) v5.1.x running on local tower (10.0.0.184). Provides FHIR R4 server, built-in OAuth2, admin UI, TypeScript SDK, and bot automation.

**Data:** Synthea synthetic patients (~60 patients, 33K+ observations). No PHI — development and testing only.

**Dashboard:** React 19 + Vite + Mantine workspace with vitals, labs, meds, orders, and context inspector panels.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full details and [`docs/FHIR-INTEGRATION.md`](docs/FHIR-INTEGRATION.md) for FHIR platform documentation.

## Installation

Requires Claude Code runtime. Drug lookup requires network access to OpenFDA.

```bash
# Clone and validate plugin
claude plugin validate ./plugin

# Load with plugin
claude --plugin-dir ./plugin

# Verify
/hello-nurse
```

Optional direct tool checks:

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
bash "$REPO_ROOT/tools/clinical-calculators/gcs.sh" --eye 3 --verbal 4 --motor 5
bash "$REPO_ROOT/tools/drug-lookup/lookup.sh" vancomycin
```

## Design Principles

1. **Deterministic before generative** — tool calls, not LLM inference, for math and lookup
2. **Charge nurse voice** — practical ranges, not rigid cutoffs; "per facility protocol" is a valid answer
3. **Three-tier confidence** — Tier 1: national guidelines (exact). Tier 2: bedside suggestions (labeled). Tier 3: facility-specific (deferred)
4. **Get out of the LLM's way** — lightweight harness engineering, prompt for WHAT not HOW
5. **No PHI anywhere** — nurse provides context, Noah provides structure

## Disclaimer

Noah RN is a clinical knowledge tool, not medical advice. Verify all outputs against the current patient state, provider orders, and your facility's policies before acting.
