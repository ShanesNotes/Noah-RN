# Sim-Harness Standalone Bootstrap — Pulse Engine + Vitals Display

> **Status.** Plan drafted 2026-04-16. **NEW TASK — supersedes the three-product alignment plan that previously lived in this file** (that plan is still the canonical execution record at `docs/plans/three-product-alignment-2026-04-16.md`, 9/10 phases landed on `main`). This new plan is a different task: bring up the Pulse physiology engine as a standalone module with live vitals + display, with **zero dependency** on the product surfaces (clinical-mcp, nursing-station, agent-harness, packages/workflows, packages/contracts).
>
> **Promotion note.** Per durable user feedback (visible plans live in `docs/plans/`), upon approval this plan should be promoted to `docs/plans/sim-harness-bootstrap-2026-04-16.md`. This file is the plan-mode scratchpad.

## Context

The user wants the sim-harness running end-to-end with a test patient, the Pulse Physiology Engine driving real physiology, and a live vitals display that can be launched with one command. The bootstrap has to stand alone — not contingent on the three-product alignment work, not wired into Medplum or clinical-mcp, not requiring an agent harness to drive it. Open-source only.

Phase 1 exploration surfaced three critical corrections to earlier planning assumptions:

1. **Pulse has an official Docker image.** Earlier plan text assumed `pip install pulse-physiology-engine`. Reality: Kitware ships `kitware/pulse:4.3.1` on Docker Hub (~1.3 GB, pushed Jan 2025). The bootstrap sidecar will `FROM kitware/pulse:4.3.1`, not build from PyPI. There is no PyPI package today; the `pulse` entry on PyPI is an unrelated 2009 WSGI middleware.
2. **Pulse state files are JSON, not `.pbb`.** Earlier plan text said pre-baked `.pbb`. Reality in Pulse 4.x: JSON patient definitions (`patients/StandardMale.json`) and JSON stabilized states (`states/StandardMale@0s.json`). Binary-protobuf exists but JSON is the happy path. The image ships ~12 stock patients (StandardMale, StandardFemale, Carol, Cynthia, Gus, Hassan, Jeff, Joel, Nathan, Rupert, Soldier).
3. **Python API is concise and well-documented.** `PulseEngine().serialize_from_file(path)` → `advance_time_s(0.02)` → `pull_data()` tuple. Engine tick is native 0.02 s (50 Hz). ECG is exposed via `SEDataRequest.create_ecg_request('Lead3ElectricPotential')` — **Lead III only**, interpolated per cardiac cycle, no multi-lead support. Pulse is **single-threaded and stateful**, so the FastAPI wrapper must be a singleton engine with asyncio.Lock and `--workers 1`.

User decisions (from AskUserQuestion this session):

- **Display stack: BOTH a Vite+React+uplot web app and a blessed-contrib terminal CLI.** Web as the primary (best ECG scroll); CLI as a headless/SSH fallback.
- **Scope: Sidecar + display ONLY.** No Node `PulseEngineAdapter`, no integration into the existing `services/sim-harness/src/scenario/controller.ts`, no exercise of the existing `SimulationEngineAdapter<T>` contract. Those remain follow-ups.

The existing `services/sim-harness/` code (clock, waveform-buffer, scenario controller, reference-PK adapter) is **not modified** by this plan. It stays intact for the three-product alignment work. The bootstrap is a separate subdirectory that shares only the repo location, not imports or runtime.

## Architecture

```
┌──────────────────────────────────┐       ┌────────────────────────────────┐
│  Pulse Sidecar (Docker)          │       │  Vitals Display — Web          │
│  FROM kitware/pulse:4.3.1        │◀─SSE──│  Vite + React + uplot          │
│  + FastAPI + uvicorn             │       │  http://localhost:5173         │
│  :8104                           │       │  6 vitals tiles + ECG strip    │
│                                  │       └────────────────────────────────┘
│  singleton PulseEngine           │       ┌────────────────────────────────┐
│  asyncio.Lock                    │◀─REST─│  Vitals Display — Terminal     │
│  background task @ 20 ms (50 Hz) │       │  node + blessed-contrib        │
│  last-snapshot cache             │       │  (headless / SSH)              │
└──────────────────────────────────┘       └────────────────────────────────┘
```

