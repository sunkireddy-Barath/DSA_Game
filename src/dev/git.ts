// A small but faithful Git model working on the shell's virtual file system. It is a SIMULATION:
// hashes are FNV-1a (not SHA-1), objects are whole-tree snapshots, and only the common commands exist.
import type { Out, Shell } from './shell';

export type Tree = Record<string, string>;
export interface Commit { id: string; parents: string[]; message: string; tree: Tree; seq: number }
export interface Remote { commits: Record<string, Commit>; branches: Record<string, string> }
export const HOSTED: Record<string, Remote> = {};
export const resetHosted = () => { Object.keys(HOSTED).forEach(k => delete HOSTED[k]); HOSTED['https://github.com/student/project.git'] = { commits: {}, branches: {} }; };
resetHosted();

const fnv = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
export const short = (id: string) => id.slice(0, 7);

// ---------------------------------------------------------------- text 3-way merge
function lcsPairs(a: string[], b: string[]): [number, number][] {
  const n = a.length, m = b.length; const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: [number, number][] = []; let i = 0, j = 0; while (i < n && j < m) { if (a[i] === b[j]) { out.push([i, j]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; } return out;
}
interface Chunk { s: number; e: number; lines: string[] }
function chunks(base: string[], side: string[]): Chunk[] {
  const pairs = lcsPairs(base, side); const out: Chunk[] = []; let bi = 0, si = 0;
  for (const [i, j] of [...pairs, [base.length, side.length] as [number, number]]) { if (i > bi || j > si) out.push({ s: bi, e: i, lines: side.slice(si, j) }); bi = i + 1; si = j + 1; } return out;
}
export function merge3(base: string, ours: string, theirs: string, ourLabel = 'HEAD', theirLabel = 'branch'): { text: string; conflict: boolean } {
  if (ours === theirs) return { text: ours, conflict: false }; if (base === ours) return { text: theirs, conflict: false }; if (base === theirs) return { text: ours, conflict: false };
  const NL = String.fromCharCode(10);
  const B = base.split(NL), O = ours.split(NL), T = theirs.split(NL); const co = chunks(B, O), ct = chunks(B, T);
  const out: string[] = []; let pos = 0, a = 0, b = 0, conflict = false;
  const side = (chs: Chunk[], s: number, e: number) => { const r: string[] = []; let p = s; for (const c of chs) { r.push(...B.slice(p, c.s), ...c.lines); p = c.e; } r.push(...B.slice(p, e)); return r; };
  while (a < co.length || b < ct.length) {
    const x = co[a], y = ct[b];
    if (x && y && x.s <= y.e && y.s <= x.e) { // overlapping or touching hunks form one cluster
      let s = Math.min(x.s, y.s), e = Math.max(x.e, y.e); const oi = [x], ti = [y]; a++; b++;
      for (let ext = true; ext;) { ext = false; if (co[a] && co[a].s <= e) { e = Math.max(e, co[a].e); oi.push(co[a++]); ext = true; } if (ct[b] && ct[b].s <= e) { e = Math.max(e, ct[b].e); ti.push(ct[b++]); ext = true; } }
      const oL = side(oi, s, e), tL = side(ti, s, e); out.push(...B.slice(pos, s));
      if (JSON.stringify(oL) === JSON.stringify(tL)) out.push(...oL); else { conflict = true; out.push(`<<<<<<< ${ourLabel}`, ...oL, '=======', ...tL, `>>>>>>> ${theirLabel}`); }
      pos = e; continue;
    }
    const takeO = !!x && (!y || x.s < y.s); const c = takeO ? x : y; out.push(...B.slice(pos, c.s), ...c.lines); pos = c.e; if (takeO) a++; else b++;
  }
  out.push(...B.slice(pos)); return { text: out.join(NL), conflict };
}
export function lineDiff(a: string, b: string): string[] {
  const A = a.split('\n'), B = b.split('\n'); const pairs = lcsPairs(A, B); const out: string[] = []; let i = 0, j = 0;
  for (const [pi, pj] of [...pairs, [A.length, B.length] as [number, number]]) { while (i < pi) out.push('-' + A[i++]); while (j < pj) out.push('+' + B[j++]); i++; j++; } return out;
}
function mergeTrees(base: Tree, ours: Tree, theirs: Tree, ourLabel: string, theirLabel: string) {
  const res: Tree = {}; const conflicts: string[] = [];
  for (const p of new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])) {
    const b = base[p], o = ours[p], t = theirs[p];
    if (o === t) { if (o !== undefined) res[p] = o; continue; } if (b === o) { if (t !== undefined) res[p] = t; continue; } if (b === t) { if (o !== undefined) res[p] = o; continue; }
    if (o === undefined || t === undefined) { conflicts.push(p); res[p] = (o ?? t)!; continue; } // modify/delete
    const m = merge3(b ?? '', o, t, ourLabel, theirLabel); res[p] = m.text; if (m.conflict) conflicts.push(p);
  }
  return { tree: res, conflicts };
}

