# Apps

Runnable user-facing applications live here.

Current apps:
- `nursing-station/` — Medplum-first clinician workspace for patient and task flows (Mantine 8, required by Medplum SDK)
- `clinician-dashboard/` — runtime-console sidecar for evals, traces, context inspection, skills, and terminal/operator workflows (Mantine 7)

Both apps share a unified design system via shared tokens.

Useful commands:

```bash
npm run dev --workspace apps/nursing-station
npm run build --workspace apps/nursing-station
npm run lint --workspace apps/nursing-station

npm run dev --workspace apps/clinician-dashboard
npm run build --workspace apps/clinician-dashboard
npm run test --workspace apps/clinician-dashboard
```

Rule:
- build UI work in `apps/nursing-station/` unless the work is explicitly sidecar/runtime-console scope
- keep dashboard work narrow and operational
