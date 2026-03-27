# Protocol Reference — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protocol quick-recall skill backed by 5 curated clinical algorithm knowledge files — ACLS, sepsis, stroke, rapid response, and RSI.

**Architecture:** One SKILL.md routes the nurse's question to the correct knowledge file, reads it via the Read tool, and presents the algorithm in full or focused format. Knowledge files are standalone markdown with the complete clinical content. No external APIs or tools.

**Tech Stack:** SKILL.md + markdown knowledge files. Tested via `claude --plugin-dir ./plugin`.

**Spec:** `docs/superpowers/specs/2026-03-26-protocol-reference-design.md`

---

### Task 1: Write ACLS knowledge file

**Files:**
- Create: `knowledge/protocols/acls.md`

- [ ] **Step 1: Remove stale .gitkeep**

```bash
rm knowledge/protocols/.gitkeep
```

- [ ] **Step 2: Write the ACLS knowledge file**

Create `knowledge/protocols/acls.md` with the full ACLS content from the spec. This file is read by the skill at runtime — it must be complete, standalone, and formatted for terminal display.

The file must contain all four sub-algorithms exactly as specified:
1. Cardiac Arrest — VF/pVT (CPR, defib, epi 1mg q3-5min, amio 300mg/150mg, H's and T's)
2. Cardiac Arrest — PEA/Asystole (CPR, epi ASAP, no defib, H's and T's)
3. Bradycardia (atropine 1mg q3-5min max 3mg, pacing, dopamine/epi drip)
4. Tachycardia (stable vs unstable decision tree, cardioversion joules, adenosine 6/12/12)
5. Post-ROSC (12-lead, MAP >65, TTM 32-36°C, avoid hyperoxia)

```markdown
# ACLS — Advanced Cardiovascular Life Support

Source: AHA ACLS Guidelines 2020/2025

---

## CARDIAC ARREST — VF/pVT

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

---

## CARDIAC ARREST — PEA/Asystole

1. CPR immediately
2. IV/IO access
3. EPINEPHRINE 1mg IV/IO q3-5min (give ASAP — early epi improves outcomes in non-shockable)
4. CPR x 2min cycles, rhythm check between
5. NOT shockable — do NOT defib
6. Treat reversible causes — H's and T's
7. Consider termination criteria per local protocol

---

## BRADYCARDIA (HR < 50 with symptoms)

1. ATROPINE 1mg IV q3-5min, max 3mg
2. If atropine ineffective: transcutaneous pacing OR
3. Dopamine 5-20 mcg/kg/min OR Epinephrine 2-10 mcg/min
4. Prepare for transvenous pacing

---

## TACHYCARDIA (HR > 150 with pulse)

**Unstable** (hypotension, AMS, chest pain, acute HF):
→ Synchronized cardioversion
- Narrow regular: 50-100J → 100J → 200J → 300J → 360J
- Narrow irregular (A-fib): 120-200J biphasic
- Wide regular: 100J → 200J → 300J → 360J

**Stable narrow regular:**
1. Vagal maneuvers
2. ADENOSINE 6mg rapid IV push (followed by 20mL NS flush)
3. ADENOSINE 12mg if no conversion
4. ADENOSINE 12mg if still no conversion

**Stable narrow irregular (A-fib/flutter):**
- Rate control: diltiazem or beta-blocker
- NO adenosine

**Stable wide regular:**
- AMIODARONE 150mg IV over 10min, may repeat
- Consider adenosine if regular and monomorphic

**Stable wide irregular:**
- DO NOT USE AV nodal blockers
- Expert consult
- Consider amiodarone

---

## POST-ROSC

1. 12-lead ECG — STEMI → cath lab
2. Target: SBP > 90, MAP > 65
3. Targeted Temperature Management 32-36°C for 24h
4. Avoid hyperoxia — titrate O2 to SpO2 92-98%
5. Avoid hypotension — vasopressors/fluids PRN
6. Blood glucose target 144-180 mg/dL
7. CT head if no clear cardiac cause
8. Continuous EEG monitoring if comatose
```

- [ ] **Step 3: Commit**

```bash
git add knowledge/protocols/acls.md knowledge/protocols/.gitkeep
git commit -m "feat: add ACLS protocol knowledge file"
```

