# Noah RN

Noah RN is an agent-native clinical workspace harness built for critical care nursing. Medplum provides the clinical data interface; multi-agent orchestration and structured skills provide the intelligence layer. Built by a 14-year ICU nurse who engineers the systems he wished existed at the bedside.

Version: **0.3.0**

## What is Noah RN?

A clinical workspace where FHIR patient data, deterministic tools, and nursing knowledge converge under agent orchestration. The system is designed around context architecture — assembling the right patient data, clinical knowledge, and workflow structure so the agent can deliver maximally useful output to the nurse.

It is **not** an ambient scribing product, a documentation tool, or a general-purpose chatbot. It complements documentation platforms — it doesn't compete with them.

## Architecture

```text
noah-rn/
├── plugin/                       # Claude Code plugin (skills, agents, hooks)
├── dashboard/                    # React 19 clinical workspace (dev harness)
├── mcp-server/                   # Model Context Protocol (context assembly + simulation)
├── infrastructure/               # Medplum Docker stack (postgres, redis, server, app)
├── tools/                        # Deterministic CLI tools (calculators, conversions, lookups)
├── knowledge/                    # Curated protocols, drug data, templates
├── tests/                        # Test scripts + 80+ clinical scenario fixtures
├── optimization/                 # Eval harness + candidate optimization
└── docs/                         # Architecture, FHIR integration, compliance
```

### Layers

| Layer | Role | Implementation |
|-------|------|----------------|
| **Clinical Interface** | FHIR patient data, auth, admin | Medplum platform (active development) |
| **Agent Orchestration** | Multi-domain routing, context assembly | Clinical router agent, MCP server |
| **Structured Skills** | Nursing workflow intelligence | 7 clinical workflow skills encoding bedside pattern recognition |
| **Deterministic Tools** | Math, lookup, validation | 10 calculators, drug lookup, unit conversion, safety hooks |

## Clinical Interface — Medplum

[Medplum](https://medplum.com) v5.1.x running on local infrastructure (tower). Provides FHIR R4 server, built-in OAuth2, admin UI, TypeScript SDK, and bot automation. This layer is under active development — the MCP server and dashboard are being retargeted to Medplum's APIs.

**Data:** Synthea synthetic patients (~60 patients, 33K+ observations). No PHI — development and testing only.

**What Medplum unlocks:** Real patient context for backtesting skills against clinical scenarios. Without a FHIR data backbone, skills operate on nurse-provided text alone. With Medplum, the workspace can assemble vitals trends, lab trajectories, medication histories, and active orders — the full picture a bedside nurse needs.

## Skills & Orchestration

7 clinical workflow skills, plus a clinical router agent that orchestrates multi-domain requests across them.

| Skill | What it does |
|-------|-------------|
| `shift-assessment` | Organizes assessment narrative into system-by-system format |
| `shift-report` | Converts handoff narrative into structured SBAR-style report |
| `protocol-reference` | National guidance for ACLS, sepsis, stroke, rapid response, RSI |
| `drug-reference` | Medication facts, warnings, high-alert context via OpenFDA |
| `clinical-calculator` | Routes to deterministic calculators (GCS, NIHSS, APACHE II, Wells, CURB-65, Braden, RASS, CPOT, NEWS2) |
| `io-tracker` | Parses free-text intake/output into categorized totals and balance |
| `unit-conversion` | Dose, drip, and unit conversions — deterministic, not LLM-generated |

## Supporting Tools

Deterministic infrastructure that the workspace relies on. These are tools in the toolbox, not the product.

- **10 clinical calculators** — GCS, NIHSS, APACHE II, Wells PE/DVT, CURB-65, Braden, RASS, CPOT, NEWS2
- **Drug lookup** — OpenFDA label search with nursing-specific context
- **Unit/dose/drip conversion** — weight-based dosing, drip rate calculation
- **Safety hooks** — 5 deterministic validation scripts (input sanitization, calculator validation, dosage checking, unit validation, negation integrity)

## Design Principles

1. **Context architecture first** — assemble the right patient data + clinical knowledge so the agent delivers maximally useful output
2. **Deterministic before generative** — tool calls, not LLM inference, for math and lookup
3. **Charge nurse voice** — practical ranges, not rigid cutoffs; "per facility protocol" is a valid answer
4. **Three-tier confidence** — Tier 1: national guidelines (exact). Tier 2: bedside suggestions (labeled). Tier 3: facility-specific (deferred)
5. **No PHI anywhere** — nurse provides context, Noah provides structure

## Infrastructure

**FHIR Platform:** Medplum v5.1.x on local tower (10.0.0.184). Docker stack: PostgreSQL, Redis, Medplum server (port 8103), admin app (port 3000).

**Dashboard:** React 19 + Vite + Mantine workspace with vitals, labs, meds, orders, and context inspector panels.

**MCP Server:** Model Context Protocol server for patient context assembly and hemodynamic simulation (pharmacokinetic Hill equation models for pressor titration).

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

## Disclaimer

Noah RN is a clinical knowledge tool, not medical advice. Verify all outputs against the current patient state, provider orders, and your facility's policies before acting.
