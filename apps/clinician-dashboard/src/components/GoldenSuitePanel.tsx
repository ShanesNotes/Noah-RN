import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Alert, Loader, Text, TextInput } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { colors } from '../theme';
import type { GoldenCase, TraceIndexEntry, TraceIndexManifest } from '../types';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return response.json() as Promise<T>;
}

function normalizeTraceIndex(payload: unknown): TraceIndexEntry[] {
  if (Array.isArray(payload)) return payload as TraceIndexEntry[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as TraceIndexManifest).traces)) {
    return (payload as TraceIndexManifest).traces;
  }
  return [];
}

function traceOutcome(status: string): 'pass' | 'fail' | 'skip' {
  const normalized = status.toLowerCase();
  if (normalized.includes('fail')) return 'fail';
  if (normalized.includes('skip')) return 'skip';
  return 'pass';
}

function fallbackCasesFromTraces(entries: TraceIndexEntry[]): GoldenCase[] {
  return entries
    .filter((entry) => !entry.id.startsWith('shift-report-2026'))
    .map((entry) => ({
      test_id: entry.id,
      skill: entry.skill,
      severity: 'unknown' as const,
      safety_veto: entry.id.startsWith('safety-'),
      description: 'Legacy trace fallback until golden-suite-index.json is built.',
      user_query: '',
      clinical_context: '',
      scoring_rubric: {
        critical_items: [],
        important_items: [],
        nice_to_have: [],
      },
      latest_result: traceOutcome(entry.status),
      latest_score: traceOutcome(entry.status) === 'pass' ? 100 : 0,
    }))
    .sort((a, b) => a.test_id.localeCompare(b.test_id));
}

function familyFromCaseId(testId: string): string {
  return testId.split('-')[0] || 'misc';
}

