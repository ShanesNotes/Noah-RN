# Noah RN Dashboard

EHR dashboard for Noah RN — connects to a local HAPI FHIR server with MIMIC-IV demo data.

## Stack

- **Vite + React + TypeScript**
- **Mantine** for UI components
- **Medplum React** for FHIR client and provider
- **HAPI FHIR R4** (local) as the data source

## Data Source

- **Server:** `http://10.0.0.184:8080/fhir` (local network)
- **Dataset:** MIMIC-IV Clinical Database Demo — 100 ICU patients, ~929K FHIR resources
- **Auth:** None (local network only)
- **No PHI** — de-identified research data only

## Features

- **Patient List** — Browse all patients with name, birth date, and gender
- **Vitals Panel** — Recent vital sign observations (HR, BP, RR, SpO2, Temp)
- **Labs Panel** — Laboratory observations with reference ranges
- **Medications Panel** — MedicationRequest history with status and dosing

## Known Data Gaps

- No `AllergyIntolerance` resources in MIMIC demo
- `clinicalStatus` and `status` fields unreliable on Conditions/MedicationRequests
- All encounters are historical (no in-progress state)
- Date-shifted timestamps (2100–2200 range)
- No RxNorm codes for medications (NDC/GSN only)

## Getting Started

```bash
npm install
npm run dev
```

The dashboard connects directly to the local HAPI FHIR server. No auth required.

## Architecture

```
App (MedplumProvider)
├── PatientList   → searchResources('Patient')
└── PatientDetail (selected)
    ├── VitalsPanel   → searchResources('Observation', code=...)
    ├── LabsPanel     → searchResources('Observation', exclude vitals)
    └── MedsPanel     → searchResources('MedicationRequest')
```

All panels use `useEffect` with cleanup to prevent stale state on patient switch.
