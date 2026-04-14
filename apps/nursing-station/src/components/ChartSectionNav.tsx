import { Text } from '@mantine/core';
import type { JSX } from 'react';
import { colors } from '../theme';

export interface ChartSectionItem {
  id: string;
  label: string;
  detail: string;
}

interface ChartSectionNavProps {
  items: ChartSectionItem[];
  activeSection: string;
  onSelect: (section: string) => void;
}

export function ChartSectionNav({ items, activeSection, onSelect }: ChartSectionNavProps): JSX.Element {
  return (
    <aside
      data-testid="chart-section-nav"
      style={{
        width: 220,
        minWidth: 220,
        borderRight: `1px solid ${colors.border}`,
        padding: '28px 20px',
        background: 'rgba(24, 24, 27, 0.45)',
      }}
    >
      <Text
        ff="monospace"
        fz={11}
        fw={600}
        c={colors.textMuted}
        tt="uppercase"
        mb={18}
        style={{ letterSpacing: '0.08em' }}
      >
        Chart Sections
      </Text>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => {
          const isActive = item.id === activeSection;

          return (
            <button
              key={item.id}
              type="button"
              data-testid={`chart-nav-${item.id}`}
              onClick={() => onSelect(item.id)}
              style={{
                background: isActive ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(14, 165, 233, 0.22)' : 'transparent'}`,
                borderLeft: isActive ? `2px solid ${colors.accent}` : `2px solid ${colors.border}`,
                padding: '12px 12px 12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Text
                ff="monospace"
                fz={12}
                fw={isActive ? 600 : 500}
                c={isActive ? colors.textPrimary : colors.textSecondary}
                tt="uppercase"
                style={{ letterSpacing: '0.05em' }}
              >
                {item.label}
              </Text>
              <Text fz={12} c={colors.textMuted} mt={4} lh={1.4}>
                {item.detail}
              </Text>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
