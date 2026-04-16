import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { Badge, Loader, Select, Text, TextInput, Tooltip as MantineTooltip } from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from 'recharts';
import { colors } from '../theme';
import type { TraceEnvelopeUI, TraceIndexEntry, TraceIndexManifest } from '../types';

interface TraceDetail {
  envelope: TraceEnvelopeUI | null;
  input: unknown | null;
  timing: Record<string, unknown> | null;
  hookResults: string;
  output: string | null;
  patientContext: unknown | null;
}

interface TraceViewerProps {
  selectedTraceId?: string | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return response.text();
}

function normalizeTraceIndex(payload: unknown): TraceIndexEntry[] {
  if (Array.isArray(payload)) {
    return payload as TraceIndexEntry[];
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as TraceIndexManifest).traces)) {
    return (payload as TraceIndexManifest).traces;
  }
  return [];
}

function traceTone(entry: TraceIndexEntry, detail?: TraceDetail | null): 'pass' | 'warn' | 'fail' {
  const safetyState = detail?.envelope?.tags?.clinical_safety?.status ?? detail?.envelope?.safety_gates?.find((gate) => gate.result !== 'pass')?.result;
  const normalized = `${entry.status} ${safetyState ?? ''}`.toLowerCase();
  if (normalized.includes('warn')) return 'warn';
  if (normalized.includes('fail')) return 'fail';
  return 'pass';
}

function toneColor(tone: 'pass' | 'warn' | 'fail'): string {
  if (tone === 'warn') return colors.warning;
  if (tone === 'fail') return colors.critical;
  return colors.accent;
}

function totalTokens(detail: TraceDetail | null, entry: TraceIndexEntry): number | null {
  const spend = detail?.envelope?.tags?.token_spend;
  if (spend) {
    return spend.input_tokens + spend.output_tokens + spend.cache_read_tokens + spend.cache_write_tokens;
  }
  if (detail?.input || detail?.output) {
    return Math.round((JSON.stringify(detail.input ?? '').length + (detail.output ?? '').length) / 4);
  }
  if (entry.envelope?.tags?.token_spend) {
    const tokenSpend = entry.envelope.tags.token_spend;
    return tokenSpend.input_tokens + tokenSpend.output_tokens + tokenSpend.cache_read_tokens + tokenSpend.cache_write_tokens;
  }
  return null;
}

function entryTotalTokens(entry: TraceIndexEntry, detail: TraceDetail | null, selectedId: string | null): number | null {
  if (entry.envelope?.tags?.token_spend) {
    const spend = entry.envelope.tags.token_spend;
    return spend.input_tokens + spend.output_tokens + spend.cache_read_tokens + spend.cache_write_tokens;
  }
  if (selectedId === entry.id) {
    return totalTokens(detail, entry);
  }
  return null;
}

function weightedScore(detail: TraceDetail | null): number | null {
  return detail?.envelope?.eval_scores?.weighted_score ?? null;
}

function entryWeightedScore(entry: TraceIndexEntry, detail: TraceDetail | null, selectedId: string | null): number | null {
  if (entry.envelope?.eval_scores?.weighted_score != null) {
    return entry.envelope.eval_scores.weighted_score;
  }
  if (selectedId === entry.id) {
    return weightedScore(detail);
  }
  return null;
}

function buildStageData(detail: TraceDetail | null, entry: TraceIndexEntry) {
  const stages = detail?.envelope?.tags?.latency?.stages ?? {};
  const entries = Object.entries(stages).map(([stage, value]) => ({ stage, ms: value }));
  if (entries.length) return entries;
  if (entry.duration_ms != null) {
    return [{ stage: 'skill_execution', ms: entry.duration_ms }];
  }
  if (detail?.timing && typeof detail.timing.duration_ms === 'number') {
    return [{ stage: 'skill_execution', ms: Number(detail.timing.duration_ms) }];
  }
  return [];
}

