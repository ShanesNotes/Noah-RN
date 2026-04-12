import { Title } from '@mantine/core';
import { SignInForm } from '@medplum/react';
import type { JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

export function SignInPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <SignInForm
      onSuccess={() => navigate('/')?.catch(console.error)}
      projectId={searchParams.get('project') || undefined}
      login={searchParams.get('login') || undefined}
    >
      <Title order={3} py="lg">
        Noah RN — Nursing Station
      </Title>
    </SignInForm>
  );
}
