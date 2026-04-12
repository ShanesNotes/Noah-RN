import { useState, useEffect } from 'react';
import { Text } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { colors } from '../theme';
import type { EvalScores, EvalRun } from '../types';

function parseTimestamp(filename: string): Date {
  const m = filename.match(/scores-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (!m) return new Date(0);
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
}

const CATEGORY_COLORS: Record<string, string> = {
  'protocol-reference': '#339AF0',
  'clinical-calculator': '#51CF66',
  'drug-reference': '#CC5DE8',
  'unit-conversion': '#FFA94D',
  'shift-report': '#FF6B6B',
  'io-tracker': '#20C997',
  'hello-nurse': '#748FFC',
  'shift-assessment': '#F06595',
};

export function EvalDashboard() {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const indexRes = await fetch('/evals/index.txt');
        const indexText = await indexRes.text();
        const files = indexText.trim().split('\n').filter(Boolean);

        const loaded: EvalRun[] = [];
        for (const f of files) {
          try {
            const res = await fetch(`/evals/${f}`);
            const scores: EvalScores = await res.json();
            loaded.push({ filename: f, timestamp: parseTimestamp(f), scores });
          } catch { /* skip bad files */ }
        }
        loaded.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setRuns(loaded);
      } catch (e) {
        console.error('Failed to load eval data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Text c={colors.textMuted}>Loading eval data...</Text>;
  if (runs.length === 0) return <Text c={colors.textMuted}>No eval runs found. Run scripts/build-eval-index.sh</Text>;

  const latest = runs[runs.length - 1].scores;
  const healthColor = latest.health === 'PASS' ? colors.normal : latest.health === 'WARNING' ? colors.warning : colors.critical;

  // Trend data — only include runs with >1 test (skip single-test reruns for cleaner chart)
  const trendData = runs.map(r => ({
    date: r.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: r.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    pass_rate: r.scores.pass_rate,
    total: r.scores.total,
    pass: r.scores.pass,
    fail: r.scores.fail,
  }));

  // Category breakdown from latest full run (largest total)
  const fullestRun = [...runs].sort((a, b) => b.scores.total - a.scores.total)[0];
  const categoryData = Object.entries(fullestRun.scores.categories).map(([name, cat]) => ({
    name: name.replace(/-/g, ' '),
    key: name,
    pass: cat.pass,
    fail: cat.fail,
    total: cat.total,
    pass_rate: cat.pass_rate,
  })).sort((a, b) => b.total - a.total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Health + summary row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
        <Stat label="HEALTH" value={latest.health} color={healthColor} />
        <Stat label="PASS RATE" value={`${latest.pass_rate}%`} color={latest.pass_rate === 100 ? colors.normal : colors.warning} />
        <Stat label="TOTAL" value={String(latest.total)} color={colors.info} />
        <Stat label="PASS" value={String(latest.pass)} color={colors.normal} />
        <Stat label="FAIL" value={String(latest.fail)} color={latest.fail > 0 ? colors.critical : colors.textMuted} />
        <Stat label="SAFETY" value={String(latest.safety_failures)} color={latest.safety_failures > 0 ? colors.critical : colors.normal} />
        <Stat label="RUNS" value={String(runs.length)} color={colors.textSecondary} />
      </div>

      {/* Pass rate trend */}
      <Section title="PASS RATE OVER TIME">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <XAxis dataKey="date" tick={{ fill: colors.textMuted, fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: colors.textMuted, fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: colors.textPrimary }}
              formatter={(value, name) => {
                if (name === 'pass_rate') {
                  return [`${String(value ?? 0)}%`, 'Pass Rate'];
                }
                return [
                  typeof value === 'number' || typeof value === 'string' ? value : String(value ?? ''),
                  String(name ?? ''),
                ];
              }}
            />
            <Line type="monotone" dataKey="pass_rate" stroke={colors.normal} strokeWidth={2} dot={{ r: 3, fill: colors.normal }} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* Category breakdown */}
      <Section title={`CATEGORY BREAKDOWN — ${fullestRun.scores.total} tests`}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={categoryData} layout="vertical">
            <XAxis type="number" domain={[0, 'auto']} tick={{ fill: colors.textMuted, fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: colors.textSecondary, fontSize: 10 }} width={140} />
            <Tooltip
              contentStyle={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: 12 }}
              formatter={(value) => [
                typeof value === 'number' || typeof value === 'string' ? value : String(value ?? ''),
                'Tests',
              ]}
            />
            <Bar dataKey="pass" stackId="a">
              {categoryData.map(d => <Cell key={d.key} fill={CATEGORY_COLORS[d.key] || colors.info} />)}
            </Bar>
            <Bar dataKey="fail" stackId="a" fill={colors.critical} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Run history table */}
      <Section title="RUN HISTORY">
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Timestamp', 'Total', 'Pass', 'Fail', 'Safety', 'Rate', 'Health'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${colors.border}`, color: colors.textMuted, fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.1em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...runs].reverse().map(r => (
                <tr key={r.filename}>
                  <td style={tdStyle}>{r.timestamp.toLocaleString()}</td>
                  <td style={tdStyle}>{r.scores.total}</td>
                  <td style={{ ...tdStyle, color: colors.normal }}>{r.scores.pass}</td>
                  <td style={{ ...tdStyle, color: r.scores.fail > 0 ? colors.critical : colors.textMuted }}>{r.scores.fail}</td>
                  <td style={{ ...tdStyle, color: r.scores.safety_failures > 0 ? colors.critical : colors.textMuted }}>{r.scores.safety_failures}</td>
                  <td style={tdStyle}>{r.scores.pass_rate}%</td>
                  <td style={{ ...tdStyle, color: r.scores.health === 'PASS' ? colors.normal : colors.critical }}>{r.scores.health}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: `1px solid ${colors.border}`,
  color: colors.textSecondary,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 11,
};

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '12px 16px', minWidth: 80 }}>
      <Text ff="monospace" fz={9} fw={700} c={colors.textMuted} style={{ letterSpacing: '0.15em' }}>{label}</Text>
      <Text ff="monospace" fz="lg" fw={700} c={color} mt={4}>{value}</Text>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16 }}>
      <Text ff="monospace" fz={10} fw={700} c={colors.textMuted} mb={12} style={{ letterSpacing: '0.12em' }}>{title}</Text>
      {children}
    </div>
  );
}
