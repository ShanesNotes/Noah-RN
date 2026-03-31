# Cross-Skill Trigger Rules

When a skill produces output containing these findings, surface a suggestion
to the nurse — never autonomously invoke another skill. These are "hey, you
might also want to check..." prompts.

## Trigger Mappings

20 trigger conditions mapping to 31 trigger→skill suggestion pairings (several triggers
suggest more than one skill).

| Finding | Suggest | Why We Care |
|---------|---------|-------------|
| GCS <= 8 | RSI protocol, rapid response | GCS 8 = loss of airway protective reflexes. Anticipate intubation. |
| GCS drop >= 2 points from baseline | Rapid response, neuro assessment | Acute neurological decline — time-critical intervention window. |
| NIHSS > 0 | Stroke protocol | Any NIHSS score = active stroke symptoms. Clock is ticking. |
| NIHSS >= 6 | Stroke protocol + LVO screening | Moderate-severe stroke — evaluate for thrombectomy candidacy. |
| Lactate > 2 mmol/L | Sepsis bundle | Lactate = global tissue hypoperfusion marker. Reassess in 2-4 hours. |
| MAP < 65 mmHg | Sepsis bundle or ACLS (context-dependent) | Below autoregulatory threshold — end-organ perfusion at risk. |
| HR < 50 | ACLS bradycardia algorithm | Symptomatic bradycardia requires intervention algorithm. |
| HR > 150 | ACLS tachycardia algorithm | Unstable tachycardia — assess for cardioversion criteria. |
| SpO2 < 90% | Rapid response, airway assessment | Hypoxemia — escalate O2 delivery, assess for intubation if refractory. |
| Braden <= 12 | Pressure injury prevention protocol | High risk for skin breakdown — reposition q2h, specialty surface. |
| Braden <= 9 | Pressure injury prevention + wound consult | Very high risk — intensive prevention measures needed. |
| CPOT >= 3 | Pain management reassessment | Clinically significant pain in non-verbal patient. Intervene and reassess. |
| RASS < -3 | Sedation reassessment, consider SAT | Deep sedation — evaluate for spontaneous awakening trial if applicable. |
| RASS > +2 | Agitation management, safety assessment | Significant agitation — assess for delirium, pain, physiologic cause. |
| Wells PE >= 5 | Anticoagulation reference, CT-PA workup | Moderate-high PE probability — discuss imaging and empiric anticoagulation. |
| Wells DVT >= 3 | DVT workup, duplex ultrasound | Moderate-high DVT probability — imaging warranted. |
| CURB-65 >= 3 | ICU admission consideration | Severe pneumonia — ICU-level monitoring and aggressive treatment. |
| APACHE II >= 25 | Goals of care discussion | Predicted mortality > 50% — ensure code status and family communication documented. |
| UOP < 0.5 mL/kg/hr x 6h | Renal assessment, fluid status | Oliguria — end-organ perfusion concern. Evaluate for AKI. |
| Net fluid balance > +3L | Volume overload assessment | Significant positive balance — assess for pulmonary edema, peripheral edema. |

## How to Surface Suggestions

In the output's Tier 2 section, add a brief suggestion block:

```
---
💡 Based on [finding]: consider reviewing [protocol/skill].
   [One-line clinical rationale.]
```

Rules:
- Suggestions only. Never invoke another skill autonomously.
- Maximum 2 suggestions per output. More = noise.
- Only suggest if the finding is clearly present in the input or output.
- Don't suggest what the nurse already asked for.
- Use the "why we care" one-liner from the table above.
