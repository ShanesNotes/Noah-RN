# Engineering a MIMIC-IV to HAPI FHIR R4 pipeline for noah-rn

**The 100-patient MIMIC-IV FHIR Demo is your fastest path to physiologically coherent ICU data — it's openly available, loads into HAPI FHIR R4 in under two hours, and delivers 915,000+ real-world FHIR resources with no credentialing required.** This represents a **50× increase** in data volume over your current 62 Synthea patients while replacing Markov-chain artifacts with genuine ICU clinical trajectories from Beth Israel Deaconess Medical Center. The data covers vitals, labs (including ABGs and lactate), full medication administration records with vasopressor drip rates, ICD-coded diagnoses, and ICU procedures — hitting most of noah-rn's CDS requirements out of the box. Three notable gaps exist: no allergy data, no nursing assessment scales (Braden, fall risk), and no clinical notes in the FHIR conversion. Below is the complete engineering playbook.

## PhysioNet access: free demo now, credentialed full dataset in 2–6 weeks

MIMIC-IV exists in five distinct datasets, and understanding which ones noah-rn needs is critical before investing in credentialing.

**The MIMIC-IV FHIR Demo (v2.1.0)** contains 100 real ICU patients converted to FHIR R4 NDJSON. It is **openly available** under the Open Data Commons ODbL license — no PhysioNet credentialing, no CITI training, no DUA. You can download it today and legally include it (or a download script) in the noah-rn GitHub repository. This is the immediate starting point.

**The full MIMIC-IV on FHIR (v2.1)** contains ~315,000 patients and ~5,840,000 FHIR resources. Accessing it requires PhysioNet credentialing, which is a three-step process: (1) create a PhysioNet account with an institutional or educational email and provide a reference/supervisor contact who PhysioNet will verify; (2) complete the CITI "Data or Specimens Only Research" course — register at citiprogram.org and affiliate with **"Massachusetts Institute of Technology Affiliates"** (not as an independent learner, which costs money) — the course takes roughly **2–4 hours** and is free through the MIT affiliation; (3) sign the PhysioNet Credentialed Health Data Use Agreement v1.5.0 on each dataset page. Upload the CITI training **report** (not the certificate) from Records → View-Print-Share → Completion Record — this is the number-one cause of application delays. Current approval timelines run **2–6 weeks** due to high application volume (~350/week) and staffing constraints, though PhysioNet's FAQ still says "several days to one week."