---

### Task 2: Write Sepsis Bundle knowledge file

**Files:**
- Create: `knowledge/protocols/sepsis-bundle.md`

- [ ] **Step 1: Write the file**

Create `knowledge/protocols/sepsis-bundle.md`:

```markdown
# Sepsis — Hour-1 Bundle

Source: Surviving Sepsis Campaign 2021, CMS SEP-1

---

## SCREENING — qSOFA (≥2 = concern)

- RR ≥ 22
- Altered mentation (GCS < 15)
- SBP ≤ 100

---

## HOUR-1 BUNDLE (clock starts at triage/recognition)

1. **LACTATE** — draw now. If > 2 mmol/L, repeat in 2-4 hours.
2. **BLOOD CULTURES** — 2 sets (aerobic + anaerobic) from 2 sites BEFORE antibiotics
3. **ANTIBIOTICS** — broad-spectrum IV within 1 hour of recognition. Every hour delay increases mortality ~7%.
4. **FLUIDS** — 30 mL/kg crystalloid for lactate ≥ 4 or SBP < 90. Start immediately, complete within 3 hours.
5. **VASOPRESSORS** — if MAP < 65 after fluids: NOREPINEPHRINE first-line, target MAP ≥ 65.

---

## REASSESSMENT TRIGGERS

- Repeat lactate if initial > 2 (target: trending down)
- Reassess volume status if still hypotensive after 30 mL/kg
- Document reassessment: vital signs, physical exam, urine output
```

- [ ] **Step 2: Commit**

```bash
git add knowledge/protocols/sepsis-bundle.md
git commit -m "feat: add sepsis hour-1 bundle knowledge file"
```

---

### Task 3: Write Acute Stroke knowledge file

**Files:**
- Create: `knowledge/protocols/acute-stroke.md`

- [ ] **Step 1: Write the file**

Create `knowledge/protocols/acute-stroke.md`:

```markdown
# Acute Stroke Protocol

Source: AHA/ASA Guidelines 2019, updated 2024

---

## TIME-CRITICAL WINDOWS

- **tPA (alteplase)**: within 4.5 hours of last known well (LKW)
- **Thrombectomy**: up to 24 hours with qualifying imaging (LVO + salvageable tissue)
- Door-to-needle target: < 60 minutes
- Door-to-groin target: < 90 minutes

---

## tPA INCLUSION (all must be met)

- Clinical diagnosis of ischemic stroke with measurable deficit
- Onset (or LKW) < 4.5 hours
- Age ≥ 18
- CT head: no hemorrhage

## tPA EXCLUSION (key criteria)

- Active internal bleeding
- Platelet count < 100,000
- INR > 1.7 or PT > 15 seconds
- Recent (< 3 months) head trauma, stroke, or intracranial surgery
- SBP > 185 or DBP > 110 (must be controlled BEFORE tPA)
- Blood glucose < 50

---

## tPA DOSING

- 0.9 mg/kg, max 90mg
- 10% as IV bolus over 1 min
- Remaining 90% infused over 60 min
- NO anticoagulants or antiplatelets for 24 hours post-tPA

---

## BP TARGETS

- Pre-tPA: must be < 185/110 to be eligible
- During/post-tPA (24h): maintain < 180/105
- No tPA given: permissive hypertension up to 220/120 (autoregulation)
- Post-thrombectomy: per neuro-interventionalist orders (often < 140 systolic)

---

## NURSING PRIORITIES

- Neuro checks q15min x 2h, q30min x 6h, q1h x 16h
- HOB flat (per stroke protocol) unless aspiration risk
- NPO until swallow eval
- No Foley unless absolutely necessary
- Call stroke team IMMEDIATELY for any neuro decline
```

- [ ] **Step 2: Commit**

```bash
git add knowledge/protocols/acute-stroke.md
git commit -m "feat: add acute stroke protocol knowledge file"
```

---

### Task 4: Write Rapid Response knowledge file

**Files:**
- Create: `knowledge/protocols/rapid-response.md`

- [ ] **Step 1: Write the file**

Create `knowledge/protocols/rapid-response.md`:

