# **Architecting Calibrated Trust in Clinical Decision Support: A Reference UI Component Set for Epic Hyperdrive**

The integration of artificial intelligence into clinical workflows represents a profound paradigm shift, transitioning the electronic health record (EHR) from a static repository of patient data into an active, probabilistic collaborator. As large language models (LLMs) and complex machine learning algorithms are deployed in high-stakes medical environments, the primary human-computer interaction (HCI) challenge extends far beyond traditional usability. The central objective is the establishment and maintenance of calibrated trust. When clinical decision support (CDS) systems operate as opaque black boxes, they routinely induce one of two hazardous cognitive states: automation bias, where clinicians over-trust the system and blindly accept flawed recommendations, or algorithm aversion, where clinicians under-trust the system and discard valid, potentially life-saving guidance.1

To safely deploy generative AI models within established EHR ecosystems such as Epic Hyperdrive, the user interface (UI) must proactively manage the clinician's cognitive state. An optimal interface fosters an environment where the human operator's reliance on the system remains strictly proportional to the system's demonstrated, contextual capability.4 This comprehensive report details an exhaustive, expert-level UI component specification designed to achieve this calibrated trust. It operationalizes a deterministic, four-layer explanation architecture—progressing systematically through summary, evidence, confidence, and provenance. This framework is rendered via a progressive disclosure model heavily inspired by advanced ambient documentation platforms that utilize "Linked Evidence" to anchor probabilistic text generation to verifiable ground truth.7

Furthermore, this architecture is specifically optimized to function within the strict rendering constraints of Epic Hyperdrive iframes, ensuring seamless SMART on FHIR context initialization and automated invocation via CDS Hooks. A non-negotiable design mandate of this architecture is the preservation of cognitive ergonomics, stringently measured against the National Aeronautics and Space Administration Task Load Index (NASA-TLX) baseline for standard clinical documentation tasks.11 The following analysis dissects the psychological foundations of trust, the mathematical modeling of reliance, the precise architectural layers required for clinical explainability, and the exact code and configuration specifications required for native Epic integration.

## **The Psychology and Mathematics of Calibrated Trust in Healthcare**

Trust in clinical artificial intelligence is not a static, binary state; rather, it is a dynamic, context-dependent continuous variable that fluctuates based on system performance, task risk, and user expertise.14 Calibrated trust occurs exclusively when the human operator possesses a highly accurate mental model of the system's operational boundaries, recognizing precisely when to delegate cognitive tasks to the AI and when to override the algorithm with human clinical judgment.16

The interface must structurally enforce this calibration. Presenting a final AI prediction without contextual grounding routinely leads to clinical co-dependence and heightened susceptibility to AI hallucinations.2 Conversely, inundating a clinician with raw statistical explainability metrics—such as Shapley Additive Explanations (SHAP) or Local Interpretable Model-Agnostic Explanations (LIME)—fails because it fundamentally misaligns with clinical reasoning workflows, treating the physician as a data scientist rather than a medical practitioner.21 This misalignment increases cognitive load and rapidly induces alert fatigue.

To prevent these outcomes, the UI must dynamically modulate the friction of the decision-making process based on the inherent risk of the task and the model's internal certainty. The calibration of trust can be modeled mathematically to inform UI behavior. The expected post-explanation trust level, denoted as ![][image1], can be quantified as a weighted combination of model reliability, user expertise, and the effectiveness of the explainability intervention.23 The formulation is expressed as:

![][image2]  
Where:

* $p\_{err} \\in $ represents the estimated probability of an erroneous model output.  
* $E\_u \\in $ represents the clinician's normalized domain expertise.  
* $X\_{ai}(e) \\in $ represents the effectiveness of the UI's explanation mechanism ![][image3].  
* ![][image4] are learned weights reflecting specific deployment priorities and risk tolerances within the health system.

To maximize appropriate reliance (![][image1]) without pushing the user into the dangerous territory of over-trust (where reliance exceeds actual capability, or ![][image5]), the UI must provide highly effective, clinically resonant explanations (![][image6]) that do not impose heavy cognitive burdens. The goal is to achieve an intersection of high system trustworthiness and accurate user trust, avoiding the "trustwashing" that occurs when polished UI design masks underlying algorithmic fragility.6

### **NASA-TLX Baseline Constraints and Cognitive Load Mitigation**

The introduction of robust explainability mechanisms inherently risks overloading the clinician with information, paradoxically reducing the safety of the system by inducing cognitive fatigue.12 The NASA-TLX, developed in the 1980s by the Human Performance Group at NASA Ames Research Center, provides a validated, multidimensional framework for quantifying this subjective workload across high-stakes tasks.12 The proposed UI components must maintain or actively reduce the workload across all six NASA-TLX dimensions compared to baseline unassisted EHR workflows.11

Clinical studies utilizing eye-tracking technology and blink-rate analysis have demonstrated a direct correlation between poorly designed EHR interfaces and dangerously high NASA-TLX scores, leading to missed abnormal test results and diagnostic errors.13 An effective AI UI must act as a cognitive co-pilot, driving these scores downward.

| NASA-TLX Dimension | Clinical Workflow Definition | UI Architectural Mitigation Strategy |
| :---- | :---- | :---- |
| **Mental Demand** | The cognitive effort required to synthesize patient history, lab results, and differential diagnoses. | Pre-computation of data; presenting a synthesized, highly scannable **Summary** layer first, hiding raw data until requested.11 |
| **Physical Demand** | The physical effort (clicks, scrolling, typing) required to navigate the EHR and document care. | Implementation of an **Autolaunchable App-Link** via CDS Hooks; eliminating context-switching and minimizing manual search queries.30 |
| **Temporal Demand** | The time pressure experienced during a standard 15-minute patient encounter. | Sub-1.5 second UI rendering within Epic Hyperdrive; **Progressive Disclosure** to hide complex data unless explicitly needed.11 |
| **Performance** | The clinician's perceived success in accurately diagnosing and treating the patient safely. | **Linked Evidence** highlighting, providing immediate visual confirmation of AI accuracy and boosting clinical confidence.11 |
| **Effort** | The total combined mental and physical exertion required to utilize the CDS tool. | Seamless SMART on FHIR OAuth 2.0 token exchange; automated patient context ingestion without manual data entry.11 |
| **Frustration Level** | Irritation stemming from opaque AI logic, software latency, or cumbersome navigation. | **Graceful Error Handling**; explicit communication of uncertainty via the **Confidence** layer, preventing unexpected AI hallucinations.11 |

By strictly adhering to these structural mitigations, the architecture ensures that the addition of deep explainability does not violate the severe time and energy constraints of the modern clinical environment. In empirical assessments, ambient AI platforms leveraging similar linked-evidence paradigms have demonstrated a 61% reduction in cognitive burden and a 73% reduction in after-hours documentation, underscoring the efficacy of this approach.37

## **The Four-Layer Explanation Architecture**

To operationalize the mathematical requirements of calibrated trust and the ergonomic constraints of the NASA-TLX, the user interface is constructed upon a deterministic, four-layer explanation architecture.39 This structural pattern moves the clinician sequentially from high-level, actionable synthesis down to granular, foundational data lineage. It treats verifiable provenance not merely as a cosmetic UI feature, but as a core architectural constraint embedded directly into the inference chain.8

### **Layer 1: Summary (The Clinical Synthesis)**

The primary interface layer provides the actionable clinical synthesis. This layer must be hyper-concise and immediately readable within the narrow constraints of an Epic Hyperdrive sidebar. It presents the AI's primary output—whether that takes the form of a drafted clinical note in the Subjective, Objective, Assessment, and Plan (SOAP) format, a diagnostic suggestion, or a longitudinal risk prediction.10

The fundamental design mandate at this layer is clarity and brevity. The summary acts as the entry point, allowing the clinician to rapidly parse the system's recommendation without immediate exposure to the underlying mathematical complexity or sprawling source texts. It transforms raw data into clinical reasoning, facilitating shared decision-making without overwhelming the user.21

### **Layer 2: Evidence (The Traceable Grounding)**

Clinical decisions demand absolute reliability, context, and accountability; they must be grounded in peer-reviewed evidence and specific, verifiable patient data, rather than probabilistic text generation.7 Layer 2 introduces the "Linked Evidence" design pattern, an approach pioneered by enterprise ambient AI platforms to solve the black-box trust problem.9

When a clinician interacts with a specific claim in the Summary layer, the UI dynamically retrieves and highlights the exact source material that generated that claim.9 If the generative AI produces a sentence in a clinical note stating, "Patient reports sharp pain in the lower left quadrant," the Evidence layer physically links this text to the corresponding timestamp in an ambient audio transcript, or to a specific row in a historical lab report.44

