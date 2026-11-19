import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const uiRoot = fileURLToPath(new URL('./src/ui', import.meta.url));

export default defineConfig({
  root: uiRoot,
  plugins: [react()],
  base: '/',
  server: {
    host: '127.0.0.1',
    port: Number(process.env.DEV_UI_PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/api/trpc': `http://127.0.0.1:${process.env.DEV_API_PORT ?? 3000}`,
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist/ui', import.meta.url)),
    emptyOutDir: true,
  },
});
