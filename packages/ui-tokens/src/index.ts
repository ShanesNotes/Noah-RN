export const colors = {
  bg: '#09090b',
  surface: '#18181b',
  surfaceHover: '#27272a',
  border: '#27272a',
  borderLight: '#3f3f46',
  textPrimary: '#fafafa',
  textSecondary: '#71717a',
  textMuted: '#52525b',
  textSubtle: '#a1a1aa',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  codeBg: '#0f172a',
  codeWarn: '#fef3c7',
  codeInfo: '#bae6fd',

  hr: '#e11d48',
  bp: '#ea580c',
  rr: '#16a34a',
  spo2: '#0284c7',
  temp: '#9333ea',

  critical: '#e11d48',
  warning: '#ea580c',
  normal: '#16a34a',
  info: '#0284c7',

  medActive: '#16a34a',
  medStopped: '#71717a',
  medDraft: '#ea580c',
} as const;

export const alpha = {
  accentSoft: 'rgba(14, 165, 233, 0.08)',
  accentMuted: 'rgba(14, 165, 233, 0.1)',
  accentStrong: 'rgba(14, 165, 233, 0.16)',
  accentBorder: 'rgba(14, 165, 233, 0.22)',
  surfaceRaised: 'rgba(250,250,250,0.02)',
  surfaceHover: 'rgba(250,250,250,0.03)',
  dividerStrong: 'rgba(255,255,255,0.04)',
  criticalSoft: 'rgba(225, 29, 72, 0.08)',
  criticalBorder: 'rgba(225, 29, 72, 0.28)',
  warningSoft: 'rgba(234, 179, 8, 0.08)',
  bgGlass: 'rgba(9, 9, 11, 0.86)',
  surfaceGlass: 'rgba(24,24,27,0.98)',
  surfaceGlassMuted: 'rgba(24, 24, 27, 0.72)',
  bgGlassMuted: 'rgba(9, 9, 11, 0.45)',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
} as const;

export const radius = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
} as const;

export const shadows = {
  sm: '0 4px 16px rgba(0, 0, 0, 0.18)',
  md: '0 12px 32px rgba(0, 0, 0, 0.24)',
} as const;

export const typography = {
  body: '"Outfit", sans-serif',
  mono: '"JetBrains Mono", monospace',
  trackingWide: '0.08em',
  trackingWider: '0.12em',
} as const;

export const zincDark = [
  '#fafafa',
  '#f4f4f5',
  '#e4e4e7',
  '#d4d4d8',
  '#a1a1aa',
  '#71717a',
  '#52525b',
  '#3f3f46',
  '#27272a',
  '#18181b',
] as const;

export const vitalColor: Record<string, string> = {
  '8867-4': colors.hr,
  '55284-4': colors.bp,
  '9279-1': colors.rr,
  '2708-6': colors.spo2,
  '8310-5': colors.temp,
};
