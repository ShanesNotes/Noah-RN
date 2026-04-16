"""Pulse Physiology Engine FastAPI sidecar.

Wraps a single Pulse engine instance behind an HTTP surface the standalone
sim-harness bootstrap consumes. Pulse is single-threaded and stateful, so we
hold one engine in module state, guard it with an asyncio.Lock, and run uvicorn
with --workers 1. A background task advances the engine at 20 ms cadence
(50 Hz) to keep one simulated second ~= one wall-clock second; HTTP handlers
only read from the latest-snapshot cache, never touch the engine directly.

See services/sim-harness/bootstrap/README.md for endpoints and usage.
"""

from __future__ import annotations

import asyncio
import collections
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Deque, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

try:
    from pulse.engine.PulseEngine import PulseEngine  # type: ignore[import-not-found]
    from pulse.cdm.engine import (  # type: ignore[import-not-found]
        SEDataRequest,
        SEDataRequestManager,
    )
    from pulse.cdm.scalars import (  # type: ignore[import-not-found]
        FrequencyUnit,
        PressureUnit,
        TemperatureUnit,
    )

    PULSE_AVAILABLE = True
except Exception as exc:  # pragma: no cover - import failure is environmental
    PULSE_AVAILABLE = False
    _PULSE_IMPORT_ERROR: Optional[BaseException] = exc
    PulseEngine = None  # type: ignore[assignment]
    SEDataRequest = None  # type: ignore[assignment]
    SEDataRequestManager = None  # type: ignore[assignment]
    FrequencyUnit = None  # type: ignore[assignment]
    PressureUnit = None  # type: ignore[assignment]
    TemperatureUnit = None  # type: ignore[assignment]
else:
    _PULSE_IMPORT_ERROR = None

log = logging.getLogger("pulse-sidecar")
logging.basicConfig(level=logging.INFO)

# ----- Configuration -----

STATE_FILE_DEFAULT = os.environ.get(
    "PULSE_STATE_FILE",
    "/usr/local/share/pulse/states/StandardMale@0s.json",
)
LOG_FILE = os.environ.get("PULSE_LOG_FILE", "/tmp/pulse.log")
TICK_SECONDS = float(os.environ.get("PULSE_TICK_SECONDS", "0.02"))  # 50 Hz
ECG_BUFFER_SECONDS = float(os.environ.get("PULSE_ECG_BUFFER_SECONDS", "10"))
ECG_SAMPLE_RATE_HZ = 1.0 / TICK_SECONDS
ECG_BUFFER_LEN = int(ECG_SAMPLE_RATE_HZ * ECG_BUFFER_SECONDS)

# ----- State -----


class EngineState:
    """Shared runtime state around the Pulse engine singleton."""

    def __init__(self) -> None:
        self.engine: Optional[Any] = None
        self.engine_id: Optional[str] = None
        self.patient_state: Optional[str] = None
        self.loaded_at: Optional[str] = None
        self.lock: asyncio.Lock = asyncio.Lock()
        self.tick_task: Optional[asyncio.Task[None]] = None
        self.stop_event: asyncio.Event = asyncio.Event()
        self.snapshot: Dict[str, Any] = {}
        self.ecg_buffer: Deque[float] = collections.deque(maxlen=ECG_BUFFER_LEN)
        self.engine_time_s: float = 0.0
        # Data-request variables, assigned at load time so pull_data results can be
        # addressed by name instead of unpacking the tuple positionally (defends
        # against silent reordering in Pulse versions).
        self.dr: Dict[str, Any] = {}


state = EngineState()

# ----- Pulse helpers -----


