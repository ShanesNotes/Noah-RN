import { describe, it, expect } from 'vitest';
import { getLoincIndex, loincToItemIds, getLoincName } from '../fhir/loinc-map.js';

describe('LOINC inverted index', () => {
  it('builds index from mimic-mappings.json', () => {
    const index = getLoincIndex();
    expect(index.size).toBeGreaterThan(0);
  });

  it('resolves primary LOINC code to itemIDs', () => {
    const index = getLoincIndex();
    // Heart rate: 8867-4
    const hrIds = index.get('8867-4');
    expect(hrIds).toBeDefined();
    expect(hrIds!.length).toBeGreaterThan(0);
  });

  it('resolves alias LOINC codes', () => {
    // Lactate has alias 2524-7 for primary 32693-4
    const ids = loincToItemIds(['2524-7']);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown LOINC codes', () => {
    const ids = loincToItemIds(['99999-9']);
    expect(ids).toEqual([]);
  });

  it('deduplicates itemIDs when multiple codes map to same item', () => {
    const ids = loincToItemIds(['8867-4', '8867-4']);
    const unique = [...new Set(ids)];
    expect(ids.length).toBe(unique.length);
  });

  it('returns human-readable name for known LOINC code', () => {
    const name = getLoincName('8867-4');
    expect(name).toBeDefined();
    expect(name!.toLowerCase()).toContain('heart');
  });
});
