# Noah RN — Architecture

> Read this before building any skill or starting a new phase.
> For canonical product framing, see `docs/NORTH-STAR.md`.
> For session-level directives, see `.claude/CLAUDE.md`.

---

## Form Factor: Outcome-Spec Workspace Harness

Noah RN is a hybrid plugin + project organized as a workspace harness.
The workspace agent resolves clinical problems by composing tools, knowledge,
and capability contracts. Skills define output standards, not procedures.

```
noah-rn/
├── .claude/
│   ├── CLAUDE.md                 # Session directives (always loaded)
│   └── settings.json
├── docs/
│   ├── ARCHITECTURE.md           # This file
│   ├── NORTH-STAR.md             # Canonical product framing
│   ├── FHIR-INTEGRATION.md       # MIMIC-IV demo harness notes
│   ├── DEGRADATION.md            # Failure mode documentation
│   ├── REGULATORY.md             # Regulatory positioning
│   ├── LIMITATIONS.md            # Explicit capability boundaries
│   └── archive/                  # Archived v1 artifacts
│       ├── clinical-router-v2.md # Previous keyword router
│       └── skill-procedures-v1/  # Previous procedural SKILL.md files
├── plugin/                       # The installable Claude Code plugin
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── skills/
│   │   ├── _shared/              # Extracted shared contracts
│   │   │   ├── output-contract.md    # Four-layer output, disclaimers, provenance
│   │   │   ├── trace-contract.md     # Trace logging lifecycle
│   │   │   └── confidence.md         # Three-tier confidence model
│   │   ├── shift-assessment/SKILL.md # Outcome-spec capability contracts
│   │   ├── drug-reference/SKILL.md
│   │   ├── protocol-reference/SKILL.md
│   │   ├── shift-report/SKILL.md
│   │   ├── clinical-calculator/SKILL.md
│   │   ├── io-tracker/SKILL.md
│   │   └── unit-conversion/SKILL.md
│   ├── agents/
│   │   └── workspace.md          # Primary interface — outcome-spec resolver
│   ├── commands/
│   └── hooks/                    # Tier 1 safety guardrails (permanent)
│       ├── hooks.json
│       └── scripts/
│           ├── sanitize-input.sh
│           ├── validate-calculator.sh
│           ├── validate-dosage.sh
│           ├── validate-units.sh
│           └── validate-negation.sh
├── harness/                      # Workspace harness layer
│   ├── context/                  # Patient context assembly
│   │   ├── patient-context.md    # Schema and assembly rules
│   │   └── session-state.md      # Session persistence contract
│   ├── policy/                   # Institutional policy overlays
│   │   ├── POLICY-SCHEMA.md
│   │   ├── defaults/baseline.yaml
│   │   └── overlays/             # Facility-specific YAML configs
│   └── evals/                    # Workspace-outcome evaluation
│       ├── EVAL-SCHEMA.md
│       ├── scenarios/            # Encounter-level eval scenarios
│       └── scoring/
├── tools/                        # Deterministic tool implementations
│   ├── drug-lookup/lookup.sh
│   ├── clinical-calculators/     # 10 calculators + shared lib
│   ├── unit-conversions/convert.sh
│   ├── fhir/mimic-loinc-query.sh
│   └── trace/trace.sh
├── knowledge/                    # Curated clinical reference data
│   ├── protocols/                # acls, sepsis-bundle, acute-stroke, rapid-response, rsi
│   ├── drug-data/
│   ├── drug-ranges.json          # ISMP high-alert dosage ranges
│   ├── FRESHNESS.md              # Knowledge provenance manifest
│   └── templates/                # Skill authoring standards
├── infrastructure/
│   └── load-mimic.sh
├── tests/
│   ├── drug-lookup/
│   ├── clinical-calculators/
│   ├── fhir/
│   ├── unit-conversions/
│   ├── hooks/
│   ├── clinical-scenarios/       # Skill-level test fixtures
│   └── workspace/                # Workspace-level resolution tests
├── optimization/                 # Meta-harness optimization loop
│   ├── product/                  # Clinical harness optimization
│   └── company/                  # Org-level optimization
└── README.md
```

---

## Design Principles

1. **Outcome specs, not procedures.** Define what good output looks like. Don't
   script how to get there. The model does clinical reasoning. The harness
   provides tools, knowledge, and constraints.

2. **Deterministic before generative.** Drug interactions, scoring calculators,
   unit conversions — tool calls, not LLM inference. Wrong math kills.

3. **No PHI anywhere.** Nurse provides clinical context via natural language.
   Noah provides structure, knowledge, and guidance. Nothing is stored.

4. **Subtractive bias.** Don't build what isn't needed yet. Remove scaffolding
   that the model no longer needs. Add structure only where it prevents harm.

5. **Plan for leaps in agentic intelligence.** Scaffolding that exists because
   models aren't smart enough should be easy to remove. Scaffolding that exists
   for safety should be permanent. The architecture degrades gracefully.

6. **Charge nurse, not policy manual.** Practical ranges over rigid cutoffs.
   Context caveats inline. "Per facility protocol" is valid. Include "why we
   care" one-liners. The disclaimer is the design philosophy, not decoration.

7. **Three tiers of confidence.** Tier 1: national guidelines (exact). Tier 2:
   bedside guidance (labeled). Tier 3: facility-specific (deferred unless
   policy overlay configured). See `plugin/skills/_shared/confidence.md`.

---

## Workspace Architecture

### Workspace Agent (`plugin/agents/workspace.md`)

The primary interface. Replaces the previous keyword-matching clinical router
with outcome-spec resolution:

