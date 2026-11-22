import { Shell } from './shell';
import { HOSTED, Repo, installGit, resetHosted, status, workTree } from './git';

export interface Mission { id: string; title: string; goal: string; hints: string[]; setup: string[]; check: (sh: Shell, repo: Repo | null, last: { cmd: string; out: string }) => boolean }
export const repoOf = (sh: Shell) => (sh as any).gitState?.repo as Repo | null;
const mkConflict = ['mkdir shop', 'cd shop', 'git init', 'echo "price = 10" > price.txt', 'git add .', 'git commit -m base', 'git checkout -b sale', 'echo "price = 8" > price.txt', 'git commit -am "sale price"', 'git checkout main', 'echo "price = 12" > price.txt', 'git commit -am "price increase"', 'git merge sale'];
export const MISSIONS: Mission[] = [
  { id: 'm1', title: 'Your first commit', goal: 'Create a repository, add a file and make a commit.', hints: ['git init', 'echo hello > readme.txt', 'git add readme.txt', 'git commit -m "first commit"'], setup: ['mkdir hello', 'cd hello'], check: (_, r) => !!r && r.commits.size >= 1 },
  { id: 'm2', title: 'Branch and fast-forward', goal: 'Create a branch "feature", commit on it, switch back to main and merge it (main must fast-forward to feature).', hints: ['git checkout -b feature', 'commit a new file', 'git checkout main', 'git merge feature'], setup: ['mkdir app', 'cd app', 'git init', 'echo v1 > app.txt', 'git add .', 'git commit -m "v1"'], check: (_, r) => !!r && !!r.branches.feature && r.branches.main === r.branches.feature && r.commits.size >= 2 },
  { id: 'm3', title: 'Resolve a merge conflict', goal: 'The merge of "sale" into main conflicted. Edit price.txt to the final value you want, stage it and complete the merge commit.', hints: ['cat price.txt to see the markers', 'echo "price = 10" > price.txt', 'git add price.txt', 'git commit -m "resolve price"'], setup: mkConflict, check: (sh, r) => { if (!r || r.merging) return false; const c = r.commits.get(r.headId ?? ''); const f = workTree(sh, r)['price.txt'] ?? ''; return !!c && c.parents.length === 2 && !/<<<<<<<|>>>>>>>/.test(f); } },
  { id: 'm4', title: 'Undo a mistake', goal: 'The last commit replaced the config with "oops". Restore "good" using git revert (keep history) or git reset --hard.', hints: ['git log --oneline', 'git revert HEAD', 'or: git reset --hard HEAD~1'], setup: ['mkdir cfg', 'cd cfg', 'git init', 'echo good > config.txt', 'git add .', 'git commit -m "good config"', 'echo oops > config.txt', 'git commit -am "bad change"'], check: (sh, r) => !!r && (workTree(sh, r)['config.txt'] ?? '') === 'good\n' && status(sh, r).unstaged.length === 0 },
  { id: 'm5', title: 'GitHub flow: push a feature', goal: 'Clone the project, create branch "feature-login", commit a file and push the branch to origin.', hints: ['git clone https://github.com/student/project.git', 'cd project', 'git checkout -b feature-login', 'echo login > login.txt', 'git add .', 'git commit -m "add login"', 'git push origin feature-login'], setup: ['__seed_remote__'], check: () => { const rem = HOSTED['https://github.com/student/project.git']; return !!rem && !!rem.branches['feature-login'] && Object.keys(rem.commits).length >= 2; } },
  { id: 'l1', title: 'Linux: count the errors', goal: 'Use a pipeline to print how many lines of /var/log/syslog contain "error" (should print 2).', hints: ['grep error /var/log/syslog', 'add | wc -l'], setup: [], check: (_, __, l) => /grep/.test(l.cmd) && /\|/.test(l.cmd) && l.out.trim() === '2' },
  { id: 'l2', title: 'Linux: make a script executable', goal: 'deploy.sh exists but is not executable. Give the owner execute permission (leave others unchanged) and run it with sh.', hints: ['ls -l deploy.sh', 'chmod u+x deploy.sh', 'sh deploy.sh'], setup: ['echo "echo deploying..." > deploy.sh', 'chmod 644 deploy.sh'], check: (sh, _, l) => { const n = sh.fs.get('/home/student/deploy.sh'); return !!n && (n.mode & 0o100) !== 0 && (n.mode & 0o011) === 0 && /^sh deploy.sh/.test(l.cmd) && l.out.includes('deploying'); } },
  { id: 'l3', title: 'Linux: top scorer', goal: 'From data.csv (name,score) print only the names, sorted alphabetically, without the header line.', hints: ['tail -n 3 data.csv', 'awk -F, \'{print $1}\'', 'sort'], setup: [], check: (_, __, l) => l.out.trim() === 'Arun\nBala\nCharan' && /\|/.test(l.cmd) },
];


export function buildEnv(setup: string[] = []): Shell {
  resetHosted(); const s = new Shell(); installGit(s);
  if (setup[0] === '__seed_remote__') { const t = new Shell(); installGit(t); t.run('mkdir seed && cd seed && git init'); t.run('echo "# project" > README.md'); t.run('git add .'); t.run('git commit -m "initial commit"'); t.run('git remote add origin https://github.com/student/project.git'); t.run('git push origin main'); }
  else setup.forEach(c => s.run(c));
  return s;
}
