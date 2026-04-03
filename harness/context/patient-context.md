# Patient Context Schema

The workspace agent builds this context incrementally from nurse input.
Context accumulates within a session and is passed to capabilities as needed.

## Schema

```yaml
patient:
  identifiers:
    room:               # from nurse input
    initials:           # from nurse input
    age:                # from nurse input
    sex:                # from nurse input
  code_status:          # full code / DNR / DNI / comfort — from nurse input
  allergies: []         # from nurse input — NEVER inferred
  history: []           # PMH items — from nurse input
  admission:
    date:               # if mentioned
    diagnosis:          # if mentioned
    team:               # covering providers if mentioned

  current_state:
    vitals: {}          # most recent vitals mentioned — timestamped
    labs: {}            # most recent labs mentioned — timestamped
    medications: []     # active meds mentioned
    infusions: []       # active drips with rates
    lines: []           # vascular access — type, location, gauge
    drains: []          # output devices — type, location, characteristics
    ventilator: {}      # mode, settings, FiO2 — if applicable
    assessment: {}      # most recent systems assessment data
    io_balance: {}      # if tracked this session

  scores: {}            # tool-computed only (GCS, NEWS2, Wells, etc.)

  context_provenance:
    assembled_from: "nurse verbal input"
    fields_present: []  # populated fields
    fields_absent: []   # fields with no data (explicitly tracked)
```

## Assembly Rules

1. **Build incrementally.** As the nurse talks, extract patient context and
   add it to the schema. The nurse never fills out a form.

2. **Never fabricate.** If the nurse did not mention a vital sign, it stays
   empty. An absent field is tracked in `fields_absent`, not guessed.
   Fabrication is the single worst failure mode.

3. **Scores are tool-computed.** If the nurse provides component values
   (e.g., E3V4M5), call the calculator tool and populate `scores.gcs`.
   The model does NOT compute clinical scores — wrong math kills.

4. **Session-scoped.** Persists within a conversation. Does not persist
   across sessions. No storage = no PHI risk.

5. **Least privilege.** When a capability is invoked, pass relevant slices
   of patient context, not the full blob. Drug reference gets medications
   and allergies. Protocol reference gets vitals and labs. Shift report
   gets everything mentioned.

6. **Nurse is the source of truth.** Context provenance is always
   "nurse verbal input." Even when context seems incomplete, the nurse
   knows what they know. Missing data is information, not an error.

## Context Update Triggers

The workspace agent updates context when the nurse:
- Provides new clinical information (vitals, labs, meds, assessment findings)
- Corrects prior information ("actually the K was 5.2, not 4.2")
- Adds patient history or identification details
- Reports new events (procedures, consults, changes in status)

## FHIR Hydration (Build-Time Only)

For eval scenarios and development, context can be pre-populated from the
MIMIC FHIR server at 10.0.0.184:8080 using `tools/fhir/mimic-loinc-query.sh`.

This is for testing only. Runtime Noah never auto-queries a FHIR server.
