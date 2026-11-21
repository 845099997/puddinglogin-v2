import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(here, '../assets'),
    emptyOutDir: false,
    assetsDir: '.',
    sourcemap: false,
    target: 'es2019',
    rollupOptions: {
      input: resolve(here, 'src/main.tsx'),
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'chunk-[hash].js',
        assetFileNames: (info) => {
          const names = (info.names && info.names.length ? info.names : [info.name || '']).join(',');
          if (names.includes('.css')) return 'app.css';
          return '[name][extname]';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api.php': 'http://127.0.0.1',
      '/connect.php': 'http://127.0.0.1',
    },
  },
});
