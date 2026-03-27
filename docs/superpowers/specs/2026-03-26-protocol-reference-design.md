# Protocol Reference — Design Spec

## Purpose

Quick-recall of standardized clinical algorithms under time pressure. Sequential, actionable, exact doses and timeframes. Not a teaching tool — a real-time action guide for licensed professionals who need the specifics NOW.

This is code language. Precise, direct, numbered steps. No hedging, no explanation of why. The nurse knows why — they need the what and the when.

## Architecture

One skill + curated knowledge files.

| Component | Path | Purpose |
|-----------|------|---------|
| Skill | `plugin/skills/protocol-reference/SKILL.md` | Routing, formatting, interaction pattern |
| ACLS | `knowledge/protocols/acls.md` | Cardiac arrest, bradycardia, tachycardia, post-ROSC |
| Sepsis | `knowledge/protocols/sepsis-bundle.md` | qSOFA, hour-1 bundle, vasopressor trigger |
| Stroke | `knowledge/protocols/acute-stroke.md` | tPA criteria, time windows, BP targets |
| Rapid Response | `knowledge/protocols/rapid-response.md` | MEWS thresholds, escalation criteria |
| RSI | `knowledge/protocols/rsi.md` | Preparation, meds by weight, sequence |

The skill reads the relevant knowledge file via the Read tool, then presents it in the appropriate format based on the nurse's question.

## Protocols (v1)

### 1. ACLS

**Source**: AHA ACLS Guidelines 2020/2025 updates

Four sub-algorithms in one file:

**Cardiac Arrest — VF/pVT:**
1. CPR — 100-120/min, depth 2-2.4 inches, full recoil, minimize interruptions
2. DEFIB 200J biphasic → immediate CPR x 2min
3. IV/IO access
4. EPINEPHRINE 1mg IV/IO q3-5min
5. DEFIB → CPR x 2min
6. AMIODARONE 300mg IV/IO first dose, 150mg second dose
   - Alt: LIDOCAINE 1-1.5mg/kg first, 0.5-0.75mg/kg subsequent
7. Treat reversible causes — H's and T's
   - H: Hypovolemia, Hypoxia, Hydrogen ion (acidosis), Hypo/Hyperkalemia, Hypothermia
   - T: Tension pneumo, Tamponade, Toxins, Thrombosis (pulmonary/coronary)

**Cardiac Arrest — PEA/Asystole:**
1. CPR immediately
2. IV/IO access
3. EPINEPHRINE 1mg IV/IO q3-5min (give ASAP — early epi improves outcomes in non-shockable)
4. CPR x 2min cycles, rhythm check between
5. NOT shockable — do NOT defib
6. Treat reversible causes — H's and T's (same list)
7. Consider termination criteria per local protocol

**Bradycardia (HR < 50 with symptoms):**
1. ATROPINE 1mg IV q3-5min, max 3mg
2. If atropine ineffective: transcutaneous pacing OR
3. Dopamine 5-20 mcg/kg/min OR Epinephrine 2-10 mcg/min
4. Prepare for transvenous pacing

**Tachycardia (HR > 150 with pulse):**
- Unstable (hypotension, AMS, chest pain, acute HF): synchronized cardioversion
  - Narrow regular: 50-100J → 100J → 200J → 300J → 360J
  - Narrow irregular (A-fib): 120-200J biphasic
  - Wide regular: 100J → 200J → 300J → 360J
- Stable narrow regular: vagal maneuvers → ADENOSINE 6mg rapid IV push → 12mg → 12mg
- Stable narrow irregular: rate control (diltiazem, beta-blocker) — no adenosine
- Stable wide regular: AMIODARONE 150mg IV over 10min, may repeat. Consider adenosine if regular and monomorphic.
- Stable wide irregular: DO NOT USE AV nodal blockers. Expert consult. Consider amiodarone.

**Post-ROSC:**
1. 12-lead ECG — STEMI → cath lab
2. Target: SBP > 90, MAP > 65
3. Targeted Temperature Management 32-36°C for 24h (per protocol)
4. Avoid hyperoxia — titrate O2 to SpO2 92-98%
5. Avoid hypotension — vasopressors/fluids PRN
6. Blood glucose 144-180 mg/dL target range
7. CT head if no clear cardiac cause
8. Continuous EEG monitoring if comatose

### 2. Sepsis Hour-1 Bundle

**Source**: Surviving Sepsis Campaign 2021, CMS SEP-1

**Screening — qSOFA (≥2 = concern):**
- RR ≥ 22
- Altered mentation (GCS < 15)
- SBP ≤ 100

**Hour-1 Bundle (clock starts at triage/recognition):**
1. LACTATE — draw now. If > 2 mmol/L, repeat in 2-4 hours.
2. BLOOD CULTURES — 2 sets (aerobic + anaerobic) from 2 sites BEFORE antibiotics
3. ANTIBIOTICS — broad-spectrum IV within 1 hour of recognition. Every hour delay increases mortality ~7%.
4. FLUIDS — 30 mL/kg crystalloid for lactate ≥ 4 or SBP < 90. Start immediately, complete within 3 hours.
5. VASOPRESSORS — if MAP < 65 after fluids: NOREPINEPHRINE first-line, target MAP ≥ 65.

