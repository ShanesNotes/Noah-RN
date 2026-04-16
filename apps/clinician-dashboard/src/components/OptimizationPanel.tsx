import { useEffect, useState, type CSSProperties } from 'react';
import { Badge, Loader, Text } from '@mantine/core';
import { alpha, colors } from '@noah-rn/ui-tokens';
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  CandidateRecord,
  ExtendedEvalScores,
  FailureBucketCounts,
  FailureTaxonomySummary,
  OptimizationState,
} from '../types';

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

async function loadLatestEvalScores(): Promise<ExtendedEvalScores | null> {
  const indexText = await fetchText('/evals/index.txt').catch(() => '');
  const latest = indexText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!latest) return null;
  return fetchJson<ExtendedEvalScores>(`/evals/${latest}`).catch(() => null);
}

function deriveStateFromCandidates(candidates: CandidateRecord[]): OptimizationState {
  const asPercentScore = (value: number | undefined, fallback: number) => (
    typeof value === 'number' ? (value <= 1 ? value * 100 : value) : fallback
  );
  return {
    phase: 'unknown',
    cadence: 'manual',
    iterations_completed: candidates.length,
    convergence_trend: candidates.map((candidate, index) => ({
      iteration: index + 1,
      weighted_score: asPercentScore(candidate.scores.weighted_score, candidate.scores.pass_rate),
      veto_count: candidate.scores.safety_failures,
    })),
  };
}