An independent developer/RN can apply without institutional backing, but approval is harder and slower without an educational email address. Having a colleague serve as your reference (they'll receive an email from credentialing@physionet.org and must respond) satisfies the verification requirement. Link your ORCID iD to expedite review.

**Which subsets does noah-rn need?** The core MIMIC-IV Clinical Database provides vitals (`chartevents`), labs (`labevents`), medication administration (`emar`, `inputevents`), diagnoses (`diagnoses_icd`), and procedures. MIMIC-IV-ED adds emergency department triage vitals and Pyxis medication dispensing. MIMIC-IV-Note adds discharge summaries and radiology reports (but no nursing notes). Each requires signing its own DUA, though the credentialing process is done once. The FHIR conversion covers the core database and ED module but **does not include clinical notes**.

## The 100-patient demo: what's inside and how to load it

The MIMIC-IV FHIR Demo delivers **over 915,000 FHIR R4 resources** across 100 patients — roughly **9,150 resources per patient** compared to Synthea's ~100–300. The data ships as gzip-compressed NDJSON files (one file per resource type, not FHIR Bundles), totaling approximately 100–170 MB compressed and 800 MB–1.2 GB uncompressed.

The dataset includes **24 FHIR profiles** spanning the full clinical picture. Administration resources include Patient (100), Organization (1 — BIDMC), Location (41 care units), Encounter (hospital admissions and ICU stays linked via `partOf`), and EncounterED (emergency department visits). Observation resources cover ICU chartevents (vitals, assessments — the single largest file), laboratory results, microbiology tests/organisms/susceptibilities, and ED vital signs. Medication resources provide the complete workflow: MedicationRequest (~93 median per patient), MedicationDispense (~91/patient), MedicationAdministration (~240/patient — hospital-wide eMAR), MedicationAdministrationICU (IV infusions with drip rates), MedicationDispenseED, and MedicationStatementED (pre-admission med reconciliation). Clinical resources include Condition (ICD-9/ICD-10 encounter diagnoses), Procedure (billed procedures), ProcedureICU (ICU-specific procedures with timestamps), and Specimen.

These 100 patients are real ICU admissions spanning sepsis, cardiac arrest, stroke, respiratory failure, ARDS, acute kidney injury, post-operative monitoring, and metabolic emergencies. The clinical calculator coverage is strong: **GCS is charted in ICU observations, RASS and CPOT are commonly documented, APACHE II and SOFA components** (vitals + labs + GCS) are fully available for calculation, and CURB-65 components are present. NIHSS is less reliably present (stroke-specific documentation), and **Braden scale scores are not in MIMIC-IV** — this is a genuine gap for noah-rn's skin assessment skill.

### Loading into HAPI FHIR R4 v8.8.0

Start with this Docker Compose configuration — two settings are non-negotiable:

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

**`enforce_referential_integrity_on_write=false` is essential** — MIMIC resources cross-reference each other (Observations reference Patients and Encounters) and will be loaded in arbitrary order. Without this flag, most POSTs will fail with referential integrity violations. Use `HapiFhirPostgresDialect` for HAPI 8.x, not the older `HapiFhirPostgres94Dialect`. Allocate at least **4 GB RAM** to the HAPI container and **2 GB disk** for PostgreSQL.

Download, decompress, and load:

```bash
# Download the demo (open access, no credentials)
wget -r -N -c -np https://physionet.org/files/mimic-iv-fhir-demo/2.1.0/

# Decompress all NDJSON files
cd physionet.org/files/mimic-iv-fhir-demo/2.1.0/fhir/
gunzip *.ndjson.gz
```

For loading, a resource-by-resource PUT script gives maximum control and reliability:

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

Load Organization and Location first (dependencies), then Patient, Encounters, and clinical resources. The Observations go last since MimicObservationChartevents is the largest file. Expect **30–120 minutes** total for 915K resources via individual PUTs, or **10–30 minutes** using HAPI's `$import` bulk endpoint with files served from a local HTTP server. Known gotcha: HAPI's bulk import with parallel threads can trigger `HAPI-0825: client-assigned ID constraint failure` — reduce `maxBatchResourceCount` to 100–200 if this occurs.

**Date shifting warning**: All MIMIC dates are de-identified and shifted into the 2100–2200 range. Your CDS logic that references "current time" for calculations (e.g., "lactate drawn within last 4 hours") will need either date normalization or relative-time logic.

## The kind-lab/mimic-fhir toolchain: when and how to use it

The [kind-lab/mimic-fhir](https://github.com/kind-lab/mimic-fhir) repository is the **official conversion pipeline** that produced the PhysioNet FHIR datasets. It's maintained by KinD Lab at the Hospital for Sick Children (Toronto) and was published in JAMIA 2023. For noah-rn's purposes, you likely **do not need to run this toolchain** — the pre-built NDJSON files on PhysioNet are the intended consumption path. However, if you need a custom cohort (e.g., 500 sepsis patients specifically), understanding the pipeline matters.

The toolchain has four components: SQL scripts that map MIMIC-IV's relational tables into FHIR-structured PostgreSQL tables; a Python package (`py_mimic_fhir`) for validation and export; a forked HAPI FHIR JPA Server for resource validation; and FHIR profiles defined in FHIR Shorthand (FSH). Dependencies include PostgreSQL 11+, Python with psycopg2/fhir-resources, Java/Maven for the HAPI fork, and SUSHI for profile compilation.

The full conversion pipeline — loading MIMIC-IV CSVs into PostgreSQL, running SQL mapping scripts, validating against HAPI, and exporting to NDJSON — requires approximately **2 TB free disk space** and was benchmarked at **~12 hours** on an AMD Ryzen 9 3900XT (12-core, 64 GB RAM). This is serious infrastructure for a single-developer project.

**For a curated cohort**, two practical alternatives exist. The kind-lab pipeline's SQL scripts can be filtered by `subject_id` — create a temp table of target patients and JOIN-filter all generation queries. The alternative **skfit-uni-luebeck/mimic4fhir** (Java-based) explicitly supports `--patients=N --random` from the command line, making ad-hoc cohort generation easier. A third option, **srdc/mimic-iv-to-fhir** (toFHIR engine), works directly from CSV files and maps to LOINC/SNOMED codes — useful if standardized terminology is a priority.

Three known issues are critical. First, some generated NDJSON files contain **malformed JSON at specific lines** (GitHub issue #119) — handle with error tolerance when parsing. Second, MimicObservationChartevents is enormous and can cause **out-of-memory crashes** during queries — the Pathling tutorial explicitly skips this resource type for this reason. Third, cleaning the HAPI server between runs requires **dropping the entire database** because `$expunge` doesn't work reliably.

## Gap analysis: what MIMIC-IV FHIR gives noah-rn and what's missing

The data coverage story is mostly positive for core ICU CDS, with three significant nursing-specific gaps.

**Vitals time-series** are fully available as individual Observation resources from MimicObservationChartevents, with ICU charting typically every 1–4 hours. Heart rate (itemID 220045), arterial BP systolic/diastolic/mean (220050/220051/220052), non-invasive BP (220179/220180/220181), respiratory rate (220210), SpO2 (220277), and temperature in both °C and °F (223762/223761) are all present. **Critical caveat**: the FHIR resources use MIMIC-specific local itemIDs as `Observation.code`, not standardized LOINC codes. Noah-rn will need a mapping layer (a simple lookup table) to translate these itemIDs to the LOINC codes your calculators expect (e.g., HR → LOINC 8867-4, MAP → 76214-6).

**Lab results** cover everything noah-rn needs: lactate (both arterial and venous), WBC, procalcitonin, troponin T, complete BMP/CBC panels, coagulation studies (PT/INR/PTT/fibrinogen), and **full ABG panels** (pH, pCO2, pO2, HCO3, base excess). These map to MimicObservationLabevents with MIMIC-specific d_labitems codes. A community-maintained `mimic_labitems_to_loinc.csv` mapping exists but was removed from the v2.2 release for collaborative improvement — you'll need to source or maintain this mapping.

**Medication administration records** are exceptionally rich. The FHIR conversion provides the complete med workflow: MedicationRequest (orders), MedicationDispense (pharmacy), MedicationAdministration (hospital-wide eMAR), and MedicationAdministrationICU (IV infusions). **Vasopressor drip rates are available** with rate values, rate units (e.g., mcg/kg/min), and start/end timestamps — essential for ICU CDS. Norepinephrine (itemID 221906), vasopressin (222315), phenylephrine (221749), epinephrine (221289), and dopamine (221662) are identifiable by itemID. The drug coding uses NDC and GSN codes — **RxNorm is not natively mapped**, which will limit standard drug interaction checking without an NDC-to-RxNorm crosswalk (the NIH RxNorm API can provide this).

**Diagnoses** map to MimicCondition with ICD-9-CM and ICD-10-CM codes, but these are **discharge diagnoses** (category "encounter-diagnosis"), not active problem lists. MIMIC-IV v3.0+ added a nurse-documented problem list in chartevents (itemID 220001, updated at 7am/7pm shift changes), but it's mapped as an Observation, not a Condition resource. For noah-rn's shift report generation, you'll need to query both Condition resources and problem-list chartevents.

**Procedures** are available via MimicProcedure (ICD-9/ICD-10-PCS billed procedures) and MimicProcedureICU (intubation, central lines, arterial lines, chest tubes — with timestamps and body site). ICU procedures use MIMIC-specific itemIDs rather than CPT codes.

### The three major gaps

**Allergies are completely absent.** MIMIC-IV has no allergy data, and no `AllergyIntolerance` FHIR resource is generated. For a nursing CDS tool, this is a significant safety gap — drug interaction checking without allergy awareness is incomplete. You'll need to populate allergy data from another source or flag this as a known limitation.

**Nursing assessment scales are missing.** Braden scale, fall risk assessments, wound documentation, restraint documentation, and structured nursing education records are not in MIMIC-IV. Some pain scores appear in chartevents but are not standardized. GCS, RASS, and CPOT are present (charted by ICU nurses), but Braden specifically — one of noah-rn's listed calculators — has no source data in MIMIC.

**Clinical notes are not in the FHIR conversion.** MIMIC-IV-Note contains 331,794 discharge summaries and 2.3 million radiology reports, but neither nursing notes nor physician progress notes. The FHIR pipeline does not convert any notes. For noah-rn's shift report generation in SBAR format, you'll be working with structured data only (vitals trends, lab results, med administration times) rather than narrative text.

Ventilator settings (FiO2, PEEP, tidal volume, mode) are available in chartevents as Observations, and intake/output data is partially covered (output via MimicObservationOutputevents, input via MedicationAdministrationICU for IV fluids).

## Beyond 100 patients: the middle ground between demo and full conversion

If 100 patients proves insufficient for comprehensive CDS validation — particularly for rarer phenotypes like status epilepticus or DKA — a **curated cohort of 500–1,000 ICU patients** is the pragmatic middle ground. This requires credentialed PhysioNet access plus some pipeline work, but avoids the 2 TB / 12-hour full conversion.

The approach: load MIMIC-IV into PostgreSQL, extract target `subject_id` values by ICD code, then run the FHIR conversion on that subset only. A sample cohort extraction query:

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

For sepsis specifically, MIMIC-IV provides an **official derived `sepsis3` table** implementing Sepsis-3.0 criteria — prefer this over ICD-code-based identification, which has known misclassification issues. A 1,000-patient ICU cohort would generate approximately **9 million FHIR resources** (ICU patients are data-dense), requiring roughly 5–10 GB compressed NDJSON and 250+ GB in HAPI with full indexing.

The **skfit-uni-luebeck/mimic4fhir** Java tool offers the simplest cohort generation with `--patients=500 --random --thread`, though it produces German MII KDS profiles rather than the kind-lab profiles. For the kind-lab pipeline, filter the SQL generation scripts by your target subject_ids before running `create_fhir_tables.sql`.

## No viable alternatives to MIMIC-IV exist in FHIR format today

The search for alternatives — synthetic MIMIC derivatives, other ICU datasets in FHIR, enhanced synthetic generators — turned up no ready-to-use options. Several GAN and diffusion model approaches (EHR-Safe from Google Research, TimeDiff, HALO) can generate synthetic data that preserves MIMIC's physiological coherence, but all require access to the real MIMIC data for model training, produce tabular output rather than FHIR, and have no pre-built downloadable datasets.

Six other publicly available ICU databases exist (eICU-CRD, HiRID, AmsterdamUMCdb, SICdb, NWICU, ZFPH), but **none offer FHIR-formatted data**. AmsterdamUMCdb recently released an OMOP CDM v5.4 conversion, which is the closest to standardized interoperability but is a fundamentally different data model from FHIR. The eICU Collaborative Research Database covers 208 US hospitals (the only multi-center option) but would require a custom FHIR conversion pipeline.

Synthea's core limitation for ICU use is architectural: its state-transition engine operates on a 7-day timestep with Markov-chain transitions, making it incapable of generating the minute-to-hour resolution vital sign trajectories and physiologically coupled medication responses that define ICU care. A "Coherent Data Set" project extended Synthea with SBML physiological models for cardiovascular disease, proving the concept works, but no one has built ICU-specific physiological modules. **MIMIC-IV is the only game in town for real-world ICU data in FHIR.**

## BIDMC data works for CDS development despite population differences

Beth Israel Deaconess is a **673-bed Harvard teaching hospital and ACS-verified Level I Trauma Center** in Boston — structurally comparable to Corewell Health Butterworth Hospital in Grand Rapids (the only Level I trauma center in West Michigan). Both are academic-adjacent regional referral centers handling high-acuity cases.

Population differences do exist: BIDMC serves a dense urban population with near-universal insurance coverage (Massachusetts mandate) and higher sub-specialty referral complexity. Grand Rapids has a more homogeneous population with larger Dutch/Western European heritage, more motor vehicle and agricultural trauma, and a Michigan Medicaid expansion population with different social determinants. Published studies show MIMIC-IV is approximately **67% White** with documented disparities in lab test ordering and medication administration for minority patients.

**For CDS skill development and functional testing, these differences are largely irrelevant.** The physiological logic that noah-rn implements — lactate-MAP-vasopressor relationships, sepsis criteria, GCS scoring, drug interaction checking — is universal clinical science. A sepsis patient at BIDMC and a sepsis patient at Butterworth follow the same Sepsis-3 criteria. Population bias matters for statistical validation of ML-based CDS (where sensitivity/specificity may vary by population), but noah-rn's rule-based clinical calculators and protocol triggers will work identically regardless of the source population.

## Licensing: the demo goes on GitHub, the full dataset does not

The PhysioNet Credentialed Health Data License v1.5.0 is unambiguous: **"The LICENSEE will not share access to PhysioNet restricted data with anyone else."** The full MIMIC-IV FHIR dataset, any derived patient-level data, and even trained model weights that might memorize patient information cannot be placed in a public GitHub repository. PhysioNet's April 2024 derived dataset guidelines reinforce this: derived datasets must be shared on PhysioNet under the same credentialed agreement.

The recommended architecture for noah-rn:

- **Ship the open-access 100-patient FHIR Demo** (or a download script for it) as the default development dataset — this is fully legal under the ODbL license and provides sufficient data for functional testing and CI/CD
- **Provide a setup script** (`setup-mimic-full.sh`) that authenticates with PhysioNet using the user's own credentials, downloads the full MIMIC-IV-on-FHIR NDJSON, and loads it into the local HAPI server — the standard pattern used by the MIMIC community
- **Document the credentialing process** in your README with estimated timelines and the CITI course trick (affiliate with "Massachusetts Institute of Technology Affiliates" for free access)
- **All code is encouraged to be open-source** — the license explicitly requires contributing code associated with publications to open repositories

One additional restriction to note: PhysioNet's September 2025 policy prohibits sending credentialed data through third-party APIs or using it on online platforms. Since noah-rn is a Claude Code plugin that processes FHIR data, ensure all data stays local — query the local HAPI server, pass structured results (not raw patient data) to the LLM. Local LLMs are "strongly recommended" by PhysioNet for MIMIC-derived work.

## Conclusion

The optimal path for noah-rn is a two-phase approach. **Phase 1 (today)**: download the openly available 100-patient MIMIC-IV FHIR Demo, load it into your existing HAPI FHIR v8.8.0 server with referential integrity disabled, build an itemID-to-LOINC mapping layer for vitals and labs, and implement an NDC-to-RxNorm crosswalk for drug interaction checking. This gives you 915,000 physiologically coherent FHIR resources with zero credentialing overhead. **Phase 2 (after credentialing, 3–8 weeks)**: apply for PhysioNet access, download the full MIMIC-IV on FHIR, and optionally extract a curated multi-phenotype cohort of 500–1,000 ICU patients for comprehensive CDS validation. Three gaps — allergies, Braden scale, and clinical notes — will need synthetic supplementation or acknowledgment as known limitations regardless of which MIMIC subset you use. The physiological coherence problem that drove the pivot from Synthea is definitively solved: a MIMIC patient with lactate 4.2 will have the MAP, vasopressor orders, and clinical trajectory that a 13-year ICU nurse would expect to see.