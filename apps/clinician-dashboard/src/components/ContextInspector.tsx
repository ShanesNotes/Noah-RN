import { useState, useEffect } from 'react';
import { Loader, Text } from '@mantine/core';
import { colors } from '../theme';
import { fhirSearch } from '../fhir/client';
import type { Observation, Condition, MedicationRequest, Encounter } from '../fhir/types';

interface ContextInspectorProps {
  patientId: string;
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

export function ContextInspector({ patientId }: ContextInspectorProps) {
  const [bundle, setBundle] = useState<ContextBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Loader size="sm" color={colors.info} /></div>;
  if (error) return <Text c={colors.critical} fz="sm">{error}</Text>;
  if (!bundle) return null;

  const typeColors: Record<string, string> = {
    'observation:vital': colors.info,
    'observation:lab': '#8B5CF6',
    condition: colors.warning,
    medication: colors.normal,
    encounter: colors.textSecondary,
  };

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>
      {/* Left: Timeline */}
      <div style={{ flex: 2, overflowY: 'auto' }}>
        <Text ff="monospace" fz={11} fw={600} c={colors.textSecondary} mb={12} style={{ letterSpacing: '0.1em' }}>
          ASSEMBLED TIMELINE ({bundle.timeline.length} entries)
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {bundle.timeline.map((entry, i) => {
            const colorKey = entry.subtype ? `${entry.type}:${entry.subtype}` : entry.type;
            return (
              <div key={i} style={{
                display: 'flex', gap: 8, padding: '4px 8px', borderRadius: 4,
                background: i % 2 === 0 ? 'transparent' : `${colors.surface}80`,
                fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
              }}>
                <span style={{ color: colors.textMuted, minWidth: 50 }}>{entry.relativeTime}</span>
                <span style={{
                  color: typeColors[colorKey] ?? colors.textSecondary,
                  minWidth: 60, fontWeight: 600,
                }}>
                  {entry.type === 'observation' ? entry.subtype?.toUpperCase() : entry.type.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, flex: 1 }}>{entry.display}</span>
                <span style={{ color: colors.textSecondary }}>{entry.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Metadata */}
      <div style={{ flex: 1, borderLeft: `1px solid ${colors.border}`, paddingLeft: 24 }}>
        <Text ff="monospace" fz={11} fw={600} c={colors.textSecondary} mb={12} style={{ letterSpacing: '0.1em' }}>
          CONTEXT METADATA
        </Text>

        <div style={{ marginBottom: 16 }}>
          <Text fz={11} c={colors.textMuted} mb={4}>Token Estimate</Text>
          <Text ff="monospace" fz="lg" fw={700} c={colors.info}>{bundle.tokenEstimate.toLocaleString()}</Text>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text fz={11} c={colors.textMuted} mb={4}>Queries Executed</Text>
          {bundle.queriesExecuted.map(q => (
            <Text key={q} ff="monospace" fz={10} c={colors.textSecondary}>{q}</Text>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text fz={11} c={colors.textMuted} mb={4}>Entry Counts</Text>
          {Object.entries(
            bundle.timeline.reduce((acc, e) => {
              const key = e.subtype ? `${e.type}:${e.subtype}` : e.type;
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          ).map(([key, count]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text ff="monospace" fz={10} c={typeColors[key] ?? colors.textSecondary}>{key}</Text>
              <Text ff="monospace" fz={10} c={colors.textPrimary}>{count}</Text>
            </div>
          ))}
        </div>

        <div>
          <Text fz={11} c={colors.textMuted} mb={4}>Known Gaps</Text>
          {bundle.gaps.map(g => (
            <Text key={g} fz={10} c={colors.warning} mb={2}>{g}</Text>
          ))}
        </div>
      </div>
    </div>
  );
}
