import { useState, useEffect } from 'react';
import { Text, TextInput } from '@mantine/core';
import { colors } from '../theme';

interface TraceIndex {
  id: string;
  status: string;
  skill: string;
  duration_ms: number | null;
  started_at: string;
  has_output: boolean;
}

interface TraceDetail {
  input: Record<string, unknown> | null;
  timing: Record<string, unknown> | null;
  hookResults: string;
  output: string | null;
}

export function TraceViewer() {
  const [traces, setTraces] = useState<TraceIndex[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/traces/index.json')
      .then(r => r.json())
      .then(setTraces)
      .catch(e => console.error('Failed to load trace index:', e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    (async () => {
      const [inputRes, timingRes, hookRes, outputRes] = await Promise.allSettled([
        fetch(`/traces/${selected}/input-context.json`).then(r => r.json()),
        fetch(`/traces/${selected}/timing.json`).then(r => r.json()),
        fetch(`/traces/${selected}/hook-results.json`).then(r => r.text()),
        fetch(`/traces/${selected}/skill-output.txt`).then(r => r.text()),
      ]);
      setDetail({
        input: inputRes.status === 'fulfilled' ? inputRes.value : null,
        timing: timingRes.status === 'fulfilled' ? timingRes.value : null,
        hookResults: hookRes.status === 'fulfilled' ? hookRes.value.trim() : 'UNKNOWN',
        output: outputRes.status === 'fulfilled' ? outputRes.value : null,
      });
    })();
  }, [selected]);

  const filtered = traces.filter(t =>
    !filter || t.id.includes(filter) || t.skill.includes(filter) || t.status.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <Text c={colors.textMuted}>Loading traces...</Text>;

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* Trace list */}
      <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <TextInput
          placeholder="Filter by ID, skill, or status..."
          value={filter}
          onChange={e => setFilter(e.currentTarget.value)}
          size="xs"
          styles={{ input: { background: colors.surface, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontFamily: '"JetBrains Mono", monospace', fontSize: 11 } }}
        />
        <Text fz={10} c={colors.textMuted} mt={6} mb={4} ff="monospace">{filtered.length} traces</Text>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                background: selected === t.id ? colors.surfaceHover : 'transparent',
                borderBottom: `1px solid ${colors.border}`,
                borderLeft: `3px solid ${t.status.startsWith('PASS') ? colors.normal : t.status.startsWith('FAIL') ? colors.critical : colors.textMuted}`,
              }}
            >
              <Text ff="monospace" fz={11} c={colors.textPrimary} lineClamp={1}>{t.id}</Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <Text fz={9} c={colors.textMuted} ff="monospace">{t.skill}</Text>
                {t.duration_ms !== null && <Text fz={9} c={colors.textMuted} ff="monospace">{t.duration_ms}ms</Text>}
                <Text fz={9} c={t.status.startsWith('PASS') ? colors.normal : colors.critical} ff="monospace">{t.status.slice(0, 12)}</Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail pane */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selected ? (
          <Text c={colors.textMuted} fz="sm" mt={40} ta="center">Select a trace to inspect</Text>
        ) : !detail ? (
          <Text c={colors.textMuted}>Loading...</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <DetailSection title="STATUS">
              <Badge status={detail.hookResults} />
            </DetailSection>

            {detail.timing && (
              <DetailSection title="TIMING">
                <Pre>{JSON.stringify(detail.timing, null, 2)}</Pre>
              </DetailSection>
            )}

            {detail.input && (
              <DetailSection title="INPUT CONTEXT">
                <Pre>{JSON.stringify(detail.input, null, 2)}</Pre>
              </DetailSection>
            )}

            {detail.output && (
              <DetailSection title="SKILL OUTPUT">
                <Pre>{detail.output}</Pre>
              </DetailSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 12 }}>
      <Text ff="monospace" fz={9} fw={700} c={colors.textMuted} mb={8} style={{ letterSpacing: '0.12em' }}>{title}</Text>
      {children}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const isPassing = status.startsWith('PASS');
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 4,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 12,
      fontWeight: 700,
      background: isPassing ? 'rgba(81, 207, 102, 0.15)' : 'rgba(255, 68, 68, 0.15)',
      color: isPassing ? colors.normal : colors.critical,
    }}>
      {status}
    </span>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre style={{
      margin: 0,
      padding: 8,
      background: colors.bg,
      borderRadius: 4,
      fontSize: 11,
      fontFamily: '"JetBrains Mono", monospace',
      color: colors.textSecondary,
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxHeight: 400,
      overflowY: 'auto',
    }}>
      {children}
    </pre>
  );
}
