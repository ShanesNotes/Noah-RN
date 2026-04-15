/**
 * Rhythm template: one canonical cardiac cycle per lead.
 *
 * The interpolator stretches/compresses these samples to match the target heart rate.
 * Voltages are in millivolts (mV). Sample timing is defined by sample_rate_hz.
 */
export interface RhythmTemplate {
  /** Unique identifier, e.g. "nsr", "vtach" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Rhythm label matching SimLiveVitalsSnapshot.rhythm_label */
  rhythm_label: string;
  /** Heart rate (bpm) the template was authored at */
  reference_hr_bpm: number;
  /** Sample rate of the template data */
  sample_rate_hz: number;
  /** Number of samples in one cardiac cycle at reference HR */
  cycle_samples: number;
  /** Voltage samples (mV) per lead for one complete cycle */
  leads: Record<string, number[]>;
}

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Load and validate a rhythm template from a JSON file in the rhythms directory. */
export function loadRhythmTemplate(filename: string): RhythmTemplate {
  const path = join(__dirname, filename);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as RhythmTemplate;
  validateTemplate(raw);
  return raw;
}

/** Validate that a rhythm template has the required shape. */
export function validateTemplate(t: RhythmTemplate): void {
  if (!t.id || typeof t.id !== "string") throw new Error("missing id");
  if (!t.rhythm_label) throw new Error("missing rhythm_label");
  if (t.reference_hr_bpm <= 0) throw new Error("invalid reference_hr_bpm");
  if (t.sample_rate_hz <= 0) throw new Error("invalid sample_rate_hz");
  if (t.cycle_samples <= 0) throw new Error("invalid cycle_samples");
  if (!t.leads || typeof t.leads !== "object") throw new Error("missing leads");

  for (const [lead, samples] of Object.entries(t.leads)) {
    if (!Array.isArray(samples)) throw new Error(`lead ${lead} is not an array`);
    if (samples.length !== t.cycle_samples) {
      throw new Error(
        `lead ${lead} has ${samples.length} samples, expected ${t.cycle_samples}`,
      );
    }
  }
}

/** Load all bundled rhythm templates. */
export function loadAllTemplates(): Map<string, RhythmTemplate> {
  const map = new Map<string, RhythmTemplate>();
  for (const file of ["nsr.json", "vtach.json"]) {
    const t = loadRhythmTemplate(file);
    map.set(t.id, t);
  }
  return map;
}
