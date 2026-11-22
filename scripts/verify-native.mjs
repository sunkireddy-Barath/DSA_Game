// One command for the real-compiler check:  npm run verify:native [-- --ubsan] [-- --workers 6]
// 1) dump every solution and its test inputs + reference answers  2) compile and run them all with g++ inside the Docker sandbox
// 3) compare the native results with the references using the app's own judge rules. Needs Docker and `docker pull gcc:13-bookworm`.
import { spawnSync } from 'node:child_process';

const win = process.platform === 'win32';
const py = win ? 'backend\\.venv\\Scripts\\python.exe' : 'backend/.venv/bin/python';
const extra = process.argv.slice(2);
const docker = process.env.DOCKER_CMD ?? (win ? 'wsl -d Ubuntu-22.04 -e docker' : 'docker');

const step = (label, cmd, args, env = {}) => {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: win, env: { ...process.env, ...env } });
  if (r.status !== 0) { console.error(`${label} failed (exit ${r.status})`); process.exit(r.status ?? 1); }
};

step('1/3 dump cases', 'npx', ['vitest', 'run', 'src/nativeVerify.test.ts'], { NATIVE_VERIFY: 'dump' });
step('2/3 run on real g++ in the sandbox', py, ['backend/tools/verify_problems.py', ...extra], { DOCKER_CMD: docker });
step('3/3 compare with the reference answers', 'npx', ['vitest', 'run', 'src/nativeVerify.test.ts'], { NATIVE_VERIFY: 'compare' });
console.log('\nAll solutions agree with the reference answers on real g++. Report: tools/native/report.txt');
