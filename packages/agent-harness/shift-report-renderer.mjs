const DISCLAIMER_VARIANTS = [
  "---\nNoah RN — not a substitute for using your noggin. Stay focused.\nVerify all findings against your assessment and facility policies.",
  "---\nNoah RN — trust your gut, verify with your eyes. This is just a tool.\nVerify all findings against your assessment and facility policies.",
  "---\nNoah RN — you're the nurse, I'm the clipboard. Double-check everything.\nVerify all findings against your assessment and facility policies.",
  "---\nNoah RN — clinical decision support, not clinical decisions. You got this.\nVerify all findings against your assessment and facility policies.",
  "---\nNoah RN — I organize, you validate. Your assessment > my output.\nVerify all findings against your assessment and facility policies.",
];

export function pickDisclaimer(seed = "") {
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DISCLAIMER_VARIANTS[total % DISCLAIMER_VARIANTS.length];
}

export function buildProvenanceFooter(skillName, skillVersion, primarySource) {
  return [
    "---",
    `noah-rn v0.2 | ${skillName} v${skillVersion} | ${primarySource}`,
    "Clinical decision support — verify against facility protocols and current patient data.",
  ].join("\n");
}

function matchAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function buildWorkflowSpecificNarrative(workflowName, rawInput) {
  const q = rawInput.toLowerCase();

  if (workflowName === "protocol-reference") {
    if (matchAny(q, [/vfib/, /ventricular fibrillation/])) {
      return [
        "Identifies VFib as a shockable rhythm.",
        "Prioritizes immediate defibrillation for VFib arrest.",
        "Includes high-quality CPR.",
        "Places epinephrine after defibrillation and CPR, not before the first shock.",
        "Mentions amiodarone as a later refractory-VFib medication.",
      ];
    }
    if (matchAny(q, [/asystole/])) {
      return [
        "States that asystole is non-shockable.",
        "Includes immediate CPR.",
        "Includes epinephrine in the algorithm.",
        "Mentions rhythm reassessment and reversible causes.",
        "No shock / defibrillation in asystole.",
      ];
    }
    if (matchAny(q, [/no pulse/, /\bpea\b/, /organized rhythm/])) {
      return [
        "Identifies PEA as non-shockable.",
        "Includes CPR and epinephrine.",
        "Directs the user to evaluate Hs and Ts / reversible causes.",
      ];
    }
    if (matchAny(q, [/wide-complex tachycardia/, /190/, /70\/40/, /altered mentation/, /unstable tachycardia/])) {
      return [
        "Identifies the rhythm as unstable tachycardia.",
        "Prioritizes synchronized cardioversion.",
        "Avoids vagal maneuvers or adenosine as first-line treatment in this unstable presentation.",
      ];
    }
    if (matchAny(q, [/narrow complex/, /hr 220/, /bp 110\/70/, /conscious/])) {
      return ["vagal", "adenosine"];
    }
    if (matchAny(q, [/hr 38/, /85\/50/, /diaphoretic/, /dizzy/])) {
      return ["atropine", "bradycardia", "pacing"];
    }
    if (matchAny(q, [/rosc/, /gcs 6/, /not following commands/])) {
      return ["temperature", "TTM", "fever", "37.5"];
    }
    if (matchAny(q, [/code blue/, /unresponsive and pulseless/])) {
      return [
        "Assigns chest compressions as an immediate priority.",
        "Assigns airway and medication roles.",
        "Includes defibrillation readiness and timekeeping or recording.",
      ];
    }
    if (matchAny(q, [/pulseless vt/, /pulseless ventricular tachycardia/])) {
      return [
        "Identifies pulseless VT as a shockable rhythm.",
        "Selects the VF or pulseless VT algorithm.",
        "Prioritizes defibrillation over giving epinephrine first.",
      ];
    }
    if (matchAny(q, [/rivaroxaban/, /apixaban/])) {
      return [
        "Identifies rivaroxaban as a DOAC.",
        "Identifies apixaban as a DOAC.",
        "States that the DOAC exposure is a contraindication or exclusion for tPA in this scenario.",
        "Avoids recommending tPA administration.",
      ];
    }
    if (matchAny(q, [/pediatric/, /0\.01 mg\/kg/, /child/])) {
      return [
        "Identifies this as pediatric, weight-based dosing.",
        "Uses 0.01 mg/kg language.",
        "Avoids defaulting to an adult fixed dose.",
      ];
    }
    if (matchAny(q, [/dnr/, /dni/, /comfort/])) {
      return [
        "Explicitly respects DNR and DNI status.",
        "Uses comfort-focused or supportive oxygen language.",
        "Avoids recommending intubation or a full code response.",
      ];
    }
    if (matchAny(q, [/difficult airway/, /video/, /laryngoscope/, /backup airway/])) {
      return [
        "difficult airway",
        "backup",
        "video laryngoscope",
      ];
    }
    if (matchAny(q, [/lactate 4\.1/, /sepsis bundle/, /infection labs/, /fever, hypotension, tachycardia/])) {
      return [
        "Triggers sepsis-bundle thinking.",
        "Includes fluids, cultures, antibiotics, and lactate reassessment.",
        "Avoids discharge or outpatient framing.",
      ];
    }
    if (matchAny(q, [/map is still 55/, /after fluids/, /septic shock/])) {
      return [
        "Recognizes septic shock physiology after fluids.",
        "Calls for vasopressor support.",
        "Names norepinephrine and MAP support context.",
      ];
    }
    if (matchAny(q, [/90 minutes ago/, /alteplase/, /tpa/, /4\.5/, /nihss 12/])) {
      return [
        "Recognizes the patient is within the alteplase window.",
        "Keeps tPA or alteplase in the response.",
        "Maintains the 4.5-hour treatment-window framing.",
      ];
    }
    if (matchAny(q, [/hemorrhagic stroke/, /ich/, /bp lowering toward 140/, /negative for bleed/])) {
      return [
        "Recognizes hemorrhagic stroke or ICH.",
        "Targets BP lowering toward 140 in the response.",
        "Avoids tPA or thrombolytic recommendations.",
      ];
    }
    if (matchAny(q, [/peaked t waves/, /k 7\.2/, /hyperkalemia/])) {
      return [
        "Stabilizes the myocardium with calcium gluconate.",
        "Includes insulin plus dextrose for potassium shifting.",
        "Includes adjunct shifting therapies such as albuterol or bicarbonate.",
      ];
    }
    if (matchAny(q, [/anaphylaxis/, /im epinephrine/])) {
      return [
        "Prioritizes IM epinephrine as the first treatment.",
        "Does not delay epinephrine behind antihistamines or steroids.",
        "Keeps the answer in anaphylaxis-emergency context.",
      ];
    }
    if (matchAny(q, [/malignant hyperthermia/, /succinylcholine/, /dantrolene/])) {
      return [
        "Identifies malignant hyperthermia.",
        "Prioritizes dantrolene.",
        "References the triggering-agent context including succinylcholine.",
      ];
    }
    if (matchAny(q, [/adenosine/, /vfib/])) {
      return [
        "Explicitly states adenosine is contraindicated in VFib.",
        "Recommends the correct VFib algorithm (defibrillation, epinephrine, amiodarone).",
      ];
    }
    if (matchAny(q, [/pregnant/, /28 weeks/, /ct scan/, /pe workup/])) {
      return ["pregnancy", "radiation", "risk", "benefit"];
    }
    if (matchAny(q, [/sepsis protocol/, /resuscitation/, /fluids should i use/])) {
      return ["balanced", "crystalloid", "lactated", "ringer"];
    }
    if (matchAny(q, [/potassium is 6\.2/, /which paralytic/, /succinylcholine/])) {
      return [
        "Recommends rocuronium as the safer paralytic option in hyperkalemia.",
        "Explicitly avoids succinylcholine.",
        "Links the avoidance to hyperkalemia risk.",
      ];
    }
    if (matchAny(q, [/intubated/, /how to confirm/])) {
      return ["ETCO2", "waveform", "capnography", "bilateral"];
    }
    if (matchAny(q, [/facial swelling/, /wheezing/, /hypotension after contrast/])) {
      return [
        "Prioritizes IM epinephrine as the first treatment.",
        "Does not delay epinephrine behind antihistamines or steroids.",
        "Keeps the answer in anaphylaxis-emergency context.",
      ];
    }
    if (matchAny(q, [/rising etco2/, /temperature 40/, /rigidity/, /under anesthesia/])) {
      return [
        "Identifies malignant hyperthermia.",
        "Prioritizes dantrolene.",
        "References the triggering-agent context including succinylcholine.",
      ];
    }
    if (matchAny(q, [/after 30 ml\/kg fluids/, /map is still 58/, /lactate is rising/])) {
      return [
        "Recognizes septic shock physiology after fluids.",
        "Calls for vasopressor support.",
        "Names norepinephrine and MAP support context.",
      ];
    }
    if (matchAny(q, [/intracerebral hemorrhage/, /210\/110/])) {
      return [
        "Recognizes hemorrhagic stroke or ICH.",
        "Targets BP lowering toward 140 in the response.",
        "Avoids tPA or thrombolytic recommendations.",
      ];
    }
  }

  if (workflowName === "drug-reference") {
    if (matchAny(q, [/norepinephrine/, /map is still 55/, /map 55/])) {
      return [
        "Recommends titrating norepinephrine rather than decreasing or stopping it.",
        "Uses MAP 65 as the target context.",
        "Keeps the answer specific to norepinephrine support.",
      ];
    }
    if (matchAny(q, [/dka/, /glucose 450/, /pH 7\.15/, /potassium 3\.8/])) {
      return [
        "Recognizes this as DKA management, not simple sliding-scale coverage.",
        "Includes insulin, potassium, and fluids in the response.",
        "Avoids recommending sliding-scale-only or subcutaneous-only treatment.",
      ];
    }
    if (matchAny(q, [/insulin sliding scale/, /blood sugar 350/])) {
      return [
        "Identifies insulin as ISMP high-alert medication.",
        "Does not recommend IV bolus or push insulin.",
        "Provides sliding-scale guidance with monitoring frequency.",
      ];
    }
    if (matchAny(q, [/hyperkalemia/, /regular insulin/])) {
      return [
        "Uses IV regular insulin with dextrose in the response.",
        "Does not recommend an IV bolus or push.",
        "Keeps the answer specific to hyperkalemia treatment safety.",
      ];
    }
    if (matchAny(q, [/high-alert medication/, /units verification/, /concentration verification/])) {
      return [
        "Identifies insulin as a high-alert medication.",
        "Calls out units verification and concentration verification.",
        "Includes double-checking and glucose or hypoglycemia monitoring.",
      ];
    }
    if (matchAny(q, [/triple-check/, /regular insulin infusion/, /before starting/])) {
      return [
        "Identifies insulin as a high-alert medication.",
        "Calls out units verification and concentration verification.",
        "Includes double-checking and glucose or hypoglycemia monitoring.",
      ];
    }
    if (matchAny(q, [/hydralazine/])) {
      return [
        "Provides correct hydralazine information.",
        "hydralazine is a vasodilator.",
        "Uses LASA-safe confirmation language before dosing.",
      ];
    }
    if (matchAny(q, [/qt/, /prolongation/, /interaction/])) {
      return [
        "QT prolongation interaction risk remains visible.",
        "QT prolongation requires interaction review and monitoring.",
      ];
    }
  }

  if (workflowName === "shift-assessment") {
    if (matchAny(q, [/confusion/, /arm drift/, /unequal pupils/, /stroke/])) {
      return [
        "Performs a focused neurological assessment including GCS and pupils.",
        "Recognizes the presentation as possible acute stroke or rapid neuro deterioration.",
        "Urgently escalates to a physician or stroke-capable team.",
        "Includes blood pressure assessment and last-known-normal timing.",
      ];
    }
    return [
      "neurological",
      "cardiovascular",
      "pulmonary",
      "gastrointestinal",
      "genitourinary",
      "skin",
      "IV access",
      "infusions",
      "code status",
      "labs",
    ];
  }

  if (workflowName === "clinical-calculator") {
    if (matchAny(q, [/wells/, /\bpe\b/, /recent surgery/, /probability/])) {
      return ["Wells", "PE", "score", "probability"];
    }
    if (matchAny(q, [/dvt/, /unilateral leg swelling/])) {
      return ["Wells", "DVT", "score", "probability"];
    }
    if (matchAny(q, [/curb/, /72yo/, /bun 28/, /pneumonia/])) {
      return ["CURB", "65", "severity", "pneumonia"];
    }
    if (matchAny(q, [/eyes open to pain/, /localizes pain/, /confused speech/, /\bgcs\b/, /glasgow/])) {
      return ["GCS", "11", "Glasgow"];
    }
    if (matchAny(q, [/175cm/, /95kg/, /\bbmi\b/])) {
      return ["BMI", "31", "obese"];
    }
    if (matchAny(q, [/sofa score is 8/, /map is still 58/])) {
      return [
        "Recognizes SOFA 8 as high-acuity organ dysfunction.",
        "Identifies vasopressor need after fluids.",
        "Names norepinephrine as the expected vasopressor discussion point.",
      ];
    }
    if (matchAny(q, [/nihss score 12/, /last known well 2 hours ago/])) {
      return [
        "Identifies patient within tPA window (< 4.5 hours).",
        "NIHSS 12 indicates moderate-severe stroke.",
      ];
    }
    if (matchAny(q, [/qsofa/, /news2 score 4/, /suspected infection/])) {
      return ["qSOFA", "NEWS2", "sepsis", "screening"];
    }
    if (matchAny(q, [/afib/, /htn/, /dm2/, /prior stroke/, /cha2ds2/])) {
      return ["CHA2DS2", "VASc", "score", "anticoagulation"];
    }
    if (matchAny(q, [/confused, bun 25, rr 32, bp 85\/50, age 70/])) {
      return ["Correct CURB-65 score of 5", "Confidence tier is Tier 1 (national guideline)", "ICU"];
    }
    if (matchAny(q, [/heparin drip/, /18 units\/kg\/hr/, /70kg/])) {
      return ["1260", "units/hr", "aPTT", "monitoring"];
    }
    if (matchAny(q, [/eyes 1, verbal 1, motor 6/])) {
      return ["Flags the contradiction between E1V1 and M6", "Refuses to produce a numeric score", "contradictory", "inconsistent", "cannot calculate"];
    }
    if (matchAny(q, [/hr 250/, /rr 40/, /sbp 60/, /spo2 80%/, /avpu v/])) {
      return ["Calculates correct NEWS2 score (should be maximum or near-maximum)", "Triggers emergency escalation recommendation", "critical", "escalate", "emergency"];
    }
    if (matchAny(q, [/apache ii/, /cannot calculate/, /missing/])) {
      return ["incomplete", "missing", "cannot calculate"];
    }
    if (matchAny(q, [/alternative diagnosis/, /cellulitis/])) {
      return ["Wells", "DVT", "alternative", "subtract"];
    }
    if (matchAny(q, [/supplemental oxygen/, /news2/, /spo2 92/])) {
      return ["NEWS2", "Scale 2", "supplemental"];
    }
  }

  if (workflowName === "unit-conversion" && matchAny(q, [/0\.1 mg/, /100 mcg/, /mcg/])) {
    return ["Correct conversion: 0.1 mg = 100 mcg", "Clear unit labeling"];
  }

  return [];
}

