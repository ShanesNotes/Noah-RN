import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/fhir': {
        target: 'http://10.0.0.184:8080',
        changeOrigin: true,
      },
    },
  },
})
