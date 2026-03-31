# Noah RN External Architecture

## 1. System design

Noah RN is an installable Claude Code plugin plus a companion repository. The plugin surface lives under [`../plugin/`](../plugin/) and exposes the clinical interaction layer; the repository adds deterministic tools, curated knowledge, tests, and a local FHIR harness used for build and validation work. The plugin manifest identifies the product as clinical decision support and structured nursing workflows for bedside nurses ([`../plugin/.claude-plugin/plugin.json`](../plugin/.claude-plugin/plugin.json)). The broader repo positioning is explicit that Noah RN is not a documentation scribe; it is framed instead as clinical decision support plus structured nursing workflow assistance ([`../README.md`](../README.md), [`../.claude/CLAUDE.md`](../.claude/CLAUDE.md)).

At the top level, the architecture is deliberately split into four bounded layers:

- `plugin/`: skills, routing logic, and hook registration for the installable runtime surface
- `tools/`: deterministic shell tools for scoring, lookup, fluid math, unit conversion, and FHIR query utilities
- `knowledge/`: curated protocols, dosage ranges, mapping data, and authoring contracts
- `tests/` and `infrastructure/`: verification scripts and the local MIMIC-IV demo load path

This repo does not implement a web application or web UI. The intended runtime is a CLI plugin environment, and the current design keeps user interaction in Claude Code rather than exposing a browser-based clinical front end ([`../.claude/CLAUDE.md`](../.claude/CLAUDE.md)).

The core trust boundary is explicit in multiple repo-level documents: no PHI handling, storage, or logging; no autonomous clinical decisions; deterministic-first execution where exact computation is possible; and deferral to the nurse, provider orders, and facility policy for actions and institution-specific rules ([`../README.md`](../README.md), [`../.claude/CLAUDE.md`](../.claude/CLAUDE.md), [`../plugin/agents/clinical-router.md`](../plugin/agents/clinical-router.md)). In practical terms, Noah RN is positioned as clinical decision support plus structured nursing workflow assistance. It helps organize assessments, handoffs, protocol recall, and bedside math. It is intentionally not described or built as a scribing product.

## 2. Skills architecture

The primary application layer is a catalog of eight skills under [`../plugin/skills/`](../plugin/skills/): `clinical-calculator`, `drug-reference`, `io-tracker`, `protocol-reference`, `shift-assessment`, `shift-report`, `unit-conversion`, and `hello-nurse`. Each skill is implemented as a prompt artifact with YAML frontmatter that encodes routing metadata such as `name`, `skill_version`, `scope`, `complexity_tier`, `required_context`, `limitations`, `completeness_checklist`, and `hitl_category`.

The repo formalizes this contract in [`../knowledge/templates/skill-metadata-schema.md`](../knowledge/templates/skill-metadata-schema.md). That schema is not just documentation; it describes how skills declare least-privilege input requirements, machine-readable capability boundaries, and a human-in-the-loop classification. The schema explicitly fixes `hitl_category` at `II` and frames that as an architectural boundary to avoid autonomous clinical decisioning.

The skills separate into two functional classes:

- Structured workflow skills: `shift-assessment`, `shift-report`, and `io-tracker` organize nurse-provided narrative into predictable formats.
- Reference and deterministic-entry skills: `protocol-reference`, `drug-reference`, `clinical-calculator`, and `unit-conversion` either surface curated reference material or route into deterministic tool paths.

Routing across that catalog is handled by the clinical router agent in [`../plugin/agents/clinical-router.md`](../plugin/agents/clinical-router.md). The router does not act as a universal intermediary. Its prompt makes a narrower architectural choice: single-intent requests route directly to a specific skill, while ambiguous or multi-domain requests are classified, checked for required context, assigned a complexity tier, and then decomposed across relevant skills. That keeps single-skill paths simple while still supporting multi-domain bedside scenarios such as protocol plus calculator plus handoff assistance.

The repo also standardizes how skills present outputs. [`../knowledge/templates/four-layer-output.md`](../knowledge/templates/four-layer-output.md) defines a layered contract of summary, evidence, confidence tiering, and provenance footer, and the shipped skill files already include provenance/output sections aligned with that pattern. [`../knowledge/templates/cross-skill-triggers.md`](../knowledge/templates/cross-skill-triggers.md) adds a constrained mechanism for suggesting adjacent workflows without autonomous skill invocation.

## 3. Safety layer

Noah RN's safety model is explicitly three-tiered rather than delegated to a single prompt or a single validation mechanism.

Tier 1 is the deterministic lifecycle-hook layer. It is implemented in shell under [`../plugin/hooks/scripts/`](../plugin/hooks/scripts/) and registered in [`../plugin/hooks/hooks.json`](../plugin/hooks/hooks.json). The current configuration registers one `UserPromptSubmit` hook and four `PostToolUse` Bash validators:

