// A small POSIX-like shell over an in-memory virtual file system. This is a SIMULATION (no real OS commands run).
export interface FNode { name: string; dir: boolean; mode: number; owner: string; group: string; content: string; kids: Map<string, FNode>; mtime: number }
export interface Proc { pid: number; user: string; cmd: string; cpu: number; mem: number; state: string }
export interface Out { stdout: string; stderr: string; code: number }

const mkNode = (name: string, dir: boolean, mode: number, owner = 'student', group = 'student', content = ''): FNode => ({ name, dir, mode, owner, group, content, kids: new Map(), mtime: Date.now() });

export class FS {
  root = mkNode('', true, 0o755, 'root', 'root');
  constructor() {
    const d = (p: string, owner = 'root', group = 'root', mode = 0o755) => this.mkdirp(p, owner, group, mode);
    d('/etc'); d('/tmp', 'root', 'root', 0o777); d('/var/log'); d('/home'); d('/home/student', 'student', 'student', 0o755); d('/usr/bin');
    this.write('/etc/hostname', 'dsa-quest\n', 'root', 'root', 0o644); this.write('/etc/passwd', 'root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000::/home/student:/bin/bash\n', 'root', 'root', 0o644);
    this.write('/etc/shadow', 'root:$6$hidden:19000\n', 'root', 'root', 0o600);
    this.write('/var/log/syslog', 'Jan 1 boot ok\nJan 1 error: disk almost full\nJan 1 service started\nJan 2 error: timeout\nJan 2 service started\n', 'root', 'root', 0o644);
    this.write('/home/student/notes.txt', 'apple\nbanana\napple\ncherry\nbanana\napple\n', 'student', 'student', 0o644);
    this.write('/home/student/data.csv', 'name,score\nArun,90\nBala,75\nCharan,85\n', 'student', 'student', 0o644);
  }
  split(p: string) { return p.split('/').filter(Boolean); }
  get(path: string): FNode | null { let n = this.root; for (const s of this.split(path)) { const k = n.kids.get(s); if (!n.dir || !k) return null; n = k; } return n; }
  parentOf(path: string): { dir: FNode; name: string } | null { const parts = this.split(path); const name = parts.pop(); if (name === undefined) return null; const dir = this.get('/' + parts.join('/')); return dir && dir.dir ? { dir, name } : null; }
  mkdirp(path: string, owner = 'student', group = 'student', mode = 0o755) { let n = this.root; for (const s of this.split(path)) { let k = n.kids.get(s); if (!k) { k = mkNode(s, true, mode, owner, group); n.kids.set(s, k); } n = k; } return n; }
  write(path: string, content: string, owner = 'student', group = 'student', mode = 0o644) { const p = this.parentOf(path)!; const ex = p.dir.kids.get(p.name); if (ex) { ex.content = content; ex.mtime = Date.now(); } else p.dir.kids.set(p.name, mkNode(p.name, false, mode, owner, group, content)); }
  walk(path: string, f: (p: string, n: FNode) => void) { const n = this.get(path); if (!n) return; const rec = (p: string, x: FNode) => { f(p, x); if (x.dir) [...x.kids.values()].sort((a, b) => (a.name < b.name ? -1 : 1)).forEach(k => rec(p === '/' ? '/' + k.name : p + '/' + k.name, k)); }; rec(path === '' ? '/' : path, n); }
}
export const modeStr = (n: FNode) => (n.dir ? 'd' : '-') + [6, 3, 0].map(s => ((n.mode >> s) & 4 ? 'r' : '-') + ((n.mode >> s) & 2 ? 'w' : '-') + ((n.mode >> s) & 1 ? 'x' : '-')).join('');

function tokenize(s: string): string[] {
  const out: string[] = []; let cur = '', q: string | null = null, has = false;
  for (const c of s) { if (q) { if (c === q) q = null; else cur += c; } else if (c === '"' || c === "'") { q = c; has = true; } else if (/\s/.test(c)) { if (cur || has) out.push(cur); cur = ''; has = false; } else if (c === '>' || c === '<') { if (cur || has) out.push(cur); cur = ''; has = false; out.push(c); } else cur += c; }
  if (cur || has) out.push(cur); const merged: string[] = []; for (const t of out) { if (t === '>' && merged[merged.length - 1] === '>') merged[merged.length - 1] = '>>'; else merged.push(t); } return merged;
}
function splitTop(s: string, seps: string[]): { part: string; sep: string }[] {
  const out: { part: string; sep: string }[] = []; let cur = '', q: string | null = null, i = 0;
  while (i < s.length) { const c = s[i]; if (q) { if (c === q) q = null; cur += c; i++; continue; } if (c === '"' || c === "'") { q = c; cur += c; i++; continue; }
    const m = seps.find(x => s.startsWith(x, i)); if (m) { out.push({ part: cur, sep: m }); cur = ''; i += m.length; continue; } cur += c; i++; }
  out.push({ part: cur, sep: '' }); return out;
}

