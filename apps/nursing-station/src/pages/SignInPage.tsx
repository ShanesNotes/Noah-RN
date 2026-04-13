import { Box, Text } from '@mantine/core';
import { SignInForm } from '@medplum/react';
import type { JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { colors } from '../theme';

export function SignInPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: colors.bg }}>
      <div style={{ paddingBottom: 32, textAlign: 'center' }}>
        <Text ff="monospace" fz={20} fw={600} c={colors.textPrimary}>noah-rn</Text>
        <Text fz={13} c={colors.textSecondary} style={{ letterSpacing: '0.05em' }} mt={4}>CLINICAL WORKSPACE</Text>
      </div>
      <Box w={400} style={{ 
        background: 'transparent',
        borderTop: `1px solid ${colors.borderLight}`,
        borderBottom: `1px solid ${colors.borderLight}`,
        padding: '32px 0'
      }}>
        <SignInForm
          onSuccess={() => navigate('/')?.catch(console.error)}
          projectId={searchParams.get('project') || undefined}
          login={searchParams.get('login') || undefined}
        >
        </SignInForm>
      </Box>
    </div>
  );
}
