import { useState, useEffect } from 'react';
import { Text } from '@mantine/core';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { colors } from '../theme';
import type { EvalScores, EvalRun } from '../types';

function parseTimestamp(filename: string): Date {
  const m = filename.match(/scores-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (!m) return new Date(0);
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
}

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

  const trendData = runs.map(r => ({
    date: r.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: r.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    pass_rate: r.scores.pass_rate,
    total: r.scores.total,
    pass: r.scores.pass,
    fail: r.scores.fail,
  }));

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 64, paddingBottom: 48 }}>
      {/* Header inline text - replaced with minimal big stats */}
      <div style={{ display: 'flex', gap: 64, alignItems: 'center' }}>
        <div>
          <Text fz={11} fw={500} c={colors.textSecondary} style={{ letterSpacing: '0.05em', marginBottom: 4 }}>TOTAL TESTS</Text>
          <Text ff="monospace" fz={32} fw={300} c={colors.textPrimary}>{latest.total}</Text>
        </div>
        <div>
          <Text fz={11} fw={500} c={colors.textSecondary} style={{ letterSpacing: '0.05em', marginBottom: 4 }}>PASS</Text>
          <Text ff="monospace" fz={32} fw={300} c={colors.accent}>{latest.pass}</Text>
        </div>
        <div>
          <Text fz={11} fw={500} c={colors.textSecondary} style={{ letterSpacing: '0.05em', marginBottom: 4 }}>FAIL</Text>
          <Text ff="monospace" fz={32} fw={300} c={latest.fail > 0 ? colors.critical : colors.textMuted}>{latest.fail}</Text>
        </div>
        <div>
          <Text fz={11} fw={500} c={colors.textSecondary} style={{ letterSpacing: '0.05em', marginBottom: 4 }}>PASS RATE</Text>
          <Text ff="monospace" fz={32} fw={300} c={latest.pass_rate === 100 ? colors.textPrimary : colors.textPrimary}>{latest.pass_rate}%</Text>
        </div>
        {latest.safety_failures > 0 && (
          <div>
            <Text fz={11} fw={500} c={colors.textSecondary} style={{ letterSpacing: '0.05em', marginBottom: 4 }}>SAFETY VETO</Text>
            <Text ff="monospace" fz={32} fw={300} c={colors.critical}>{latest.safety_failures}</Text>
          </div>
        )}
      </div>

      {/* Pass rate trend */}
      <Section title="PASS RATE OVER TIME">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="colorPassRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.accent} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={colors.accent} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: colors.textSecondary, fontSize: 11 }} axisLine={{ stroke: colors.borderLight }} tickLine={false} tickMargin={12} />
            <YAxis domain={[0, 100]} tick={{ fill: colors.textSecondary, fontSize: 11 }} axisLine={{ stroke: colors.borderLight }} tickLine={false} tickMargin={12} allowDataOverflow={true} />
            <Tooltip
              contentStyle={{ background: colors.surface, border: `1px solid ${colors.borderLight}`, borderRadius: 4, fontSize: 12, padding: '8px 12px' }}
              itemStyle={{ color: colors.textPrimary, padding: 0 }}
              labelStyle={{ color: colors.textSecondary, marginBottom: 8 }}
            />
            <Area type="monotone" dataKey="pass_rate" stroke={colors.accent} strokeWidth={2} fillOpacity={1} fill="url(#colorPassRate)" activeDot={{ r: 4, fill: colors.accent, stroke: colors.bg, strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Section>

      {/* Category breakdown */}
      <Section title={`CATEGORY BREAKDOWN — ${fullestRun.scores.total} tests`}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={categoryData} layout="vertical" barSize={12}>
            <XAxis type="number" domain={[0, 'auto']} tick={{ fill: colors.textSecondary, fontSize: 11 }} axisLine={{ stroke: colors.borderLight }} tickLine={false} tickMargin={12} />
            <YAxis type="category" dataKey="name" tick={{ fill: colors.textPrimary, fontSize: 11 }} width={140} axisLine={{ stroke: colors.borderLight }} tickLine={false} tickMargin={12} />
            <Tooltip
              cursor={{ fill: colors.surface }}
              contentStyle={{ background: colors.surface, border: `1px solid ${colors.borderLight}`, borderRadius: 4, fontSize: 12, padding: '8px 12px' }}
              itemStyle={{ color: colors.textPrimary, padding: 0 }}
              labelStyle={{ color: colors.textSecondary, marginBottom: 8 }}
            />
            <Bar dataKey="pass" stackId="a" fill={colors.accent} radius={[0, 2, 2, 0]} />
            <Bar dataKey="fail" stackId="a" fill={colors.borderLight} radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Run history table */}
      <Section title="RUN HISTORY">
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr>
                {['Timestamp', 'Total', 'Pass', 'Fail', 'Safety', 'Rate', 'Health'].map(h => (
                  <th key={h} style={{ padding: '8px 16px 12px 0', borderBottom: `1px solid ${colors.borderLight}`, color: colors.textSecondary, fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...runs].reverse().map(r => (
                <tr key={r.filename} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                  <td style={tdStyle}>{r.timestamp.toLocaleString()}</td>
                  <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>{r.scores.total}</td>
                  <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: colors.accent }}>{r.scores.pass}</td>
                  <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: r.scores.fail > 0 ? colors.critical : colors.textMuted }}>{r.scores.fail}</td>
                  <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: r.scores.safety_failures > 0 ? colors.critical : colors.textMuted }}>{r.scores.safety_failures}</td>
                  <td style={{ ...tdStyle, fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>{r.scores.pass_rate}%</td>
                  <td style={{ ...tdStyle, color: r.scores.health === 'PASS' ? colors.accent : colors.critical }}>{r.scores.health}</td>
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
  padding: '12px 16px 12px 0',
  color: colors.textPrimary,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Text fz={12} fw={500} c={colors.textSecondary} style={{ letterSpacing: '0.05em' }}>{title}</Text>
      {children}
    </div>
  );
}
