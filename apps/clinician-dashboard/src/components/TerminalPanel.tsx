import { Text } from '@mantine/core';
import { colors } from '../theme';

export function TerminalPanel() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 16,
    }}>
      <Text ff="monospace" fz={10} fw={700} c={colors.textMuted} style={{ letterSpacing: '0.15em' }}>
        PI.DEV AGENT TERMINAL
      </Text>
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 24,
        maxWidth: 480,
        width: '100%',
      }}>
        <Text fz="sm" c={colors.textSecondary} mb={12}>
          Agent runtime on <code style={{ color: colors.info }}>tower (10.0.0.184)</code>
        </Text>
        <Text fz={11} c={colors.textMuted} ff="monospace" mb={8}>
          Connect via SSH:
        </Text>
        <pre style={{
          margin: 0,
          padding: 10,
          background: colors.bg,
          borderRadius: 4,
          fontSize: 12,
          fontFamily: '"JetBrains Mono", monospace',
          color: colors.normal,
        }}>
          ssh tower
        </pre>
        <Text fz={10} c={colors.textMuted} mt={16}>
          xterm.js WebSocket integration planned — will embed live agent terminal here.
        </Text>
      </div>
    </div>
  );
}
