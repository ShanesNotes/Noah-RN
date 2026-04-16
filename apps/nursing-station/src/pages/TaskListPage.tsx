import { Loader, Text } from '@mantine/core';
import type { Task } from '@medplum/fhirtypes';
import { useSearchResources } from '@medplum/react-hooks';
import type { JSX } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { isShellFixtureMode, shellFixtureTasks, withShellFixture } from '../fixtures/shell';
import { TaskQueueSummary, TaskWorklist } from '../components/TaskWorklist';
import { colors } from '../theme';

export function TaskListPage(): JSX.Element {
  const location = useLocation();
  const fixtureMode = isShellFixtureMode(location.search);
  if (fixtureMode) {
    return <FixtureTaskListPage />;
  }

  return <LiveTaskListPage />;
}

function FixtureTaskListPage(): JSX.Element {
  const navigate = useNavigate();

  function openTask(task: Task): void {
    const patientRef = task.for?.reference;
    if (!patientRef) {
      return;
    }

    const taskId = task.id;
    const path = taskId ? `/${patientRef}/tasks?reviewTask=${taskId}` : `/${patientRef}/tasks`;
    navigate(withShellFixture(path, true));
  }

  return (
    <TaskListPageView tasks={shellFixtureTasks} loading={false} onSelectTask={openTask} />
  );
}

function LiveTaskListPage(): JSX.Element {
  const navigate = useNavigate();
  const [tasks, tasksLoading] = useSearchResources('Task', '_sort=-authored-on&_count=20');

  function openTask(task: Task): void {
    const patientRef = task.for?.reference;
    if (!patientRef) {
      return;
    }

    const taskId = task.id;
    navigate(taskId ? `/${patientRef}/tasks?reviewTask=${taskId}` : `/${patientRef}/tasks`);
  }

  return <TaskListPageView tasks={tasks} loading={tasksLoading} onSelectTask={openTask} />;
}

function TaskListPageView({
  tasks,
  loading,
  onSelectTask,
}: {
  tasks: Task[] | undefined;
  loading: boolean;
  onSelectTask: (task: Task) => void;
}): JSX.Element {
  const visibleTasks = tasks;

  return (
    <div style={{ padding: '48px', height: '100%' }}>
      <div style={{ marginBottom: 32 }}>
        <Text fz={20} fw={500} c={colors.textPrimary}>Task Review Queue</Text>
        <Text fz={13} c={colors.textSecondary} mt={4}>
          Epic-style worklist framing for Noah-RN: requested work, running agent tasks, and draft-ready artifacts for nurse review.
        </Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TaskQueueSummary tasks={visibleTasks} />

        <div
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            padding: '18px 20px',
          }}
        >
          <Text ff="monospace" fz={11} fw={600} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
            Review Doctrine
          </Text>
          <Text fz={13} c={colors.textSecondary} mt={10} lh={1.5}>
            `Task` is the universal review primitive. Draft artifacts belong behind task-driven review, not broad chart browsing or dashboard detours.
          </Text>
        </div>

        {loading ? (
          <div style={{ padding: '32px 0' }}>
            <Loader color={colors.accent} size="sm" />
          </div>
        ) : (
          <TaskWorklist
            tasks={visibleTasks}
            emptyMessage="No active review tasks returned."
            onSelectTask={onSelectTask}
            showPatient
            testIdPrefix="task-review-queue"
          />
        )}
      </div>
    </div>
  );
}
