import { createTheme, type MantineColorsTuple } from '@mantine/core';
import { zincDark } from '@noah-rn/ui-tokens';

export { colors, vitalColor } from '@noah-rn/ui-tokens';

const zincPalette = [...zincDark] as unknown as MantineColorsTuple;

export const theme = createTheme({
  primaryColor: 'cyan',
  fontFamily: '"Outfit", sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", monospace',
  headings: { fontFamily: '"JetBrains Mono", monospace' },
  colors: { zinc: zincPalette },
  defaultRadius: 'xs',
  black: '#09090b',
  white: '#fafafa',
});