- `sanitize-input.sh`: detects prompt-injection patterns before input reaches skills
- `validate-calculator.sh`: checks calculator scores against expected ranges
- `validate-dosage.sh`: cross-checks high-alert medication doses against curated ranges in `knowledge/drug-ranges.json`
- `validate-units.sh`: flags mixed-unit output patterns such as `mg`/`mcg`, `mL`/`L`, or `kg`/`lbs`
- `validate-negation.sh`: flags clinically critical negation and status phrases such as `DNR`, `NKA`, `DNI`, `NPO`, and medication holds

These checks sit outside freeform generation. `sanitize-input.sh` executes at `UserPromptSubmit`, before input reaches the skill layer, while the other four validators execute as `PostToolUse` hooks for `Bash`. That split gives the system deterministic control points both before model processing and after deterministic tool execution for classes of errors that are tractable to validate in code.

Tier 2 is the context-aware safeguard layer implemented in skill and router prompt logic plus the repo's output contracts. This layer covers controls that are not fully reducible to a deterministic validator but still need to be enforced consistently: mandatory-context checks, explicit refusal to infer missing vitals/labs/medications, confidence-tier labeling, provenance requirements, bounded cross-skill suggestions, and repeated language that Noah RN does not make autonomous clinical decisions ([`../plugin/agents/clinical-router.md`](../plugin/agents/clinical-router.md), [`../knowledge/templates/skill-metadata-schema.md`](../knowledge/templates/skill-metadata-schema.md), [`../knowledge/templates/four-layer-output.md`](../knowledge/templates/four-layer-output.md), [`../knowledge/templates/cross-skill-triggers.md`](../knowledge/templates/cross-skill-triggers.md)). Tier 2 is where the system constrains model behavior at the workflow and response-contract level.

Tier 3 is the facility-specific policy boundary. The repo's design does not attempt to infer institution-specific rules from generic prompts or national references. Instead, facility-specific behavior is treated as deferred or local-configuration-dependent behavior: "per facility protocol" is the expected response when site-specific policy is required and no local configuration has been supplied ([`../README.md`](../README.md), [`../.claude/CLAUDE.md`](../.claude/CLAUDE.md), [`../knowledge/templates/four-layer-output.md`](../knowledge/templates/four-layer-output.md)). In other words, Tier 3 is an enforcement boundary by omission: Noah RN will not guess local policy and present it as globally valid logic.

Taken together, the three tiers produce a split safety posture: deterministic shell enforcement where exact checks are tractable, prompt- and contract-level safeguards where clinical context must remain bounded, and explicit deferral where local institutional policy would otherwise be over-generalized.

## 4. Deterministic tools

Deterministic tooling lives under [`../tools/`](../tools/) and is a first-class part of the architecture rather than a side utility. The current repo includes:

- nine clinical calculator scripts in [`../tools/clinical-calculators/`](../tools/clinical-calculators/): GCS, NIHSS, APACHE II, Wells PE, Wells DVT, CURB-65, Braden, RASS, and CPOT
- a drug lookup tool in [`../tools/drug-lookup/lookup.sh`](../tools/drug-lookup/lookup.sh)
- an I&O parsing/totals tool in [`../tools/io-tracker/track.sh`](../tools/io-tracker/track.sh)
- a unit conversion tool in [`../tools/unit-conversions/convert.sh`](../tools/unit-conversions/convert.sh)
- a FHIR translation/query utility in [`../tools/fhir/mimic-loinc-query.sh`](../tools/fhir/mimic-loinc-query.sh)

This tool layer implements the repo's "deterministic before generative" rule. Scores, conversions, and similar structured calculations are expected to run through shell tooling, not LLM arithmetic ([`../.claude/CLAUDE.md`](../.claude/CLAUDE.md), [`../README.md`](../README.md)). The clinical router reinforces the same boundary by instructing that deterministic calculations go through Bash tools and never through model reasoning alone ([`../plugin/agents/clinical-router.md`](../plugin/agents/clinical-router.md)).

The tool implementations are paired with script-level tests in [`../tests/`](../tests/), including dedicated coverage for calculators, FHIR utilities, hook enforcement, unit conversions, and drug lookup. That gives the project a concrete verification surface for the parts of the system expected to be exact.

## 5. Knowledge system

The knowledge layer under [`../knowledge/`](../knowledge/) is a curated repository of reference content and architecture contracts. It contains two distinct categories of material.

First, clinical reference content and mappings:

- protocol files in [`../knowledge/protocols/`](../knowledge/protocols/)
- dosage and safety reference data in [`../knowledge/drug-ranges.json`](../knowledge/drug-ranges.json)
- MIMIC-to-LOINC translation data in [`../knowledge/mimic-mappings.json`](../knowledge/mimic-mappings.json)

Second, architecture standards that govern how the model layer should behave:

