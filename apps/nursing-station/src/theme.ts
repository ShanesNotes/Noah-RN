import { createTheme, type MantineColorsTuple } from '@mantine/core';

export const colors = {
  bg: '#09090b',
  surface: '#18181b',
  surfaceHover: '#27272a',
  border: '#27272a',
  borderLight: '#3f3f46',
  textPrimary: '#fafafa',
  textSecondary: '#71717a',
  textMuted: '#52525b',
  accent: '#0ea5e9',
  
  hr: '#e11d48',
  bp: '#ea580c',
  rr: '#16a34a',
  spo2: '#0284c7',
  temp: '#9333ea',
} as const;

const zincDark: MantineColorsTuple = [
  '#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8',
  '#a1a1aa', '#71717a', '#52525b', '#3f3f46',
  '#27272a', '#18181b',
];

export const theme = createTheme({
  primaryColor: 'cyan',
  fontFamily: '"Outfit", sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", monospace',
  headings: { fontFamily: '"JetBrains Mono", monospace' },
  colors: { zinc: zincDark },
  defaultRadius: 'xs',
  black: '#09090b',
  white: '#fafafa',
  components: {
    AppShell: {
      styles: {
        main: { background: colors.bg },
      }
    }
  }
});
