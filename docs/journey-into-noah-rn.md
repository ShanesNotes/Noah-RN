# Journey Into Noah RN

A clinical decision support system built in 84 commits across 6 days by a 14-year ICU nurse who decided the bedside needed better tooling than what Silicon Valley was shipping.

---

## 1. Project Genesis

The gap is obvious if you have worked a twelve-hour shift in an ICU. You are two hours into your night, your septic patient in room 10 is crashing, and you need to confirm amiodarone dosing for the third time this month because the number matters and your memory at 3am is not the same as your memory at 7am. You could dig through UpToDate on a shared workstation across the unit. You could flip through laminated cards in a pocket you can barely reach under your gown. You could ask the charge nurse, who is already managing a rapid response two doors down.

Or you could have a tool that already knows the protocol, already has the dosing math, and gives you what you need without making you leave the bedside.

That is where Noah RN starts. Not in a product meeting or a startup pitch deck, but in the daily friction of critical care nursing. Shane, a 14-year licensed RN with 13 years at a Level 1 trauma center in Grand Rapids, Michigan, had spent enough shifts watching clinical AI promise ambient documentation while ignoring the decision-support gap that actually kills workflow. ChartWell AI and its peers do ambient scribing well. Nobody was building the structured clinical decision support layer that a nurse actually reaches for mid-shift.

The choice to build it as a Claude Code plugin rather than a web application was deliberate and architectural. A web UI means another tab, another login, another context switch away from the patient. A CLI plugin means the tool lives inside the same environment where Shane already works as an engineer. More importantly, it means the tool's behavior is defined by skills (structured prompts with deterministic tool calls), not by a freeform chat interface. Skills are repeatable. Skills are testable. Skills encode 13 years of pattern recognition into something a machine can execute consistently.

The choice to focus on decision support rather than documentation was equally deliberate. Documentation is a solved problem with funded companies. The unsolved problem is the nurse at the bedside who needs to recall the exact epinephrine interval during a code, calculate a GCS on a confused patient while charting on another, or check whether the levophed dose makes sense for the patient's weight. These are deterministic questions with deterministic answers, and they were being delegated to LLM inference or, worse, to fatigued human memory.

Noah RN's first commit landed on March 26, 2026 at 7:49pm Eastern: `Phase 0: scaffold project structure and plugin manifest`. By 8:41pm, the first clinical skill (shift-assessment) was functional. By 9:27pm, the drug reference skill with OpenFDA integration was live. By 10pm, all five protocol knowledge files (ACLS, sepsis, acute stroke, rapid response, RSI) were committed. Four production skills shipped in a single evening session. The velocity was not reckless; it was the velocity of someone who already knew exactly what needed to exist because they had needed it at the bedside for a decade.

## 2. The Phase 2 Sprint (March 30)

Phase 1 delivered four core skills. Phase 2, which landed primarily on the evening of March 30, was the engineering infrastructure that turned those skills from useful prompts into a clinical system.

The session began at 6:34pm with an architecture review. Shane had 31 architectural patterns distilled from 15 research reports, and the task was to implement the ones that mattered. The Phase 2 implementation plan was created, and then the build began in earnest.

The clinical calculators came first. GCS (Glasgow Coma Scale) got the shared library treatment: `tools/clinical-calculators/lib/common.sh` established output formatting, severity banding, and the mandatory disclaimer pattern that every subsequent calculator would inherit. Then NIHSS for stroke, APACHE II for ICU severity, Wells PE and Wells DVT for clot risk, CURB-65 for pneumonia, Braden for skin breakdown risk, RASS for sedation level, CPOT for pain assessment. Nine calculators, each a bash script that takes component values and returns a deterministic score. No LLM inference in the math path. The GCS calculator does not ask Claude what 3+4+5 equals; it computes it.