This mechanism provides immediate, low-friction verification. It allows clinicians to trust the output because they can instantly verify its accuracy without having to re-read an entire clinical history or listen to a full 15-minute audio recording.46 By enforcing claim-level evidence chains rather than document-level confidence, the architecture dramatically lowers the NASA-TLX Mental Demand and Effort metrics.22

### **Layer 3: Confidence (The Uncertainty Calibration)**

To actively combat automation bias, the system must explicitly and honestly communicate its internal uncertainty.18 Layer 3 visualizes the model's confidence scoring. However, raw probabilistic percentages (e.g., "87% confident") are notoriously difficult for humans to parse in fast-paced scenarios and often create a dangerous illusion of false precision.18

Instead, the UI maps raw probabilities and Expected Calibration Errors (ECE) to clinical actionability using a standardized, intuitive traffic-light framework based on empirical validation.22 This visual cue alerts the clinician to the precise level of scrutiny required before accepting the AI's output.

| Confidence Tier | Probability Range | Visual Signifier | Clinical Interpretation & UI Behavior |
| :---- | :---- | :---- | :---- |
| **High** | **![][image7]** | Green / Subtle | Strong corroboration from multiple sources. One-click acceptance permitted; fast-path workflow enabled.22 |
| **Moderate** | **![][image8]** | Yellow / Warning | Partial evidence gaps or mild contradictions. UI introduces mild friction, requiring explicit expansion and review of Layer 2 Evidence.22 |
| **Low** | **![][image9]** | Red / Alert | High uncertainty, missing data, or conflicting guidelines. UI forces a mandatory manual override or explicit human validation step before proceeding.22 |

### **Layer 4: Provenance (The System Lineage)**

The deepest layer of the architecture is dedicated to system lineage, auditability, and regulatory compliance. As stringent frameworks like the European Union's Artificial Intelligence Act (EU AI Act) and the FDA's Predetermined Change Control Plans (PCCP) mandate strict tracking of AI behavior in high-risk healthcare environments, the UI must provide on-demand access to the data's exact origins.22

The Provenance layer exposes the metadata of the inference pipeline. It details the specific large language model (LLM) version utilized, the exact timestamp of the inference, the clinical guidelines referenced (e.g., specific SNOMED-CT codes, UpToDate articles), and the cryptographic hash of the input data to ensure tamper-evident security.9 While rarely accessed during standard, rapid clinical workflows, its presence is a foundational element of institutional trust. It satisfies the Explainability-Enabled Clinical Safety Framework (ECSF) requirements for post-market surveillance and retrospective incident auditing, treating social responsibility and compliance as first-class engineering requirements.42

## **Epic Hyperdrive UI Component Specifications**

Deploying this advanced four-layer architecture within Epic requires strict adherence to specific technical and visual constraints. Epic has transitioned its primary end-user application from the legacy, COM-based Hyperspace to a modern, web-based framework called Hyperdrive. Hyperdrive is a secure, Epic-specific web browser built on Chromium, meaning modern web technologies (React, HTML5, CSS3) are natively supported and highly performant.52 However, third-party SMART on FHIR applications are typically rendered within iframes positioned in the patient Storyboard or specific right-hand sidebars.35

### **Sidebar Constraints and CSS Ergonomics**

Right-hand sidebars in EHRs are highly constrained spatial environments. The application must support responsive fluid scaling to adapt to various monitor sizes and user preferences. Typical expanded sidebars range from 240px to 300px in width, while collapsed views may shrink to 48px-64px.53 If the UI component exceeds these dimensions, aggressive horizontal scrolling occurs, which severely degrades usability and spikes the NASA-TLX Physical Demand score.

A critical CSS consideration within Epic Hyperdrive iframes involves the handling of the overflow property. Parent containers within the EHR often utilize overflow: hidden to preserve strict grid layouts and prevent rogue applications from breaking the main charting interface. If the embedded SMART app utilizes standard CSS dropdowns, tooltips, or modals that attempt to expand beyond the iframe boundaries, they will be clipped and rendered invisible.55

To circumvent this limitation, the UI components must utilize React Portals to append expansive modals (such as the Layer 4 Provenance data) directly to the DOM root, outside the iframe's hierarchical constraints. For primary interactions (Layer 1 to Layer 2), the UI must utilize inline accordion-style progressive disclosure, shifting content vertically rather than horizontally, to ensure all text remains visible within the established 300px maximum width.

### **Figma-Style Design Token Specification**

The following tables define the strict design tokens and component anatomy for the Calibrated Trust UI. These specifications are optimized for high-density clinical displays, prioritizing scannability and reducing visual noise.

| Token Category | Property | Value | Rationale for Clinical UI Application |
| :---- | :---- | :---- | :---- |
| **Typography** | Font Family | System sans-serif (Inter, Segoe UI) | Maximizes legibility on standard, varying-quality hospital-issued monitors. |
| **Typography** | Base Size | 13px (text-sm) | Balances deep data density with readability in 300px constrained sidebars. |
| **Typography** | Line Height | 1.4 | Tighter than standard web prose to fit more clinical data in the immediate viewport. |
| **Color: Surfaces** | Background | \#FFFFFF | Ensures high contrast for primary text. |
| **Color: Surfaces** | Card Background | \#F8FAFC (Slate 50\) | Creates subtle visual grouping without relying on heavy, distracting borders. |
| **Color: Confidence** | High (Green) | \#10B981 (Emerald 500\) | Indicates safety; passes WCAG AA contrast guidelines against white backgrounds. |
| **Color: Confidence** | Mod (Yellow) | \#F59E0B (Amber 500\) | Draws immediate attention to potential uncertainty without indicating total failure. |
| **Color: Confidence** | Low (Red) | \#EF4444 (Red 500\) | Signals critical review required; triggers mandatory friction in the workflow. |
| **Color: Evidence** | Highlight Anchor | \#DBEAFE (Blue 100\) | A soft, non-alarming highlight for Layer 2 Linked Evidence tracing, matching clinical hyperlink patterns. |
| **Layout** | Max Width | 100% (Fluid to 300px) | Prevents horizontal scrolling within the Epic iframe container.57 |
| **Layout** | Padding Base | 12px | Tight padding suitable for enterprise data density requirements. |

### **Component Anatomy: The Linked Evidence Card**

The core interaction module is the LinkedEvidenceCard. This component visually embodies the progressive disclosure of the four architectural layers, ensuring the clinician is never overwhelmed with data they have not explicitly requested.

1. **Default State (Layer 1 & 3):** Displays the synthesized text (e.g., a drafted diagnostic assessment). A small, colored badge sits in the top right corner indicating the Confidence level (e.g., a yellow badge reading "82% \- Review Advised").  
2. **Hover State:** Hovering over specific sentences in the summary reveals subtle underlines or background shifts, indicating that underlying Linked Evidence is available for that specific claim.  
3. **Active/Clicked State (Layer 2):** Clicking a sentence smoothly expands an inline accordion directly beneath the text. This accordion displays the verbatim transcript, medical guideline, or lab value that directly informed the sentence, highlighted in \#DBEAFE.  
4. **Provenance Trigger (Layer 4):** A subtle, universally recognized info-icon (ℹ️) at the bottom of the card opens a modal (via a React Portal) detailing the Retrieval-Augmented Generation (RAG) lineage, the exact LLM model version, and cryptographic timestamps.8

## **React and Tailwind Code Implementation**

The following code skeleton demonstrates the practical implementation of the four-layer architecture using React and Tailwind CSS. It is explicitly engineered to function flawlessly within an Epic Hyperdrive iframe, utilizing dynamic widths, avoiding overflow: hidden clipping issues through Portals, and managing state for fluid progressive disclosure.

JavaScript

import React, { useState, useEffect } from 'react';  
import { createPortal } from 'react-dom';

