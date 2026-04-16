# Vitals Display — Web

Live Pulse vitals + Lead III ECG in a browser. Vite + React + uplot. Consumes
the Pulse sidecar at `http://localhost:8104` (override with `VITE_PULSE_URL`).

## Run

```bash
# Host (requires Pulse sidecar already running on localhost:8104):
npm install
npm run dev
# open http://localhost:5173

# Docker (run from services/sim-harness/bootstrap/):
docker compose up --build
```

## Shape

- `src/App.tsx` — page layout + history ring buffer.
- `src/VitalsTile.tsx` — one vital with current value + 60 s uplot sparkline.
- `src/EcgStrip.tsx` — Lead III ECG at 50 Hz, scrolling 10 s window.
- `src/useVitalsStream.ts` — SSE client with exponential backoff reconnect.
- `src/useEcgSamples.ts` — 5 Hz polling of `/engine/ecg`.

## Troubleshooting

- Blank page + connection pill red: the sidecar isn't reachable. Check
  `curl http://localhost:8104/healthz`.
- ECG flat: the engine may not be loaded. Force-reload via
  `curl -XPOST http://localhost:8104/engine/load -d '{}' -H content-type:application/json`.
- Vitals show `—`: the SSE is connected but hasn't received a payload yet.
  Should populate within 1 s.
