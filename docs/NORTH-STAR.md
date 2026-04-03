# Noah RN — North Star

> Canonical product framing. This is the single source of truth for what Noah RN is.

## One Sentence

Noah RN is an outcome-spec clinical workspace harness that resolves nursing
workspace problems by assembling context, tools, knowledge, and guardrails —
getting out of the model's way while keeping the safety floor permanent.

## What This Means

The nurse describes their clinical situation. Noah assembles what they need:
patient context from the conversation, protocol knowledge from curated files,
deterministic calculations from tools, and drug data from API lookups. The
model does the clinical reasoning. The harness provides the guardrails.

Noah is not a skill catalog you browse. It is not a chatbot you query. It is
a workspace that resolves problems — from "organize my shift report" to
"my patient is crashing, what do I need ready?"

## Design Philosophy

### Outcome specs, not procedures
Define what good output looks like. Don't script how to get there. The model
is already good at clinical reasoning. Our job is to give it the right tools,
knowledge, and constraints — then let it work.

### Deterministic where it matters, agentic everywhere else
Clinical scores, drug lookups, unit conversions, dosing math — these are
deterministic tools. Wrong math kills. Everything else — synthesis, organization,
anticipatory guidance, cross-domain composition — that's what the model is for.

### Plan for leaps in agentic intelligence
Scaffolding that exists because models aren't smart enough should be easy to
remove. Scaffolding that exists for safety should be permanent. The architecture
degrades gracefully as models improve — less scaffolding needed, same safety
guarantees.

### Simplify scaffolding, don't relax rigor
Fewer moving parts. Same safety floor. A 40-line outcome spec that produces
the same quality output as a 330-line procedural workflow is a win — not
because it's shorter, but because it's less brittle and more adaptable.

## What Stays (Non-Negotiable)

- **Safety hooks**: 5 deterministic bash scripts. Cannot be prompt-injected.
- **Four-layer output**: Summary / Evidence / Confidence / Provenance.
- **Three-tier confidence**: National guidelines / bedside guidance / facility-specific.
- **Tool-only math**: Calculators, conversions, lookups — never model arithmetic.
- **Knowledge provenance**: YAML frontmatter on all protocol files.
- **No PHI**: Nurse provides context, Noah provides structure. Nothing stored.
- **HITL Category II**: Documentation assistance. Never autonomous clinical decisions.
- **Charge nurse voice**: Practical, direct, bedside language. Not a textbook.

## What Changes

- **Router → workspace agent**: Keyword dispatching replaced by outcome resolution.
- **Skills: procedures → contracts**: Output specs, not step-by-step instructions.
- **Context assembly**: Patient data accumulates within a session.
- **Policy overlays**: Facility-specific Tier 3 rules via YAML configuration.
- **Evals**: Workspace-outcome resolution, not isolated skill correctness.

## Who Noah Is For

A bedside nurse. ICU, med-surg, ER, or outpatient. The nurse who needs to
organize a chaotic shift handoff, look up a drug interaction at 3am, run a
clinical score, or get the sepsis bundle steps during a rapid response.

Noah is the experienced charge nurse two beds down. Practical ranges over
rigid cutoffs. Context caveats inline. "Per facility protocol" is a valid
answer. The nurse assesses, decides, and acts. Noah organizes, surfaces,
calculates, and reminds.

## The Moat

Anyone can build a skill catalog. The defensible assets are:
1. **Clinical domain encoding**: 14 years of ICU nursing experience made executable
2. **Safety architecture**: Deterministic hooks + confidence tiers + provenance
3. **Eval harness**: Workspace-outcome resolution validated against clinical scenarios
4. **Optimization loop**: Meta-harness continuous improvement against golden test suite

## Provenance

- Author: Shane (14yr ICU RN, self-taught engineer)
- Created: 2026-04-03
- Informed by: Mythos transcript (Claude as workspace agent), Meta-Harness
  research (Stanford IRIS Lab), autoresearch pattern (Karpathy)
