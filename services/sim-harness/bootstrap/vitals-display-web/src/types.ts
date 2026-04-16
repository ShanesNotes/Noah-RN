export interface VitalsSnapshot {
  hr: number | null;
  sbp: number | null;
  dbp: number | null;
  map: number | null;
  rr: number | null;
  spo2: number | null;
  etco2: number | null;
  core_temp: number | null;
  engine_time_s: number;
  captured_at: string;
}

export interface EcgSamples {
  samples: number[];
  sample_rate_hz: number;
  duration_s: number;
  end_time_s: number;
}

export interface Healthz {
  status: string;
  pulse_version: string;
  pulse_bindings_available: boolean;
  engine_loaded: boolean;
  engine_id: string | null;
  patient_state: string | null;
  engine_time_s: number;
  tick_seconds: number;
}
