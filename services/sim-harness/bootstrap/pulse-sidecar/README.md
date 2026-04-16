# Pulse Sidecar

FastAPI wrapper around the Pulse Physiology Engine (Apache-2.0, Kitware).
Serves live vitals + Lead III ECG over HTTP so a standalone display can render
them without touching the Pulse engine directly.

## Build + run

From `services/sim-harness/bootstrap/`:

```bash
docker compose up --build pulse-sidecar
# or standalone:
docker build -t noah-pulse-sidecar:dev ./pulse-sidecar
docker run --rm -p 8104:8104 noah-pulse-sidecar:dev
```

First build pulls `kitware/pulse:4.3.1` (~1.3 GB). Subsequent builds are cached.

## Endpoints

| Method | Path             | Description                                          |
|--------|------------------|------------------------------------------------------|
| GET    | `/healthz`       | Liveness + engine status                             |
| POST   | `/engine/load`   | Body `{ "patient_state": "StandardMale@0s" }`        |
| GET    | `/engine/vitals` | Current snapshot: HR, SBP, DBP, MAP, RR, SpO2, EtCO2, CoreTemp |
| GET    | `/engine/ecg`    | Last 10 s of Lead III samples at 50 Hz               |
| GET    | `/engine/stream` | Server-Sent Events, vitals @ 1 Hz                    |
| POST   | `/engine/reset`  | Reload the current patient state                     |
| DELETE | `/engine`        | Stop tick task and null the engine                   |

## Environment variables

| Variable                   | Default                                                  | Purpose                                                 |
|----------------------------|----------------------------------------------------------|---------------------------------------------------------|
| `PULSE_STATE_FILE`         | `/usr/local/share/pulse/states/StandardMale@0s.json`     | Path to pre-stabilized Pulse state file inside container |
| `PULSE_LOG_FILE`           | `/tmp/pulse.log`                                         | Pulse engine log destination                            |
| `PULSE_TICK_SECONDS`       | `0.02`                                                   | Engine tick (seconds). 0.02 = 50 Hz.                    |
| `PULSE_ECG_BUFFER_SECONDS` | `10`                                                     | Size of the rolling ECG buffer                          |

## Runtime invariants

- **Single worker only.** Pulse engine is single-threaded; running with
  `--workers N>1` creates one engine per worker and breaks all shared state.
  The Dockerfile hardcodes `--workers 1`; do not override.
- **Asyncio lock.** Engine access is serialized behind `state.lock`. HTTP
  handlers read from the latest snapshot cache, not the engine.
- **Real-time pacing.** The background tick task throttles to wall time so one
  simulated second ~= one wall-clock second. The sidecar does not support
  time acceleration in v0 (future `/engine/tick-mode` endpoint).

## State file path

If the base image layout differs from the hardcoded
`/usr/local/share/pulse/states/StandardMale@0s.json`, find the actual path once
during first build:

```bash
docker run --rm kitware/pulse:4.3.1 find / -name 'StandardMale@0s.json' 2>/dev/null
```

Then export `PULSE_STATE_FILE=/path/you/found` in `docker-compose.yml`.

## Smoke test

```bash
curl -s http://localhost:8104/healthz | jq
curl -s http://localhost:8104/engine/vitals | jq
```
