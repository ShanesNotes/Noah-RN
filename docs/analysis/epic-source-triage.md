# Epic source triage

Purpose: classify sources from `research/epic-ehr-ux-workflow-patterns-for-clinicians.md` by trust and utility before patching the document.

Legend:
- Tier A = core evidence. official Epic/public training, health-system training, PMC/AHRQ/AACN, Medplum docs/examples.
- Tier B = plausible supporting analysis/commentary.
- Tier C = anecdotal/color only.
- Tier D = reject for core argument use.

## Keep as core evidence

| Citation | Source | Tier | Supports | Decision | Screenshot candidate |
|---|---|---|---|---|---|
| 1 | NYU Epic training manual PDF | A | broad Epic nurse workflow/training reference | keep | yes |
| 3 | UIowa Epic Education — The Brain | A | timeline/worklist concept | keep | yes |
| 4 | UIowa Epic Education — Flowsheets | A | flowsheet mechanics / time-column logic | keep | yes |
| 9 | MultiCare inpatient nurse guided practice PDF | A | summary/SBAR, MAR color states, general inpatient workflow | keep | yes |
| 11 | PMC ICU data viz needs paper | A | why timeline/trend views matter clinically | keep | no |
| 19 | PMC ICU EHR navigation workflow paper | A | information foraging / too-many-screens burden | keep | no |
| 20 | Johns Hopkins Epic tips | A | keyboard/efficiency patterns | keep | no |
| 22 | Epic chart review/charting training artifact | A | persistent header/chart review/navigation | keep | maybe |
| 28 | I-PASS Institute | A | handoff framework | keep | no |
| 29 | AHRQ I-PASS tool | A | handoff framework | keep | no |
| 30 | Texas Children's I-PASS material | A | handoff implementation details | keep | maybe |
| 31 | Epic AI note-writing post | A | AI-assisted note drafting claim | keep | maybe |
| 34 | PMC nursing handoff / I-PASS paper | A | why structured handoff matters | keep | no |
| 38 | PMC flowsheet information model | A | flowsheet structured data implications | keep | no |
| 41 | audit trail explainer | B | broad auditability concept | support-only | no |
| 44 | UIowa Epic Education — MAR | A | MAR workflow / Rover / barcode / override patterns | keep | yes |
| 45 | AACN block charting webinar | A | block charting concept | keep | no |
| 46 | Epic change impact report | B | workflow change details if needed | support-only | maybe |
| 47 | Epic inpatient nurse tip sheet | A/B | specific inpatient nurse workflow examples | keep-support | maybe |
| 48 | OPENPediatrics dual-check video | B | independent double-check rationale | support-only | no |
| 58 | PMC critical lab push notification paper | A | escalation / critical result timing | keep | no |
| 59 | PMC nurse well-being and EHR use | A | alert/cognitive load stakes | keep | no |
| 60 | Epic public clinical findings/open.epic page | B | general CDS/public Epic context | support-only | no |
| 62 | Medplum charting demo | A | Noah-RN implementation mapping | keep | maybe |
| 63 | Medplum scheduling demo | A | workflow/task/scheduling mapping | keep | maybe |

## Keep as support-only / color

| Citation | Source | Tier | Supports | Decision | Notes |
|---|---|---|---|---|---|
| 2 | YouTube short on Epic modules | C | broad orientation only | support-only | weak compared to training docs |
| 5 | Vanderbilt intro/build capabilities | B | general Epic build context | support-only | not core nurse workflow proof |
| 10 | Reddit: Epic without Brain | C | anecdotal user sentiment | support-only | color only |
| 12 | LVHN reposition reminder paper | B | alert clutter / worklist noise | support-only | useful but narrow |
| 13 | LVHN Brain note | B | Brain local implementation color | support-only | secondary to UIowa training |
| 14 | Reddit: MyChart tasks clutter Brain | C | clutter anecdote | support-only | do not use for strong claims |
| 23 | Reddit: favorite Epic shift print-out | C | printable brain sheet color | support-only | anecdote only |
| 24 | Medplum SMART on FHIR demo | A/B | implementation mapping | support-only | useful for Noah translation, not Epic proof |
| 27 | Med Surg Epic exercise booklet | B | general workflow examples | support-only | may help screenshot shortlist |
| 32 | Etsy Epic patient report | D | none | reject | not acceptable evidence |
| 33 | Reddit auto-populated brain sheets | C | workflow color only | support-only | anecdote only |
| 35 | Medplum hello world | B | implementation background only | support-only | not core |
| 37 | Reddit flowsheet IDs | C | anecdotal technical color | support-only | not needed for design doctrine |
| 39 | ResearchGate screenshot | C/B | possible visual reference for flowsheet/titration | support-only | screenshot provenance weak |
| 40 | EpicShare macro tip | B | macro workflow color | support-only | nice add, not core |
| 42 | modeling flowsheet data paper | A/B | structured flowsheet implications | support-only | more data-model than UI |
| 49 | open.epic dual sign table | B | dual sign concept | support-only | probably implementation-specific |
| 50 | Reddit block charting | C | anecdotal block charting | support-only | do not use for core claim |
| 51 | SOAR block charting project | B | block charting rationale | support-only | helpful support |
| 52 | AMIA 25x5 pitch event | D | none clear | reject | not needed |
| 53 | Kansas protest letter PDF | D | acknowledge liability claim too weak / indirect | reject | remove from core doc |
| 54 | flashcards | D | none | reject | unusable |
| 55 | Scribd physician builder companion | D | weak / mirrored / uncertain | reject | unusable |
| 56 | GME handbook | D | none specific | reject | unusable |
| 57 | nursing instructor policies | D | none specific | reject | unusable |
| 61 | Medplum homepage | B | broad Medplum context | support-only | too generic |

## High-impact claims needing strongest support

1. Brain timeline/worklist
- strong support present: 1, 3, 9, 11
- can patch doc to rely on these, demote Reddit/color refs.

2. Persistent patient header / chart review shell
- strong support present: 1, 9, 22
- may need one extra public training screenshot if available.

3. Flowsheet mechanics
- strong support present: 4, 9, 38
- macro claim should lean on 4 and maybe 40; demote weaker items.

4. Handoff / I-PASS
- strong support present: 28, 29, 30, 34
- strong enough already.

5. AI drafting claim
- strong support present: 31
- can keep as explicit Epic public statement, but mark as current-feature example not universal nursing baseline.

6. MAR workflow
- strong support present: 9, 44
- dual sign / high-alert details may need support-only reinforcement from 48/49.

7. Block charting
- strongest support: 45
- 50 should remain anecdotal only.

8. Review vs acknowledge distinction
- current support too mixed.
- needs rewrite as a design recommendation informed by enterprise workflow practice, not a hard Epic-specific legal doctrine unless stronger public source is found.

## Screenshot shortlist from public sources

Priority 1:
- UIowa The Brain page
- UIowa Flowsheets page
- UIowa MAR page
- MultiCare inpatient nurse guided practice PDF

Priority 2:
- NYU training PDF
- IU chart review/charting training page
- Texas Children's I-PASS PDF (workflow artifact, not product UI)

## Patch guidance

- remove/relegate citations 32, 52, 53, 54, 55, 56, 57 from any core argument.
- demote Reddit + Etsy + flashcard + Scribd materials to color only.
- rewrite “review vs acknowledge” to avoid overclaiming legal specificity unless stronger public proof found.
- keep Epic report centered on workflow primitives, not enterprise mythology.
