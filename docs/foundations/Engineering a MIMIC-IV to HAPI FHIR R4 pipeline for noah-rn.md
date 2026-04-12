# Engineering a MIMIC-IV to HAPI FHIR R4 pipeline for noah-rn

**100-patient MIMIC-IV FHIR Demo = fastest path to physiologically coherent ICU data. Openly available, loads into HAPI FHIR R4 under 2 hours, 915,000+ real FHIR resources, no credentialing. 50× data volume over current 62 Synthea patients. Real ICU trajectories from Beth Israel Deaconess. Covers vitals, labs (ABGs, lactate), full med admin with vasopressor drip rates, ICD diagnoses, ICU procedures. Three gaps: no allergy data, no nursing assessment scales (Braden, fall risk), no clinical notes in FHIR conversion.**

## PhysioNet access: free demo now, credentialed full dataset in 2–6 weeks

MIMIC-IV exists in five datasets. Know which noah-rn needs before credentialing.

**MIMIC-IV FHIR Demo (v2.1.0)**: 100 real ICU patients, FHIR R4 NDJSON. **Openly available** under Open Data Commons ODbL — no PhysioNet credentialing, no CITI, no DUA. Download today, legally include in noah-rn GitHub repo. Start here.

**Full MIMIC-IV on FHIR (v2.1)**: ~315,000 patients, ~5,840,000 FHIR resources. Requires PhysioNet credentialing — three steps: (1) create PhysioNet account with institutional/educational email, provide reference/supervisor contact PhysioNet will verify; (2) complete CITI "Data or Specimens Only Research" course — affiliate with **"Massachusetts Institute of Technology Affiliates"** at citiprogram.org (not independent learner, which costs money) — ~**2–4 hours**, free via MIT affiliation; (3) sign PhysioNet Credentialed Health Data Use Agreement v1.5.0 on each dataset page. Upload CITI training **report** (not certificate): Records → View-Print-Share → Completion Record — #1 cause of delays. Approval: **2–6 weeks** (high volume ~350/week), despite FAQ claiming "several days to one week."

Independent developer/RN can apply without institutional backing, but harder without educational email. Colleague as reference (gets email from credentialing@physionet.org, must respond) satisfies verification. Link ORCID iD to expedite.

**Which subsets?** Core MIMIC-IV Clinical Database: vitals (`chartevents`), labs (`labevents`), med admin (`emar`, `inputevents`), diagnoses (`diagnoses_icd`), procedures. MIMIC-IV-ED: ED triage vitals, Pyxis dispensing. MIMIC-IV-Note: discharge summaries, radiology reports (no nursing notes). Each needs own DUA; credentialing done once. FHIR conversion covers core + ED, **no clinical notes**.

## The 100-patient demo: what's inside and how to load it

Demo delivers **915,000+ FHIR R4 resources** across 100 patients — ~**9,150 per patient** vs Synthea's ~100–300. Ships as gzip-compressed NDJSON (one file per resource type, not Bundles), ~100–170 MB compressed, 800 MB–1.2 GB uncompressed.

**24 FHIR profiles**: Admin — Patient (100), Organization (1, BIDMC), Location (41 care units), Encounter (admissions + ICU stays via `partOf`), EncounterED. Observations — ICU chartevents (vitals, assessments, largest file), lab results, microbiology tests/organisms/susceptibilities, ED vitals. Medications — full workflow: MedicationRequest (~93/patient), MedicationDispense (~91/patient), MedicationAdministration (~240/patient, hospital eMAR), MedicationAdministrationICU (IV infusions + drip rates), MedicationDispenseED, MedicationStatementED (pre-admission reconciliation). Clinical — Condition (ICD-9/10), Procedure (billed), ProcedureICU (ICU procedures + timestamps), Specimen.

100 real ICU admissions: sepsis, cardiac arrest, stroke, respiratory failure, ARDS, AKI, post-op monitoring, metabolic emergencies. Calculator coverage: **GCS in ICU observations, RASS + CPOT documented, APACHE II + SOFA components** (vitals + labs + GCS) fully available. NIHSS less reliable (stroke-specific). **Braden scale absent** — genuine gap for skin assessment skill.

