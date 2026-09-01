import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy API calls to the FastAPI backend during development
      '/generate-keys': { target: 'http://backend:8000', changeOrigin: true },
      '/signatures':    { target: 'http://backend:8000', changeOrigin: true },
      '/simulate-attack': { target: 'http://backend:8000', changeOrigin: true },
      '/detect':        { target: 'http://backend:8000', changeOrigin: true },
      '/health':        { target: 'http://backend:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
