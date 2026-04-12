# FHIR Integration — Medplum Clinical Platform

> **No PHI. No production/runtime EHR use.**
> This infrastructure is a local build-time and test harness only.

---

## 1. Infrastructure Overview

### Platform

| Component | Detail |
|-----------|--------|
| Host | `tower` — 10.0.0.184 (local network) |
| Specs | 62GB RAM, 12 cores, Ubuntu 24.04 |
| Software | Medplum v5.1.x (Docker full stack) |
| Containers | medplum-server, medplum-app, medplum-postgres, medplum-redis |
| FHIR endpoint | `http://10.0.0.184:8103/fhir/R4` |
| Admin UI | `http://10.0.0.184:3000` |
| Healthcheck | `http://10.0.0.184:8103/healthcheck` |
| Auth | OAuth2/OIDC (built-in) — FHIR requests require Bearer token |

Tower is separate from beelink (dev workstation) to keep the FHIR server running independently without competing for dev resources.

Medplum replaces the previous HAPI FHIR R4 server and provides: TypeScript SDK, built-in
auth (OAuth2/OIDC), bot automation, access policies, React hooks, and an admin UI.
The old HAPI lane is historical only and no longer ships as an active compose surface in this repo.

### Current Dataset

- **Synthea synthetic patients** loaded via FHIR transaction bundles.
- MIMIC-IV data migration is planned for a future phase.
- Synthea data includes: Patient demographics, Conditions, Observations (vitals + labs), MedicationRequests, Encounters, Procedures, Immunizations, CarePlans, and more.

### Operations

```bash
# Start/stop Medplum stack
cd infrastructure/
docker compose up -d
docker compose down

# Healthcheck (no auth)
curl http://10.0.0.184:8103/healthcheck

# Check FHIR capability statement
curl -H "Authorization: Bearer $TOKEN" http://10.0.0.184:8103/fhir/R4/metadata | head -20

# Quick patient census
curl -H "Authorization: Bearer $TOKEN" "http://10.0.0.184:8103/fhir/R4/Patient?_summary=count"

# Server logs
ssh tower "docker compose -f /home/ark/noah-rn/infrastructure/docker-compose.yml logs -f medplum-server"

# Admin UI
open http://10.0.0.184:3000
```

### Authentication

Medplum requires OAuth2 authentication for FHIR API access.

**Client credentials (machine-to-machine — preferred for tools/scripts):**

```bash
# ClientApplication: "Noah RN Default Client"
# Client ID: 3c3c4c3a-2993-424c-b46d-f58db0d7ca14

TOKEN=$(curl -s -X POST http://10.0.0.184:8103/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=3c3c4c3a-2993-424c-b46d-f58db0d7ca14&client_secret=be4fd047142ee6ed2a004a4a9cb98ff4c20f7c73d6082b3754dc9ae613083a34" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

**User login (PKCE flow — for interactive/admin use):**

```bash
# Login credentials: admin@example.com / medplum_admin
# Project: "Noah RN"

CODE_VERIFIER=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')

LOGIN=$(curl -s -X POST http://10.0.0.184:8103/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"medplum_admin\",\"codeChallengeMethod\":\"S256\",\"codeChallenge\":\"$CODE_CHALLENGE\"}")

CODE=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['code'])")

TOKEN=$(curl -s -X POST http://10.0.0.184:8103/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=$CODE&code_verifier=$CODE_VERIFIER" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### MIMIC-IV Data (archived — future migration)

`infrastructure/load-mimic.sh` remains available for the MIMIC-IV FHIR Demo v2.1.0 pipeline.
It was built for HAPI FHIR and will need adaptation for Medplum's authenticated endpoints
before MIMIC data can be loaded into the new platform.

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

Source of truth: `clinical-resources/mimic-mappings.json`

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

- **Synthea synthetic data.** The server holds Synthea-generated patients — fully synthetic, not derived from real clinical records.
- **No PHI.** All data is synthetic and restricted to non-production development use.
- **Authenticated access.** Medplum requires OAuth2 Bearer tokens for FHIR API access (unlike the previous unauthenticated HAPI setup).
- **Local network only.** The Medplum instance is reachable only on the local network.
- **Build-time only.** Noah uses this harness for validation and development; it does not support runtime clinical querying in production.
- **Synthea data characteristics.** Synthea generates realistic but synthetic clinical histories including conditions, medications, observations, encounters, procedures, and immunizations. Data quality is generally higher than MIMIC-IV FHIR conversions for active-status filtering.
- **MIMIC-IV migration planned.** The MIMIC-IV dataset (100 patients, 928K resources) will be migrated to Medplum in a future phase. The LOINC translation shim will need adaptation for Medplum's authenticated endpoints.

---

## 6. Medplum Validation (2026-04-04)

Validated Medplum deployment on tower with Synthea synthetic data.

### Platform Status

| Check | Status | Detail |
|-------|--------|--------|
| Healthcheck | OK | v5.1.6, postgres+redis connected |
| FHIR R4 metadata | OK | CapabilityStatement, FHIR 4.0.1 |
| Client credentials auth | OK | Token exchange via ClientApplication |
| Patient census | OK | 9 Synthea patients |
| Observations | OK | 1,255 resources (labs + vitals) |
| Conditions | OK | 74 resources |
| MedicationRequests | OK | 20 resources |
| Encounters | OK | 102 resources |

### Synthea vs MIMIC-IV Data Differences

Synthea data uses standard LOINC codes directly in `Observation.code.coding`, so the MIMIC
translation shim (`mimic-loinc-query.sh`) is **not needed** for Synthea patients. Direct FHIR
queries by LOINC code work:

```bash
# Direct LOINC query — works with Synthea (no shim needed)
curl -H "Authorization: Bearer $TOKEN" \
  "http://10.0.0.184:8103/fhir/R4/Observation?patient={id}&code=2160-0&_sort=-date&_count=5"
```

The MIMIC shim and mapping layer (Section 4) remain relevant for future MIMIC-IV migration.

### Previous HAPI Smoke Tests (2026-03-31, archived)

The prior HAPI-era smoke tests (`tests/fhir/test_mimic_loinc_query.sh`, 23/23 passed) validated
the MIMIC-IV pipeline against `http://10.0.0.184:8080/fhir`. Those tests are not applicable to
the Medplum/Synthea stack but remain in the repo for future MIMIC migration reference.

---

## 7. Data Regeneration Playbook

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