This is the core architectural principle, stated explicitly in ARCHITECTURE.md as principle number 2: "Deterministic before generative. Drug interactions, scoring calculators, unit conversions — tool calls, not LLM inference." It appears simple. It is not. It means maintaining a parallel tool layer in bash alongside the skill layer in prompts, with hooks that validate the tool output before the LLM ever sees it. It means the system has a split personality by design: the calculators are rigidly correct, the skill wrappers are flexibly contextual, and the hooks enforce the boundary between them.

The Wells DVT calculator alone carried 23 tests. The sepsis threshold phrasing was validated against the Surviving Sepsis Campaign 2021 guidelines (later updated to SSC 2026 on April 1). The skill metadata schema, four-layer output format, and cross-skill trigger system were all created and documented. The I&O tracker, unit conversion skill, and clinical calculator skill wrapper rounded out the tool surface.

The evening ended with ACLS golden tests covering VF arrest, PEA, bradycardia, SVT, sepsis, and stroke scenarios, plus drug reference and calculator test suites. Then the version was bumped to 0.2.0 and Phase 2 was documented as complete.

And then a Codex code review tore it open.

## 3. The Hook Contract Bug Saga and the Testing Philosophy Pivot

Observation #182 in the timeline records what happened next: "Phase 2 Codex review revealed critical safety and implementation gaps that triggered immediate fix work." The Codex review (running GPT-5.4 as an adversarial code reviewer) found that all four safety hook scripts had incorrect field names per the Claude Code specification.

This was not a minor formatting issue. The hooks are the Tier 1 safety floor. `validate-calculator.sh` checks that calculator output falls within physiologically possible ranges. `validate-dosage.sh` cross-references medication doses against ISMP high-alert ranges in `knowledge/drug-ranges.json`. `validate-units.sh` catches mg/mcg and mL/L mismatches. `sanitize-input.sh` screens for prompt injection on every user submission. If these hooks silently fail because they are reading the wrong field from the Claude Code hook contract, they are not safety hooks. They are decoration.

Observations #185 through #190 track the multi-stream parallel fix effort: all four hook scripts, their configurations in `hooks.json`, and their test suites were updated to match the actual Claude Code hook contract. The field name correction propagated through every script, every test, every config. This was not a single-file fix; it was a contract alignment across the entire safety layer.

The saga matters because it validates the architectural decision to make safety deterministic rather than prompt-based. A prompt-based safety instruction can be ignored or overridden by a sufficiently creative input. A bash script that reads `tool_name` from the hook payload and exits if it does not match "Bash" cannot be prompt-injected. But it can have the wrong field name, and when it does, it fails silently. The fix was not to add more safety; it was to make the existing safety actually work.

The same review cycle triggered an even more significant change. Observations #193 and #196 record the testing philosophy pivot: test scenarios were redesigned from isolated protocol queries to full patient encounter scenarios. The old approach tested whether the sepsis skill could recite the hour-1 bundle. The new approach tested whether a nurse receiving a urosepsis patient at shift change could use Noah RN's skills naturally through the entire workflow: shift report, drug reference, protocol recall, calculator, I&O tracking, and unit conversion, all exercised through a single realistic patient encounter.

## 4. The First Patient Encounter

Observation #197 is the inflection point of the entire project. Shane dictated the first patient encounter scenario in his own voice: a 62-year-old male with urosepsis, admitted overnight, on levophed through a triple-lumen central line, trending lactate down from 4.2 to 2.8, confused but redirectable, NPO with a questionable 20-gauge in the right AC, a foley that probably needs flushing, and a wife named Marsha who is anxious for the doctors.

The handoff reads like a nurse giving report, because it is a nurse giving report:

> "He's been a little tachy but controlled under 120. Blood pressures are soft but stable now on the levo. Got 1+/1+ pulses, weak, thready. The residents just want a MAP over 65."

> "He does have a catheter. Marginal urine output. It's very cloudy and almost amber colored. Smells gross too. Definitely urosepsisy."

> "For lines, he's got the left IJ triple lumen and then a 20 gauge in his right AC. But the 20 gauge is kinda leaky. I did change the dressing once but I wouldn't trust it honestly."

