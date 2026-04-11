import { Component, type ReactNode } from 'react';
import { Text } from '@mantine/core';
import { colors } from '../theme';

interface Props {
  panel: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <Text fz="sm" c={colors.critical}>
            {this.props.panel} panel encountered an error.
          </Text>
          <Text fz="xs" c={colors.textMuted} mt={8}>
            Try selecting a different patient or refreshing the page.
          </Text>
        </div>
      );
    }
    return this.props.children;
  }
}