function getFailureTaxonomy(
  state: OptimizationState | null,
  latestEval: ExtendedEvalScores | null,
): FailureTaxonomySummary | null {
  if (state?.failure_taxonomy?.bucket_counts) {
    return state.failure_taxonomy;
  }
  if (state?.failure_bucket_counts) {
    return {
      bucket_counts: state.failure_bucket_counts,
      branch_recommendation: state.branch_recommendation,
    };
  }
  if (latestEval?.failure_taxonomy?.bucket_counts) {
    return latestEval.failure_taxonomy;
  }
  if (latestEval?.failure_bucket_counts) {
    return {
      bucket_counts: latestEval.failure_bucket_counts,
      branch_recommendation: latestEval.branch_recommendation,
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

function recommendationBadgeColor(branch: FailureTaxonomySummary['branch_recommendation']): string {
  if (branch === 'top-cluster-harness-first') return 'red';
  if (branch === 'mixed-investigate') return 'yellow';
  return 'green';
}

export function OptimizationPanel() {
  const [state, setState] = useState<OptimizationState | null>(null);
  const [latestEval, setLatestEval] = useState<ExtendedEvalScores | null>(null);
  const [failureModes, setFailureModes] = useState<string>('');
  const [optimizationLog, setOptimizationLog] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [loadedState, loadedLatestEval, loadedFailures, loadedLog] = await Promise.all([
          fetchJson<OptimizationState>('/optimization-state.json').catch(async () => {
            const candidates = await fetchJson<CandidateRecord[]>('/candidates-index.json').catch(() => []);
            if (candidates.length) {
              setUsingFallback(true);
              return deriveStateFromCandidates(candidates);
            }
            return {
              phase: 'unknown',
              cadence: 'manual',
              iterations_completed: 0,
              convergence_trend: [],
            } satisfies OptimizationState;
          }),
          loadLatestEvalScores(),
          fetchText('/failure-modes.md').catch(() => ''),
          fetchText('/optimization-log.md').catch(() => ''),
        ]);

        if (!cancelled) {
          setState(loadedState);
          setLatestEval(loadedLatestEval);
          setFailureModes(loadedFailures);
          setOptimizationLog(loadedLog);
        }
      } finally {
        if (!cancelled) setLoading(false);
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

  if (!state) {
    return <Text c={colors.textMuted}>Optimization telemetry is unavailable.</Text>;
  }

  const failureTaxonomy = getFailureTaxonomy(state, latestEval);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      {usingFallback && (
        <Text c={colors.warning} fz={12}>
          Optimization artifacts are incomplete. Loop status is currently derived from candidate history only.
        </Text>
      )}

      <section style={{ ...panelStyle, background: `linear-gradient(135deg, ${alpha.accentSoft} 0%, ${colors.surface} 60%, ${colors.surface} 100%)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>
            LOOP STATUS
          </Text>
          <Badge variant="light" color="cyan" radius="sm">{state.iterations_completed} iterations</Badge>
          {failureTaxonomy && (
            <Badge variant="light" color={recommendationBadgeColor(failureTaxonomy.branch_recommendation)} radius="sm">
              {formatBranchRecommendation(failureTaxonomy.branch_recommendation)}
            </Badge>
          )}
        </div>
        <div style={statusGridStyle}>
          <StatusItem label="Phase" value={state.phase} />
          <StatusItem label="Last cycle" value={state.last_cycle ? new Date(state.last_cycle).toLocaleString() : 'n/a'} />
          <StatusItem label="Cadence" value={state.cadence} />
          <StatusItem label="Proposer" value={state.proposer_model ?? 'n/a'} />
          <StatusItem label="Acceptance rate" value={state.acceptance_rate != null ? `${state.acceptance_rate}%` : 'n/a'} />
          <StatusItem label="Iterations" value={`${state.iterations_completed}`} />
        </div>
      </section>

      <section style={panelStyle}>
        <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
          PHASE 1 FAILURE TAXONOMY
        </Text>
        {failureTaxonomy ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Text c={colors.textSecondary} fz={13}>
              Counts are sourced from published eval or optimization artifacts so the dashboard stays aligned with the pipeline output.
            </Text>
            <div style={statusGridStyle}>
              {(['corpus_schema_config', 'skill_contract', 'harness_output'] as Array<keyof FailureBucketCounts>).map((bucket) => (
                <StatusItem key={bucket} label={formatBucketLabel(bucket)} value={`${failureTaxonomy.bucket_counts[bucket] ?? 0}`} />
              ))}
              <StatusItem label="Recommendation" value={formatBranchRecommendation(failureTaxonomy.branch_recommendation)} />
            </div>
            {(failureTaxonomy.normalized_cases != null || failureTaxonomy.legacy_cases != null) && (
              <Text c={colors.textMuted} fz={12}>
                Normalized {failureTaxonomy.normalized_cases ?? 0} | Legacy {failureTaxonomy.legacy_cases ?? 0}
              </Text>
            )}
          </div>
        ) : (
          <Text c={colors.textMuted}>Awaiting Phase 1 taxonomy fields in published artifacts.</Text>
        )}
      </section>

      <section style={panelStyle}>
        <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
          CONVERGENCE
        </Text>
        {state.convergence_trend.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={state.convergence_trend}>
              <XAxis dataKey="iteration" tick={{ fill: colors.textSecondary, fontSize: 11 }} axisLine={{ stroke: colors.borderLight }} tickLine={false} />
              <YAxis yAxisId="score" domain={[0, 100]} tick={{ fill: colors.textSecondary, fontSize: 11 }} axisLine={{ stroke: colors.borderLight }} tickLine={false} />
              <YAxis yAxisId="veto" orientation="right" tick={{ fill: colors.textSecondary, fontSize: 11 }} axisLine={{ stroke: colors.borderLight }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              <Bar yAxisId="veto" dataKey="veto_count" fill={colors.critical} barSize={20} />
              <Line yAxisId="score" type="monotone" dataKey="weighted_score" stroke={colors.accent} strokeWidth={2} dot={{ r: 3, fill: colors.accent }} />
              <Line yAxisId="score" type="monotone" dataKey={() => 95} stroke={colors.textMuted} strokeDasharray="4 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Text c={colors.textMuted}>No convergence history recorded yet.</Text>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }}>
        <section style={panelStyle}>
          <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
            FAILURE MODES
          </Text>
          {failureModes ? (
            <pre style={preStyle}>{failureModes}</pre>
          ) : (
            <Text c={colors.textMuted}>No `failure-modes.md` published yet.</Text>
          )}
        </section>

        <section style={panelStyle}>
          <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
            OPTIMIZATION LOG
          </Text>
          {optimizationLog ? (
            <pre style={preStyle}>{optimizationLog}</pre>
          ) : (
            <Text c={colors.textMuted}>No `OPTIMIZATION-LOG.md` published yet.</Text>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${colors.borderLight}`, borderRadius: 16, background: colors.bg, padding: 16 }}>
      <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 8 }}>
        {label}
      </Text>
      <Text ff="monospace" fz={16} c={colors.textPrimary}>
        {value}
      </Text>
    </div>
  );
}

const panelStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  background: colors.surface,
  padding: 20,
};

const statusGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
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

const preStyle: CSSProperties = {
  margin: 0,
  padding: 16,
  background: colors.bg,
  color: colors.textSecondary,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 420,
  overflowY: 'auto',
};

const loadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 64,
};
