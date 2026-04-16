import { Alert, Badge, Button, Loader, Skeleton, Text, TextInput, Tooltip } from '@mantine/core';
import { alpha, colors } from '@noah-rn/ui-tokens';
import { IconAlertCircle, IconBinaryTree2, IconSearch, IconStethoscope } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { fhirSearch } from '../fhir/client';
import type { Condition, Encounter, MedicationRequest, Observation } from '../fhir/types';

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

        const allTimestamps = [
          ...vitals.map((v) => v.effectiveDateTime).filter(Boolean),
          ...labs.map((l) => l.effectiveDateTime).filter(Boolean),
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
            const parts = obs.component.map((c) => {
              const cDisplay = c.code?.coding?.[0]?.display ?? '';
              const cVal = c.valueQuantity?.value ?? '';
              return `${cDisplay}: ${cVal}`;
            });
            value = parts.join(', ');
          }
          const isVital = obs.category?.some((c) => c.coding?.some((cd) => cd.code === 'vital-signs'));
          timeline.push({
            type: 'observation',
            subtype: isVital ? 'vital' : 'lab',
            code,
            display,
            value,
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

    void assemble();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const typeColors: Record<string, string> = {
    'observation:vital': colors.info,
    'observation:lab': '#8B5CF6',
    condition: colors.warning,
    medication: colors.normal,
    encounter: colors.textSecondary,
  };

  const patientInput = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setPatientId(inputId);
      }}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 18,
        background: colors.surface,
        padding: '18px 20px',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconBinaryTree2 size={18} color={colors.accent} />
        <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
          Context assembly inspector
        </Text>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <TextInput
          value={inputId}
          onChange={(e) => setInputId(e.currentTarget.value)}
          placeholder="Enter FHIR patient ID"
          leftSection={<IconSearch size={14} />}
          styles={{
            input: {
              background: colors.bg,
              borderColor: colors.borderLight,
              color: colors.textPrimary,
              minHeight: 44,
              minWidth: 280,
            },
          }}
        />
        <Button type="submit" leftSection={<IconStethoscope size={14} />}>
          Load context
        </Button>
      </div>
    </form>
  );

  if (!patientId && !bundle) {
    return (
      <>
        {patientInput}
        <Text c={colors.textMuted} fz="sm" mt={40} ta="center">Enter a Patient ID to inspect assembled context</Text>
      </>
    );
  }
  if (loading) {
    return (
      <>
        {patientInput}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.75fr) minmax(280px, 0.95fr)', gap: 20 }}>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 18, background: colors.surface, padding: '18px 20px' }}>
            <Skeleton height={20} width={180} mb={16} />
            <Skeleton height={42} mb={10} />
            <Skeleton height={42} mb={10} />
            <Skeleton height={42} mb={10} />
            <Skeleton height={42} mb={10} />
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}><Loader size="sm" color={colors.info} /></div>
          </div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 18, background: colors.surface, padding: '18px 20px' }}>
            <Skeleton height={20} width={120} mb={18} />
            <Skeleton height={72} mb={12} />
            <Skeleton height={72} mb={12} />
            <Skeleton height={120} />
          </div>
        </div>
      </>
    );
  }
  if (error) {
    return (
      <>
        {patientInput}
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} title="Context load failed">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Text c={colors.textPrimary} fz="sm">{error}</Text>
            <div>
              <Button size="xs" variant="light" color="red" onClick={() => setPatientId(inputId || patientId)}>
                Retry
              </Button>
            </div>
          </div>
        </Alert>
      </>
    );
  }
  if (!bundle) return <>{patientInput}</>;

  const counts = bundle.timeline.reduce((acc, entry) => {
    const key = entry.subtype ? `${entry.type}:${entry.subtype}` : entry.type;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {patientInput}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.75fr) minmax(280px, 0.95fr)', gap: 20, alignItems: 'start' }}>
        <section
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            background: colors.surface,
            padding: '18px 20px',
            minHeight: 560,
            maxHeight: 'calc(100vh - 220px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <Text fz={12} fw={600} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>
              TIMELINE ({bundle.timeline.length})
            </Text>
            <Badge variant="light" color="cyan" radius="sm">{bundle.tokenEstimate.toLocaleString()} est. tokens</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {bundle.timeline.map((entry, i) => {
              const colorKey = entry.subtype ? `${entry.type}:${entry.subtype}` : entry.type;
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '72px 56px minmax(0,1fr) 160px',
                    gap: 16,
                    padding: '10px 0',
                    borderBottom: `1px solid ${colors.border}`,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12,
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ color: colors.textSecondary }}>{entry.relativeTime}</span>
                  <span style={{ color: typeColors[colorKey] ?? colors.textSecondary, fontSize: 11, opacity: 0.95 }}>
                    {entry.type === 'observation' ? entry.subtype?.slice(0, 3).toUpperCase() : entry.type.slice(0, 3).toUpperCase()}
                  </span>
                  <Tooltip label={entry.display} multiline maw={360}>
                    <span style={{ color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.display}</span>
                  </Tooltip>
                  <Tooltip label={entry.value} multiline maw={360}>
                    <span style={{ color: colors.textSecondary, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.value}</span>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </section>

        <section
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            background: colors.surface,
            padding: '18px 20px',
            position: 'sticky',
            top: 0,
          }}
        >
          <Text fz={12} fw={600} c={colors.textMuted} mb={18} style={{ letterSpacing: '0.05em' }}>
            METADATA
          </Text>

          <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
            <MetaCard label="Tokens" value={bundle.tokenEstimate.toLocaleString()} />
            <MetaCard label="Queries" value={`${bundle.queriesExecuted.length}`} />
            <MetaCard label="Gaps" value={`${bundle.gaps.length}`} tone={bundle.gaps.length ? colors.warning : colors.accent} />
          </div>

          <div style={{ marginBottom: 28 }}>
            <Text fz={12} c={colors.textSecondary} mb={10}>Queries executed</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bundle.queriesExecuted.map((q) => (
                <Text key={q} ff="monospace" fz={11} c={colors.textPrimary}>{q}</Text>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <Text fz={12} c={colors.textSecondary} mb={10}>Counts</Text>
            {Object.entries(counts).map(([key, count]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text ff="monospace" fz={11} c={typeColors[key] ?? colors.textSecondary}>{key}</Text>
                <Text ff="monospace" fz={11} c={colors.textPrimary}>{count}</Text>
              </div>
            ))}
          </div>

          <div>
            <Text fz={12} c={colors.textSecondary} mb={10}>Known gaps</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bundle.gaps.map((g) => (
                <div key={g} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, background: alpha.warningSoft, padding: '10px 12px' }}>
                  <Text fz={12} c={colors.textPrimary}>{g}</Text>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetaCard({ label, value, tone = colors.textPrimary }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 14, background: colors.bg, padding: '12px 14px' }}>
      <Text fz={11} fw={600} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 8 }}>
        {label}
      </Text>
      <Text ff="monospace" fz={20} fw={600} c={tone}>{value}</Text>
    </div>
  );
}
