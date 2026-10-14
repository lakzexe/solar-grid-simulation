import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/simulations': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/compare': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/engine': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/demo': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/integrations': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