export class Shell {
  fs = new FS(); cwd = '/home/student'; user = 'student'; env: Record<string, string> = { HOME: '/home/student', USER: 'student', SHELL: '/bin/bash' };
  procs: Proc[] = [{ pid: 1, user: 'root', cmd: 'systemd', cpu: 0.1, mem: 0.4, state: 'S' }, { pid: 412, user: 'root', cmd: 'sshd', cpu: 0, mem: 0.2, state: 'S' }, { pid: 733, user: 'student', cmd: 'bash', cpu: 0, mem: 0.1, state: 'S' }, { pid: 1204, user: 'student', cmd: 'node server.js', cpu: 12.5, mem: 3.2, state: 'R' }, { pid: 1310, user: 'student', cmd: 'python train.py', cpu: 85.0, mem: 14.8, state: 'R' }];
  groups: Record<string, string> = { student: 'student', root: 'root' };
  gitHook?: (args: string[], sh: Shell) => Out;
  abs(p: string) { const base = p.startsWith('/') ? [] : this.fs.split(this.cwd); for (const s of p.split('/')) { if (s === '' || s === '.') continue; if (s === '..') base.pop(); else base.push(s); } return '/' + base.join('/'); }
  can(n: FNode, bit: 4 | 2 | 1, user = this.user) { if (user === 'root') return true; const sh = n.owner === user ? 6 : this.groups[user] === n.group ? 3 : 0; return ((n.mode >> sh) & bit) !== 0; }
  prompt() { const home = this.env.HOME; return `${this.user}@dsa-quest:${this.cwd === home ? '~' : this.cwd}$`; }

  run(line: string, user = this.user): Out {
    const saved = this.user; this.user = user; try { return this.runLine(line); } finally { this.user = saved; }
  }
  private runLine(line: string): Out {
    let out: Out = { stdout: '', stderr: '', code: 0 };
    if (/^\s*for\s+\w+\s+in\s.+;\s*do\s.+;\s*done\s*$/.test(line)) return this.pipeline(line.trim());
    const seq = splitTop(line.trim(), ['&&', ';']);
    for (let i = 0; i < seq.length; i++) {
      const prev = i > 0 ? seq[i - 1].sep : ''; if (prev === '&&' && out.code !== 0) break;
      if (!seq[i].part.trim()) continue; const r = this.pipeline(seq[i].part.trim());
      out = { stdout: out.stdout + r.stdout, stderr: out.stderr + r.stderr, code: r.code };
    }
    return out;
  }
  private expand(s: string) { return s.replace(/\$\{?([A-Za-z_]\w*)\}?/g, (_, k) => this.env[k] ?? ''); }
  private pipeline(seg: string): Out {
    const stages = splitTop(seg, ['|']).map(x => x.part.trim()); let input = ''; let err = ''; let code = 0; let last: Out = { stdout: '', stderr: '', code: 0 };
    const forM = seg.match(/^for\s+(\w+)\s+in\s+(.+?);\s*do\s+(.+?);\s*done$/);
    if (forM) { let o = ''; for (const v of forM[2].trim().split(/\s+/)) { this.env[forM[1]] = v; const r = this.run(forM[3], this.user); o += r.stdout; err += r.stderr; } return { stdout: o, stderr: err, code: 0 }; }
    for (let si = 0; si < stages.length; si++) {
      let toks = tokenize(this.expand(stages[si])); let redirOut: { file: string; append: boolean } | null = null; let redirIn: string | null = null;
      const clean: string[] = []; for (let k = 0; k < toks.length; k++) { if (toks[k] === '>' || toks[k] === '>>') { redirOut = { file: toks[++k], append: toks[k - 1] === '>>' }; } else if (toks[k] === '<') redirIn = toks[++k]; else clean.push(toks[k]); }
      toks = clean; if (!toks.length) continue;
      let user = this.user; if (toks[0] === 'sudo') { toks.shift(); user = 'root'; }
      if (redirIn) { const n = this.fs.get(this.abs(redirIn)); if (!n || n.dir) { err += `bash: ${redirIn}: No such file or directory\n`; code = 1; break; } input = n.content; }
      const saved = this.user; this.user = user; let r: Out; try { r = this.cmd(toks[0], toks.slice(1), input); } finally { this.user = saved; }
      err += r.stderr; code = r.code; last = r;
      if (redirOut) { const path = this.abs(redirOut.file); const p = this.fs.parentOf(path); const ex = this.fs.get(path);
        if (!p) { err += `bash: ${redirOut.file}: No such file or directory\n`; code = 1; break; }
        if ((ex && !this.can(ex, 2)) || (!ex && !this.can(p.dir, 2))) { err += `bash: ${redirOut.file}: Permission denied\n`; code = 1; break; }
        this.fs.write(path, redirOut.append && ex ? ex.content + r.stdout : r.stdout, this.user, this.groups[this.user] ?? this.user); input = ''; last = { ...last, stdout: '' };
      } else input = r.stdout;
    }
    return { stdout: last.stdout, stderr: err, code };
  }