- skill metadata schema in [`../knowledge/templates/skill-metadata-schema.md`](../knowledge/templates/skill-metadata-schema.md)
- output/provenance contract in [`../knowledge/templates/four-layer-output.md`](../knowledge/templates/four-layer-output.md)
- cross-skill suggestion policy in [`../knowledge/templates/cross-skill-triggers.md`](../knowledge/templates/cross-skill-triggers.md)

Knowledge freshness is tracked explicitly in [`../knowledge/FRESHNESS.md`](../knowledge/FRESHNESS.md). For protocol files, the manifest records source body, version, verification date, next review date, and status. For reference data such as `drug-ranges.json` and `mimic-mappings.json`, it records description, last-updated date, next review date, and status. The architecture implication is important: knowledge is treated as versioned operational data with a review cadence, not as an untracked prompt appendix. The metadata schema further ties skills to declared `knowledge_sources`, which provides a path for staleness detection and provenance tracing.

## 6. FHIR integration

FHIR support in the current repo is a build and test harness, not a production integration surface. [`./FHIR-INTEGRATION.md`](./FHIR-INTEGRATION.md) is explicit that there is no PHI and no production/runtime EHR use. The harness is used to validate workflows against patient-shaped data while preserving the repo's non-PHI trust boundary.

The implementation consists of:

- a local/demo HAPI FHIR server described in [`./FHIR-INTEGRATION.md`](./FHIR-INTEGRATION.md)
- a load/verify pipeline in [`../infrastructure/load-mimic.sh`](../infrastructure/load-mimic.sh)
- a translation shim in [`../tools/fhir/mimic-loinc-query.sh`](../tools/fhir/mimic-loinc-query.sh)
- mapping data in [`../knowledge/mimic-mappings.json`](../knowledge/mimic-mappings.json)
- FHIR-specific tests in [`../tests/fhir/test_mimic_loinc_query.sh`](../tests/fhir/test_mimic_loinc_query.sh)

The current wording in the repo requires care. Session directives mention synthetic-data FHIR on `tower`, while the detailed FHIR document and the implementation files describe the active harness as a local MIMIC-IV FHIR demo import. For external engineering accuracy, the safe claim is the one supported by the concrete implementation files: the build/test harness uses local MIMIC-IV demo data, loaded through `load-mimic.sh` from the PhysioNet MIMIC-IV FHIR demo bundle and queried through a LOINC translation shim. It should not be described as a production or runtime EHR integration.

The same document also records current limitations in the imported demo state, including absent `Observation` resources on the referenced live server snapshot. That means the architecture already distinguishes between implemented harness plumbing and fully available patient-context workflows. Structural query paths exist today; observation-driven calculator or protocol population is described as blocked until the import is complete. Any external description should preserve that distinction.

## 7. Clinical router

The clinical router in [`../plugin/agents/clinical-router.md`](../plugin/agents/clinical-router.md) is the orchestration layer for requests that span more than one domain. Its prompt defines a concrete control flow:

1. classify the user request against an intent map
2. validate mandatory context for each candidate skill
3. assign a complexity tier
4. route either to a single skill or to a bounded multi-skill composition
5. optionally surface cross-skill suggestions without autonomously invoking more skills

This router is not designed to make bedside decisions independently. The limitations block in its agent card is explicit: adult patients only, no image analysis, no autonomous prescribing, no autonomous clinical decisions, and no PHI storage. The router's job is orchestration and scoping. It selects the right skill path, requests missing information when required, and preserves each skill's own disclaimer and provenance contract in multi-skill outputs.

That architecture choice is important for integration with a broader technical stack such as ChartWell AI's. Noah RN's router is best understood as a narrow clinical intent dispatcher for bedside CDS and nursing workflow assistance. It does not attempt to become a general charting agent, autonomous nurse, or universal clinical planner.

## 8. Design decisions

Several design decisions in the current repo materially shape the system.

First, the product surface is right-sized around bedside nursing workflows instead of generalized documentation. The repo repeatedly frames Noah RN as clinical decision support plus structured nursing workflow assistance and explicitly rejects the scribe pattern ([`../README.md`](../README.md), [`../.claude/CLAUDE.md`](../.claude/CLAUDE.md)).

Second, the architecture prefers deterministic tools over model-only reasoning whenever an exact algorithm, lookup, or conversion exists. That reduces avoidable arithmetic and unit errors and creates a testable execution surface.

Third, trust boundaries are encoded as architecture, not marketing language. No PHI, no web UI, no autonomous clinical decisions, no inferred facility policy, and no claimed production/runtime EHR connectivity are all present as explicit repo constraints.

Fourth, the knowledge layer is managed as versioned operational content with freshness tracking and provenance requirements. That is a more credible posture for clinical CDS than embedding untracked reference text inside prompts.

Fifth, the system keeps the model layer narrow. Skills are workflow-specific, the router is only invoked when classification complexity justifies it, and the FHIR harness is isolated to build/test work. That is a pragmatic reduction from broader early-product concepts toward a smaller, auditable system with clearer failure modes.
