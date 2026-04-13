# Agent Harness Model Selection Notes

Status: advisory only
Owner surface: `packages/agent-harness/`

This file captures practical model-routing notes for the current Noah RN workspace.
It is intentionally **non-binding**. Runtime should continue to treat model identifiers as
opaque provider-specific settings, and should prefer **profiles** over hardcoded model names.

## Why this exists

The current router already classifies requests by:
- skill
- required context
- complexity tier (`simple`, `moderate`, `complex`)

What is still missing is an explicit recommendation for **which model profile should handle which task shape**.
These notes fill that gap without changing current runtime behavior.

## Recommended policy shape

Route by **profile**, not raw model name.

Suggested profiles:
- `fast_router` — cheap, fast classification and direct routing
- `deterministic_worker` — structured transformations around tool calls
- `clinical_reasoner` — stronger reasoning for ambiguous or narrative clinical tasks
- `high_fidelity_reasoner` — deepest reasoning for cross-skill synthesis, failure recovery, or edge cases

## Core rule

If a tool does the hard part, do **not** spend an expensive reasoning model unless the request is ambiguous.

Examples:
- calculators
- unit conversions
- I&O totaling
- structured extraction with fixed schema

These should usually use a lighter model profile plus deterministic tools.

## Suggested profile by complexity tier

| Complexity tier | Default profile | Why |
|---|---|---|
| `simple` | `fast_router` | Intent is obvious; little synthesis required |
| `moderate` | `deterministic_worker` | Usually single-domain with formatting/tool use |
| `complex` | `clinical_reasoner` | Ambiguity, multi-skill routing, or narrative synthesis |

Escalate to `high_fidelity_reasoner` when:
- routing remains ambiguous after first pass
- multi-skill orchestration is required
- output quality fails validation or needs retry
- a long free-text narrative needs careful synthesis into a bedside artifact

## Skill-level routing notes

| Skill | Usual task shape | Recommended profile | Notes |
|---|---|---|---|
| `hello-nurse` | greeting / verification | `fast_router` | No need for expensive reasoning |
| `unit-conversion` | deterministic math | `deterministic_worker` | Tool-first; model mainly validates inputs and formats output |
| `neuro-calculator` | structured score calculation | `deterministic_worker` | Escalate to `clinical_reasoner` if the user gives messy narrative instead of components |
| `risk-calculator` | structured score calculation | `deterministic_worker` | Same escalation rule as other calculators |
| `acuity-calculator` | structured score calculation | `deterministic_worker` | Escalate if chart context is incomplete or mixed-format |
| `io-tracker` | categorization + totaling | `deterministic_worker` | Escalate when intake/output entries are embedded in long narrative text |
| `drug-reference` | lookup / warnings / hold parameters | `fast_router` for simple lookup; `deterministic_worker` for structured reference output | Escalate to `clinical_reasoner` if the question blends multiple meds or broader clinical context |
| `protocol-reference` | guideline retrieval | `clinical_reasoner` | Protocol questions often need context gating even when the source is deterministic |
| `shift-report` | structured handoff synthesis | `clinical_reasoner` | Promote to `high_fidelity_reasoner` for long, messy, multi-problem signout |
| `shift-assessment` | structured clinical narrative | `clinical_reasoner` | Promote to `high_fidelity_reasoner` for dense free-text bedside narratives |
| router (`clinical-router`) | triage / decomposition / orchestration | `clinical_reasoner` | Use `high_fidelity_reasoner` only for difficult ambiguous or multi-skill cases |

## Suggested concrete model classes

These are examples only. Keep runtime configuration provider-agnostic.

| Profile | Anthropic-style example | OpenAI-style example | Gemini-style example | Use for |
|---|---|---|---|---|
| `fast_router` | Haiku-class | mini / fast class | Flash-class | intent classification, direct skill dispatch |
| `deterministic_worker` | Haiku-class or Sonnet-class | mini class | Flash-class or Pro-class | tool-oriented structured tasks |
| `clinical_reasoner` | Sonnet-class | flagship reasoning/general model | Pro-class | protocol guidance, narrative organization, multi-skill routing |
| `high_fidelity_reasoner` | Opus-class | top reasoning class | highest-reasoning tier available | difficult synthesis, retries, fallback rescue |

## Practical preference order

### 1. Router
- first pass: `fast_router` for obvious single-skill requests
- escalate to `clinical_reasoner` when intent is ambiguous, multi-domain, or clinically messy

### 2. Tool-heavy deterministic skills
Use `deterministic_worker`:
- `unit-conversion`
- `neuro-calculator`
- `risk-calculator`
- `acuity-calculator`
- `io-tracker`

### 3. Narrative organization skills
Use `clinical_reasoner`:
- `shift-report`
- `shift-assessment`

### 4. Reference synthesis skills
- `drug-reference`: usually `fast_router` or `deterministic_worker`
- `protocol-reference`: usually `clinical_reasoner`

## Escalation rules

Escalate one profile tier when any of the following are true:
- input matches more than one skill with similar confidence
- required context is present but poorly structured
- prior output failed a format or completeness check
- the response needs cross-skill synthesis rather than single-skill execution

Possible ladder:
```text
fast_router -> deterministic_worker -> clinical_reasoner -> high_fidelity_reasoner
```

## Safety and privacy notes

- Do not let model strength override deterministic-tool requirements.
- Do not hardcode vendor model IDs inside workflow contracts unless runtime requires it.
- Respect project privacy boundaries and any local-only handling constraints for patient data.
- For PHI-sensitive paths, local routing / de-identification policy should decide whether frontier-hosted models are allowed.

## Minimal implementation recommendation

If implementing this later, the smallest useful policy is:
1. keep `packages/workflows/registry.json` as the authoritative workflow inventory
2. let `packages/agent-harness/router/clinical-router.md` assign `simple` / `moderate` / `complex`
3. map complexity tier + selected skill to a model profile
4. log selected profile, escalation, and retry count for every invocation

## Non-goals

These notes do **not**:
- change current router behavior
- define provider contracts
- authorize external transmission of patient data
- replace workflow-specific safety constraints
