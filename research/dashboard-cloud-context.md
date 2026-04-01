# Noah-RN MIMIC-IV Dashboard — Cloud Iteration Context

> **Purpose:** Self-contained briefing for a claude.ai session. Everything you need to help me scaffold a clinical dashboard framework for my Noah-RN project. You have no access to my local files, tools, or codebase — this document IS your context.

---

## Who I Am

Shane. 14-year licensed RN, 13 years critical care at a Level 1 trauma center (Grand Rapids, MI). Deep ICU — ventilators, hemodynamics, code/rapid response, complex drips. Self-taught engineer. Building Noah-RN as a solo project.

**Communication style:** Terse, dense, high-signal. No hand-holding. Challenge me when my reasoning is flawed. Prefer simple working solutions over clever abstractions.

---

## What Noah-RN Is

An **agentic nurse assistant** — a Claude Code plugin + companion project. Clinical decision support and structured nursing workflows. NOT documentation/scribing.

### Hard Constraints
- **No PHI.** Synthetic/de-identified data only. Build-time and test harness only.
- **No production EHR.** Local FHIR server with MIMIC-IV demo data.
- **CLI-first.** The core product is a Claude Code plugin with skills, agents, hooks.
- **Deterministic before generative.** If it can be computed (scores, interactions, conversions), use a tool — don't ask an LLM to do math.

### What Exists Today (Phase 2 complete)
- **8 clinical skills:** shift-assessment, drug-reference, protocol-reference, shift-report, clinical-calculator, io-tracker, unit-conversion, hello-nurse (scaffold)
- **9 deterministic calculators:** GCS, NIHSS, APACHE-II, Wells PE, Wells DVT, CURB-65, Braden, RASS, CPOT
- **Clinical router agent** with cross-skill awareness
- **4 safety hooks** (input sanitization, calculator validation, dosage validation, unit validation)
- **Drug lookup tool** via OpenFDA
- **FHIR translation shim** (MIMIC itemID-to-LOINC mapping)
- **560+ tests passing**

---

## Current FHIR Infrastructure

### Server
- **Host:** `tower` (10.0.0.184, local network, 62GB RAM, 12 cores, Ubuntu 24.04)
- **Software:** HAPI FHIR R4 v8.8.0 (Docker + PostgreSQL 16)
- **Endpoint:** `http://10.0.0.184:8080/fhir`
- **Auth:** None (local network only)

