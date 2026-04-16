#!/usr/bin/env node
/**
 * Pulse sidecar terminal dashboard.
 *
 * Polls the sidecar over plain HTTP:
 *   - /engine/vitals at 1 Hz for numerics
 *   - /engine/ecg    at 5 Hz for the ECG mini-strip
 *
 * Quit with `q` or Escape. Reset the engine with `r`.
 *
 * Tested terminals: iTerm2, kitty, modern xterm. Minimum size 120x30.
 */

'use strict';

const blessed = require('blessed');
const contrib = require('blessed-contrib');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8104';
const VITALS_POLL_MS = 1000;
const ECG_POLL_MS = 200;
const HISTORY_LEN = 60;

async function fetchJson(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`${path} ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    throw new Error(`${path} ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---------- layout ----------

const screen = blessed.screen({ smartCSR: true, title: 'Pulse Vitals — Noah RN Bootstrap' });
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

// Row 0-2: six LCD-like numerics across the top
const lcdStyle = {
  display: 3,
  elementPadding: 2,
  elementSpacing: 1,
  strokeWidth: 0.3,
  label: '',
  color: 'green',
};

const lcdHR = grid.set(0, 0, 3, 2, contrib.lcd, { ...lcdStyle, label: 'HR bpm', color: 'green' });
const lcdSBP = grid.set(0, 2, 3, 2, contrib.lcd, { ...lcdStyle, label: 'SBP mmHg', color: 'yellow' });
const lcdDBP = grid.set(0, 4, 3, 2, contrib.lcd, { ...lcdStyle, label: 'DBP mmHg', color: 'yellow' });
const lcdSpO2 = grid.set(0, 6, 3, 2, contrib.lcd, { ...lcdStyle, label: 'SpO2 %', color: 'magenta' });
const lcdRR = grid.set(0, 8, 3, 2, contrib.lcd, { ...lcdStyle, label: 'RR /min', color: 'cyan' });
const lcdEtco2 = grid.set(0, 10, 3, 2, contrib.lcd, { ...lcdStyle, label: 'EtCO2 mmHg', color: 'cyan' });

// Row 3-6: HR + MAP line charts
const hrChart = grid.set(3, 0, 4, 6, contrib.line, {
  style: { line: 'green', text: 'white', baseline: 'white' },
  xLabelPadding: 3,
  xPadding: 5,
  showLegend: false,
  wholeNumbersOnly: false,
  label: ' Heart rate — 60 s ',
});
const mapChart = grid.set(3, 6, 4, 6, contrib.line, {
  style: { line: 'yellow', text: 'white', baseline: 'white' },
  xLabelPadding: 3,
  xPadding: 5,
  showLegend: false,
  wholeNumbersOnly: false,
  label: ' MAP — 60 s ',
});

// Row 7-10: ECG mini-strip
const ecgChart = grid.set(7, 0, 4, 12, contrib.line, {
  style: { line: 'green', text: 'white', baseline: 'white' },
  xLabelPadding: 0,
  xPadding: 0,
  showLegend: false,
  wholeNumbersOnly: false,
  label: ' ECG Lead III — last 10 s ',
});

// Row 11: status line
const statusBox = grid.set(11, 0, 1, 12, blessed.box, {
  style: { fg: 'white', bg: 'black' },
  content: '',
});

// ---------- state ----------

const hrHistory = [];
const mapHistory = [];
let lastStatus = 'starting…';

function setStatus(line) {
  lastStatus = line;
  statusBox.setContent(` ${line}    [ q / Esc to quit · r to reset engine ] `);
  screen.render();
}

function pushHistory(arr, v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return;
  arr.push(v);
  if (arr.length > HISTORY_LEN) arr.shift();
}

// blessed-contrib lcd needs a string or number; nulls break it
function toLcd(v, decimals = 0) {
  if (v == null || Number.isNaN(v)) return '---';
  return decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
}

// ---------- poll loops ----------

async function pollVitals() {
  try {
    const data = await fetchJson('/engine/vitals');
    lcdHR.setDisplay(toLcd(data.hr));
    lcdSBP.setDisplay(toLcd(data.sbp));
    lcdDBP.setDisplay(toLcd(data.dbp));
    lcdSpO2.setDisplay(toLcd(typeof data.spo2 === 'number' ? data.spo2 * 100 : null, 0));
    lcdRR.setDisplay(toLcd(data.rr));
    lcdEtco2.setDisplay(toLcd(data.etco2));

    pushHistory(hrHistory, data.hr);
    pushHistory(mapHistory, data.map);

    const xs = hrHistory.map((_, i) => String(i - hrHistory.length + 1));
    hrChart.setData([{ title: 'HR', x: xs, y: hrHistory, style: { line: 'green' } }]);

    const xs2 = mapHistory.map((_, i) => String(i - mapHistory.length + 1));
    mapChart.setData([{ title: 'MAP', x: xs2, y: mapHistory, style: { line: 'yellow' } }]);

    setStatus(
      `engine_time=${(data.engine_time_s ?? 0).toFixed(1)}s · last_captured=${
        (data.captured_at || '').slice(11, 19) || '--'
      } · ${BASE_URL}`,
    );
  } catch (err) {
    setStatus(`/engine/vitals error: ${err.message}`);
  }
}

async function pollEcg() {
  try {
    const data = await fetchJson('/engine/ecg');
    const samples = data.samples || [];
    if (!samples.length) return;
    // Downsample display window to avoid plot noise — show every 4th sample (12.5 Hz).
    const DOWNSAMPLE = 4;
    const downsampled = [];
    for (let i = 0; i < samples.length; i += DOWNSAMPLE) {
      downsampled.push(samples[i]);
    }
    const xs = downsampled.map((_, i) => String(((i * DOWNSAMPLE) / data.sample_rate_hz).toFixed(1)));
    ecgChart.setData([{ title: 'ECG', x: xs, y: downsampled, style: { line: 'green' } }]);
    screen.render();
  } catch (err) {
    // Surface in status only if vitals poll is also failing
    if (lastStatus.startsWith('/engine/vitals error')) return;
  }
}

// ---------- key bindings ----------

screen.key(['q', 'C-c', 'escape'], () => process.exit(0));
screen.key(['r'], async () => {
  setStatus('resetting engine…');
  try {
    await postJson('/engine/reset', {});
    setStatus('engine reset ok');
  } catch (err) {
    setStatus(`reset failed: ${err.message}`);
  }
});

// ---------- init ----------

setStatus(`connecting to ${BASE_URL}…`);
screen.render();

setInterval(pollVitals, VITALS_POLL_MS);
setInterval(pollEcg, ECG_POLL_MS);
