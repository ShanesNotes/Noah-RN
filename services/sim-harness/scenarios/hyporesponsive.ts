import type { ScenarioDefinition } from '../src/scenario/types.js';

export const hyporesponsive: ScenarioDefinition = {
  id: 'hyporesponsive',
  name: 'Hyporesponsive on High-Dose Pressors',
  description: 'Refractory shock: MAP plateaus at 57 despite norepi 0.3 mcg/kg/min + vasopressin 0.04 units/min. Considering hydrocortisone or further vasopressor adjustment.',
  basePatientId: '28dcf33b-0c52-587f-83ad-2a3270976719',
  patientWeight: 72,
  initialState: {
    baselineMAP: 42,
    baselineHR: 118,
    currentMAP: 57,
    currentHR: 110,
    activeDrugs: [
      {
        name: 'norepinephrine',
        currentDose: 0.3,
        unit: 'mcg/kg/min',
        minutesSinceLastChange: 45,
      },
      {
        name: 'vasopressin',
        currentDose: 0.04,
        unit: 'units/min',
        minutesSinceLastChange: 60,
      },
    ],
    fluidBoluses: [],
    previousNoise: 0,
    totalMinutesElapsed: 0,
  },
};
