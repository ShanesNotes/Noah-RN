import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { EcgStrip } from './EcgStrip';
import { VitalsTile } from './VitalsTile';
import { useEcgSamples } from './useEcgSamples';
import { useVitalsStream } from './useVitalsStream';
import type { Healthz } from './types';

const HISTORY_LEN = 60; // ~60 s of 1 Hz SSE samples

type HistoryKey = 'hr' | 'sbp' | 'dbp' | 'map' | 'rr' | 'spo2' | 'etco2' | 'core_temp';

type HistoryMap = Record<HistoryKey, number[]>;

function emptyHistory(): HistoryMap {
  return {
    hr: [],
    sbp: [],
    dbp: [],
    map: [],
    rr: [],
    spo2: [],
    etco2: [],
    core_temp: [],
  };
}

export function App(): ReactElement {
  const stream = useVitalsStream();
  const ecg = useEcgSamples();
  const [health, setHealth] = useState<Healthz | null>(null);
  const [history, setHistory] = useState<HistoryMap>(emptyHistory);
  const lastEngineTimeRef = useRef<number>(-1);

  useEffect(() => {
    let cancelled = false;
    async function pollHealth() {
      try {
        const res = await fetch('/api/healthz');
        if (!res.ok) return;
        const data = (await res.json()) as Healthz;
        if (!cancelled) setHealth(data);
      } catch {
        /* ignore */
      }
    }
    pollHealth();
    const id = setInterval(pollHealth, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (stream.status !== 'open' || !stream.snapshot) return;
    const snap = stream.snapshot;
    if (snap.engine_time_s === lastEngineTimeRef.current) return;
    lastEngineTimeRef.current = snap.engine_time_s;
    setHistory((prev) => {
      const next: HistoryMap = { ...prev };
      (Object.keys(next) as HistoryKey[]).forEach((k) => {
        const v = snap[k];
        const arr = [...next[k], typeof v === 'number' && !Number.isNaN(v) ? v : 0];
        if (arr.length > HISTORY_LEN) arr.shift();
        next[k] = arr;
      });
      return next;
    });
  }, [stream]);

  const snapshot = stream.status === 'open' ? stream.snapshot : null;
  const engineTime = snapshot?.engine_time_s ?? 0;
  const mm = String(Math.floor(engineTime / 60)).padStart(2, '0');
  const ss = String(Math.floor(engineTime % 60)).padStart(2, '0');

  const connectionColor =
    stream.status === 'open' ? '#7ee787' :
    stream.status === 'connecting' ? '#f5d97c' : '#ff7b72';
  const connectionLabel =
    stream.status === 'open' ? 'SSE OPEN' :
    stream.status === 'connecting' ? 'CONNECTING' : stream.message;

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1b2a36',
          paddingBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', color: '#6b8091' }}>
            NOAH RN · PULSE VITALS
          </div>
          <div style={{ fontSize: 18, marginTop: 4 }}>
            {health?.patient_state ?? 'StandardMale@0s'} ·{' '}
            <span style={{ color: '#6b8091' }}>engine clock </span>
            <span style={{ color: '#d6e3ec' }}>{mm}:{ss}</span>
          </div>
        </div>
        <div
          style={{
            border: `1px solid ${connectionColor}`,
            color: connectionColor,
            padding: '4px 10px',
            fontSize: 11,
            letterSpacing: '0.08em',
            borderRadius: 999,
          }}
        >
          {connectionLabel}
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <VitalsTile
          label="Heart rate"
          unit="bpm"
          value={snapshot?.hr}
          accent="#7ee787"
          history={history.hr}
        />
        <VitalsTile
          label="BP systolic"
          unit="mmHg"
          value={snapshot?.sbp}
          accent="#f5a97f"
          history={history.sbp}
        />
        <VitalsTile
          label="BP diastolic"
          unit="mmHg"
          value={snapshot?.dbp}
          accent="#f5a97f"
          history={history.dbp}
        />
        <VitalsTile
          label="MAP"
          unit="mmHg"
          value={snapshot?.map}
          accent="#f0c674"
          history={history.map}
        />
        <VitalsTile
          label="Respirations"
          unit="/min"
          value={snapshot?.rr}
          accent="#89ddff"
          history={history.rr}
        />
        <VitalsTile
          label="SpO₂"
          unit="%"
          value={snapshot?.spo2 != null ? snapshot.spo2 * 100 : null}
          accent="#c8a2ff"
          history={history.spo2.map((v) => v * 100)}
        />
        <VitalsTile
          label="EtCO₂"
          unit="mmHg"
          value={snapshot?.etco2}
          accent="#ff9ce6"
          history={history.etco2}
        />
        <VitalsTile
          label="Core temp"
          unit="°C"
          value={snapshot?.core_temp}
          accent="#ffb87c"
          history={history.core_temp}
        />
      </section>

      <section>
        <EcgStrip
          samples={ecg?.samples ?? []}
          sampleRateHz={ecg?.sample_rate_hz ?? 50}
        />
      </section>

      <footer
        style={{
          fontSize: 11,
          color: '#6b8091',
          borderTop: '1px solid #1b2a36',
          paddingTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>
          sidecar:{' '}
          {health?.engine_loaded === true ? 'engine loaded' : 'engine not loaded'}{' '}
          · pulse {health?.pulse_version ?? '—'}
        </span>
        <span>noah-rn / sim-harness / bootstrap</span>
      </footer>
    </div>
  );
}
