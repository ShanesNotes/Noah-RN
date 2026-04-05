# Noah RN — Architecture & Build Plan

> Read this before building any skill or starting a new phase.
> For session-level directives, see `.claude/CLAUDE.md`.

---

## Form Factor: Agent-Native Clinical Workspace Harness

Implementation: Claude Code plugin + companion project (Medplum FHIR platform, React dashboard, MCP server, deterministic tools).

```
noah-rn/
├── .claude/
│   ├── CLAUDE.md                 # Session directives (always loaded)
│   └── settings.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── FHIR-INTEGRATION.md      # MIMIC-IV demo harness and validation notes
│   ├── DEGRADATION.md           # Phase 2 — failure mode documentation
│   ├── REGULATORY.md            # Phase 2 — regulatory positioning
│   └── LIMITATIONS.md           # Phase 2 — explicit capability boundaries
├── plugin/                       # The installable Claude Code plugin
│   ├── .claude-plugin/           # Plugin manifest directory
│   │   └── plugin.json
│   ├── skills/                   # Clinical skills (the core product)
│   │   ├── hello-nurse/          # Scaffold test skill
│   │   │   └── SKILL.md
│   │   ├── shift-assessment/
│   │   │   └── SKILL.md
│   │   ├── drug-reference/
│   │   │   └── SKILL.md
│   │   ├── protocol-reference/
│   │   │   └── SKILL.md
│   │   ├── shift-report/
│   │   │   └── SKILL.md
│   │   ├── clinical-calculator/  # Phase 2
│   │   │   └── SKILL.md
│   │   ├── io-tracker/           # Phase 2
│   │   │   └── SKILL.md
│   │   └── unit-conversion/      # Phase 2
│   │       └── SKILL.md
│   ├── agents/
│   │   └── clinical-router.md    # Phase 2 — multi-domain orchestrator
│   ├── commands/                 # Slash commands
│   └── hooks/                    # Tier 1 safety guardrails
│       ├── hooks.json
│       └── scripts/
│           ├── sanitize-input.sh
│           ├── validate-calculator.sh
│           ├── validate-dosage.sh
│           ├── validate-units.sh
│           └── validate-negation.sh
├── tools/                        # Deterministic tool implementations
│   ├── drug-lookup/              # OpenFDA label lookup
│   │   └── lookup.sh
│   ├── clinical-calculators/     # 10 calculators
│   │   ├── lib/common.sh         # Shared output + scoring helpers
│   │   ├── gcs.sh
│   │   ├── nihss.sh
│   │   ├── apache2.sh
│   │   ├── wells-pe.sh
│   │   ├── wells-dvt.sh
│   │   ├── curb65.sh
│   │   ├── braden.sh
│   │   ├── rass.sh
│   │   └── cpot.sh
│   ├── fhir/                     # MIMIC-IV demo FHIR translation shim
│   │   └── mimic-loinc-query.sh
│   └── unit-conversions/         # Phase 2
│       └── convert.sh
├── knowledge/                    # Curated clinical reference data
│   ├── protocols/                # Evidence-based protocol definitions
│   │   ├── acls.md
│   │   ├── sepsis-bundle.md
│   │   ├── acute-stroke.md
│   │   ├── rapid-response.md
│   │   └── rsi.md
│   ├── drug-data/                # Cached/curated drug reference data
│   ├── drug-ranges.json          # Phase 2 — ISMP high-alert dosage ranges
│   ├── mimic-mappings.json       # MIMIC itemID-to-LOINC translation data
│   ├── FRESHNESS.md              # Phase 2 — knowledge provenance manifest
│   └── templates/                # Phase 2 — skill authoring standards
│       ├── skill-metadata-schema.md
│       ├── four-layer-output.md
│       └── cross-skill-triggers.md
├── infrastructure/
│   ├── docker-compose.yml        # Medplum full stack (postgres, redis, server, app)
│   ├── docker-compose.hapi-archive.yml  # Archived HAPI FHIR config (rollback)
│   └── load-mimic.sh             # MIMIC-IV demo download/decompress/load/verify flow
├── tests/
│   ├── drug-lookup/
│   │   └── test_lookup.sh
│   ├── clinical-calculators/     # 9 test files (one per calculator)
│   ├── fhir/
│   │   └── test_mimic_loinc_query.sh
│   ├── unit-conversions/         # Phase 2
│   │   └── test_convert.sh
│   ├── hooks/                    # Phase 2
│   │   └── test_hooks.sh
│   └── clinical-scenarios/       # Phase 2 — scenario-level test fixtures
│       ├── README.md
│       └── <skill>/              # One directory per skill
└── README.md
```

