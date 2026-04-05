# Noah RN

Noah RN is a deterministic-first clinical workspace harness and project for clinical workflows. It is built as a bounded clinical agentic system: deterministic tools where math and lookup must be exact, structured skills where clincal context needs organization, and explicit safety checks where errors matter.

Version: **0.2.0**

## Hook — What is Noah RN v0.1?

Noah RN is a Claude Code plugin for skills-based clinical decision support. It is designed for bedside use cases where the nurse needs structured help with protocol reference, bedside math, and workflow organization without turning the system into a documentation scribe.

## Origin Story

Noah RN comes from a practitioner-builder perspective. The system was built by a 14-year ICU nurse with 13 years in critical care, a self-taught engineer, and a first-principles thinker who decided that if clinical AI was going to be useful at the bedside, it had to be engineered like a system rather than prompted like a demo.

That changes the shape of the product. The goal is not to generate impressive prose. The goal is to make nursing workflows repeatable, auditable, and explicit about trust boundaries: deterministic when math or lookup is possible, structured when judgment needs organization, and clear about where the model should stop and defer to the nurse, provider orders, or facility policy.

## What It Does

Noah RN is not an ambient scribing product. It is focused on clinical decision support plus structured nursing workflows for assessment, handoff, protocol recall, and bedside math.

- It helps with skills-based decision support for common bedside workflows.
- It references national protocols and curated clinical knowledge where applicable.
- It runs bedside math deterministically for calculators, dose math, drip math, and unit conversion.
- It organizes nurse-provided clinical narrative into structured assessment, handoff, and I&O workflows.
- It does not replace clinical judgment, generate orders, or guess facility-specific policy.

Current deterministic tooling in the repo includes 10 clinical calculator shell scripts under `tools/clinical-calculators`, a drug lookup tool, and unit-conversion tooling for dose, drip, and unit math.

## Architecture Overview

Noah RN is built as a hybrid plugin + project:

- The installable surface lives under `plugin/`, with plugin metadata in `plugin/.claude-plugin/plugin.json`.
- The clinical behavior is encoded in 8 skills under `plugin/skills`.
- Multi-domain requests can be orchestrated through `plugin/agents/clinical-router.md`.
- Deterministic shell tools handle work that should not be delegated to an LLM, especially calculators, conversions, and validation.
- The LLM layer is used as a bounded skills interface, not as an unconstrained general chatbot.

The architecture is deliberately deterministic-first. If a score can be computed, a dose can be checked, or a unit can be converted by a tool, Noah RN uses the tool path instead of freeform model reasoning.

Part of the safety story is implemented with deterministic hook enforcement, not just prompt wording. `plugin/hooks/hooks.json` currently registers:

- 1 `UserPromptSubmit` hook for input sanitization
- 4 `PostToolUse` Bash validators for calculator plausibility, dosage validation, unit validation, and negation integrity

These hooks are the Tier 1 safety floor. Higher-level completeness checks and all generative output still require model compliance and nurse review.

FHIR support exists for testing and development, not for production EHR integration. [`docs/FHIR-INTEGRATION.md`](docs/FHIR-INTEGRATION.md) describes a local MIMIC-IV-on-FHIR harness used to validate workflows against realistic patient-shaped data while explicitly excluding PHI and production runtime use.

## Skills Catalog

Noah RN currently ships 8 skills. Each one exists because it maps to a real nursing task rather than a generic AI capability.

