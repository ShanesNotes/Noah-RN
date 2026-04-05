# Noah RN

Noah RN is an agent-native clinical workspace harness built for critical care nursing, paired with a simulated production environment for clinical AI evaluation. Built by a 14-year ICU nurse who engineers the systems he wished existed at the bedside.

Version: **0.3.0**

## What is Noah RN?

Two things, built together:

**1. A clinical workspace harness** — multi-agent orchestration, structured skills, deterministic tools, and MCP-based context curation converging on a Medplum FHIR interface. The system assembles patient data, clinical knowledge, and workflow structure so the agent delivers maximally useful output to the nurse.

**2. A simulated production environment** — real de-identified ICU data, clinical narratives, and real-time vitals simulation feeding into a FHIR store. A virtual hospital floor for evaluating clinical AI agents against realistic encounters, not synthetic toy data.

Neither exists in isolation. The harness needs realistic data to evaluate against. The eval environment needs an agentic system to test. Together they form a development platform for clinical AI that is tuned by a working nurse, not a product manager.

It is **not** an ambient scribing product, a documentation tool, or a general-purpose chatbot. It complements documentation platforms — it doesn't compete with them.

---

## Pillar 1: Clinical Workspace Harness

### Architecture

```text
noah-rn/
├── plugin/                       # Claude Code plugin (skills, agents, hooks)
├── dashboard/                    # React 19 clinical workspace (dev harness)
├── mcp-server/                   # Model Context Protocol (context assembly + simulation)
├── tools/                        # Deterministic CLI tools (calculators, conversions, lookups)
├── knowledge/                    # Curated protocols, drug data, templates
└── docs/                         # Architecture, FHIR integration, compliance
```

### Layers

| Layer | Role | Implementation |
|-------|------|----------------|
| **Clinical Interface** | FHIR patient data, auth, admin | Medplum FHIR R4 platform |
| **Agent Orchestration** | Multi-domain routing, context assembly | Clinical router agent, MCP server |
| **Structured Skills** | Nursing workflow intelligence | 7 clinical workflow skills encoding bedside pattern recognition |
| **Deterministic Tools** | Math, lookup, validation | 10 calculators, drug lookup, unit conversion, safety hooks |

### Skills & Orchestration

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

### Supporting Tools

Deterministic infrastructure that the workspace relies on. Tools in the toolbox, not the product.

- **10 clinical calculators** — GCS, NIHSS, APACHE II, Wells PE/DVT, CURB-65, Braden, RASS, CPOT, NEWS2
- **Drug lookup** — OpenFDA label search with nursing-specific context
- **Unit/dose/drip conversion** — weight-based dosing, drip rate calculation
- **Safety hooks** — 5 deterministic validation scripts (input sanitization, calculator validation, dosage checking, unit validation, negation integrity)

---

## Pillar 2: Simulated Production Environment

A virtual hospital floor for clinical AI evaluation, built on real de-identified data and real-time simulation.

### Data Stack

| Layer | Source | What it provides |
|-------|--------|-----------------|
| **Historical ICU data** | [MIMIC-IV on FHIR](https://physionet.org/content/mimic-iv-fhir-demo/2.1.0/) | 100 de-identified ICU patients with encounter-scoped vitals, labs, MAR, conditions, procedures — real clinical messiness, not synthetic rules |
| **Clinical narratives** | [MIMIC-IV-Note](https://physionet.org/content/mimic-iv-note/) | Physician H&Ps, progress notes, discharge summaries mapped to FHIR DocumentReference |
| **Synthetic breadth** | [Synthea](https://github.com/synthetichealth/synthea) | Non-ICU edge cases, rapid golden-test generation, smoke testing |
| **Real-time vitals** | [ResusMonitor](https://www.resusmonitor.com/) | Browser-based ICU monitor sim with remote control — live Observation streams into Medplum |
| **Scenario orchestration** | [MedAgentSim](https://github.com/MAXNORM8650/MedAgentSim) | Clinical simulation scenarios with decision points for agent eval |

### Data Flow

```
MIMIC-IV NDJSON ──→ Medplum $import ──→ ┐
MIMIC-IV-Note ────→ DocumentReference ──→ ├──→ Medplum FHIR R4 Store
Synthea bundles ──→ bulk import ────────→ ┘         │
                                                     ↓
ResusMonitor ─────→ Observation stream ──→ noah-rn routing agent + skills
                                                     │
                                                     ↓
                                          Hooks + completeness checklists
                                                     │
                                                     ↓
                                          Golden test cases + regression
```

### Why This Matters

Most clinical AI eval uses synthetic data or isolated benchmarks. This environment provides:
- **Real ICU data** with the sparsity, irregular sampling, and clinical messiness agents must handle
- **Encounter-scoped context** — what a nurse actually sees on a shift, not isolated observations
- **Live physiological response** — skills reacting to vitals in real time, not static snapshots
- **Professionally tuned scenarios** — user stories written by a working ICU nurse, not a product manager

---

## Design Principles

1. **Context architecture first** — assemble the right patient data + clinical knowledge so the agent delivers maximally useful output
2. **Deterministic before generative** — tool calls, not LLM inference, for math and lookup
3. **Charge nurse voice** — practical ranges, not rigid cutoffs; "per facility protocol" is a valid answer
4. **Three-tier confidence** — Tier 1: national guidelines (exact). Tier 2: bedside suggestions (labeled). Tier 3: facility-specific (deferred)
5. **No PHI anywhere** — nurse provides context, Noah provides structure

## Infrastructure

**FHIR Platform:** [Medplum](https://medplum.com) v5.1.x on local tower. Docker stack: PostgreSQL, Redis, Medplum server (port 8103), admin app (port 3000).

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

## Acknowledgments

This project builds on open data and open-source tools:

- **[MIMIC-IV](https://physionet.org/content/mimiciv/)** — Johnson et al., PhysioNet. De-identified critical care data from Beth Israel Deaconess Medical Center.
- **[MIMIC-IV on FHIR](https://physionet.org/content/mimic-iv-fhir/)** — FHIR R4 conversion by the [kind-lab/mimic-fhir](https://github.com/kind-lab/mimic-fhir) project.
- **[Synthea](https://github.com/synthetichealth/synthea)** — MITRE Corporation. Synthetic patient generation.
- **[Medplum](https://github.com/medplum/medplum)** — Open-source FHIR platform and developer tools.
- **[ResusMonitor](https://www.resusmonitor.com/)** — Real-time patient monitor simulation for medical education.
- **[MedAgentSim](https://github.com/MAXNORM8650/MedAgentSim)** — Medical agent simulation datasets.
- **[OpenFDA](https://open.fda.gov/)** — FDA drug label and adverse event data.

## Disclaimer

Noah RN is a clinical knowledge tool, not medical advice. Verify all outputs against the current patient state, provider orders, and your facility's policies before acting.
