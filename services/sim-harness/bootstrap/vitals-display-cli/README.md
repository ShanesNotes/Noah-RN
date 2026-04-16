# Vitals Display — Terminal

Headless / SSH dashboard for the Pulse sidecar. Node + `blessed-contrib`.
Polls the sidecar over plain HTTP — no browser, no build step.

## Run

```bash
# From services/sim-harness/bootstrap/vitals-display-cli/
npm install
node dashboard.js
```

Configure via `BASE_URL` (default `http://localhost:8104`):

```bash
BASE_URL=http://some-host:8104 node dashboard.js
```

## Key bindings

| Key            | Action                        |
|----------------|-------------------------------|
| `q` / `Esc`    | Quit                          |
| `r`            | `POST /engine/reset`          |

## Layout

```
┌─HR bpm──┐ ┌─SBP──┐ ┌─DBP──┐ ┌─SpO2──┐ ┌─RR──┐ ┌─EtCO2──┐
│   72    │ │ 118  │ │  76  │ │  99%  │ │ 16  │ │   38   │
└─────────┘ └──────┘ └──────┘ └───────┘ └─────┘ └────────┘

┌ Heart rate — 60s ─────┐  ┌ MAP — 60s ────────────┐
│ /\/\/\/\/\/\/\/\/\/\  │  │ ~~~~~~~~~~~~~~~~~~~~~ │
└──────────────────────┘  └──────────────────────┘

┌ ECG Lead III — last 10 s ─────────────────────────┐
│         ^         ^         ^         ^           │
│   ─────/ \───────/ \───────/ \───────/ \──────    │
└───────────────────────────────────────────────────┘

engine_time=12.5s · last_captured=17:34:18 · http://localhost:8104
[ q / Esc to quit · r to reset engine ]
```

## Known issues

- blessed-contrib sporadically mis-renders the LCD digits on some terminals
  during resize. Quit + relaunch if it happens.
- The ECG strip downsamples 50 Hz → 12.5 Hz (every 4th sample) to keep the
  blessed-contrib line chart responsive. Fine for eyeballing rhythm; not a
  clinical rendering.
