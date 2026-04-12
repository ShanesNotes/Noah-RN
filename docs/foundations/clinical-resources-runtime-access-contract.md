# Clinical Resources Runtime Access Contract

Workspace center:
- `clinical-resources/`

## Purpose

Define how workflows should access clinical resources at runtime without turning the raw corpus into runtime truth.

## Governing alignment

- `PLAN.md`
- `TASKS.md`
- `docs/foundations/clinical-resources-first-batch.md`
- `docs/foundations/metadata-registry-spec.md`

## Contract

### Resource classes

The first stable runtime classes are:
- protocols and guideline files
- drug-reference assets
- templates / provenance metadata

### Access posture

Workflows should consume:
- curated files from `clinical-resources/`
- registry metadata
- deterministic tool outputs where exactness matters

Workflows should not consume:
- raw research as runtime truth
- undocumented mirror content
- hidden resource selection logic

### Minimum guarantees

Every runtime-accessed clinical resource should have:
- a stable source path
- provenance metadata
- freshness expectations
- an explicit role in workflow use

## Lexicomp-like path

The first contract only needs to say:
- deterministic label-backed reference exists now
- richer mirrored drug-reference layers may exist later
- any richer mirror must preserve provenance, freshness, and explicit limitations

## Not yet in scope

- large-scale ingestion
- full mirror buildout
- automated publication-feed architecture
- legal/operational mirror commitments

## Later runtime mirror

When implementation begins, the runtime mirror of this contract should span:
- `clinical-resources/`
- selected workflow package surfaces
- deterministic tool interfaces

## References

- `docs/foundations/clinical-resources-scaffold.md`
- `docs/foundations/clinical-resources-first-batch.md`
- `packages/workflows/protocol-reference/SKILL.md`
- `packages/workflows/drug-reference/SKILL.md`
