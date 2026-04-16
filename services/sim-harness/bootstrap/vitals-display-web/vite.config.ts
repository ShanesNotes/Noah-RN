import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy /api to the Pulse sidecar. Defaults to the docker-compose service
// name (pulse-sidecar:8104) when running inside the bootstrap container, and
// to localhost:8104 when running `npm run dev` on the host.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const pulseUrl =
    env.VITE_PULSE_URL ?? 'http://localhost:8104';

  return {
    plugins: [react()],
    server: {
      port: Number(env.DISPLAY_PORT ?? 5173),
      proxy: {
        '/api': {
          target: pulseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});
