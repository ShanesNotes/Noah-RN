import { useState } from 'react';
import { Text, Button, CopyButton } from '@mantine/core';
import { colors } from '../theme';

interface SkillPanelProps {
  patientId?: string;
  patientName?: string;
}

const SKILLS = [
  { id: 'shift-report', name: 'Shift Report', description: 'Organize patient data into structured 7-section handoff report' },
  { id: 'shift-assessment', name: 'Shift Assessment', description: 'Systems-organized nursing assessment from clinical data' },
  { id: 'drug-reference', name: 'Drug Reference', description: 'OpenFDA drug lookup with interaction checking' },
  { id: 'protocol-reference', name: 'Protocol Reference', description: 'Quick-recall clinical algorithms (ACLS, sepsis, stroke)' },
  { id: 'clinical-calculator', name: 'Clinical Calculator', description: 'Deterministic clinical scoring (NEWS2, GCS, APACHE II, etc.)' },
  { id: 'io-tracker', name: 'I/O Tracker', description: 'Categorize and total intake/output from free-text entries' },
  { id: 'unit-conversion', name: 'Unit Conversion', description: 'Weight-based dosing, drip rates, unit conversions' },
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
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>
      {/* Left: Skill list */}
      <div style={{ width: 280, borderRight: `1px solid ${colors.border}`, paddingRight: 16 }}>
        <Text ff="monospace" fz={11} fw={600} c={colors.textSecondary} mb={12} style={{ letterSpacing: '0.1em' }}>
          NOAH RN SKILLS
        </Text>
        <Text fz={10} c={colors.textMuted} mb={16}>
          Select a skill to generate an invocation prompt with auto-populated patient context.
        </Text>

        {SKILLS.map(skill => (
          <button
            key={skill.id}
            onClick={() => {
              setSelectedSkill(skill.id);
              setOutput(generatePrompt(skill.id));
            }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: selectedSkill === skill.id ? colors.border : 'transparent',
              border: `1px solid ${selectedSkill === skill.id ? colors.info : 'transparent'}`,
              borderRadius: 6, padding: '10px 12px', marginBottom: 6, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Text ff="monospace" fz={12} fw={600} c={colors.textPrimary}>{skill.name}</Text>
            <Text fz={10} c={colors.textMuted} mt={2}>{skill.description}</Text>
          </button>
        ))}
      </div>

      {/* Right: Output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text ff="monospace" fz={11} fw={600} c={colors.textSecondary} style={{ letterSpacing: '0.1em' }}>
            {selectedSkill ? `INVOKE: ${selectedSkill.toUpperCase()}` : 'SELECT A SKILL'}
          </Text>
          {output && (
            <CopyButton value={output}>
              {({ copied, copy }) => (
                <Button size="xs" variant={copied ? 'filled' : 'outline'} color={copied ? 'teal' : 'gray'} onClick={copy}>
                  {copied ? 'Copied' : 'Copy Prompt'}
                </Button>
              )}
            </CopyButton>
          )}
        </div>

        {output ? (
          <div style={{
            flex: 1, background: colors.bg, border: `1px solid ${colors.border}`,
            borderRadius: 8, padding: 16, overflowY: 'auto',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
            color: colors.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {output}
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.textMuted, fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
          }}>
            Select a skill to generate a context-aware invocation prompt
          </div>
        )}

        <div style={{
          marginTop: 12, padding: '8px 12px', background: `${colors.info}15`,
          borderRadius: 6, border: `1px solid ${colors.info}30`,
        }}>
          <Text fz={10} c={colors.info}>
            Patient context is auto-populated via the noah-rn-clinical MCP server.
            Copy the prompt into Claude Code to invoke the skill with full patient data.
          </Text>
        </div>
      </div>
    </div>
  );
}
