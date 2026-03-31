# FHIR Integration — MIMIC-IV Clinical Database Demo on FHIR v2.1.0

> **No PHI. No production/runtime EHR use.**
> This infrastructure is a local build-time and test harness only.

---

## 1. Infrastructure Overview

### Server

| Component | Detail |
|-----------|--------|
| Host | `tower` — 10.0.0.184 (local network) |
| Specs | 62GB RAM, 12 cores, Ubuntu 24.04 |
| Software | HAPI FHIR R4 v8.8.0 (Docker) |
| Container | `hapi-fhir` (`--restart unless-stopped`) |
| FHIR endpoint | `http://10.0.0.184:8080/fhir` |
| Web UI (dev) | `http://10.0.0.184:8080` |
| Auth | None (local network only) |

Tower is separate from beelink (dev workstation) to keep the FHIR server running independently without competing for dev resources.

### Current Dataset

- Live HAPI state on 2026-03-31:
  - Closeout verification via `infrastructure/load-mimic.sh verify --fhir-server http://10.0.0.184:8080/fhir --expected-patients 100` reports `patients=100`, `observations=813540`, `conditions=5051`, `medication_requests=17552`.
  - PostgreSQL total resources stabilized at `928935` across a 5-second recheck.
  - Loader process `PID 94354` is no longer running.
- The demo remains date-shifted for validation use and should be treated as synthetic-style test data rather than real-calendar clinical data.
- Operational implication: Observation-backed workflows are now available on the demo import, but active-condition filtering, active-medication filtering, allergies, in-progress encounters, and direct weight lookup remain constrained by the source data.

### Operations

```bash
# Verify server is running
ssh tower "docker ps --filter name=hapi-fhir"

# Check FHIR capability statement
curl -s http://10.0.0.184:8080/fhir/metadata | head -20

# Quick patient census
curl -s "http://10.0.0.184:8080/fhir/Patient?_summary=count"

# Restart server
ssh tower "docker restart hapi-fhir"

# Load the MIMIC demo end-to-end
./infrastructure/load-mimic.sh download
./infrastructure/load-mimic.sh decompress
./infrastructure/load-mimic.sh load --allow-nonempty-server
./infrastructure/load-mimic.sh verify --expected-patients 100
```

`infrastructure/load-mimic.sh` is the source of truth for the demo flow:
- `download` pulls the PhysioNet MIMIC-IV FHIR Demo v2.1.0 NDJSON bundle
- `decompress` expands the `.ndjson.gz` files in place
- `load` PUTs the resources into HAPI in the required order
- `verify` checks the live server counts and basic resource availability
- `--allow-nonempty-server` bypasses the empty-server guard when reloading a populated demo instance

---

## 2. Use Cases for Noah-RN Skills

How each existing skill is expected to leverage FHIR patient context for testing and skill development.
On the current server, patient, encounter, condition, medication-history, and Observation data are available with demo-specific limits around active-state filtering and missing allergy/current-encounter coverage.

### Drug Reference
Cross-reference patient medication history against lookup results for interaction checking.
```
GET /MedicationRequest?patient={id}&status=active
GET /AllergyIntolerance?patient={id}
```
**Value:** Medication-history testing is possible against the demo, but allergy-aware interaction testing is currently blocked because `AllergyIntolerance` resources are absent.

### Clinical Calculators
Auto-populate calculator inputs from Observations (labs, vitals) instead of manual entry.
```
bash tools/fhir/mimic-loinc-query.sh 2160-0 <patient-id>         # Creatinine (CrCl calc)
GET /Observation?patient={id}&category=vital-signs&_sort=-date&_count=5
bash tools/fhir/mimic-loinc-query.sh 6690-2 <patient-id>         # WBC
bash tools/fhir/mimic-loinc-query.sh 2823-3 <patient-id>         # Potassium
```
**Value:** Generate realistic calculator inputs with physiologically consistent lab panels from loaded Observation data. Weight-dependent workflows still need a mapped weight itemID because the direct body-weight query remains empty.

### I&O Tracker
Use Observation-backed history to query survey-style entries and other recorded measurements for shift totals and trend inspection.
```
GET /Observation?patient={id}&category=survey&_sort=-date
```
**Value:** Observation history can now support cumulative tracking logic against patients with multi-day encounter histories.

