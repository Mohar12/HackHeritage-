import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND_URL = process.env.VITE_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy API calls to the FastAPI backend during development
      '/auth':          { target: BACKEND_URL, changeOrigin: true },
      '/api':           { target: BACKEND_URL, changeOrigin: true },
      '/generate-keys': { target: BACKEND_URL, changeOrigin: true },
      '/signatures':    { target: BACKEND_URL, changeOrigin: true },
      '/simulate-attack': { target: BACKEND_URL, changeOrigin: true },
      '/detect':        { target: BACKEND_URL, changeOrigin: true },
      '/health':        { target: BACKEND_URL, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