One command launches Pulse + the web display via docker-compose. The terminal CLI is a separate Node entrypoint (`node dashboard.js`) that can run against a local or remote sidecar.

## Location

`services/sim-harness/bootstrap/` — sits inside sim-harness but is standalone: its own Dockerfiles, its own package.json, no imports from the existing `services/sim-harness/src/` code. README at the top makes the standalone posture explicit.

## Files to create

### `services/sim-harness/bootstrap/docker-compose.yml`
Two services: `pulse-sidecar` (build from `./pulse-sidecar/`, expose 8104, healthcheck on `/healthz`) and `vitals-display-web` (build from `./vitals-display-web/`, expose 5173, depends_on pulse-sidecar). Single `noah-sim-net` bridge network so the web container resolves `pulse-sidecar:8104`. Port envvars `PULSE_PORT` / `DISPLAY_PORT` documented for override.

### `services/sim-harness/bootstrap/pulse-sidecar/`

**`Dockerfile`**
```
FROM kitware/pulse:4.3.1
RUN pip install --no-cache-dir fastapi==0.115.* "uvicorn[standard]==0.30.*"
COPY server.py /app/server.py
WORKDIR /app
EXPOSE 8104
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s CMD \
  python -c "import urllib.request,sys; urllib.request.urlopen('http://localhost:8104/healthz',timeout=2)"
CMD ["uvicorn","server:app","--host","0.0.0.0","--port","8104","--workers","1"]
```

**`server.py`** — FastAPI app. Module-level singleton `PulseEngine` + `asyncio.Lock`. Structure:

- **Startup hook** builds an `SEDataRequestManager` for: HeartRate (Per_min), SystolicArterialPressure / DiastolicArterialPressure / MeanArterialPressure (mmHg), RespirationRate (Per_min), OxygenSaturation, EndTidalCarbonDioxidePressure (mmHg), CoreTemperature (C), `create_ecg_request('Lead3ElectricPotential')`. Then `pulse.serialize_from_file(STATE_FILE)` where `STATE_FILE` defaults to `/usr/local/share/pulse/states/StandardMale@0s.json` (path to verify during Dockerfile authoring — the kitware image location is confirmed by the `Using-Python` wiki; if the path differs, probe with `find / -name 'StandardMale@0s.json'` at build time and pin the result in the Dockerfile).

- **Background tick task** — `asyncio.create_task` running a loop that, under `asyncio.Lock`, calls `pulse.advance_time_s(0.02)` and `pulse.pull_data()`, then appends the scalar vitals to a latest-snapshot dict and the ECG sample to a `collections.deque(maxlen=500)` (10 s at 50 Hz). Loop throttles to real time via `asyncio.sleep(0.02)` so 1 simulated second ≈ 1 wall second.

- **Endpoints:**
  - `GET /healthz` → `{ status: "ok", pulse_version: "4.3.1", engine_loaded: bool, engine_time_s: float }`
  - `POST /engine/load` → body `{ patient_state?: string }` (default `"StandardMale@0s"`) → reloads state file under lock. Returns `{ engine_id: uuid, loaded_at: iso, patient_state: string }`.
  - `GET /engine/vitals` → latest snapshot `{ hr, sbp, dbp, map, rr, spo2, etco2, core_temp, engine_time_s, captured_at: iso }`.
  - `GET /engine/ecg` → `{ samples: number[], sample_rate_hz: 50, duration_s: 10, end_time_s: float }` — last 10 s of Lead III.
  - `GET /engine/stream` → Server-Sent Events, yields the vitals snapshot every 1 s, `Content-Type: text/event-stream`.
  - `POST /engine/reset` → reload current state file.
  - `DELETE /engine` → stop the tick task and null the engine.