// ---------------------------------------------------------------- repository
export class Repo {
  root: string; commits = new Map<string, Commit>(); branches: Record<string, string> = {}; head: { branch: string | null; id: string | null } = { branch: 'main', id: null };
  index: Tree = {}; seq = 0; merging: { other: string; label: string } | null = null; remotes: Record<string, string> = {}; remoteRefs: Record<string, string> = {}; reflog: string[] = [];
  constructor(root: string) { this.root = root; }
  get headId(): string | null { return this.head.branch ? this.branches[this.head.branch] ?? null : this.head.id; }
  headTree(): Tree { const id = this.headId; return id ? this.commits.get(id)!.tree : {}; }
  isAncestor(a: string, b: string): boolean { const seen = new Set<string>(); const st = [b]; while (st.length) { const x = st.pop()!; if (x === a) return true; if (seen.has(x)) continue; seen.add(x); this.commits.get(x)?.parents.forEach(p => st.push(p)); } return false; }
  ancestors(id: string): Set<string> { const seen = new Set<string>(); const st = [id]; while (st.length) { const x = st.pop()!; if (seen.has(x)) continue; seen.add(x); this.commits.get(x)?.parents.forEach(p => st.push(p)); } return seen; }
  mergeBase(a: string, b: string): string | null { const A = this.ancestors(a); const cands = [...this.ancestors(b)].filter(x => A.has(x)); cands.sort((x, y) => this.commits.get(y)!.seq - this.commits.get(x)!.seq); return cands.find(c => !cands.some(d => d !== c && this.isAncestor(c, d))) ?? null; }
  newCommit(parents: string[], message: string, tree: Tree): Commit { const seq = ++this.seq; const id = fnv(JSON.stringify([parents, message, tree, seq])) + fnv(String(seq) + message); const c = { id, parents, message, tree: { ...tree }, seq }; this.commits.set(id, c); return c; }
  setHead(id: string) { if (this.head.branch) this.branches[this.head.branch] = id; else this.head.id = id; }
}

