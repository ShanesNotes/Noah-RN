# Knowledge Freshness Manifest

Review schedule: quarterly (or when guideline body publishes updates).
Stale = past next_review date. Stale files require board (Shane) review before trusting output.

## Protocol Files

| File | Source | Version | Last Verified | Next Review | Status |
|------|--------|---------|---------------|-------------|--------|
| acls.md | AHA ACLS Guidelines | 2020/2025 | 2026-03-30 | 2026-09-30 | CURRENT |
| sepsis-bundle.md | Surviving Sepsis Campaign 2026 / CMS SEP-1 | 2026 | 2026-04-01 | 2026-09-30 | CURRENT |
| acute-stroke.md | AHA/ASA Acute Ischemic Stroke Guidelines | 2019, updated 2024 | 2026-03-30 | 2026-09-30 | CURRENT |
| rapid-response.md | IHI / MEWS literature | 2024 | 2026-03-30 | 2026-09-30 | CURRENT |
| rsi.md | Walls & Murphy / EMCRIT | 6th ed / 2024 update | 2026-03-30 | 2026-09-30 | CURRENT |

## Reference Data

| File | Description | Last Updated | Next Review | Status |
|------|-------------|--------------|-------------|--------|
| drug-ranges.json | ISMP high-alert medication dosage ranges (16 entries; heparin includes structured dosing metadata and embedded provenance) | 2026-03-31 | 2026-06-30 | CURRENT |
| mimic-mappings.json | MIT-LCP-derived MIMIC-IV itemID-to-LOINC translation layer with Noah compatibility aliases | 2026-03-31 | 2026-06-30 | CURRENT |

## Review Process

1. Check `next_review` dates quarterly
2. If past due: mark as STALE, flag for Shane review
3. Check source URLs in each file's YAML frontmatter for updated guidelines
4. After review: update `last_verified` in both the file's YAML frontmatter AND this manifest
5. If guideline content changed: update the protocol file, bump version, add change note here

## Known Issues

- Sepsis fluids trigger: SSC 2026 upgraded fluid guidance — balanced crystalloids preferred, dynamic measures for resuscitation. Updated 2026-04-01.
- rapid-response.md: Activation criteria are consensus/institutional — thresholds flagged as screening only, not diagnostic. Facility protocol overrides.
