import { AppShell, Burger, Center, Drawer, Loader, Stack, Text } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { glassPanelStyle, iconButtonStyle } from '@noah-rn/ui';
import { alpha, colors } from '@noah-rn/ui-tokens';
import { useMedplum, useMedplumProfile } from '@medplum/react-hooks';
import { IconActivityHeartbeat, IconClipboardList, IconLayoutSidebarLeftCollapse, IconStethoscope } from '@tabler/icons-react';
import { useEffect, useRef, useState, type JSX } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { isShellFixtureMode, withShellFixture } from './fixtures/shell';
import { PatientChartPage } from './pages/PatientChartPage';
import { PatientListPage } from './pages/PatientListPage';
import { SignInPage } from './pages/SignInPage';
import { TaskListPage } from './pages/TaskListPage';

const MEDPLUM_CLIENT_ID = import.meta.env.VITE_MEDPLUM_CLIENT_ID;
const MEDPLUM_CLIENT_SECRET = import.meta.env.VITE_MEDPLUM_CLIENT_SECRET;
const AUTO_LOGIN_ENABLED =
  import.meta.env.VITE_MEDPLUM_AUTO_LOGIN !== 'false' &&
  Boolean(MEDPLUM_CLIENT_ID && MEDPLUM_CLIENT_SECRET);