const cleanRel = (root: string, p: string) => p.slice(root.length).replace(/^\//, '');
export function workTree(sh: Shell, repo: Repo): Tree { const t: Tree = {}; sh.fs.walk(repo.root, (p, n) => { if (n.dir) return; const rel = cleanRel(repo.root, p); if (!rel.startsWith('.git/') && rel !== '.git') t[rel] = n.content; }); return t; }
function writeTree(sh: Shell, repo: Repo, tree: Tree) {
  const cur = workTree(sh, repo); const tracked = new Set([...Object.keys(repo.headTree()), ...Object.keys(repo.index)]);
  for (const p of Object.keys(cur)) if (tracked.has(p) && !(p in tree)) { const par = sh.fs.parentOf(repo.root + '/' + p); par?.dir.kids.delete(par.name); }
  for (const [p, c] of Object.entries(tree)) { const full = repo.root + '/' + p; const dir = full.slice(0, full.lastIndexOf('/')); sh.fs.mkdirp(dir, sh.user, sh.user); sh.fs.write(full, c, sh.user, sh.user); }
}
const eq = (a: string | undefined, b: string | undefined) => a === b;
export function status(sh: Shell, repo: Repo) {
  const head = repo.headTree(), wt = workTree(sh, repo); const staged: string[] = [], unstaged: string[] = [], untracked: string[] = [];
  for (const p of new Set([...Object.keys(head), ...Object.keys(repo.index)])) if (!eq(head[p], repo.index[p])) staged.push(`${head[p] === undefined ? 'new file' : repo.index[p] === undefined ? 'deleted' : 'modified'}: ${p}`);
  for (const p of Object.keys(repo.index)) if (!eq(repo.index[p], wt[p])) unstaged.push(`${wt[p] === undefined ? 'deleted' : 'modified'}: ${p}`);
  for (const p of Object.keys(wt)) if (!(p in repo.index)) untracked.push(p);
  return { staged, unstaged, untracked: untracked.sort() };
}

export function installGit(sh: Shell) {
  const state: { repo: Repo | null; repos: Repo[] } = { repo: null, repos: [] };
  const findRepo = (): Repo | null => { const hit = state.repos.filter(x => sh.cwd === x.root || sh.cwd.startsWith(x.root + '/')).sort((p, q) => q.root.length - p.root.length)[0] ?? null; state.repo = hit; return hit; };
  (sh as any).gitState = state;
  const ok = (s = ''): Out => ({ stdout: s, stderr: '', code: 0 }); const fail = (m: string, c = 1): Out => ({ stdout: '', stderr: m + '\n', code: c });
  const resolveRev = (r: Repo, rev: string): string | null => {
    let m = rev.match(/^(.*?)((?:~\d+|\^)*)$/); let base = m?.[1] || 'HEAD'; const suffix = m?.[2] ?? ''; let id: string | null = base === 'HEAD' ? r.headId : r.branches[base] ?? r.remoteRefs[base] ?? null;
    if (!id) { const hits = [...r.commits.keys()].filter(k => k.startsWith(base)); id = hits.length === 1 ? hits[0] : null; }
    for (const s of suffix.match(/~\d+|\^/g) ?? []) { const n = s === '^' ? 1 : +s.slice(1); for (let k = 0; k < n && id; k++) id = r.commits.get(id)!.parents[0] ?? null; }
    return id;
  };
  const refsAt = (r: Repo, id: string) => [...Object.entries(r.branches).filter(([, v]) => v === id).map(([k]) => k), ...Object.entries(r.remoteRefs).filter(([, v]) => v === id).map(([k]) => k)];
  const describe = (r: Repo, id: string) => { const refs = refsAt(r, id); const h = r.headId === id ? [r.head.branch ? `HEAD -> ${r.head.branch}` : 'HEAD'] : []; const all = [...h, ...refs.filter(x => x !== r.head.branch)]; return `${short(id)}${all.length ? ` (${all.join(', ')})` : ''} ${r.commits.get(id)!.message}`; };
  const logOrder = (r: Repo, from: string) => [...r.ancestors(from)].sort((a, b) => r.commits.get(b)!.seq - r.commits.get(a)!.seq);
  const dirty = (r: Repo) => { const wt = workTree(sh, r), head = r.headTree(); return Object.keys(r.index).some(p => wt[p] !== head[p] || r.index[p] !== head[p]) || Object.keys(head).some(p => !(p in wt)); };
  const checkoutCommit = (r: Repo, id: string) => { const t = r.commits.get(id)!.tree; writeTree(sh, r, t); r.index = { ...t }; };
  const finishMerge = (r: Repo, other: string, label: string, tree: Tree, ff = false) => { const c = r.newCommit([r.headId!, other], `Merge branch '${label}'`, tree); r.setHead(c.id); r.index = { ...tree }; void ff; return c; };

  sh.gitHook = (args, shell) => {
    const [sub, ...a] = args; const flags = a.filter(x => x.startsWith('-')), pos = a.filter(x => !x.startsWith('-'));
    if (sub === 'init') { const r = new Repo(shell.cwd); state.repo = r; state.repos.push(r); shell.fs.mkdirp(shell.cwd + '/.git'); r.reflog.push('init'); return ok(`Initialized empty Git repository in ${shell.cwd}/.git/\n`); }
    if (sub === 'clone') { const url = pos[0]; const rem = HOSTED[url]; if (!rem) return fail(`fatal: repository '${url}' not found`, 128); const name = pos[1] ?? url.split('/').pop()!.replace(/\.git$/, ''); const dir = shell.abs(name); shell.fs.mkdirp(dir, shell.user, shell.user); shell.fs.mkdirp(dir + '/.git'); const r = new Repo(dir); Object.values(rem.commits).forEach(c => r.commits.set(c.id, c)); r.seq = Math.max(0, ...Object.values(rem.commits).map(c => c.seq)); r.remotes.origin = url;
      Object.entries(rem.branches).forEach(([b, id]) => (r.remoteRefs[`origin/${b}`] = id)); const main = rem.branches.main ? 'main' : Object.keys(rem.branches)[0]; if (main) { r.branches[main] = rem.branches[main]; r.head = { branch: main, id: null }; writeTree(shell, r, r.commits.get(r.branches[main])!.tree); r.index = { ...r.commits.get(r.branches[main])!.tree }; } state.repo = r; state.repos.push(r); return ok(`Cloning into '${name}'... done.\n`); }
    const r = findRepo(); if (!r) return fail('fatal: not a git repository (or any of the parent directories): .git', 128);
    switch (sub) {
      case 'status': { const s = status(shell, r); let o = r.head.branch ? `On branch ${r.head.branch}\n` : `HEAD detached at ${short(r.headId ?? '')}\n`; if (r.merging) o += `You have unmerged paths (merging '${r.merging.label}'): fix conflicts and run "git add" then "git commit".\n`;
        if (!r.headId && !s.staged.length) o += 'No commits yet\n'; if (s.staged.length) o += `Changes to be committed:\n${s.staged.map(x => '\t' + x).join('\n')}\n`; if (s.unstaged.length) o += `Changes not staged for commit:\n${s.unstaged.map(x => '\t' + x).join('\n')}\n`; if (s.untracked.length) o += `Untracked files:\n${s.untracked.map(x => '\t' + x).join('\n')}\n`; if (!s.staged.length && !s.unstaged.length && !s.untracked.length) o += 'nothing to commit, working tree clean\n'; return ok(o); }
      case 'add': { const wt = workTree(shell, r); for (const p of pos.length ? pos : ['.']) { if (p === '.' || p === '-A') { for (const k of Object.keys(wt)) r.index[k] = wt[k]; for (const k of Object.keys(r.index)) if (!(k in wt)) delete r.index[k]; } else { const rel = cleanRel(r.root, shell.abs(p)); if (rel in wt) r.index[rel] = wt[rel]; else if (rel in r.index) delete r.index[rel]; else return fail(`fatal: pathspec '${p}' did not match any files`, 128); } } return ok(); }
      case 'commit': { const mi = a.findIndex(x => x === '-m' || x === '-am'); const msg = mi >= 0 ? a[mi + 1] : null; if (!msg) return fail('error: switch `m` requires a value (use: git commit -m "message")'); if (flags.includes('-a') || flags.includes('-am')) { const wt = workTree(shell, r); for (const k of Object.keys(r.index)) { if (k in wt) r.index[k] = wt[k]; else delete r.index[k]; } }
        const bad = Object.entries(r.index).filter(([, c]) => /^<<<<<<< /m.test(c)).map(([p]) => p); if (bad.length) return fail(`error: Committing is not possible because you have unmerged files with conflict markers: ${bad.join(', ')}`);
        const head = r.headTree(); if (!r.merging && JSON.stringify(Object.entries(head).sort()) === JSON.stringify(Object.entries(r.index).sort())) return ok(`On branch ${r.head.branch}\nnothing to commit, working tree clean\n`);
        const parents = [r.headId, r.merging ? r.merging.other : null].filter(Boolean) as string[]; const c = r.newCommit(parents, r.merging ? msg : msg, r.index); r.setHead(c.id); const was = r.merging; r.merging = null; return ok(`[${r.head.branch ?? 'detached HEAD'} ${short(c.id)}] ${msg}${was ? ' (merge)' : ''}\n`); }
      case 'log': { const id = r.headId; if (!id) return fail("fatal: your current branch has no commits yet", 128); const all = flags.includes('--all'); const tips = all ? [...new Set([id, ...Object.values(r.branches)])] : [id]; const order = [...new Set(tips.flatMap(t => logOrder(r, t)))].sort((x, y) => r.commits.get(y)!.seq - r.commits.get(x)!.seq);
        if (flags.includes('--oneline') || flags.includes('--graph')) return ok(order.map(c => `${flags.includes('--graph') ? (r.commits.get(c)!.parents.length > 1 ? '*   ' : '* ') : ''}${describe(r, c)}`).join('\n') + '\n'); return ok(order.map(c => `commit ${c}\n    ${r.commits.get(c)!.message}\n`).join('\n')); }
      case 'branch': { if (flags.includes('-d') || flags.includes('-D')) { const b = pos[0]; if (!r.branches[b]) return fail(`error: branch '${b}' not found`); if (r.head.branch === b) return fail(`error: Cannot delete branch '${b}' checked out`); if (!flags.includes('-D') && !r.isAncestor(r.branches[b], r.headId!)) return fail(`error: The branch '${b}' is not fully merged (use -D to force)`); delete r.branches[b]; return ok(`Deleted branch ${b}\n`); }
        if (!pos.length) return ok(Object.keys(r.branches).sort().map(b => `${b === r.head.branch ? '* ' : '  '}${b}`).join('\n') + '\n'); if (!r.headId) return fail('fatal: Not a valid object name: main'); if (r.branches[pos[0]]) return fail(`fatal: a branch named '${pos[0]}' already exists`, 128); r.branches[pos[0]] = r.headId; return ok(); }
      case 'checkout': case 'switch': { let target = pos[0]; const create = flags.includes('-b') || flags.includes('-c'); if (create) { if (r.branches[target]) return fail(`fatal: a branch named '${target}' already exists`, 128); if (!r.headId) { r.head = { branch: target, id: null }; return ok(`Switched to a new branch '${target}'\n`); } r.branches[target] = r.headId; r.head = { branch: target, id: null }; return ok(`Switched to a new branch '${target}'\n`); }
        if (r.branches[target]) { if (dirty(r) && r.branches[target] !== r.headId && JSON.stringify(r.commits.get(r.branches[target])!.tree) !== JSON.stringify(r.headTree())) return fail('error: Your local changes would be overwritten by checkout. Commit or stash them first.'); r.head = { branch: target, id: null }; checkoutCommit(r, r.branches[target]); return ok(`Switched to branch '${target}'\n`); }
        const id = resolveRev(r, target); if (!id) return fail(`error: pathspec '${target}' did not match any file(s) known to git`); if (dirty(r)) return fail('error: Your local changes would be overwritten by checkout.'); r.head = { branch: null, id }; checkoutCommit(r, id); return ok(`HEAD is now at ${short(id)} (detached)\n`); }
      case 'merge': { const other = r.branches[pos[0]] ?? r.remoteRefs[pos[0]]; if (!other) return fail(`merge: ${pos[0]} - not something we can merge`); const cur = r.headId!; if (r.isAncestor(other, cur)) return ok('Already up to date.\n');
        if (dirty(r)) return fail('error: Your local changes would be overwritten by merge. Commit them first.');
        if (r.isAncestor(cur, other) && !flags.includes('--no-ff')) { r.setHead(other); checkoutCommit(r, other); return ok(`Updating ${short(cur)}..${short(other)}\nFast-forward\n`); }
        const base = r.mergeBase(cur, other); const { tree, conflicts } = mergeTrees(base ? r.commits.get(base)!.tree : {}, r.commits.get(cur)!.tree, r.commits.get(other)!.tree, 'HEAD', pos[0]);
        if (conflicts.length) { writeTree(shell, r, tree); const idx: Tree = {}; Object.keys(tree).forEach(p => { if (!conflicts.includes(p)) idx[p] = tree[p]; else idx[p] = r.headTree()[p] ?? ''; }); r.index = { ...r.headTree(), ...Object.fromEntries(Object.keys(tree).filter(p => !conflicts.includes(p)).map(p => [p, tree[p]])) }; r.merging = { other, label: pos[0] }; return { stdout: conflicts.map(p => `CONFLICT (content): Merge conflict in ${p}\n`).join('') + 'Automatic merge failed; fix conflicts and then commit the result.\n', stderr: '', code: 1 }; }
        writeTree(shell, r, tree); const c = finishMerge(r, other, pos[0], tree); return ok(`Merge made by the 'ort' strategy. [${short(c.id)}]\n`); }
      case 'rebase': { const target = r.branches[pos[0]]; if (!target) return fail(`fatal: invalid upstream '${pos[0]}'`, 128); const cur = r.headId!; if (r.isAncestor(target, cur) && r.mergeBase(cur, target) === target) return ok('Current branch is up to date.\n'); const base = r.mergeBase(cur, target)!;
        const mine = logOrder(r, cur).filter(c => !r.ancestors(base).has(c)).reverse(); let tip = target; for (const id of mine) { const c = r.commits.get(id)!; if (c.parents.length > 1) continue; const parentTree = c.parents[0] ? r.commits.get(c.parents[0])!.tree : {}; const m = mergeTrees(parentTree, r.commits.get(tip)!.tree, c.tree, 'HEAD', short(id)); if (m.conflicts.length) return fail(`CONFLICT while replaying ${short(id)} (${m.conflicts.join(', ')}): rebase aborted, nothing changed (conflict resolution during rebase is not simulated)`); tip = r.newCommit([tip], c.message, m.tree).id; }
        r.setHead(tip); checkoutCommit(r, tip); return ok(`Successfully rebased and updated refs/heads/${r.head.branch}. (${mine.length} commit(s) replayed with new ids)\n`); }
      case 'cherry-pick': { const id = resolveRev(r, pos[0]); if (!id) return fail(`fatal: bad revision '${pos[0]}'`, 128); const c = r.commits.get(id)!; const parentTree = c.parents[0] ? r.commits.get(c.parents[0])!.tree : {}; const m = mergeTrees(parentTree, r.headTree(), c.tree, 'HEAD', short(id)); if (m.conflicts.length) return fail(`error: could not apply ${short(id)}: conflict in ${m.conflicts.join(', ')} (cherry-pick aborted)`); const n = r.newCommit([r.headId!], c.message, m.tree); r.setHead(n.id); checkoutCommit(r, n.id); return ok(`[${r.head.branch} ${short(n.id)}] ${c.message}\n`); }
      case 'revert': { const id = resolveRev(r, pos[0]); if (!id) return fail(`fatal: bad revision '${pos[0]}'`, 128); const c = r.commits.get(id)!; const parentTree = c.parents[0] ? r.commits.get(c.parents[0])!.tree : {}; const m = mergeTrees(c.tree, r.headTree(), parentTree, 'HEAD', `revert ${short(id)}`); if (m.conflicts.length) return fail(`error: could not revert ${short(id)}: conflict in ${m.conflicts.join(', ')}`); const n = r.newCommit([r.headId!], `Revert "${c.message}"`, m.tree); r.setHead(n.id); checkoutCommit(r, n.id); return ok(`[${r.head.branch} ${short(n.id)}] Revert "${c.message}"\n`); }
      case 'reset': { const mode = flags.includes('--hard') ? 'hard' : flags.includes('--soft') ? 'soft' : 'mixed'; const id = resolveRev(r, pos[0] ?? 'HEAD'); if (!id) return fail(`fatal: ambiguous argument '${pos[0]}': unknown revision`, 128); const old = r.headId; r.setHead(id); if (mode !== 'soft') r.index = { ...r.commits.get(id)!.tree }; if (mode === 'hard') writeTree(shell, r, r.commits.get(id)!.tree); r.merging = null; return ok(mode === 'hard' ? `HEAD is now at ${describe(r, id).replace(/ \(.*?\)/, '')}\n` : mode === 'mixed' ? `Unstaged changes after reset (moved from ${short(old ?? '')} to ${short(id)})\n` : ''); }
      case 'diff': { const wt = workTree(shell, r); const base = flags.includes('--staged') || flags.includes('--cached') ? r.headTree() : r.index; const other = flags.includes('--staged') || flags.includes('--cached') ? r.index : wt; let o = ''; for (const p of Object.keys(base)) if (other[p] !== undefined && other[p] !== base[p]) o += `diff --git a/${p} b/${p}\n${lineDiff(base[p], other[p]).join('\n')}\n`; return ok(o); }
      case 'remote': { if (pos[0] === 'add') { if (!HOSTED[pos[2]]) HOSTED[pos[2]] = { commits: {}, branches: {} }; r.remotes[pos[1]] = pos[2]; return ok(); } return ok(Object.entries(r.remotes).map(([k, v]) => `${k}\t${v} (fetch)\n${k}\t${v} (push)`).join('\n') + '\n'); }
      case 'push': { const name = pos[0] ?? 'origin'; const url = r.remotes[name]; if (!url) return fail(`fatal: '${name}' does not appear to be a git repository`, 128); const br = pos[1] ?? r.head.branch!; const id = r.branches[br]; if (!id) return fail(`error: src refspec ${br} does not match any`); const rem = HOSTED[url]; const tip = rem.branches[br];
        if (tip && !r.ancestors(id).has(tip)) return fail(`! [rejected] ${br} -> ${br} (non-fast-forward)\nerror: failed to push some refs to '${url}'\nhint: the remote contains work you do not have locally. Run "git pull" (fetch + merge) first, then push again.`); r.ancestors(id).forEach(c => (rem.commits[c] = r.commits.get(c)!)); rem.branches[br] = id; r.remoteRefs[`${name}/${br}`] = id; return ok(`To ${url}\n   ${tip ? short(tip) : '(new)'}..${short(id)}  ${br} -> ${br}\n`); }
      case 'fetch': { const name = pos[0] ?? 'origin'; const url = r.remotes[name]; if (!url) return fail(`fatal: '${name}' does not appear to be a git repository`, 128); const rem = HOSTED[url]; Object.values(rem.commits).forEach(c => { if (!r.commits.has(c.id)) r.commits.set(c.id, c); }); r.seq = Math.max(r.seq, ...Object.values(rem.commits).map(c => c.seq)); let n = 0; Object.entries(rem.branches).forEach(([b, id]) => { if (r.remoteRefs[`${name}/${b}`] !== id) n++; r.remoteRefs[`${name}/${b}`] = id; }); return ok(n ? `From ${url}\n ${n} ref(s) updated\n` : ''); }
      case 'pull': { const name = pos[0] ?? 'origin'; const f = shell.run(`git fetch ${name}`); if (f.code) return f; const br = pos[1] ?? r.head.branch!; if (!r.remoteRefs[`${name}/${br}`]) return ok(f.stdout + 'Already up to date.\n'); const m = shell.run(`git merge ${name}/${br}`); return { stdout: f.stdout + m.stdout, stderr: m.stderr, code: m.code }; }
      case 'show': { const id = resolveRev(r, pos[0] ?? 'HEAD'); if (!id) return fail('fatal: bad revision', 128); const c = r.commits.get(id)!; return ok(`commit ${c.id}\n    ${c.message}\nfiles: ${Object.keys(c.tree).join(', ') || '(none)'}\n`); }
      case 'reflog': return ok(r.reflog.join('\n') + '\n');
      default: return fail(`git: '${sub}' is not supported in this simulation`);
    }
  };
  return state;
}
