import type { ScenarioDefinition } from '../generator.js';

export const pressorTitration: ScenarioDefinition = {
  id: 'pressor-titration',
  name: 'Pressor Titration',
  description: 'MAP hovering 58-63 on norepinephrine 0.08 mcg/kg/min. Requires titration to maintain MAP >65.',
  basePatientId: '28dcf33b-0c52-587f-83ad-2a3270976719',
  patientWeight: 78, // kg
  initialState: {
    baselineMAP: 52,
    baselineHR: 98,
    currentMAP: 60,
    currentHR: 105,
    activeDrugs: [
      {
        name: 'norepinephrine',
        currentDose: 0.08,
        unit: 'mcg/kg/min',
        minutesSinceLastChange: 30,
      },
    ],
    fluidBoluses: [],
    previousNoise: 0,
    totalMinutesElapsed: 0,
  },
};
