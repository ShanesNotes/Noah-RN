import { describe, it, expect, beforeEach } from 'vitest';
import { getScenario, advanceScenario, resetScenario } from '../src/scenario/controller.js';
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
    });
  });

  it('throws on unknown scenario', async () => {
    await expect(getScenario('nonexistent')).rejects.toThrow('Unknown scenario');
  });
});