### Protocol Reference
Contextualize protocols with patient data. Observation-backed triggers like lactate are now queryable, while condition status filtering remains conservative because `clinicalStatus` is often absent.
```
bash tools/fhir/mimic-loinc-query.sh 2524-7 <patient-id>         # Lactate
GET /Condition?patient={id}&clinical-status=active
```
**Value:** Diagnosis-backed and lab-triggered protocol context can now be exercised on the demo import, with the caveat that active-condition filtering is not reliable.

### Shift Report
Generate a partially pre-populated shift report skeleton from the data that is actually available today.
```
GET /Condition?patient={id}&clinical-status=active
GET /MedicationRequest?patient={id}&status=active
GET /Observation?patient={id}&category=laboratory&_sort=-date&_count=20
GET /Encounter?patient={id}&status=in-progress
```
**Value:** Historical diagnoses, medication history, encounters, and recent labs can support structural handoff testing now. True active-status filtering remains unreliable, and imported encounters do not surface as `status=in-progress`.

### Unit Conversion
Context-aware conversions — intended path is to pull patient weight from Observations for weight-based dose calculations once the weight mapping gap is closed.
```
GET /Observation?patient={id}&code=29463-7&_sort=-date&_count=1  # Body weight
```
**Value:** De-risk mcg/kg/min → mL/hr conversion workflows against the FHIR shape that will be used once a viable weight source is mapped.
**Note:** this query is not currently viable against the MIMIC demo; it needs a mapped weight itemID before the workflow can be exercised.

### Clinical Router
Route queries with patient context. The usable context now includes demographics, diagnosis/medication history, and recent lab/vital Observations.
```
GET /Patient/{id}
GET /Observation?patient={id}&category=laboratory&_sort=-date&_count=10
```
**Value:** Structural multi-skill routing can now include recent-lab context, while active-medication and active-condition routing still require conservative handling.

### Safety Hooks
Validate against the medication-history and condition data that are actually present on the current demo import.
```
GET /AllergyIntolerance?patient={id}
GET /MedicationRequest?patient={id}&status=active
GET /Condition?patient={id}&clinical-status=active
```
**Value:** Medication, diagnosis, and lab-backed checks can be exercised structurally, but allergy-driven safety checks remain blocked until an allergy source is added.

---

## 3. Future Workflows De-Risked by the Completed Import

These are workflows the completed import now materially enables or de-risks,
subject to the known demo gaps called out below. They should not be read as fully validated end-to-end clinical workflows or as production-grade active-state coverage.

### Patient Summary on Demand
Pull demographics, conditions, medication history, and recent encounters into a concise nursing-relevant summary. Allergy coverage remains unavailable in the current demo.

### Lab Trend Tracking
Query sequential Observations to show trends over 24h/48h/72h — WBC, creatinine, lactate, hemoglobin. Clinically meaningful trend arrows (↑↓→) with rate-of-change context.

### Medication Reconciliation
Compare medication history against condition data for appropriateness. Active `MedicationRequest` filtering is not yet reliable on the current import.

### Handoff Report Generation
SBAR-format report auto-generated from FHIR data. Pre-populated with the patient's historical state, recent labs, pending actions, and key watch items, but not a true live in-progress encounter.

### Alert Generation
Flag critical lab values, overdue assessments, or missing documentation based on Encounter timeline. Proactive rather than reactive — "your patient's K+ has been trending up for 3 draws."

### Multi-Patient Assignment View
Nurse has 4-6 patients. Pull dashboard-style overview from FHIR: acuity snapshot, pending tasks, critical values, time-sensitive items across the full assignment.

---

## 4. Key FHIR Query Reference

Essential query patterns for Noah-RN skill development:

```bash
# Patient demographics
GET /Patient?_id={id}

# Condition filter reference (active-status filter often empty on this demo)
GET /Condition?patient={id}&clinical-status=active

# MedicationRequest filter reference (active-status filter often empty on this demo)
GET /MedicationRequest?patient={id}&status=active

# Recent vitals (last 5)
GET /Observation?patient={id}&category=vital-signs&_sort=-date&_count=5

# Specific MIMIC-backed lab lookup by Noah LOINC query code
bash tools/fhir/mimic-loinc-query.sh 2160-0 <patient-id>

# Allergies
GET /AllergyIntolerance?patient={id}

# Encounter filter reference (in-progress filter empty on this demo)
GET /Encounter?patient={id}&status=in-progress

# Total patient census
GET /Patient?_summary=count

# All patients (paginated)
GET /Patient?_count=20&_offset=0

# MIMIC-backed lab panel via the translation shim
for code in 2160-0 2823-3 6690-2 718-7; do
  bash tools/fhir/mimic-loinc-query.sh "$code" <patient-id>
done
```

