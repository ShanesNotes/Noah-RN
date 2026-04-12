# Clinical Resources First Batch

Workspace center:
- `clinical-resources/`

## Purpose

Establish the minimum runtime resource posture needed for the first workflow and future agent-centric drug reference work.

## Derived from

- `PLAN.md` active subproject: Clinical Resources
- `TASKS.md` item 6
- `docs/topology/subproject-workspace-map.md`
- `docs/foundations/clinical-resources-scaffold.md`

## This batch should establish

### 1. Resource class split

Define the first stable classes:
- protocol/guideline resources
- drug-reference resources
- metadata/provenance layer

### 2. Runtime access rule

Lock the rule:
- workflows consume curated resources through explicit contracts
- raw research does not become runtime truth

### 3. Lexicomp-like boundary

Lock the rule:
- first design the access contract
- do not begin with a broad mirror buildout

## This batch should not do

- create a large ingestion program
- turn research corpus into runtime knowledge
- commit to a full Lexicomp clone
- solve legal/operational mirror questions before the contract exists

## The likely next concrete artifacts later

- resource classes doc
- runtime access contract for protocol/drug workflows
- provenance/freshness policy note

Current artifact:
- `docs/foundations/clinical-resources-runtime-access-contract.md`

## Deep references

- `docs/foundations/metadata-registry-spec.md`
- `packages/workflows/protocol-reference/SKILL.md`
- `packages/workflows/drug-reference/SKILL.md`
- `research/# A 4-pillar clinical RAG architecture for noah-rn.md`
