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
          placeholder="Filter traces..."
          value={filter}
          onChange={e => setFilter(e.currentTarget.value)}
          size="xs"
          variant="unstyled"
          styles={{ input: { borderBottom: `1px solid ${colors.border}`, borderRadius: 0, paddingLeft: 0, color: colors.textPrimary, fontFamily: '"Outfit", sans-serif', fontSize: 13 } }}
        />
        <div style={{ flex: 1, overflowY: 'auto', marginTop: 16 }}>
          {filtered.map(t => {
            const isPassing = t.status.startsWith('PASS');
            const isSelected = selected === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{
                  padding: '12px 0',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${colors.borderLight}`,
                  opacity: isSelected ? 1 : 0.85,
                  transition: 'opacity 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: isPassing ? colors.accent : colors.critical }} />
                  <Text ff="monospace" fz={12} fw={isSelected ? 600 : 400} c={isSelected ? colors.textPrimary : colors.textSecondary} lineClamp={1}>{t.id}</Text>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingLeft: 14 }}>
                  <Text fz={11} c={colors.textMuted}>{t.skill}</Text>
                  {t.duration_ms !== null && <Text fz={11} c={colors.textMuted}>{t.duration_ms}ms</Text>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail pane */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selected ? (
          <Text c={colors.textMuted} fz="sm" mt={40} ta="center">Select a trace to inspect</Text>
        ) : !detail ? (
          <Text c={colors.textMuted}>Loading...</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 48 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text fz={11} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>{title}</Text>
      {children}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const isPassing = status.startsWith('PASS');
  return (
    <Text ff="monospace" fz={13} fw={500} c={isPassing ? colors.accent : colors.critical}>
      {status}
    </Text>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre style={{
      margin: 0,
      padding: 16,
      background: colors.surface,
      borderRadius: 4,
      fontSize: 12,
      fontFamily: '"JetBrains Mono", monospace',
      color: colors.textSecondary,
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxHeight: 600,
      overflowY: 'auto',
      border: 'none',
    }}>
      {children}
    </pre>
  );
}
