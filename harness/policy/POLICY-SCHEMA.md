# Policy Overlay Schema

Policy overlays configure facility-specific Tier 3 content. Without an overlay,
all Tier 3 content defaults to "per facility protocol."

## Schema

```yaml
policy:
  facility_name: "<facility name>"
  effective_date: "<YYYY-MM-DD>"
  version: "<semver>"

  rules:
    - domain: "<clinical domain>"
      key: "<rule identifier>"
      value: "<facility-specific policy content>"
      source: "<policy source document>"
      tier: 3    # MUST be 3. Overlays cannot set Tier 1 or Tier 2.
```

## Supported Domains

| Domain | Example Keys |
|--------|-------------|
| `sepsis` | antibiotic_first_line, fluid_resuscitation_protocol, lactate_recheck_interval |
| `sedation` | rass_target_default, sedation_vacation_schedule, delirium_screening_tool |
| `rapid_response` | activation_criteria, response_team_composition, documentation_requirements |
| `code_blue` | termination_criteria, debriefing_policy, documentation_requirements |
| `fall_prevention` | score_cutoff_for_alarm, assessment_frequency, interventions_by_tier |
| `skin` | braden_cutoff_for_wound_consult, turn_schedule, surface_selection |
| `restraints` | assessment_frequency, documentation_interval, renewal_requirements |
| `blood_products` | consent_requirements, verification_protocol, reaction_protocol |
| `medication` | independent_double_check_list, titration_authority, prn_reassessment_interval |

## Safety Constraints

1. **Tier 3 only.** Policy overlays populate Tier 3 content. They cannot
   override Tier 1 (national guidelines) or Tier 2 (bedside guidance).
   A facility cannot configure Noah to contradict AHA, SSC, or AHA/ASA.

2. **One facility at a time.** No stacking of multiple overlays. The active
   overlay is the single file in `harness/policy/overlays/` (excluding .gitkeep).

3. **Source required.** Every rule must cite its source document. Unsourced
   facility policies are not accepted.

4. **Expiration.** Overlays should carry `effective_date`. Stale overlays
   (> 1 year) should be flagged for review.

## How Overlays Are Applied

The workspace agent reads the active overlay at session start:
1. Scan `harness/policy/overlays/` for YAML files (skip .gitkeep)
2. If found, load the first YAML file as the active overlay
3. When generating Tier 3 content for a matching domain/key, use the
   overlay's value and source instead of "per facility protocol"
4. If no overlay exists, default to baseline behavior

## File Locations

- Schema: `harness/policy/POLICY-SCHEMA.md` (this file)
- Baseline: `harness/policy/defaults/baseline.yaml`
- Overlays: `harness/policy/overlays/<facility-name>.yaml`
