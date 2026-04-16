import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Badge, Loader, Text } from '@mantine/core';
import { alpha, colors } from '@noah-rn/ui-tokens';
import { IconBinaryTree2, IconShieldCheck, IconWaveSquare } from '@tabler/icons-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  CandidateRecord,
  EvalRun,
  EvalScores,
  ExtendedEvalScores,
  FailureBucketCounts,
  FailureTaxonomySummary,
  TraceEnvelopeUI,
  TraceIndexEntry,
  TraceIndexManifest,
} from '../types';
import { parseScoresTimestamp } from '../utils/time';

interface OverviewPanelProps {
  onOpenTrace?: (traceId: string) => void;
}

interface RecentTraceMetric {
  id: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  total_tokens: number;
  context_ratio: number | null;
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

async function loadEvalRuns(): Promise<EvalRun[]> {
  const indexText = await fetchText('/evals/index.txt');
  const files = indexText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const runs = await Promise.all(
    files.map(async (filename) => {
      const scores = await fetchJson<EvalScores>(`/evals/${filename}`);
      return { filename, timestamp: parseScoresTimestamp(filename), scores };
    }),
  );

  return runs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
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

function statusToTone(status: string, safetyStatus?: string): 'pass' | 'warn' | 'fail' {
  const normalized = `${status} ${safetyStatus ?? ''}`.toLowerCase();
  if (normalized.includes('warn')) return 'warn';
  if (normalized.includes('fail')) return 'fail';
  return 'pass';
}

function toneColor(tone: 'pass' | 'warn' | 'fail'): string {
  if (tone === 'warn') return colors.warning;
  if (tone === 'fail') return colors.critical;
  return colors.accent;
}

function quantile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(percentile * (sorted.length - 1)));
  return sorted[index];
}

function estimateTokens(input: unknown, output: string | null): RecentTraceMetric {
  const inputText = input ? JSON.stringify(input) : '';
  const outputText = output ?? '';
  const inputTokens = Math.round(inputText.length / 4);
  const outputTokens = Math.round(outputText.length / 4);
  const total = inputTokens + outputTokens;
  return {
    id: '',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_tokens: 0,
    total_tokens: total,
    context_ratio: total > 0 ? inputTokens / total : null,
  };
}

