import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { lookupDrug, __resetDrugReferenceCacheForTests } from '../tools/drug-reference.js';

function seedFixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'noah-rn-drugs-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'norepi.json'), JSON.stringify({
    generic_name: 'norepinephrine',
    brand_names: ['Levophed'],
    drug_class: ['vasopressor', 'alpha-agonist'],
    high_alert: true,
    high_alert_reason: 'ISMP high-alert.',
    routes: ['IV infusion'],
    adult_dose: '0.01–0.5 mcg/kg/min',
    provenance: {
      source: 'Test fixture',
      last_reviewed: '2026-04-01',
      confidence_tier: 'tier-1-national-guideline',
    },
  }));
  writeFileSync(join(dir, 'acetaminophen.json'), JSON.stringify({
    generic_name: 'acetaminophen',
    brand_names: ['Tylenol'],
    drug_class: ['analgesic', 'antipyretic'],
    high_alert: false,
    routes: ['PO'],
    adult_dose: '325–1000 mg q4–6h',
    provenance: {
      source: 'Test fixture',
      last_reviewed: '2026-04-01',
      confidence_tier: 'tier-2-established-reference',
    },
  }));
  writeFileSync(join(dir, 'stale.json'), JSON.stringify({
    generic_name: 'stale-vasopressor',
    drug_class: ['vasopressor'],
    high_alert: true,
    routes: ['IV infusion'],
    adult_dose: 'deprecated',
    provenance: {
      source: 'Test fixture',
      last_reviewed: '2022-01-01',
      confidence_tier: 'tier-3-consensus',
    },
  }));
  writeFileSync(join(dir, 'malformed.json'), 'not valid JSON');
  return dir;
}

describe('lookupDrug (clinical-MCP contract v1 lookup_drug)', () => {
  let drugsDir: string;

  beforeEach(() => {
    __resetDrugReferenceCacheForTests();
    drugsDir = seedFixtureDir();
  });

  afterEach(() => {
    rmSync(drugsDir, { recursive: true, force: true });
    __resetDrugReferenceCacheForTests();
  });

  it('matches by generic name', () => {
    const result = lookupDrug('norepinephrine', { drugsDir });
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.generic_name).toBe('norepinephrine');
    expect(result.query).toBe('norepinephrine');
  });

  it('matches by brand name (case-insensitive)', () => {
    const result = lookupDrug('LEVOPHED', { drugsDir });
    expect(result.matches[0]?.generic_name).toBe('norepinephrine');
  });

  it('matches by drug class', () => {
    const result = lookupDrug('vasopressor', { drugsDir });
    const names = result.matches.map((m) => m.generic_name).sort();
    expect(names).toEqual(['norepinephrine', 'stale-vasopressor']);
  });

  it('emits staleness warnings for entries older than 12 months', () => {
    const nowMs = Date.parse('2026-04-16T00:00:00.000Z');
    const result = lookupDrug('vasopressor', { drugsDir, nowMs });
    expect(result.staleness_warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.staleness_warnings.some((w) => w.includes('stale-vasopressor'))).toBe(true);
    expect(result.staleness_warnings.some((w) => w.includes('norepinephrine'))).toBe(false);
  });

  it('returns empty matches without throwing on a totally unknown query', () => {
    const result = lookupDrug('quantum dust extract', { drugsDir });
    expect(result.matches).toHaveLength(0);
  });

  it('skips malformed JSON files without failing the lookup', () => {
    // The malformed.json fixture should not crash the loader; the valid
    // entries still match.
    const result = lookupDrug('norepinephrine', { drugsDir });
    expect(result.matches).toHaveLength(1);
  });

  it('exposes high-alert flag and reason on matched entries', () => {
    const result = lookupDrug('norepinephrine', { drugsDir });
    expect(result.matches[0]?.high_alert).toBe(true);
    expect(result.matches[0]?.high_alert_reason).toMatch(/high-alert/);
  });
});
