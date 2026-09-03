import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Deshabilita los archivos .map para que nadie pueda ver el código fuente original TypeScript en DevTools
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});