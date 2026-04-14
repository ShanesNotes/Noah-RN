import type { ScenarioDefinition } from '../src/scenario/types.js';

export const fluidResponsive: ScenarioDefinition = {
  id: 'fluid-responsive',
  name: 'Fluid-Responsive Hypotension',
  description: 'MAP 55 on admission, no pressors yet. Testing fluid responsiveness with crystalloid boluses.',
  basePatientId: '28dcf33b-0c52-587f-83ad-2a3270976719',
  patientWeight: 85,
  initialState: {
    baselineMAP: 55,
    baselineHR: 112,
    currentMAP: 55,
    currentHR: 112,
    activeDrugs: [],
    fluidBoluses: [],
    previousNoise: 0,
    totalMinutesElapsed: 0,
  },
  scheduledEvents: [
    {
      key: 'fluid-responsive-cmp',
      minute: 5,
      releaseMinute: 15,
      kind: 'lab-result',
      event: 'Basic metabolic panel resulted',
      visibleToAgent: true,
      payload: { test: 'bmp', potassium: 4.1, creatinine: 1.0 },
    },
  ],
};
