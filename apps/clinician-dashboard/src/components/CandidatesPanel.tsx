import { useEffect, useState, type CSSProperties } from 'react';
import { Badge, Loader, Select, Text } from '@mantine/core';
import { alpha, colors } from '@noah-rn/ui-tokens';
import {
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CandidateRecord, EvalScores, ExtendedEvalScores } from '../types';
import { parseScoresTimestamp } from '../utils/time';

interface CandidateDiffPayload {
  pair_key: string;
  score_delta: number;
  changed_cases: Array<{
    case_id: string;
    left: string | null;
    right: string | null;
  }>;
  rationale_diff: string[];
  file_diffs: Array<{
    path: string;
    change_type: string;
    diff_lines: string[];
  }>;
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

async function fallbackCandidatesFromEvalRuns(): Promise<CandidateRecord[]> {
  const indexText = await fetchText('/evals/index.txt');
  const files = indexText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const runs = await Promise.all(
    files.map(async (filename, index) => {
      const scores = await fetchJson<EvalScores>(`/evals/${filename}`);
      const timestamp = parseScoresTimestamp(filename);
      const extended: ExtendedEvalScores = {
        ...scores,
        weighted_score: scores.pass_rate,
        veto_triggered: scores.safety_failures > 0,
      };
      return {
        id: index === files.length - 1 ? 'baseline' : filename.replace(/^scores-/, '').replace(/\.json$/, ''),
        timestamp: timestamp.toISOString(),
        scores: extended,
        rationale_summary: 'Fallback candidate synthesized from historical eval output.',
        status: 'accepted' as const,
      };
    }),
  );

  return runs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function asPercentScore(value: number | undefined, fallback: number): number {
  if (typeof value === 'number') {
    return value <= 1 ? value * 100 : value;
  }
  return fallback;
}

function radarMetrics(candidate: CandidateRecord) {
  const total = Math.max(candidate.scores.total, 1);
  return [
    { metric: 'Weighted', left: asPercentScore(candidate.scores.weighted_score, candidate.scores.pass_rate) },
    { metric: 'Pass', left: candidate.scores.pass_rate },
    { metric: 'Safety', left: Math.max(0, 100 - candidate.scores.safety_failures * 20) },
    { metric: 'Coverage', left: (candidate.scores.schema_v2_cases / total) * 100 || 0 },
    { metric: 'Dynamic', left: Math.max(0, 100 - candidate.scores.dynamic_skip * 10) },
  ];
}

function diffRows(left: CandidateRecord, right: CandidateRecord) {
  const leftCases = new Map((left.scores.per_case_scores ?? []).map((entry) => [entry.case_id, entry]));
  const rightCases = new Map((right.scores.per_case_scores ?? []).map((entry) => [entry.case_id, entry]));
  const ids = [...new Set([...leftCases.keys(), ...rightCases.keys()])];
  return ids
    .map((id) => ({
      id,
      left: leftCases.get(id)?.status ?? '—',
      right: rightCases.get(id)?.status ?? '—',
      delta:
        leftCases.get(id)?.status === rightCases.get(id)?.status
          ? 'unchanged'
          : `${leftCases.get(id)?.status ?? '—'} -> ${rightCases.get(id)?.status ?? '—'}`,
    }))
    .filter((row) => row.delta !== 'unchanged');
}

export function CandidatesPanel() {
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [candidateDiffs, setCandidateDiffs] = useState<Record<string, CandidateDiffPayload>>({});
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [loaded, diffPayload] = await Promise.all([
          fetchJson<CandidateRecord[]>('/candidates-index.json').catch(async () => {
            setUsingFallback(true);
            return fallbackCandidatesFromEvalRuns();
          }),
          fetchJson<Record<string, CandidateDiffPayload>>('/candidate-diffs.json').catch(() => ({})),
        ]);

        if (!cancelled) {
          setCandidateDiffs(diffPayload);
        }
        if (!cancelled) {
          const sorted = [...loaded].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setCandidates(sorted);
          setLeftId(sorted.at(-2)?.id ?? sorted.at(0)?.id ?? null);
          setRightId(sorted.at(-1)?.id ?? sorted.at(0)?.id ?? null);
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

  if (!candidates.length) {
    return <Text c={colors.textMuted}>No candidate history found. Publish `candidates-index.json` to enable comparison mode.</Text>;
  }

  const left = candidates.find((candidate) => candidate.id === leftId) ?? candidates[0];
  const right = candidates.find((candidate) => candidate.id === rightId) ?? candidates[candidates.length - 1];
  const selectedDiff = candidateDiffs[`${left.id}::${right.id}`] ?? null;

  const radarData = radarMetrics(left).map((row, index) => ({
    metric: row.metric,
    left: row.left,
    right: radarMetrics(right)[index]?.left ?? 0,
  }));

  const historyData = candidates.map((candidate, index) => ({
    iteration: index + 1,
    weighted_score: asPercentScore(candidate.scores.weighted_score, candidate.scores.pass_rate),
    label: candidate.id,
  }));

  const changedCases = selectedDiff?.changed_cases?.length ? selectedDiff.changed_cases.map((row) => ({
    id: row.case_id,
    left: row.left ?? '—',
    right: row.right ?? '—',
    delta: row.left === row.right ? 'unchanged' : `${row.left ?? '—'} -> ${row.right ?? '—'}`,
  })) : diffRows(left, right);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      {usingFallback && (
        <Text c={colors.warning} fz={12}>
          Candidate artifacts are missing. This panel is comparing eval runs as pseudo-candidates until optimization indexes are built.
        </Text>
      )}

      <section style={{ ...panelStyle, background: `linear-gradient(135deg, ${alpha.accentSoft} 0%, ${colors.surface} 60%, ${colors.surface} 100%)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>
              COMPARISON VIEW
            </Text>
            <Badge variant="light" color="cyan" radius="sm">{left.id} vs {right.id}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Select
              data={candidates.map((candidate) => ({ value: candidate.id, label: candidate.id }))}
              value={left.id}
              onChange={setLeftId}
              allowDeselect={false}
              size="xs"
              styles={selectStyles}
            />
            <Select
              data={candidates.map((candidate) => ({ value: candidate.id, label: candidate.id }))}
              value={right.id}
              onChange={setRightId}
              allowDeselect={false}
              size="xs"
              styles={selectStyles}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }}>
          <div style={subPanelStyle}>
            <Text fz={12} c={colors.textSecondary} mb={12}>
              Metric radar
            </Text>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={colors.borderLight} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: colors.textSecondary, fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: colors.textMuted, fontSize: 10 }} />
                <Radar dataKey="left" name={left.id} stroke={colors.info} fill={colors.info} fillOpacity={0.18} />
                <Radar dataKey="right" name={right.id} stroke={colors.accent} fill={colors.accent} fillOpacity={0.18} />
                <Legend wrapperStyle={{ color: colors.textSecondary, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={subPanelStyle}>
            <Text fz={12} c={colors.textSecondary} mb={12}>
              Headline diffs
            </Text>
            <ComparisonRow
              label="Weighted score"
              left={asPercentScore(left.scores.weighted_score, left.scores.pass_rate)}
              right={asPercentScore(right.scores.weighted_score, right.scores.pass_rate)}
              suffix="%"
            />
            <ComparisonRow label="Pass rate" left={left.scores.pass_rate} right={right.scores.pass_rate} suffix="%" />
            <ComparisonRow label="Failures" left={left.scores.fail} right={right.scores.fail} />
            <ComparisonRow label="Safety failures" left={left.scores.safety_failures} right={right.scores.safety_failures} />
            <ComparisonRow label="Schema v2 cases" left={left.scores.schema_v2_cases} right={right.scores.schema_v2_cases} />
            <Text c={colors.textMuted} fz={12} mt={16}>
              {right.rationale_summary}
            </Text>
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
          CASE OUTCOME DIFFS
        </Text>
        {changedCases.length ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Case', left.id, right.id, 'Delta'].map((header) => (
                    <th key={header} style={stickyTableHeaderStyle}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {changedCases.map((row) => (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ ...tableCellStyle, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.id}>{row.id}</td>
                    <td style={tableCellStyle}>{row.left}</td>
                    <td style={tableCellStyle}>{row.right}</td>
                    <td style={{ ...tableCellStyle, color: row.delta.includes('fail') ? colors.critical : colors.accent }}>{row.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Text c={colors.textMuted}>
            Detailed per-case comparisons are unavailable with the current payload. Publish `per_case_scores` to unlock regression diffs.
          </Text>
        )}
      </section>

      <section style={panelStyle}>
        <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
          FILE DIFFS
        </Text>
        {selectedDiff?.file_diffs?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedDiff.file_diffs.map((fileDiff) => (
              <details key={fileDiff.path} style={{ border: `1px solid ${colors.borderLight}`, background: colors.bg }}>
                <summary style={{ ...tableCellStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{fileDiff.path}</span>
                  <span style={{ color: fileDiff.change_type === 'removed' ? colors.critical : fileDiff.change_type === 'added' ? colors.accent : colors.warning }}>
                    {fileDiff.change_type}
                  </span>
                </summary>
                <DiffBlock lines={fileDiff.diff_lines} />
              </details>
            ))}
          </div>
        ) : (
          <Text c={colors.textMuted}>
            Candidate diff output is not available yet for the selected pair.
          </Text>
        )}
      </section>

      <section style={panelStyle}>
        <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
          HISTORY VIEW
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }}>
          <div style={subPanelStyle}>
            <Text fz={12} c={colors.textSecondary} mb={12}>
              Weighted score trend
            </Text>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={historyData}>
                <XAxis dataKey="iteration" tick={{ fill: colors.textSecondary, fontSize: 11 }} axisLine={{ stroke: colors.borderLight }} tickLine={false} />
                <YAxis tick={{ fill: colors.textSecondary, fontSize: 11 }} axisLine={{ stroke: colors.borderLight }} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                <Line type="monotone" dataKey="weighted_score" stroke={colors.accent} strokeWidth={2} dot={{ r: 3, fill: colors.accent }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {candidates.slice().reverse().map((candidate) => (
              <div key={candidate.id} style={subPanelStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <Text ff="monospace" fz={13} c={colors.textPrimary}>
                    {candidate.id}
                  </Text>
                  <Text ff="monospace" fz={12} c={candidate.scores.safety_failures ? colors.critical : colors.accent}>
                    {asPercentScore(candidate.scores.weighted_score, candidate.scores.pass_rate).toFixed(1)}%
                  </Text>
                </div>
                <Text c={colors.textSecondary} fz={12} mb={8}>
                  {new Date(candidate.timestamp).toLocaleString()}
                </Text>
                <Text c={colors.textMuted} fz={12}>
                  {candidate.rationale_summary}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ComparisonRow({
  label,
  left,
  right,
  suffix = '',
}: {
  label: string;
  left: number;
  right: number;
  suffix?: string;
}) {
  const delta = right - left;
  const tone = delta > 0 ? colors.accent : delta < 0 ? colors.critical : colors.textSecondary;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: 12, padding: '8px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
      <Text c={colors.textPrimary} fz={13}>
        {label}
      </Text>
      <Text ff="monospace" c={colors.textSecondary} fz={12}>
        {left}{suffix}
      </Text>
      <Text ff="monospace" c={colors.textPrimary} fz={12}>
        {right}{suffix}
      </Text>
      <Text ff="monospace" c={tone} fz={12}>
        {delta >= 0 ? '+' : ''}
        {delta.toFixed(1)}
        {suffix}
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

const subPanelStyle: CSSProperties = {
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 16,
  background: colors.bg,
  padding: 16,
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

function DiffBlock({ lines }: { lines: string[] }) {
  const safeLines = lines.length ? lines : ['No line diff captured.'];
  return (
    <div style={{ margin: 0, background: colors.surface, color: colors.textSecondary, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, maxHeight: 320, overflowY: 'auto' }}>
      {safeLines.map((line, index) => {
        const background = line.startsWith('+')
          ? 'rgba(34, 197, 94, 0.10)'
          : line.startsWith('-')
            ? 'rgba(225, 29, 72, 0.10)'
            : 'transparent';
        return (
          <div key={`${index}-${line}`} style={{ padding: '4px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background }}>
            {line || ' '}
          </div>
        );
      })}
    </div>
  );
}

const loadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 64,
};