---

## Design Principles

1. **The workspace is the product.** Noah RN is an agent-native clinical workspace
   harness — Medplum provides the clinical data interface, multi-agent orchestration
   provides the intelligence, and structured skills encode Shane's 13 years of bedside
   pattern recognition into repeatable workflows.

2. **Deterministic before generative.** Drug interactions, scoring calculators, unit
   conversions — tool calls, not LLM inference.

3. **No PHI anywhere.** Nurse provides clinical context via natural language. Noah provides
   structure, knowledge, and workflow guidance. Nothing is stored.

4. **Subtractive bias.** Don't build what isn't needed yet. Each skill must justify its
   existence by solving a real bedside problem.

5. **Template-ready personalization.** The long-term direction is to adapt Noah to unit-
   specific report sheets, assessment forms, and protocol documents. That local-config
   layer is not built yet, so current skills stay on fixed shared structures.

6. **Charge nurse, not policy manual.** Noah is the experienced nurse next to you, not
   the binder on the wall. This means:
   - Give practical ranges and guidance, not rigid cutoffs — unless the cutoff IS hard
     (tPA window, defib joules). "Fluids for lactic over 2ish, but assess volume status
     first" beats "administer 30mL/kg when serum lactate exceeds 2.0 mmol/L."
   - "Per facility protocol" and "per provider order" are valid answers. Nursing care
     is ordered by physicians and governed by institutional policy. Noah doesn't order
     care — it helps you anticipate orders and organize what you already know.
   - Context caveats belong inline. A septic patient in respiratory failure with fluid
     overload is not getting a 30mL/kg bolus. The nurse knows this. Noah should too.
   - Be accurate and up-to-date with evidence-based guidelines, but present them the
     way an experienced nurse would explain them to a colleague — with practical nuance,
     not textbook rigidity.
   - The disclaimer is the design philosophy, not legal decoration. "You're the nurse,
     I'm the clipboard" is literal. Noah organizes, suggests, and reminds. The nurse
     assesses, decides, and acts.
   - **"Why we care" one-liners.** A single sentence connecting a task to its clinical
     meaning is a huge moat. "Lactate = global tissue hypoperfusion" plants a seed that
     sticks. Every protocol step and reference should carry this where it adds value.

7. **Clinical clipboard — three tiers of confidence.** Noah RN is a clinical clipboard.
   It organizes nurse-provided information, surfaces exact facts from curated references,
   and offers bounded anticipatory guidance. It does not diagnose, place orders, or
   silently convert local practice into universal protocol.
   - **Tier 1 — Standardized national guidance** (AHA, SSC, AHA/ASA): presented exactly
     as published. Hard numbers, hard timelines, exact doses.
   - **Tier 2 — Context-dependent bedside suggestions**: labeled as such. Practical
     ranges, "anticipate this order," clinical reasoning. The charge nurse voice.
   - **Tier 3 — Institution-specific rules**: require explicit local configuration.
     Noah does not guess facility policy. "Per facility protocol" until configured.

---

## Phase 2 Architecture

### Skill Metadata Schema

Every `SKILL.md` carries structured YAML frontmatter: `name`, `skill_version`, `description`,
`scope`, `complexity_tier`, `required_context`, `knowledge_sources`, `limitations`,
`completeness_checklist`. Serves dual purpose: routing logic for the clinical router agent
and machine-readable capability description for A2A readiness.

See `knowledge/templates/skill-metadata-schema.md`.

### Four-Layer Output Format

All skill outputs follow a layered structure:

1. **Summary** — actionable clinical synthesis, copy-paste ready, no preamble
2. **Evidence** — inline source citations on clinical claims, format: `(Source: [body] [year])`
3. **Confidence** — each section labeled with its tier (Tier 1 / Tier 2 / Tier 3)
4. **Provenance** — tool version, knowledge file used, last verified date

The skill's existing output format becomes the Summary layer. Evidence and Confidence
are additive, not replacements.

See `knowledge/templates/four-layer-output.md`.

### Three-Tier Confidence Model

- **Tier 1 — National guidelines** presented exactly as published. Hard numbers, hard
  timelines, exact doses. Source cited inline.