**Reassessment triggers:**
- Repeat lactate if initial > 2 (target: trending down)
- Reassess volume status if still hypotensive after 30 mL/kg
- Document reassessment (vital signs, physical exam, urine output)

### 3. Acute Stroke

**Source**: AHA/ASA Guidelines 2019, updated 2024

**Time-critical windows:**
- **tPA (alteplase)**: within 4.5 hours of last known well (LKW)
- **Thrombectomy**: up to 24 hours with qualifying imaging (large vessel occlusion + salvageable tissue)
- Door-to-needle target: < 60 minutes
- Door-to-groin target: < 90 minutes

**tPA Inclusion (all must be met):**
- Clinical diagnosis of ischemic stroke with measurable deficit
- Onset (or LKW) < 4.5 hours
- Age ≥ 18
- CT head: no hemorrhage

**tPA Exclusion (key ones — full list is longer):**
- Active internal bleeding
- Platelet count < 100,000
- INR > 1.7 or PT > 15 seconds
- Recent (< 3 months) head trauma, stroke, or intracranial surgery
- SBP > 185 or DBP > 110 (must be controlled BEFORE tPA)
- Blood glucose < 50

**tPA Dosing:**
- 0.9 mg/kg, max 90mg
- 10% as IV bolus over 1 min
- Remaining 90% infused over 60 min
- NO anticoagulants or antiplatelets for 24 hours post-tPA

**BP Targets:**
- Pre-tPA: must be < 185/110 to be eligible
- During/post-tPA (24h): maintain < 180/105
- No tPA given: permissive hypertension up to 220/120 (autoregulation)
- Post-thrombectomy: per neuro-interventionalist orders (often < 140 systolic)

**Nursing priorities:**
- Neuro checks q15min x 2h, q30min x 6h, q1h x 16h
- HOB flat (per stroke protocol) unless aspiration risk
- NPO until swallow eval
- No Foley unless absolutely necessary (aspiration risk takes priority over I&O precision)
- Call stroke team IMMEDIATELY for any neuro decline

### 4. Rapid Response

**Source**: Institute for Healthcare Improvement (IHI), modified early warning score literature

**Activation criteria (any single trigger):**
- HR < 40 or > 130
- RR < 8 or > 28
- SBP < 90
- SpO2 < 90% on current O2
- Acute change in mental status
- New onset chest pain with hemodynamic changes
- Staff member has significant concern about patient ("worried" criterion)

**MEWS (Modified Early Warning Score):**

| Parameter | 3 | 2 | 1 | 0 | 1 | 2 | 3 |
|-----------|---|---|---|---|---|---|---|
| HR | | < 40 | 41-50 | 51-100 | 101-110 | 111-129 | ≥ 130 |
| SBP | < 70 | 71-80 | 81-100 | 101-199 | | ≥ 200 | |
| RR | | < 9 | | 9-14 | 15-20 | 21-29 | ≥ 30 |
| Temp °C | | < 35 | | 35-38.4 | | ≥ 38.5 | |
| LOC | | | | Alert | Reacts to voice | Reacts to pain | Unresponsive |

MEWS ≥ 4: notify charge nurse and provider
MEWS ≥ 5: consider rapid response activation

**What to bring/report (SBAR):**
- S: "[Patient name], [age], [room]. I'm calling because [acute change]."
- B: Admit diagnosis, relevant history, baseline status
- A: Current vitals, what's different from baseline, interventions attempted
- R: "I need you to [come evaluate / give orders for / activate rapid response]"

### 5. RSI (Rapid Sequence Intubation)

