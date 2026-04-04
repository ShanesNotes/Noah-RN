# Noah RN — North Star

> The canonical vision document. Every other doc references this.

---

## What Noah RN Is

Noah RN is an **outcome-spec clinical workspace harness** for bedside nursing.

It takes a clinician's workspace problem — informed by patient context, institutional constraints, and curated clinical knowledge — and resolves it through outcome specification, tool orchestration, safety guardrails, and auditable progress tracking.

The system encodes 13 years of ICU pattern recognition as executable architecture: deterministic tools where math and lookup must be exact, structured skills where nursing context needs organization, and explicit safety checks where errors matter.

## Who It's For

Critical care and bedside nurses who need structured help with:

- Protocol recall during high-acuity situations
- Bedside math (scores, dosing, drip rates, conversions)
- Assessment and handoff organization
- Drug reference and interaction checking

The system supports clinical judgment. It does not replace it.

## What It Does

Noah RN resolves clinical workspace problems through four mechanisms:

1. **Outcome specification.** The clinician states the problem. The harness assembles relevant context (patient data, protocols, facility constraints), selects appropriate tools, and resolves toward a structured, auditable output — without prescribing the procedural path.

2. **Deterministic tool orchestration.** Scoring calculators, dosage validation, unit conversion, and drug lookup are computed — never generated. The model orchestrates tools; tools produce the numbers.

3. **Safety guardrails.** A deterministic hook layer (input sanitization, calculator range validation, dosage cross-reference, unit mismatch detection, negation integrity) runs independently of the model. These encode clinical safety invariants, not model compensations. They survive model upgrades.

4. **Auditable confidence.** Every output carries provenance: what source, what confidence tier, what evidence grade. Three tiers — national guidelines (exact), bedside guidance (labeled), facility-specific (deferred to local policy) — make the trust boundary explicit.

## What It Doesn't Do

- **No diagnosis, no orders.** Noah organizes, suggests, and reminds. The nurse assesses, decides, and acts.
- **No PHI.** Nothing is stored. The nurse provides context via natural language; Noah provides structure.
- **No facility policy guessing.** Tier 3 content defers to "per facility protocol" until explicitly configured.
- **No ambient documentation.** This is decision support and workflow organization, not scribing.
- **No unconstrained generation.** If it can be computed, it is computed. The model is bounded by tools, guardrails, and outcome specs.

## Delivery Surface

The Claude Code plugin is the MVP interface. It is not the product boundary. The architecture supports any surface that can present structured clinical output — mobile chat apps, embedded assistants, API consumers. The plugin proves the architecture; the architecture enables the product.

## Regulatory Position

HITL Category II: the clinician reviews every output before acting. CDS five-criteria exemption pathway: the system presents clinical knowledge, the nurse makes the decision. Not a medical device. Not a substitute for clinical judgment.

## Design Philosophy

**Charge nurse, not policy manual.** Noah is the experienced colleague at the bedside — practical ranges over rigid cutoffs, context caveats inline, "per facility protocol" when appropriate. Accurate and evidence-based, but presented with bedside nuance.

**Subtractive bias.** Don't build what isn't needed. Every component must justify its existence by solving a real bedside problem. Complexity is earned, never imposed.

**Get out of the model's way.** With capable models, procedural scaffolding becomes dead weight. Define outcomes and constraints; let the model find the path. Invest in corpus organization and safety invariants, not retrieval choreography.
