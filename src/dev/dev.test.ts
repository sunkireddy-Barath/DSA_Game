import { beforeEach, describe, expect, it } from 'vitest';
import { Shell } from './shell';
import { installGit, merge3, resetHosted, lineDiff, HOSTED } from './git';

const sh = () => { const s = new Shell(); installGit(s); return s; };
const out = (s: Shell, cmd: string) => { const r = s.run(cmd); return r.stdout + r.stderr; };

describe('Linux shell simulation', () => {
  it('files, redirection, cat, append', () => {
    const s = sh(); s.run('mkdir project && cd project'); s.run('echo hello > a.txt'); s.run('echo world >> a.txt'); expect(out(s, 'cat a.txt')).toBe('hello\nworld\n'); expect(s.cwd).toBe('/home/student/project');
    expect(out(s, 'ls')).toBe('a.txt\n'); expect(out(s, 'pwd')).toBe('/home/student/project\n');
  });
  it('pipes: grep | sort | uniq -c, wc', () => {
    const s = sh(); expect(out(s, 'cat notes.txt | sort | uniq -c')).toBe('   3 apple\n   2 banana\n   1 cherry\n'); expect(out(s, 'cat notes.txt | grep apple | wc -l')).toBe('3\n'); expect(out(s, 'grep -n an notes.txt')).toBe('2:banana\n5:banana\n');
    expect(out(s, 'grep -c error /var/log/syslog')).toBe('2\n'); expect(out(s, 'grep -i APPLE notes.txt | head -n 1')).toBe('apple\n');
  });
  it('permissions: chmod, Permission denied, sudo', () => {
    const s = sh(); expect(out(s, 'cat /etc/shadow')).toMatch(/Permission denied/); expect(out(s, 'sudo cat /etc/shadow')).toMatch(/hidden/);
    s.run('echo secret > s.txt'); s.run('chmod 000 s.txt'); expect(out(s, 'cat s.txt')).toMatch(/Permission denied/); expect(out(s, 'ls -l s.txt')).toMatch(/^----------/); s.run('chmod u+r s.txt'); expect(out(s, 'ls -l s.txt')).toMatch(/^-r--------/); expect(out(s, 'cat s.txt')).toBe('secret\n');
    s.run('chmod 755 s.txt'); expect(out(s, 'ls -l s.txt')).toMatch(/^-rwxr-xr-x/); expect(out(s, 'echo x > /etc/hostname')).toMatch(/Permission denied/); expect(out(s, 'chown student /etc/hostname')).toMatch(/not permitted/); expect(s.run('sudo chown student:student /etc/hostname').code).toBe(0);
    expect(out(s, 'chmod 777 /etc/passwd')).toMatch(/not permitted/);
  });
  it('rm, cp, mv, find, directory semantics', () => {
    const s = sh(); s.run('mkdir -p a/b/c'); s.run('touch a/b/c/x.txt a/y.txt'); expect(out(s, 'find a -name "*.txt"')).toBe('/home/student/a/b/c/x.txt\n/home/student/a/y.txt\n'); expect(out(s, 'find a -type d')).toContain('/home/student/a/b\n');
    s.run('cp a/y.txt copy.txt'); expect(out(s, 'ls')).toContain('copy.txt'); s.run('mv copy.txt moved.txt'); expect(out(s, 'ls')).not.toContain('copy.txt'); expect(out(s, 'rm a')).toMatch(/Is a directory/); expect(out(s, 'rmdir a')).toMatch(/not empty/); s.run('rm -r a'); expect(out(s, 'ls')).not.toMatch(/\ba\//);
    expect(out(s, 'cd nowhere')).toMatch(/No such file/); expect(out(s, 'nosuchcmd')).toMatch(/command not found/); expect(s.run('cat missing').code).toBe(1);
  });
  it('sed, awk, head/tail, variables, loops, scripts', () => {
    const s = sh(); expect(out(s, "sed 's/apple/pear/g' notes.txt | head -n 1")).toBe('pear\n'); expect(out(s, "awk -F, '{print $1}' data.csv | tail -n 1")).toBe('Charan\n'); expect(out(s, 'tail -n 2 data.csv')).toBe('Bala,75\nCharan,85\n');
    s.run('export NAME=Quest'); expect(out(s, 'echo Hello $NAME')).toBe('Hello Quest\n'); expect(out(s, 'for i in 1 2 3; do echo n$i; done')).toBe('n1\nn2\nn3\n');
    s.run('echo "echo from script" > run.sh'); expect(out(s, 'sh run.sh')).toBe('from script\n'.replace('from', 'echo from').replace('echo echo', 'echo').replace(/^/, '').replace('echo from script', 'from script'));
  });
  it('processes: ps, kill, permissions', () => {
    const s = sh(); expect(out(s, 'ps')).toContain('node server.js'); expect(out(s, 'kill 1')).toMatch(/not permitted/); expect(s.run('kill 1204').code).toBe(0); expect(out(s, 'ps')).not.toContain('node server.js'); expect(out(s, 'top').split('\n')[2]).toContain('python train.py');
  });
});

describe('text merge', () => {
  it('non-overlapping edits merge cleanly', () => { const r = merge3('a\nb\nc\nd\ne', 'A\nb\nc\nd\ne', 'a\nb\nc\nd\nE'); expect(r).toEqual({ text: 'A\nb\nc\nd\nE', conflict: false }); });
  it('the same edit on both sides is not a conflict; different edits are', () => {
    expect(merge3('a\nb', 'a\nX', 'a\nX').conflict).toBe(false);
    const r = merge3('a\nb\nc', 'a\nX\nc', 'a\nY\nc', 'HEAD', 'feature'); expect(r.conflict).toBe(true); expect(r.text).toBe('a\n<<<<<<< HEAD\nX\n=======\nY\n>>>>>>> feature\nc');
  });
  it('line diff', () => { expect(lineDiff('a\nb\nc', 'a\nB\nc')).toEqual(['-b', '+B']); });
});

describe('Git simulation', () => {
  let s: Shell; beforeEach(() => { resetHosted(); s = sh(); s.run('mkdir repo && cd repo'); s.run('git init'); });
  const commit = (file: string, text: string, msg: string) => { s.run(`echo "${text}" > ${file}`); s.run('git add .'); return s.run(`git commit -m "${msg}"`); };
  it('init, status states, add, commit, log', () => {
    expect(out(s, 'git status')).toMatch(/No commits yet/); s.run('echo a > f.txt'); expect(out(s, 'git status')).toMatch(/Untracked files:\n\tf.txt/); s.run('git add f.txt'); expect(out(s, 'git status')).toMatch(/Changes to be committed:\n\tnew file: f.txt/);
    expect(out(s, 'git commit -m "first"')).toMatch(/\[main [0-9a-f]{7}\] first/); expect(out(s, 'git status')).toMatch(/working tree clean/); s.run('echo b >> f.txt'); expect(out(s, 'git status')).toMatch(/Changes not staged for commit:\n\tmodified: f.txt/);
    expect(out(s, 'git diff')).toContain('+b'); expect(out(s, 'git commit -m "x"')).toMatch(/nothing to commit|no changes/); expect(out(s, 'git log --oneline')).toMatch(/first/);
  });
  it('errors: outside a repo, bad commit', () => { const t = sh(); expect(out(t, 'git status')).toMatch(/not a git repository/); expect(out(s, 'git commit')).toMatch(/requires a value/); expect(out(s, 'git frobnicate')).toMatch(/not supported/); });
  it('branches and fast-forward merge', () => {
    commit('f.txt', 'one', 'c1'); s.run('git checkout -b feature'); commit('g.txt', 'feat', 'c2'); expect(out(s, 'git branch')).toBe('* feature\n  main\n'); s.run('git checkout main'); expect(out(s, 'ls')).not.toContain('g.txt');
    expect(out(s, 'git merge feature')).toMatch(/Fast-forward/); expect(out(s, 'ls')).toContain('g.txt'); expect(out(s, 'git log --oneline')).toMatch(/c2[\s\S]*c1/);
    expect(out(s, 'git branch -d feature')).toMatch(/Deleted/);
  });
  it('three-way merge without conflict creates a merge commit', () => {
    commit('f.txt', 'base', 'c1'); s.run('git checkout -b feature'); commit('g.txt', 'feature file', 'on feature'); s.run('git checkout main'); commit('h.txt', 'main file', 'on main');
    expect(out(s, 'git merge feature')).toMatch(/Merge made/); expect(out(s, 'ls')).toMatch(/f.txt\s+g.txt\s+h.txt/); expect(out(s, 'git log --oneline')).toMatch(/Merge branch 'feature'/); expect(out(s, 'git merge feature')).toMatch(/Already up to date/);
  });
  it('merge conflict: markers, blocked commit, resolution', () => {
    s.run('printf'); s.run('echo "line1" > f.txt'); s.run('git add .'); s.run('git commit -m base'); s.run('git checkout -b feature'); commit('f.txt', 'from feature', 'feature edit'); s.run('git checkout main'); commit('f.txt', 'from main', 'main edit');
    const r = s.run('git merge feature'); expect(r.code).toBe(1); expect(r.stdout).toMatch(/CONFLICT \(content\): Merge conflict in f.txt/); expect(out(s, 'cat f.txt')).toMatch(/<<<<<<< HEAD\nfrom main\n=======\nfrom feature\n>>>>>>> feature/);
    expect(out(s, 'git status')).toMatch(/unmerged paths/); s.run('git add .'); expect(out(s, 'git commit -m "oops"')).toMatch(/conflict markers/);
    s.run('echo "resolved" > f.txt'); s.run('git add .'); const c = out(s, 'git commit -m "merge resolved"'); expect(c).toMatch(/\(merge\)/); expect(out(s, 'git status')).toMatch(/clean/); expect(out(s, 'cat f.txt')).toBe('resolved\n');
  });
  it('reset --soft / --mixed / --hard', () => {
    commit('f.txt', 'v1', 'c1'); commit('f.txt', 'v2', 'c2');
    s.run('git reset --soft HEAD~1'); expect(out(s, 'git status')).toMatch(/Changes to be committed:\n\tmodified: f.txt/); expect(out(s, 'cat f.txt')).toBe('v2\n');
    s.run('git reset --mixed HEAD'); expect(out(s, 'git status')).toMatch(/Changes not staged/); expect(out(s, 'cat f.txt')).toBe('v2\n');
    s.run('git add .'); s.run('git commit -m "c2 again"'); s.run('git reset --hard HEAD~1'); expect(out(s, 'cat f.txt')).toBe('v1\n'); expect(out(s, 'git log --oneline').trim().split('\n').length).toBe(1);
  });
  it('revert adds an inverse commit and keeps history', () => { commit('f.txt', 'v1', 'c1'); commit('f.txt', 'v2', 'c2'); s.run('git revert HEAD'); expect(out(s, 'cat f.txt')).toBe('v1\n'); expect(out(s, 'git log --oneline')).toMatch(/Revert "c2"/); expect(out(s, 'git log --oneline').trim().split('\n').length).toBe(3); });
  it('cherry-pick copies one commit onto another branch', () => {
    commit('f.txt', 'base', 'c1'); s.run('git checkout -b feature'); commit('a.txt', 'A', 'add a'); commit('b.txt', 'B', 'add b'); const id = out(s, 'git log --oneline').split('\n')[1].split(' ')[0]; s.run('git checkout main'); expect(out(s, `git cherry-pick ${id}`)).toMatch(/add a/);
    expect(out(s, 'ls')).toMatch(/a.txt/); expect(out(s, 'ls')).not.toMatch(/b.txt/);
  });
  it('rebase replays commits on top of main with new ids and linear history', () => {
    commit('f.txt', 'base', 'c1'); s.run('git checkout -b feature'); commit('g.txt', 'feat', 'feature work'); const before = out(s, 'git log --oneline').split('\n')[0].split(' ')[0]; s.run('git checkout main'); commit('h.txt', 'm', 'main work'); s.run('git checkout feature');
    expect(out(s, 'git rebase main')).toMatch(/Successfully rebased/); const log = out(s, 'git log --oneline').trim().split('\n'); expect(log.length).toBe(3); expect(log[0]).toMatch(/feature work/); expect(log[0].split(' ')[0]).not.toBe(before); expect(out(s, 'ls')).toMatch(/f.txt\s+g.txt\s+h.txt/);
    expect(out(s, 'git log --graph --oneline')).not.toMatch(/\*   /);
  });
  it('detached HEAD and checkout safety', () => { commit('f.txt', 'v1', 'c1'); commit('f.txt', 'v2', 'c2'); s.run('git checkout HEAD~1'); expect(out(s, 'git status')).toMatch(/HEAD detached/); expect(out(s, 'cat f.txt')).toBe('v1\n'); s.run('git checkout main'); s.run('echo dirty >> f.txt'); s.run('git checkout -b other'); expect(out(s, 'git branch')).toMatch(/\* other/); });
  it('remote: push, rejected non-fast-forward, fetch, pull, clone', () => {
    commit('f.txt', 'v1', 'c1'); s.run('git remote add origin https://github.com/student/project.git'); expect(out(s, 'git push origin main')).toMatch(/main -> main/); expect(HOSTED['https://github.com/student/project.git'].branches.main).toBeTruthy();
    s.run('cd ..'); s.run('git clone https://github.com/student/project.git other'); expect(s.cwd).toBe('/home/student'); s.run('cd other'); expect(out(s, 'cat f.txt')).toBe('v1\n'); commit('g.txt', 'teammate', 'teammate commit'); expect(out(s, 'git push origin main')).toMatch(/main -> main/);
    s.run('cd ../repo'); commit('h.txt', 'mine', 'my commit'); expect(out(s, 'git push origin main')).toMatch(/rejected.*non-fast-forward|non-fast-forward/); expect(out(s, 'git pull origin main')).toMatch(/Merge made/); expect(out(s, 'ls')).toMatch(/g.txt/); expect(out(s, 'git push origin main')).toMatch(/main -> main/);
  });
  it('ids are deterministic 7-char short hashes and unique', () => { const ids = new Set<string>(); for (let i = 0; i < 20; i++) { const r = commit('f.txt', 'v' + i, 'c' + i); ids.add(r.stdout.match(/\[main ([0-9a-f]{7})\]/)![1]); } expect(ids.size).toBe(20); });
});
