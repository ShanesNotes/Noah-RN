import { useState, useEffect } from 'react';
import { Loader, Text } from '@mantine/core';
import { colors } from '../theme';
import { fhirSearch } from '../fhir/client';
import type { Observation, Condition, MedicationRequest, Encounter } from '../fhir/types';

interface ContextInspectorProps {
  patientId?: string;
}

interface TimelineEntry {
  type: string;
  subtype?: string;
  code: string;
  display: string;
  value: string;
  timestamp: string;
  relativeTime: string;
}

interface ContextBundle {
  timeline: TimelineEntry[];
  gaps: string[];
  queriesExecuted: string[];
  tokenEstimate: number;
  trendCount: number;
}

function computeRelativeTime(timestamp: string, reference: string): string {
  const diff = new Date(reference).getTime() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 0) return 'T-0m';
  if (minutes < 60) return `T-${minutes}m`;
  if (minutes < 1440) return `T-${Math.floor(minutes / 60)}h`;
  return `T-${Math.floor(minutes / 1440)}d`;
}

export function ContextInspector({ patientId: propPatientId }: ContextInspectorProps) {
  const [inputId, setInputId] = useState(propPatientId ?? '');
  const [patientId, setPatientId] = useState(propPatientId ?? '');
  const [bundle, setBundle] = useState<ContextBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function assemble() {
      try {
        const queries = ['Observation(vital-signs)', 'Observation(laboratory)', 'Condition', 'MedicationRequest', 'Encounter'];
        const [vitals, labs, conditions, meds, encounters] = await Promise.all([
          fhirSearch<Observation>('Observation', `patient=${patientId}&category=vital-signs&_sort=-date&_count=50`),
          fhirSearch<Observation>('Observation', `patient=${patientId}&category=laboratory&_sort=-date&_count=50`),
          fhirSearch<Condition>('Condition', `patient=${patientId}&_count=100`),
          fhirSearch<MedicationRequest>('MedicationRequest', `patient=${patientId}&_sort=-date&_count=100`),
          fhirSearch<Encounter>('Encounter', `patient=${patientId}&_count=50`),
        ]);

        const gaps: string[] = [];
        if (!vitals.length) gaps.push('No vital signs found');
        if (!labs.length) gaps.push('No laboratory results found');
        if (!conditions.length) gaps.push('No conditions found');
        if (!meds.length) gaps.push('No medication requests found');
        gaps.push('No allergy data (absent in MIMIC-IV demo)');
        gaps.push('No provider notes (absent in MIMIC-IV demo)');

        // Build timeline
        const allTimestamps = [
          ...vitals.map(v => v.effectiveDateTime).filter(Boolean),
          ...labs.map(l => l.effectiveDateTime).filter(Boolean),
        ] as string[];
        const reference = allTimestamps.sort().pop() ?? new Date().toISOString();

        const timeline: TimelineEntry[] = [];

        for (const obs of [...vitals, ...labs]) {
          const ts = obs.effectiveDateTime ?? '';
          if (!ts) continue;
          const code = obs.code?.coding?.[0]?.code ?? '';
          const display = obs.code?.coding?.[0]?.display ?? obs.code?.text ?? code;
          let value = '';
          if (obs.valueQuantity?.value != null) {
            value = `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`.trim();
          } else if (obs.component?.length) {
            const parts = obs.component.map(c => {
              const cDisplay = c.code?.coding?.[0]?.display ?? '';
              const cVal = c.valueQuantity?.value ?? '';
              return `${cDisplay}: ${cVal}`;
            });
            value = parts.join(', ');
          }
          const isVital = obs.category?.some(c => c.coding?.some(cd => cd.code === 'vital-signs'));
          timeline.push({
            type: 'observation',
            subtype: isVital ? 'vital' : 'lab',
            code, display, value,
            timestamp: ts,
            relativeTime: computeRelativeTime(ts, reference),
          });
        }

        for (const cond of conditions) {
          const ts = cond.recordedDate ?? cond.onsetDateTime ?? '';
          timeline.push({
            type: 'condition',
            code: cond.code?.coding?.[0]?.code ?? '',
            display: cond.code?.text ?? cond.code?.coding?.[0]?.display ?? 'Unknown condition',
            value: cond.clinicalStatus?.coding?.[0]?.code ?? '',
            timestamp: ts,
            relativeTime: ts ? computeRelativeTime(ts, reference) : '',
          });
        }

        for (const med of meds) {
          const ts = med.authoredOn ?? '';
          const name = med.medicationCodeableConcept?.text
            ?? med.medicationCodeableConcept?.coding?.[0]?.display
            ?? 'Unknown med';
          const dose = med.dosageInstruction?.[0]?.text ?? '';
          timeline.push({
            type: 'medication',
            code: med.medicationCodeableConcept?.coding?.[0]?.code ?? '',
            display: name,
            value: dose || med.status || '',
            timestamp: ts,
            relativeTime: ts ? computeRelativeTime(ts, reference) : '',
          });
        }

        for (const enc of encounters) {
          const ts = enc.period?.start ?? '';
          timeline.push({
            type: 'encounter',
            code: enc.class?.code ?? '',
            display: enc.type?.[0]?.text ?? enc.class?.display ?? 'Encounter',
            value: enc.status ?? '',
            timestamp: ts,
            relativeTime: ts ? computeRelativeTime(ts, reference) : '',
          });
        }

        // Sort by timestamp descending (most recent first)
        timeline.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        const tokenEstimate = Math.round(JSON.stringify(timeline).length * 0.28);

        if (!cancelled) {
          setBundle({ timeline, gaps, queriesExecuted: queries, tokenEstimate, trendCount: 0 });
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    }

    assemble();
    return () => { cancelled = true; };
  }, [patientId]);

  const patientInput = (
    <div style={{ display: 'flex', gap: 16, marginBottom: 32, alignItems: 'center' }}>
      <Text ff="monospace" fz={11} c={colors.textSecondary}>patient-id:</Text>
      <input
        value={inputId}
        onChange={e => setInputId(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') setPatientId(inputId); }}
        placeholder="Enter FHIR ID"
        style={{
          width: 240, background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.borderLight}`,
          padding: '4px 0', color: colors.textPrimary,
          fontFamily: '"JetBrains Mono", monospace', fontSize: 13, outline: 'none',
          transition: 'border-color 0.15s ease',
        }}
      />
      <button
        onClick={() => setPatientId(inputId)}
        style={{
          background: 'transparent', border: 'none',
          color: colors.accent, fontFamily: '"Outfit", sans-serif', fontSize: 13,
          fontWeight: 500, cursor: 'pointer', padding: '4px 8px',
        }}
      >
        Load
      </button>
    </div>
  );

  if (!patientId && !bundle) return <>{patientInput}<Text c={colors.textMuted} fz="sm" mt={40} ta="center">Enter a Patient ID to inspect assembled context</Text></>;
  if (loading) return <>{patientInput}<div style={{ textAlign: 'center', padding: 40 }}><Loader size="sm" color={colors.info} /></div></>;
  if (error) return <>{patientInput}<Text c={colors.critical} fz="sm">{error}</Text></>;
  if (!bundle) return <>{patientInput}</>;

  const typeColors: Record<string, string> = {
    'observation:vital': colors.info,
    'observation:lab': '#8B5CF6',
    condition: colors.warning,
    medication: colors.normal,
    encounter: colors.textSecondary,
  };

  return (
    <div>
      {patientInput}
    <div style={{ display: 'flex', gap: 48, height: '100%' }}>
      {/* Left: Timeline */}
      <div style={{ flex: 2, overflowY: 'auto' }}>
        <Text fz={12} fw={500} c={colors.textMuted} mb={16} style={{ letterSpacing: '0.05em' }}>
          TIMELINE ({bundle.timeline.length})
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {bundle.timeline.map((entry, i) => {
            const colorKey = entry.subtype ? `${entry.type}:${entry.subtype}` : entry.type;
            return (
              <div key={i} style={{
                display: 'flex', gap: 16, padding: '8px 0', borderBottom: `1px solid ${colors.border}`,
                fontFamily: '"JetBrains Mono", monospace', fontSize: 12, alignItems: 'baseline',
              }}>
                <span style={{ color: colors.textSecondary, width: 64, flexShrink: 0 }}>{entry.relativeTime}</span>
                <span style={{
                  color: typeColors[colorKey] ?? colors.textSecondary,
                  width: 50, flexShrink: 0, fontSize: 11, opacity: 0.9,
                }}>
                  {entry.type === 'observation' ? entry.subtype?.slice(0,3).toUpperCase() : entry.type.slice(0,3).toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.display}</span>
                <span style={{ color: colors.textSecondary, width: 140, flexShrink: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Metadata */}
      <div style={{ flex: 1 }}>
        <Text fz={12} fw={500} c={colors.textMuted} mb={24} style={{ letterSpacing: '0.05em' }}>
          METADATA
        </Text>

        <div style={{ marginBottom: 32 }}>
          <Text fz={12} c={colors.textSecondary} mb={8}>Tokens</Text>
          <Text ff="monospace" fz={24} fw={500} c={colors.textPrimary}>{bundle.tokenEstimate.toLocaleString()}</Text>
        </div>

        <div style={{ marginBottom: 32 }}>
          <Text fz={12} c={colors.textSecondary} mb={8}>Queries</Text>
          {bundle.queriesExecuted.map(q => (
            <Text key={q} ff="monospace" fz={11} c={colors.textPrimary} mb={4}>{q}</Text>
          ))}
        </div>

        <div style={{ marginBottom: 32 }}>
          <Text fz={12} c={colors.textSecondary} mb={8}>Counts</Text>
          {Object.entries(
            bundle.timeline.reduce((acc, e) => {
              const key = e.subtype ? `${e.type}:${e.subtype}` : e.type;
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          ).map(([key, count]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text ff="monospace" fz={11} c={typeColors[key] ?? colors.textSecondary}>{key}</Text>
              <Text ff="monospace" fz={11} c={colors.textPrimary}>{count}</Text>
            </div>
          ))}
        </div>

        <div>
          <Text fz={12} c={colors.textSecondary} mb={8}>Gaps</Text>
          {bundle.gaps.map(g => (
            <Text key={g} fz={12} c={colors.warning} mb={4}>{g}</Text>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
