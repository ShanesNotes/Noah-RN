import { useState } from 'react';
import { MantineProvider, Text } from '@mantine/core';
import '@mantine/core/styles.css';
import { theme, colors } from './theme';
import { EvalDashboard } from './components/EvalDashboard';
import { TraceViewer } from './components/TraceViewer';
import { ContextInspector } from './components/ContextInspector';
import { SkillPanel } from './components/SkillPanel';
import { TerminalPanel } from './components/TerminalPanel';
import { ErrorBoundary } from './components/ErrorBoundary';

type TabKey = 'evals' | 'traces' | 'context' | 'skills' | 'terminal';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'evals', label: 'EVALS' },
  { key: 'traces', label: 'TRACES' },
  { key: 'context', label: 'CONTEXT' },
  { key: 'skills', label: 'SKILLS' },
  { key: 'terminal', label: 'TERMINAL' },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('evals');

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: colors.bg,
        color: colors.textPrimary,
        fontFamily: '"Outfit", sans-serif',
      }}>
        {/* Header */}
        <header style={{
          padding: '10px 24px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          background: colors.surface,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Text ff="monospace" fz="xs" fw={700} c={colors.info} style={{ letterSpacing: '0.15em' }}>
              NOAH RN
            </Text>
            <Text fz={10} c={colors.textMuted}>
              Runtime Console
            </Text>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  background: activeTab === t.key ? colors.border : 'transparent',
                  color: activeTab === t.key ? colors.textPrimary : colors.textSecondary,
                  border: 'none',
                  padding: '6px 16px',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  borderRadius: 4,
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {/* Panel content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {activeTab === 'evals' && <ErrorBoundary panel="Evals"><EvalDashboard /></ErrorBoundary>}
          {activeTab === 'traces' && <ErrorBoundary panel="Traces"><TraceViewer /></ErrorBoundary>}
          {activeTab === 'context' && <ErrorBoundary panel="Context"><ContextInspector /></ErrorBoundary>}
          {activeTab === 'skills' && <ErrorBoundary panel="Skills"><SkillPanel /></ErrorBoundary>}
          {activeTab === 'terminal' && <ErrorBoundary panel="Terminal"><TerminalPanel /></ErrorBoundary>}
        </main>
      </div>
    </MantineProvider>
  );
}

export default App;
