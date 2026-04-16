# Sim-Harness Standalone Bootstrap

One-command bring-up for the Noah RN sim-harness using the **Pulse Physiology
Engine** (Apache-2.0, Kitware) with a live vitals + Lead III ECG display.

This module is **standalone**. It has zero dependency on the rest of the Noah
RN product surfaces — `services/clinical-mcp/`, `apps/nursing-station/`,
`packages/agent-harness/`, `packages/workflows/`, `packages/contracts/`. You
could check this directory out on its own and it would still run. The goal is
to prove the sim-harness works end-to-end against a real physiology engine
before wiring it into the three-product alignment architecture.

## Quickstart

```bash
cd services/sim-harness/bootstrap
./scripts/bootstrap.sh
```

Wait 10–30 s on first run (pulling `kitware/pulse:4.3.1` is ~1.3 GB). Then:

- Web display:     http://localhost:5173
- Pulse sidecar:   http://localhost:8104/healthz
- Terminal display (optional): `cd vitals-display-cli && npm install && node dashboard.js`

Teardown:

```bash
./scripts/teardown.sh
```

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

## Components

| Directory                | What it is                                             |
|--------------------------|--------------------------------------------------------|
| `pulse-sidecar/`         | Python FastAPI wrapper around the Pulse engine         |
| `vitals-display-web/`    | Vite + React + uplot browser dashboard                 |
| `vitals-display-cli/`    | Node + blessed-contrib terminal dashboard              |
| `scripts/`               | `bootstrap.sh` / `test-sidecar.sh` / `teardown.sh`     |
| `docker-compose.yml`     | Wires pulse-sidecar + vitals-display-web on a bridge   |
| `ATTRIBUTION.md`         | Kitware Pulse attribution + Apache-2.0 statement       |

See each directory's own README for per-component docs.

## Endpoint reference (Pulse sidecar)

| Method | Path             | Description                                             |
|--------|------------------|---------------------------------------------------------|
| GET    | `/healthz`       | Liveness + engine status                                |
| POST   | `/engine/load`   | `{ "patient_state"?: string }` → loads stabilized state |
| GET    | `/engine/vitals` | Current snapshot: HR, SBP, DBP, MAP, RR, SpO2, EtCO2, CoreTemp |
| GET    | `/engine/ecg`    | Last 10 s of Lead III samples @ 50 Hz                   |
| GET    | `/engine/stream` | Server-Sent Events, vitals @ 1 Hz                       |
| POST   | `/engine/reset`  | Reload current patient state                            |
| DELETE | `/engine`        | Stop tick task, null the engine                         |

## Test dataset

Uses the `StandardMale@0s.json` pre-stabilized state file shipped inside the
upstream `kitware/pulse:4.3.1` image. No stabilization wait on startup. Expect
baseline vitals roughly:

| Vital      | Expected baseline |
|------------|-------------------|
| HR         | ~72 bpm           |
| SBP / DBP  | ~118 / 76 mmHg    |
| MAP        | ~90 mmHg          |
| SpO2       | ~0.99 (99 %)      |
| RR         | ~16 /min          |
| EtCO2      | ~38 mmHg          |
| Core temp  | ~37.0 °C          |

Override with `PULSE_STATE_FILE` in `docker-compose.yml` to load a different
shipped patient (StandardFemale, Carol, Cynthia, Gus, Hassan, Jeff, Joel,
Nathan, Rupert, Soldier). Custom patients / custom stabilized states are a
follow-up (see Non-goals below).

## Runtime invariants

- **Single worker only** on the sidecar — Pulse engine is single-threaded.
  `uvicorn --workers 1` is hardcoded in the Dockerfile.
- **Asyncio lock** serializes engine access. HTTP handlers read from a
  snapshot cache; only the background tick task calls `advance_time_s` +
  `pull_data`.
- **Real-time pacing** — one simulated second ≈ one wall second at 50 Hz.
  Time acceleration / freeze is a future endpoint.

## Troubleshooting

- **Sidecar never becomes healthy.** Check `docker compose logs pulse-sidecar`.
  Common cause: `StandardMale@0s.json` path differs in this Pulse image build.
  Run:
  ```bash
  docker run --rm kitware/pulse:4.3.1 find / -name 'StandardMale@0s.json' 2>/dev/null
  ```
  Then set `PULSE_STATE_FILE=<found path>` in `docker-compose.yml` and rebuild.
- **Port already in use.** Override: `PULSE_PORT=9104 DISPLAY_PORT=6173 ./scripts/bootstrap.sh`.
- **Vitals show `—` in the browser.** SSE connected but no payload yet; wait
  1 s. If it persists, check `curl localhost:8104/engine/vitals`.
- **ECG flat.** `curl -XPOST localhost:8104/engine/load -d '{}' -H content-type:application/json`.
- **First build is slow.** `kitware/pulse:4.3.1` is ~1.3 GB; subsequent builds
  use the cache.

## Non-goals (explicitly out of scope for this bootstrap)

- Node `PulseEngineAdapter` implementing `SimulationEngineAdapter<T>` —
  follow-up task.
- Integration into existing `services/sim-harness/src/scenario/controller.ts`
  or the 3 hand-authored TypeScript scenarios — follow-up.
- FHIR writes to Medplum / DeviceBridge wiring — follow-up.
- clinical-mcp MCP tool exposure — the sim-harness MCP skeleton
  (`services/sim-harness/src/mcp/server.ts`) is a separate surface.
- Alarm classification — follow-up (Lane C of the execution packet).
- Multi-patient library — follow-up.
- Authentication on the sidecar — assumes localhost-only.
- Fixing the pre-existing `scenario-controller.test.ts` timeouts — tracked
  under the three-product alignment plan.

## Follow-up pointers

- Three-product alignment plan: `docs/plans/three-product-alignment-2026-04-16.md`
- Governing simulation contracts: `docs/foundations/foundational-contracts-simulation-architecture.md`
- Invariant kernel: `docs/foundations/invariant-kernel-simulation-architecture.md`
- Waveform vision contract: `docs/foundations/sim-harness-waveform-vision-contract.md`

## License

This bootstrap is a thin layer over the Pulse Physiology Engine
(Apache-2.0, Kitware). The `kitware/pulse:4.3.1` base image carries the
upstream `NOTICE` and `LICENSE` files at `/`. See [ATTRIBUTION.md](ATTRIBUTION.md)
for the repo-level attribution.
