---
name: optimize-skill
description: >-
  Audit a Noah RN skill prompt against the optimization standard. Checks convention
  compliance, identifies procedural bloat, measures token budget, and produces a
  structured optimization report with specific reduction recommendations. Use when
  asked to "optimize skill", "audit skill", "check skill optimization", or
  "/optimize-skill <skill-name>".
args: "<skill-name> [--fix]"
---

# /optimize-skill

Audit a single skill's SKILL.md against `plugin/OPTIMIZATION-STANDARD.md` and produce a structured report. Optionally generate an optimized candidate.

## Inputs

- `<skill-name>`: Name of the skill directory under `plugin/skills/` (e.g., `shift-report`, `hello-nurse`)
- `--fix` (optional): After producing the report, generate an optimized SKILL.md candidate for review

## Execution

### 1. Load References

Read these files (all paths relative to repo root):

```
plugin/OPTIMIZATION-STANDARD.md
plugin/CONVENTIONS.md
plugin/skills/<skill-name>/SKILL.md
```

If the skill doesn't exist, report: "Skill '<skill-name>' not found. Available: " and list `plugin/skills/*/`.

### 2. Convention Compliance Checks

For each shared section in CONVENTIONS.md, search the SKILL.md for duplicated content:

| Convention Section | Duplication Signal |
|---|---|
| Trace Logging Protocol | `trace.sh init`, `trace.sh input`, `trace.sh output`, `trace.sh hooks`, `trace.sh done` appearing as inline code blocks (not just a reference) |
| Confidence Tiers | Tier definition table or tier explanation prose (tier *assignments* for this skill are fine) |
| Universal Rules | Verbatim copies of "Copy-paste ready", "No fabrication", "No diagnosis", "No unsolicited commentary", "Preserve nurse language", "Fail plainly", "Deterministic first" |
| Disclaimer | Inline disclaimer text or a disclaimer selection pool embedded in the skill |
| Provenance Footer | Provenance pattern explanation (the actual footer line in output format is fine) |
| Cross-Skill Suggestions | Cross-skill trigger logic duplicated from conventions |
| Acuity Convention | Full ICU/Med-surg/Outpatient indicator lists duplicated (a one-line reference to the convention is fine) |

Check for the convention reference line: `> **Conventions**: This skill follows plugin/CONVENTIONS.md`

**Score**: Count of duplicated sections found. 0 = pass. Each duplicate = one finding.

### 3. Prompt Architecture Checks

Scan for these anti-patterns:

| Anti-Pattern | Detection |
|---|---|
| Receive Input step | Section header matching "Receive Input" or "Accept Input" or instructions to "accept the nurse's free-text" as a numbered workflow step |
| Obvious directives | Phrases: "parse what is provided", "read the file", "detect intent", "identify which.*wants", "extract.*from.*question" as procedural instructions (not as part of clinical logic) |
| Procedural wrappers | Phrases: "Map the nurse's input to", "Read the nurse's original question and select", "Run the.*tool.*First find" wrapping tool calls or format specs |
| Step-by-step padding | Workflow steps that contain only "do the obvious thing" instructions with no non-obvious decision logic or clinical content |

**Score**: Count of anti-patterns found.

### 4. Clinical Content Audit

Verify these are present and intact:

| Content Type | Check |
|---|---|
| Important Rules section | Exists with safety-critical behavioral constraints |
| Tool invocation syntax | Bash commands with exact argument formats (if skill uses tools) |
| Output format specs | Format examples or templates defining the output structure |
| Clinical reference data | Thresholds, flag criteria, scoring tables, high-alert lists (skill-dependent) |
| Evidence & Confidence | Section exists with skill-specific tier assignments |

**Score**: Count of missing elements. 0 = pass.

### 5. Token Budget Check

Measure the SKILL.md file size in bytes. Compare against the complexity tier target from the YAML frontmatter:

| Tier | Target |
|---|---|
| simple | < 3,500 bytes |
| moderate | < 6,000 bytes |
| complex | < 9,000 bytes |

Calculate: `current_bytes`, `target_bytes`, `delta`, `percent_of_target`.

If no `complexity_tier` in frontmatter, flag as a finding and use `moderate` as default.

### 6. Structure Check

Verify YAML frontmatter contains all required fields:
`name`, `skill_version`, `description`, `scope`, `complexity_tier`, `required_context`, `knowledge_sources`, `limitations`, `completeness_checklist`, `hitl_category`

Check description includes natural trigger phrases (at least 3 distinct phrases a nurse would say).

Check section ordering: frontmatter → intro → convention reference → workflow → evidence → rules.

## Output Format

Produce this report:

```
# Optimization Report: <skill-name>

## Summary
- Convention compliance: <PASS|n findings>
- Prompt architecture: <PASS|n anti-patterns>
- Clinical content: <PASS|n missing>
- Token budget: <current> / <target> bytes (<percent>%) — <PASS|OVER|UNDER 50%>
- Structure: <PASS|n issues>
- **Overall**: <OPTIMIZED|NEEDS WORK — n total findings>

## Convention Compliance
<list each finding with the duplicated section name and line range>

## Prompt Architecture
<list each anti-pattern found with the offending text (truncated to 80 chars)>

## Clinical Content
<list any missing elements, or "All critical content present.">

## Token Budget
- File: plugin/skills/<skill-name>/SKILL.md
- Current: <n> bytes
- Target: <n> bytes (<tier>)
- Delta: <+/-n> bytes (<percent>%)
<budget assessment>

## Structure
<list any frontmatter gaps or ordering issues>

## Recommendations
<numbered list of specific, actionable changes ranked by token savings>
<each recommendation includes: what to change, estimated byte savings, and whether it affects clinical content (yes/no)>
```

If `--fix` was passed, after the report, generate an optimized SKILL.md candidate in a fenced code block. Preserve all clinical content. Apply only the recommendations from the report. Add a diff summary of what changed.

## Rules

- This command is read-only by default. It does NOT modify skill files unless `--fix` is passed, and even then it only proposes — the user reviews.
- Never remove clinical reference data, safety rules, tool syntax, or output format specs.
- The optimization standard checklist (`plugin/OPTIMIZATION-STANDARD.md`) is the single source of truth for what "optimized" means.
- Report findings factually. No subjective quality judgments beyond the checklist.
- If a skill scores OPTIMIZED on all checks, say so and skip the recommendations section.
