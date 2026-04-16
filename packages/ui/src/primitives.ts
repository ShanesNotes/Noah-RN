import { alpha, colors, radius, shadows, spacing, typography } from '@noah-rn/ui-tokens';

export const clinicalCardStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  boxShadow: shadows.sm,
  padding: spacing.xl,
} as const;

export const sectionEyebrowStyle = {
  color: colors.textMuted,
  fontFamily: typography.mono,
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: typography.trackingWide,
  textTransform: 'uppercase',
} as const;

export const pageShellStyle = {
  minHeight: '100vh',
  background: colors.bg,
  color: colors.textPrimary,
  fontFamily: typography.body,
} as const;

export const glassPanelStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  background: alpha.surfaceRaised,
  boxShadow: shadows.sm,
} as const;

export const glassHeaderStyle = {
  background: alpha.bgGlass,
  backdropFilter: 'blur(18px)',
  borderBottom: `1px solid ${colors.borderLight}`,
} as const;

export const iconButtonStyle = {
  width: 44,
  height: 44,
  background: alpha.surfaceHover,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  color: colors.textSecondary,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

export const navCardStyle = {
  borderRadius: radius.lg,
  border: `1px solid transparent`,
  minHeight: 48,
  transition: 'all 0.15s ease',
} as const;
