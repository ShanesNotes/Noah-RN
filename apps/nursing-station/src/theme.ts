import { createTheme, type MantineColorsTuple } from '@mantine/core';
import { colors, zincDark } from '@noah-rn/ui-tokens';

export { colors } from '@noah-rn/ui-tokens';

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
  components: {
    AppShell: {
      styles: {
        main: { background: colors.bg },
      }
    }
  }
});
