import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    cssMinify: 'esbuild',
  },
  server: {
    port: 3001,
  },
  preview: {
    port: 3001,
  },
});
