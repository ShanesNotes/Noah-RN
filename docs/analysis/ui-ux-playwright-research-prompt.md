You are conducting deep research to help a UI/UX coding agent build the earliest professional clinician-facing Noah-RN workspace surfaces.

Important framing:
- This is not generic design inspiration research.
- This is not “find pretty healthcare dashboards.”
- This is research for an implementation-oriented coding agent that will actively use Playwright during development.
- The target environment is Noah-RN, a Medplum-backed clinical workspace project.
- The primary clinician-facing app is `apps/nursing-station/`.
- The sidecar runtime/debug app is `apps/clinician-dashboard/`.
- Medplum is the canonical clinical workspace substrate.
- `services/clinical-mcp/` is the agent-facing context boundary.
- The UX north star is Epic-like professional workflow quality.
- OpenEMR and other open-source EHRs are prior art sources, not direct templates.

Your job:
Produce a research report that directly helps a UI/UX coding agent use Playwright as a first-class development instrument while building Noah-RN’s early clinician workspace foundations.

The final output should help answer:
1. What clinician workflow surfaces should be built first?
2. How should a coding agent use Playwright to inspect, iterate, verify, and document those surfaces during development?
3. What specific browser-driven workflows, artifact captures, and validation loops are most useful for a Medplum-backed EHR-like app?
4. How should Playwright be used not only for testing, but for design verification, workflow review, and screenshot/video evidence generation?

Repository/project context to incorporate
Use the following project context as part of the research frame:
- existing repo research and docs mention:
  - `research/medplum-react-workspace-research.md`
  - `research/epic-ehr-ux-workflow-patterns-for-clinicians.md`
  - `research/openemr-workflow-prior-art-analysis.md`
  - `docs/foundations/medplum-deep-dive.md`
  - `docs/foundations/clinical-workspace-scaffold.md`
  - `docs/foundations/medplum-primary-workspace-note.md`
  - `docs/foundations/medplum-architecture-packet.md`
  - current app split between nursing-station and clinician-dashboard
- known repo doctrine:
  - Medplum = primary clinician workspace substrate
  - nursing-station = clinician-facing workspace
  - clinician-dashboard = sidecar runtime console / observability
  - agents should consume assembled context through clinical-mcp, not direct ad hoc FHIR querying
- known UI direction:
  - persistent patient header
  - overview-first patient chart
  - assignment/worklist orientation
  - explicit reviewed/acknowledged states
  - provenance and draft/final review for AI-generated artifacts
  - Medplum substrate with Epic-like workflow quality and selective OpenEMR borrowing

Research scope
Focus on the intersection of these domains:
A. clinician workflow UX
B. Medplum-backed workspace constraints
C. Playwright-driven frontend development and verification
D. AI coding-agent workflows

Specifically research these areas:

1. Playwright as a UI/UX development tool, not just a test runner
Research best practices for using Playwright to support:
- rapid iteration on app shell/navigation
- validating persistent headers and route transitions
- checking data-dependent empty states / loading states / error states
- console/network inspection during UI development
- screenshot capture for design review
- video capture or step-by-step interaction capture for workflow review
- using Playwright traces, screenshots, and logs as artifacts for agent self-correction
- headless default vs headed review/demo mode

2. Playwright patterns for EHR-like / data-dense professional apps
Research how Playwright is best used for applications with:
- authenticated sessions
- patient-context switching
- data tables / worklists
- chart tabs or left-rail navigators
- long pages with dense structured information
- asynchronous fetch-heavy behavior
- role-specific states
- critical UI states such as overdue / abnormal / acknowledged / reviewed

3. Browser-driven design verification loops for coding agents
Find strong patterns for instructing a coding agent to:
- inspect the browser before editing
- reproduce a workflow end-to-end
- capture before/after artifacts
- verify “this now feels right” with concrete criteria instead of vibes
- compare screenshots or UI structure over time
- catch silent regressions such as broken fetches, stale routing, missing data, hidden panels, layout overflow, or state badge disappearance

4. Playwright artifact strategies that matter for Noah-RN
Research what artifact bundle is most useful for a coding agent building clinician-facing UI. For example:
- full-page screenshot
- targeted panel screenshot
- console log
- failed network requests
- saved HTML snapshot
- trace file
- video/GIF
- DOM extraction or accessibility tree

Explain which artifacts are highest value for:
- chart shell work
- worklist work
- results review work
- medication/MAR-lite work
- handoff/provenance/draft-review work

5. Authentication/session strategy for Medplum-backed Playwright workflows
Research practical guidance for using Playwright with a Medplum-backed app:
- fresh isolated browser contexts by default
- storage/session clearing
- when to preserve auth state vs when to start fresh
- how to avoid session bleed, stale route bugs, and false positives during development
- whether Brave-specific execution matters vs default Chromium for development automation

6. Agent instruction patterns
Research how to write high-quality prompts/instructions for a UI coding agent using Playwright. I want concrete instruction patterns that tell the agent how to:
- choose headless vs headed mode
- capture the right evidence
- verify clinician workflow quality, not just page load success
- keep development grounded in professional workflow goals
- avoid “looks good to me” without evidence

Desired output format
Make the report maximally useful for implementation agents.
Do not write it as a fluffy essay.
Organize it into sections like:

1. Executive summary
2. What Playwright should be used for in Noah-RN
3. Recommended development/verification loop for UI agents
4. Recommended artifact bundle per UI feature class
5. Session/auth/browser strategy
6. Headless vs headed guidance
7. Playwright-specific acceptance criteria for early Noah-RN surfaces
8. Example agent instructions/prompts
9. Risks and anti-patterns
10. Actionable recommendations for Noah-RN now

Make the report especially useful for these early foundation surfaces:
- persistent patient header
- overview page
- assignment/worklist
- results review states
- provenance/draft-final review surfaces
- chart navigation shell

Very important constraints
- prioritize practical, implementation-grade advice over general QA theory
- prioritize Playwright uses that help AI coding agents self-correct during development
- keep Epic/OpenEMR/Medplum workflow context in frame
- do not drift into generic test-framework comparison unless it directly helps Noah-RN
- do not suggest replacing Medplum as substrate
- do not suggest turning clinician-dashboard into the primary chart UI
- do not optimize for visual novelty; optimize for professional workflow confidence

What I want at the end
I want a report that a coding agent can use as direct doctrine for:
- how to build the first clinician workspace surfaces
- how to use Playwright during development to validate them
- how to produce evidence that the UI is becoming more professionally usable, not just more visually polished