- **Error model:** raises `HTTPException(503, "engine not loaded")` when endpoints requested before `/engine/load` completes; auto-load on startup so healthz reports loaded within ~1 s.

**`requirements.txt`**
```
fastapi==0.115.*
uvicorn[standard]==0.30.*
```

**`README.md`** — one-page endpoint reference, build/run commands, path-to-state-file note.

### `services/sim-harness/bootstrap/vitals-display-web/`

**`package.json`** — scripts: `dev` (vite), `build` (vite build), `preview` (vite preview). Dependencies: `react@^18`, `react-dom@^18`, `uplot@^1.6`. Dev deps: `vite@^5`, `@vitejs/plugin-react@^4`, `typescript@^5.6`, `@types/react`, `@types/react-dom`.

**`vite.config.ts`** — `server.port = 5173`, `server.proxy['/api'] = { target: 'http://pulse-sidecar:8104' in Docker, http://localhost:8104 on host, rewrite strip '/api' prefix }`. Use `VITE_PULSE_URL` env to switch targets.

**`index.html`** — minimal shell mounting `#root`.

**`src/main.tsx`** — React root, renders `<App />`.

**`src/App.tsx`** — page layout: header (patient label + engine clock + connection pill), 6-tile vitals grid, ECG strip. Uses `useVitalsStream()` for live numerics and `useEcgSamples()` for the strip.

**`src/VitalsTile.tsx`** — props `{ label, unit, value, range }`; renders label, large current value, unit, and a tiny 60s sparkline (uplot line chart) kept in a local ring buffer.

**`src/EcgStrip.tsx`** — full-width uplot canvas. Props `{ samples: number[], sampleRateHz: 50 }`. Scrolls 10 s window, ECG grid (25 mm/s equivalent at display scale). Throttled repaint at ~30 fps.

**`src/useVitalsStream.ts`** — `EventSource('/api/engine/stream')`, parses JSON `data:` events into state. Exponential backoff on close.

**`src/useEcgSamples.ts`** — polls `GET /api/engine/ecg` every 200 ms (5 Hz poll, 10 s samples → fresh data every poll). Returns `{ samples: number[], endTimeS: number }`.

**`Dockerfile`** (optional — for docker-compose) — `FROM node:20-alpine`, npm ci, CMD `npm run dev -- --host 0.0.0.0`.

**`README.md`** — `npm install && npm run dev` (host), or run via docker-compose.

### `services/sim-harness/bootstrap/vitals-display-cli/`

**`package.json`** — deps `blessed@^0.1`, `blessed-contrib@^4.11`. Script: `start`: `node dashboard.js`.

**`dashboard.js`** — node script:
- Reads `BASE_URL` env (default `http://localhost:8104`).
- `blessed.screen()` with `blessed-contrib.grid`.
- Layout: top row = gauge/LCD for HR, BP, SpO2, RR, EtCO2, Temp; middle row = line charts for HR (60s) and MAP (60s); bottom row = ECG mini-strip (sparkline from ECG samples).
- Polls `/engine/vitals` at 1 Hz and `/engine/ecg` at 5 Hz. No SSE (blessed does async poorly with event streams; poll is simpler and good enough for terminal).
- `q` / `Escape` to quit; `r` to POST `/engine/reset`.

**`README.md`** — `node dashboard.js`, `BASE_URL=http://host:8104 node dashboard.js`.

### `services/sim-harness/bootstrap/scripts/`

**`bootstrap.sh`** — POSIX shell:
```
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose up -d --build
# wait for healthz
for i in $(seq 1 60); do
  curl -sf http://localhost:8104/healthz >/dev/null && break
  sleep 1
done
echo "Pulse sidecar:    http://localhost:8104/healthz"
echo "Web display:      http://localhost:5173"
echo "Terminal display: cd vitals-display-cli && npm install && node dashboard.js"
```

