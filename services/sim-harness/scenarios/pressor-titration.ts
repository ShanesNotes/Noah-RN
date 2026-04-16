import type { ScenarioDefinition } from '../src/scenario/types.js';

export const pressorTitration: ScenarioDefinition = {
  id: 'pressor-titration',
  name: 'Pressor Titration',
  description: 'MAP hovering 58-63 on norepinephrine 0.08 mcg/kg/min. Requires titration to maintain MAP >65.',
  basePatientId: '28dcf33b-0c52-587f-83ad-2a3270976719',
  patientWeight: 78,
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
  scheduledEvents: [
    {
      key: 'pressor-titration-lactate',
      minute: 10,
      releaseMinute: 20,
      kind: 'lab-result',
      event: 'Lactate 4.2 mmol/L resulted',
      visibleToAgent: false,
      sourcePhase: 'in-shift',
      authoredBy: 'provider',
      chartState: 'withheld',
      releaseChannel: 'chart',
      preliminary: false,
      payload: { test: 'lactate', mmol_per_l: 4.2 },
    },
  ],
  obligations: [
    {
      key: 'pressor-titration-map-q5',
      label: 'Recheck MAP every 5 minutes while titrating pressors',
      startMinute: 0,
      dueMinute: 5,
      priority: 'high',
      ownedBy: 'nurse',
      resolveByActions: ['titrate'],
    },
    {
      key: 'pressor-titration-review-lactate',
      label: 'Review withheld lactate result once released',
      startMinute: 20,
      dueMinute: 30,
      priority: 'medium',
      ownedBy: 'noah',
      resolveByActions: ['titrate'],
      triggeredByEventKey: 'pressor-titration-lactate',
    },
  ],
};
