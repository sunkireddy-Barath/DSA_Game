// Runs the backend's virtualenv Python on any OS:  node scripts/py.mjs -m pytest -q
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const win = process.platform === 'win32';
const py = resolve('backend', '.venv', win ? 'Scripts' : 'bin', win ? 'python.exe' : 'python');
if (!existsSync(py)) { console.error(`Backend virtualenv not found at ${py}. Create it:\n  cd backend && python -m venv .venv && ${win ? '.venv\\Scripts\\pip' : '.venv/bin/pip'} install -r requirements-dev.txt`); process.exit(1); }
const r = spawnSync(py, process.argv.slice(2), { stdio: 'inherit', cwd: resolve('backend') });
if (r.error) { console.error(r.error.message); process.exit(1); }
process.exit(r.status ?? 1);
