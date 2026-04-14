import { AppShell, Center, Loader, Stack, Text } from '@mantine/core';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { PatientChartPage } from './pages/PatientChartPage';
import { PatientListPage } from './pages/PatientListPage';
import { TaskListPage } from './pages/TaskListPage';
import { SignInPage } from './pages/SignInPage';
import { colors } from './theme';
import { useMedplum, useMedplumProfile } from '@medplum/react-hooks';
import { useEffect, useRef, useState, type JSX } from 'react';

const AUTO_LOGIN_ENABLED = import.meta.env.VITE_MEDPLUM_AUTO_LOGIN !== 'false';
const MEDPLUM_CLIENT_ID = import.meta.env.VITE_MEDPLUM_CLIENT_ID ?? '3c3c4c3a-2993-424c-b46d-f58db0d7ca14';
const MEDPLUM_CLIENT_SECRET = import.meta.env.VITE_MEDPLUM_CLIENT_SECRET ?? 'be4fd047142ee6ed2a004a4a9cb98ff4c20f7c73d6082b3754dc9ae613083a34';

export function App(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const attemptedAutoLoginRef = useRef(false);
  const [autoLoginError, setAutoLoginError] = useState<string | undefined>();

  useEffect(() => {
    if (profile || !AUTO_LOGIN_ENABLED || attemptedAutoLoginRef.current) {
      return;
    }

    attemptedAutoLoginRef.current = true;

    void medplum.startClientLogin(MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown Medplum client login error';
      setAutoLoginError(message);
      attemptedAutoLoginRef.current = false;
    });
  }, [medplum, profile]);

  if (!profile) {
    if (AUTO_LOGIN_ENABLED && !autoLoginError) {
      return (
        <Center h="100vh" bg={colors.bg}>
          <Stack gap="sm" align="center">
            <Loader color={colors.accent} size="sm" />
            <Text ff="monospace" fz={12} c={colors.textSecondary} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
              Connecting to Medplum
            </Text>
          </Stack>
        </Center>
      );
    }

    return (
      <Routes>
        <Route
          path="*"
          element={
            <SignInPage
              autoLoginEnabled={AUTO_LOGIN_ENABLED}
              autoLoginError={autoLoginError}
            />
          }
        />
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
          <img src="/logo.svg" alt="π-rn logo" style={{ height: 26, display: 'block', transform: 'translateY(-2px)' }} />
          <Text ff="monospace" fz={10} c={colors.textMuted} mt={6}>
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