// \--- Layer 4: Provenance Modal \---  
// Utilizes React Portal to append directly to document.body.  
// This is critical to escape the strict \`overflow: hidden\` boundaries   
// commonly applied to Epic Hyperdrive sidebars.  
const ProvenanceModal \= ({ isOpen, onClose, metadata }) \=\> {  
  if (\!isOpen) return null;  
  return createPortal(  
    \<div className\="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"\>  
      \<div className\="bg-white rounded-md shadow-xl p-4 w-full max-w-sm text-sm"\>  
        \<h3 className\="font-bold text-gray-800 mb-2 border-b pb-1"\>System Provenance & Audit Trail\</h3\>  
        \<table className\="w-full text-left text-xs mb-4"\>  
          \<tbody\>  
            \<tr\>\<th className\="py-1 text-gray-500 font-medium"\>Model Engine:\</th\>\<td\>{metadata.modelId}\</td\>\</tr\>  
            \<tr\>\<th className\="py-1 text-gray-500 font-medium"\>Inference Time:\</th\>\<td\>{metadata.timestamp}\</td\>\</tr\>  
            \<tr\>\<th className\="py-1 text-gray-500 font-medium"\>Data Source:\</th\>\<td\>{metadata.sourceSystem}\</td\>\</tr\>  
            \<tr\>\<th className\="py-1 text-gray-500 font-medium"\>Crypto Hash:\</th\>\<td className\="font-mono text-\[10px\] break-all"\>{metadata.dataHash}\</td\>\</tr\>  
          \</tbody\>  
        \</table\>  
        \<button   
          onClick\={onClose}  
          className\="w-full bg-blue-600 text-white rounded py-1.5 font-medium hover:bg-blue-700 transition-colors"  
        \>  
          Acknowledge & Close  
        \</button\>  
      \</div\>  
    \</div\>,  
    document.body   
  );  
};