### Loading into HAPI FHIR R4 v8.8.0

Two settings non-negotiable:

```yaml
version: "3.7"
services:
  fhir:
    image: hapiproject/hapi:v8.8.0
    container_name: hapi-fhir
    ports:
      - "8080:8080"
    environment:
      - hapi.fhir.fhir_version=R4
      - hapi.fhir.bulk_import_enabled=true
      - hapi.fhir.enforce_referential_integrity_on_write=false
      - hapi.fhir.enforce_referential_integrity_on_delete=false
      - spring.datasource.url=jdbc:postgresql://hapi-postgres:5432/hapi
      - spring.datasource.username=admin
      - spring.datasource.password=admin
      - spring.datasource.driverClassName=org.postgresql.Driver
      - spring.jpa.properties.hibernate.dialect=ca.uhn.fhir.jpa.model.dialect.HapiFhirPostgresDialect
    depends_on:
      hapi-postgres:
        condition: service_healthy

  hapi-postgres:
    image: postgres:16-alpine
    container_name: hapi-postgres
    environment:
      POSTGRES_DB: hapi
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin
    volumes:
      - hapi-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d hapi"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  hapi-data:
```

**`enforce_referential_integrity_on_write=false` essential** — MIMIC resources cross-reference (Observations → Patients + Encounters), loaded in arbitrary order, most POSTs fail without this. Use `HapiFhirPostgresDialect` for HAPI 8.x, not `HapiFhirPostgres94Dialect`. Allocate **4 GB RAM** to HAPI, **2 GB disk** for PostgreSQL.

Download, decompress, load:

```bash
# Download the demo (open access, no credentials)
wget -r -N -c -np https://physionet.org/files/mimic-iv-fhir-demo/2.1.0/

# Decompress all NDJSON files
cd physionet.org/files/mimic-iv-fhir-demo/2.1.0/fhir/
gunzip *.ndjson.gz
```

PUT script for max control + reliability:

```bash
#!/bin/bash
FHIR_SERVER="http://localhost:8080/fhir"
DATA_DIR="./fhir"

LOAD_ORDER=(
  "MimicOrganization" "MimicLocation" "MimicPatient"
  "MimicEncounter" "MimicEncounterED"
  "MimicCondition" "MimicProcedure" "MimicMedication"
  "MimicMedicationRequest" "MimicMedicationDispense"
  "MimicMedicationDispenseED" "MimicMedicationAdministration"
  "MimicMedicationAdministrationICU" "MimicMedicationStatementED"
  "MimicSpecimen" "MimicObservationLabevents"
  "MimicObservationChartevents" "MimicObservationMicroTest"
  "MimicObservationMicroOrg" "MimicObservationMicroSusc"
  "MimicObservationVitalsigns"
)

for profile in "${LOAD_ORDER[@]}"; do
  FILE="${DATA_DIR}/${profile}.ndjson"
  [ ! -f "$FILE" ] && echo "Skipping $profile" && continue
  echo "Loading $profile..."
  COUNT=0
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    RT=$(echo "$line" | python3 -c "import sys,json; print(json.load(sys.stdin)['resourceType'])")
    ID=$(echo "$line" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
    curl -s -X PUT "${FHIR_SERVER}/${RT}/${ID}" \
      -H "Content-Type: application/fhir+json" -d "$line" > /dev/null
    COUNT=$((COUNT + 1))
    [ $((COUNT % 1000)) -eq 0 ] && echo "  $COUNT resources..."
  done < "$FILE"
  echo "  Done: $COUNT resources"
done
```

Load Organization + Location first (dependencies), then Patient, Encounters, clinical resources. Observations last — MimicObservationChartevents largest. Expect **30–120 min** total via individual PUTs, **10–30 min** via HAPI `$import` bulk endpoint with local HTTP server. Known gotcha: parallel threads → `HAPI-0825: client-assigned ID constraint failure` — reduce `maxBatchResourceCount` to 100–200.

