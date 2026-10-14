import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // frontend/.env dan ham o'qiladi; Docker'dagi muhit o'zgaruvchisi ustun turadi
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          // Docker ichida http://backend:3001, lokalda localhost.
          // `npm run dev:prod` — Docker'siz, production API bilan (haqiqiy baza!)
          target: env.VITE_PROXY_TARGET || (mode === 'prod-api' ? 'https://api.formo.uz' : 'http://localhost:3001'),
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      restoreMocks: true,
      unstubGlobals: true,
      unstubEnvs: true,
    },
  };
});
