import { AppShell, Text } from '@mantine/core';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { PatientChartPage } from './pages/PatientChartPage';
import { PatientListPage } from './pages/PatientListPage';
import { TaskListPage } from './pages/TaskListPage';
import { SignInPage } from './pages/SignInPage';
import { colors } from './theme';
import { useMedplumProfile } from '@medplum/react-hooks';
import type { JSX } from 'react';

export function App(): JSX.Element {
  const profile = useMedplumProfile();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) {
    return (
      <Routes>
        <Route path="*" element={<SignInPage />} />
      </Routes>
    );
  }

  const navItems = [
    { label: 'PATIENTS', path: '/', match: (p: string) => p === '/' || p.startsWith('/Patient') },
    { label: 'TASKS', path: '/Task', match: (p: string) => p.startsWith('/Task') },
  ];

  return (
    <AppShell
      navbar={{ width: 220, breakpoint: 'sm' }}
      padding={0}
      styles={{
        main: { background: colors.bg, height: '100vh', overflow: 'hidden' },
        navbar: { background: colors.surface, borderRight: `1px solid ${colors.border}` }
      }}
    >
      <AppShell.Navbar>
        {/* Minimal Header inside Sidebar */}
        <div style={{ padding: '24px 32px 32px 32px' }}>
          <Text ff="monospace" fz="sm" fw={600} c={colors.textPrimary}>
            noah-rn
          </Text>
          <Text ff="monospace" fz={10} c={colors.textMuted} mt={2}>
            CLINICAL STATION
          </Text>
        </div>

        {/* Minimal Nav Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const isActive = item.match(location.pathname);
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderLeft: isActive ? `2px solid ${colors.accent}` : '2px solid transparent',
                  padding: '12px 32px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? colors.textPrimary : colors.textSecondary,
                  transition: 'all 0.15s ease',
                  opacity: isActive ? 1 : 0.85,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        <div style={{ height: '100%', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<PatientListPage />} />
            <Route path="/Patient/:id" element={<PatientChartPage />} />
            <Route path="/Task" element={<TaskListPage />} />
          </Routes>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