def _build_data_request_manager() -> Any:
    """Build the data request manager and record each request for later lookup."""
    if not PULSE_AVAILABLE:
        raise RuntimeError(
            "pulse python bindings unavailable: %s" % (_PULSE_IMPORT_ERROR,)
        )

    dr = {
        "hr": SEDataRequest.create_physiology_request(
            "HeartRate", unit=FrequencyUnit.Per_min
        ),
        "sbp": SEDataRequest.create_physiology_request(
            "SystolicArterialPressure", unit=PressureUnit.mmHg
        ),
        "dbp": SEDataRequest.create_physiology_request(
            "DiastolicArterialPressure", unit=PressureUnit.mmHg
        ),
        "map": SEDataRequest.create_physiology_request(
            "MeanArterialPressure", unit=PressureUnit.mmHg
        ),
        "rr": SEDataRequest.create_physiology_request(
            "RespirationRate", unit=FrequencyUnit.Per_min
        ),
        "spo2": SEDataRequest.create_physiology_request("OxygenSaturation"),
        "etco2": SEDataRequest.create_physiology_request(
            "EndTidalCarbonDioxidePressure", unit=PressureUnit.mmHg
        ),
        "core_temp": SEDataRequest.create_physiology_request(
            "CoreTemperature", unit=TemperatureUnit.C
        ),
        "ecg": SEDataRequest.create_ecg_request("Lead3ElectricPotential"),
    }
    state.dr = dr
    # Preserve dict order when passing to SEDataRequestManager so we know which
    # slot each value occupies in the returned tuple.
    return SEDataRequestManager(list(dr.values()))


def _load_engine(patient_state: Optional[str] = None) -> str:
    if not PULSE_AVAILABLE:
        raise RuntimeError(
            "pulse python bindings unavailable: %s" % (_PULSE_IMPORT_ERROR,)
        )

    path = patient_state or STATE_FILE_DEFAULT
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Pulse state file not found at {path}. Override with PULSE_STATE_FILE."
        )

    engine = PulseEngine()
    engine.set_log_filename(LOG_FILE)
    engine.data_req_mgr = _build_data_request_manager()
    engine.serialize_from_file(path)

    state.engine = engine
    state.engine_id = str(uuid.uuid4())
    state.patient_state = os.path.basename(path).removesuffix(".json")
    state.loaded_at = datetime.now(timezone.utc).isoformat()
    state.snapshot = {}
    state.ecg_buffer.clear()
    state.engine_time_s = 0.0
    log.info("Pulse engine loaded: %s (engine_id=%s)", path, state.engine_id)
    return state.engine_id


def _tick_once_sync() -> None:
    """Advance the engine one tick and capture the latest scalars.

    MUST be called while holding state.lock.
    """
    engine = state.engine
    if engine is None:
        return

    engine.advance_time_s(TICK_SECONDS)
    values = engine.pull_data()

    # pull_data returns one value per registered request, in the order the
    # requests were added. We held that order in state.dr.
    keys: List[str] = list(state.dr.keys())
    mapped: Dict[str, float] = {}
    for key, value in zip(keys, values):
        try:
            mapped[key] = float(value)
        except (TypeError, ValueError):
            mapped[key] = float("nan")

    ecg_value = mapped.pop("ecg", float("nan"))
    state.ecg_buffer.append(ecg_value)

    state.engine_time_s += TICK_SECONDS
    state.snapshot = {
        "hr": mapped.get("hr"),
        "sbp": mapped.get("sbp"),
        "dbp": mapped.get("dbp"),
        "map": mapped.get("map"),
        "rr": mapped.get("rr"),
        "spo2": mapped.get("spo2"),
        "etco2": mapped.get("etco2"),
        "core_temp": mapped.get("core_temp"),
        "engine_time_s": state.engine_time_s,
        "captured_at": datetime.now(timezone.utc).isoformat(),
    }


async def _tick_loop() -> None:
    """Advance the engine at real-time 50 Hz cadence."""
    loop = asyncio.get_running_loop()
    next_deadline = loop.time()
    while not state.stop_event.is_set():
        next_deadline += TICK_SECONDS
        try:
            async with state.lock:
                _tick_once_sync()
        except Exception:
            log.exception("tick loop error")
            await asyncio.sleep(0.1)
            continue

        delay = next_deadline - loop.time()
        if delay > 0:
            try:
                await asyncio.wait_for(state.stop_event.wait(), timeout=delay)
                break  # stop requested
            except asyncio.TimeoutError:
                pass
        else:
            # Falling behind; drop the backlog silently to catch up.
            next_deadline = loop.time()


