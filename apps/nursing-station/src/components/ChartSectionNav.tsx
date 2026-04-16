import { Badge, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { glassPanelStyle } from '@noah-rn/ui';
import { alpha, colors } from '@noah-rn/ui-tokens';
import { IconActivityHeartbeat, IconClipboardText, IconListDetails, IconPill, IconTestPipe, IconTimeline } from '@tabler/icons-react';
import type { JSX } from 'react';

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

const sectionIcons: Record<string, JSX.Element> = {
  overview: <IconListDetails size={16} />,
  timeline: <IconTimeline size={16} />,
  vitals: <IconActivityHeartbeat size={16} />,
  labs: <IconTestPipe size={16} />,
  meds: <IconPill size={16} />,
  tasks: <IconClipboardText size={16} />,
};

export function ChartSectionNav({ items, activeSection, onSelect }: ChartSectionNavProps): JSX.Element {
  const isCompact = useMediaQuery('(max-width: 75em)');

  return (
    <aside
      data-testid="chart-section-nav"
      style={{
        width: isCompact ? '100%' : 250,
        minWidth: isCompact ? '100%' : 250,
        borderRight: isCompact ? 'none' : `1px solid ${colors.border}`,
        borderBottom: isCompact ? `1px solid ${colors.border}` : 'none',
        padding: isCompact ? '16px 20px' : '24px 16px',
        background: `linear-gradient(180deg, ${alpha.surfaceGlassMuted} 0%, ${alpha.bgGlassMuted} 100%)`,
      }}
    >
      <div style={{ marginBottom: 18, padding: '0 6px' }}>
        <Text ff="monospace" fz={11} fw={700} c={colors.textMuted} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
          Chart Sections
        </Text>
        <Text fz={12} c={colors.textSecondary} mt={8} lh={1.45}>
          Navigate the current patient story by problem framing, chronology, physiologic trends, and workflow state.
        </Text>
      </div>

      <div
        role="tablist"
        aria-orientation={isCompact ? 'horizontal' : 'vertical'}
        style={{
          display: 'flex',
          flexDirection: isCompact ? 'row' : 'column',
          gap: 8,
          overflowX: isCompact ? 'auto' : 'visible',
          paddingBottom: isCompact ? 4 : 0,
        }}
      >
        {items.map((item) => {
          const isActive = item.id === activeSection;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`chart-nav-${item.id}`}
              onClick={() => onSelect(item.id)}
              style={{
                ...glassPanelStyle,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                minHeight: 48,
                minWidth: isCompact ? 220 : undefined,
                background: isActive ? alpha.accentSoft : alpha.surfaceRaised,
                border: `1px solid ${isActive ? alpha.accentBorder : colors.border}`,
                borderLeft: isCompact ? `1px solid ${isActive ? alpha.accentBorder : colors.border}` : `2px solid ${isActive ? colors.accent : colors.border}`,
                padding: '12px 12px 12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: 'none',
                flexShrink: 0,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 10,
                  background: isActive ? alpha.accentStrong : alpha.surfaceHover,
                  color: isActive ? colors.accent : colors.textSecondary,
                  flexShrink: 0,
                }}
              >
                {sectionIcons[item.id]}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text
                    ff="monospace"
                    fz={12}
                    fw={isActive ? 700 : 500}
                    c={isActive ? colors.textPrimary : colors.textSecondary}
                    tt="uppercase"
                    style={{ letterSpacing: '0.05em' }}
                  >
                    {item.label}
                  </Text>
                  {isActive && <Badge variant="light" color="cyan" radius="sm" size="xs">Active</Badge>}
                </div>
                <Text fz={12} c={colors.textMuted} mt={4} lh={1.4}>
                  {item.detail}
                </Text>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
