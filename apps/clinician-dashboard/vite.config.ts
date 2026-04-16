import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = process.env.FHIR_PROXY_TARGET ?? 'http://10.0.0.184:8103';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/fhir': {
        target: proxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fhir/, '/fhir/R4'),
      },
      '/oauth2': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
