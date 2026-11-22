import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Same-origin API: /api is proxied to the FastAPI backend in dev and preview. On Vercel the same path is rewritten (see vercel.json).
const API = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000';
const proxy = { '/api': { target: API, changeOrigin: false } };

// The production Content-Security-Policy lives in vercel.json; `vite preview` serves exactly the same headers so they can be tested for real.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
const previewHeaders = Object.fromEntries((vercel.headers?.[0]?.headers ?? []).map((h: { key: string; value: string }) => [h.key, h.value]));

export default defineConfig({
  plugins: [react()],
  test: { exclude: ['e2e/**', 'node_modules/**', 'dist/**'] },   // e2e/ holds the Playwright browser tests (npm run test:e2e)
  server: { proxy },
  preview: { proxy, headers: previewHeaders },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'], state: ['zustand'], sqljs: ['sql.js'] } } },
  },
});
