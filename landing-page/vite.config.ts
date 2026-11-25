import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Three.js / R3F are only imported from the lazily loaded hero scene, so they
// end up in their own chunk without manual chunking.
export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1000 },
});
