import { describe, it, expect, beforeEach } from 'vitest';
import { getScenario, getScenarioWaveformSamples, advanceScenario, resetScenario } from '../src/scenario/controller.js';
import { hillEquation } from '../src/reference/pharmacokinetics.js';

describe('Scenario Controller', () => {
  beforeEach(async () => {
    await resetScenario('pressor-titration');
    await resetScenario('fluid-responsive');
    await resetScenario('hyporesponsive');
  });

  describe('pressor-titration', () => {
    it('returns initial state', async () => {
      const s = await getScenario('pressor-titration');
      expect(s.id).toBe('pressor-titration');
      expect(s.currentState.activeDrugs).toHaveLength(1);
      expect(s.currentState.activeDrugs[0].name).toBe('norepinephrine');
      expect(s.currentState.map).toBeGreaterThan(20);
      expect(s.currentState.map).toBeLessThan(180);
      expect(s.releasedEvents).toEqual([]);
      expect(s.upcomingVisibleEvents).toEqual([]);
    });

    it('titrating up increases MAP over time', async () => {
      let latest;
      for (let i = 0; i < 6; i++) {
        latest = await advanceScenario('pressor-titration', {
          action: 'titrate',
          medication: 'norepinephrine',
          new_dose: 0.16,
        });
      }
      expect(latest!.currentState.minutesElapsed).toBe(30);
      expect(latest!.history).toHaveLength(6);
      expect(latest!.currentState.map).toBeGreaterThan(20);
      expect(latest!.currentState.map).toBeLessThan(180);
    });

    it('shows sigmoid behavior via Hill equation math', () => {
      const emax = 35, ed50 = 0.08, n = 2;
      const lowDelta = hillEquation(0.08, emax, ed50, n) - hillEquation(0.04, emax, ed50, n);
      const highDelta = hillEquation(0.30, emax, ed50, n) - hillEquation(0.26, emax, ed50, n);
      expect(lowDelta).toBeGreaterThan(highDelta);
      expect(lowDelta).toBeGreaterThan(5);
      expect(highDelta).toBeLessThan(1);
    });
  });

  describe('fluid-responsive', () => {
    it('fluid bolus increases MAP', async () => {
      const before = await getScenario('fluid-responsive');
      const after = await advanceScenario('fluid-responsive', {
        action: 'bolus',
        volume_ml: 500,
      });
      expect(after.currentState.map).toBeGreaterThan(before.currentState.map - 3);
    });

    it('shows visible future events before release and releases them on schedule', async () => {
      const before = await getScenario('fluid-responsive');
      expect(before.upcomingVisibleEvents).toEqual([
        { minute: 15, event: 'Basic metabolic panel resulted' },
      ]);
      expect(before.releasedEvents).toEqual([]);

      await advanceScenario('fluid-responsive', { action: 'bolus', volume_ml: 500 });
      await advanceScenario('fluid-responsive', { action: 'bolus', volume_ml: 250 });
      const after = await advanceScenario('fluid-responsive', { action: 'bolus', volume_ml: 250 });

      expect(after.releasedEvents).toHaveLength(1);
      expect(after.releasedEvents[0].event).toBe('Basic metabolic panel resulted');
      expect(after.upcomingVisibleEvents).toEqual([]);
    });

    it('tracks multiple boluses with diminishing returns', async () => {
      const before = await getScenario('fluid-responsive');
      const startBoluses = before.currentState.fluidBoluses;
      const startHistory = before.history.length;

      await advanceScenario('fluid-responsive', { action: 'bolus', volume_ml: 500 });
      await advanceScenario('fluid-responsive', { action: 'bolus', volume_ml: 500 });
      const after = await getScenario('fluid-responsive');

      expect(after.currentState.fluidBoluses).toBe(startBoluses + 2);
      expect(after.history.length).toBe(startHistory + 2);
    });
  });

  describe('hyporesponsive', () => {
    it('starts with multiple vasopressors', async () => {
      const s = await getScenario('hyporesponsive');
      expect(s.currentState.activeDrugs).toHaveLength(2);
      const names = s.currentState.activeDrugs.map(d => d.name);
      expect(names).toContain('norepinephrine');
      expect(names).toContain('vasopressin');
    });

    it('can add a new medication', async () => {
      const after = await advanceScenario('hyporesponsive', {
        action: 'add_medication',
        medication: 'phenylephrine',
        new_dose: 0.5,
      });
      expect(after.currentState.activeDrugs.length).toBe(3);
    });

    it('lets concurrent interventions coexist without conflict', async () => {
      await advanceScenario('hyporesponsive', {
        action: 'add_medication',
        medication: 'phenylephrine',
        new_dose: 0.5,
      });
      const afterBolus = await advanceScenario('hyporesponsive', {
        action: 'bolus',
        volume_ml: 500,
      });

      expect(afterBolus.currentState.activeDrugs.map(d => d.name)).toEqual(
        expect.arrayContaining(['norepinephrine', 'vasopressin', 'phenylephrine']),
      );
      expect(afterBolus.currentState.fluidBoluses).toBe(1);
      expect(afterBolus.history).toHaveLength(2);
    });
  });

  describe('state persistence', () => {
    it('persists state across calls', async () => {
      await advanceScenario('pressor-titration', {
        action: 'titrate',
        medication: 'norepinephrine',
        new_dose: 0.12,
      });
      const s = await getScenario('pressor-titration');
      expect(s.history).toHaveLength(1);
      expect(s.currentState.minutesElapsed).toBe(5);
    });

    it('reset clears state', async () => {
      await advanceScenario('pressor-titration', {
        action: 'titrate',
        medication: 'norepinephrine',
        new_dose: 0.12,
      });
      await resetScenario('pressor-titration');
      const s = await getScenario('pressor-titration');
      expect(s.history).toHaveLength(0);
      expect(s.currentState.minutesElapsed).toBe(0);
      expect(s.releasedEvents).toEqual([]);
    });
  });

  it('holds non-visible events until their release time', async () => {
    await advanceScenario('pressor-titration', {
      action: 'titrate',
      medication: 'norepinephrine',
      new_dose: 0.12,
    });
    await advanceScenario('pressor-titration', {
      action: 'titrate',
      medication: 'norepinephrine',
      new_dose: 0.14,
    });
    await advanceScenario('pressor-titration', {
      action: 'titrate',
      medication: 'norepinephrine',
      new_dose: 0.16,
    });
    const s = await advanceScenario('pressor-titration', {
      action: 'titrate',
      medication: 'norepinephrine',
      new_dose: 0.18,
    });

    expect(s.currentState.minutesElapsed).toBe(20);
    expect(s.releasedEvents.map(event => event.event)).toEqual(['Lactate 4.2 mmol/L resulted']);
    expect(s.upcomingVisibleEvents).toEqual([]);
  });

  it('retains at least 60 seconds of waveform history in the monitor-side buffer', async () => {
    for (let i = 0; i < 13; i++) {
      await advanceScenario('fluid-responsive', { action: 'bolus', volume_ml: 250 });
    }

    const strip = await getScenarioWaveformSamples('fluid-responsive', {
      leads: ['II', 'pleth'],
      seconds: 10,
    });

    expect(strip.sample_rate_hz).toBe(125);
    expect(strip.leads.II.length).toBeGreaterThan(1000);
    expect(strip.leads.pleth.length).toBeGreaterThan(1000);
    expect(strip.physiology_source).toBe('fallback');
  });

  it('throws on unknown scenario', async () => {
    await expect(getScenario('nonexistent')).rejects.toThrow('Unknown scenario');
  });
});
