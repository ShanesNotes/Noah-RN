# Noah-RN MIMIC-IV Dashboard — Cloud Iteration Context

> **Purpose:** Self-contained session brief. You have no local file access—document IS your context. Help scaffold clinical dashboard framework for Noah-RN.

---

## Who I Am

Shane. 14-year RN, 13yr critical care Level 1 trauma (Grand Rapids, MI). Deep ICU—ventilators, hemodynamics, codes, drips. Self-taught engineer, solo project.

**Communication style:** Terse, dense, high-signal. No hand-holding. Challenge flawed reasoning. Prefer simple working solutions over clever abstractions.

---

## What Noah-RN Is

**Agentic nurse assistant**—Claude Code plugin + companion project. Clinical decision support + structured workflows. NOT documentation/scribing.

### Hard Constraints
- **No PHI.** Synthetic/de-identified data. Build/test harness only.
- **No production EHR.** Local FHIR server, MIMIC-IV demo data.
- **CLI-first.** Core product: Claude Code plugin (skills, agents, hooks).
- **Deterministic first.** Computable items (scores, interactions, conversions) → tool, not LLM math.

### What Exists Today (Phase 2 complete)
- **8 clinical skills:** shift-assessment, drug-reference, protocol-reference, shift-report, clinical-calculator, io-tracker, unit-conversion, hello-nurse (scaffold)
- **9 deterministic calculators:** GCS, NIHSS, APACHE-II, Wells PE, Wells DVT, CURB-65, Braden, RASS, CPOT
- **Clinical router agent** with cross-skill awareness
- **4 safety hooks:** input sanitization, calculator validation, dosage validation, unit validation
- **Drug lookup tool** via OpenFDA
- **FHIR translation shim:** MIMIC itemID-to-LOINC mapping
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
  - ~9,150 resources/patient (vs Synthea ~100-300)
- **24 FHIR profiles:** Patient, Organization, Location, Encounter, EncounterED, Condition, Procedure, ProcedureICU, MedicationRequest, MedicationDispense, MedicationAdministration, MedicationAdministrationICU, MedicationStatementED, MedicationDispenseED, Specimen, ObservationChartevents, ObservationLabevents, ObservationMicroTest/Org/Susc, ObservationVitalsigns, ObservationOutputevents

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
4. **Date-shifted** — timestamps in 2100-2200 range (de-identification)
5. **No RxNorm codes** — medications use NDC/GSN, need crosswalk for interactions
6. **Medication display names often empty** — `Medication.code.text` and `code.coding` unpopulated

### LOINC Mapping Layer (Critical)
MIMIC Observations use local itemIDs, not LOINC. Translation shim exists (`mimic-loinc-query.sh` + `mimic-mappings.json`). Key mappings:

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

From project planning (paperclip agent team). Envisioned as **Phase 3** deliverable.

### Core Views

1. **Multi-Patient Assignment View** — 4-6 ICU patients. Dashboard overview: acuity snapshot, pending tasks, critical values, time-sensitive items across assignment.

2. **Patient Summary on Demand** — Demographics, conditions, medication history, recent encounters. Concise, nursing-relevant. (Allergies absent—known gap.)

3. **Lab Trend Tracking** — Sequential Observations over 24h/48h/72h: WBC, creatinine, lactate, hemoglobin. Trend arrows + rate-of-change context.

4. **Vitals Time-Series** — ICU charting every 1-4h: HR, BP (art + non-invasive), RR, SpO2, temp. Need solid visualization.

5. **Medication Administration Timeline** — Full workflow: orders, dispensing, administration, ICU drip rates. Vasopressor tracking (norepi, vaso, phenyl, epi, dopa) w/ rate values + timestamps.

6. **Alert Generation** — Flag critical lab values, trending concerns ("K+ trending up 3 draws"), overdue items.

7. **SBAR Handoff Report** — Auto-generated shift report from FHIR data. Pre-populated: historical state, recent labs, pending actions, key watch items.

### Design Principles
- **Charge nurse voice.** Experienced colleague, not textbook.
- **Copy-paste-ready outputs:** shift reports, summaries.
- **Three confidence tiers:** Tier 1 national guidelines (exact). Tier 2 bedside suggestions (labeled). Tier 3 facility-specific (deferred).
- **Nurse-first UX.** 13-year ICU nurse sees this: "yes, how I actually work."

---

## Prior Art Explored

Planning agents researched:

| Tool | Assessment |
|------|-----------|
| **Medplum** (`@medplum/react`) | **Recommended.** `PatientSummary` component gives ~80% of dashboard free. Connects directly to HAPI FHIR. Open source. |
| **fhir-react** | Lighter weight FHIR component library. Less opinionated than Medplum. |
| **SMART on FHIR apps** | Standard launch framework. Good for EHR-embedded apps. Overkill for local dev harness. |
| **Cerner Terra Clinical** | Cerner-specific component library. Not relevant for standalone. |
| **OpenMRS** | Full EMR platform. Way too heavy. |

Recommendation: Medplum. But re-evaluate with fresh eyes—especially tools released/updated recently.

---

## Open Questions for This Session

1. **Remotion** — Programmatic video/animation in React. Use case for animated clinical timeline visualizations, shift summary videos, trend presentations? Hammer looking for nail?

2. **Framework selection** — Medplum still right? Consider:
   - Newer FHIR-native React libs (2025-2026)?
   - General dashboard frameworks (Tremor, Shadcn charts, Recharts, Nivo) + FHIR?
   - Full-stack (Refine, AdminJS) w/ FHIR providers?
   - Purpose-built clinical viz?

3. **Static vs real-time rendering** — Data: historical/batch (MIMIC demo). Architecture should support eventual real-time FHIR subscriptions. Design for both?

4. **CLI integration** — Noah-RN is CLI plugin. Dashboard could be:
   - Separate web app complementing CLI
   - CLI-launched local web server (like `npm run dev` for patient data)
   - Terminal-based (blessed, ink, etc.) pure CLI
   - Other?

5. **Vitals visualization specifically** — Best library for ICU-style vital sign trending? Need: multi-parameter overlay (HR + BP + SpO2 on one timeline), configurable windows, critical value highlighting, annotation support.

6. **Component architecture** — Structure for reuse across multi-patient view, individual patient drill-down, SBAR report generation?

7. **Offline-first** — FHIR server local. Cache aggressively? Service workers? Or simple direct queries?

---

## What I Want From This Session

### Deliverables

1. **Framework selection rationale** — Evaluate options w/ pros/cons. Recommendation + reasoning, not menu.

2. **Component architecture** — Components, composition, data flow. Think in terms of 7 core views above.

3. **Data access layer design** — Dashboard → HAPI FHIR. Query patterns, caching strategy, LOINC mapping.

4. **Vitals visualization approach** — Specific library + rationale for ICU-style trending.

5. **Implementation sequence** — Build first/dependencies. Phase so each increment usable.

6. **Gap analysis** — MIMIC limitations (no active status, no allergies, date shifting): what features fully buildable vs need workarounds vs blocked?

### How to Work

- Start w/ questions if ambiguous. Don't assume.
- Honest assessment, not what you think I want.
- Remotion bad fit? Say so. Medplum right? Say so.
- Dense output. I'll ask for elaboration.
- Reference libs/tools by name + version.
- Advise solo developer: max leverage, min complexity.