**`test-sidecar.sh`** — smoke test:
```
curl -sf http://localhost:8104/healthz | grep -q '"status":"ok"'
curl -sfX POST http://localhost:8104/engine/load -H content-type:application/json -d '{}' >/dev/null
sleep 3
VITALS=$(curl -sf http://localhost:8104/engine/vitals)
echo "$VITALS" | python3 -c 'import sys,json; v=json.load(sys.stdin); \
  assert 40 < v["hr"] < 140, v; \
  assert 50 < v["map"] < 140, v; \
  assert 80 < v["spo2"] <= 100, v; \
  print("OK", v)'
```

**`teardown.sh`** — `docker compose down -v`.

### `services/sim-harness/bootstrap/README.md`

Top-level documentation:
- One-paragraph scope statement (standalone, Pulse + display, no product wiring).
- Quickstart: `./scripts/bootstrap.sh`.
- Architecture diagram (same as above).
- Endpoint table.
- Troubleshooting (port conflicts, container cold-start time, state-file path verification).
- License: Apache-2.0 note with Kitware + Pulse attribution. Keep `NOTICE` + `LICENSE` files from upstream kitware/pulse image intact (already at `/` in the image); add repo-level `ATTRIBUTION.md` at `services/sim-harness/bootstrap/ATTRIBUTION.md` naming Kitware and linking to https://gitlab.kitware.com/physiology/engine.
- Follow-up pointer: Node `PulseEngineAdapter` is a separate task.

### `services/sim-harness/bootstrap/ATTRIBUTION.md`

Short Kitware Pulse attribution + Apache-2.0 statement. Transitive notices (Eigen MPL2, protobuf BSD-3) are carried by the upstream image's `NOTICE`; preserving the base image covers them.

## Critical reusable references (Phase 1 findings)

The bootstrap does NOT need to import these, but they are the reference shapes for later follow-up (Node adapter work):

- `services/sim-harness/src/engine-adapter.ts` — `SimulationEngineAdapter<TState>` interface the future PulseEngineAdapter will implement.
- `services/sim-harness/src/reference/adapter.ts` — `ReferencePkEngineAdapter` — reference structure for adapter contract (Hill equation + fluid bolus + AR1 noise). Don't use its logic for Pulse, but use its shape.
- `services/sim-harness/src/waveform-renderer.ts` — existing SVG ECG renderer (25 mm/s sweep, 10 mm/mV, base64-encoded). The bootstrap **skips this** and uses uplot directly; later integration work may route Pulse waveforms through this renderer for parity with the rest of the sim-harness.

## Verification

### Manual bring-up
```bash
cd services/sim-harness/bootstrap
./scripts/bootstrap.sh
# wait ~10–30 s for first image pull + build
```

### Sidecar smoke test
```bash
./scripts/test-sidecar.sh
# asserts healthz ok, load succeeds, vitals in reasonable ranges
```

### Web display manual check
Open `http://localhost:5173`. Expect:
- Patient label "StandardMale@0s" visible.
- HR around 72 bpm, SBP/DBP around 118/76, SpO2 near 99, RR near 16, Temp near 37.0 °C.
- ECG Lead III scrolling at 50 Hz with recognizable QRS complexes.
- Connection pill green when the EventSource is connected.
- After 60 s, vitals tile sparklines show ~60 data points each.

### Terminal display manual check
```bash
cd vitals-display-cli && npm install && node dashboard.js
# expect blessed-contrib grid with live numerics + HR/MAP line charts + ECG mini-strip
# `q` quits cleanly
```

### Container restart resilience
```bash
docker compose restart pulse-sidecar
sleep 10
curl http://localhost:8104/healthz
# expect status ok again; engine_time_s resets to 0
```

## Non-goals (explicitly out of scope)

