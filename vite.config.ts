import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function injectSwVersion(): Plugin {
  const buildTime = Date.now();
  return {
    name: 'inject-sw-version',
    apply: 'build' as const,
    closeBundle() {
      const swPath = resolve(process.cwd(), 'dist/sw.js');
      try {
        const src = readFileSync(swPath, 'utf-8');
        writeFileSync(swPath, src.replaceAll('__BUILD_TIME__', String(buildTime)));
      } catch { /* sw.js not in dist */ }
    },
  };
}

export default defineConfig({
  plugins: [react(), injectSwVersion()],

  server: {
    port: 5173,
    host: true,
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
