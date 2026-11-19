import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const uiRoot = fileURLToPath(new URL('./src/ui', import.meta.url));

export default defineConfig({
  root: uiRoot,
  plugins: [react()],
  base: '/',
  build: {
    outDir: fileURLToPath(new URL('./dist/ui', import.meta.url)),
    emptyOutDir: true,
  },
});