### Dataset: MIMIC-IV Clinical Database Demo on FHIR v2.1.0
- **100 real ICU patients** from Beth Israel Deaconess Medical Center
- **928,935 total FHIR resources** (verified)
  - 100 Patients
  - 813,540 Observations (vitals, labs, micro)
  - 5,051 Conditions (ICD-9/ICD-10 discharge diagnoses)
  - 17,552 MedicationRequests
  - ~9,150 resources per patient (vs Synthea's ~100-300)
- **24 FHIR profiles** including: Patient, Organization, Location, Encounter, EncounterED, Condition, Procedure, ProcedureICU, MedicationRequest, MedicationDispense, MedicationAdministration, MedicationAdministrationICU, MedicationStatementED, MedicationDispenseED, Specimen, ObservationChartevents, ObservationLabevents, ObservationMicroTest/Org/Susc, ObservationVitalsigns, ObservationOutputevents

### What Works
| Query | Status |
|-------|--------|
| Patient demographics | Works |
| Vital signs (category=vital-signs) | Works |
| Lab results (category=laboratory) | Works |
| Survey observations | Works |
| LOINC shim queries (creatinine, K+, WBC, Hgb, lactate, ABGs) | Works |
| Patient census / pagination | Works |

### What Doesn't Work (Demo Limitations)
| Query | Issue |
|-------|-------|
| `Condition?clinical-status=active` | Returns empty — clinicalStatus often absent |
| `MedicationRequest?status=active` | Returns empty — status unreliable |
| `Encounter?status=in-progress` | Returns empty — all encounters historical |
| `Observation?code=29463-7` (body weight) | Returns empty — no weight mapping |
| `AllergyIntolerance?patient={id}` | Returns empty — **no allergy data in MIMIC-IV** |

### Known Data Gaps
1. **No allergy data** — AllergyIntolerance resources absent entirely
2. **No Braden scale scores** — not in MIMIC-IV
3. **No clinical notes** — FHIR conversion doesn't include notes
4. **Date-shifted** — all timestamps in 2100-2200 range (de-identification)
5. **No RxNorm codes** — medications use NDC/GSN, need crosswalk for interactions
6. **Medication display names often empty** — `Medication.code.text` and `code.coding` unpopulated

### LOINC Mapping Layer (Critical)
MIMIC Observations use local itemIDs, not LOINC. A translation shim exists (`mimic-loinc-query.sh` + `mimic-mappings.json`). Key mappings:

| LOINC | MIMIC itemID(s) | Name |
|-------|-----------------|------|
| 8867-4 | 220045 | Heart rate |
| 8480-6 | 220050 | Arterial systolic BP |
| 8462-4 | 220051 | Arterial diastolic BP |
| 8478-0 | 220052 | Arterial mean BP |
| 9279-1 | 220210 | Respiratory rate |
| 59408-5 | 220277 | Pulse oximetry |
| 8310-5 | 223761, 223762 | Temperature |
| 2160-0 | 50912 | Creatinine |
| 2823-3 | 50971 | Potassium |
| 6690-2 | 51300, 51301 | WBC |
| 718-7 | 51222, 50811 | Hemoglobin |
| 2524-7 (alias) | 50813 | Lactate |
| 6598-7 | 51003 | Troponin T |
| 11558-4 | 50820 | pH |
| 11557-6 | 50818 | pCO2 |
| 11556-8 | 50821 | pO2 |

---

## Dashboard MVP Requirements

These come from our project planning (paperclip agent team). The dashboard is envisioned as a **Phase 3** deliverable.

### Core Views

1. **Multi-Patient Assignment View** — Nurse has 4-6 ICU patients. Dashboard-style overview: acuity snapshot, pending tasks, critical values, time-sensitive items across the full assignment.

2. **Patient Summary on Demand** — Demographics, conditions, medication history, recent encounters in a concise nursing-relevant summary. (Allergies absent — known gap.)

3. **Lab Trend Tracking** — Sequential Observations over 24h/48h/72h for WBC, creatinine, lactate, hemoglobin. Trend arrows with rate-of-change context.

4. **Vitals Time-Series** — ICU charting every 1-4 hours. HR, BP (art + non-invasive), RR, SpO2, temp. Need good visualization for these.

5. **Medication Administration Timeline** — Full workflow: orders, dispensing, administration, ICU drip rates. Vasopressor tracking (norepi, vaso, phenyl, epi, dopa) with rate values and timestamps.

6. **Alert Generation** — Flag critical lab values, trending concerns ("K+ has been trending up for 3 draws"), overdue items.

7. **SBAR Handoff Report** — Auto-generated shift report from FHIR data. Pre-populated with historical state, recent labs, pending actions, key watch items.

### Design Principles
- **Charge nurse voice.** The experienced colleague, not a textbook.
- **Copy-paste-ready outputs** where applicable (shift reports, summaries).
- **Three confidence tiers.** Tier 1: national guidelines (exact). Tier 2: bedside suggestions (labeled). Tier 3: facility-specific (deferred).
- **Nurse-first UX.** A 13-year ICU nurse should look at this and think "yes, this is how I actually work."

---

## Prior Art Explored

Our planning agents researched the following:

| Tool | Assessment |
|------|-----------|
| **Medplum** (`@medplum/react`) | **Recommended.** `PatientSummary` component gives ~80% of dashboard free. Connects directly to HAPI FHIR. Open source. |
| **fhir-react** | Lighter weight FHIR component library. Less opinionated than Medplum. |
| **SMART on FHIR apps** | Standard launch framework. Good for EHR-embedded apps. Overkill for local dev harness. |
| **Cerner Terra Clinical** | Cerner-specific component library. Not relevant for standalone. |
| **OpenMRS** | Full EMR platform. Way too heavy. |

The recommendation was Medplum, but I want to **re-evaluate with fresh eyes** — especially considering tools that may have been released or updated recently.

---

## Open Questions for This Session

1. **Remotion** — I've seen this mentioned for programmatic video/animation in React. Is there a use case here for generating animated clinical timeline visualizations, shift summary videos, or trend presentations? Or is this a hammer looking for a nail?

2. **Framework selection** — Is Medplum still the right call? What about:
   - Newer FHIR-native React libraries released in 2025-2026?
   - General-purpose dashboard frameworks (Tremor, Shadcn charts, Recharts, Nivo) connected to FHIR?
   - Full-stack options (Refine, AdminJS) with FHIR data providers?
   - Purpose-built clinical visualization tools?

3. **Static vs real-time rendering** — Our data is historical/batch (MIMIC demo). But the architecture should support eventual real-time FHIR subscriptions. How to design for both?

4. **CLI integration** — Noah-RN is a CLI plugin. The dashboard could be:
   - A separate web app that complements the CLI
   - A CLI-launched local web server (like `npm run dev` but for patient data)
   - Terminal-based (blessed, ink, etc.) for pure CLI
   - Something else entirely

5. **Vitals visualization specifically** — What's the best library for ICU-style vital sign trending? Need: multi-parameter overlay (HR + BP + SpO2 on one timeline), configurable time windows, critical value highlighting, annotation support.

6. **Component architecture** — How to structure this so components are reusable across the multi-patient view, individual patient drill-down, and SBAR report generation?

7. **Offline-first** — The FHIR server is local. Should the dashboard cache aggressively? Use service workers? Or keep it simple with direct queries?

---

## What I Want From This Session

### Deliverables

1. **Framework selection rationale** — Evaluate options with pros/cons. Give me a recommendation with reasoning, not a menu.

2. **Component architecture** — What components, how they compose, data flow between them. Think in terms of the 7 core views listed above.

3. **Data access layer design** — How the dashboard talks to HAPI FHIR. Query patterns, caching strategy, the LOINC mapping problem.

4. **Vitals visualization approach** — Specific library recommendation with rationale for ICU-style trending.

5. **Implementation sequence** — What to build first, what depends on what. Phase it so each increment is usable.

6. **Gap analysis** — Given the MIMIC data limitations (no active status, no allergies, date shifting), what dashboard features are fully buildable vs need workarounds vs are blocked?

### How to Work

- Start with questions if anything is ambiguous. Don't assume.
- Give me your honest assessment, not what you think I want to hear.
- If Remotion is a bad fit, say so. If Medplum is still the right call, say so.
- Dense output. I'll ask for elaboration where I need it.
- Reference specific libraries/tools by name with version where relevant.
- Think like you're advising a solo developer who needs maximum leverage from minimum complexity.