- **Tier 2 — Bedside guidance** labeled as such. Practical ranges, clinical reasoning,
  anticipatory guidance. The charge nurse voice.
- **Tier 3 — Facility-specific rules** defer to "per facility protocol." Noah does not
  guess institutional policy.

### Hooks Architecture (Tier 1 Safety Floor)

Deterministic bash scripts that run as Claude Code lifecycle hooks. Cannot be bypassed
by prompt manipulation. Configured in `plugin/hooks/hooks.json`.

| Hook | Trigger | Function |
|------|---------|----------|
| `sanitize-input.sh` | UserPromptSubmit | Prompt injection detection, clinical context validation |
| `validate-calculator.sh` | PostToolUse (Bash) | Score range plausibility — rejects physiologically impossible output |
| `validate-units.sh` | PostToolUse (Bash) | mg/mcg, mL/L, kg/lbs mismatch detection |
| `validate-dosage.sh` | PostToolUse (Bash) | High-alert medication dosage cross-reference against `knowledge/drug-ranges.json` |
| `validate-negation.sh` | PostToolUse (Bash) | Critical negation integrity checks for phrases like "no known allergies" and "do not resuscitate" |

Hooks Tier 2 (context-aware warnings) and Tier 3 (facility policy enforcement) are
implemented as prompt instructions, not hook scripts. Deterministic shell is used only
where deterministic validation is tractable.

### Clinical Router Agent

`plugin/agents/clinical-router.md` — orchestrates multi-domain requests. Routes ambiguous
or complex clinical scenarios to appropriate skills. Enforces thoroughness over speed.

Use when the request spans multiple clinical domains (e.g., "my patient is crashing,"
"new admission with sepsis and acute stroke," "help me get organized for this shift").
Single-skill requests (e.g., "calculate GCS," "look up metoprolol") route directly to
the relevant skill — the router is not a universal intermediary.

### Knowledge Provenance System

All protocol files in `knowledge/protocols/` carry YAML frontmatter:
`source`, `version`, `date`, `evidence_grade`, `last_verified`, `next_review`.

`knowledge/FRESHNESS.md` is the centralized manifest. It tracks status (CURRENT / STALE)
for every knowledge file. Review cadence: quarterly, or when the source guideline body
publishes an update. Stale files require Shane review before trusting output.

`knowledge/drug-ranges.json` holds ISMP high-alert medication dosage ranges (16 entries),
used by `validate-dosage.sh`.

### Local FHIR Platform

The clinical platform foundation is **Medplum** (v5.1.x), running on tower (10.0.0.184)
as a Docker stack: PostgreSQL, Redis, Medplum server (port 8103), and Medplum admin app
(port 3000). Medplum replaces the previous HAPI FHIR server and provides a TypeScript SDK,
built-in auth, bot automation, access policies, and React hooks for the frontend.

Current dataset: Synthea synthetic patients loaded via FHIR transaction bundles.
MIMIC-IV data migration is planned for a future phase.

The MIMIC-IV LOINC translation shim (`tools/fhir/mimic-loinc-query.sh`) remains available
for use once MIMIC data is loaded into Medplum.

```bash
# Medplum stack management
cd infrastructure/
docker compose up -d          # Start all 4 services
docker compose down           # Stop all services
docker compose logs -f medplum-server  # Server logs

# FHIR endpoint (requires auth)
curl -H "Authorization: Bearer $TOKEN" http://10.0.0.184:8103/fhir/R4/Patient?_summary=count

# Healthcheck (no auth required)
curl http://10.0.0.184:8103/healthcheck

# Admin UI
open http://10.0.0.184:3000
```

### Cross-Skill Awareness

`knowledge/templates/cross-skill-triggers.md` defines trigger rules that map clinical
findings to suggested follow-up skills. Examples: GCS < 8 suggests protocol-reference
(airway management); lactate > 2 suggests sepsis bundle follow-up.

Suggestions only — Noah never autonomously invokes a second skill. The nurse decides.

### PRD Right-Sizing Decisions

Items from the Phase 2 PRD that were dropped or converted, and why:

| Item | Disposition | Reason |
|------|-------------|--------|
| Centralized model interface | Dropped | Claude Code IS the interface — abstraction adds no value |
| Hooks Tier 2 (context-aware warnings) | Converted to prompt instructions | Deterministic shell can't evaluate clinical context; LLM handles it better |
| Hooks Tier 3 (facility policy enforcement) | Deferred | Requires local config system not yet built |
| Knowledge retrieval abstraction layer | Dropped | Retrieval = Read tool on files. No abstraction needed. |
| Agent Card JSON schema | Absorbed | Merged into skill metadata YAML frontmatter |

