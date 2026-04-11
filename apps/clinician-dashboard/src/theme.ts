import { createTheme, type MantineColorsTuple } from '@mantine/core';

const clinicalDark: MantineColorsTuple = [
  '#E8ECF1', '#C8D0DA', '#A8B4C3', '#8898AC',
  '#6B7A8D', '#4E5D6E', '#364050', '#242D3A',
  '#141821', '#0B0E14',
];

export const theme = createTheme({
  primaryColor: 'cyan',
  fontFamily: '"Outfit", sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", monospace',
  headings: { fontFamily: '"JetBrains Mono", monospace' },
  colors: { clinical: clinicalDark },
  defaultRadius: 'sm',
  black: '#0B0E14',
  white: '#E8ECF1',
});

export const colors = {
  bg: '#0B0E14',
  surface: '#141821',
  surfaceHover: '#1A2030',
  border: '#1E2430',
  borderLight: '#2A3344',
  textPrimary: '#E8ECF1',
  textSecondary: '#6B7A8D',
  textMuted: '#4E5D6E',

  hr: '#FF6B6B',
  bp: '#FFA94D',
  rr: '#51CF66',
  spo2: '#339AF0',
  temp: '#CC5DE8',

  critical: '#FF4444',
  warning: '#FFA94D',
  normal: '#51CF66',
  info: '#339AF0',

  medActive: '#51CF66',
  medStopped: '#868E96',
  medDraft: '#FFA94D',
} as const;

export const vitalColor: Record<string, string> = {
  '8867-4': colors.hr,
  '55284-4': colors.bp,
  '9279-1': colors.rr,
  '2708-6': colors.spo2,
  '8310-5': colors.temp,
};
