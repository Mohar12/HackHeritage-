import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy API calls to the FastAPI backend during local development if relative URLs are used
      '/api':             { target: process.env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
      '/generate-keys':   { target: process.env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
      '/signatures':      { target: process.env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
      '/simulate-attack': { target: process.env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
      '/detect':          { target: process.env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
      '/health':          { target: process.env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
