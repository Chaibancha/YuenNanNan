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

      // Copy manifest.json
      const manifestSrc = path.resolve(__dirname, 'manifest.json');
      if (fs.existsSync(manifestSrc)) {
        fs.copyFileSync(manifestSrc, path.resolve(distDir, 'manifest.json'));
      }

      // Discover hashed Vite bundle assets so offline SW precaches all JS/CSS
      const assetsDir = path.resolve(distDir, 'assets');
      let builtAssets = [];
      if (fs.existsSync(assetsDir)) {
        builtAssets = fs
          .readdirSync(assetsDir)
          .filter(f => /\.(js|css)$/.test(f))
          .map(f => `./assets/${f}`);
      }

      // Inject built assets list into dist/sw.js
      const swSrc = path.resolve(__dirname, 'sw.js');
      if (fs.existsSync(swSrc)) {
        let swContent = fs.readFileSync(swSrc, 'utf8');
        swContent = swContent.replace(
          'const BUILD_ASSETS = [];',
          `const BUILD_ASSETS = ${JSON.stringify(builtAssets)};`
        );
        fs.writeFileSync(path.resolve(distDir, 'sw.js'), swContent, 'utf8');
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
      input: path.resolve(__dirname, 'index.html'),
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
});
