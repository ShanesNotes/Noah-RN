import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mantine/notifications': '/home/ark/noah-rn/dashboard/src/stubs/mantine-notifications.ts',
    },
  },
})