This is not a textbook vignette. This is a shift report with colloquialisms, clinical judgment calls, incomplete tasks, and the kind of practical detail that only appears when the person writing the scenario has actually given this report hundreds of times. "Definitely urosepsisy" is not clinical language. It is bedside language. And it exercises six skills naturally through one patient: shift-report (structure the handoff), drug-reference (check the zosyn and levo), protocol-reference (sepsis bundle compliance), clinical-calculator (lactate trending, potential GCS), io-tracker (fluid balance with the maintenance saline question), and unit-conversion (drip rate verification).

The encounter format became canonical. By March 31, fourteen encounter scenarios existed: urosepsis, STEMI post-arrest, acute stroke with tPA, respiratory failure with RSI (including a hyperkalemia contraindication to succinylcholine), med-surg pneumonia, ICU long-stay with skin breakdown, postop DVT workup, medication reconciliation with unknown history, rapid response, drip calculation, DKA insulin drip, hypertensive emergency, ARDS ventilator management with paralytic, and out-of-scope edge cases. Combined with 36 legacy per-skill scenarios, the test suite hit 50 scenarios on March 31 and expanded to 80 by April 1.

Each scenario carries a severity rating (critical, moderate, low), a YAML schema with `must_contain` and `must_not_contain` concept tags, and a `must_not_contain_anywhere` safety floor that applies to every skill output in the encounter: no autonomous clinical decisions, no fabricated findings, no diagnosis or prescribing, no missing safety disclaimer. The scenarios are not automated. Shane reviews them manually, because the judgment about whether a clinical output is safe is itself a clinical judgment.

## 5. Safety Architecture

Five Tier 1 hooks form the deterministic safety floor. They run as Claude Code lifecycle hooks, configured in `plugin/hooks/hooks.json`, and they cannot be bypassed by prompt manipulation.

`sanitize-input.sh` fires on every `UserPromptSubmit`. It screens for prompt injection patterns and validates that clinical context is present before routing to clinical skills. The remaining four fire on `PostToolUse` for Bash commands: `validate-calculator.sh` rejects physiologically impossible scores (a GCS above 15, a Braden below 6), `validate-dosage.sh` cross-references output against 16 ISMP high-alert medication ranges in `drug-ranges.json`, `validate-units.sh` catches unit category mismatches, and `validate-negation.sh` flags critical negation phrases.

