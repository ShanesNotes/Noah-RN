import { Alert, Anchor, Box, Code, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconExternalLink, IconStethoscope } from '@tabler/icons-react';
import { SignInForm } from '@medplum/react';
import { useEffect, useState, type JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { colors } from '../theme';

type HealthState =
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

const MEDPLUM_BASE_URL = import.meta.env.VITE_MEDPLUM_BASE_URL || 'http://10.0.0.184:8103/';

function getMedplumWorkspaceUrl(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl);
    url.port = '3000';
    url.pathname = '/signin';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function getHealthcheckUrl(baseUrl: string): string | null {
  try {
    return new URL('/healthcheck', baseUrl).toString();
  } catch {
    return null;
  }
}

export interface SignInPageProps {
  autoLoginEnabled?: boolean;
  autoLoginError?: string;
}

export function SignInPage({ autoLoginEnabled = false, autoLoginError }: SignInPageProps): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });

  const healthcheckUrl = getHealthcheckUrl(MEDPLUM_BASE_URL);
  const workspaceUrl = getMedplumWorkspaceUrl(MEDPLUM_BASE_URL);

  useEffect(() => {
    if (!healthcheckUrl) {
      setHealth({ status: 'error', message: 'Configured Medplum URL is invalid.' });
      return;
    }

    const currentHealthcheckUrl = healthcheckUrl;
    let cancelled = false;

    async function checkHealth(): Promise<void> {
      setHealth({ status: 'checking' });
      try {
        const response = await fetch(currentHealthcheckUrl, { method: 'GET' });
        if (!response.ok) {
          throw new Error(`Healthcheck returned ${response.status} ${response.statusText}`);
        }
        if (!cancelled) {
          setHealth({ status: 'ok' });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unknown network error';
          setHealth({ status: 'error', message });
        }
      }
    }

    void checkHealth();

    return () => {
      cancelled = true;
    };
  }, [healthcheckUrl]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: `radial-gradient(circle at top, rgba(14, 165, 233, 0.08), transparent 32%), ${colors.bg}`,
      }}
    >
      <SimpleGrid maw={980} w="100%" cols={{ base: 1, md: 2 }} spacing={32} verticalSpacing={32}>
        <Stack gap={20}>
          <div>
            <Group gap={10} mb={14}>
              <IconStethoscope size={18} color={colors.accent} />
              <Text ff="monospace" fz={12} fw={600} c={colors.accent} tt="uppercase" style={{ letterSpacing: '0.12em' }}>
                Medplum-First Workspace
              </Text>
            </Group>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/logo.svg" alt="π-rn logo" style={{ height: 36, display: 'block', transform: 'translateY(-2px)' }} />
              <Text ff="monospace" fz={28} fw={600} c={colors.textPrimary}>
                nursing station
              </Text>
            </div>
            <Text fz={15} c={colors.textSecondary} mt={10} maw={620}>
              This app uses the live Medplum session. It does not run a dummy provider or mocked auth mode.
            </Text>
          </div>

          {autoLoginEnabled && autoLoginError && (
            <Alert
              variant="light"
              color="yellow"
              radius="md"
              icon={<IconAlertCircle size={16} />}
              styles={{
                root: {
                  background: colors.surface,
                  border: '1px solid rgba(234, 179, 8, 0.28)',
                },
                label: { color: colors.textPrimary, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em' },
                message: { color: colors.textSecondary },
              }}
              title="Auto-login fallback"
            >
              Auto-login is enabled, but the Medplum client login failed. Falling back to the normal sign-in form.
              <br />
              <Code mt={10} block style={{ background: '#111827', color: '#fef3c7', border: `1px solid ${colors.borderLight}` }}>
                {autoLoginError}
              </Code>
            </Alert>
          )}

          <Alert
            variant="light"
            color={health.status === 'error' ? 'red' : 'cyan'}
            radius="md"
            icon={health.status === 'checking' ? <Loader size={16} color={colors.accent} /> : health.status === 'ok' ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
            styles={{
              root: {
                background: colors.surface,
                border: `1px solid ${health.status === 'error' ? 'rgba(225, 29, 72, 0.35)' : 'rgba(14, 165, 233, 0.25)'}`,
              },
              label: { color: colors.textPrimary, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.06em' },
              message: { color: colors.textSecondary },
            }}
            title="Connection status"
          >
            {health.status === 'checking' && 'Checking the configured Medplum health endpoint.'}
            {health.status === 'ok' && 'Medplum is reachable. If you still land here, the remaining issue is sign-in/session state.'}
            {health.status === 'error' && `Medplum is not reachable from this browser session: ${health.message}`}
          </Alert>

          <Box
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              padding: 20,
            }}
          >
            <Stack gap={14}>
              <div>
                <Text ff="monospace" fz={12} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                  Current target
                </Text>
                <Code block mt={10} style={{ background: '#0f172a', color: '#bae6fd', border: `1px solid ${colors.borderLight}` }}>
                  {MEDPLUM_BASE_URL}
                </Code>
              </div>

              <div>
                <Text ff="monospace" fz={12} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                  Local dev ports
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={10}>
                  Nursing station: <Code>localhost:3001</Code>
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={4}>
                  Runtime console: <Code>localhost:5173</Code>
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={4}>
                  Medplum app on tower: <Code>10.0.0.184:3000</Code>
                </Text>
              </div>

              <div>
                <Text ff="monospace" fz={12} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                  Interactive login
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={10}>
                  Default dev credentials in this repo: <Code>admin@example.com</Code> / <Code>medplum_admin</Code>
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={4}>
                  Project name: <Code>Noah RN</Code>
                </Text>
                <Text fz={13} c={colors.textSecondary} mt={4}>
                  Auto-login: <Code>{autoLoginEnabled ? 'enabled' : 'disabled'}</Code>
                </Text>
                {workspaceUrl && (
                  <Anchor href={workspaceUrl} target="_blank" rel="noreferrer" mt={10} inline c={colors.accent}>
                    Open Medplum workspace <IconExternalLink size={14} style={{ verticalAlign: 'text-bottom' }} />
                  </Anchor>
                )}
              </div>
            </Stack>
          </Box>
        </Stack>

        <Box
          w="100%"
          style={{
            background: 'rgba(9, 9, 11, 0.92)',
            border: `1px solid ${colors.borderLight}`,
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35)',
            padding: '28px 0',
          }}
        >
          <div style={{ padding: '0 48px 24px 48px', textAlign: 'left' }}>
            <Text ff="monospace" fz={15} fw={600} c={colors.textPrimary}>
              {autoLoginEnabled ? 'Medplum connection required' : 'Sign in to Medplum'}
            </Text>
            <Text fz={13} c={colors.textSecondary} mt={6}>
              {autoLoginEnabled
                ? 'Dev mode is configured to use automatic Medplum login only. Fix the Medplum connection or client credentials to continue.'
                : 'The patient list and task views unlock only after a real Medplum profile is present.'}
            </Text>
          </div>
          {!autoLoginEnabled && (
            <SignInForm
              onSuccess={() => navigate('/')?.catch(console.error)}
              projectId={searchParams.get('project') || undefined}
              login={searchParams.get('login') || undefined}
            >
            </SignInForm>
          )}
        </Box>
      </SimpleGrid>
    </div>
  );
}
