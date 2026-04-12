# Clinical Resources Scaffold

## Purpose

Define the minimal resource layer Noah RN needs to give workflows provenance-aware access to usable clinical knowledge at runtime.

## Governing alignment

- `PLAN.md`: clinical resources are an active subproject.
- `TASKS.md`: a clinical resources catalog plan is already queued.
- `README.md`: resources include guidelines, protocols, publication feeds, and an agent-centric Lexicomp-like drug reference.

## Canonical boundary

Clinical resources means:

- curated knowledge surfaces
- provenance and freshness metadata
- runtime access contracts for workflows

It does not mean:

- broad ingestion pipelines as the first step
- raw research as runtime truth
- prompt-only access to unclassified source corpora

## Minimal architecture

### Class 1: protocol and guideline resources

Examples:
- `clinical-resources/protocols/`
- focused bedside reference assets

Use when:
- the workflow needs stable, reference-grade clinical guidance

### Class 2: drug reference resources

Examples:
- current OpenFDA-backed path
- future Lexicomp-like mirror path

Use when:
- the workflow needs agent-centric medication reference behavior with explicit limitations

### Class 3: knowledge metadata layer

Owns:
- provenance
- freshness
- allowed use class
- runtime access shape

This metadata layer matters more than ingestion breadth right now.

## Lexicomp-like path

Scaffold stance:
- do not attempt a full clone first
- define the runtime access contract first
- separate deterministic label-backed lookup from richer future mirrored content
- preserve explicit limits around off-label, facility-specific, and freshness-sensitive guidance

## Canonical surfaces now

- `clinical-resources/`
- `packages/workflows/protocol-reference/`
- `packages/workflows/drug-reference/`
- `docs/foundations/metadata-registry-spec.md`

## Deferred work

- large-scale ingestion
- publication feed automation
- broad mirror expansion before the access contract is stable
- legal/operational commitments for mirror scope before the first workflow proves the need

## References

- `README.md`
- `PLAN.md`
- `TASKS.md`
- `docs/foundations/metadata-registry-spec.md`
- `clinical-resources/`
- `packages/workflows/protocol-reference/SKILL.md`
- `packages/workflows/drug-reference/SKILL.md`
- `research/# A 4-pillar clinical RAG architecture for noah-rn.md`
