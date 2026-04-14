# Noah RN — Regulatory Positioning

> Compliance-ready, not compliance-driven. Guidelines are clinical knowledge inputs, not architectural pillars.

---

## CDS Exemption (21st Century Cures Act)

noah-rn qualifies for the Clinical Decision Support (CDS) exemption from FDA SaMD classification under 21 U.S.C. § 520(o)(1)(E). The four-part test:

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Not intended to acquire, process, or analyze a medical image | PASS | No image processing. Text-only I/O. |
| Intended to display, analyze, or print medical information | PASS | Displays protocol references, calculates clinical scores, structures nursing assessments. |
| Intended to support recommendations to a healthcare professional | PASS | All outputs are drafts for nurse review. Skills produce structured documentation, not autonomous recommendations. |
| Intended to enable the HCP to independently review the basis for recommendations | PASS | Four-layer output: summary + evidence + confidence + provenance. Nurse sees what, why, how confident, and where it came from. |

**Classification: Not a medical device under current use. No FDA submission required.**

### Function-Level Positioning

Not all noah-rn functions sit equally under the CDS exemption. FDA's January 2026 CDS guidance indicates software addressing time-critical decisions or providing disease risk scores may fail Criterion 3.

| Function | CDS Exempt? | Rationale |
|----------|-------------|-----------|
| Shift assessment | Yes | Documentation organization — no clinical decisions |
| Shift report | Yes | Handoff structuring — no clinical decisions |
| I&O tracker | Yes | Data categorization and arithmetic — no clinical decisions |
| Drug reference | Yes | Displaying FDA label data — information retrieval |
| Unit conversion | Yes | Deterministic math — calculation aid |
| Clinical calculators | Needs careful positioning | Risk scoring tools (GCS, APACHE II, Wells) could be viewed as disease risk stratification under updated Criterion 3. However, these are published scoring systems presented as calculation aids, not proprietary algorithms. |
| Protocol reference | Needs careful positioning | Time-critical protocol guidance (ACLS, stroke tPA window) could be viewed as addressing time-critical decisions. However, these are reference materials (equivalent to a pocket card), not autonomous alerting. |

**Current risk:** LOW. noah-rn is a local, non-production system (legacy Claude Code plugin surface plus the current `pi.dev` / Medplum-backed local lane) — no PHI, no deployment, no commercial distribution. These distinctions matter for future commercialization, not current use.

---

## HITL Category II

noah-rn is documentation assistance with human-in-the-loop — not a decision engine.

- Produces reviewable drafts. Never autonomous decisions.
- The nurse assesses, decides, and acts. Noah organizes, suggests, and reminds.
- "You're the nurse, I'm the clipboard" is literal architecture, not marketing.

---

## Architectural Constraints (regulatory-derived)

These are baked in, not bolted on:

- No skill may produce output without human review opportunity
- No autonomous clinical decisions — drafts only, always
- No image analysis (would fail criterion 1 above)
- No direct EHR writes (would imply autonomous action)
- Deterministic safety checks (Tier 1 hooks) cannot be bypassed by prompt manipulation
- All outputs include provenance footer with source attribution
- Confidence tier labels (Tier 1/2/3) prevent automation bias

---

## What noah-rn Is NOT

- Not a medical device (CDS exempt per above)
- Not diagnostic software
- Not a prescribing system
- Not an EHR integration
- Not a replacement for clinical judgment
- Not HIPAA-regulated — handles no PHI. Nurse provides context verbally; nothing is stored or transmitted.

---

## Regulatory Watch (not yet applicable)

| Item | Timeline | Relevance |
|------|----------|-----------|
| California AB 3030 | Active | AI disclosure in healthcare. Already satisfied by provenance footer. |
| Colorado SB 205 | June 2026 | Duty of care, impact assessments. Template for ~20 states following. |
| HIPAA Security Rule overhaul | ~240 days from May 2026 finalization | Relevant only if noah-rn ever touches real PHI. Not today. |
| EU AI Act | August 2026 applicability | Healthcare AI = high-risk classification. Relevant if international distribution. |

Note: As of March 2026, no generative AI / LLM-based medical device has received full FDA clearance.
