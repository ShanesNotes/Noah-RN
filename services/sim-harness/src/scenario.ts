import type { SimSeedSource } from "./index.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scenariosDir = join(__dirname, "scenarios");

// --- Vitals target shape (partial — only override what changes) ---

export interface VitalsTarget {
  hr?: number;
  rr?: number;
  spo2?: number;
  etco2?: number;
  sbp?: number;
  dbp?: number;
  map?: number;
  temp_c?: number;
}

// --- Scenario event types ---

export type ScenarioEventAction =
  | { type: "set_vitals"; vitals: VitalsTarget }
  | { type: "set_rhythm"; rhythm_id: string }
  | { type: "narrative"; text: string }
  | { type: "apply_insult"; insult: string; description: string }
  | { type: "administer_medication"; medication: string; dose: number; unit: string; route: string };

export interface ScenarioEvent {
  /** Time in minutes from scenario start when this event fires. */
  minute: number;
  /** Human-readable label for the event. */
  label: string;
  /** What happens. */
  action: ScenarioEventAction;
  /** If true, this event is visible to the agent in teaching mode. */
  visible_to_agent?: boolean;
  /** Transition duration in minutes for vital sign changes (default: instant). */
  transition_minutes?: number;
}

// --- Full scenario definition ---

export interface Scenario {
  id: string;
  name: string;
  description: string;
  seed_from: SimSeedSource;
  estimated_duration_minutes: number;
  starting_demographics: Record<string, unknown>;
  starting_vitals: Required<VitalsTarget>;
  starting_rhythm_id: string;
  timeline: ScenarioEvent[];
}

// --- Loader ---

export function loadScenario(filename: string): Scenario {
  const path = join(scenariosDir, filename);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as Scenario;
  validateScenario(raw);
  return raw;
}

export function loadAllScenarios(): Map<string, Scenario> {
  const map = new Map<string, Scenario>();
  for (const file of ["nsr-baseline.json", "tension-pneumothorax.json"]) {
    const s = loadScenario(file);
    map.set(s.id, s);
  }
  return map;
}

function validateScenario(s: Scenario): void {
  if (!s.id) throw new Error("scenario missing id");
  if (!s.name) throw new Error("scenario missing name");
  if (!s.starting_vitals) throw new Error("scenario missing starting_vitals");
  if (!s.starting_rhythm_id) throw new Error("scenario missing starting_rhythm_id");
  if (!Array.isArray(s.timeline)) throw new Error("scenario missing timeline");

  const requiredVitals = ["hr", "rr", "spo2", "etco2", "sbp", "dbp", "map", "temp_c"];
  for (const key of requiredVitals) {
    if (typeof (s.starting_vitals as Record<string, unknown>)[key] !== "number") {
      throw new Error(`starting_vitals missing ${key}`);
    }
  }

  // Timeline must be sorted by minute
  for (let i = 1; i < s.timeline.length; i++) {
    if (s.timeline[i].minute < s.timeline[i - 1].minute) {
      throw new Error("timeline events must be sorted by minute");
    }
  }
}