**Date shifting warning**: MIMIC dates de-identified, shifted to 2100–2200. CDS logic using "current time" (e.g., "lactate drawn within last 4 hours") needs date normalization or relative-time logic.

## The kind-lab/mimic-fhir toolchain: when and how to use it

[kind-lab/mimic-fhir](https://github.com/kind-lab/mimic-fhir) = **official conversion pipeline** that produced PhysioNet FHIR datasets. KinD Lab at Hospital for Sick Children (Toronto), published JAMIA 2023. For noah-rn: likely **don't need to run this** — pre-built NDJSON on PhysioNet is intended consumption path. Need custom cohort (e.g., 500 sepsis patients)? Then it matters.

Four components: SQL scripts mapping MIMIC-IV relational tables to FHIR-structured PostgreSQL; Python package (`py_mimic_fhir`) for validation/export; forked HAPI FHIR JPA Server for validation; FHIR profiles in FHIR Shorthand (FSH). Deps: PostgreSQL 11+, Python + psycopg2/fhir-resources, Java/Maven for HAPI fork, SUSHI for profile compilation.

Full pipeline — load CSVs → PostgreSQL → SQL mapping → HAPI validation → NDJSON export — needs ~**2 TB free disk**, benchmarked **~12 hours** on AMD Ryzen 9 3900XT (12-core, 64 GB RAM). Serious infrastructure.

**Curated cohort alternatives**: kind-lab SQL scripts filter by `subject_id` — create temp table, JOIN-filter generation queries. **skfit-uni-luebeck/mimic4fhir** (Java) supports `--patients=N --random` CLI, simpler ad-hoc cohort gen. **srdc/mimic-iv-to-fhir** (toFHIR engine) works from CSV, maps to LOINC/SNOMED — useful for standardized terminology.

Three critical known issues. First, some NDJSON files contain **malformed JSON at specific lines** (GitHub issue #119) — use error-tolerant parsing. Second, MimicObservationChartevents enormous, can cause **OOM crashes** — Pathling tutorial explicitly skips it. Third, cleaning HAPI between runs requires **dropping entire database** — `$expunge` unreliable.

## Gap analysis: what MIMIC-IV FHIR gives noah-rn and what's missing

Coverage mostly positive for core ICU CDS. Three nursing-specific gaps.

**Vitals time-series**: fully available as Observations from MimicObservationChartevents, ICU charting every 1–4 hours. Heart rate (itemID 220045), arterial BP systolic/diastolic/mean (220050/220051/220052), non-invasive BP (220179/220180/220181), respiratory rate (220210), SpO2 (220277), temperature °C/°F (223762/223761) all present. **Critical caveat**: FHIR resources use MIMIC-specific local itemIDs as `Observation.code`, not LOINC. Noah-rn needs itemID-to-LOINC mapping layer (simple lookup table) — e.g., HR → LOINC 8867-4, MAP → 76214-6.

**Lab results**: complete — lactate (arterial + venous), WBC, procalcitonin, troponin T, BMP/CBC, coagulation (PT/INR/PTT/fibrinogen), **full ABG panels** (pH, pCO2, pO2, HCO3, base excess). Maps to MimicObservationLabevents with MIMIC d_labitems codes. Community `mimic_labitems_to_loinc.csv` mapping exists but removed from v2.2 for collaborative improvement — source/maintain yourself.

**Medication admin records**: exceptionally rich. Full workflow: MedicationRequest (orders), MedicationDispense (pharmacy), MedicationAdministration (hospital eMAR), MedicationAdministrationICU (IV infusions). **Vasopressor drip rates available** with rate values, units (mcg/kg/min), start/end timestamps. Norepinephrine (itemID 221906), vasopressin (222315), phenylephrine (221749), epinephrine (221289), dopamine (221662) identifiable by itemID. Drug coding: NDC + GSN — **RxNorm not natively mapped**, limits standard drug interaction checking without NDC-to-RxNorm crosswalk (NIH RxNorm API available).

**Diagnoses**: MimicCondition with ICD-9-CM + ICD-10-CM, but **discharge diagnoses only** (category "encounter-diagnosis"), not active problem lists. MIMIC-IV v3.0+ added nurse-documented problem list in chartevents (itemID 220001, updated 7am/7pm shifts), mapped as Observation not Condition. Shift report gen needs both Condition resources + problem-list chartevents.

**Procedures**: MimicProcedure (ICD-9/10-PCS billed) + MimicProcedureICU (intubation, central lines, arterial lines, chest tubes — timestamps + body site). ICU procedures use MIMIC itemIDs, not CPT.

### The three major gaps

**Allergies completely absent.** No allergy data in MIMIC-IV, no `AllergyIntolerance` resource generated. Significant safety gap — drug interaction checking without allergy awareness incomplete. Need another source or flag as known limitation.

**Nursing assessment scales missing.** Braden scale, fall risk, wound documentation, restraint documentation, structured nursing education — absent. Some pain scores in chartevents but not standardized. GCS, RASS, CPOT present (ICU nurses chart them). Braden specifically — no source data in MIMIC.

**Clinical notes not in FHIR conversion.** MIMIC-IV-Note: 331,794 discharge summaries + 2.3M radiology reports, no nursing notes, no progress notes. FHIR pipeline converts none. Shift report (SBAR) = structured data only — vitals trends, lab results, med admin times. No narrative text.

Ventilator settings (FiO2, PEEP, tidal volume, mode) available in chartevents as Observations. I/O partially covered: output via MimicObservationOutputevents, input via MedicationAdministrationICU for IV fluids.

## Beyond 100 patients: the middle ground between demo and full conversion

100 patients insufficient for rare phenotypes (status epilepticus, DKA)? **500–1,000 ICU patient curated cohort** = pragmatic middle. Needs credentialed PhysioNet + pipeline work, avoids 2 TB / 12-hour full conversion.

Load MIMIC-IV into PostgreSQL, extract target `subject_id` by ICD code, run FHIR conversion on subset. Sample cohort query:

```sql
SELECT DISTINCT d.subject_id
FROM mimiciv_hosp.diagnoses_icd d
INNER JOIN mimiciv_icu.icustays i ON d.hadm_id = i.hadm_id
WHERE (
    d.icd_code LIKE 'R652%' OR d.icd_code LIKE 'A41%'  -- Sepsis
    OR d.icd_code = 'J80'                                -- ARDS
    OR d.icd_code LIKE 'I6%'                             -- Stroke
    OR d.icd_code LIKE 'I46%'                            -- Cardiac arrest
    OR d.icd_code LIKE 'E101%' OR d.icd_code LIKE 'E111%'  -- DKA
    OR d.icd_code LIKE 'G41%'                            -- Status epilepticus
) AND d.icd_version = 10;
```

For sepsis: MIMIC-IV provides **official derived `sepsis3` table** implementing Sepsis-3.0 criteria — prefer over ICD-code identification (known misclassification). 1,000-patient ICU cohort → ~**9M FHIR resources** (ICU patients data-dense), ~5–10 GB compressed NDJSON, 250+ GB in HAPI with full indexing.

**skfit-uni-luebeck/mimic4fhir** Java tool simplest cohort gen: `--patients=500 --random --thread`, produces German MII KDS profiles not kind-lab profiles. For kind-lab pipeline: filter SQL generation scripts by target subject_ids before `create_fhir_tables.sql`.

## No viable alternatives to MIMIC-IV exist in FHIR format today

GAN/diffusion approaches (EHR-Safe from Google Research, TimeDiff, HALO) can generate synthetic data preserving MIMIC's physiological coherence — but all require real MIMIC for training, produce tabular output not FHIR, no pre-built downloadable datasets.

Six other public ICU databases (eICU-CRD, HiRID, AmsterdamUMCdb, SICdb, NWICU, ZFPH) — **none offer FHIR-formatted data**. AmsterdamUMCdb has OMOP CDM v5.4 conversion, closest to standardized interoperability but fundamentally different from FHIR. eICU covers 208 US hospitals (only multi-center option) but needs custom FHIR pipeline.

Synthea's core limit: state-transition engine on 7-day timestep, Markov-chain transitions — can't generate minute-to-hour resolution vitals or physiologically coupled medication responses. "Coherent Data Set" project extended Synthea with SBML physiological models for cardiovascular disease — proof of concept — but no ICU-specific physiological modules built. **MIMIC-IV is the only game in town for real-world ICU data in FHIR.**

## BIDMC data works for CDS development despite population differences

BIDMC = **673-bed Harvard teaching hospital, ACS-verified Level I Trauma Center**, Boston. Structurally comparable to Corewell Health Butterworth Hospital, Grand Rapids (only Level I trauma in West Michigan). Both academic-adjacent regional referral centers, high acuity.

Population differences exist: BIDMC serves dense urban population, near-universal insurance (Massachusetts mandate), higher sub-specialty referral complexity. Grand Rapids: more homogeneous, larger Dutch/Western European heritage, more MV + agricultural trauma, Michigan Medicaid expansion population with different social determinants. Published studies: MIMIC-IV ~**67% White**, documented disparities in lab ordering + med administration for minority patients.

**For CDS skill development + functional testing, differences largely irrelevant.** Physiological logic noah-rn implements — lactate-MAP-vasopressor relationships, sepsis criteria, GCS scoring, drug interaction checking — is universal clinical science. Population bias matters for ML-based CDS statistical validation; noah-rn's rule-based calculators + protocol triggers work identically regardless of source population.

## Licensing: the demo goes on GitHub, the full dataset does not

PhysioNet Credentialed Health Data License v1.5.0 unambiguous: **"The LICENSEE will not share access to PhysioNet restricted data with anyone else."** Full MIMIC-IV FHIR dataset, derived patient-level data, trained model weights that might memorize patient info — cannot go in public GitHub. PhysioNet April 2024 derived dataset guidelines: derived datasets must be shared on PhysioNet under same credentialed agreement.

Recommended architecture for noah-rn:

- **Ship open-access 100-patient FHIR Demo** (or download script) as default dev dataset — fully legal under ODbL, sufficient for functional testing + CI/CD
- **Provide `setup-mimic-full.sh`** that authenticates with PhysioNet via user's own credentials, downloads full MIMIC-IV-on-FHIR NDJSON, loads into local HAPI server — standard MIMIC community pattern
- **Document credentialing** in README with timelines + CITI trick (affiliate with "Massachusetts Institute of Technology Affiliates" for free access)
- **All code encouraged open-source** — license explicitly requires contributing associated code to open repos

Extra restriction: PhysioNet September 2025 policy prohibits sending credentialed data through third-party APIs or online platforms. Noah-rn = Claude Code plugin processing FHIR data — keep all data local. Query local HAPI server, pass structured results (not raw patient data) to LLM. Local LLMs "strongly recommended" by PhysioNet for MIMIC-derived work.

## Conclusion

Two-phase approach. **Phase 1 (today)**: download openly available 100-patient MIMIC-IV FHIR Demo, load into existing HAPI FHIR v8.8.0 with referential integrity disabled, build itemID-to-LOINC mapping for vitals + labs, implement NDC-to-RxNorm crosswalk for drug interaction checking. 915,000 physiologically coherent FHIR resources, zero credentialing overhead. **Phase 2 (after credentialing, 3–8 weeks)**: apply for PhysioNet access, download full MIMIC-IV on FHIR, optionally extract curated multi-phenotype cohort of 500–1,000 ICU patients for comprehensive CDS validation. Three gaps — allergies, Braden scale, clinical notes — need synthetic supplementation or acknowledgment as known limitations regardless of MIMIC subset. Physiological coherence problem solved: MIMIC patient with lactate 4.2 has the MAP, vasopressor orders, and clinical trajectory a 13-year ICU nurse expects to see.