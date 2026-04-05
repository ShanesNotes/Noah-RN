# Noah RN — Skill Optimization Standard

Checklist for what "optimized" means for a Noah RN skill prompt. Derived from the NOA-121 scaffolding audit and NOA-123/NOA-133 conventions extraction work.

---

## Convention Compliance

- [ ] **References CONVENTIONS.md** — includes the one-line convention reference block:
  `> **Conventions**: This skill follows plugin/CONVENTIONS.md for trace logging, confidence tiers, disclaimers, provenance footer, cross-skill suggestions, acuity convention, and universal rules.`
- [ ] **No duplicated shared sections** — trace logging, disclaimer pool, universal rules, confidence tier definitions, provenance footer pattern, cross-skill suggestion pattern, and acuity convention are NOT repeated in the skill. Each is handled by the CONVENTIONS.md reference.
- [ ] **Skill-specific tier assignments only** — Evidence & Confidence section lists which content in *this* skill maps to which tier. Does not re-explain what tiers mean.

## Prompt Architecture

- [ ] **Outcome specs, not procedures** — describes *what* the skill produces, not step-by-step instructions for how to produce it. A SOTA model infers execution from outcome specs.
- [ ] **No "Receive Input" steps** — no instructions to "accept the nurse's input and parse it." The model does this when given an outcome spec.
- [ ] **No obvious directives** — nothing a SOTA model would do by default (e.g., "read the file," "parse what is provided," "detect intent from context"). If the model needs it, it's not obvious.
- [ ] **Procedural wrappers removed** — steps like "Map the nurse's input to..." or "Read the nurse's original question and select..." are removed. The format spec and examples are sufficient.
- [ ] **Minimal workflow framing** — workflow steps exist only when they encode non-obvious sequencing or decision logic the model wouldn't infer.

## Clinical Content Preservation

- [ ] **Reference data intact** — clinical thresholds, flag criteria, high-alert lists, scoring tables, system frameworks, section templates, and tool argument formats are preserved exactly. This is the product.
- [ ] **"Why we care" one-liners preserved** — clinical rationale attached to thresholds and flags stays.
- [ ] **Safety-critical rules preserved** — anti-fabrication rules, deterministic-first rules, Important Rules section untouched.
- [ ] **Tool invocation syntax preserved** — exact bash commands and argument formats for deterministic tools.
- [ ] **Output format specs preserved** — format examples that define the skill's output structure.

## Token Efficiency

- [ ] **Byte budget met** — skill SKILL.md is within target for its complexity tier:
  - `simple`: < 3,500 bytes
  - `moderate`: < 6,000 bytes
  - `complex`: < 9,000 bytes
- [ ] **No redundant cross-references** — doesn't re-explain content that lives in another skill or in CONVENTIONS.md. A one-line pointer is sufficient.
- [ ] **Compact reference tables** — clinical data presented in tables or terse lists, not prose paragraphs.

## Structure

- [ ] **YAML frontmatter complete** — name, skill_version, description (trigger phrases), scope, complexity_tier, required_context, knowledge_sources, limitations, completeness_checklist, hitl_category.
- [ ] **Description is trigger-rich** — includes the natural phrases a nurse would use to invoke this skill. This is the routing surface.
- [ ] **Sections ordered**: frontmatter → intro (outcome spec) → convention reference → workflow/structure → evidence & confidence → important rules.

## Verification

- [ ] **Tested against realistic scenario** — at least one clinical scenario that a 13-year ICU nurse would encounter, producing output they'd actually use.
- [ ] **No behavioral regression** — optimized skill produces equivalent or better output compared to pre-optimization version on the same inputs.
- [ ] **Copy-paste ready output** — output renders correctly when pasted into a chart, handoff sheet, or communication tool.