| Skill | What it does | Clinical rationale |
|-------|--------------|-------------------|
| `clinical-calculator` | Routes to deterministic calculators for GCS, NIHSS, APACHE II, Wells, CURB-65, Braden, RASS, and CPOT | Standardized scores should be exact, reproducible, and never done with hand-wavy model arithmetic |
| `drug-reference` | Looks up medication facts, warnings, and high-alert context | Medication questions are frequent bedside interruptions and need bounded, reference-oriented answers |
| `io-tracker` | Parses free-text intake/output and returns categorized totals and balance | Fluid balance gets messy fast in real shift flow; structure reduces arithmetic and transcription mistakes |
| `protocol-reference` | Surfaces national guidance for ACLS, sepsis, stroke, rapid response, and RSI | Nurses need fast protocol recall without pretending local policy can be inferred |
| `shift-assessment` | Organizes assessment narrative into a system-by-system format | The value is not authorship, it is preserving clinical thinking while improving structure |
| `shift-report` | Converts raw handoff narrative into a structured SBAR-style report | Handoff quality is a patient safety issue, and structured output reduces omission risk |
| `unit-conversion` | Handles dose, drip, and unit conversions deterministically | Bedside math is common, high-consequence, and better handled by tools than by language models |
| `hello-nurse` | Verifies that the plugin is installed and reachable | A health check matters when the plugin itself is part of the workflow surface |

## Technical Highlights

Four implementation choices define the system:

1. **Three-tier confidence model**

   Noah RN separates:

   - Tier 1: standardized national guidance
   - Tier 2: bedside suggestions and practical clinical framing
   - Tier 3: institution-specific policy deferral

   That boundary matters because the system is allowed to support judgment, not invent local rules.

2. **Four-layer output structure**

   The repo architecture defines a four-layer explanation format for skill responses:

   - Summary
   - Evidence
   - Confidence
   - Provenance

   Skills then append a required disclaimer layer. The goal is to make output readable at the bedside while preserving source, confidence, and review context for technical readers.

3. **Router and deterministic safety floor**

   - `plugin/agents/clinical-router.md` defines the multi-skill routing layer for ambiguous or cross-domain requests
   - `plugin/hooks/hooks.json` defines the deterministic hook layer that sanitizes input and validates tool-driven output paths
   - Together they establish explicit trust boundaries instead of relying on a single freeform prompt

4. **Local MIMIC-IV FHIR harness**

   - The `tests/` tree covers hooks, calculators, FHIR utilities, skills, and clinical scenario fixtures
   - [`docs/FHIR-INTEGRATION.md`](docs/FHIR-INTEGRATION.md) frames MIMIC-IV + FHIR as a local test harness for skill development and validation
   - The harness is explicitly for development use, not production/runtime EHR integration

Taken together, the design says: clinical AI should have a test harness, a safety floor, and explicit trust boundaries.

## Installation

Noah RN currently installs as a local Claude Code plugin from this repository. There is no published registry/package install flow documented in the repo yet.

Requirements:

- Claude Code runtime is required
- Drug lookup functionality requires network access to OpenFDA

1. Clone the repository and enter it.
2. Validate the plugin directory:

```bash
claude plugin validate ./plugin
```

3. Load Claude Code with the plugin directory:

```bash
claude --plugin-dir ./plugin
```

4. Verify the plugin surface:

```bash
# In Claude Code, invoke the verification skill
/hello-nurse
```

Optional direct tool checks from the repo root:

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)

# Calculator example
bash "$REPO_ROOT/tools/clinical-calculators/gcs.sh" --eye 3 --verbal 4 --motor 5

# Drug lookup example
bash "$REPO_ROOT/tools/drug-lookup/lookup.sh" vancomycin
```

## Project Structure

```text
noah-rn/
├── plugin/
│   ├── .claude-plugin/         # plugin.json manifest
│   ├── skills/                 # 8 clinical skills
│   ├── agents/                 # clinical-router.md
│   └── hooks/                  # hook config + validation scripts
├── tools/
│   ├── clinical-calculators/   # 9 deterministic calculator scripts
│   ├── drug-lookup/            # reference lookup tooling
│   ├── fhir/                   # MIMIC/FHIR test utilities
│   └── unit-conversions/       # dose, drip, unit conversion tooling
├── knowledge/                  # curated protocols, ranges, templates
├── docs/                       # architecture, limits, FHIR integration
└── tests/                      # test scripts and clinical scenario fixtures
```

## Disclaimer

Noah RN is a clinical decision support system, not medical advice and not a substitute for clinical judgment. Verify all outputs against the current patient state, provider orders, and your facility's policies before acting.
