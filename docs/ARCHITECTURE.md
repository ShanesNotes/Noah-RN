# Noah RN — Architecture & Build Plan

> Read this before building any skill or starting a new phase.
> For session-level directives, see `.claude/CLAUDE.md`.

---

## Form Factor: Hybrid Plugin + Project

```
noah-rn/
├── .claude/
│   ├── CLAUDE.md                 # Session directives (always loaded)
│   └── settings.json
├── plugin/                       # The installable Claude Code plugin
│   ├── .claude-plugin/           # Plugin manifest directory
│   │   └── plugin.json
│   ├── skills/                   # Clinical skills (the core product)
│   │   ├── shift-assessment/
│   │   │   └── SKILL.md
│   │   ├── drug-reference/
│   │   │   └── SKILL.md
│   │   ├── protocol-reference/
│   │   │   └── SKILL.md
│   │   └── shift-report/
│   │       └── SKILL.md
│   ├── agents/                   # Clinical agents (if needed)
│   ├── commands/                 # Slash commands
│   └── hooks/                    # Guardrails
├── tools/                        # Deterministic tool implementations
│   ├── drug-lookup/              # OpenFDA / RxNorm integration
│   ├── clinical-calculators/     # GCS, NIHSS, APACHE II, Wells, CURB-65, etc.
│   └── unit-conversions/         # Clinical unit conversions
├── knowledge/                    # Curated clinical reference data
│   ├── protocols/                # Evidence-based protocol definitions
│   ├── drug-data/                # Cached/curated drug reference data
│   └── templates/                # Uploaded nurse report templates
├── docs/                         # This file + pitch materials
│   ├── ARCHITECTURE.md
│   ├── SKILLS-CATALOG.md
│   └── CHARTWELL-PITCH.md
├── tests/
└── README.md
```

---

## Design Principles

1. **Skills are the product.** Each skill encodes a real nursing workflow as a structured,
   repeatable, prompt-driven process. Shane's 13 years of clinical pattern recognition
   made executable.

2. **Deterministic before generative.** Drug interactions, scoring calculators, unit
   conversions — tool calls, not LLM inference.

3. **No PHI anywhere.** Nurse provides clinical context via natural language. Noah provides
   structure, knowledge, and workflow guidance. Nothing is stored.

4. **Subtractive bias.** Don't build what isn't needed yet. Each skill must justify its
   existence by solving a real bedside problem.

5. **Template-driven personalization.** Nurses upload their unit's specific report sheets,
   assessment forms, and protocol documents. Noah adapts to their tools, not the reverse.

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

---

## Phase Plan

### Phase 0: Scaffold (Session 1)

**Goal:** Project structure exists, plugin manifest is valid, one trivial skill works end-to-end.

- [ ] Initialize git repo with structure above
- [ ] Write plugin.json manifest
- [ ] Create a trivial "hello nurse" skill (proves the plugin works)
- [ ] Verify plugin installs and skill triggers in Claude Code

**Completion criteria:** `claude plugin validate ./plugin` succeeds and `claude --plugin-dir ./plugin` loads the test skill.

---

### Phase 1: Core Skills (Sessions 2-5)

**Goal:** Four production-quality clinical skills that demonstrate the architecture.

Each skill follows TDD: spec → implement → test with real clinical scenarios → iterate.

#### Skill 1: Shift Assessment Workflow

- Guided head-to-toe systematic assessment
- Prompts nurse through each system (neuro, cardiac, respiratory, GI, GU, skin, pain, psychosocial)
- Produces structured documentation language ready to paste into any EHR
- Adapts depth based on acuity (ICU vs med-surg vs outpatient)
- Flags critical findings that need immediate intervention

#### Skill 2: Drug Reference + Interactions

- Query OpenFDA and/or RxNorm APIs for drug information
- Deterministic interaction checking (not LLM-generated)
- Nursing-specific focus: administration routes, timing, monitoring parameters,
  hold parameters, common titration ranges
- High-alert medication warnings (insulin, heparin, vasopressors, etc.)
- Tool calls for the lookup; LLM for contextualizing results for the nurse

#### Skill 3: Protocol Checklists

- Structured, step-by-step clinical protocol execution
- Start with: Sepsis (SEP-1 bundle), Stroke (NIH Stroke Scale + tPA criteria),
  Rapid Response, Code Blue, Falls protocol
- Each protocol: trigger criteria, time-critical actions, documentation requirements,
  escalation pathways
- Nurse can load custom facility protocols from uploaded PDFs

#### Skill 4: Nurse Shift Report Generator

- Nurse uploads their unit's specific report sheet (usually a hardcopy form)
- Noah parses the template structure and generates a matching digital workflow
- Nurse provides natural language shift summary → Noah structures it into template format
- Supports common report styles: SBAR-based, systems-based, problem-based
- Output is copy-paste ready for handoff

---

### Phase 2: Tools + Intelligence (Sessions 6-8)

**Goal:** Deterministic tools and cross-skill intelligence.

- [ ] Clinical calculators (GCS, NIHSS, APACHE II, Wells, CURB-65, Braden, RASS, CPOT)
- [ ] Unit conversion tool (weight-based dosing, drip rate calculations, I&O totals)
- [ ] Agent routing — dispatch skill that understands nursing context
- [ ] Cross-skill awareness (assessment findings trigger relevant protocol suggestions)

---

### Phase 3: Polish + Portfolio (Sessions 9-10)

**Goal:** Documentation, pitch materials, demonstration-ready state.

- [ ] Architecture documentation (for ChartWell audience)
- [ ] Skills catalog with clinical rationale
- [ ] Demo walkthrough script
- [ ] README that tells the story (nurse → engineer → this)

---

## Skill Authoring Rules

- Skills are SKILL.md files with clear trigger conditions, workflow steps, and output formats.
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
| TDD workflow | superpowers:test-driven-development | Every skill and tool gets tests |
| Parallel dispatch | superpowers:dispatching-parallel-agents | Build independent skills simultaneously |
| Plan execution | superpowers:executing-plans | Phase-by-phase build with checkpoints |
| Plugin creation | plugin-dev | Scaffold the plugin structure |
| Skill authoring | plugin-dev:skill-development | Write each clinical skill |
| Code review | superpowers:requesting-code-review | Review before phase completion |
| Git worktrees | superpowers:using-git-worktrees | Isolate feature work |
| Library docs | context7 | Look up OpenFDA, RxNorm API docs |
| Session memory | claude-mem | Track decisions across sessions |

---

## Strategic Context

Noah RN is also a portfolio piece for a potential role at ChartWell AI.
ChartWell does ambient clinical documentation ($34.99/mo, nurse-centric, voice-to-text,
HIPAA-compliant, PLG model with Fellow Program). Noah RN demonstrates ability to
architect the kind of skill-based clinical workflows that complement their platform —
specifically in the decision-support space their "Provider Workstation" and "Clinical Chat"
features would naturally expand into.

The pitch: "I didn't just use AI — I built a clinical agentic system that shows how
curated nursing expertise maps to skill-based architecture."