| Aspect | Previous (Router) | Current (Workspace) |
|--------|------------------|-------------------|
| Input | Keyword match against intent map | Natural language clinical situation |
| Context | None — each skill starts fresh | Patient context accumulates across turns |
| Composition | One skill at a time | Multiple capabilities in one response |
| Tool use | Skills call tools individually | Agent calls tools directly |
| Knowledge | Skills read their own files | Agent reads knowledge based on need |
| Output | Per-skill formatting | Shared four-layer output contract |

### Context Assembly (`harness/context/`)

Patient context builds incrementally from nurse input. Session-scoped only —
no persistence, no PHI risk. See `harness/context/patient-context.md` for
the schema and assembly rules.

### Policy Overlays (`harness/policy/`)

Facility-specific Tier 3 rules via YAML configuration. Overlays only affect
Tier 3 — they cannot override national guidelines or bedside guidance.
See `harness/policy/POLICY-SCHEMA.md`.

### Shared Contracts (`plugin/skills/_shared/`)

Extracted from 7 skills to eliminate duplication:
- **output-contract.md**: Four-layer output, disclaimer pool, cross-skill suggestions
- **trace-contract.md**: Trace logging lifecycle
- **confidence.md**: Three-tier confidence model, critical flag thresholds

### Capability Contracts (Skills)

Skills define output standards as capability contracts:
- YAML frontmatter: metadata, scope, tools, output contract, limitations
- Brief rules: what the output must contain, preserve, and flag
- References to shared contracts instead of duplicated boilerplate

Skills are ~60-100 lines (down from ~200-330) because they specify outcomes,
not step-by-step procedures.

---

## Safety Architecture

### Permanent (Never Remove)

| Component | Location | Why |
|-----------|----------|-----|
| 5 Tier 1 hooks | `plugin/hooks/` | Deterministic bash, can't be prompt-injected |
| Four-layer output | `plugin/skills/_shared/output-contract.md` | Provenance and transparency |
| Three-tier confidence | `plugin/skills/_shared/confidence.md` | Prevents automation bias |
| Tool-only math | `tools/clinical-calculators/` | Wrong math kills |
| Drug range validation | `knowledge/drug-ranges.json` + hook | High-alert medication floor |
| No-fabrication rule | Workspace agent prompt | Fundamental safety constraint |
| HITL Category II | All skill frontmatter | FDA device boundary |
| Knowledge provenance | YAML frontmatter on protocols | Audit trail |

### Hooks (`plugin/hooks/`)

| Hook | Trigger | Function |
|------|---------|----------|
| `sanitize-input.sh` | UserPromptSubmit | Prompt injection detection |
| `validate-calculator.sh` | PostToolUse (Bash) | Score range plausibility |
| `validate-units.sh` | PostToolUse (Bash) | mg/mcg, mL/L mismatch detection |
| `validate-dosage.sh` | PostToolUse (Bash) | High-alert medication dosage cross-reference |
| `validate-negation.sh` | PostToolUse (Bash) | Critical negation integrity |

### Scaffolding Degradation Path

As models improve, scaffolding is removed in this order:

1. **Remove first**: keyword routing tables, step-by-step skill workflows,
   guided calculator input collection
2. **Remove later**: cross-skill trigger tables, acuity inference rules,
   output section ordering
3. **Never remove**: safety hooks, output contract, confidence model,
   tool-only math, provenance, HITL enforcement

No scaffolding removed without eval proving equivalence.

---

## Eval Architecture

Two layers:

| Layer | Location | Tests |
|-------|----------|-------|
| Skill-level | `tests/clinical-scenarios/` | Individual capability correctness |
| Workspace-level | `harness/evals/scenarios/` | Multi-capability composition and resolution |

Workspace evals use the schema at `harness/evals/EVAL-SCHEMA.md`. Safety is
binary pass/fail — any violation vetoes the entire scenario regardless of
other scores.

The optimization loop at `optimization/product/` uses both layers as its
golden test suite.

---

## Knowledge Provenance

All protocol files in `knowledge/protocols/` carry YAML frontmatter:
`source`, `version`, `date`, `evidence_grade`, `last_verified`, `next_review`.

`knowledge/FRESHNESS.md` tracks status (CURRENT / STALE) for every knowledge
file. Review cadence: quarterly, or when the source guideline body publishes
an update.

---

## Tool Conventions

- Tools live in `tools/<name>/` with bash implementations
- Exit codes: 0=success, 1=input/no-match error, 2=API/system error
- Paths resolve via `git rev-parse --show-toplevel`
- Tests live in `tests/<tool-name>/`
- Knowledge files in `knowledge/` are curated clinical content — edit with care

---

## Clinical Domain Context

### Nursing Documentation Basics
- **SBAR**: Situation, Background, Assessment, Recommendation
- **Head-to-toe assessment**: Systematic physical assessment by body system
- **Shift report**: Handoff communication between nurses
- **MAR**: Medication Administration Record
- **I&O**: Intake and Output (fluid balance tracking)

### Critical Care Specifics
- 1:1 or 1:2 nurse-to-patient ratio
- Continuous monitoring: hemodynamics, ventilators, vasoactive drips
- High-alert medications: vasopressors, insulin drips, heparin, sedation, paralytics
- Common scoring: GCS, RASS, CPOT, Braden, NIHSS, APACHE II, NEWS2

### What Noah Solves
- Repetitive structured assessments
- Drug lookups mid-shift when you can't leave the bedside
- Protocol recall at 3am during a rapid response
- Organizing shift reports after a chaotic 12 hours
- Translating clinical observations into documentation language

---

## FHIR Validation Harness

Build-time only. Uses MIMIC-IV Clinical Database Demo on the tower HAPI server
(10.0.0.184:8080). For development and eval scenario hydration — runtime Noah
does not depend on live EHR integration.

See `docs/FHIR-INTEGRATION.md`.
