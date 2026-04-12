# Medplum Shift Report Contract

## Purpose

Define the first Medplum-native request/result contract for Shift Report while preserving Noah RN as the execution runtime.

This contract is intentionally narrow:

- **request** enters Medplum as a `Task`
- **execution** happens in Noah RN
- **result** returns to Medplum as a draft `DocumentReference`

## Request Resource: `Task`

Shift Report requests are represented as FHIR `Task` resources with the following shape:

### Required fields

- `resourceType`: `Task`
- `status`: `requested`
- `intent`: `order`
- `code.coding[0].system`: `https://noah-rn.dev/workflows`
- `code.coding[0].code`: `shift-report`
- `code.coding[0].display`: `Shift Report`
- `for.reference`: `Patient/<patient-id>`

### Recommended fields

- `description`: short clinician-facing reason for the request
- `encounter.reference`: `Encounter/<encounter-id>` when known
- `requester.display`: name of the requesting clinician or user
- `authoredOn`: request timestamp

### Example

```json
{
  "resourceType": "Task",
  "status": "requested",
  "intent": "order",
  "code": {
    "coding": [
      {
        "system": "https://noah-rn.dev/workflows",
        "code": "shift-report",
        "display": "Shift Report"
      }
    ],
    "text": "Generate Shift Report"
  },
  "for": {
    "reference": "Patient/patient-123"
  },
  "description": "Generate shift handoff draft for this patient"
}
```

## Result Resource: Draft `DocumentReference`

Shift Report output returns as a draft `DocumentReference`.

### Required fields

- `resourceType`: `DocumentReference`
- `status`: `current`
- `docStatus`: `preliminary`
- `subject.reference`: same patient as `Task.for`
- `type.coding[0].system`: `https://noah-rn.dev/artifacts`
- `type.coding[0].code`: `shift-report-draft`
- `type.coding[0].display`: `Draft Shift Report`
- `description`: `Draft Shift Report — requires nurse review`
- `content[0].attachment.contentType`: `text/plain`
- `content[0].attachment.data`: base64-encoded Shift Report text

### Recommended fields

- `author[0]`: pre-provisioned `Device/<id>` reference or display-only fallback such as `Noah RN Agent`
- `context.encounter[0].reference`: copied from `Task.encounter` when present

### Example

```json
{
  "resourceType": "DocumentReference",
  "status": "current",
  "docStatus": "preliminary",
  "subject": {
    "reference": "Patient/patient-123"
  },
  "type": {
    "coding": [
      {
        "system": "https://noah-rn.dev/artifacts",
        "code": "shift-report-draft",
        "display": "Draft Shift Report"
      }
    ],
    "text": "Draft Shift Report"
  },
  "description": "Draft Shift Report — requires nurse review",
  "content": [
    {
      "attachment": {
        "contentType": "text/plain",
        "data": "<base64>"
      }
    }
  ]
}
```

## Task Completion Contract

After Noah RN successfully creates the draft artifact, the worker updates the originating `Task`.

### Required fields on update

- `status`: `completed`
- `output[0].type.text`: `shift-report-draft`
- `output[0].valueReference.reference`: `DocumentReference/<id>`

### Example output linkage

```json
{
  "output": [
    {
      "type": {
        "text": "shift-report-draft"
      },
      "valueReference": {
        "reference": "DocumentReference/abc123",
        "display": "Draft Shift Report"
      }
    }
  ]
}
```

## Failure Contract

If execution fails:

- the worker may set `Task.status` to `failed`
- `Task.statusReason.text` should contain a concise machine-readable failure summary

The worker must not create a partial or misleading `DocumentReference`.

## Runtime Ownership

This contract explicitly preserves the runtime boundary:

- **Medplum owns** the request and review resources
- **Noah RN owns** execution

Therefore:

- context assembly remains in `clinical-mcp`
- Shift Report formatting remains in the existing harness path
- no duplicate Medplum-native Shift Report implementation is introduced

## Draft Rule

This is a **draft-only** contract.

To avoid draft artifacts being re-ingested as future source context by default:

- omit `DocumentReference.date`
- omit attachment creation timestamps

To preserve the Medplum-rails / Noah-runtime boundary:

- do not require the worker to bootstrap a Medplum `Device` resource during normal execution
- if a durable Medplum author identity is desired later, provision it out of band and pass the reference into the worker

This keeps the draft visible in Medplum while preventing simple feedback loops in the current `clinical-mcp` document query path.

It does **not** define:

- final approval semantics
- nurse sign-off workflow
- promotion from draft to final chart artifact

The default draft posture itself is now decided in:

- `docs/foundations/medplum-draft-review-lifecycle.md`

What remains later is the promotion/finalization path, not whether the first workflow uses a draft `DocumentReference`.
