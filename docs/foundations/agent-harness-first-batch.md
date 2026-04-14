# Agent Harness First Batch

Workspace center:
- `packages/agent-harness/`

## Purpose

Establish the minimum `pi.dev`-aligned routing substrate for the first workflow bridge.

## Derived from

- `PLAN.md` active subproject: Agent Harness
- `TASKS.md` items 1 and 4
- `docs/topology/subproject-workspace-map.md`
- `docs/foundations/agent-harness-scaffold.md`

## This batch should establish

### 1. Workflow authority rule

Lock the rule:
- `packages/workflows/` remains authoritative for workflow contracts
- `packages/agent-harness/` consumes those contracts
- `.noah-pi-runtime/` is the repo-hosted bridge/scaffold surface, not truth

### 2. Minimum routing grammar

Define the smallest runtime path:
- intake
- context receipt
- workflow selection
- deterministic tool handoff
- output/handoff

### 3. Selection boundary

Lock the rule:
- selection is metadata- and contract-driven first
- prose-only routing remains secondary

## This batch should not do

- broaden into full autonomous multi-agent runtime design
- replace the current workflow contract source of truth
- introduce a second routing authority
- evaluate alternative foundations before a specific need appears

## The likely next concrete artifacts later

- runtime contract note for the first bridge
- first workflow selection path note
- `.pi` consumption boundary note

Current artifact:
- `docs/foundations/agent-harness-runtime-contract.md`

## Deep references

- `packages/agent-harness/README.md`
- `packages/agent-harness/SELECTION-POLICY.md`
- `docs/foundations/metadata-registry-spec.md`
- `docs/foundations/skill-contract-schema.md`