async def _start_engine(patient_state: Optional[str] = None) -> None:
    async with state.lock:
        _load_engine(patient_state)
    # Kick a first tick so snapshot populates before HTTP clients arrive.
    async with state.lock:
        _tick_once_sync()
    if state.tick_task is None or state.tick_task.done():
        state.stop_event = asyncio.Event()
        state.tick_task = asyncio.create_task(_tick_loop())


async def _stop_engine() -> None:
    state.stop_event.set()
    if state.tick_task is not None:
        try:
            await asyncio.wait_for(state.tick_task, timeout=2.0)
        except asyncio.TimeoutError:
            state.tick_task.cancel()
        state.tick_task = None
    async with state.lock:
        state.engine = None
        state.engine_id = None
        state.snapshot = {}


# ----- FastAPI app -----


@asynccontextmanager
async def lifespan(_: FastAPI):
    if PULSE_AVAILABLE:
        try:
            await _start_engine()
        except Exception:
            log.exception("failed to auto-start Pulse engine; /engine/load required")
    else:
        log.warning(
            "pulse python bindings unavailable; sidecar will run without an engine "
            "(healthz reports engine_loaded=false)."
        )
    try:
        yield
    finally:
        if state.tick_task is not None:
            await _stop_engine()


app = FastAPI(title="Noah RN Pulse Sidecar", version="0.1.0", lifespan=lifespan)

# Permissive CORS for local development — the Vite dev server on :5173 and the
# CLI display at :8104 both hit this surface directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoadRequest(BaseModel):
    patient_state: Optional[str] = None


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "status": "ok",
        "pulse_version": "4.3.1",
        "pulse_bindings_available": PULSE_AVAILABLE,
        "engine_loaded": state.engine is not None,
        "engine_id": state.engine_id,
        "patient_state": state.patient_state,
        "engine_time_s": round(state.engine_time_s, 3),
        "tick_seconds": TICK_SECONDS,
    }


@app.post("/engine/load")
async def engine_load(req: LoadRequest) -> Dict[str, Any]:
    if not PULSE_AVAILABLE:
        raise HTTPException(
            503,
            f"pulse python bindings unavailable: {_PULSE_IMPORT_ERROR}",
        )

    # Stop existing tick task so we can reload under lock without races.
    if state.tick_task is not None:
        await _stop_engine()

    await _start_engine(req.patient_state)

    return {
        "engine_id": state.engine_id,
        "loaded_at": state.loaded_at,
        "patient_state": state.patient_state,
    }


@app.get("/engine/vitals")
async def engine_vitals() -> Dict[str, Any]:
    if state.engine is None:
        raise HTTPException(503, "engine not loaded")
    return dict(state.snapshot)


@app.get("/engine/ecg")
async def engine_ecg() -> Dict[str, Any]:
    if state.engine is None:
        raise HTTPException(503, "engine not loaded")
    samples = list(state.ecg_buffer)
    return {
        "samples": samples,
        "sample_rate_hz": ECG_SAMPLE_RATE_HZ,
        "duration_s": ECG_BUFFER_SECONDS,
        "end_time_s": round(state.engine_time_s, 3),
    }


@app.get("/engine/stream")
async def engine_stream() -> StreamingResponse:
    if state.engine is None:
        raise HTTPException(503, "engine not loaded")

    async def gen():
        last_engine_time: float = -1.0
        while state.engine is not None:
            if state.snapshot and state.snapshot.get("engine_time_s", 0) != last_engine_time:
                last_engine_time = state.snapshot.get("engine_time_s", 0)
                import json as _json

                payload = _json.dumps(state.snapshot, default=str)
                yield f"data: {payload}\n\n"
            await asyncio.sleep(1.0)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/engine/reset")
async def engine_reset() -> Dict[str, Any]:
    if not PULSE_AVAILABLE:
        raise HTTPException(
            503,
            f"pulse python bindings unavailable: {_PULSE_IMPORT_ERROR}",
        )
    if state.tick_task is not None:
        await _stop_engine()
    await _start_engine(state.patient_state)
    return {
        "engine_id": state.engine_id,
        "reset_at": datetime.now(timezone.utc).isoformat(),
        "patient_state": state.patient_state,
    }


@app.delete("/engine")
async def engine_delete() -> Dict[str, Any]:
    await _stop_engine()
    return {"engine_loaded": False}