- Node `PulseEngineAdapter` implementing `SimulationEngineAdapter<PulseSerializedState>`.
- Integration into existing `services/sim-harness/src/scenario/controller.ts` (including the 3 hand-authored TypeScript scenarios pressor-titration / fluid-responsive / hyporesponsive).
- FHIR writes to Medplum / DeviceBridge wiring.
- clinical-mcp MCP tool exposure (`sim_get_vitals_snapshot` etc. remain the Phase 8a skeleton stubs from the three-product alignment plan).
- Alarm classification (Contract 4 Lane C).
- Multi-patient support (single `StandardMale@0s` for bootstrap; other shipped patients are available but unwired).
- Scenario authoring (SAC-1 contract untouched).
- Authentication / authorization on the sidecar (localhost-only default).
- Windows Docker support (document Linux + macOS x86-64 + ARM64; Pulse 4.3 ARM binaries are reported working in the upstream image).
- Fixing the 5 pre-existing `scenario-controller.test.ts` failures (tracked separately under three-product alignment Phase 8b).

## Risks + mitigations

1. **Pulse engine is single-threaded and stateful.** Mitigation: singleton pattern + `asyncio.Lock` + `uvicorn --workers 1`. Reject multi-worker configurations at startup with a clear error.
2. **`kitware/pulse:4.3.1` base image is ~1.3 GB.** Mitigation: first-run documentation calls this out explicitly; subsequent pulls are cached.
3. **State file path inside the upstream image not yet pinned.** Mitigation: during Dockerfile authoring run `find / -name 'StandardMale@0s.json'` in a throwaway container, pin the exact path as `STATE_FILE_DEFAULT` in `server.py`.
4. **SSE reconnect behavior differs across browsers.** Mitigation: exponential backoff in `useVitalsStream` (1s → 2s → 4s → capped 10s). Reconnects transparent to the user.
5. **Port 8104 or 5173 already in use on the host.** Mitigation: document `PULSE_PORT` and `DISPLAY_PORT` env var overrides consumed by docker-compose.
6. **ECG sample buffer boundary artifacts at the 10s rolling window edge.** Mitigation: overlap-draw the previous window's last ~200 ms when stitching new samples in uplot; document this in `EcgStrip.tsx`.
7. **`pull_data()` tuple ordering sensitive to `SEDataRequestManager` build order.** Mitigation: assign each request a Python variable and read by name in the tick loop rather than unpacking the tuple positionally. Protects against silent reordering.
8. **blessed-contrib has spotty terminal support.** Mitigation: document known-good terminals (kitty, iTerm2, modern xterm); flag alacritty truecolor quirks if they surface.

## Effort estimate

- Pulse sidecar Dockerfile + server.py: 2–3 hours.
- Vite web display (App + tiles + ECG strip + hooks): 2–3 hours.
- blessed-contrib terminal CLI: 1 hour.
- docker-compose + scripts + ATTRIBUTION + README: 1 hour.
- Smoke tests + path verification + troubleshooting pass: 1 hour.

Total: **~0.5–1 day single-contributor work.**

## Open follow-ups (separate plans)

1. Node `PulseEngineAdapter` — integrates with existing `SimulationEngine` / `SimulationClock` / `services/sim-harness/src/scenario/controller.ts`. Drives `fluid-responsive.ts` through Pulse instead of `ReferencePkEngineAdapter`. Exercises the existing `waveform-buffer` + `waveform-renderer`.
2. Scenario authoring — move the 3 hand-authored TypeScript fixtures under `services/sim-harness/scenarios/__fixtures__/` and add a SAC-1 loader (three-product alignment Phase 8b).
3. Alarm classification — `services/sim-harness/src/projections/alarms.ts` with IEC 60601-1-8 attention classes (three-product alignment Phase 8b, Lane C).
4. Multi-patient + custom stabilized states — support `POST /engine/load { patient: "StandardFemale@0s" }` plus a `/engine/stabilize` endpoint that bakes a new state file from a raw patient definition.
5. FHIR DeviceBridge wiring — optional re-enable of `services/sim-harness/src/device-bridge.ts` with Medplum.
