# Noah RN Standards

This directory holds published standards — contracts and schemas intended to be implemented by more than one product or repository.

These are public artifacts. Third-party implementations (an Epic-bridge, a Cerner-bridge, a different agent harness) are explicitly supported and expected. Noah RN's own implementations (Product B, Product C) are expected to conform; any divergence is a violation on the implementation's side, not the standard's side.

## Current standards

- [clinical-mcp-contract-v1.md](clinical-mcp-contract-v1.md) — v1.0.0, published 2026-04-16. The agent-native clinical-MCP contract any EHR implements to be agent-ready.

## Schemas

Machine-readable JSON Schemas accompany the markdown specs under [`schemas/`](schemas/).

## Versioning

- `v<major>.<minor>.<patch>`. Major bumps on breaking changes; minor bumps on additive changes; patch bumps on spec wording fixes.
- Deprecated standards are retained with a `DEPRECATED` banner and a pointer to the successor.

## Not standards

This directory is not for:
- Internal foundation documents (those live in `docs/foundations/`).
- Execution plans (those live in `docs/plans/`).
- Architecture summaries (those live in `docs/ARCHITECTURE.md`).
- Topology maps (those live in `docs/topology/`).