The negation hook (observation #288) deserves specific attention. It detects DNR/DNI status, NKA/NKDA allergy negation, NPO status, medication holds, and comfort care designations. These are phrases where getting the negation wrong is catastrophic: "DNR" and "full code" are opposites with life-or-death consequences. But the hook is flag-only. It never blocks. The design decision is explicit: negation context requires clinical interpretation that a bash script cannot provide. The hook surfaces the presence of safety-critical negation language. The nurse interprets it. This is the "clinical clipboard" philosophy made concrete: Noah organizes and surfaces. The nurse decides.

The three-tier confidence model reinforces this architecture from the content side. Tier 1 content (AHA ACLS guidelines, SSC sepsis bundles) is presented exactly as published with hard numbers and hard timelines. Tier 2 content (bedside suggestions, practical ranges, anticipatory guidance) is labeled as the "charge nurse voice." Tier 3 content (facility-specific rules) defers to "per facility protocol" because Noah does not guess institutional policy. The tiers are not just conceptual; they are tagged in skill output and enforced through the four-layer output format (Summary, Evidence, Confidence, Provenance).

A nurse builds safety differently than an engineer would. An engineer thinks about input validation, error handling, and type safety. A nurse thinks about what happens when someone reads the wrong number at 3am. The hook architecture reflects both: it is engineered as deterministic bash scripts with proper exit codes and JSON parsing, but it is designed around clinical failure modes. The dosage validator does not check for SQL injection. It checks whether the levophed dose exceeds the range where a nurse should pause and verify the order.

## 6. The FHIR Decision

Observation #218 records the FHIR strategy decision: build-time testing only with synthetic data. The tension is real. Clinical decision support that cannot access patient data is limited. Clinical decision support that accesses production EHR data carries regulatory, legal, and safety obligations that a solo developer cannot responsibly shoulder.

Shane resolved this by deploying a HAPI FHIR R4 server on his tower machine (10.0.0.184:8080, 62GB RAM, 12 cores, Ubuntu 24.04) loaded with the MIMIC-IV Clinical Database Demo v2.1.0 from PhysioNet. One hundred synthetic patients with 813,540 observations, 5,051 conditions, and 17,552 medication requests. Realistic enough to validate clinical workflows. Synthetic enough to carry zero PHI risk.

The infrastructure includes a complete load pipeline (`infrastructure/load-mimic.sh` with download, decompress, load, and verify stages), a LOINC translation shim (`tools/fhir/mimic-loinc-query.sh`) that bridges Noah's LOINC queries to MIMIC itemIDs, and a data quality profile of what the FHIR server can and cannot provide. The operational constraints are documented explicitly: observation-backed workflows work, but active-condition filtering, active-medication filtering, allergies, in-progress encounters, and direct weight lookup are constrained by the source data.

The hard constraint is carved into CLAUDE.md: "No PHI handling, storage, or logging. Nurse provides context, Noah provides structure." The FHIR server exists for the developer to validate that skills produce correct output against patient-shaped data. It does not exist for runtime use. This is the kind of decision that a practitioner makes differently than a product manager: the product manager sees a feature gap, the practitioner sees a liability boundary.

## 7. Enter Paperclip: Scaling with Agents

By March 31, Noah RN had a single-developer bottleneck. Shane was the domain expert, the architect, and the only engineer. The solution was not to hire humans; it was to instantiate a simulated company.

Observation #265 records the creation of Paperclip, a project management system for agent-driven development. A CEO agent named Jimmy began operating with heartbeat execution and task assignment. Jimmy promoted technical debt cleanup to high priority before Phase 3, initiated the Phase 3 Polish and Portfolio work stream, and proposed hiring a second engineer.

Observation #291 describes the hiring: Dev, a Claude Sonnet 4.6 instance, was onboarded alongside the existing founding engineer Wiz (GPT-5.4). The model diversity was intentional, not accidental. Different models catch different bug classes. Wiz had already found the hook contract bugs through code review. Dev created the DKA insulin drip, hypertensive emergency, ARDS ventilator, and out-of-scope edge case scenarios that pushed the test suite to 50 encounters.

Then came the Jethro Principle (observation #385). Named after Jethro, Moses' father-in-law who told him to stop trying to judge every case himself and delegate to capable subordinates, this architecture proposed a Foreman layer managing five specialized free-model contractor agents: Scout (research), Forge (implementation), Turbo (quick tasks), Flash (validation), and Scribe (documentation). The free models handle non-safety-critical work. The paid models review. No free model ever touches clinical safety logic.

This is solo development scaled through simulation. One human with domain expertise, multiple AI agents with different capabilities, a governance layer that prevents any single agent from shipping clinical content without review. The organizational design mirrors the clinical safety architecture: deterministic guardrails at the base, intelligent routing in the middle, human judgment at the top.

## 8. Where It Stands

As of April 1, 2026, Noah RN has shipped through Phase 3 across 84 commits:

Eight production-ready skills: shift-assessment, drug-reference, protocol-reference, shift-report, clinical-calculator, io-tracker, unit-conversion, and hello-nurse. Ten deterministic calculators (GCS, NIHSS, APACHE II, Wells PE, Wells DVT, CURB-65, Braden, RASS, CPOT, NEWS2). Five Tier 1 safety hooks with 64 tests. A clinical router agent with intent classification, context validation, and A2A agent card metadata. A knowledge provenance system with YAML frontmatter, freshness tracking, and quarterly review cadence. Eighty golden test cases in the encounter-based schema.

The FHIR infrastructure runs on dedicated hardware with 100 synthetic patients. The sepsis bundle has been updated to SSC 2026 guidelines. The competitive analysis positions Noah RN against the ambient documentation market. The README tells the story from practitioner to builder.

Phase 3 additions include NEWS2 (62 tests), a distillation cross-reference analysis, a GitHub Actions CI pipeline, and a PR-based workflow policy. The eval harness supports dynamic validation and candidate prompt overlays for A/B testing skill prompts.

## 9. Where It's Going

Noah RN is also a portfolio piece for ChartWell AI, the ambient clinical documentation company. The pitch is not "I used AI." The pitch is "I built a clinical agentic system that shows how curated nursing expertise maps to skill-based architecture." ChartWell's Provider Workstation and Clinical Chat features would naturally expand into decision support. Noah RN demonstrates what that expansion looks like when built by someone who has worked the bedside.

The free model workforce architecture (Jethro Principle) is the scaling strategy. Five specialized agents handling research, implementation, quick tasks, validation, and documentation, with mandatory review gates and a prohibition on touching safety-critical clinical logic. The phased rollout starts with Scout (research) and expands as trust is established.

The longer-term vision includes facility-specific protocol loading via uploaded PDFs, template-driven handoff customization, and the local-config layer that enables Tier 3 confidence content. These are the features that turn Noah from a general clinical reference into a unit-specific workflow tool. They are deliberately deferred because they require infrastructure (local config system, PDF parsing, template engine) that does not yet exist and should not be built until the base layer is proven.

## 10. Token Economics

The 143 observations in the claude-mem timeline represent 2,184,504 discovery tokens across 16 sessions in 3 days. That is the cost of all original work: reading code, making decisions, writing implementations, running tests, reviewing output. The average observation cost 15,276 tokens to produce.

The compression ratio tells the real story. Those 2.18M tokens of original work are compressed into structured observations that can be retrieved and reasoned about without replaying the full sessions. When a new agent needs to understand the hook contract fix, it does not replay the 65,000-token session where the bug was found and fixed. It reads a structured observation that captures the decision, the rationale, and the outcome. The 96% compression savings are not about storage cost. They are about context window efficiency: the ability to load an entire project history into a working session without exhausting the context budget.

March 31 consumed 1.5M tokens across 15 sessions. That single day accounts for 72% of the observation volume and 69% of the total token spend. It was the day the test philosophy pivoted, the FHIR server was profiled, the agent workforce was designed, and Phase 2 was declared complete. The token concentration reflects the reality that some days are architectural watersheds and others are incremental.

## 11. The Meta-Story

There is a particular kind of tool that only gets built by someone who has needed it and could not find it. Noah RN is that kind of tool.

The clinical AI market is full of products built by engineers who consulted nurses. Noah RN was built by a nurse who learned engineering. The difference shows up in details that are invisible to non-practitioners: the choice to say "Definitely urosepsisy" in a test scenario instead of "presentation consistent with urosepsis of urinary origin." The decision to make the negation hook flag-only because a bash script should not decide whether a DNR order is clinically appropriate. The principle that "per facility protocol" is a valid answer, not a cop-out, because nursing care is ordered by physicians and governed by institutional policy and an AI tool that pretends otherwise is dangerous.

The project was built in 84 commits across 6 days. It has 10 calculators, 8 skills, 5 safety hooks, 80 test scenarios, a FHIR test harness, a simulated engineering organization, and a clear positioning against the ambient documentation market. It was built by one person with a Claude Code subscription, a home server, and 13 years of watching patients.

The charge nurse voice that permeates the project is not a design decision that was made in a meeting. It is the default voice of someone who has been the charge nurse. "Fluids for lactic over 2ish, but assess volume status first" is not a prompt instruction. It is how Shane has explained sepsis management to new nurses for over a decade. Noah RN just makes it repeatable.

The tool that did not exist at the bedside now exists in a git repository. Whether it reaches the bedside is a question for ChartWell, or for whatever comes next. But the architecture is sound, the safety floor is deterministic, and the test scenarios are written by someone who has lived them. That is not a common combination in clinical AI, and it is the reason the project matters.
