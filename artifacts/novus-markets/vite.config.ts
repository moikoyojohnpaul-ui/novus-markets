import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// ✅ FIX: Only enforce PORT check in non-build environments.
// During `vite build` (Vercel), PORT is not set — don't crash.
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;

if (rawPort !== undefined && (Number.isNaN(port) || port <= 0)) {
  throw Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  // ✅ FIX: Allow all hosts — needed for proxied dev environments
  server: {
    host: true,
    allowedHosts: true,
    port,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});