---

## Phase Plan

### Phase 0: Scaffold (Session 1)

**Goal:** Project structure exists, plugin manifest is valid, one trivial skill works end-to-end.

- [x] Initialize git repo with structure above
- [x] Write plugin.json manifest
- [x] Create a trivial "hello nurse" skill (proves the plugin works)
- [x] Verify plugin installs and skill triggers in Claude Code

**Completion criteria:** `claude plugin validate ./plugin` succeeds and `claude --plugin-dir ./plugin` loads the test skill.

---

### Phase 1: Core Skills (Sessions 2-5)

**Goal:** Four production-quality clinical skills that demonstrate the architecture.

Each skill follows TDD: spec → implement → test with real clinical scenarios → iterate.

#### Skill 1: Shift Assessment Workflow

- [x] Guided head-to-toe systematic assessment
- [x] Prompts nurse through each system (neuro, cardiac, respiratory, GI, GU, skin, pain, psychosocial)
- [x] Produces structured documentation language ready to paste into any EHR
- [x] Adapts depth based on acuity (ICU vs med-surg vs outpatient)
- [x] Flags critical findings that need immediate intervention

#### Skill 2: Drug Reference + Interactions

- [x] Query OpenFDA for drug information
- [x] Deterministic interaction checking (not LLM-generated)
- [x] Nursing-specific focus: administration routes, timing, monitoring parameters,
  hold parameters, common titration ranges
- [x] High-alert medication warnings (insulin, heparin, vasopressors, etc.)
- [x] Tool calls for the lookup; LLM for contextualizing results for the nurse

#### Skill 3: Protocol Checklists

- [x] Structured, step-by-step clinical protocol execution
- [x] Sepsis (SEP-1 bundle), Stroke (NIH Stroke Scale + tPA criteria),
  Rapid Response, ACLS, RSI
- [x] Each protocol: trigger criteria, time-critical actions, documentation requirements,
  escalation pathways
- [ ] Facility-specific protocol loading via uploaded PDFs (requires local config; not built yet)

#### Skill 4: Nurse Shift Report Generator

- [x] Nurse provides natural language shift summary → Noah structures it into a fixed 7-section handoff
- [ ] Upload and parse unit-specific report sheets into custom workflows (not built yet)
- [ ] Local template-driven handoff customization (requires local config; not built yet)
- [x] Supports common report styles: SBAR-based, systems-based, problem-based
- [x] Output is copy-paste ready for handoff

---

### Phase 2: Tools + Intelligence (Sessions 6-8)

**Goal:** Deterministic tools, safety hooks, cross-skill intelligence, and knowledge provenance.

- [x] Clinical calculators — 9 tools: GCS, NIHSS, APACHE II, Wells PE, Wells DVT, CURB-65, Braden, RASS, CPOT (NEWS2 added Phase 3)
- [x] Shared calculator library (`tools/clinical-calculators/lib/common.sh`) — output formatting, severity banding, disclaimer
- [x] Unit conversion tool (`tools/unit-conversions/convert.sh`) — weight-based dosing (dose), drip rate calculation (drip), unit conversion (unit)
- [x] I&O tracker skill (`plugin/skills/io-tracker/`) — fluid balance, shift totals, running 24h balance
- [x] Unit conversion skill (`plugin/skills/unit-conversion/`) — bedside dosing math wrapper over the tool
- [x] Clinical calculator skill (`plugin/skills/clinical-calculator/`) — skill wrapper routing to all 10 calculators
- [x] Clinical router agent (`plugin/agents/clinical-router.md`) — multi-domain orchestration
- [x] Hooks architecture (`plugin/hooks/`) — 5 deterministic safety scripts + hooks.json manifest
- [x] Knowledge provenance system — YAML frontmatter on all protocol files + `knowledge/FRESHNESS.md`
- [x] Skill metadata schema (`knowledge/templates/skill-metadata-schema.md`)
- [x] Four-layer output format (`knowledge/templates/four-layer-output.md`)
- [x] Cross-skill trigger rules (`knowledge/templates/cross-skill-triggers.md`)
- [x] ISMP high-alert drug ranges (`knowledge/drug-ranges.json`)
- [x] Test suite expansion — hooks tests, unit conversion tests, clinical scenario fixtures
- [x] Regulatory and limitation documentation (`docs/DEGRADATION.md`, `REGULATORY.md`, `LIMITATIONS.md`)

