import { Text } from '@mantine/core';
import { colors } from '../theme';

export function TerminalPanel() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      height: '100%',
      padding: '0 48px',
      gap: 32,
    }}>
      <Text fz={12} fw={500} c={colors.textMuted} style={{ letterSpacing: '0.05em' }}>
        AGENT TERMINAL
      </Text>
      <div>
        <Text fz={14} c={colors.textPrimary} mb={16} ff="monospace">
          System <span style={{ color: colors.textSecondary }}>boot</span> ... [OK]<br/>
          Agent runtime on <span style={{ color: colors.accent }}>tower (10.0.0.184)</span><br/>
          Awaiting connection <span className="animate-blink" style={{ color: colors.textPrimary }}>█</span>
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
          <Text fz={12} c={colors.textSecondary}>
            Connect via SSH:
          </Text>
          <pre style={{
            margin: 0,
            padding: '8px 16px',
            background: colors.surface,
            fontSize: 13,
            fontFamily: '"JetBrains Mono", monospace',
            color: colors.textPrimary,
          }}>
            ssh tower
          </pre>
        </div>
      </div>
      <Text fz={12} c={colors.textMuted}>
        xterm.js WebSocket integration planned — will embed live agent terminal here.
      </Text>
    </div>
  );
}