export function GoldenSuitePanel() {
  const [cases, setCases] = useState<GoldenCase[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const goldenCases = await fetchJson<GoldenCase[]>('/golden-suite-index.json');
        const normalizedCases = Array.isArray(goldenCases) ? goldenCases : [];

        if (!normalizedCases.length) {
          const tracePayload = await fetchJson<unknown>('/traces/index.json').catch(() => []);
          if (!cancelled) {
            setUsingFallback(true);
            setCases(fallbackCasesFromTraces(normalizeTraceIndex(tracePayload)));
          }
          return;
        }

        if (!cancelled) {
          setUsingFallback(false);
          setLoadError(null);
          setCases(normalizedCases);
        }
      } catch {
        if (!cancelled) {
          setLoadError('Golden suite index not built. Run npm run predev in apps/clinician-dashboard to stage golden-suite-index.json.');
          setCases([]);
          setUsingFallback(false);
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

  const families = useMemo(() => {
    return [...new Set(cases.map((item) => familyFromCaseId(item.test_id)))].sort();
  }, [cases]);

  const severities = ['critical', 'high', 'medium', 'low', 'unknown'];

  const filteredCases = cases.filter((item) => {
    const matchesText =
      !filter ||
      item.test_id.toLowerCase().includes(filter.toLowerCase()) ||
      item.skill.toLowerCase().includes(filter.toLowerCase()) ||
      item.description.toLowerCase().includes(filter.toLowerCase());
    const matchesFamily = !selectedFamily || familyFromCaseId(item.test_id) === selectedFamily;
    const matchesSeverity = !selectedSeverity || item.severity === selectedSeverity;
    return matchesText && matchesFamily && matchesSeverity;
  });

  const heatmap = severities.map((severity) => ({
    severity,
    cells: families.map((family) => {
      const group = cases.filter((item) => item.severity === severity && familyFromCaseId(item.test_id) === family);
      const passCount = group.filter((item) => item.latest_result === 'pass').length;
      const passRate = group.length ? Math.round((passCount / group.length) * 100) : null;
      return { family, total: group.length, passRate };
    }),
  }));

  if (loading) {
    return (
      <div style={loadingStyle}>
        <Loader size="sm" color={colors.info} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      {loadError && (
        <Alert variant="light" color="red" icon={<IconAlertCircle size={16} />}>
          {loadError}
        </Alert>
      )}

      {usingFallback && !loadError && (
        <Text c={colors.warning} fz={12}>
          `golden-suite-index.json` loaded empty. Rendering a trace-derived fallback inventory with unknown severities until compiled golden cases are published.
        </Text>
      )}

      <section style={panelStyle}>
        <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
          COVERAGE HEATMAP
        </Text>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 720, width: '100%' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>severity</th>
                {families.map((family) => (
                  <th key={family} style={tableHeaderStyle}>
                    {family}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.map((row) => (
                <tr key={row.severity}>
                  <td style={tableRowLabelStyle}>{row.severity}</td>
                  {row.cells.map((cell) => {
                    const background =
                      cell.passRate == null
                        ? colors.surface
                        : cell.passRate === 100
                          ? 'rgba(34, 197, 94, 0.18)'
                          : cell.passRate >= 70
                            ? 'rgba(250, 204, 21, 0.18)'
                            : 'rgba(239, 68, 68, 0.18)';

                    return (
                      <td key={`${row.severity}-${cell.family}`} style={{ padding: 6 }}>
                        <button
                          onClick={() => {
                            setSelectedFamily(cell.family);
                            setSelectedSeverity(row.severity);
                          }}
                          style={{
                            width: '100%',
                            minHeight: 56,
                            border: `1px solid ${colors.borderLight}`,
                            background,
                            color: colors.textPrimary,
                            cursor: cell.total ? 'pointer' : 'default',
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: 12,
                          }}
                        >
                          {cell.total ? `${cell.passRate}% (${cell.total})` : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>
            CASE TABLE
          </Text>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextInput
              value={filter}
              onChange={(event) => setFilter(event.currentTarget.value)}
              placeholder="Filter by case ID or skill"
              size="xs"
              variant="unstyled"
              styles={{
                input: {
                  borderBottom: `1px solid ${colors.border}`,
                  borderRadius: 0,
                  paddingLeft: 0,
                  color: colors.textPrimary,
                  minWidth: 220,
                },
              }}
            />
            {(selectedFamily || selectedSeverity) && (
              <button
                onClick={() => {
                  setSelectedFamily(null);
                  setSelectedSeverity(null);
                }}
                style={clearButtonStyle}
              >
                clear filters
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredCases.map((item) => (
            <details key={item.test_id} style={{ border: `1px solid ${colors.borderLight}`, background: colors.bg }}>
              <summary style={summaryStyle}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Text ff="monospace" fz={12} c={colors.textPrimary}>
                    {item.test_id}
                  </Text>
                  <Text fz={12} c={colors.textSecondary}>
                    {item.skill}
                  </Text>
                  <Badge tone={item.latest_result === 'fail' ? 'fail' : item.latest_result === 'skip' ? 'warn' : 'pass'}>
                    {item.latest_result ?? 'pending'}
                  </Badge>
                  {item.safety_veto && <Badge tone="fail">veto</Badge>}
                </div>
                <Text ff="monospace" fz={12} c={colors.textMuted}>
                  {item.latest_score != null ? `${item.latest_score}` : 'n/a'}
                </Text>
              </summary>
              <div style={{ padding: 16, borderTop: `1px solid ${colors.borderLight}`, display: 'grid', gap: 12 }}>
                <CaseField label="Severity" value={item.severity} />
                <CaseField label="Description" value={item.description || 'No description compiled.'} />
                <CaseField label="User Query" value={item.user_query || 'Awaiting v2 schema fields.'} />
                <CaseField label="Clinical Context" value={item.clinical_context || 'Awaiting compiled case context.'} />
                <CaseField
                  label="Scoring Rubric"
                  value={
                    [
                      `critical: ${item.scoring_rubric.critical_items.join(', ') || '—'}`,
                      `important: ${item.scoring_rubric.important_items.join(', ') || '—'}`,
                      `nice-to-have: ${item.scoring_rubric.nice_to_have.join(', ') || '—'}`,
                    ].join('\n')
                  }
                  mono
                />
              </div>
            </details>
          ))}

          {!filteredCases.length && <Text c={colors.textMuted}>No cases match the active filters.</Text>}
        </div>
      </section>

      <section style={panelStyle}>
        <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 16 }}>
          REGRESSION TIMELINE
        </Text>
        {cases.some((item) => item.history?.length) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cases
              .filter((item) => item.history?.length)
              .slice(0, 16)
              .map((item) => (
                <div key={item.test_id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'center' }}>
                  <Text ff="monospace" fz={12} c={colors.textPrimary}>
                    {item.test_id}
                  </Text>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {item.history?.map((point) => (
                      <div
                        key={`${item.test_id}-${point.candidate_id}`}
                        title={`${point.candidate_id}: ${point.result}`}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background:
                            point.result === 'pass'
                              ? colors.accent
                              : point.result === 'skip'
                                ? colors.warning
                                : colors.critical,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <Text c={colors.textMuted}>
            Candidate-by-case history is not available yet. This panel will light up when regression-matrix data is published.
          </Text>
        )}
      </section>
    </div>
  );
}

function CaseField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </Text>
      <Text ff={mono ? 'monospace' : '"Outfit", sans-serif'} fz={13} c={colors.textPrimary} style={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </Text>
    </div>
  );
}

function Badge({ tone, children }: { tone: 'pass' | 'warn' | 'fail'; children: string }) {
  const color = tone === 'pass' ? colors.accent : tone === 'warn' ? colors.warning : colors.critical;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${color}`,
        color,
        padding: '2px 6px',
        fontSize: 11,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      {children}
    </span>
  );
}

const panelStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  padding: 20,
};

const summaryStyle: CSSProperties = {
  listStyle: 'none',
  cursor: 'pointer',
  padding: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
};

const tableHeaderStyle: CSSProperties = {
  textAlign: 'left',
  padding: '0 6px 8px',
  color: colors.textSecondary,
  fontSize: 12,
  fontWeight: 500,
};

const tableRowLabelStyle: CSSProperties = {
  padding: '8px 6px',
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

const clearButtonStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.info,
  cursor: 'pointer',
  fontSize: 12,
  padding: 0,
};