---

### Phase 3: Polish + Portfolio (Sessions 9-10)

**Goal:** Documentation, pitch materials, demonstration-ready state.

- [x] Architecture documentation (external audience) — `docs/ARCHITECTURE-EXTERNAL.md` *(2026-03-31)*
- [x] Skills catalog with clinical rationale — `README.md` Skills Catalog section *(2026-03-31)*
- [x] Demo walkthrough script — `docs/DEMO.md` *(2026-03-31)*
- [x] README that tells the story (nurse → engineer → this) — `README.md` *(2026-03-31)*
- [x] Competitive and market analysis — `docs/competitive-analysis.md` *(2026-04-01)*

### Phase 3 Additions

- [x] NEWS2 (National Early Warning Score 2) calculator — `tools/clinical-calculators/news2.sh`, 62 tests *(2026-04-01)*
- [x] Distillation cross-reference analysis — `docs/distillation-cross-reference.md` *(2026-04-01)*
- [x] SSC 2026 sepsis bundle update — `knowledge/protocols/sepsis-bundle.md` *(2026-04-01)*

---

## Skill Authoring Rules

- Skills are SKILL.md files with clear trigger conditions, workflow steps, and output formats.
- Every skill must include the YAML frontmatter defined in `knowledge/templates/skill-metadata-schema.md`.
- All skill output must follow the four-layer format defined in `knowledge/templates/four-layer-output.md`.
- One skill = one workflow. Don't combine unrelated concerns.
- Include explicit output format specifications. Copy-paste-ready text, not conversation.
- Include clinical safety guardrails: "This is decision support, not a substitute for
  clinical judgment. Verify all information against your facility's policies and current
  patient data."

---

## Clinical Domain Context

Baseline context to prevent obvious errors. Shane is available for domain questions.

### Nursing Documentation Basics
- **SBAR:** Situation, Background, Assessment, Recommendation — standard communication framework
- **Head-to-toe assessment:** Systematic physical assessment organized by body system
- **Shift report:** Handoff communication between outgoing and incoming nurses
- **MAR:** Medication Administration Record
- **I&O:** Intake and Output (fluid balance tracking)
- **Care plan:** Structured nursing interventions tied to nursing diagnoses

### Critical Care Specifics
- Patients typically 1:1 or 1:2 ratio (nurse to patient)
- Continuous monitoring: hemodynamics, ventilator settings, vasoactive drips
- Documentation frequency: often q1h for assessments
- High-alert medications: vasopressors, insulin drips, heparin, sedation, paralytics
- Common scoring: GCS (consciousness), RASS (sedation), CPOT (pain),
  Braden (skin), NIHSS (stroke), APACHE II (severity)

### Documentation Pain Points (What Noah RN Solves)
- Repetitive structured assessments that follow the same pattern every time
- Looking up drug info mid-shift when you can't leave the bedside
- Remembering exact protocol steps at 3am during a rapid response
- Generating organized shift reports after a chaotic 12 hours
- Translating clinical observations into proper documentation language

---

## Harness Integration

| Capability | Tool | Use in Noah RN |
|-----------|------|---------------|
| Session start | claude-mem:mem-search | Recall prior session context |
| Skill authoring | plugin-dev:skill-development | Writing clinical skills |
| Command authoring | plugin-dev:command-development | Writing slash commands |
| Agent authoring | plugin-dev:agent-development | Writing clinical agents |
| Skill optimization | optimize-skill | Auditing skill prompt quality |
| API docs | context7 | Before integrating any external API |
| Durable knowledge | obsidian | Clinical decisions to Eve vault |
| Session memory | claude-mem | Track decisions across sessions |

---

## Strategic Context

Noah RN is an agent-native clinical workspace harness for critical care nursing.
Medplum provides the clinical data interface; multi-agent orchestration and structured
skills provide the intelligence layer. The system demonstrates how clinical expertise
translates into context-aware agent architecture — FHIR patient data, deterministic
tools, and nursing knowledge converging under orchestration to deliver maximally useful
bedside output.

The pitch: "I didn't just use AI — I built a clinical workspace where patient data,
nursing knowledge, and agent orchestration converge. 14 years of ICU experience
encoded into architecture, not just prompts."