**Source**: Walls & Murphy, Manual of Emergency Airway Management (Rosen's standard), EMCRIT

**Preparation (mnemonic: SOAP-ME):**
- **S**uction — Yankauer at HOB, working
- **O**xygen — BVM connected, NRB preoxygenating, nasal cannula at 15L (apneic oxygenation)
- **A**irway equipment — laryngoscope (check light), blade size, ETT (7.0-7.5F, 8.0M), stylet, bougie
- **P**harma — RSI meds drawn up, labeled, flushes ready
- **M**onitoring — continuous SpO2, waveform capnography ready, BP cycling q1min
- **E**scape plan — supraglottic airway (LMA/King) at bedside, surgical airway kit accessible

**Sequence:**
1. **PREOXYGENATE** — 3-5 min NRB at 15L or BVM (no bagging unless SpO2 dropping). Goal: SpO2 100% nitrogen washout.
2. **PRETREATMENT** (if indicated, 3 min before):
   - Fentanyl 1-3 mcg/kg (ICP concerns — blunts sympathetic surge)
   - Lidocaine 1.5 mg/kg IV (reactive airway / ICP — evidence is weak, declining use)
3. **INDUCTION** (push meds, not drip):
   - **Etomidate** 0.3 mg/kg IV — hemodynamically neutral. First-line in unstable patients.
   - **Ketamine** 1-2 mg/kg IV — bronchodilator, maintains BP. Good for asthma, sepsis.
   - **Propofol** 1-2 mg/kg IV — drops BP. Only in hemodynamically stable patients.
4. **PARALYTIC** (immediately after induction):
   - **Succinylcholine** 1.5 mg/kg IV — onset 45-60 sec, duration 6-10 min. Contraindicated in hyperkalemia, burns > 48h, crush injuries, neuromuscular disease.
   - **Rocuronium** 1.2 mg/kg IV — onset 60 sec, duration 45-60 min. Safe in hyperK. Sugammadex reversal available.
5. **POSITIONING** — sniffing position (ear to sternal notch alignment), jaw thrust
6. **PLACEMENT** — direct or video laryngoscopy, pass tube, inflate cuff
7. **CONFIRMATION** — waveform capnography (GOLD STANDARD), bilateral breath sounds, chest rise, SpO2 trending
8. **POST-INTUBATION** — CXR for depth, secure tube, sedation + analgesia (do NOT let paralysis wear off without sedation), vent settings

**Weight-based quick reference:**

| Drug | Dose | 60kg | 70kg | 80kg | 90kg | 100kg |
|------|------|------|------|------|------|-------|
| Etomidate | 0.3 mg/kg | 18mg | 21mg | 24mg | 27mg | 30mg |
| Ketamine | 1.5 mg/kg | 90mg | 105mg | 120mg | 135mg | 150mg |
| Propofol | 1.5 mg/kg | 90mg | 105mg | 120mg | 135mg | 150mg |
| Succinylcholine | 1.5 mg/kg | 90mg | 105mg | 120mg | 135mg | 150mg |
| Rocuronium | 1.2 mg/kg | 72mg | 84mg | 96mg | 108mg | 120mg |
| Fentanyl | 2 mcg/kg | 120mcg | 140mcg | 160mcg | 180mcg | 200mcg |

## Skill Specification

### Trigger Patterns

The skill activates when the nurse asks about any of the 5 protocols by name, alias, or clinical context:
- "ACLS", "code blue", "cardiac arrest", "bradycardia algorithm", "tach algorithm", "v-fib", "PEA"
- "sepsis bundle", "qSOFA", "hour-1 bundle", "SEP-1"
- "stroke protocol", "tPA criteria", "stroke window", "LKW"
- "rapid response", "MEWS", "early warning", "when to call RRT"
- "RSI", "intubation meds", "intubation doses", "rapid sequence"

### Output — Full Algorithm by Default

When a nurse asks for a protocol, give them the full algorithm. Do not distill to 3 lines — they're in it, they need the steps.

Read the relevant knowledge file via the Read tool and present the content formatted for the terminal:
- Numbered steps with exact doses and timeframes
- Decision points clearly marked
- Weight-based tables where applicable
- No prose paragraphs — scannable, actionable

### Output — Focused on Request

If the nurse asks a specific question within a protocol:
- "Epi dose in a code?" → `EPINEPHRINE 1mg IV/IO q3-5min`
- "tPA window?" → `4.5 hours from last known well. Door-to-needle target: < 60 min.`
- "Roc dose for 80kg?" → `Rocuronium 1.2 mg/kg = 96mg IV push`

Just the data point. No preamble.

### Disclaimer

Same rotating pool as Skills 1 and 2. Appended after the algorithm, never interspersed. Always present.

## Scope Boundaries

**In scope (v1):**
- 5 curated protocol knowledge files
- One skill for routing and formatting
- Full algorithm default, focused on request
- Evidence-based national guidelines only — no institutional content

**Out of scope — future iterations:**
- User-uploaded facility protocols (PDF parsing)
- Timer/clock integration for ACLS or sepsis
- Calculator integration (NIHSS scoring → Phase 2)
- Pediatric protocols (PALS)
- Additional algorithms (DKA, acute MI/STEMI, transfusion reactions, anaphylaxis)
- Protocol versioning / guideline year tracking

## Testing

### Skill tests (interactive via `claude --plugin-dir ./plugin`)
- "ACLS cardiac arrest" → full VF/pVT algorithm with doses
- "Sepsis bundle" → hour-1 bundle steps with timeframes
- "tPA criteria" → inclusion/exclusion with BP targets
- "When should I call a rapid response?" → activation criteria + MEWS table
- "RSI meds for 80kg patient" → weight-based table, focused to 80kg column
- "Epi dose in a code?" → single focused answer
- Disclaimer on every response

## Future Hooks

- Phase 2 clinical calculators (NIHSS, qSOFA scoring) can feed into protocol triggers
- Shift-assessment critical findings could suggest relevant protocol reference
- Timer/clock for ACLS and sepsis is a compelling feature but needs careful UX design — defer until the interaction model is proven
- Facility-specific protocol overlay is the long-term vision but requires trust + adoption first
