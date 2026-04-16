# `noah-clinical-tools`

Responsibility:
- register deterministic Noah RN tools as Pi-native tools without moving their logic out of `tools/`

Current capabilities:
- `noah_unit_conversion` — wraps `tools/unit-conversions/convert.sh`
- `noah_clinical_score` — wraps the calculator scripts in `tools/clinical-calculators/`
- `noah_io_tracker` — wraps `tools/io-tracker/track.sh`
- `noah_drug_lookup` — wraps `tools/drug-lookup/lookup.sh`
- `noah_trace` — wraps `tools/trace/trace.sh`

Primary sources of truth:
- `tools/clinical-calculators/`
- `tools/drug-lookup/`
- `tools/unit-conversions/`
- `tools/io-tracker/`
- `tools/trace/`

Rule:
- deterministic logic stays in shell tools
- this extension is registration and argument-shaping only
