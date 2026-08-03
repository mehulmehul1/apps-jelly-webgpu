import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve('index.html'),
        gallery: resolve('gallery.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