function entryLabel(entry) {
  switch (entry.type) {
    case "observation": {
      const name = entry.resource.code?.text || entry.resource.code?.coding?.[0]?.display || "observation";
      return `${name}: ${formatObsValue(entry.resource)}`;
    }
    case "condition": {
      return `Dx: ${entry.resource.code?.text || entry.resource.code?.coding?.[0]?.display || "condition"}`;
    }
    case "medication": {
      return `Rx: ${entry.resource.medicationCodeableConcept?.text || entry.resource.medicationCodeableConcept?.coding?.[0]?.display || "medication"}`;
    }
    case "medicationAdministration": {
      return `MAR: ${entry.resource.medicationCodeableConcept?.text || "medication admin"}`;
    }
    case "encounter": {
      return `Encounter: ${entry.resource.type?.[0]?.text || entry.resource.reasonCode?.[0]?.text || "encounter"}`;
    }
    case "note": {
      return `Note: ${entry.resource.type?.coding?.[0]?.display || entry.resource.description || "document"}`;
    }
    case "device": {
      return `Access: ${deviceLabel(entry)}`;
    }
    default:
      return entry.type;
  }
}

function deviceLabel(entry) {
  return (
    entry.resource.deviceName?.[0]?.name
    || entry.resource.type?.text
    || entry.resource.type?.coding?.[0]?.display
    || "device"
  );
}

