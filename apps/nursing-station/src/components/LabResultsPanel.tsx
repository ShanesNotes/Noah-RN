import { Badge, Button, SimpleGrid, Text } from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight, IconCheck, IconFlask, IconRosetteDiscountCheck } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { colors } from '../theme';

interface Observation {
  id?: string;
  code?: {
    coding?: {
      code?: string;
      display?: string;
    }[];
    text?: string;
  };
  valueQuantity?: {
    value?: number;
    unit?: string;
  };
  referenceRange?: {
    low?: { value?: number; unit?: string };
    high?: { value?: number; unit?: string };
  }[];
  effectiveDateTime?: string;
  interpretation?: {
    coding?: {
      code?: string;
    }[];
  }[];
}

interface LabResultsPanelProps {
  observations: Observation[];
}

type ReviewState = 'unreviewed' | 'reviewed' | 'acknowledged';
type Severity = 'critical' | 'abnormal' | 'normal';

function getObservationId(observation: Observation, index: number): string {
  return observation.id || `obs-${index}`;
}

function getInterpretationCode(observation: Observation): string | undefined {
  return observation.interpretation?.[0]?.coding?.[0]?.code;
}

function getTestName(observation: Observation): string {
  return observation.code?.text || observation.code?.coding?.[0]?.display || 'Unknown Test';
}

function getValueText(observation: Observation): string {
  const value = observation.valueQuantity?.value;
  const unit = observation.valueQuantity?.unit;

  if (value === undefined) {
    return 'N/A';
  }

  return `${value.toFixed(2)}${unit ? ` ${unit}` : ''}`;
}

function getRangeText(observation: Observation): string {
  const range = observation.referenceRange?.[0];
  if (range?.low?.value === undefined || range?.high?.value === undefined) {
    return 'Reference unavailable';
  }

  return `${range.low.value} - ${range.high.value}${range.high.unit ? ` ${range.high.unit}` : ''}`;
}

function getTrendDeltaMap(observations: Observation[]): Record<string, string> {
  const grouped = new Map<string, Observation[]>();

  for (const observation of observations) {
    const key = getTestName(observation);
    const current = grouped.get(key) ?? [];
    current.push(observation);
    grouped.set(key, current);
  }

  const deltaMap: Record<string, string> = {};

  for (const group of grouped.values()) {
    const sorted = [...group].sort((a, b) => {
      const dateA = a.effectiveDateTime ? new Date(a.effectiveDateTime).getTime() : 0;
      const dateB = b.effectiveDateTime ? new Date(b.effectiveDateTime).getTime() : 0;
      return dateB - dateA;
    });

    if (sorted.length < 2) {
      continue;
    }

    const latest = sorted[0];
    const previous = sorted[1];
    if (latest.valueQuantity?.value === undefined || previous.valueQuantity?.value === undefined) {
      continue;
    }

    const delta = latest.valueQuantity.value - previous.valueQuantity.value;
    const prefix = delta > 0 ? '+' : '';
    deltaMap[getObservationId(latest, 0)] = delta === 0 ? 'Stable' : `${prefix}${(Math.round(delta * 10) / 10).toString()}`;
  }

  return deltaMap;
}