export function App(): JSX.Element {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const fixtureMode = isShellFixtureMode(location.search);
  const attemptedAutoLoginRef = useRef(false);
  const [autoLoginError, setAutoLoginError] = useState<string | undefined>();
  const [mobileNavOpened, { open: openMobileNav, close: closeMobileNav }] = useDisclosure(false);
  const isCompactShell = useMediaQuery('(max-width: 68em)');

  useEffect(() => {
    if (fixtureMode || profile || !AUTO_LOGIN_ENABLED || attemptedAutoLoginRef.current) {
      return;
    }

    const clientId = MEDPLUM_CLIENT_ID;
    const clientSecret = MEDPLUM_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return;
    }

    attemptedAutoLoginRef.current = true;

    void medplum.startClientLogin(clientId, clientSecret).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown Medplum client login error';
      setAutoLoginError(message);
      attemptedAutoLoginRef.current = false;
    });
  }, [fixtureMode, medplum, profile]);

  if (!fixtureMode && !profile) {
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
          element={<SignInPage autoLoginEnabled={AUTO_LOGIN_ENABLED} autoLoginError={autoLoginError} />}
        />
      </Routes>
    );
  }

  const navItems = [
    {
      label: 'WORKLIST',
      caption: 'Assignments + chart drill-in',
      path: '/',
      icon: IconStethoscope,
      match: (p: string) => p === '/' || p.startsWith('/Patient'),
    },
    {
      label: 'TASKS',
      caption: 'Review queue + follow-up',
      path: '/Task',
      icon: IconClipboardList,
      match: (p: string) => p.startsWith('/Task'),
    },
  ];

  const handleNavigate = (path: string): void => {
    navigate(withShellFixture(path, fixtureMode));
    closeMobileNav();
  };

  const navContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '28px 24px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <img src="/logo.svg" alt="π-rn logo" style={{ height: 28, display: 'block', transform: 'translateY(-2px)' }} />
            <Text ff="monospace" fz={10} c={colors.textMuted} mt={8} style={{ letterSpacing: '0.12em' }}>
              CLINICAL STATION
            </Text>
          </div>
          <div aria-hidden="true" style={{ ...iconButtonStyle, width: 44, height: 44 }}>
            <IconLayoutSidebarLeftCollapse size={18} />
          </div>
        </div>

        <div
          style={{
            ...glassPanelStyle,
            background: `linear-gradient(180deg, ${alpha.accentSoft} 0%, rgba(14, 165, 233, 0.01) 100%)`,
            padding: '16px 16px 14px',
          }}
        >
          <Text ff="monospace" fz={10} fw={600} c={colors.accent} tt="uppercase" style={{ letterSpacing: '0.12em' }}>
            Shift Focus
          </Text>
          <Text fz={15} fw={500} c={colors.textPrimary} mt={10}>
            Review agent work, act on high-signal tasks, then drill into the chart.
          </Text>
          <Text fz={12} c={colors.textSecondary} mt={8} lh={1.5}>
            Designed as a work-first nursing station rather than a passive patient list.
          </Text>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
        {navItems.map((item) => {
          const isActive = item.match(location.pathname);
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              data-testid={`app-nav-${item.label.toLowerCase()}`}
              onClick={() => handleNavigate(item.path)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                minHeight: 52,
                background: isActive ? alpha.accentMuted : 'transparent',
                border: `1px solid ${isActive ? alpha.accentBorder : 'transparent'}`,
                borderRadius: 14,
                boxShadow: isActive ? `inset 0 1px 0 ${alpha.dividerStrong}` : 'none',
                padding: '14px 16px 14px 18px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                color: isActive ? colors.textPrimary : colors.textSecondary,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 10,
                  background: isActive ? alpha.accentStrong : alpha.surfaceHover,
                  color: isActive ? colors.accent : colors.textSecondary,
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text ff="monospace" fz={11} fw={700} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                  {item.label}
                </Text>
                <Text fz={12} c={isActive ? colors.textPrimary : colors.textMuted} mt={4} lh={1.4}>
                  {item.caption}
                </Text>
              </div>
              <div
                aria-hidden="true"
                style={{
                  marginLeft: 'auto',
                  width: 3,
                  alignSelf: 'stretch',
                  borderRadius: 999,
                  background: isActive ? colors.accent : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', padding: '24px 16px 16px' }}>
        <div style={{ ...glassPanelStyle, background: alpha.surfaceRaised, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                background: alpha.accentStrong,
                color: colors.accent,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              RN
            </div>
            <div>
              <Text fz={13} fw={600} c={colors.textPrimary}>Active session</Text>
              <Text fz={12} c={colors.textSecondary} mt={2}>Workspace routing live · Medplum connected</Text>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <IconActivityHeartbeat size={14} color={colors.normal} />
            <Text ff="monospace" fz={11} c={colors.textMuted}>
              SHIFT MODE {fixtureMode ? '· FIXTURE' : '· LIVE'}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AppShell
        header={isCompactShell ? { height: 64 } : undefined}
        navbar={{ width: 280, breakpoint: 'md', collapsed: { mobile: true } }}
        padding={0}
        styles={{
          main: { background: colors.bg, height: '100vh', overflow: 'hidden' },
          navbar: {
            background: `linear-gradient(180deg, ${alpha.surfaceGlass} 0%, ${alpha.bgGlass} 100%)`,
            borderRight: `1px solid ${colors.border}`,
          },
        }}
      >
        {isCompactShell && (
          <AppShell.Header
            style={{
              background: alpha.bgGlass,
              backdropFilter: 'blur(18px)',
              borderBottom: `1px solid ${colors.border}`,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Burger opened={mobileNavOpened} onClick={mobileNavOpened ? closeMobileNav : openMobileNav} aria-label="Toggle navigation" />
              <img src="/logo.svg" alt="π-rn logo" style={{ height: 24, display: 'block' }} />
            </div>
            <Text ff="monospace" fz={11} c={colors.textSecondary} style={{ letterSpacing: '0.08em' }}>
              {fixtureMode ? 'FIXTURE' : 'LIVE'}
            </Text>
          </AppShell.Header>
        )}

        {!isCompactShell && <AppShell.Navbar>{navContent}</AppShell.Navbar>}

        <AppShell.Main>
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={<PatientListPage />} />
              <Route path="/Patient/:id/:section?" element={<PatientChartPage />} />
              <Route path="/Task" element={<TaskListPage />} />
            </Routes>
          </div>
        </AppShell.Main>
      </AppShell>

      <Drawer
        opened={mobileNavOpened}
        onClose={closeMobileNav}
        withCloseButton={false}
        padding={0}
        size={320}
        styles={{ content: { background: colors.bg }, body: { padding: 0, height: '100%' } }}
      >
        {navContent}
      </Drawer>
    </>
  );
}
