import { describe, expect, it } from 'vitest';
import { MISSIONS, buildEnv, repoOf } from './missions';

// The commands a student would type to finish each mission.
const SOLUTIONS: Record<string, string[]> = {
  m1: ['git init', 'echo hello > readme.txt', 'git add readme.txt', 'git commit -m "first commit"'],
  m2: ['git checkout -b feature', 'echo f > f.txt', 'git add .', 'git commit -m "feature work"', 'git checkout main', 'git merge feature'],
  m3: ['cat price.txt', 'echo "price = 10" > price.txt', 'git add price.txt', 'git commit -m "resolve price"'],
  m4: ['git log --oneline', 'git revert HEAD'],
  m5: ['git clone https://github.com/student/project.git', 'cd project', 'git checkout -b feature-login', 'echo login > login.txt', 'git add .', 'git commit -m "add login"', 'git push origin feature-login'],
  l1: ['grep error /var/log/syslog | wc -l'],
  l2: ['ls -l deploy.sh', 'chmod u+x deploy.sh', 'sh deploy.sh'],
  l3: ["tail -n 3 data.csv | awk -F, '{print $1}' | sort"],
};

describe('developer missions are solvable and not trivially satisfied', () => {
  for (const m of MISSIONS) {
    it(`${m.id}: ${m.title}`, () => {
      const sh = buildEnv(m.setup);
      expect(m.check(sh, repoOf(sh), { cmd: '', out: '' }), 'must not be complete before the student acts').toBe(false);
      let last = { cmd: '', out: '' };
      for (const c of SOLUTIONS[m.id]) { const r = sh.run(c); expect(r.code, `${c} -> ${r.stderr}`).toBe(0); last = { cmd: c, out: r.stdout }; }
      expect(m.check(sh, repoOf(sh), last)).toBe(true);
    });
  }
  it('m4 can also be solved with reset --hard', () => {
    const m = MISSIONS.find(x => x.id === 'm4')!; const sh = buildEnv(m.setup); sh.run('git reset --hard HEAD~1'); expect(m.check(sh, repoOf(sh), { cmd: '', out: '' })).toBe(true);
  });
  it('m3 setup really leaves the repo mid-merge with conflict markers', () => {
    const m = MISSIONS.find(x => x.id === 'm3')!; const sh = buildEnv(m.setup); expect(repoOf(sh)!.merging).not.toBeNull(); expect(sh.run('cat price.txt').stdout).toMatch(/<<<<<<< HEAD/);
  });
  it('a wrong answer does not pass (l1 needs the pipeline and the right count)', () => {
    const m = MISSIONS.find(x => x.id === 'l1')!; const sh = buildEnv(m.setup); const r = sh.run('grep error /var/log/syslog'); expect(m.check(sh, null, { cmd: 'grep error /var/log/syslog', out: r.stdout })).toBe(false);
  });
});