### Live Server Validation

Sample patient used for direct validation: `28dcf33b-0c52-587f-83ad-2a3270976719`

| Query | Status | Notes |
|-------|--------|-------|
| `GET /Patient?_id={id}` | Works | Returns a Bundle with exactly 1 patient for the validated sample ID. |
| `GET /Condition?patient={id}&clinical-status=active` | Valid JSON, empty | Returns `0` entries for the validated sample patient. Condition resources exist overall, but `clinicalStatus` is often absent and is not a reliable active-problem filter for the imported demo. |
| `GET /MedicationRequest?patient={id}&status=active` | Valid JSON, empty | Returns `0` entries for the validated sample patient. Historical orders exist, but `status=active` is not reliable for the imported demo. |
| `GET /Observation?patient={id}&category=vital-signs&_sort=-date&_count=5` | Works | Returns a Bundle with `5` entries; the first code on the validated sample patient is `2708-6`. |
| `GET /Observation?patient={id}&category=laboratory&_sort=-date&_count=20` | Works | Returns a Bundle with `20` entries for the validated sample patient. |
| `GET /Observation?patient={id}&category=survey&_sort=-date` | Works | Returns a Bundle with `6` entries for the validated sample patient. |
| `bash tools/fhir/mimic-loinc-query.sh 2160-0 <patient-id>` | Works | Returns a Bundle with `20` entries for the validated sample patient. |
| `bash tools/fhir/mimic-loinc-query.sh 2823-3 <patient-id>` | Works | Returns a Bundle with `20` entries for the validated sample patient. |
| `bash tools/fhir/mimic-loinc-query.sh 6690-2 <patient-id>` | Works | Returns a Bundle with `20` entries for the validated sample patient. |
| `bash tools/fhir/mimic-loinc-query.sh 718-7 <patient-id>` | Works | Returns a Bundle with `20` entries for the validated sample patient. |
| `bash tools/fhir/mimic-loinc-query.sh 2524-7 <patient-id>` | Works | Returns a Bundle with `1` entry for the validated sample patient. |
| `GET /Observation?patient={id}&code=29463-7&_sort=-date&_count=1` | Valid JSON, empty | Returns `0` entries for the validated sample patient, so the direct weight query is still not viable on the current mapping. |
| `GET /AllergyIntolerance?patient={id}` | Valid JSON, empty | Returns `0` entries. No AllergyIntolerance resources are present in the demo. |
| `GET /Encounter?patient={id}&status=in-progress` | Valid JSON, empty | Returns `0` entries. Imported encounters are historical/finished. |
| `GET /Patient?_summary=count` | Works | Returns the live census. |
| `GET /Patient?_count=20&_offset=0` | Works | Pagination works. |
| Shim panel loop `2160-0 2823-3 6690-2 718-7` | Works | Each command resolves through the translation shim and returns populated Bundles on the current import. |

### Common LOINC Codes

| Code | Name | Clinical Use |
|------|------|-------------|
| 2160-0 | Creatinine | Renal function, CrCl calc |
| 2823-3 | Potassium | Electrolytes, cardiac safety |
| 6690-2 | WBC | Infection/sepsis trending |
| 718-7 | Hemoglobin | Anemia, bleeding |
| 2524-7 | Lactate | Sepsis, perfusion |
| 29463-7 | Body weight | Weight-based dosing |
| 8310-5 | Body temperature | Fever screening |
| 8867-4 | Heart rate | Vitals |
| 8480-6 | Systolic BP | Vitals, MAP calc |
| 8462-4 | Diastolic BP | Vitals, MAP calc |
| 2708-6 | SpO2 | Oxygenation |

### MIMIC-IV Mapping Layer

MIMIC-IV FHIR Observations are keyed by local MIMIC itemIDs, not the LOINC values Noah queries elsewhere in the repo. Use `tools/fhir/mimic-loinc-query.sh` as the translation shim instead of querying HAPI by LOINC directly.
Raw HAPI Observation LOINC queries do not work against the MIMIC data because `Observation.code` is keyed to local itemIDs.

