#!/usr/bin/env bash
# Smoke test — assumes pulse-sidecar is already running on PULSE_PORT (8104).
set -euo pipefail

: "${PULSE_PORT:=8104}"
BASE_URL="http://localhost:${PULSE_PORT}"

printf '[test] GET %s/healthz\n' "${BASE_URL}"
HEALTHZ=$(curl -sf "${BASE_URL}/healthz")
echo "$HEALTHZ" | python3 -c '
import json, sys
h = json.load(sys.stdin)
assert h["status"] == "ok", h
assert h["pulse_bindings_available"] is True, ("pulse bindings missing", h)
print("[test] healthz ok ·", h)
'

printf '[test] POST %s/engine/load\n' "${BASE_URL}"
curl -sfX POST "${BASE_URL}/engine/load" \
  -H content-type:application/json \
  -d '{}' >/dev/null

printf '[test] waiting 5s for engine to tick…\n'
sleep 5

printf '[test] GET %s/engine/vitals\n' "${BASE_URL}"
VITALS=$(curl -sf "${BASE_URL}/engine/vitals")
echo "$VITALS" | python3 -c '
import json, sys
v = json.load(sys.stdin)
assert 40 < v["hr"] < 160, ("hr out of range", v)
assert 50 < v["map"] < 140, ("map out of range", v)
assert 0 < v["spo2"] <= 1.01, ("spo2 out of 0-1 range", v)
assert 5 < v["rr"] < 40, ("rr out of range", v)
assert 30 < v["core_temp"] < 42, ("temp out of range", v)
print("[test] vitals ok ·", v)
'

printf '[test] GET %s/engine/ecg\n' "${BASE_URL}"
ECG=$(curl -sf "${BASE_URL}/engine/ecg")
echo "$ECG" | python3 -c '
import json, sys
e = json.load(sys.stdin)
assert len(e["samples"]) > 100, ("too few ecg samples", len(e["samples"]))
assert e["sample_rate_hz"] == 50.0, ("unexpected sample rate", e["sample_rate_hz"])
print("[test] ecg ok ·", len(e["samples"]), "samples @", e["sample_rate_hz"], "Hz")
'

printf '[test] all checks passed\n'
