import { useState } from 'react';
import { Text, CopyButton } from '@mantine/core';
import { colors } from '../theme';

interface SkillPanelProps {
  patientId?: string;
  patientName?: string;
}

const SKILLS = [
  { id: 'shift-report', name: 'Shift Report', description: '7-section structured handoff' },
  { id: 'shift-assessment', name: 'Shift Assessment', description: '15-system nursing assessment' },
  { id: 'drug-reference', name: 'Drug Reference', description: 'OpenFDA drug lookup' },
  { id: 'protocol-reference', name: 'Protocol Reference', description: 'ACLS, sepsis, stroke, RR, RSI' },
  { id: 'neuro-calculator', name: 'Neuro Calculator', description: 'GCS, NIHSS, RASS, CPOT' },
  { id: 'risk-calculator', name: 'Risk Calculator', description: 'Wells PE/DVT, CURB-65, Braden' },
  { id: 'acuity-calculator', name: 'Acuity Calculator', description: 'APACHE II, NEWS2' },
  { id: 'io-tracker', name: 'I/O Tracker', description: 'Intake & output fluid balance' },
  { id: 'unit-conversion', name: 'Unit Conversion', description: 'Dose math, drip rates, conversions' },
];

export function SkillPanel({ patientId = '<patient-id>', patientName = '<patient>' }: SkillPanelProps) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);

  const generatePrompt = (skillId: string): string => {
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return '';

    if (skillId === 'shift-report') {
      return `Use the shift-report skill with patient_id: ${patientId}\n\nCall get_patient_context("${patientId}") to retrieve the patient's clinical data, then organize it into a structured shift report.`;
    }
    if (skillId === 'shift-assessment') {
      return `Use the shift-assessment skill.\n\nFirst call get_patient_context("${patientId}") to retrieve ${patientName}'s clinical data, then generate a systems-based nursing assessment.`;
    }
    return `Use the ${skill.name} skill for patient ${patientName} (ID: ${patientId}).`;
  };

  return (
    <div style={{ display: 'flex', gap: 48, height: '100%' }}>
      {/* Left: Skill list */}
      <div style={{ width: 280 }}>
        <Text fz={12} fw={500} c={colors.textMuted} mb={24} style={{ letterSpacing: '0.05em' }}>
          AVAILABLE SKILLS
        </Text>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {SKILLS.map(skill => (
            <button
              key={skill.id}
              onClick={() => {
                setSelectedSkill(skill.id);
                setOutput(generatePrompt(skill.id));
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderLeft: selectedSkill === skill.id ? `2px solid ${colors.textPrimary}` : '2px solid transparent',
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                opacity: selectedSkill === skill.id ? 1 : 0.85,
              }}
            >
              <Text ff="monospace" fz={12} fw={selectedSkill === skill.id ? 600 : 400} c={selectedSkill === skill.id ? colors.textPrimary : colors.textSecondary}>{skill.name}</Text>
              <Text fz={11} c={colors.textMuted} mt={4}>{skill.description}</Text>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text fz={12} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>
            {selectedSkill ? `INVOKE: ${selectedSkill}` : ''}
          </Text>
          {output && (
            <CopyButton value={output}>
              {({ copied, copy }) => (
                <button
                  onClick={copy}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copied ? colors.accent : colors.textSecondary,
                    fontFamily: '"Outfit", sans-serif',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {copied ? 'copied' : 'copy prompt'}
                </button>
              )}
            </CopyButton>
          )}
        </div>

        {output ? (
          <div style={{
            flex: 1, padding: '24px 0', overflowY: 'auto',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 13,
            color: colors.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {output}
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.textMuted, fontFamily: '"Outfit", sans-serif', fontSize: 13,
          }}>
            Select a skill to generate prompt
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Text fz={11} c={colors.textMuted}>
            Context is automatically resolved via the clinical MCP server when you run the prompt.
          </Text>
        </div>
      </div>
    </div>
  );
}