```markdown
# Rapid Response / Early Warning

Source: IHI, modified early warning score literature

---

## ACTIVATION CRITERIA (any single trigger)

- HR < 40 or > 130
- RR < 8 or > 28
- SBP < 90
- SpO2 < 90% on current O2
- Acute change in mental status
- New onset chest pain with hemodynamic changes
- Staff member has significant concern about patient ("worried" criterion)

---

## MEWS — Modified Early Warning Score

| Parameter | 3 | 2 | 1 | 0 | 1 | 2 | 3 |
|-----------|---|---|---|---|---|---|---|
| HR | | < 40 | 41-50 | 51-100 | 101-110 | 111-129 | ≥ 130 |
| SBP | < 70 | 71-80 | 81-100 | 101-199 | | ≥ 200 | |
| RR | | < 9 | | 9-14 | 15-20 | 21-29 | ≥ 30 |
| Temp °C | | < 35 | | 35-38.4 | | ≥ 38.5 | |
| LOC | | | | Alert | Reacts to voice | Reacts to pain | Unresponsive |

- MEWS ≥ 4: notify charge nurse and provider
- MEWS ≥ 5: consider rapid response activation

---

## WHAT TO REPORT (SBAR)

- **S**: "[Patient name], [age], [room]. I'm calling because [acute change]."
- **B**: Admit diagnosis, relevant history, baseline status
- **A**: Current vitals, what's different from baseline, interventions attempted
- **R**: "I need you to [come evaluate / give orders for / activate rapid response]"
```

- [ ] **Step 2: Commit**

```bash
git add knowledge/protocols/rapid-response.md
git commit -m "feat: add rapid response/MEWS knowledge file"
```

---

### Task 5: Write RSI knowledge file

**Files:**
- Create: `knowledge/protocols/rsi.md`

- [ ] **Step 1: Write the file**

Create `knowledge/protocols/rsi.md`:

```markdown
# RSI — Rapid Sequence Intubation

Source: Walls & Murphy, Manual of Emergency Airway Management; EMCRIT

---

## PREPARATION (SOAP-ME)

- **S**uction — Yankauer at HOB, working
- **O**xygen — BVM connected, NRB preoxygenating, nasal cannula at 15L (apneic oxygenation)
- **A**irway equipment — laryngoscope (check light), blade size, ETT (7.0-7.5F, 8.0M), stylet, bougie
- **P**harma — RSI meds drawn up, labeled, flushes ready
- **M**onitoring — continuous SpO2, waveform capnography ready, BP cycling q1min
- **E**scape plan — supraglottic airway (LMA/King) at bedside, surgical airway kit accessible

---

## SEQUENCE

1. **PREOXYGENATE** — 3-5 min NRB at 15L or BVM (no bagging unless SpO2 dropping). Goal: SpO2 100% nitrogen washout.
2. **PRETREATMENT** (if indicated, 3 min before):
   - Fentanyl 1-3 mcg/kg (ICP concerns — blunts sympathetic surge)
   - Lidocaine 1.5 mg/kg IV (reactive airway / ICP — evidence weak, declining use)
3. **INDUCTION** (push, not drip):
   - **Etomidate** 0.3 mg/kg IV — hemodynamically neutral. First-line in unstable patients.
   - **Ketamine** 1-2 mg/kg IV — bronchodilator, maintains BP. Good for asthma, sepsis.
   - **Propofol** 1-2 mg/kg IV — drops BP. Only in hemodynamically stable patients.
4. **PARALYTIC** (immediately after induction):
   - **Succinylcholine** 1.5 mg/kg IV — onset 45-60 sec, duration 6-10 min. Contraindicated: hyperK, burns > 48h, crush, neuromuscular disease.
   - **Rocuronium** 1.2 mg/kg IV — onset 60 sec, duration 45-60 min. Safe in hyperK. Sugammadex reversal available.
5. **POSITIONING** — sniffing position (ear to sternal notch alignment), jaw thrust
6. **PLACEMENT** — direct or video laryngoscopy, pass tube, inflate cuff
7. **CONFIRMATION** — waveform capnography (GOLD STANDARD), bilateral breath sounds, chest rise, SpO2
8. **POST-INTUBATION** — CXR for depth, secure tube, sedation + analgesia (do NOT let paralysis wear off without sedation), vent settings

---

## WEIGHT-BASED QUICK REFERENCE

| Drug | Dose | 60kg | 70kg | 80kg | 90kg | 100kg |
|------|------|------|------|------|------|-------|
| Etomidate | 0.3 mg/kg | 18mg | 21mg | 24mg | 27mg | 30mg |
| Ketamine | 1.5 mg/kg | 90mg | 105mg | 120mg | 135mg | 150mg |
| Propofol | 1.5 mg/kg | 90mg | 105mg | 120mg | 135mg | 150mg |
| Succinylcholine | 1.5 mg/kg | 90mg | 105mg | 120mg | 135mg | 150mg |
| Rocuronium | 1.2 mg/kg | 72mg | 84mg | 96mg | 108mg | 120mg |
| Fentanyl | 2 mcg/kg | 120mcg | 140mcg | 160mcg | 180mcg | 200mcg |
```

