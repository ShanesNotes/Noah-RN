import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/fhir': {
        target: 'http://10.0.0.184:8103',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fhir/, '/fhir/R4'),
      },
      '/oauth2': {
        target: 'http://10.0.0.184:8103',
        changeOrigin: true,
      },
    },
  },
})
