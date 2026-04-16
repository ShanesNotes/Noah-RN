import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Badge, MantineProvider, Text } from '@mantine/core';
import '@mantine/core/styles.css';
import { glassHeaderStyle, pageShellStyle } from '@noah-rn/ui';
import { alpha, colors } from '@noah-rn/ui-tokens';
import { IconActivityHeartbeat, IconBinaryTree2, IconRouteAltLeft, IconSparkles } from '@tabler/icons-react';
import { theme } from './theme';
import { OverviewPanel } from './components/OverviewPanel';
import { TraceViewer } from './components/TraceViewer';
import { ContextInspector } from './components/ContextInspector';
import { GoldenSuitePanel } from './components/GoldenSuitePanel';
import { CandidatesPanel } from './components/CandidatesPanel';
import { OptimizationPanel } from './components/OptimizationPanel';
import { ErrorBoundary } from './components/ErrorBoundary';

type TabKey = 'overview' | 'traces' | 'golden-suite' | 'candidates' | 'optimization' | 'context';

const TABS: { key: TabKey; label: string; detail: string }[] = [
  { key: 'overview', label: 'OVERVIEW', detail: 'Topline eval + trace telemetry' },
  { key: 'traces', label: 'TRACES', detail: 'Operational execution forensics' },
  { key: 'golden-suite', label: 'GOLDEN SUITE', detail: 'Coverage map + regression view' },
  { key: 'candidates', label: 'CANDIDATES', detail: 'Candidate comparison and diffs' },
  { key: 'optimization', label: 'OPTIMIZATION', detail: 'Convergence and failure modes' },
  { key: 'context', label: 'CONTEXT', detail: 'FHIR assembly inspection' },
];

function MetaPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      style={{
        minHeight: 40,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        border: `1px solid ${colors.border}`,
        borderRadius: 999,
        background: alpha.surfaceRaised,
        color: colors.textSecondary,
      }}
    >
      <span aria-hidden="true" style={{ display: 'inline-flex', color: colors.accent }}>{icon}</span>
      <Text ff="monospace" fz={11} c={colors.textSecondary}>
        {label}
      </Text>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    event.preventDefault();

    let nextIndex = index;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = TABS.length - 1;
    }

    setActiveTab(TABS[nextIndex].key);
    document.getElementById(`dashboard-tab-${TABS[nextIndex].key}`)?.focus();
  }

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <div style={{
        ...pageShellStyle,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}>
        <header style={{
          ...glassHeaderStyle,
          padding: '20px 32px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <img src="/logo.svg" alt="π-rn logo" style={{ height: 28, display: 'block', transform: 'translateY(-2px)' }} />
                <Badge variant="light" color="cyan" radius="sm">Operational console</Badge>
              </div>
              <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                Clinician dashboard
              </Text>
              <Text fz={15} c={colors.textSecondary} mt={8}>
                Eval health, trace forensics, candidate progression, and context assembly in one sidecar surface.
              </Text>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <MetaPill icon={<IconActivityHeartbeat size={14} />} label="Eval telemetry" />
              <MetaPill icon={<IconRouteAltLeft size={14} />} label="Trace routing" />
              <MetaPill icon={<IconBinaryTree2 size={14} />} label="Candidate diffs" />
              <MetaPill icon={<IconSparkles size={14} />} label="Optimization loop" />
            </div>
          </div>

          <div role="tablist" aria-label="Clinician dashboard panels" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            {TABS.map((t, index) => (
              <button
                key={t.key}
                id={`dashboard-tab-${t.key}`}
                role="tab"
                aria-selected={activeTab === t.key}
                aria-controls={`dashboard-panel-${t.key}`}
                tabIndex={activeTab === t.key ? 0 : -1}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                onClick={() => setActiveTab(t.key)}
                style={{
                  minHeight: 48,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  gap: 4,
                  background: activeTab === t.key ? alpha.accentSoft : alpha.surfaceRaised,
                  color: activeTab === t.key ? colors.textPrimary : colors.textSecondary,
                  border: `1px solid ${activeTab === t.key ? alpha.accentBorder : colors.border}`,
                  borderRadius: 14,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
              >
                <Text ff="monospace" fz={11} fw={700} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                  {t.label}
                </Text>
                <Text fz={12} c={activeTab === t.key ? colors.textPrimary : colors.textMuted}>
                  {t.detail}
                </Text>
              </button>
            ))}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {activeTab === 'overview' && (
            <div id="dashboard-panel-overview" role="tabpanel" aria-labelledby="dashboard-tab-overview">
            <ErrorBoundary panel="Overview">
              <OverviewPanel
                onOpenTrace={(traceId) => {
                  setSelectedTraceId(traceId);
                  setActiveTab('traces');
                }}
              />
            </ErrorBoundary>
            </div>
          )}
          {activeTab === 'traces' && <div id="dashboard-panel-traces" role="tabpanel" aria-labelledby="dashboard-tab-traces"><ErrorBoundary panel="Traces"><TraceViewer selectedTraceId={selectedTraceId} /></ErrorBoundary></div>}
          {activeTab === 'golden-suite' && <div id="dashboard-panel-golden-suite" role="tabpanel" aria-labelledby="dashboard-tab-golden-suite"><ErrorBoundary panel="Golden Suite"><GoldenSuitePanel /></ErrorBoundary></div>}
          {activeTab === 'candidates' && <div id="dashboard-panel-candidates" role="tabpanel" aria-labelledby="dashboard-tab-candidates"><ErrorBoundary panel="Candidates"><CandidatesPanel /></ErrorBoundary></div>}
          {activeTab === 'optimization' && <div id="dashboard-panel-optimization" role="tabpanel" aria-labelledby="dashboard-tab-optimization"><ErrorBoundary panel="Optimization"><OptimizationPanel /></ErrorBoundary></div>}
          {activeTab === 'context' && <div id="dashboard-panel-context" role="tabpanel" aria-labelledby="dashboard-tab-context"><ErrorBoundary panel="Context"><ContextInspector /></ErrorBoundary></div>}
        </main>
      </div>
    </MantineProvider>
  );
}

export default App;