function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return 'N/A';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ago`;
  return 'Just now';
}

function getSeverity(observation: Observation): Severity {
  const code = getInterpretationCode(observation);
  if (code === 'HH' || code === 'H') {
    return 'critical';
  }
  if (code === 'LL' || code === 'L') {
    return 'abnormal';
  }

  const value = observation.valueQuantity?.value;
  const range = observation.referenceRange?.[0];
  if (value !== undefined && range) {
    if (range.high?.value !== undefined && value > range.high.value) {
      return 'critical';
    }
    if (range.low?.value !== undefined && value < range.low.value) {
      return 'abnormal';
    }
  }

  return 'normal';
}

function getSeverityLabel(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'abnormal':
      return 'Abnormal';
    case 'normal':
      return 'Normal';
  }
}

function getReviewLabel(state: ReviewState): string {
  switch (state) {
    case 'unreviewed':
      return 'Needs Review';
    case 'reviewed':
      return 'Reviewed';
    case 'acknowledged':
      return 'Acknowledged';
  }
}

function getReviewTone(state: ReviewState): 'cyan' | 'yellow' | 'green' {
  switch (state) {
    case 'unreviewed':
      return 'cyan';
    case 'reviewed':
      return 'yellow';
    case 'acknowledged':
      return 'green';
  }
}

function getSeverityTone(severity: Severity): 'red' | 'yellow' | 'gray' {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'abnormal':
      return 'yellow';
    case 'normal':
      return 'gray';
  }
}

function getDeltaGlyph(deltaText?: string): JSX.Element | undefined {
  if (!deltaText || deltaText === 'Stable') {
    return undefined;
  }

  if (deltaText.startsWith('+')) {
    return <IconArrowUpRight size={14} />;
  }

  return <IconArrowDownRight size={14} />;
}

export function LabResultsPanel({ observations }: LabResultsPanelProps): JSX.Element {
  const [reviewStateById, setReviewStateById] = useState<Record<string, ReviewState>>({});
  const [selectedObservationId, setSelectedObservationId] = useState<string | undefined>();
  const trendDeltaMap = useMemo(() => getTrendDeltaMap(observations), [observations]);

  const orderedObservations = useMemo(
    () =>
      [...observations].sort((a, b) => {
        const dateA = a.effectiveDateTime ? new Date(a.effectiveDateTime).getTime() : 0;
        const dateB = b.effectiveDateTime ? new Date(b.effectiveDateTime).getTime() : 0;
        return dateB - dateA;
      }),
    [observations],
  );

  const selectedObservation = useMemo(() => {
    if (!orderedObservations.length) {
      return undefined;
    }

    if (selectedObservationId) {
      return orderedObservations.find((observation, index) => getObservationId(observation, index) === selectedObservationId);
    }

    const unresolvedCritical = orderedObservations.find((observation, index) => {
      const id = getObservationId(observation, index);
      return getSeverity(observation) === 'critical' && (reviewStateById[id] ?? 'unreviewed') !== 'acknowledged';
    });

    return unresolvedCritical || orderedObservations[0];
  }, [orderedObservations, reviewStateById, selectedObservationId]);

  if (!orderedObservations.length) {
    return (
      <div style={{ padding: '0' }}>
        <Text style={{ color: colors.textMuted, fontSize: '13px' }}>
          No laboratory results available.
        </Text>
      </div>
    );
  }

  const grouped = {
    critical: orderedObservations.filter((observation) => getSeverity(observation) === 'critical'),
    abnormal: orderedObservations.filter((observation) => getSeverity(observation) === 'abnormal'),
    reviewed: orderedObservations.filter((observation, index) => (reviewStateById[getObservationId(observation, index)] ?? 'unreviewed') !== 'unreviewed'),
  };

  function setReviewState(observation: Observation, state: ReviewState): void {
    const id = getObservationId(observation, orderedObservations.indexOf(observation));
    setReviewStateById((current) => ({
      ...current,
      [id]: state,
    }));
  }

  return (
    <div data-testid="results-review-panel" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          background: colors.surface,
          padding: '18px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconFlask size={18} color={colors.accent} />
          <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Results review surface
          </Text>
        </div>
        <Text fz={13} c={colors.textSecondary} mt={10} lh={1.55}>
          Critical and abnormal results stay foregrounded until explicitly reviewed or acknowledged.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={12}>
        <SummaryCell label="Critical" value={grouped.critical.length} tone="red" />
        <SummaryCell label="Abnormal" value={grouped.abnormal.length} tone="yellow" />
        <SummaryCell label="Reviewed / Ack" value={grouped.reviewed.length} tone="green" />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={18}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ResultGroup
            title="Needs Review"
            testId="results-review-group-needs-review"
            observations={orderedObservations.filter((observation, index) => (reviewStateById[getObservationId(observation, index)] ?? 'unreviewed') === 'unreviewed')}
            reviewStateById={reviewStateById}
            trendDeltaMap={trendDeltaMap}
            selectedObservationId={selectedObservation ? getObservationId(selectedObservation, orderedObservations.indexOf(selectedObservation)) : undefined}
            onSelectObservation={setSelectedObservationId}
          />
          <ResultGroup
            title="Reviewed / Acknowledged"
            testId="results-review-group-reviewed"
            observations={orderedObservations.filter((observation, index) => (reviewStateById[getObservationId(observation, index)] ?? 'unreviewed') !== 'unreviewed')}
            reviewStateById={reviewStateById}
            trendDeltaMap={trendDeltaMap}
            selectedObservationId={selectedObservation ? getObservationId(selectedObservation, orderedObservations.indexOf(selectedObservation)) : undefined}
            onSelectObservation={setSelectedObservationId}
          />
        </div>

        <ResultDetailPanel
          observation={selectedObservation}
          reviewState={selectedObservation ? reviewStateById[getObservationId(selectedObservation, orderedObservations.indexOf(selectedObservation))] ?? 'unreviewed' : 'unreviewed'}
          trendDelta={selectedObservation ? trendDeltaMap[getObservationId(selectedObservation, orderedObservations.indexOf(selectedObservation))] : undefined}
          onMarkReviewed={() => selectedObservation && setReviewState(selectedObservation, 'reviewed')}
          onAcknowledge={() => selectedObservation && setReviewState(selectedObservation, 'acknowledged')}
        />
      </SimpleGrid>
    </div>
  );
}

function ResultGroup({
  title,
  testId,
  observations,
  reviewStateById,
  trendDeltaMap,
  selectedObservationId,
  onSelectObservation,
}: {
  title: string;
  testId: string;
  observations: Observation[];
  reviewStateById: Record<string, ReviewState>;
  trendDeltaMap: Record<string, string>;
  selectedObservationId?: string;
  onSelectObservation: (id: string) => void;
}): JSX.Element {
  return (
    <div data-testid={testId}>
      <Text
        ff="monospace"
        fz={11}
        fw={600}
        c={colors.textMuted}
        tt="uppercase"
        mb={10}
        style={{ letterSpacing: '0.08em' }}
      >
        {title}
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {observations.length === 0 ? (
          <div style={{ border: `1px dashed ${colors.borderLight}`, borderRadius: 16, padding: '14px 16px' }}>
            <Text fz={12} c={colors.textMuted}>No results in this bucket.</Text>
          </div>
        ) : (
          observations.map((observation, index) => {
            const id = getObservationId(observation, index);
            const severity = getSeverity(observation);
            const reviewState = reviewStateById[id] ?? 'unreviewed';
            const isSelected = selectedObservationId === id;
            const deltaText = trendDeltaMap[id];

            return (
              <button
                key={id}
                type="button"
                data-testid={`results-review-row-${id}`}
                onClick={() => onSelectObservation(id)}
                style={{
                  border: `1px solid ${isSelected ? 'rgba(14, 165, 233, 0.3)' : colors.border}`,
                  borderRadius: 16,
                  background: isSelected ? 'rgba(14, 165, 233, 0.08)' : colors.surface,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <Text fz={14} fw={600} c={colors.textPrimary}>
                      {getTestName(observation)}
                    </Text>
                    <Text fz={12} c={colors.textSecondary} mt={6}>
                      {getValueText(observation)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge variant="light" color={getSeverityTone(severity)} radius="sm">
                      {getSeverityLabel(severity)}
                    </Badge>
                    <Badge variant="light" color={getReviewTone(reviewState)} radius="sm" data-testid={`results-review-state-${id}`}>
                      {getReviewLabel(reviewState)}
                    </Badge>
                    {deltaText && (
                      <Badge
                        variant="light"
                        color={severity === 'critical' ? 'red' : 'gray'}
                        radius="sm"
                        data-testid={`results-review-delta-${id}`}
                        leftSection={getDeltaGlyph(deltaText)}
                      >
                        {deltaText}
                      </Badge>
                    )}
                  </div>
                </div>
                <Text ff="monospace" fz={11} c={colors.textMuted} mt={10}>
                  {formatRelativeTime(observation.effectiveDateTime)}
                </Text>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ResultDetailPanel({
  observation,
  reviewState,
  trendDelta,
  onMarkReviewed,
  onAcknowledge,
}: {
  observation?: Observation;
  reviewState: ReviewState;
  trendDelta?: string;
  onMarkReviewed: () => void;
  onAcknowledge: () => void;
}): JSX.Element {
  if (!observation) {
    return (
      <div style={{ border: `1px dashed ${colors.borderLight}`, borderRadius: 16, padding: '18px 20px', background: colors.surface }}>
        <Text fz={13} c={colors.textMuted}>Select a result to inspect review detail.</Text>
      </div>
    );
  }

  const severity = getSeverity(observation);

  return (
    <section
      data-testid="results-review-detail"
      style={{
        border: `1px solid ${colors.border}`,
        background: colors.surface,
        borderRadius: 18,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Result review
          </Text>
          <Text fz={20} fw={600} c={colors.textPrimary} mt={8}>
            {getTestName(observation)}
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge variant="light" color={getSeverityTone(severity)} radius="sm">
            {getSeverityLabel(severity)}
          </Badge>
          <Badge variant="light" color={getReviewTone(reviewState)} radius="sm" data-testid="results-review-detail-state">
            {getReviewLabel(reviewState)}
          </Badge>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px 18px' }}>
        <MetaField label="Value" value={getValueText(observation)} />
        <MetaField label="Reference" value={getRangeText(observation)} />
        <MetaField label="Collected" value={formatRelativeTime(observation.effectiveDateTime)} />
        <MetaField label="Interpretation" value={getSeverityLabel(severity)} />
      </div>

      {trendDelta && (
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            background: 'rgba(14, 165, 233, 0.08)',
            padding: '12px 14px',
          }}
        >
          <Text fz={12} fw={600} c={colors.textPrimary}>
            Delta from prior result: {trendDelta}
          </Text>
        </div>
      )}

      <div
        style={{
          border: `1px solid ${severity === 'critical' ? 'rgba(225, 29, 72, 0.35)' : colors.border}`,
          borderRadius: 16,
          background: severity === 'critical' ? 'rgba(225, 29, 72, 0.08)' : 'rgba(14, 165, 233, 0.08)',
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {severity === 'critical' ? <IconRosetteDiscountCheck size={16} color={colors.critical} /> : <IconCheck size={16} color={colors.accent} />}
          <Text fz={13} fw={600} c={colors.textPrimary}>
            {severity === 'critical'
              ? 'Critical result. Review and acknowledge before leaving the review flow.'
              : 'Result review should be explicit. Do not leave interpretation state implicit.'}
          </Text>
        </div>
      </div>

      <div>
        <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
          Review actions
        </Text>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {reviewState === 'unreviewed' && (
            <Button size="xs" radius="sm" variant="light" color="gray" data-testid="results-action-reviewed" onClick={onMarkReviewed}>
              Mark Reviewed
            </Button>
          )}
          {reviewState !== 'acknowledged' && (
            <Button size="xs" radius="sm" variant="filled" color="cyan" data-testid="results-action-acknowledged" onClick={onAcknowledge}>
              Acknowledge Result
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'red' | 'yellow' | 'green';
}): JSX.Element {
  const backgroundByTone = {
    red: 'rgba(225, 29, 72, 0.10)',
    yellow: 'rgba(234, 179, 8, 0.10)',
    green: 'rgba(34, 197, 94, 0.10)',
  };

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: backgroundByTone[tone],
        padding: '14px 16px',
      }}
    >
      <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
        {label}
      </Text>
      <Text fz={24} fw={600} c={colors.textPrimary} mt={8}>
        {value}
      </Text>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
        {label}
      </Text>
      <Text fz={13} c={colors.textPrimary} mt={6}>
        {value}
      </Text>
    </div>
  );
}