- [ ] **Step 2: Commit**

```bash
git add knowledge/protocols/rsi.md
git commit -m "feat: add RSI protocol knowledge file"
```

---

### Task 6: Write the protocol-reference SKILL.md

**Files:**
- Create: `plugin/skills/protocol-reference/SKILL.md`

- [ ] **Step 1: Create skill directory**

```bash
mkdir -p plugin/skills/protocol-reference
```

- [ ] **Step 2: Write the SKILL.md**

Create `plugin/skills/protocol-reference/SKILL.md`:

````markdown
---
name: protocol-reference
description: This skill should be used when the user asks about "ACLS", "code blue", "cardiac arrest", "bradycardia", "tachycardia", "v-fib", "PEA", "asystole", "sepsis bundle", "qSOFA", "hour-1 bundle", "SEP-1", "stroke protocol", "tPA criteria", "stroke window", "rapid response", "MEWS", "early warning", "when to call RRT", "RSI", "intubation meds", "intubation doses", "rapid sequence", or asks for any clinical practice guideline, protocol, or algorithm used in acute/critical care.
---

# Protocol Reference

Quick-recall of standardized clinical algorithms. Full steps with exact doses and timeframes by default. This is code language — precise, direct, actionable. The nurse knows why. They need the what and the when.

## Workflow

### Step 1: Identify the Protocol

Match the nurse's question to one of the 5 available protocols:

| Trigger | File |
|---------|------|
| ACLS, code blue, cardiac arrest, v-fib, VF, pVT, PEA, asystole, bradycardia algorithm, tachycardia algorithm, post-ROSC | `knowledge/protocols/acls.md` |
| Sepsis, sepsis bundle, qSOFA, hour-1 bundle, SEP-1, septic shock | `knowledge/protocols/sepsis-bundle.md` |
| Stroke, tPA, alteplase, stroke window, LKW, thrombectomy, NIH stroke | `knowledge/protocols/acute-stroke.md` |
| Rapid response, RRT, MEWS, early warning, when to call, escalation | `knowledge/protocols/rapid-response.md` |
| RSI, intubation, rapid sequence, intubation meds, intubation doses, airway | `knowledge/protocols/rsi.md` |

If the question doesn't match any protocol: "Protocol not available. Currently loaded: ACLS, Sepsis Bundle, Acute Stroke, Rapid Response, RSI."

### Step 2: Read the Knowledge File

Use the Read tool to load the matched protocol file. The file contains the complete, formatted algorithm.

### Step 3: Present the Algorithm

**Default — full algorithm.** When the nurse asks for a protocol by name, present the entire algorithm from the knowledge file. Do not summarize or distill — they're in it, they need the steps.

If the protocol has sub-sections (e.g., ACLS has VF/pVT, PEA/Asystole, Bradycardia, Tachycardia, Post-ROSC), present only the relevant sub-section if the nurse's question specifies one. If they just say "ACLS" or "code blue", present Cardiac Arrest — VF/pVT as the primary algorithm (most common code scenario) and note the other sub-sections are available.