function buildTokenBreakdown(detail: TraceDetail | null) {
  const categories = detail?.envelope?.tags?.token_spend?.categories;
  if (categories && Object.keys(categories).length) {
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }
  const estimatedInput = Math.round(JSON.stringify(detail?.input ?? '').length / 4);
  const estimatedOutput = Math.round((detail?.output ?? '').length / 4);
  if (estimatedInput || estimatedOutput) {
    return [
      { name: 'input', value: estimatedInput },
      { name: 'output', value: estimatedOutput },
    ];
  }
  return [];
}

export function TraceViewer({ selectedTraceId }: TraceViewerProps) {
  const [traces, setTraces] = useState<TraceIndexEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [safetyFilter, setSafetyFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch('/traces/index.json')
      .then((r) => r.json())
      .then(normalizeTraceIndex)
      .then(setTraces)
      .catch((e) => console.error('Failed to load trace index:', e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTraceId) return;
    setSelected(selectedTraceId);
  }, [selectedTraceId]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      const [envelopeRes, inputRes, timingRes, hookRes, outputRes, patientRes] = await Promise.allSettled([
        fetchJson<TraceEnvelopeUI>(`/traces/${selected}/trace-envelope.json`),
        fetchJson<unknown>(`/traces/${selected}/input-context.json`),
        fetchJson<Record<string, unknown>>(`/traces/${selected}/timing.json`),
        fetchText(`/traces/${selected}/hook-results.json`),
        fetchText(`/traces/${selected}/skill-output.txt`),
        fetchJson<unknown>(`/traces/${selected}/patient-context.json`),
      ]);
      if (!cancelled) {
        setDetail({
          envelope: envelopeRes.status === 'fulfilled' ? envelopeRes.value : null,
          input: inputRes.status === 'fulfilled' ? inputRes.value : null,
          timing: timingRes.status === 'fulfilled' ? timingRes.value : null,
          hookResults: hookRes.status === 'fulfilled' ? hookRes.value.trim() : 'UNKNOWN',
          output: outputRes.status === 'fulfilled' ? outputRes.value : null,
          patientContext: patientRes.status === 'fulfilled' ? patientRes.value : null,
        });
        setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const now = Date.now();

  const filtered = traces.filter((t) =>
    (!filter || t.id.includes(filter) || t.skill.includes(filter) || t.status.toLowerCase().includes(filter.toLowerCase())) &&
    (safetyFilter === 'all' || traceTone(t).toLowerCase() === safetyFilter) &&
    (dateRange === 'all' ||
      (dateRange === '24h'
        ? now - new Date(t.started_at || 0).getTime() <= 24 * 60 * 60 * 1000
        : now - new Date(t.started_at || 0).getTime() <= 7 * 24 * 60 * 60 * 1000)),
  ).sort((a, b) => {
    if (sortBy === 'duration') return (b.duration_ms ?? -1) - (a.duration_ms ?? -1);
    if (sortBy === 'tokens') return (entryTotalTokens(b, detail, selected) ?? -1) - (entryTotalTokens(a, detail, selected) ?? -1);
    if (sortBy === 'score') return (entryWeightedScore(b, detail, selected) ?? -1) - (entryWeightedScore(a, detail, selected) ?? -1);
    return new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime();
  });

  const activeEntry = traces.find((trace) => trace.id === selected) ?? null;
  const tokenData = buildTokenBreakdown(detail);
  const stageData = activeEntry ? buildStageData(detail, activeEntry) : [];

  if (loading) {
    return (
      <div style={loadingStyle}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', minHeight: 640 }}>
      <div style={{ width: 372, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section style={{ ...panelCardStyle, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <IconFilter size={16} color={colors.accent} />
            <Text fz={11} fw={600} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>
              TRACE FILTERS
            </Text>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput
              placeholder="Filter traces..."
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value)}
              size="xs"
              variant="unstyled"
              styles={{ input: { borderBottom: `1px solid ${colors.border}`, borderRadius: 0, paddingLeft: 0, color: colors.textPrimary, fontFamily: '"Outfit", sans-serif', fontSize: 13 } }}
            />
            <Select
              value={safetyFilter}
              onChange={(value) => setSafetyFilter(value ?? 'all')}
              data={[
                { value: 'all', label: 'Safety: all' },
                { value: 'pass', label: 'Safety: pass' },
                { value: 'warn', label: 'Safety: warn' },
                { value: 'fail', label: 'Safety: fail' },
              ]}
              size="xs"
              allowDeselect={false}
              styles={selectStyles}
            />
            <Select
              value={dateRange}
              onChange={(value) => setDateRange(value ?? 'all')}
              data={[
                { value: 'all', label: 'Date: all' },
                { value: '24h', label: 'Date: last 24h' },
                { value: '7d', label: 'Date: last 7d' },
              ]}
              size="xs"
              allowDeselect={false}
              styles={selectStyles}
            />
            <Select
              value={sortBy}
              onChange={(value) => setSortBy(value ?? 'timestamp')}
              data={[
                { value: 'timestamp', label: 'Sort: newest' },
                { value: 'duration', label: 'Sort: duration' },
                { value: 'tokens', label: 'Sort: token spend' },
                { value: 'score', label: 'Sort: score' },
              ]}
              size="xs"
              allowDeselect={false}
              styles={selectStyles}
            />
          </div>
        </section>

        <section style={{ ...panelCardStyle, padding: 16, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <Text fz={11} fw={600} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>
              RECENT TRACES
            </Text>
            <Badge variant="light" color="cyan" radius="sm">{filtered.length}</Badge>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map((t) => {
              const isSelected = selected === t.id;
              const tone = traceTone(t, isSelected ? detail : null);
              const rowTokens = totalTokens(isSelected ? detail : null, t);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(t.id)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    border: `1px solid ${isSelected ? colors.info : colors.border}`,
                    borderRadius: 14,
                    opacity: isSelected ? 1 : 0.94,
                    transition: 'opacity 0.15s ease',
                    background: isSelected ? 'rgba(14,165,233,0.08)' : 'rgba(250,250,250,0.02)',
                    marginBottom: 10,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: toneColor(tone) }} />
                    <Text ff="monospace" fz={12} fw={isSelected ? 600 : 400} c={isSelected ? colors.textPrimary : colors.textSecondary} lineClamp={1}>{t.id}</Text>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingLeft: 14, alignItems: 'center' }}>
                    <Text fz={11} c={colors.textMuted}>{t.skill}</Text>
                    {t.duration_ms !== null && <Text fz={11} c={colors.textMuted}>{t.duration_ms}ms</Text>}
                    {rowTokens !== null && <Text fz={11} c={colors.textMuted}>{rowTokens} tok</Text>}
                  </div>
                  <MantineTooltip label={`Token profile${rowTokens !== null ? ` · ${rowTokens} total tokens` : ''}`}>
                    <div style={{ display: 'flex', gap: 2, marginTop: 8, paddingLeft: 14 }}>
                      {[0, 1, 2].map((index) => (
                        <div
                          key={`${t.id}-${index}`}
                          style={{
                            height: 4,
                            width: `${Math.max(12, Math.min(84, ((rowTokens ?? 0) / 40) * (index + 1) * 0.35))}px`,
                            background: index === 0 ? colors.info : index === 1 ? colors.accent : colors.textSecondary,
                            opacity: rowTokens ? 0.8 : 0.18,
                          }}
                        />
                      ))}
                    </div>
                  </MantineTooltip>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selected ? (
          <Text c={colors.textMuted} fz="sm" mt={40} ta="center">Select a trace to inspect</Text>
        ) : detailLoading || !detail ? (
          <div style={loadingStyle}>
            <Loader size="sm" color={colors.info} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 48 }}>
            <DetailSection title="TRACE SUMMARY">
              <div style={{ ...panelCardStyle, padding: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <TraceStatus status={activeEntry ? traceTone(activeEntry, detail) : 'pass'} />
                <Text ff="monospace" fz={12} c={colors.textSecondary}>
                  {activeEntry?.skill ?? detail.envelope?.skill ?? 'unknown'}
                </Text>
                {activeEntry?.started_at && (
                  <Text ff="monospace" fz={12} c={colors.textSecondary}>
                    {new Date(activeEntry.started_at).toLocaleString()}
                  </Text>
                )}
                {weightedScore(detail) != null && (
                  <Text ff="monospace" fz={12} c={colors.info}>
                    score {weightedScore(detail)?.toFixed(1)}
                  </Text>
                )}
              </div>
            </DetailSection>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.1fr) minmax(280px, 0.9fr)', gap: 16 }}>
              <DetailCard title="WATERFALL TIMELINE">
                {stageData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stageData}>
                      <XAxis dataKey="stage" tick={axisTick} axisLine={axisLine} tickLine={false} />
                      <YAxis tick={axisTick} axisLine={axisLine} tickLine={false} />
                      <RechartsTooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                      <Bar dataKey="ms" fill={colors.info} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Text c={colors.textMuted}>No stage timings recorded.</Text>
                )}
              </DetailCard>

              <DetailCard title="TOKEN BREAKDOWN">
                {tokenData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={tokenData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                        {tokenData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={[colors.info, colors.accent, colors.warning, colors.textSecondary][index % 4]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Text c={colors.textMuted}>Token categories appear when `trace-envelope.json` is available.</Text>
                )}
              </DetailCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <DetailCard title="CONTEXT ASSEMBLY">
                {detail.envelope?.context_assembly ? (
                  <KeyValueList
                    rows={[
                      ['patient bundle tokens', `${detail.envelope.context_assembly.patient_bundle_tokens ?? 'n/a'}`],
                      ['compression', detail.envelope.context_assembly.compression_strategy ?? 'n/a'],
                      ['knowledge assets', detail.envelope.context_assembly.knowledge_assets_selected?.join(', ') || 'n/a'],
                      ['gap markers', detail.envelope.context_assembly.gap_markers?.join(', ') || 'n/a'],
                      ['FHIR queries', `${detail.envelope.context_assembly.fhir_queries_fired ?? 'n/a'}`],
                    ]}
                  />
                ) : detail.input ? (
                  <CodeBlock>{JSON.stringify(detail.input, null, 2)}</CodeBlock>
                ) : (
                  <Text c={colors.textMuted}>No context assembly detail found.</Text>
                )}
              </DetailCard>

              <DetailCard title="ROUTING DECISION">
                {detail.envelope?.routing_decision ? (
                  <KeyValueList
                    rows={[
                      ['classification', detail.envelope.routing_decision.input_classification ?? 'n/a'],
                      ['selected workflow', detail.envelope.routing_decision.selected_workflow ?? 'n/a'],
                      ['candidates', detail.envelope.routing_decision.candidates_considered?.join(', ') || 'n/a'],
                      ['confidence', detail.envelope.routing_decision.confidence != null ? `${Math.round(detail.envelope.routing_decision.confidence * 100)}%` : 'n/a'],
                      ['rationale', detail.envelope.routing_decision.rationale ?? 'n/a'],
                    ]}
                  />
                ) : (
                  <Text c={colors.textMuted}>Routing telemetry will render here once the envelope pipeline is emitting.</Text>
                )}
              </DetailCard>

              <DetailCard title="SAFETY GATES">
                {detail.envelope?.safety_gates?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {detail.envelope.safety_gates.map((gate) => (
                      <div key={`${gate.gate_name}-${gate.detail}`} style={{ borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <Text ff="monospace" fz={12} c={colors.textPrimary}>
                            {gate.gate_name}
                          </Text>
                          <Text ff="monospace" fz={12} c={toneColor(gate.result)}>
                            {gate.result}
                          </Text>
                        </div>
                        <Text c={colors.textSecondary} fz={12} mt={4}>
                          {gate.detail}
                        </Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text c={colors.textMuted}>No explicit safety gates found. Legacy traces only expose hook status.</Text>
                )}
              </DetailCard>
            </div>

            <DetailSection title="RAW I/O">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <details style={detailsStyle}>
                  <summary style={summaryStyle}>input-context.json</summary>
                  <CodeBlock>{detail.input ? JSON.stringify(detail.input, null, 2) : 'Unavailable'}</CodeBlock>
                </details>
                <details style={detailsStyle}>
                  <summary style={summaryStyle}>skill-output.txt</summary>
                  <CodeBlock>{detail.output ?? 'Unavailable'}</CodeBlock>
                </details>
                <details style={detailsStyle}>
                  <summary style={summaryStyle}>hook-results.json</summary>
                  <CodeBlock>{detail.hookResults || 'Unavailable'}</CodeBlock>
                </details>
                <details style={detailsStyle}>
                  <summary style={summaryStyle}>trace-envelope.json</summary>
                  <CodeBlock>{detail.envelope ? JSON.stringify(detail.envelope, null, 2) : 'Unavailable'}</CodeBlock>
                </details>
                {detail.patientContext !== null && (
                  <details style={detailsStyle}>
                    <summary style={summaryStyle}>patient-context.json</summary>
                    <CodeBlock>{JSON.stringify(detail.patientContext, null, 2)}</CodeBlock>
                  </details>
                )}
              </div>
            </DetailSection>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>{title}</Text>
      {children}
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ ...panelCardStyle, padding: 16 }}>
      <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 12 }}>
        {title}
      </Text>
      {children}
    </div>
  );
}

function TraceStatus({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  return (
    <Text ff="monospace" fz={13} fw={500} c={toneColor(status)}>
      {status}
    </Text>
  );
}

function KeyValueList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(([label, value]) => (
        <div key={`${label}-${value}`} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: 8 }}>
          <Text fz={11} c={colors.textMuted}>
            {label}
          </Text>
          <Text ff="monospace" fz={12} c={colors.textPrimary} style={{ whiteSpace: 'pre-wrap' }}>
            {value}
          </Text>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  const lines = children.split('\n');
  return (
    <div style={{
      margin: 0,
      padding: 0,
      background: colors.surface,
      borderRadius: 10,
      fontSize: 12,
      fontFamily: '"JetBrains Mono", monospace',
      color: colors.textSecondary,
      maxHeight: 600,
      overflow: 'auto',
      border: `1px solid ${colors.border}`,
    }}>
      {lines.map((line, index) => (
        <div key={`${index}-${line}`} style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 12, padding: '6px 12px', borderBottom: index === lines.length - 1 ? 'none' : `1px solid ${colors.border}` }}>
          <span style={{ color: colors.textMuted, userSelect: 'none' }}>{index + 1}</span>
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: colors.textPrimary }}>{line || ' '}</span>
        </div>
      ))}
    </div>
  );
}

const panelCardStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  background: colors.surface,
};

const axisTick = {
  fill: colors.textSecondary,
  fontSize: 11,
};

const axisLine = {
  stroke: colors.borderLight,
};

const tooltipStyle: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 10,
  fontSize: 12,
  padding: '8px 12px',
};

const tooltipLabelStyle: CSSProperties = {
  color: colors.textSecondary,
  marginBottom: 8,
};

const selectStyles = {
  input: {
    background: colors.bg,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  dropdown: {
    background: colors.surface,
    borderColor: colors.border,
  },
};

const detailsStyle: CSSProperties = {
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 14,
  background: colors.bg,
};

const summaryStyle: CSSProperties = {
  cursor: 'pointer',
  padding: '12px 16px',
  color: colors.textPrimary,
  fontSize: 12,
  fontFamily: '"JetBrains Mono", monospace',
};

const loadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 64,
};