// \--- Layers 1, 2, & 3: Summary, Evidence, and Confidence \---  
const LinkedEvidenceCard \= ({ summary, evidenceText, confidenceScore, metadata }) \=\> {  
  const \[isEvidenceExpanded, setIsEvidenceExpanded\] \= useState(false);  
  const \[isProvenanceOpen, setIsProvenanceOpen\] \= useState(false);

  // Confidence mapping based on the empirical Traffic Light Framework  
  const getConfidenceConfig \= (score) \=\> {  
    if (score \>= 0.95) return { color: 'bg-emerald-100 text-emerald-800', label: 'High Confidence', border: 'border-emerald-200' };  
    if (score \>= 0.80) return { color: 'bg-amber-100 text-amber-800', label: 'Review Advised', border: 'border-amber-200' };  
    return { color: 'bg-red-100 text-red-800', label: 'Manual Validation Required', border: 'border-red-200' };  
  };

  const config \= getConfidenceConfig(confidenceScore);

  return (  
    \<div className\={\`flex flex-col bg-slate-50 border ${config.border} rounded-md mb-3 shadow-sm w-full max-w-\[300px\]\`}\>  
        
      {/\* Header containing Layer 3: Confidence calibration \*/}  
      \<div className\="flex justify-between items-center px-3 py-2 border-b border-slate-200 bg-white rounded-t-md"\>  
        \<span className\="text-xs font-semibold text-slate-700 tracking-tight"\>Clinical Synthesis\</span\>  
        \<span className\={\`text-\[10px\] font-bold px-2 py-0.5 rounded-full ${config.color}\`}\>  
          {config.label} ({(confidenceScore \* 100).toFixed(0)}%)  
        \</span\>  
      \</div\>

      {/\* Body containing Layer 1: Summary with interactive hooks for progressive disclosure \*/}  
      \<div className\="p-3 text-\[13px\] leading-snug text-slate-800"\>  
        \<p   
          className\="cursor-pointer hover:bg-blue-50 transition-colors rounded px-1 \-mx-1"  
          onClick\={() \=\> setIsEvidenceExpanded(\!isEvidenceExpanded)}  
          title="Click to view source evidence"  
        \>  
          {summary}  
        \</p\>  
      \</div\>

      {/\* Inline Accordion containing Layer 2: Linked Evidence grounding \*/}  
      {/\* Utilizes vertical expansion to avoid horizontal scrolling in the sidebar \*/}  
      {isEvidenceExpanded && (  
        \<div className\="px-3 pb-3 pt-1 bg-white border-t border-slate-100 text-xs text-slate-600 animate-fade-in transition-all"\>  
          \<div className\="flex items-center gap-1 mb-1 text-slate-400 font-medium tracking-wide text-\[10px\] uppercase"\>  
            \<svg className\="w-3 h-3" fill\="currentColor" viewBox\="0 0 20 20"\>\<path d\="M10 12a2 2 0 100-4 2 2 0 000 4z"/\>\<path fillRule\="evenodd" d\="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule\="evenodd"/\>\</svg\>  
            Source Transcript Match  
          \</div\>  
          \<p className\="bg-blue-50 p-2 rounded border border-blue-100 leading-relaxed italic"\>  
            "...patient states they have been experiencing \<mark className\="bg-blue-200 text-blue-900 font-medium px-0.5 rounded not-italic"\>{evidenceText}\</mark\> for the past three days..."  
          \</p\>  
        \</div\>  
      )}

      {/\* Footer containing Layer 4 Trigger for Auditability \*/}  
      \<div className\="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex justify-end rounded-b-md"\>  
        \<button   
          onClick\={() \=\> setIsProvenanceOpen(true)}  
          className="text-\[10px\] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"  
        \>  
          \<span\>ℹ️\</span\> View Provenance  
        \</button\>  
      \</div\>

      \<ProvenanceModal   
        isOpen\={isProvenanceOpen}   
        onClose\={() \=\> setIsProvenanceOpen(false)}   
        metadata={metadata}   
      /\>  
    \</div\>  
  );  
};

export default function EpicSidebarApp() {  
  // Mock payload representing data received and hydrated after FHIR context initialization  
  const mockData \= {  
    summary: "Patient presents with acute lower left quadrant abdominal pain, duration 3 days.",  
    evidenceText: "sharp pain in my lower left side",  
    confidenceScore: 0.88, // Triggers the Yellow 'Review Advised' state  
    metadata: {  
      modelId: "med-instruct-v4.2-q8",  
      timestamp: "2026-03-30T14:32:01Z",  
      sourceSystem: "Ambient Audio Capture \- Room 4",  
      dataHash: "a9f3e1b7c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9"  
    }  
  };

  return (  
    // box-border and w-full constraints ensure the app respects Epic's iframe boundaries  
    \<div className\="w-full min-h-screen bg-white p-2 box-border font-sans"\>  
      \<LinkedEvidenceCard {...mockData} /\>  
    \</div\>  
  );  
}

## **Epic Hyperdrive and SMART on FHIR Context Integration**

To populate the aforementioned UI with accurate, real-time patient data, the application must securely establish context within the Epic Hyperdrive environment. Epic has deprecated legacy COM-based integrations in favor of modern web standards, making SMART on FHIR the definitive, industry-standard mechanism for rendering embedded clinical applications.52

### **The OAuth 2.0 Authorization Code Flow with PKCE**

When the clinician accesses the Epic Storyboard and the application is triggered, Epic initiates an "EHR Launch." The application must securely retrieve the context—identifying the current patient, the active provider, and the specific encounter—without forcing the clinician to manually search for the patient. Manual searches within an embedded app would severely violate the NASA-TLX Effort and Temporal Demand baselines, adding unnecessary friction to the workflow.

The secure launch sequence operates through the following precisely orchestrated phases 35:

1. **Launch Invocation:** Epic Hyperdrive opens the application's registered launch\_url inside the sidebar iframe, appending a secure, short-lived launch parameter and the iss parameter (the FHIR server base URL) to the query string.  
2. **Discovery:** The React application extracts the iss URL and queries it at /.well-known/smart-configuration to dynamically discover Epic's specific OAuth 2.0 authorization and token endpoints.  
3. **Authorization Request:** The app redirects the iframe browser to Epic's authorization endpoint. It passes the launch parameter, a dynamically generated Proof Key for Code Exchange (PKCE) challenge, and the required scopes. Essential scopes typically include launch (to receive the context), openid fhirUser (for identity), and specific clinical scopes like patient/Observation.read or patient/Condition.read.59  
4. **Token Exchange:** Because the clinician is already authenticated within the Hyperdrive client, Epic silently processes the authorization request and redirects back to the application with an authorization code. The application immediately executes a backend POST request to the token endpoint to exchange this code for a secure access token.  
5. **Context Retrieval:** The resulting JSON payload from the token endpoint contains the access token, alongside explicit context variables—most notably the patient (Patient FHIR ID) and encounter (Encounter FHIR ID) parameters.32  
6. **Data Hydration:** Armed with the active token and the specific patientId, the application makes RESTful GET requests to the Epic FHIR API (e.g., GET /Patient/{patientId}/Condition) to hydrate the local state and feed the AI summary algorithms.60

It is also critical to note that Epic enforce stringent security protocols for backend services interacting with these APIs. For integrations operating in the background, Epic requires apps to host their public keys at a JWK Set URL (JKU) rather than relying on static key uploads, a mandate enforcing cryptographic rotation and enhanced security.32

By strictly adhering to this SMART on FHIR flow, the UI initializes entirely in the background. From the clinician's perspective, the sidebar simply opens and instantly displays the Layer 1 Summary, preserving total workflow continuity and establishing immediate trust.

## **CDS Hooks Integration: Autolaunchable App-Link Cards**

While a user can manually open a SMART on FHIR app from a dedicated button in the Epic menu, proactive and intelligent clinical decision support requires the system to present information *at the exact moment* of clinical relevance. This active intervention is achieved via HL7 CDS Hooks.

CDS Hooks allows the Epic EHR to issue a secure web-hook to an external service when specific workflow events occur, such as patient-view (opening a chart) or order-select (drafting a prescription).60 The external CDS service rapidly analyzes the provided FHIR data context and returns a JSON payload containing actionable "cards."

Traditionally, a CDS card presents a brief text summary and a button that a user must physically click to launch an external app. However, to absolutely minimize physical demand (reducing unnecessary clicks) and streamline the user experience to meet our stringent NASA-TLX baseline, this architecture utilizes the highly specific autolaunchable attribute. Introduced to the CDS Hooks specification to optimize user experience, this attribute is fully supported in modern Epic environments.30

When a CDS service returns a card containing a link with autolaunchable: true, Epic Hyperdrive bypasses the manual card rendering entirely. Instead, it automatically executes the SMART on FHIR EHR launch sequence described in the previous section, seamlessly opening the React application directly in the sidebar without requiring any user intervention.30

### **Example JSON Payload for an Autolaunchable CDS Hook**

The following represents the exact JSON response structure that the external CDS service must return to Epic to trigger the automated rendering of the Calibrated Trust UI framework.

JSON

{  
  "cards":  
    }  
  \]  
}

### **Architectural Breakdown of the Payload**

The success of the automated launch relies on the precise configuration of several payload attributes:

* **indicator: "info"** \- Because the card is bypassed in favor of the autolaunch, the indicator is deliberately kept as informational. This prevents unnecessary background alerting logic or warning sounds from triggering within Epic.30  
* **type: "smart"** \- This attribute explicitly informs Epic that the destination URL expects a full SMART on FHIR EHR launch sequence. Consequently, Epic generates a launch token and appends it to the URL prior to executing the iframe render.64  
* **appContext** \- A powerful, optional string parameter that is passed intact to the React application. In this architecture, it is utilized to route the React application directly to the specific UI state needed (e.g., action=review\_ambient\_notes). This allows the app to bypass general navigation menus and open directly to the LinkedEvidenceCard for the current encounter.30  
* **autolaunchable: true** \- The critical boolean flag that instructs Epic Hyperdrive to automatically render the sidebar application, eliminating the physical click requirement, driving down NASA-TLX Physical Demand, and maintaining workflow fluidity.30

## **Synthesizing Trust, Ergonomics, and Engineering**

The successful deployment of advanced clinical decision support within complex, high-velocity EHR environments like Epic Hyperdrive is fundamentally an exercise in cognitive engineering. Raw algorithmic accuracy is entirely insufficient if the delivery mechanism induces automation bias through opaque design, or frustrates the clinician through cumbersome navigation.

By systematically adhering to the four-layer explanation architecture—Summary, Evidence, Confidence, and Provenance—clinical AI systems can transition from being perceived as opaque oracles to transparent, collaborative tools. The UI component set outlined in this report leverages progressive disclosure and Abridge-style Linked Evidence to provide immediate, context-rich grounding, directly combating algorithmic aversion. Furthermore, by rendering these components within a highly responsive React and Tailwind framework explicitly tailored for Hyperdrive iframe constraints, and triggering them silently via autolaunchable CDS Hooks and SMART on FHIR protocols, the architecture guarantees that the clinician is provided with maximum transparency while incurring zero additional cognitive or physical load.

The ultimate result is a highly compliant, regulatory-ready system that actively cultivates and sustains calibrated trust, ensuring that artificial intelligence serves to augment, rather than obscure, human clinical judgment.

#### **Works cited**

1. From Trust in Automation to Trust in AI in Healthcare: A 30-Year Longitudinal Review and an Interdisciplinary Framework \- MDPI, accessed March 30, 2026, [https://www.mdpi.com/2306-5354/12/10/1070](https://www.mdpi.com/2306-5354/12/10/1070)  
2. Don't build trust with AI, calibrate it | by Irina Nik | UX Collective, accessed March 30, 2026, [https://uxdesign.cc/dont-build-trust-with-ai-calibrate-it-2889a5740e16](https://uxdesign.cc/dont-build-trust-with-ai-calibrate-it-2889a5740e16)  
3. Toward a science of human–AI teaming for decision making: A complementarity framework | PNAS Nexus | Oxford Academic, accessed March 30, 2026, [https://academic.oup.com/pnasnexus/article/5/3/pgag030/8490283](https://academic.oup.com/pnasnexus/article/5/3/pgag030/8490283)  
4. Measuring trust in artificial intelligence: validation of an established scale and its short form, accessed March 30, 2026, [https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1582880/full](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1582880/full)  
5. Cognitive alignment in cardiovascular AI: designing predictive models that think with, not just for, clinicians \- Frontiers, accessed March 30, 2026, [https://www.frontiersin.org/journals/cardiovascular-medicine/articles/10.3389/fcvm.2025.1651324/full](https://www.frontiersin.org/journals/cardiovascular-medicine/articles/10.3389/fcvm.2025.1651324/full)  
6. Designing trustworthy machine learning systems \- CSIRO, accessed March 30, 2026, [https://www.csiro.au/en/news/All/Articles/2020/November/designing-trustworthy-machine-learning-systems](https://www.csiro.au/en/news/All/Articles/2020/November/designing-trustworthy-machine-learning-systems)  
7. From evidence to AI: Why provenance matters in clinical decision support | Wolters Kluwer, accessed March 30, 2026, [https://www.wolterskluwer.com/en-gb/expert-insights/from-evidence-to-ai-why-provenance-matters-in-clinical-decision-support](https://www.wolterskluwer.com/en-gb/expert-insights/from-evidence-to-ai-why-provenance-matters-in-clinical-decision-support)  
8. An auditable and source-verified framework for clinical AI decision support: integrating retrieval-augmented generation with data provenance \- PMC, accessed March 30, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC12913532/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12913532/)  
9. An auditable and source-verified framework for clinical AI decision support: integrating retrieval-augmented generation with data provenance \- Frontiers, accessed March 30, 2026, [https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1737532/full](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1737532/full)  
10. How to make an AI Voice Medical Scribe App Like Abridge \- Idea Usher, accessed March 30, 2026, [https://ideausher.com/blog/app-like-abridge-development/](https://ideausher.com/blog/app-like-abridge-development/)  
11. NASA Task Load Index | Digital Healthcare Research, accessed March 30, 2026, [https://digital.ahrq.gov/health-it-tools-and-resources/evaluation-resources/workflow-assessment-health-it-toolkit/all-workflow-tools/nasa-task-load-index](https://digital.ahrq.gov/health-it-tools-and-resources/evaluation-resources/workflow-assessment-health-it-toolkit/all-workflow-tools/nasa-task-load-index)  
12. Understanding the NASA-TLX: How Measuring Task Load Can Improve UX Design, accessed March 30, 2026, [https://medium.com/@fs.sheikhahmadi/understanding-the-nasa-tlx-how-measuring-task-load-can-improve-ux-design-94bb2ad66b88](https://medium.com/@fs.sheikhahmadi/understanding-the-nasa-tlx-how-measuring-task-load-can-improve-ux-design-94bb2ad66b88)  
13. Association of the Usability of Electronic Health Records With Cognitive Workload and Performance Levels Among Physicians \- PMC, accessed March 30, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC6450327/](https://pmc.ncbi.nlm.nih.gov/articles/PMC6450327/)  
14. Between map and maze: reframing trust in healthcare AI | springerprofessional.de, accessed March 30, 2026, [https://www.springerprofessional.de/between-map-and-maze-reframing-trust-in-healthcare-ai/52218684](https://www.springerprofessional.de/between-map-and-maze-reframing-trust-in-healthcare-ai/52218684)  
15. Trust by Design: An Ethical Framework for Collaborative Intelligence Systems in Industry 5.0, accessed March 30, 2026, [https://www.mdpi.com/2079-9292/14/10/1952](https://www.mdpi.com/2079-9292/14/10/1952)  
16. How the different explanation classes impact trust calibration \- Bournemouth University, accessed March 30, 2026, [https://eprints.bournemouth.ac.uk/37728/1/1-s2.0-S1071581922001616-main.pdf](https://eprints.bournemouth.ac.uk/37728/1/1-s2.0-S1071581922001616-main.pdf)  
17. Explainable recommendations and calibrated trust – Research protocol, accessed March 30, 2026, [https://eprints.bournemouth.ac.uk/35306/1/Research%20Protocol.pdf](https://eprints.bournemouth.ac.uk/35306/1/Research%20Protocol.pdf)  
18. Calibrated Trust in AI Products: Where Should Users Lean? | by Hamed Sattarian \- Medium, accessed March 30, 2026, [https://medium.com/@hamedsattarian/calibrated-trust-in-ai-products-where-should-users-lean-bf5ec1d8034a](https://medium.com/@hamedsattarian/calibrated-trust-in-ai-products-where-should-users-lean-bf5ec1d8034a)  
19. C-XAI: Design Method for Explainable AI Interfaces to Enhance Trust Calibration Mohammad Naiseh \- Bournemouth University, accessed March 30, 2026, [https://eprints.bournemouth.ac.uk/36345/1/NAISEH%2C%20Mohammad\_Ph.D.\_2021.pdf](https://eprints.bournemouth.ac.uk/36345/1/NAISEH%2C%20Mohammad_Ph.D._2021.pdf)  
20. arXiv:2505.20305v1 \[cs.CY\] 18 May 2025, accessed March 30, 2026, [https://arxiv.org/pdf/2505.20305](https://arxiv.org/pdf/2505.20305)  
21. AI-Supported Shared Decision-Making (AI-SDM): Conceptual Framework, accessed March 30, 2026, [https://ai.jmir.org/2025/1/e75866](https://ai.jmir.org/2025/1/e75866)  
22. LLM Explainability for Healthcare: Making AI Reasoning Visible to Clinicians and the FDA, accessed March 30, 2026, [https://nirmitee.io/blog/llm-explainability-healthcare-clinicians-fda-2026/](https://nirmitee.io/blog/llm-explainability-healthcare-clinicians-fda-2026/)  
23. JAI | Free Full-Text | Calibrating Trust in Generative Artificial Intelligence: A Human-Centered Testing Framework with Adaptive Explainability, accessed March 30, 2026, [https://www.techscience.com/jai/v7n1/64684/html](https://www.techscience.com/jai/v7n1/64684/html)  
24. (PDF) From Trust in Automation to Trust in AI in Healthcare: A 30-Year Longitudinal Review and an Interdisciplinary Framework \- ResearchGate, accessed March 30, 2026, [https://www.researchgate.net/publication/396117014\_From\_Trust\_in\_Automation\_to\_Trust\_in\_AI\_in\_Healthcare\_A\_30-Year\_Longitudinal\_Review\_and\_an\_Interdisciplinary\_Framework](https://www.researchgate.net/publication/396117014_From_Trust_in_Automation_to_Trust_in_AI_in_Healthcare_A_30-Year_Longitudinal_Review_and_an_Interdisciplinary_Framework)  
25. The Psychology Of Trust In AI: A Guide To Measuring And Designing For User Confidence, accessed March 30, 2026, [https://www.smashingmagazine.com/2025/09/psychology-trust-ai-guide-measuring-designing-user-confidence/](https://www.smashingmagazine.com/2025/09/psychology-trust-ai-guide-measuring-designing-user-confidence/)  
26. AI-ENHANCED BUSINESS INTELLIGENCE DASHBOARDS FOR PREDICTIVE MARKET STRATEGY IN U.S. ENTERPRISES, accessed March 30, 2026, [https://ijbei-journal.org/index.php/ijbei/article/download/36/36/37](https://ijbei-journal.org/index.php/ijbei/article/download/36/36/37)  
27. NASA TLX (Task Load Index) \- UX test tools, accessed March 30, 2026, [https://www.uxtesttools.com/tools/nasa-tlx](https://www.uxtesttools.com/tools/nasa-tlx)  
28. NASA Task Load Index, accessed March 30, 2026, [https://humansystems.arc.nasa.gov/groups/tlx/downloads/TLXScale.pdf](https://humansystems.arc.nasa.gov/groups/tlx/downloads/TLXScale.pdf)  
29. Workload Assessment of Operators: Correlation Between NASA-TLX and Pupillary Responses \- MDPI, accessed March 30, 2026, [https://www.mdpi.com/2076-3417/14/24/11975](https://www.mdpi.com/2076-3417/14/24/11975)  
30. Current \- CDS Hooks, accessed March 30, 2026, [https://cds-hooks.org/specification/current/](https://cds-hooks.org/specification/current/)  
31. CDS Hooks \- A technology that complements SMART Apps \- Health Compiler, accessed March 30, 2026, [https://www.healthcompiler.com/cds-hooksa-technology-that-complements-smart-apps](https://www.healthcompiler.com/cds-hooksa-technology-that-complements-smart-apps)  
32. Documentation \- Epic on FHIR, accessed March 30, 2026, [https://fhir.epic.com/Documentation?docId=oauth2](https://fhir.epic.com/Documentation?docId=oauth2)  
33. OpenNotes and Abridge Partner to Research and Evaluate AI-Generated Visit Summaries, accessed March 30, 2026, [https://www.opennotes.org/news/opennotes-and-abridge-partner-to-research-and-evaluate-ai-generated-visit-summaries/](https://www.opennotes.org/news/opennotes-and-abridge-partner-to-research-and-evaluate-ai-generated-visit-summaries/)  
34. Verify a Note With Linked Evidence \- Abridge, accessed March 30, 2026, [https://support.abridge.com/hc/en-us/articles/30235128433811-Verify-a-Note-With-Linked-Evidence](https://support.abridge.com/hc/en-us/articles/30235128433811-Verify-a-Note-With-Linked-Evidence)  
35. Epic on FHIR Integration, or How to Enhance Interoperability in the Medical Sector \- SPsoft, accessed March 30, 2026, [https://spsoft.com/tech-insights/epic-on-fhir-integration-in-healthcare/](https://spsoft.com/tech-insights/epic-on-fhir-integration-in-healthcare/)  
36. How to Register, Authenticate & Launch Apps with Epic's FHIR APIs \- 6B, accessed March 30, 2026, [https://6b.health/insight/how-to-register-authenticate-launch-apps-with-epics-fhir-apis/](https://6b.health/insight/how-to-register-authenticate-launch-apps-with-epics-fhir-apis/)  
37. Report: Abridge Business Breakdown & Founding Story | Contrary Research, accessed March 30, 2026, [https://research.contrary.com/company/abridge](https://research.contrary.com/company/abridge)  
38. Title Enhancing Clinical Documentation Workflow with Ambient Artificial Intelligence: Clinician Perspectives on Work Burden, Bu \- medRxiv, accessed March 30, 2026, [https://www.medrxiv.org/content/10.1101/2024.08.12.24311883v2.full.pdf](https://www.medrxiv.org/content/10.1101/2024.08.12.24311883v2.full.pdf)  
39. A Trust-Aware Architecture for Personalized Digital Health: Integrating Blueprint Personas and Ontology-Based Reasoning \- PMC, accessed March 30, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC12496277/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12496277/)  
40. Clinical MLOps: A Framework for Responsible Deployment and Observability of AI Systems in Cloud- Native Healthcare Platforms \- Preprints.org, accessed March 30, 2026, [https://www.preprints.org/frontend/manuscript/d81c70d5551b3bc5fbb2ad513fa76a8c/download\_pub](https://www.preprints.org/frontend/manuscript/d81c70d5551b3bc5fbb2ad513fa76a8c/download_pub)  
41. From Sensing to Sense-Making: A Framework for On-Person Intelligence with Wearable Biosensors and Edge LLMs \- MDPI, accessed March 30, 2026, [https://www.mdpi.com/1424-8220/26/7/2034](https://www.mdpi.com/1424-8220/26/7/2034)  
42. The Social Responsibility Stack: A Control-Theoretic Architecture for Governing Socio-Technical AI \- arXiv, accessed March 30, 2026, [https://arxiv.org/html/2512.16873v1](https://arxiv.org/html/2512.16873v1)  
43. AI Medical Records Summary: Enhancing Clinical Efficiency \- Topflight Apps, accessed March 30, 2026, [https://topflightapps.com/ideas/ai-medical-record-summary/](https://topflightapps.com/ideas/ai-medical-record-summary/)  
44. Generative AI Platform for Clinical Conversations \- Abridge, accessed March 30, 2026, [https://www.abridge.com/product](https://www.abridge.com/product)  
45. Healthcare AI News with ScienceSoft's Expert Analysis, accessed March 30, 2026, [https://www.scnsoft.com/healthcare/artificial-intelligence-news](https://www.scnsoft.com/healthcare/artificial-intelligence-news)  
46. Abridge AI Review 2026 — Pros, Cons & Who It's Best For | DeepCura Resources, accessed March 30, 2026, [https://www.deepcura.com/resources/abridge-ai-review](https://www.deepcura.com/resources/abridge-ai-review)  
47. Best AI Scribe Tools: Your Industry-Specific Buying Guide for 2026 \- CoVet, accessed March 30, 2026, [https://www.co.vet/post/best-ai-scribe](https://www.co.vet/post/best-ai-scribe)  
48. Metrics that Make Mankind to trust Machines \- QAF Lab India, accessed March 30, 2026, [https://qli.org.in/metrics-that-make-mankind-to-trust-machines/](https://qli.org.in/metrics-that-make-mankind-to-trust-machines/)  
49. A validated framework for responsible AI in healthcare autonomous systems \- PMC \- NIH, accessed March 30, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC12738763/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12738763/)  
50. Provenance-Aware Explainable Digital Twin for Personalized Health Management \- medRxiv, accessed March 30, 2026, [https://www.medrxiv.org/content/10.64898/2025.12.03.25339981v1.full.pdf](https://www.medrxiv.org/content/10.64898/2025.12.03.25339981v1.full.pdf)  
51. Embedding Explainable AI in NHS Clinical Safety: The Explainability-Enabled Clinical Safety Framework(ECSF) \- arXiv, accessed March 30, 2026, [https://arxiv.org/html/2511.11590v1](https://arxiv.org/html/2511.11590v1)  
52. Hyperdrive \- open.epic, accessed March 30, 2026, [https://open.epic.com/Hyperdrive](https://open.epic.com/Hyperdrive)  
53. Best UX Practices for Designing a Sidebar | by Dmitry Sergushkin | UX Planet, accessed March 30, 2026, [https://uxplanet.org/best-ux-practices-for-designing-a-sidebar-9174ee0ecaa2](https://uxplanet.org/best-ux-practices-for-designing-a-sidebar-9174ee0ecaa2)  
54. Sidebar Width (Need Quick Help) – GeneratePress, accessed March 30, 2026, [https://generatepress.com/forums/topic/sidebar-width-need-quick-help/](https://generatepress.com/forums/topic/sidebar-width-need-quick-help/)  
55. Overriding CSS properties for iframe width \- Stack Overflow, accessed March 30, 2026, [https://stackoverflow.com/questions/19669622/overriding-css-properties-for-iframe-width](https://stackoverflow.com/questions/19669622/overriding-css-properties-for-iframe-width)  
56. Semantic UI Sidebar pushes elements outside of screen width \- Stack Overflow, accessed March 30, 2026, [https://stackoverflow.com/questions/44666515/semantic-ui-sidebar-pushes-elements-outside-of-screen-width](https://stackoverflow.com/questions/44666515/semantic-ui-sidebar-pushes-elements-outside-of-screen-width)  
57. How do I set the content and sidebar widths? \- GeneratePress, accessed March 30, 2026, [https://generatepress.com/forums/topic/how-do-i-set-the-content-and-sidebar-widths/](https://generatepress.com/forums/topic/how-do-i-set-the-content-and-sidebar-widths/)  
58. What design guidelines should I follow when creating embedded apps?, accessed March 30, 2026, [https://support.thinkific.dev/hc/en-us/articles/9867672880151-What-design-guidelines-should-I-follow-when-creating-embedded-apps](https://support.thinkific.dev/hc/en-us/articles/9867672880151-What-design-guidelines-should-I-follow-when-creating-embedded-apps)  
59. SMART on FHIR App Development Tutorial | Guide \- Taction Software, accessed March 30, 2026, [https://www.tactionsoft.com/blog/smart-on-fhir-app-development-tutorial/](https://www.tactionsoft.com/blog/smart-on-fhir-app-development-tutorial/)  
60. SMART on FHIR: Guide to CDS Hooks & Coverage Resource | IntuitionLabs, accessed March 30, 2026, [https://intuitionlabs.ai/articles/smart-on-fhir-cds-hooks-coverage-guide](https://intuitionlabs.ai/articles/smart-on-fhir-cds-hooks-coverage-guide)  
61. Launch and Authorization \- SMART App Launch v2.2.0 \- FHIR specification, accessed March 30, 2026, [https://build.fhir.org/ig/HL7/smart-app-launch/app-launch.html](https://build.fhir.org/ig/HL7/smart-app-launch/app-launch.html)  
62. CDS Hooks, accessed March 30, 2026, [https://cds-hooks.org/](https://cds-hooks.org/)  
63. HL7 FHIR CDS Hooks \- A Practical Guide \- Medblocks Blog, accessed March 30, 2026, [https://medblocks.com/blog/hl7-cds-hooks-a-practical-guide](https://medblocks.com/blog/hl7-cds-hooks-a-practical-guide)  
64. CDS-hooks-cheat-sheet.pdf, accessed March 30, 2026, [https://fire.ly/wp-content/uploads/2021/02/CDS-hooks-cheat-sheet.pdf](https://fire.ly/wp-content/uploads/2021/02/CDS-hooks-cheat-sheet.pdf)  
65. Home \- CDS Hooks v3.0.0-ballot \- FHIR specification, accessed March 30, 2026, [https://build.fhir.org/ig/HL7/cds-hooks/](https://build.fhir.org/ig/HL7/cds-hooks/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAYCAYAAACMcW/9AAACo0lEQVR4Xu2WTYhOURjH/xo0Qj4jGZEkoiTNYmo0ksVMsvFRimwUygpFWb0lCwuzmBk1iTQsRBps2IjxURZKKLFRWLCzECuF/3+e90znPu89916vj1Lzq18z95w7d55zznOec4Bx/i9m0Em+MUELnUUn+I6/zWZ6GtUDVYBH6KH677lspG/o+4pusj9Lspbeo/N8Rwka1EW6zXcIRT9Ar9Al9Wdxjn6n3fVnLU0XfUvb6215TKE36U7fUZHV9DFd5Dvm06vIjl658gQW1MKofRq9RNuiNo8G9hz23WaYSC/TmmsfXUblRcwa+pleg/1hQAPoo9OjthitxgXYO7/DLthE6f+NsYMujxtgL/6gx1z7HLoP6WSfS1/Srb7D0Uo30C2wb3o0Ue9QnGKjKD+/0U7fUcI62GbTzzymwmb7Gd1L99BHdFX8ElkAC7RwwKn8rIJm6CNd6jtg+X2LPoDV14A2ck/0LPTuCBpXNINm4ysa87MKClQzoRnxHIBVkVANtPya0WFkAxch0JOuPUMqP6uQClRLfgf23Q/0NT1Pt8PKmScEqhTMJezaZvJTpAINm2wEFkQZpUtfJT81GNVK1VMNKq4YGpxmTLs2RuXsIR1y7UKn0WTXFuI47NrHKMtPBXmUHoct53VkP7YSFmjeEVtDY22cDRusXz0dKDrSM9/RjDyln2A5FPxCXyFbajroC9hsK2j9o/jSEZZsf9QW0IbRiXOfnqU3YPcBX8OFAleqpFa1FOVMarYDNRS/MxOWw9r1KWqwQaW+UYqW+Uz0rFlaET2LZbCCrstFM+ikukvX+45fYTEsL1X/DtJTsOX36F7Zi/RRW8RuOojq99gkebnpUV8/EvfKArQat2ET8s9QVTiB/OM0D5UwnURFV8hx/hg/AZRqeEAapHoAAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAiCAYAAADiWIUQAAAGH0lEQVR4Xu3caahtcxjH8UfIPItEdA0vhChxKUPGUCS8UNcrMiSZhwwvjukFRcaUMcoUygvJUO4pJaFEpgwZulHEC/GCiOfXf/3bz3nuOmuvvc+52znb91NP1vqvfc9ae61d++f5r7XNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATsHkeCLby2jAPToj2vVTpnCzl41sOhp3DjfMAAADT4g2v7+apO8PrqtVe++TB5CybbGjbwOv+POiOzwP/se28Ds6DC7St1/VeZ3g9EMZP9Ppnnpq0o2yw76+9NvV6qVl/y8p5GUbX+II8mBxu3YEOAIBlaT2v48K6vkBPaZav8TotbJN9m+pDX8ST8orXRWF9pddJVt7DUtPnvFyaBzqsCstrwrK86/VNGns4rQ+zo9eDeXAM+jufWvn8KMzfO3fzULrGfWgfK/IgAADL2fY2mN7czOsHr92b9Wu9DmqWKwWgvtNOX+aBdegLr73T2IG2NAPbrVa6RV36Hre6SbGj9FFYll+9nm+WD7ASlO4ebO5lJ6/H8+CYZppSWIsBuw9d4z4UUmOIBQBgqmgKTWGiy7dpXQHgKq+LrUyVxm6dvuTVwVsMdT/neX3udYXXJl7rN9vbAsViBrYZK0FA4UfTjx/M2ToaHVcOwlnf41bo0THV6cZ8vv/yOtVrNxt+befTJ7Ad7fWTlWOoAbItGCqo6jXjTJfnYzjS62MrU8Gauq/vXefuzfoiAACmzawNumvz0X1t0d9Wwoy+gF+1EgwqfXFuE9YXQvs5s1lW4Pnd6/ZmXR3CtoDTFdi2thJE2io/ULGf1842mFrUe1J4U0dyHNpHWwdIU4b1GG4Oy6odwusqvT5OK+a/q/evMKeQtIUNrq2Wh4nnZ3+v58K6KlJQOj2sv2jlnrS2qfNjvb639m1Z7B7ma6zz8baV7Xva3P2fbKVTDADAVNKXXA4rWQ5s6pb86PWs15Zpm75gFSoWSlOwcapW/9V67eDkL/OqK7CpW6f7strqnPC66jCvP5plTb3+bGt3s/pS4Lk8D9rcY3gvrbd1q3RM8e/sktYV3uq6rkOdyr6w+W8XdRHrvp+08qBAPJ5I56F2OkXHqnCdp331sIWC30xTwygo1s9jvsbqBv9m5fN4YxgXBTZNBQMAMJXanh7cw0rHpIYTdUcqjc3a4EtVX9p6+q/SFFxbF+oYK9NYbbUyvK5S2IjTYQo8cWpWwaDtRvquwDYqdapmm+WnrdzYLpqW1TZ1elZYCSpPWAmVT3md3axH2qbA0aXPcT9qg6nVeg7i05bqAubArKd3dd2u83qoGTtisLmVzneejuyiB1XU/YrUedU9dFKnRWvHtLrDSsdQ3UxN474ctuVrrH3o+lb6nNXPqILqV2EbAADLnrouCmH1Hqg1Vu4PEz3NqCdGY9ftsbAst3m9b6XDpnuKonfS+kK8buW+pNesdJL0FOVs2K6b7fUARaWff6jv6Rdrn1Ichbpr2r86RPV9nm/lwQqFKwWlvaycH02ZbtRsV4jN08IKFMM6mX0C201e91npeOn867xInXas11NdqD+b9fqk5SFWzqn+Tf138xk1sN1gpfsnt1iZzta+a8BSB65em0eshDGFYFH3UiFzV5sb2CQ/UKFzr+NSNzLeE6cA3ef8AQAwFT6xte9pU1ckBxCFj7YAUrtQi0X3VcUv5rjPz2wQEtYFTYEqTMQOlsKCAmulDk+8hyyH26qGky59AoeCmeQuWh/6++qA6m8Me+p31MCmoJWf2O2iv/9hs6z/QVCAO9RKoIx0jSN9FvTe89S0Pnf69wAA/C/cZWXqLN7YLuoyaSqwi24E1zTYpKhLtDoPLhJ1hvSec5dO7+8ZK+FH50P3XMWf2MgdIlG4uDoPjkFBZVjQ6qKb9DVl+4LXJbb2/WYLcU8eGEL71kMWCr86n5fZYHo0hjFd42E/2KxAvdg/TAwAwLKkzsaVeTA41+uEPDghCh9Lle7NGvenNZaT3PFaTPr5kK5rrJ99AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACM7l+zGfTfHVr5RQAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAYCAYAAAAoG9cuAAAAoklEQVR4XmNgGAXkAnEg9gViOyBmRZNjUAPiE0C8HIgjgLgaiFcDMSdMgT4QvwbiSiBmhIqJAvFWBojJYJWbgfgJECtCFYAkpgJxKQNUE8iUT0D8C4gfMUCs7AJiY5gCEHAB4n9AXA4TwAZMgfgbA8RH6IALiJlBDH4GiBWtKNIQzSCfCsMEDID4AgPEy7MYIJr6gZgbpgAGQMaKQTHYipEBAERmFwESThcqAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAAYCAYAAABa1LWYAAACt0lEQVR4Xu2WS8hNURiGX6EIud9CLiUpZUBKKRIiMZBccpmJIrmEwsDEQClKIXcDl1AGImFo4DJSSCQTEwMGysAlvO/51v73Ot/e+5y9+aXDeerp32et9e+911rf960NtGnz39CLzgvquqXpQhfSy3QV3Uif06nxoFZjLj1Cu0dt5+mp6HdLMYSeoQOjNu3cBdjEWpLlwZih9Bnd4Nr/GHrgIjqL9qjvqkw3WNiNo73pcNqH7qR3ad90aCk0XkVmBu3q+lR44vCuMYxeo9fpCrqHvkWazCPo+HBdFi2QJqUX+Up/BF/TUdG4Zihc19IvSO9xAukkFNpHw98ORtOnqB+oVb5Eb9OedC9shaqg8dtgL6UHapJa0St0XzqsKSo07+hmOoluoh/oktCv8F4frmvo5VWFtCtj4w6yi36k8+lZVA8XPXyOb4Td9zHt7zty0IJepNNcuyZ6DnaP47AF62AifQ8LPU0wRmfKJ9iEfLI3Q/c6TEf6DrIbFoJ1L1KAckcvrt2OUW4qstbQra6vVhQUo3XbF0j6bsBWrApJPvlio983g76vKsqj+8hGGBbAXlwT8KjtG53pO0i/YBHKp5PIrvAUWEivdu2qjso7P74R2nHlvY+wWhV6BYv/BN14Nn2BdMIKo0GhfwIscfPyMGELfUnHRG0D6D16DPXlV5N5Qj/T6VF7MxR2yvdcNIE39Co9TR/Q7XQwvUUfwaqgqqTQBPUS35G/w8n5pKPhIeye+nrQ995KZM8Y7ZKeo/vtcH1FxGdgIXqQPml8CKhdO5Q52Mg6WPh64nzS/+l3o1BNUKWMI6YRmswdpNHTKWilDiI//JLzqSr60igbfoth510mn34HxfIB5Cd20fnUiMmw87Jsld2P/Ir9y2h1lqH4MF4K98lSgqQYleUQ7Ovin6JTw67N3+Anrv1pgWJoF2wAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIMAAAAYCAYAAADZPE7mAAAFCUlEQVR4Xu2aeah1UxjGHxkyz0NCPjP5kITIlJAhHxmiyB9kTkIoSVdSJMpUMmQKGTJkisQ11KeUUIZEfSTKH5T4QzI8P+9Z3XXW3fueffa55x6+u596uuestc8+e633We90rtShQ4cOC40NzNXLwRqsam5krlJOdPj/4zjzVjUXAyK4wrys97rDhHC4+bX5bUMeER+rxd7mW+bm5cQAIJxHzJPLiQliiXl6ObiyglN4l/mkYuHpVN5v/mUe3XuPGz/UXGHu2xurwlrmC2q/gUvN5eY25cQCYjfzIvNN80/z4f7plRdbmE+p/xQTuz9QGH6rbHxd81Fz62ysBOL5WHHfNljNfMKcKsbrsI6ah6KmQAwnmgea32kRiQGXT5zOsZf5i/mMwjgJiOQOc71sLAde5UHFNaPgDIUY+b5BwGDvmpcqhDGf2NL8RotIDKeaOxdjGONv8+pifBPzPNUneJuan5onlRMF1jQPM49X3LMEYsQIc4WjHIQw8h5EcYuq79kGkxQDe8w+HKLwfLzHTnV7NjaQL/xhHlRODMA+igSTv1Xg5OI1PjLPMc8y3zN3zy/SjBEGiaoEG7a/InklD+I+o2CSYjjSvE2Rf72m8LjXmhebX5r7zVw6PtTlC02Aan8wty8nFPnGK+Y7iv5DAkY7JnsPuHZasz1TUyCKPc1XFaFul/7pxpiUGPCc95jbKQ7Pz4pwCFjbY+bLvevGCk71b5qdLzQBYmDzqk7kBYrqJFUZLATP8Kz6xQGSGG4sxtsAIbAWvmdYUQwrBtbEZ5oQV49hq0Ayf53iYE6r3/DYhPXQCmibpDdGXb7QBHViIDy8objv9+YX5gPmKYpStEQSA+FqPsAJQwzPmRsWc3NhWDHg4e5tyJs0+FnwsHja3BYpLyM/qkvk5wUoldjUJl8AdWJIC5hWGHoQRg0TCXiCp3sc1iuAYcUw30Bcv6vfFrzGPqNWbAPRJF9AMPQS6DcgnLwS4UE5+WTBOVAwSq7aVDLlNYqx9ByXF+NNwPORL7xk3qfwCm0xaTEQJleo3xZTihyCLi+gkjrWfKhHekCbmbcrym2S8MfNAxR7wWtC9dmKbm9VfvcvBuULbPRV5jUK14/bzQ1GswYxVLWrpzS7d7CxQlClF2JBxMSq+9RhHOVlEgMJG2tfSCTvSNMrCXpHRbXGbzg8DwfpbvPK3ntK8XPNM82Dzc/MoxR2ut68pPeecaoumoN9nWJO9ofmT4qYnvir+bn6y0TU9YlCqXw5xsy7f2kB52djCSSJdBbfVsTM5xUlYO5ZEhAHYaXOO+VABCeY7ytKr/X7p1sBEWIEWtH5frD2PbLrxomUL3CAWBve6SvzNM0Ik+f8UZGcX6jIsThIOym89+sKm7D35GaMYxsOYPqVmL+tQAyv8xoJU5r7GpImTtxcZdGUQjh198jBRoyj+zhpLFOIEYOzV1QYpeGwB6e+qh3PXFmNISKEQJEwMggJuKUEFLdr9h7gymgqLS3GmwL3zg9EuLnFjKp8oQSnPM9nkj0Qz4ua3b8hkSeMljldK2yrUCL9ATphNytCRQliGt2zNnGWeEfDpUrtiwGc/h0U4WF573XdXmB8SnS8Y24P+g+E4JRrJCACGn98bl5QlSuUYO5ODf9/CXgVuoaIbrFiiaISSP0I/kGoLNVzYA+8aR52GasKmwht7XJwIcDD3KA5SpcClJ+4RhKgDh06dOjwn8A/ZTrvlVjs8rcAAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAYCAYAAAAGXva8AAABjUlEQVR4Xu3VyytFURQG8E/eIUV5RImkyEwpRZSBV1JMFEaSMmJgwISSDAzNpCTJY0Aij4kBBvIPKJQ/wUwhj2+11sm++xqQcwzkq1/3nL32bd/9uOcA//nrqaJbenM8UIPVF7zaHVVY7cepo0e6oUKnPZV2aIoynPZQkk5H9Eqt1pZA40auI0kvdAnXKRk62LxdR5Z8uqJ7moHuZ6QDBpmFzvaUsr1aZGmH7usFfmnQSjqha8QeqO9GtmSIiv2CnxLapXLEHqgkt9MXI4MtIfavFxdZxi2qtXv3QFUHncKMDLhNHV77NHS28vlZ5H89DP2x3VRj7fXQFWuz+7iUQjuM+QXol5/pknK9WibtQ/dcHhpr0FOfR/3UQ5uUGHxBMkBP+HievlCXUx+xNrd+TDlWlz0/gM42jfagM5N6AS1Tn/UNLSs0addFdEZldi+rd26foUYG7bRrWeJDaqYm6D7LTOUF0mh9QkkLrdIoLUJfFHPQPR2kDZqALn+okQdA8KpLsfsgWfAO0X8izTsBe0rZMp1t1wAAAABJRU5ErkJggg==>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAVCAYAAADy3zinAAABgklEQVR4Xu2XTytEURiHX6HI/xQJyUpKFlJSKLJma2HFN7CUD0A2kpU/ycKKJSkUZaNsfAHFhiJsbKTwvJ05uffM4I47NWd0n3pqmt+9U/c997zvGZGEhISE6AzjHX4EfML71OcXXMJqe8N/Zx3fcMD5vkdMUQ6x0smCNOAeLmC9kxUMVXiGV9joZPrwp/iOo+EojSLswxNcwdZw7D+d+Ii7WOJkdXghmd+W79CCdIt5Q3awIxz7y5iYfjDjBtCPr3iONU4WhXbcwAMxxdEiecuyZF5xffBjfMBeJ8uWJjHbRbeNbh/vCmJ7gK76Nq6m3MJb3MQWe3FM9OF1Sj3jpJPlHdsfjrBNzMpZywLXxSHYRNfEbBfvsP1h1g1yQDGOiJlIi+L5WNX+EGU0ZoMWYFxMg52TAjiM2fPDNTaHoz9RjlN4idNYEY79pUtM49qX+P1AG6r+zgSWOpm3DOKNpP+/0FVMSMgNOiJ1KgTH70/G3YreUovz8nUg+80hc1tC3vkEs/lJk0R/jAkAAAAASUVORK5CYII=>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHcAAAAVCAYAAAB8BXHbAAAEC0lEQVR4Xu2YXahOWRjHHw0142uIyFfC5OtiIqFTCLkYCRNTIyMzuaDmZqaECDdygaTko5RkytVMzZVvxXBBTDOUoZR8pERJiYtRzDy/8+zHu9517Nfe+93nnE72r/6d86619/vuvf5rPc+zlkhFRUVFRUVFR/OZarnqkGqnalx9d0P6qn4Su3eLakR9dyvdVNNVe1UHVAtUn9Rd0fEMVP2heqP6L9Fr1aOkDdE/0W/oinyuOqvapuqtmqS6pVoaXpTCSNVp1VeqIarZqhuqJcE1GLtebKBGqQaojolNhh7BdUVhcm1WXVSNifqyMF/M2O1RO997XPVcNTnq6zJsUF1T9Q/avlPdVg0O2mIwbZ/UGwkYzUAzaWCK6olqxrsrREarHohdWxQmyS7VJdVcKR4JNomZi8kxjA19RJwy4Bn7xI3tBYZi7NGofarqpWpR1B7CKr+g+qG+udXMP6U2MVgRGMnKdnhBTDkiNknywOo/LDaBCPV57w/5VGx1PhabcDE8+/tWdV5Ie6tU11XfRH3txgTVM2lrLga9ksYv1V31m1ieWicWYhnojaqDSb8PXmyuT4w4YjSCOuDXROTBZkx1hqnuq86petV3tUaeK6p/VS1RX1Y8ZfA9X0s5aSgzbmKauXF7zDSxnMTsvqrao/pdaiHZTUwzN26PwUBW50mx1cqqLZN5qrfSdhLzu9QJ9K1NPuehrJTRFAvFjIlNzGouzBGb3V5xbhULQ4BxGBibmNXcxaoXYnk97wBnwXPqGbECz/W3WGqZJfl+l3ehDjkvzaeMpvFKMTYxq7lU1n+JhRzCsW8rfhEzmLx7V9qamNVcaK9V4CmDyDNT7Dlc/YLrskBEIbIQYb6UTjbVSTMxrT1kkJixYbVMLmTWE86ohNNMTGtvRJi/WNHNmuz5lknTTAVLrqYwJG/nOR9od6gQqRRjE91ctglpsOpvih0GhLBa2UYR8rzoik10c4sMLIPJoQkTa6XUUkBePN+Wtc0JV2+nh2TwQSY8EaYcXpwqmL8ORdJQqT00+fp91S79HFKsST5jMhU5lbnDhPhHmhtYKs9lYiZjdlztfgjf3zba7hWBSbxfdVnKTSOFWKF6KLVKFHM4rSL8edVL3uPkicKpJWkbnrR9m3x2xou9mH/fF2JHehjhkOOeSvEtRgiDR5g+JfZbWWC1c3086cqk7DRSCFYA+1IqPAojjGVVUSw5rPATqjtiR44O5hDWKaAwb4dYSGbGhpCX76lWq74XO978UTo+dDFJOWolKnl1z/9Emp7BdWUSphHGqEP3usAgjxU7PaH8z/MAXMs9H7qXgSWUI/7/2PA08nPc8bHCgFCghduUNFG9d0roqygGqSE8XGik3ZJ9W1VR0XX5H5hB1+KW5OcYAAAAAElFTkSuQmCC>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAVCAYAAADy3zinAAABY0lEQVR4Xu2XTysFURiHX6GUf0mRKFlJyUJKxIKsLXwFH0BZyjewkaxEWFixlUJRNspnUGwowsZGCs/buadmXrfMcNOZ23nqqWl+59adc97znhmRSCQSyc4U3uNnwmd8KF2/4iq2+B9UO5v4jhPm/rC4STnGJpNVHc14gdfYaTJ9+HP8wJl09GvqsdHeDIEBfMIDrDNZG15J+WrJi26vZbzEcZMFway4frBoAxjDN3F/vtVkWenCdTwTNwG16Tgc1qT8iuuDn+IjjpgsC324hUc4hDXpOCx8D9BV38ONkrt4h9vY4wdnpB/3S+p1IfD94QR7xZWxtyEx7id0tXXVdfW1CrQaCoXvD0s2yEmHuB6wI24SC4f2h0odjcmq0K1VmG3h3x9usDsd/RmdBD2OC9EoB/EFDyVfP8hD8ugclcAmZBJv5fv3xXxyUIVpxxVxFTgtAb9L/Bf6ar2AczaIRCJB8AWuXEFzjaPvEgAAAABJRU5ErkJggg==>
