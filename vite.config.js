import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyPwaArtifactsPlugin() {
  return {
    name: 'copy-pwa-artifacts',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;

      for (const file of ['sw.js', 'manifest.json']) {
        const src = path.resolve(__dirname, file);
        const dest = path.resolve(distDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), copyPwaArtifactsPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: path.resolve(__dirname, 'Index.html')
    }
  }
});
