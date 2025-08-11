import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // IMPORTANT: include the repo name + version path
  base: '/mood-map/v2/',
  plugins: [react()],
  build: {
    outDir: '../docs/v2',   // emit v1 build into docs/v1
    emptyOutDir: true,
  },
  server: {
    hmr: { overlay: false },
  },
});