  private cmd(name: string, a: string[], stdin: string): Out {
    const ok = (s = ''): Out => ({ stdout: s, stderr: '', code: 0 }); const fail = (m: string, c = 1): Out => ({ stdout: '', stderr: m + '\n', code: c });
    const flags = a.filter(x => x.startsWith('-') && x.length > 1 && !/^-\d+$/.test(x)); const args = a.filter(x => !flags.includes(x)); const has = (f: string) => flags.some(x => x.includes(f));
    const resolve = (p: string) => this.abs(p);
    switch (name) {
      case 'pwd': return ok(this.cwd + '\n');
      case 'whoami': return ok(this.user + '\n');
      case 'id': return ok(`uid=${this.user === 'root' ? 0 : 1000}(${this.user}) gid=${this.user === 'root' ? 0 : 1000}(${this.groups[this.user]})\n`);
      case 'clear': return ok('\u001b[clear]');
      case 'date': return ok(new Date().toString() + '\n');
      case 'echo': return ok(args.join(' ') + '\n');
      case 'export': { args.forEach(x => { const [k, v] = x.split('='); this.env[k] = v ?? ''; }); return ok(); }
      case 'env': return ok(Object.entries(this.env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
      case 'cd': { const t = resolve(args[0] ?? this.env.HOME); const n = this.fs.get(t); if (!n) return fail(`bash: cd: ${args[0]}: No such file or directory`); if (!n.dir) return fail(`bash: cd: ${args[0]}: Not a directory`); if (!this.can(n, 1)) return fail(`bash: cd: ${args[0]}: Permission denied`); this.cwd = t; return ok(); }
      case 'ls': {
        const target = resolve(args[0] ?? '.'); const n = this.fs.get(target); if (!n) return fail(`ls: cannot access '${args[0]}': No such file or directory`, 2);
        if (n.dir && !this.can(n, 4)) return fail(`ls: cannot open directory '${args[0] ?? '.'}': Permission denied`, 2);
        const list = n.dir ? [...n.kids.values()].filter(k => has('a') || !k.name.startsWith('.')).sort((x, y) => (x.name < y.name ? -1 : 1)) : [n];
        const names = list.map(k => (has('l') ? `${modeStr(k)} 1 ${k.owner} ${k.group} ${String(k.dir ? 4096 : k.content.length).padStart(5)} ${k.name}${k.dir ? '/' : ''}` : k.name + (k.dir ? '/' : '')));
        return ok(has('l') ? names.join('\n') + (names.length ? '\n' : '') : names.join('  ') + (names.length ? '\n' : ''));
      }
      case 'mkdir': { for (const p of args) { const t = resolve(p); if (this.fs.get(t) && !has('p')) return fail(`mkdir: cannot create directory '${p}': File exists`); const par = this.fs.parentOf(t); if (!par && !has('p')) return fail(`mkdir: cannot create directory '${p}': No such file or directory`); const pd = par?.dir ?? this.fs.root; if (par && !this.can(pd, 2)) return fail(`mkdir: cannot create directory '${p}': Permission denied`); this.fs.mkdirp(t, this.user, this.groups[this.user]); } return ok(); }
      case 'touch': { for (const p of args) { const t = resolve(p); const ex = this.fs.get(t); if (ex) { ex.mtime = Date.now(); continue; } const par = this.fs.parentOf(t); if (!par) return fail(`touch: cannot touch '${p}': No such file or directory`); if (!this.can(par.dir, 2)) return fail(`touch: cannot touch '${p}': Permission denied`); this.fs.write(t, '', this.user, this.groups[this.user]); } return ok(); }
      case 'cat': { if (!args.length) return ok(stdin); let o = ''; for (const p of args) { const n = this.fs.get(resolve(p)); if (!n) return fail(`cat: ${p}: No such file or directory`); if (n.dir) return fail(`cat: ${p}: Is a directory`); if (!this.can(n, 4)) return fail(`cat: ${p}: Permission denied`); o += n.content; } return ok(o); }
      case 'rm': case 'rmdir': { for (const p of args) { const t = resolve(p); const n = this.fs.get(t); if (!n) { if (has('f')) continue; return fail(`${name}: cannot remove '${p}': No such file or directory`); } if (n.dir && !has('r') && name === 'rm') return fail(`rm: cannot remove '${p}': Is a directory`); if (name === 'rmdir' && n.kids.size) return fail(`rmdir: failed to remove '${p}': Directory not empty`); const par = this.fs.parentOf(t)!; if (!this.can(par.dir, 2)) return fail(`${name}: cannot remove '${p}': Permission denied`); par.dir.kids.delete(par.name); } return ok(); }
      case 'cp': { const [s, d] = args; const sn = this.fs.get(resolve(s)); if (!sn) return fail(`cp: cannot stat '${s}': No such file or directory`); if (sn.dir && !has('r')) return fail(`cp: -r not specified; omitting directory '${s}'`); if (!this.can(sn, 4)) return fail(`cp: cannot open '${s}' for reading: Permission denied`);
        let dest = resolve(d); const dn = this.fs.get(dest); if (dn?.dir) dest = dest + '/' + sn.name; const par = this.fs.parentOf(dest); if (!par) return fail(`cp: cannot create '${d}': No such file or directory`); if (!this.can(par.dir, 2)) return fail(`cp: cannot create regular file '${d}': Permission denied`);
        const clone = (n: FNode): FNode => ({ ...n, owner: this.user, group: this.groups[this.user], kids: new Map([...n.kids].map(([k, v]) => [k, clone(v)])) }); const c = clone(sn); c.name = par.name; par.dir.kids.set(par.name, c); return ok(); }
      case 'mv': { const [s, d] = args; const t = resolve(s); const sn = this.fs.get(t); if (!sn) return fail(`mv: cannot stat '${s}': No such file or directory`); let dest = resolve(d); const dn = this.fs.get(dest); if (dn?.dir) dest = dest + '/' + sn.name; const par = this.fs.parentOf(dest), sp = this.fs.parentOf(t)!; if (!par) return fail(`mv: cannot move '${s}' to '${d}': No such file or directory`); if (!this.can(par.dir, 2) || !this.can(sp.dir, 2)) return fail(`mv: cannot move '${s}' to '${d}': Permission denied`); sp.dir.kids.delete(sp.name); sn.name = par.name; par.dir.kids.set(par.name, sn); return ok(); }
      case 'chmod': { const [m, ...files] = args; for (const f of files) { const n = this.fs.get(resolve(f)); if (!n) return fail(`chmod: cannot access '${f}': No such file or directory`); if (this.user !== 'root' && n.owner !== this.user) return fail(`chmod: changing permissions of '${f}': Operation not permitted`);
        if (/^[0-7]{3,4}$/.test(m)) n.mode = parseInt(m.slice(-3), 8); else { const mm = m.match(/^([ugoa]*)([+\-=])([rwx]+)$/); if (!mm) return fail(`chmod: invalid mode: '${m}'`); const who = mm[1] || 'a'; const bits = [...mm[3]].reduce((s, c) => s | (c === 'r' ? 4 : c === 'w' ? 2 : 1), 0); for (const w of who === 'a' ? 'ugo' : who) { const sh = w === 'u' ? 6 : w === 'g' ? 3 : 0; if (mm[2] === '+') n.mode |= bits << sh; else if (mm[2] === '-') n.mode &= ~(bits << sh); else n.mode = (n.mode & ~(7 << sh)) | (bits << sh); } } } return ok(); }
      case 'chown': { if (this.user !== 'root') return fail(`chown: changing ownership: Operation not permitted (try sudo)`); const [o, ...files] = args; const [u, g] = o.split(':'); for (const f of files) { const n = this.fs.get(resolve(f)); if (!n) return fail(`chown: cannot access '${f}': No such file or directory`); n.owner = u || n.owner; if (g) n.group = g; } return ok(); }
      case 'grep': { const pat = args[0]; const files = args.slice(1); const src = files.length ? files.map(f => { const n = this.fs.get(resolve(f)); return n && !n.dir ? n.content : null; }) : [stdin]; if (src.some(s => s === null)) return fail(`grep: ${files[src.indexOf(null)]}: No such file or directory`, 2);
        let re: RegExp; try { re = new RegExp(pat, has('i') ? 'i' : ''); } catch { return fail(`grep: invalid regular expression`, 2); } const lines = src.join('').split('\n').filter((_, k, all) => !(k === all.length - 1 && all[k] === '')); const hit = lines.map((l, k) => ({ l, k, m: re.test(l) !== has('v') })).filter(x => x.m);
        if (has('c')) return { stdout: hit.length + '\n', stderr: '', code: hit.length ? 0 : 1 }; return { stdout: hit.map(x => (has('n') ? `${x.k + 1}:` : '') + x.l).join('\n') + (hit.length ? '\n' : ''), stderr: '', code: hit.length ? 0 : 1 }; }
      case 'find': { const start = resolve(args[0] && !args[0].startsWith('-') ? args[0] : '.'); const ni = a.indexOf('-name'); const pat = ni >= 0 ? a[ni + 1] : null; const ti = a.indexOf('-type'); const ty = ti >= 0 ? a[ti + 1] : null; if (!this.fs.get(start)) return fail(`find: '${args[0]}': No such file or directory`); const re = pat ? new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$') : null; const res: string[] = [];
        this.fs.walk(start, (p, n) => { if (re && !re.test(n.name)) return; if (ty === 'f' && n.dir) return; if (ty === 'd' && !n.dir) return; res.push(p === start && start !== '/' && !args[0] ? '.' : p); }); return ok(res.join('\n') + (res.length ? '\n' : '')); }
      case 'wc': { const src = args.length ? args.map(f => this.fs.get(resolve(f))?.content ?? '').join('') : stdin; const l = src.split('\n').length - (src.endsWith('\n') || !src ? 1 : 0), w = src.split(/\s+/).filter(Boolean).length; if (has('l')) return ok(l + '\n'); if (has('w')) return ok(w + '\n'); if (has('c')) return ok(src.length + '\n'); return ok(`${l} ${w} ${src.length}\n`); }
      case 'head': case 'tail': { const ni = a.findIndex(x => x === '-n'); const n = ni >= 0 ? +a[ni + 1] : (a.find(x => /^-\d+$/.test(x)) ? -+a.find(x => /^-\d+$/.test(x))! : 10); const files = args.filter((x, k) => !(ni >= 0 && (a[ni + 1] === x))).filter(x => !/^\d+$/.test(x)); const src = files.length ? (this.fs.get(resolve(files[0]))?.content ?? '') : stdin; const ls = src.split('\n').filter((_, k, all) => !(k === all.length - 1 && all[k] === '')); return ok((name === 'head' ? ls.slice(0, n) : ls.slice(-n)).join('\n') + (ls.length ? '\n' : '')); }
      case 'sort': { const src = args.length ? args.map(f => this.fs.get(resolve(f))?.content ?? '').join('') : stdin; const ls = src.split('\n').filter((_, k, all) => !(k === all.length - 1 && all[k] === '')); ls.sort(has('n') ? (x, y) => parseFloat(x) - parseFloat(y) : (x, y) => (x < y ? -1 : x > y ? 1 : 0)); if (has('r')) ls.reverse(); return ok(ls.join('\n') + (ls.length ? '\n' : '')); }
      case 'uniq': { const ls = stdin.split('\n').filter((_, k, all) => !(k === all.length - 1 && all[k] === '')); const res: [string, number][] = []; ls.forEach(l => { const t = res[res.length - 1]; if (t && t[0] === l) t[1]++; else res.push([l, 1]); }); return ok(res.map(([l, c]) => (has('c') ? `${String(c).padStart(4)} ${l}` : l)).join('\n') + (res.length ? '\n' : '')); }
      case 'sed': { const m = (args[0] ?? '').match(/^s(.)(.*?)\1(.*?)\1([g]?)$/); if (!m) return fail("sed: only s/old/new/[g] is supported in this simulation"); const re = new RegExp(m[2], m[4] ? 'g' : ''); const src = args[1] ? this.fs.get(resolve(args[1]))?.content ?? '' : stdin; return ok(src.split('\n').map(l => l.replace(re, m[3])).join('\n')); }
      case 'awk': { let sep: string | RegExp = /\s+/; let rest = [...a]; if (rest[0] === '-F') { sep = rest[1]; rest = rest.slice(2); } else if (rest[0]?.startsWith('-F')) { sep = rest[0].slice(2); rest = rest.slice(1); } const prog = rest[0] ?? ''; const pm = prog.match(/^\{\s*print\s*(.*?)\s*\}$/); if (!pm) return fail("awk: only '{print $1, $2 ...}' programs are supported in this simulation"); const src = rest[1] ? this.fs.get(resolve(rest[1]))?.content ?? '' : stdin; const cols = pm[1] ? pm[1].split(/\s*,\s*/) : ['$0'];
        return ok(src.split('\n').filter((l, k, all) => !(k === all.length - 1 && l === '')).map(l => { const f = l.trim().split(sep); return cols.map(c => (c === '$0' ? l : c === '$NF' ? f[f.length - 1] : f[+c.slice(1) - 1] ?? '')).join(' '); }).join('\n') + '\n'); }
      case 'ps': return ok('  PID USER     %CPU %MEM S COMMAND\n' + this.procs.filter(p => has('e') || has('a') || has('x') || has('u') || p.user === this.user).map(p => `${String(p.pid).padStart(5)} ${p.user.padEnd(8)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${p.state} ${p.cmd}`).join('\n') + '\n');
      case 'top': return ok('top - simulated snapshot\n  PID USER     %CPU %MEM COMMAND\n' + [...this.procs].sort((x, y) => y.cpu - x.cpu).map(p => `${String(p.pid).padStart(5)} ${p.user.padEnd(8)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${p.cmd}`).join('\n') + '\n');
      case 'kill': { const pid = +args[args.length - 1]; const p = this.procs.find(x => x.pid === pid); if (!p) return fail(`bash: kill: (${pid}) - No such process`); if (this.user !== 'root' && p.user !== this.user) return fail(`bash: kill: (${pid}) - Operation not permitted`); this.procs = this.procs.filter(x => x.pid !== pid); return ok(); }
      case 'ping': return ok(`PING ${args[0]} (simulated; no packets are sent)\n` + [1, 2, 3].map(i => `64 bytes from ${args[0]}: icmp_seq=${i} ttl=57 time=${(10 + i * 1.5).toFixed(1)} ms`).join('\n') + '\n--- 3 packets transmitted, 3 received, 0% packet loss ---\n');
      case 'ip': case 'ifconfig': return ok('eth0: inet 192.168.1.10/24  mac aa:bb:cc:dd:ee:ff   (simulated)\nlo:   inet 127.0.0.1/8\n');
      case 'sh': case 'bash': { const n = this.fs.get(resolve(args[0] ?? '')); if (!n || n.dir) return fail(`${name}: ${args[0]}: No such file or directory`, 127); if (!this.can(n, 4)) return fail(`${name}: ${args[0]}: Permission denied`, 126); let o = '', e = ''; let c = 0; for (const l of n.content.split('\n')) { if (!l.trim() || l.trim().startsWith('#')) continue; const r = this.run(l); o += r.stdout; e += r.stderr; c = r.code; } return { stdout: o, stderr: e, code: c }; }
      case 'man': case 'help': return ok('Supported: pwd ls cd mkdir touch cat echo rm rmdir cp mv chmod chown grep find wc head tail sort uniq sed awk ps top kill ping ip env export sh whoami id date clear git sudo\nFeatures: pipes |  redirection > >> <  && ;  $VARS  for x in a b; do ...; done\nThis is a simulation: no real commands are executed.\n');
      case 'git': return this.gitHook ? this.gitHook(a, this) : fail('git: not available');
      default: return fail(`bash: ${name}: command not found`, 127);
    }
  }
}