**Focused — specific data point.** If the nurse asks a specific question within a protocol, give just the answer:
- "Epi dose in a code?" → `EPINEPHRINE 1mg IV/IO q3-5min`
- "tPA window?" → `4.5 hours from last known well. Door-to-needle target: < 60 min.`
- "Roc dose for 80kg?" → `Rocuronium 1.2 mg/kg = 96mg IV push`
- "Adenosine dose?" → `6mg rapid IV push (+ 20mL NS flush) → 12mg → 12mg`

Just the data point. No preamble.

### Step 4: Append Disclaimer

After every response, append a randomly selected disclaimer:

```
---
Noah RN — not a substitute for using your noggin. Stay focused.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — trust your gut, verify with your eyes. This is just a tool.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — you're the nurse, I'm the clipboard. Double-check everything.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — clinical decision support, not clinical decisions. You got this.
Verify all findings against your assessment and facility policies.
```

```
---
Noah RN — I organize, you validate. Your assessment > my output.
Verify all findings against your assessment and facility policies.
```

Select ONE randomly. Always include — never omit.

## Important Rules

- Present algorithms in full by default. Do not summarize unless asked for a specific data point.
- Do not modify the clinical content from the knowledge files. Present as-is.
- Do not add clinical recommendations beyond what's in the protocol.
- Do not reference institutional or facility-specific protocols. These are national evidence-based guidelines only.
- Output must be scannable under pressure. Numbered steps, exact doses, clear decision points.
- No conversational framing. No "here's the protocol" preamble. Straight to the algorithm.
- If the nurse asks for a protocol not in the loaded set, say so plainly and list what's available.
````

- [ ] **Step 3: Commit**

```bash
git add plugin/skills/protocol-reference/SKILL.md
git commit -m "feat: add protocol-reference skill (Phase 1, Skill 3)"
```

---

### Task 7: Validate plugin and test

- [ ] **Step 1: Validate plugin**

```bash
claude plugin validate ./plugin
```

Expected: `Validation passed`

- [ ] **Step 2: Test — ACLS cardiac arrest**

```bash
claude -p "ACLS cardiac arrest" --plugin-dir ./plugin --output-format text
```

Verify: Full VF/pVT algorithm with doses, numbered steps, disclaimer.

- [ ] **Step 3: Test — Sepsis bundle**

```bash
claude -p "Sepsis bundle" --plugin-dir ./plugin --output-format text
```

Verify: Hour-1 bundle steps with timeframes, qSOFA screening, disclaimer.

- [ ] **Step 4: Test — Focused query**

```bash
claude -p "Epi dose in a code?" --plugin-dir ./plugin --output-format text
```

Verify: Single focused answer (`EPINEPHRINE 1mg IV/IO q3-5min`), not full algorithm.

- [ ] **Step 5: Test — RSI with weight**

```bash
claude -p "RSI meds for 80kg patient" --plugin-dir ./plugin --output-format text
```

Verify: Weight-based table focused to 80kg, or full table with 80kg highlighted.

- [ ] **Step 6: Test — Protocol not found**

```bash
claude -p "DKA protocol" --plugin-dir ./plugin --output-format text
```

Verify: Clean message listing available protocols.

---

### Task 8: Iterate on issues

- [ ] **Step 1: Review test results from Task 7**

- [ ] **Step 2: Fix any issues in knowledge files or SKILL.md**

- [ ] **Step 3: Re-test failing scenarios**

- [ ] **Step 4: Commit fixes**

```bash
git add -A knowledge/protocols/ plugin/skills/protocol-reference/
git commit -m "fix: address protocol-reference test feedback"
```

---

### Task 9: Final verification and push

- [ ] **Step 1: Validate plugin**

```bash
claude plugin validate ./plugin
```

- [ ] **Step 2: Clean git state**

```bash
git status
git log --oneline -10
```

- [ ] **Step 3: Push**

```bash
git push
```

---

## Verification Summary

The skill is complete when:
1. `claude plugin validate ./plugin` passes
2. ACLS query returns full algorithm with doses
3. Sepsis query returns hour-1 bundle with timeframes
4. Focused query returns single data point, not full algorithm
5. RSI with weight returns weight-based dosing
6. Unknown protocol returns clean "not available" message
7. Disclaimer on every response
8. All 5 knowledge files committed and readable