Source of truth: `knowledge/mimic-mappings.json`

Compatibility notes:
- Noah currently queries lactate as `2524-7`, but the official MIT-LCP mapping for itemID `50813` is `32693-4`. The shim supports both.
- Noah currently queries arterial mean BP as `76214-6`, but the official MIT-LCP mapping for itemID `220052` is `8478-0`. The shim supports both.
- Noah currently queries pulse oximetry as `2708-6`, but the official MIT-LCP mapping for itemID `220277` is `59408-5`. The shim supports both.

Core mappings:

| Noah Query LOINC | MIMIC itemID(s) | Official MIT-LCP LOINC | Notes |
|------------------|-----------------|------------------------|-------|
| 8867-4 | 220045 | 8867-4 | Heart rate |
| 8480-6 | 220050 | 8480-6 | Arterial systolic BP |
| 8462-4 | 220051 | 8462-4 | Arterial diastolic BP |
| 76214-6 | 220052 | 8478-0 | Arterial mean BP compatibility alias |
| 76534-7 | 220179 | 76534-7 | Non-invasive systolic BP |
| 76535-4 | 220180 | 76535-4 | Non-invasive diastolic BP |
| 76536-2 | 220181 | 76536-2 | Non-invasive mean BP |
| 9279-1 | 220210 | 9279-1 | Respiratory rate |
| 2708-6 | 220277 | 59408-5 | Pulse oximetry compatibility alias |
| 8310-5 | 223761, 223762 | 8310-5 | Temperature F/C |
| 2524-7 | 50813 | 32693-4 | Lactate compatibility alias |
| 6690-2 | 51300, 51301 | 6690-2 | WBC |
| 2160-0 | 50912 | 2160-0 | Creatinine |
| 2823-3 | 50971 | 2823-3 | Potassium |
| 718-7 | 51222, 50811 | 718-7 | Hemoglobin |
| 6598-7 | 51003 | 6598-7 | Troponin T |
| 11558-4 | 50820 | 11558-4 | pH |
| 11557-6 | 50818 | 11557-6 | pCO2 |
| 11556-8 | 50821 | 11556-8 | pO2 |
| 1959-6 | 50803 | 1959-6 | Calculated bicarbonate |
| 11555-0 | 50802 | 11555-0 | Base excess |

Example:

```bash
bash tools/fhir/mimic-loinc-query.sh 2524-7 <patient-id>
```

---

## 5. Constraints & Safety Notes

- **MIMIC demo, not Synthea.** The server holds the MIMIC-IV Clinical Database Demo on FHIR v2.1.0.
- **No PHI.** The demo is de-identified and restricted to non-production development use.
- **Local network only, no auth.** The HAPI instance remains reachable only on the local network with no authentication.
- **Build-time only.** Noah uses this harness for validation and demo loading; it does not support runtime clinical querying in production.
- **Date shifting is expected.** Demo timestamps are shifted into the 2100-2200 range, so workflows should use relative time logic rather than assuming real calendar dates.
- **Observation import complete.** Observation resources are loaded and validated on the current server, including direct category queries and the translation-shim lab lookups.
- **Status caveats remain.** `Condition?clinical-status=active` and `MedicationRequest?status=active` can return empty Bundles even when historical resources exist, because those active-state filters are not reliable on the imported demo.
- **Current-state caveats remain.** `Encounter?status=in-progress` returns empty on the imported dataset because the encounters are historical/finished.
- **Weight lookup caveat remains.** Direct body-weight lookup by `Observation.code=29463-7` is still not viable on the current mapping.
- **Known gaps.** AllergyIntolerance resources and clinical notes are absent from the demo conversion.

---

## 6. Data Regeneration Playbook

The canonical flow is `download -> decompress -> load -> verify`. Use this for a fresh import or a full reset.

```bash
./infrastructure/load-mimic.sh download
./infrastructure/load-mimic.sh decompress
./infrastructure/load-mimic.sh load
./infrastructure/load-mimic.sh verify --expected-patients 100
```

`./infrastructure/load-mimic.sh print-load-order` is the canonical helper if you need to inspect the load sequence.

Use `--allow-nonempty-server` only when intentionally reloading into a server that already contains demo data:

```bash
./infrastructure/load-mimic.sh load --allow-nonempty-server
```