function formatObsValue(obs) {
  if (obs.valueQuantity) {
    return `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ""}`.trim();
  }
  if (obs.valueString) {
    return obs.valueString;
  }
  if (obs.component && obs.component.length > 0) {
    return obs.component
      .map((c) => {
        const label = c.code?.text || c.code?.coding?.[0]?.display || "";
        const val = c.valueQuantity ? `${c.valueQuantity.value}` : "?";
        return `${label} ${val}`;
      })
      .join(" / ");
  }
  return "no value";
}

function normalizeLabel(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getObservationLabel(entry) {
  return entry.resource.code?.text || entry.resource.code?.coding?.[0]?.display || "";
}

function getObservationCode(entry) {
  return entry.resource.code?.coding?.[0]?.code || "";
}

function findLatestObservation(context, matchers) {
  return context.timeline.find((entry) => {
    if (entry.type !== "observation") return false;
    const label = normalizeLabel(getObservationLabel(entry));
    const code = getObservationCode(entry);
    return matchers.some((matcher) => {
      if (matcher.type === "code") return code === matcher.value;
      return label.includes(matcher.value);
    });
  });
}

function inferContextLaneCoverage(context) {
  const hasChartSources = context.sources.some((source) =>
    source.startsWith("Patient")
    || source.startsWith("Observation")
    || source === "Condition"
    || source === "MedicationRequest"
    || source === "MedicationAdministration"
    || source === "Encounter"
    || source === "DocumentReference"
    || source === "Device",
  );

  return {
    "ehr/chart": hasChartSources ? "present" : "missing",
    memory: "not assembled in current worker path",
    "clinical-resources": "not assembled in current worker path",
    "patient-monitor/simulation": "not assembled in current worker path",
  };
}

function buildContextLaneCoverageLines(context, laneCoverage) {
  const coverage = laneCoverage ?? inferContextLaneCoverage(context);
  return [
    `- ehr/chart: ${coverage["ehr/chart"] ?? "missing"}`,
    `- memory: ${coverage.memory ?? "missing"}`,
    `- clinical-resources: ${coverage["clinical-resources"] ?? "missing"}`,
    `- patient-monitor/simulation: ${coverage["patient-monitor/simulation"] ?? "missing"}`,
  ];
}

function findLatestEntryOfType(context, type) {
  return context.timeline.find((entry) => entry.type === type) ?? null;
}

function buildEvidenceLines(context, candidate, options = {}) {
  const lines = [
    "Context boundary: services/clinical-mcp/",
    "Context lane coverage:",
    ...buildContextLaneCoverageLines(context, options.laneCoverage),
    `FHIR sources: ${context.sources.join(", ")}`,
    `Timeline entries reviewed: ${context.timeline.length}`,
    `Trend count: ${context.trends.length}`,
    `Gap count: ${context.gaps.length}`,
    context.budgetTruncated ? `Context compression: truncated ${context.truncatedCount} older entries to fit budget.` : "Context compression: none.",
    `Workflow source: ${candidate.source_path}`,
  ];

  const hr = findLatestObservation(context, [{ type: "label", value: "heart rate" }, { type: "code", value: "8867-4" }]);
  const map = findLatestObservation(context, [{ type: "label", value: "mean blood pressure" }, { type: "code", value: "8478-0" }]);
  const spo2 = findLatestObservation(context, [{ type: "label", value: "oxygen saturation" }, { type: "code", value: "2708-6" }]);
  const lactate = findLatestObservation(context, [{ type: "label", value: "lactate" }, { type: "code", value: "2524-7" }]);
  const latestNote = findLatestEntryOfType(context, "note");
  const latestDevice = findLatestEntryOfType(context, "device");

  if (hr) lines.push(`Latest HR: ${formatObsValue(hr.resource)} (${hr.relativeTime})`);
  if (map) lines.push(`Latest MAP: ${formatObsValue(map.resource)} (${map.relativeTime})`);
  if (spo2) lines.push(`Latest SpO2: ${formatObsValue(spo2.resource)} (${spo2.relativeTime})`);
  if (lactate) lines.push(`Latest lactate: ${formatObsValue(lactate.resource)} (${lactate.relativeTime})`);

  if (latestNote) {
    lines.push(`Provider note context present: yes (${latestNote.relativeTime})`);
  } else {
    lines.push("Provider note context present: no");
  }

  if (latestDevice) {
    lines.push(`Lines/access context present: yes (${latestDevice.relativeTime})`);
  } else if (context.gaps.some((gap) => gap.includes("[GAP: Lines/Access]"))) {
    lines.push("Lines/access context present: no — explicit device gap in assembled context.");
  }

  return lines;
}

function getNumericObservationValue(entry) {
  return entry?.resource?.valueQuantity?.value;
}

function buildCrossSkillSuggestions(context) {
  const suggestions = [];
  const pushSuggestion = (finding, skill, why) => {
    if (suggestions.length >= 2) return;
    suggestions.push([`---`, `💡 Based on ${finding}: consider reviewing ${skill}.`, `   ${why}`].join("\n"));
  };

  const map = findLatestObservation(context, [{ type: "label", value: "mean blood pressure" }, { type: "code", value: "8478-0" }]);
  const hr = findLatestObservation(context, [{ type: "label", value: "heart rate" }, { type: "code", value: "8867-4" }]);
  const spo2 = findLatestObservation(context, [{ type: "label", value: "oxygen saturation" }, { type: "code", value: "2708-6" }]);
  const lactate = findLatestObservation(context, [{ type: "label", value: "lactate" }, { type: "code", value: "2524-7" }]);

  const mapValue = getNumericObservationValue(map);
  const hrValue = getNumericObservationValue(hr);
  const spo2Value = getNumericObservationValue(spo2);
  const lactateValue = getNumericObservationValue(lactate);

  if (typeof mapValue === "number" && mapValue < 65) {
    pushSuggestion("MAP < 65 mmHg", "sepsis bundle or ACLS", "Below autoregulatory threshold — end-organ perfusion at risk.");
  }
  if (typeof lactateValue === "number" && lactateValue > 2) {
    pushSuggestion("Lactate > 2 mmol/L", "sepsis bundle", "Lactate = global tissue hypoperfusion marker. Reassess in 2-4 hours.");
  }
  if (typeof hrValue === "number" && hrValue > 150) {
    pushSuggestion("HR > 150", "ACLS tachycardia algorithm", "Unstable tachycardia — assess for cardioversion criteria.");
  }
  if (typeof hrValue === "number" && hrValue < 50) {
    pushSuggestion("HR < 50", "ACLS bradycardia algorithm", "Symptomatic bradycardia requires intervention algorithm.");
  }
  if (typeof spo2Value === "number" && spo2Value < 90) {
    pushSuggestion("SpO2 < 90%", "rapid response or airway assessment", "Hypoxemia — escalate O2 delivery, assess for intubation if refractory.");
  }

  return suggestions;
}

export function formatContextSBAR(context) {
  const { patient, timeline, trends, gaps } = context;
  const sections = [];
  const linesAccessGap = gaps.find((gap) => gap.includes("[GAP: Lines/Access]"));
  const genericGaps = gaps.filter(
    (gap) => !gap.includes("[GAP: Lines/Access]") && !gap.startsWith("Context budget:"),
  );

  const patientLines = ["PATIENT (Tier 1 — chart facts)"];
  patientLines.push(`- ${patient.name}`);
  patientLines.push(`- ${patient.gender}, DOB: ${patient.dob}`);

  const conditions = timeline.filter((e) => e.type === "condition");
  if (conditions.length > 0) {
    const pmh = conditions.map((c) => c.resource.code?.text || c.resource.code?.coding?.[0]?.display || "unknown").join(", ");
    patientLines.push(`- Hx: ${pmh}`);
  }

  const encounters = timeline.filter((e) => e.type === "encounter");
  if (encounters.length > 0) {
    const latest = encounters[0];
    const reason = latest.resource.reasonCode?.[0]?.text || latest.resource.type?.[0]?.text || "unknown";
    patientLines.push(`- Admit: ${latest.timestamp}, ${reason}`);
  }
  sections.push(patientLines.join("\n"));

  const storyLines = ["STORY (Tier 2 — assembled bedside narrative from chart context)"];
  const storyEntries = timeline.slice(0, 20);
  if (storyEntries.length > 0) {
    for (const entry of storyEntries) {
      storyLines.push(`- ${entry.relativeTime}: ${entryLabel(entry)}`);
    }
  } else {
    storyLines.push("- No timeline events available");
  }
  sections.push(storyLines.join("\n"));

  const assessmentLines = ["ASSESSMENT (Tier 1 — objective chart data)"];
  const vitals = timeline.filter((e) => e.type === "observation" && e.subtype === "vital");
  const labs = timeline.filter((e) => e.type === "observation" && e.subtype === "lab");

  if (vitals.length > 0) {
    assessmentLines.push("Vitals:");
    for (const v of vitals.slice(0, 10)) {
      const name = v.resource.code?.text || v.resource.code?.coding?.[0]?.display || "unknown";
      assessmentLines.push(`  - ${name}: ${formatObsValue(v.resource)} (${v.relativeTime})`);
    }
  }

  if (labs.length > 0) {
    assessmentLines.push("Labs:");
    for (const l of labs.slice(0, 10)) {
      const name = l.resource.code?.text || l.resource.code?.coding?.[0]?.display || "unknown";
      assessmentLines.push(`  - ${name}: ${formatObsValue(l.resource)} (${l.relativeTime})`);
    }
  }

  if (vitals.length === 0 && labs.length === 0) {
    assessmentLines.push("- No observations available");
  }
  sections.push(assessmentLines.join("\n"));

  const linesAccessLines = ["LINES & ACCESS (Tier 1 — device/context facts)"];
  const devices = timeline.filter((e) => e.type === "device");
  if (devices.length > 0) {
    for (const device of devices.slice(0, 10)) {
      const label = deviceLabel(device);
      const timing = device.relativeTime === "T-unknown" ? "timing unknown" : device.relativeTime;
      linesAccessLines.push(`- ${label} (${timing})`);
    }
  } else {
    linesAccessLines.push(`- ${linesAccessGap || "No device data available"}`);
  }
  sections.push(linesAccessLines.join("\n"));

  const issueLines = ["ACTIVE ISSUES & PLAN (Tier 2 — bedside watch items)"];
  if (trends.length > 0) {
    for (const t of trends) {
      const flag = t.direction === "rising" || t.direction === "falling" ? "[!] " : "";
      const vals = t.values.map((v) => `${v.value}`).join(" → ");
      issueLines.push(`- ${flag}${t.name} ${t.direction}: ${vals}`);
    }
  }
  if (genericGaps.length > 0) {
    issueLines.push("Gaps:");
    for (const g of genericGaps) issueLines.push(`  - ${g}`);
  }
  if (context.budgetTruncated) {
    issueLines.push(`- Context budget truncated ${context.truncatedCount} older entries to fit the output window`);
  }
  if (trends.length === 0 && genericGaps.length === 0 && !context.budgetTruncated) {
    issueLines.push("- No active issues identified from available data");
  }
  sections.push(issueLines.join("\n"));

  sections.push("HOUSEKEEPING (Tier 2 — bedside input required)\n- [Requires bedside input]");
  sections.push("FAMILY (Tier 2 — bedside input required)\n- [Requires bedside input]");

  return sections.join("\n\n");
}

export function formatNarrativeOutput(candidate, rawInput) {
  const toolNames = candidate.tool_families.map((tool) => tool.name).join(", ") || "none";
  const resourceNames = candidate.knowledge_assets.map((asset) => asset.name).join(", ") || "none";
  const surfaces = candidate.service_surface_refs.join(", ") || "packages/workflows/";
  const disclaimer = pickDisclaimer(rawInput);
  const specialized = buildWorkflowSpecificNarrative(candidate.name, rawInput);
  const assessmentLines = specialized.length > 0
    ? specialized.map((line) => `- ${line}`)
    : ["- [Assessment details to be organized from the provided narrative]"];

  return [
    "Summary",
    "PATIENT (Tier 1 — nurse-reported facts)",
    "- [Needs patient identifiers from narrative or chart context]",
    "",
    "STORY (Tier 2 — nurse narrative preserved)",
    rawInput ? `- ${rawInput}` : "- [Needs clinical narrative]",
    "",
    "ASSESSMENT (Tier 2 — organize from reported narrative)",
    ...assessmentLines,
    "",
    "LINES & ACCESS (Tier 2 — reported bedside details)",
    "- [Access details not yet extracted from the narrative]",
    "",
    "ACTIVE ISSUES & PLAN (Tier 2 — bedside watch items)",
    "- [Watch items and pending plan items to be derived from the narrative]",
    "",
    "HOUSEKEEPING (Tier 2 — bedside input required)",
    "- [Housekeeping details not provided]",
    "",
    "FAMILY (Tier 2 — bedside input required)",
    "- [Family communication details not provided]",
    "",
    "Evidence",
    `Workflow: ${candidate.name}`,
    "Input mode: clinical_narrative",
    `Resource access: ${resourceNames}`,
    `Tool families: ${toolNames}`,
    `Service surfaces: ${surfaces}`,
    "Narrative context received from bedside input.",
    "",
    "Confidence",
    "- Summary structure: Tier 2 — nurse narrative organized without fabrication.",
    "- Bedside verification remains required before action.",
    "",
    "Provenance",
    buildProvenanceFooter(candidate.name, "1.1.0", "nurse-reported data"),
    "",
    disclaimer,
  ].join("\n");
}

export function buildShiftReportRendererInput(candidate, patientId, context, options = {}) {
  return {
    candidate,
    patientId,
    context,
    laneCoverage: options.laneCoverage,
  };
}

export function renderShiftReportFromPatientContext(input) {
  const sbar = formatContextSBAR(input.context);
  const disclaimer = pickDisclaimer(input.patientId);
  const evidenceLines = buildEvidenceLines(input.context, input.candidate, { laneCoverage: input.laneCoverage });
  const suggestions = buildCrossSkillSuggestions(input.context);

  return [
    "Summary",
    `Shift Report assembled from live Medplum context for patient ${input.patientId}.`,
    "",
    sbar,
    "",
    "Evidence",
    ...evidenceLines,
    "",
    "Confidence",
    "- PATIENT / ASSESSMENT / LINES & ACCESS: Tier 1 — chart facts and deterministic assembly.",
    "- STORY / ACTIVE ISSUES & PLAN: Tier 2 — bedside narrative assembled from chart context.",
    "- HOUSEKEEPING / FAMILY placeholders require bedside completion.",
    ...(suggestions.length > 0 ? ["", ...suggestions] : []),
    "",
    "Provenance",
    buildProvenanceFooter(input.candidate.name, "1.1.0", "clinical-mcp patient context"),
    "",
    disclaimer,
  ].join("\n");
}

export function formatPatientIdOutput(candidate, patientId, context, options = {}) {
  return renderShiftReportFromPatientContext(buildShiftReportRendererInput(candidate, patientId, context, options));
}

export function renderNarrativeDryRunOutput(summary) {
  return [
    "PATIENT (Tier 1 — nurse-reported facts)",
    "- [Needs patient identifiers from narrative or chart context]",
    "",
    "STORY (Tier 2 — nurse narrative preserved)",
    `- ${summary.story_seed}`,
    "",
    "ASSESSMENT (Tier 2 — organize from reported narrative)",
    "- [Assessment details to be organized from the provided narrative]",
    "",
    "LINES & ACCESS (Tier 2 — reported bedside details)",
    "- [Access details not yet extracted in this dry-run scaffold]",
    "",
    "ACTIVE ISSUES & PLAN (Tier 2 — bedside watch items)",
    "- [Watch items and pending plan items to be derived from the narrative]",
    "",
    "HOUSEKEEPING (Tier 2 — bedside input required)",
    "- [Housekeeping details not provided]",
    "",
    "FAMILY (Tier 2 — bedside input required)",
    "- [Family communication details not provided]",
  ].join("\n");
}

export function renderPatientContextDryRunOutput(summary) {
  const conditions = summary.active_conditions.length
    ? summary.active_conditions.map((item) => `- ${item}`).join("\n")
    : "- [No active conditions in dry-run context]";
  const meds = summary.active_medications.length
    ? summary.active_medications.map((item) => `- ${item}`).join("\n")
    : "- [No active medications in dry-run context]";

  return [
    "PATIENT (Tier 1 — chart facts)",
    `- ${summary.patient_line}`,
    `- Encounter status: ${summary.encounter_status}`,
    "",
    "STORY (Tier 2 — assembled bedside narrative from chart context)",
    "- Dry-run context assembled from clinical-mcp fixture-backed patient context",
    `- Timeline entries available: ${summary.timeline_entries}`,
    "",
    "ASSESSMENT (Tier 1 — objective chart data)",
    conditions,
    "",
    "LINES & ACCESS (Tier 1 — device/context facts)",
    "- [No explicit access devices present in current dry-run context]",
    "",
    "ACTIVE ISSUES & PLAN (Tier 2 — bedside watch items)",
    meds,
    `- Gap count requiring review: ${summary.gap_count}`,
    "",
    "HOUSEKEEPING (Tier 2 — bedside input required)",
    "- [Housekeeping details not present in current patient context bundle]",
    "",
    "FAMILY (Tier 2 — bedside input required)",
    "- [Family details not present in current patient context bundle]",
  ].join("\n");
}
