import { AppShell, Group, NavLink, Title } from '@mantine/core';
import { useMedplumProfile } from '@medplum/react-hooks';
import { IconClipboardList, IconHeart, IconUsers } from '@tabler/icons-react';
import type { JSX } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { PatientChartPage } from './pages/PatientChartPage';
import { PatientListPage } from './pages/PatientListPage';
import { SignInPage } from './pages/SignInPage';
import { TaskListPage } from './pages/TaskListPage';

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

  return (
    <AppShell
      header={{ height: 50 }}
      navbar={{ width: 220, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <IconHeart size={24} color="teal" />
          <Title order={4}>Noah RN</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <NavLink
          label="Patients"
          leftSection={<IconUsers size={18} />}
          active={location.pathname === '/' || location.pathname.startsWith('/Patient')}
          onClick={() => navigate('/')}
        />
        <NavLink
          label="Tasks"
          leftSection={<IconClipboardList size={18} />}
          active={location.pathname.startsWith('/Task')}
          onClick={() => navigate('/Task')}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<PatientListPage />} />
          <Route path="/Patient/:id" element={<PatientChartPage />} />
          <Route path="/Task" element={<TaskListPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
