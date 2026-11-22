import { defineConfig } from '@playwright/test';
import { readdirSync, rmSync } from 'node:fs';

const win = process.platform === 'win32';
// Every run gets its own empty user database. (This file is evaluated again inside the test worker, so it must never delete the
// database the already-running backend is using: stale files are removed only from the main process.)
const isWorker = process.env.TEST_WORKER_INDEX !== undefined;
if (!isWorker) {
  try { for (const f of readdirSync('backend/data')) if (/^e2e-.*\.db/.test(f)) rmSync(`backend/data/${f}`, { force: true }); } catch { /* no data dir yet */ }
}
const DB = `data/e2e-${process.env.E2E_RUN_ID ?? (process.env.E2E_RUN_ID = String(Date.now()))}.db`;

// Real browser (Microsoft Edge, already installed) against: the production build served by `vite preview` with the production
// security headers, the real FastAPI backend with the real Docker sandbox, and a local stand-in for the Anthropic API.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'msedge', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node e2e/fake-anthropic.mjs', url: 'http://127.0.0.1:9911/health', timeout: 20_000 },
    {
      command: `${win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python'} -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000`,
      cwd: 'backend', url: 'http://127.0.0.1:8000/api/health', timeout: 60_000,
      env: {
        APP_ENV: 'dev', COOKIE_SECURE: 'false', DATABASE_PATH: DB, REGISTER_LIMIT_PER_HOUR: '500',
        ANTHROPIC_API_KEY: 'e2e-key', ANTHROPIC_URL: 'http://127.0.0.1:9911/v1/messages',
        DOCKER_CMD: process.env.DOCKER_CMD ?? (win ? 'wsl -d Ubuntu-22.04 -e docker' : 'docker'),
      },
    },
    { command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', timeout: 60_000 },
  ],
});