async function loadRecentTraceMetrics(entries: TraceIndexEntry[]): Promise<RecentTraceMetric[]> {
  const recent = entries
    .filter((entry) => entry.has_output)
    .sort((a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime())
    .slice(0, 8);

  const metrics = await Promise.all(
    recent.map(async (entry) => {
      try {
        const envelope = await fetchJson<TraceEnvelopeUI>(`/traces/${entry.id}/trace-envelope.json`);
        const tokenSpend = envelope.tags?.token_spend;
        if (tokenSpend) {
          return {
            id: entry.id,
            input_tokens: tokenSpend.input_tokens,
            output_tokens: tokenSpend.output_tokens,
            cache_tokens: tokenSpend.cache_read_tokens + tokenSpend.cache_write_tokens,
            total_tokens:
              tokenSpend.input_tokens +
              tokenSpend.output_tokens +
              tokenSpend.cache_read_tokens +
              tokenSpend.cache_write_tokens,
            context_ratio: tokenSpend.context_ratio,
          };
        }
      } catch {
        // Fall back to legacy files below.
      }

      const [input, output] = await Promise.allSettled([
        fetchJson<unknown>(`/traces/${entry.id}/input-context.json`),
        fetchText(`/traces/${entry.id}/skill-output.txt`),
      ]);
      const estimated = estimateTokens(
        input.status === 'fulfilled' ? input.value : null,
        output.status === 'fulfilled' ? output.value : null,
      );
      return { ...estimated, id: entry.id };
    }),
  );

  return metrics;
}

function candidateLabelFromIndex(payload: unknown): string {
  if (Array.isArray(payload) && payload.length > 0) {
    return String((payload[0] as CandidateRecord).id ?? 'baseline');
  }
  return 'baseline';
}

function getFailureTaxonomy(scores: ExtendedEvalScores): FailureTaxonomySummary | null {
  const deriveBranch = (bucketCounts: FailureBucketCounts | undefined) => {
    if (!bucketCounts) return undefined;
    const entries = Object.entries(bucketCounts) as Array<[keyof FailureBucketCounts, number]>;
    const dominant = entries.sort((a, b) => b[1] - a[1])[0]?.[0];
    return dominant === 'corpus_schema_config' ? 'corpus-first' : 'top-cluster-harness-first';
  };

  if (scores.failure_taxonomy?.bucket_counts) {
    return {
      ...scores.failure_taxonomy,
      branch_recommendation: deriveBranch(scores.failure_taxonomy.bucket_counts) ?? scores.failure_taxonomy.branch_recommendation,
    };
  }

  if (scores.failure_bucket_counts) {
    return {
      bucket_counts: scores.failure_bucket_counts,
      branch_recommendation: deriveBranch(scores.failure_bucket_counts) ?? scores.branch_recommendation,
    };
  }

  return null;
}

function formatBucketLabel(bucket: keyof FailureBucketCounts): string {
  if (bucket === 'corpus_schema_config') return 'Corpus / Schema / Config';
  if (bucket === 'skill_contract') return 'Skill Contract';
  if (bucket === 'harness_output') return 'Harness Output';
  return 'Unknown';
}

function formatBranchRecommendation(branch: FailureTaxonomySummary['branch_recommendation']): string {
  if (branch === 'corpus-first') return 'Corpus First';
  if (branch === 'top-cluster-harness-first') return 'Top Cluster Harness First';
  if (branch === 'mixed-investigate') return 'Mixed Investigate';
  return 'Unknown';
}

function recommendationTone(branch: FailureTaxonomySummary['branch_recommendation']): 'pass' | 'warn' | 'fail' {
  if (branch === 'top-cluster-harness-first') return 'fail';
  if (branch === 'mixed-investigate') return 'warn';
  return 'pass';
}

export function OverviewPanel({ onOpenTrace }: OverviewPanelProps) {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [traces, setTraces] = useState<TraceIndexEntry[]>([]);
  const [recentMetrics, setRecentMetrics] = useState<RecentTraceMetric[]>([]);
  const [candidateLabel, setCandidateLabel] = useState('baseline');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [loadedRuns, tracePayload, candidatesPayload] = await Promise.all([
          loadEvalRuns().catch(() => []),
          fetchJson<unknown>('/traces/index.json').catch(() => []),
          fetchJson<unknown>('/candidates-index.json').catch(() => []),
        ]);

        const normalizedTraces = normalizeTraceIndex(tracePayload);

        if (!cancelled) {
          setRuns(loadedRuns);
          setTraces(normalizedTraces);
          setCandidateLabel(candidateLabelFromIndex(candidatesPayload));
        }

        const metrics = await loadRecentTraceMetrics(normalizedTraces).catch(() => []);
        if (!cancelled) {
          setRecentMetrics(metrics);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={loadingStyle}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  if (!runs.length && !traces.length) {
    return <Text c={colors.textMuted}>No dashboard data found. Build eval and trace indexes to populate the operational overview.</Text>;
  }

  const latestRun = runs[runs.length - 1];
  const latestScores = (latestRun?.scores ?? {
    total: 0,
    pass: 0,
    fail: 0,
    skip: 0,
    pass_rate: 0,
    safety_failures: 0,
    safety_veto_cases: 0,
    schema_v2_cases: 0,
    dynamic_skip: 0,
    health: 'WARNING',
    categories: {},
  }) as ExtendedEvalScores;

  const trendData = runs.slice(-20).map((run) => ({
    label: run.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    pass_rate: run.scores.pass_rate,
  }));

  const tokenBurnData = recentMetrics.length
    ? recentMetrics.map((metric) => ({
        label: metric.id.slice(0, 8),
        input: metric.input_tokens,
        output: metric.output_tokens,
        cache: metric.cache_tokens,
      }))
    : [];

  const durationSamples = traces
    .map((trace) => trace.duration_ms)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const latencyBuckets = [
    { label: '<250', count: 0 },
    { label: '250-500', count: 0 },
    { label: '500-1000', count: 0 },
    { label: '1000+', count: 0 },
  ];
  durationSamples.forEach((sample) => {
    if (sample < 250) latencyBuckets[0].count += 1;
    else if (sample < 500) latencyBuckets[1].count += 1;
    else if (sample < 1000) latencyBuckets[2].count += 1;
    else latencyBuckets[3].count += 1;
  });

  const categoryData = Object.entries(latestScores.categories ?? {}).map(([name, category]) => ({
    name: name.replace(/-/g, ' '),
    pass: category.pass,
    fail: category.fail,
  }));

  const recentTraces = [...traces]
    .sort((a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime())
    .slice(0, 10);

  const avgContextRatio =
    recentMetrics.filter((metric) => metric.context_ratio !== null).reduce((sum, metric) => sum + (metric.context_ratio ?? 0), 0) /
      Math.max(1, recentMetrics.filter((metric) => metric.context_ratio !== null).length) || 0;

  const healthTone =
    latestScores.health === 'PASS' ? 'pass' : latestScores.health === 'WARNING' ? 'warn' : 'fail';
  const failureTaxonomy = getFailureTaxonomy(latestScores);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      <section
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${alpha.accentSoft} 0%, ${colors.surface} 58%, ${colors.surface} 100%)`,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <StatusPill tone={healthTone}>{latestScores.health}</StatusPill>
            <Badge variant="light" color="cyan" radius="sm">Candidate {candidateLabel}</Badge>
            <Text ff="monospace" fz={18} fw={500} c={colors.textPrimary}>
              {latestScores.pass_rate.toFixed(1)}% pass rate
            </Text>
            <Text c={colors.textSecondary} fz={13}>
              {latestScores.safety_failures} safety failures
            </Text>
            <Text c={colors.textSecondary} fz={13}>
              {latestScores.total} total cases
            </Text>
          </div>
          <Text c={colors.textSecondary} fz={12}>
            Latest eval {latestRun ? latestRun.timestamp.toLocaleString() : 'n/a'} | Candidate {candidateLabel}
          </Text>
        </div>
        <Text c={colors.textMuted} fz={12}>
          Observability-first shell. Token telemetry and candidate artifacts upgrade in place as Phase 1–3 indexes land.
        </Text>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <SignalChip icon={<IconShieldCheck size={14} />} label={`${latestScores.safety_failures} safety failures`} />
          <SignalChip icon={<IconWaveSquare size={14} />} label={`${durationSamples.length} latency samples`} />
          <SignalChip icon={<IconBinaryTree2 size={14} />} label={`${recentMetrics.length} recent token traces`} />
          {failureTaxonomy && (
            <SignalChip
              icon={<IconBinaryTree2 size={14} />}
              label={`Branch ${formatBranchRecommendation(failureTaxonomy.branch_recommendation)}`}
            />
          )}
        </div>
      </section>

      <div style={metricsGridStyle}>
        <MetricCard label="Pass Rate" value={`${latestScores.pass_rate.toFixed(1)}%`} tone={healthTone} />
        <MetricCard
          label="Safety Veto"
          value={latestScores.safety_failures > 0 ? `${latestScores.safety_failures} failing` : 'clear'}
          tone={latestScores.safety_failures > 0 ? 'fail' : 'pass'}
        />
        <MetricCard
          label="Token Spend"
          value={recentMetrics.length ? `${recentMetrics.reduce((sum, item) => sum + item.total_tokens, 0).toLocaleString()} est.` : 'awaiting'}
          tone="pass"
        />
        <MetricCard
          label="Context Ratio"
          value={recentMetrics.length ? avgContextRatio.toFixed(2) : 'n/a'}
          tone={avgContextRatio > 0.4 ? 'fail' : avgContextRatio > 0.35 ? 'warn' : 'pass'}
        />
        <MetricCard
          label="Latency p50"
          value={durationSamples.length ? `${Math.round(quantile(durationSamples, 0.5))}ms` : 'n/a'}
          tone="pass"
        />
        <MetricCard label="Active Candidate" value={candidateLabel} tone="pass" mono={false} />
      </div>

      <div style={chartGridStyle}>
        <PanelCard title="PASS RATE TREND">
          {trendData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="overview-pass-rate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} tickLine={false} />
                <YAxis domain={[0, 100]} tick={axisTick} axisLine={axisLine} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Area type="monotone" dataKey="pass_rate" stroke={colors.accent} fill="url(#overview-pass-rate)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Eval trend data unavailable.</EmptyChart>
          )}
        </PanelCard>

        <PanelCard title="TOKEN BURN">
          {tokenBurnData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tokenBurnData}>
                <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} tickLine={false} />
                <YAxis tick={axisTick} axisLine={axisLine} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Bar dataKey="input" stackId="tokens" fill={colors.info} radius={[2, 2, 0, 0]} />
                <Bar dataKey="output" stackId="tokens" fill={colors.accent} />
                <Bar dataKey="cache" stackId="tokens" fill={colors.textSecondary} radius={[0, 0, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Awaiting `trace-envelope.json` token telemetry.</EmptyChart>
          )}
        </PanelCard>

        <PanelCard title="LATENCY DISTRIBUTION">
          {durationSamples.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={latencyBuckets}>
                <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} tickLine={false} />
                <YAxis tick={axisTick} axisLine={axisLine} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Bar dataKey="count" fill={colors.warning} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>No latency samples found in the current trace index.</EmptyChart>
          )}
        </PanelCard>
      </div>

      <div style={chartGridStyle}>
        <PanelCard title="FAILURE TAXONOMY">
          {failureTaxonomy ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <Text c={colors.textSecondary} fz={13}>
                  Counts come from the eval artifact. The dashboard does not recompute taxonomy splits.
                </Text>
                <StatusPill tone={recommendationTone(failureTaxonomy.branch_recommendation)}>
                  {formatBranchRecommendation(failureTaxonomy.branch_recommendation)}
                </StatusPill>
              </div>
              <div style={metricsGridStyle}>
                {(['corpus_schema_config', 'skill_contract', 'harness_output'] as Array<keyof FailureBucketCounts>).map((bucket) => (
                  <MetricCard
                    key={bucket}
                    label={formatBucketLabel(bucket)}
                    value={`${failureTaxonomy.bucket_counts[bucket] ?? 0}`}
                    tone={bucket === 'harness_output' ? 'fail' : bucket === 'skill_contract' ? 'warn' : 'pass'}
                    mono={false}
                  />
                ))}
              </div>
              {(failureTaxonomy.normalized_cases != null || failureTaxonomy.legacy_cases != null) && (
                <Text c={colors.textMuted} fz={12}>
                  Normalized {failureTaxonomy.normalized_cases ?? 0} | Legacy {failureTaxonomy.legacy_cases ?? 0}
                </Text>
              )}
            </div>
          ) : (
            <EmptyChart>Awaiting Phase 1 failure taxonomy fields in the latest eval output.</EmptyChart>
          )}
        </PanelCard>

        <PanelCard title="SAFETY STATUS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Text ff="monospace" fz={24} fw={500} c={latestScores.safety_failures > 0 ? colors.critical : colors.accent}>
              {latestScores.safety_failures > 0 ? 'attention required' : 'all clear'}
            </Text>
            <Text c={colors.textSecondary} fz={13}>
              Safety-tagged regressions fail the candidate outright. The dashboard reflects the latest aggregate health state.
            </Text>
            <Text c={colors.textMuted} fz={12}>
              Current run: {latestScores.safety_failures} failures | {latestScores.safety_veto_cases} veto-tagged cases tracked
            </Text>
          </div>
        </PanelCard>

        <PanelCard title="CATEGORY BREAKDOWN">
          {categoryData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={axisTick} axisLine={axisLine} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={axisTick} axisLine={axisLine} tickLine={false} width={130} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Bar dataKey="pass" stackId="cases" fill={colors.accent} radius={[0, 2, 2, 0]} />
                <Bar dataKey="fail" stackId="cases" fill={colors.critical} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>No category data in the current eval payload.</EmptyChart>
          )}
        </PanelCard>
      </div>

      <PanelCard title="RECENT TRACES">
        {recentTraces.length ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['ID', 'Skill', 'Duration', 'Tokens', 'Safety', 'Status'].map((header) => (
                    <th key={header} style={stickyTableHeaderStyle}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTraces.map((trace) => {
                  const metric = recentMetrics.find((item) => item.id === trace.id);
                  const tone = statusToTone(trace.status);
                  return (
                    <tr key={trace.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={tableCellStyle}>
                        <button onClick={() => onOpenTrace?.(trace.id)} style={linkButtonStyle}>
                          {trace.id}
                        </button>
                      </td>
                      <td style={tableCellStyle}>{trace.skill}</td>
                      <td style={tableCellStyle}>{trace.duration_ms != null ? `${trace.duration_ms}ms` : 'n/a'}</td>
                      <td style={tableCellStyle}>{metric ? metric.total_tokens.toLocaleString() : 'n/a'}</td>
                      <td style={{ ...tableCellStyle, color: toneColor(tone) }}>{tone}</td>
                      <td style={tableCellStyle}>{trace.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Text c={colors.textMuted}>No traces available.</Text>
        )}
      </PanelCard>
    </div>
  );
}

function SignalChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 40,
        padding: '8px 12px',
        border: `1px solid ${colors.border}`,
        borderRadius: 999,
        background: alpha.surfaceRaised,
      }}
    >
      <span aria-hidden="true" style={{ display: 'inline-flex', color: colors.accent }}>{icon}</span>
      <Text ff="monospace" fz={11} c={colors.textSecondary}>{label}</Text>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  mono = true,
}: {
  label: string;
  value: string;
  tone: 'pass' | 'warn' | 'fail';
  mono?: boolean;
}) {
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 18, background: colors.surface, padding: 16 }}>
      <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 8 }}>
        {label}
      </Text>
      <Text ff={mono ? 'monospace' : '"Outfit", sans-serif'} fz={22} fw={500} c={toneColor(tone)}>
        {value}
      </Text>
    </div>
  );
}

function PanelCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 18, background: colors.surface, padding: 20 }}>
      <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
        {title}
      </Text>
      {children}
    </section>
  );
}

function StatusPill({ tone, children }: { tone: 'pass' | 'warn' | 'fail'; children: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        border: `1px solid ${toneColor(tone)}`,
        color: toneColor(tone),
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 12,
        textTransform: 'lowercase',
      }}
    >
      {children}
    </span>
  );
}

function EmptyChart({ children }: { children: string }) {
  return (
    <div style={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Text c={colors.textMuted} fz={12}>
        {children}
      </Text>
    </div>
  );
}

const metricsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
};

const chartGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
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
  borderRadius: 4,
  fontSize: 12,
  padding: '8px 12px',
};

const tooltipLabelStyle: CSSProperties = {
  color: colors.textSecondary,
  marginBottom: 8,
};

const tableHeaderStyle: CSSProperties = {
  padding: '8px 16px 12px 0',
  borderBottom: `1px solid ${colors.borderLight}`,
  color: colors.textSecondary,
  fontWeight: 500,
  fontSize: 12,
  textAlign: 'left',
};

const stickyTableHeaderStyle: CSSProperties = {
  ...tableHeaderStyle,
  position: 'sticky',
  top: 0,
  background: colors.surface,
  zIndex: 1,
};

const tableCellStyle: CSSProperties = {
  padding: '12px 16px 12px 0',
  color: colors.textPrimary,
  fontSize: 13,
};

const linkButtonStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.info,
  cursor: 'pointer',
  padding: 0,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 12,
};

const loadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 64,
};
