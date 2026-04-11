# Observability + Context Addendum

## Goal

Prepare richer observability and context architecture for the first pi-native workflow without forcing a runtime rewrite yet.

## Observability Preparation

Existing surfaces:
- `tools/trace/trace.sh`
- `evals/product/traces/`

Prepare for these category tags:
- `fhir_resource`
- `rag_chunk`
- `system_prompt`
- `conversation_history`
- `tool_result`
- `tool_definitions`

Add later when implementing:
- context budget allocation
- routing decision rationale
- guardrail fire/pass summary
- source traceability for generated claims

## Context-Primitive Mapping

### Write
- future `packages/memory/`

### Select
- `services/clinical-mcp/`
- `knowledge/`

### Compress
- future summarization / context-reduction surfaces in `.pi/`

### Isolate
- future `.pi/` routing / multi-agent flow boundaries

## First Workflow Target

For Shift Report, the first meaningful context contract should describe:
- what patient bundle is selected
- what knowledge assets are selected
- what gets compressed vs left verbatim
- what workflow state is intentionally deferred
