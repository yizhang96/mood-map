import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/mood-map/', // Vite base for Github pages
  plugins: [react()],
  server: {
    hmr: {
      overlay: false,    // turn off the red‐box overlay
    },
  },
});
