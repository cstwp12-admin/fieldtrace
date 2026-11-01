import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    sourcemap: false,
    rollupOptions: { output: { manualChunks: { mapping: ['leaflet'], storage: ['dexie'], validation: ['zod'], react: ['react', 'react-dom'] } } }
  },
  server: { port: 5178, strictPort: true }
});
