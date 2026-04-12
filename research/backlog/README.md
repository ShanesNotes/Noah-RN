# Research Backlog

This folder holds queued deep-research artifacts that should inform future Noah RN architecture and development.

This folder should stay simple:

- `README.md` = backlog index and prioritization only
- `deep-research-prompts.md` = copy-paste prompt bank
- future research outputs = separate files, one artifact per topic

Do not append full prompt text or raw research outputs into this index.

## How This Backlog Should Function

Use this folder in three layers:

### 1. Backlog index

`README.md` should answer:
- what are the queued research artifacts?
- what is the priority?
- what question is each artifact supposed to answer?

### 2. Prompt bank

`deep-research-prompts.md` should answer:
- what exact prompts should be pasted into an external deep-research agent?

### 3. Research outputs

When a research run is completed, its result should become its own file under this folder, for example:

- `pi-dev-integration-packet.md`
- `medplum-extension-writeback-packet.md`
- `clinical-mcp-boundary-packet.md`

One artifact per file.
Do not append completed research into the backlog index.

## Priority Tiers

### Tier 1

Highest leverage for current architecture and development decisions.

1. **pi.dev integration packet**
   - Which `pi.dev` primitives should become first-class in `packages/agent-harness/`?
   - Which should remain project-level in `.pi/`?
   - What should the first real promotion path look like?

2. **Medplum extension and write-back packet**
   - Best patterns for Medplum Bots, Apps, OAuth2/client-credential flows, artifact persistence, and explicit nurse-approved write-back boundaries.

3. **`clinical-mcp` boundary packet**
   - What an agent-facing clinical context boundary should expose for bedside workflows, including context budget, gap reporting, provenance, timeline shaping, and MCP tool design.

4. **Memory architecture packet**
   - How to operationalize Noah RN's four memory tiers, especially what should persist, what should stay mutable, and what must never persist silently.

### Tier 2

High value, but dependent on Tier 1 boundary decisions.

5. **Agent-centric clinical resources / Lexicomp-like packet**
   - Minimal artifact classes, provenance rules, freshness model, and retrieval patterns for a safe agent-facing clinical resource layer.

6. **Simulation wrapper decision packet**
   - What `services/sim-harness/` should wrap first from Pulse/BioGears/other open simulators, what to ignore, and how to avoid overbuilding the simulation lane.

7. **Waveform vision packet**
   - How waveform data should be exposed to agents so rhythm interpretation is not just label-based, including raw numeric vs rendered strip tradeoffs.

8. **Eval and observability packet**
   - What every Noah RN workflow invocation should log, which metrics actually matter, and how eval traces should connect back to architecture decisions.

### Priority override

Current special interest:

- **Lexicomp-mirror / clinical drug reference packet**
  - This should be treated as an active near-term research item even though it sits naturally near Tier 2.
  - It is important for the `clinical-resources/` direction and the public-data-first versus licensed-content boundary.

- **Open medical data landscape / acquisition cluster**
  - This should be treated as an active exploratory research cluster.
  - It should answer what is actually out there across Hugging Face and canonical hosts, what is truly open versus gated, what is worth archiving locally, and how those datasets could later support clinical resources, evals, simulation, or model adaptation.

### Tier 3

Useful, but should likely follow more immediate boundary work.

9. **Regulatory architecture packet**
   - Which architectural choices preserve the current CDS/HITL posture, and which would move Noah RN into a different regulatory category.

10. **Source-of-truth ingestion policy packet**
   - Which external docs should be ingested as first-class project references, which should stay external, and which should be manually distilled.

11. **Clinical scenario corpus packet**
   - How to structure the next generation of realistic test/eval scenarios so they support both bedside workflow development and simulation/eval work.

### Open medical data prompt cluster

These are prompt-bank items for active exploratory research. They cross-cut `clinical-resources/`, `evals/`, future model-adaptation work, and possible local data archiving:

12. **Open medical datasets landscape packet**
   - What large medical dataset families exist across Hugging Face and canonical hosts, how they break down by modality, and which are most relevant for Noah RN.

13. **Hugging Face and beyond medical data census packet**
   - What is actually on Hugging Face versus mirrored or derivative there, what major sources live elsewhere, and how to count dataset families without duplicate inflation.

14. **Medical dataset acquisition and local archive packet**
   - What Noah RN should download now, what it should track as metadata only, and what local archive / manifest / license-traceability posture makes sense.

15. **Medical data leverage packet**
   - How different medical dataset classes could later support evals, retrieval, scenario generation, simulation seeding, or possible training/adaptation work.

## Current prompt bank

- [deep-research-prompts.md](deep-research-prompts.md)

## Current recommendation

If only three external deep-research artifacts are commissioned next, start with:

1. `pi.dev` integration packet
2. Medplum extension and write-back packet
3. `clinical-mcp` boundary packet
