import { useEffect, useMemo, useRef, useState } from 'react';
import { DEV_CONCEPTS } from '../dev/concepts';
import { ConceptCards } from './ConceptCards';
import { Shell, modeStr } from '../dev/shell';
import { Repo, short, status, workTree } from '../dev/git';
import { MISSIONS, buildEnv, repoOf } from '../dev/missions';
import { useStore } from '../store';

function fileTree(sh: Shell) { const rows: { p: string; n: any }[] = []; sh.fs.walk('/home/student', (p, n) => { if (p === '/home/student') return; rows.push({ p, n }); }); return rows; }

function GitPanel({ sh }: { sh: Shell }) {
  const r = repoOf(sh); const here = r && (sh.cwd === r.root || sh.cwd.startsWith(r.root + '/')) ? r : null; if (!here) return <div className="dim small card">Not inside a Git repository. Try <code>git init</code>.</div>;
  const st = status(sh, here); const wt = workTree(sh, here); const head = here.headTree();
  const commits = [...here.commits.values()].sort((a, b) => a.seq - b.seq); const branchNames = Object.keys(here.branches).sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a < b ? -1 : 1));
  const lane = new Map<string, number>(); branchNames.forEach((b, bi) => { let id: string | undefined = here.branches[b]; while (id && !lane.has(id)) { lane.set(id, bi); id = here.commits.get(id)!.parents[0]; } });
  commits.forEach(c => { if (!lane.has(c.id)) lane.set(c.id, 0); }); const X = (c: { seq: number }) => 30 + commits.findIndex(k => k.seq === c.seq) * 70, Y = (id: string) => 30 + (lane.get(id) ?? 0) * 46;
  return (
    <div>
      <div className="grid3">
        <div className="card"><h4>Working directory</h4>{Object.keys(wt).map(f => <div key={f} className={`small mono ${f in here.index ? '' : 'bad'}`}>{f}{!(f in here.index) ? ' (untracked)' : here.index[f] !== wt[f] ? ' (modified)' : ''}</div>)}{!Object.keys(wt).length && <span className="dim small">empty</span>}</div>
        <div className="card"><h4>Staging area (index)</h4>{Object.keys(here.index).map(f => <div key={f} className={`small mono ${head[f] !== here.index[f] ? 'good' : ''}`}>{f}{head[f] === undefined ? ' (new)' : head[f] !== here.index[f] ? ' (staged change)' : ''}</div>)}{!Object.keys(here.index).length && <span className="dim small">empty</span>}</div>
        <div className="card"><h4>Repository (HEAD {here.head.branch ?? 'detached'} @ {short(here.headId ?? '') || '—'})</h4>{Object.keys(head).map(f => <div key={f} className="small mono">{f}</div>)}{!Object.keys(head).length && <span className="dim small">no commits yet</span>}</div>
      </div>
      <div className="small dim">staged: {st.staged.length} · unstaged: {st.unstaged.length} · untracked: {st.untracked.length}{here.merging ? ' · MERGING (resolve conflicts, git add, git commit)' : ''}</div>
      {commits.length > 0 && <div className="tree-scroll"><svg width={Math.max(300, commits.length * 70 + 60)} height={branchNames.length * 46 + 70}>
        {commits.map(c => c.parents.map(p => { const pc = here.commits.get(p); return pc ? <line key={c.id + p} x1={X(pc)} y1={Y(p)} x2={X(c)} y2={Y(c.id)} className="edge" /> : null; }))}
        {commits.map(c => <g key={c.id} transform={`translate(${X(c)},${Y(c.id)})`}><circle r={11} className={`tn ${c.id === here.headId ? 'tagged' : ''}`} /><text y={32} textAnchor="middle" className="axis" style={{ fontSize: 9 }}>{short(c.id)}</text>
          {[...Object.entries(here.branches).filter(([, v]) => v === c.id).map(([k]) => k), ...Object.entries(here.remoteRefs).filter(([, v]) => v === c.id).map(([k]) => k)].map((b, i) => <text key={b} y={-16 - i * 11} textAnchor="middle" className="ptr-lbl" style={{ fontSize: 10 }}>{b === here.head.branch ? `HEAD→${b}` : b}</text>)}</g>)}
      </svg></div>}
    </div>
  );
}

function Terminal() {
  const store = useStore();
  const mk = (setup: string[] = []) => buildEnv(setup);
  const [sh, setSh] = useState(() => mk()); const [lines, setLines] = useState<{ t: string; k: 'in' | 'out' | 'err' }[]>([{ t: 'Simulated terminal (no real commands run). Type "help" for the list of supported commands.', k: 'out' }]);
  const [input, setInput] = useState(''); const hist = useRef<string[]>([]); const hi = useRef(0); const [, force] = useState(0); const [mid, setMid] = useState<string | null>(null); const last = useRef({ cmd: '', out: '' }); const [hint, setHint] = useState(0); const [done, setDone] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null); useEffect(() => { box.current?.scrollTo(0, 1e9); }, [lines]);
  const mission = MISSIONS.find(m => m.id === mid) ?? null;
  const start = (id: string | null) => { const m = MISSIONS.find(x => x.id === id) ?? null; setMid(id); setHint(0); setDone(null); const s = mk(m?.setup ?? []); setSh(s); last.current = { cmd: '', out: '' };
    setLines([{ t: m ? `Mission: ${m.title} — ${m.goal}` : 'Free terminal. Type "help".', k: 'out' }]); if (m && m.setup.some(c => c.startsWith('git merge'))) setLines(l => [...l, { t: 'Setup done: a merge of "sale" into main stopped with a conflict. Run: git status', k: 'out' }]); force(x => x + 1); };
  const exec = () => {
    const cmd = input.trim(); if (!cmd) return; hist.current.push(cmd); hi.current = hist.current.length; setInput('');
    if (cmd === 'clear') { setLines([]); return; }
    const user = 'student'; const r = sh.run(cmd, user); const add: { t: string; k: 'in' | 'out' | 'err' }[] = [{ t: `${sh.prompt()} ${cmd}`, k: 'in' }]; if (r.stdout) add.push({ t: r.stdout.replace(/\n$/, ''), k: 'out' }); if (r.stderr) add.push({ t: r.stderr.replace(/\n$/, ''), k: 'err' });
    setLines(l => [...l, ...add]); last.current = { cmd, out: r.stdout }; force(x => x + 1);
    if (mission && !done && mission.check(sh, repoOf(sh), last.current)) { setDone(mission.id); const id = `dev:${mission.id}`; store.recordAttempt(id); setLines(l => [...l, { t: store.markSolved(id, 25, hint, mission.title) ? `🎉 Mission complete! +${Math.max(5, 25 - hint * 5)} XP` : '🎉 Mission complete (already solved).', k: 'out' }]); }
  };
  const tree = fileTree(sh);
  return (
    <div>
      <div className="note small">A <b>simulated</b> Linux shell and Git (no real process or file system is touched). Commit hashes use a simple FNV hash (real Git uses SHA-1/SHA-256) and objects are whole-tree snapshots. All behaviour shown (merges, conflicts, resets…) is computed by the tested simulator.</div>
      <div className="controls"><label>Mission <select value={mid ?? ''} onChange={e => start(e.target.value || null)}><option value="">Free terminal</option>{MISSIONS.map(m => <option key={m.id} value={m.id}>{store.solved[`dev:${m.id}`] ? '✓ ' : ''}{m.title}</option>)}</select></label>
        <button onClick={() => start(mid)}>↺ Reset environment</button>{mission && <button onClick={() => setHint(h => Math.min(mission.hints.length, h + 1))} disabled={hint >= mission.hints.length}>💡 Hint ({hint}/{mission.hints.length})</button>}</div>
      {mission && <div className="card"><b>{mission.title}</b> — {mission.goal}{mission.hints.slice(0, hint).map((h, i) => <div key={i} className="small mono">• {h}</div>)}{done === mission.id && <div className="good">✓ Complete</div>}</div>}
      <div className="dev-grid">
        <div><div className="term" ref={box} onClick={() => document.getElementById('term-in')?.focus()}>{lines.map((l, i) => <pre key={i} className={`tl-${l.k}`}>{l.t}</pre>)}
          <div className="term-row"><span className="prompt">{sh.prompt()}</span><input id="term-in" value={input} onChange={e => setInput(e.target.value)} autoFocus spellCheck={false} autoComplete="off"
            onKeyDown={e => { if (e.key === 'Enter') exec(); else if (e.key === 'ArrowUp') { hi.current = Math.max(0, hi.current - 1); setInput(hist.current[hi.current] ?? ''); } else if (e.key === 'ArrowDown') { hi.current = Math.min(hist.current.length, hi.current + 1); setInput(hist.current[hi.current] ?? ''); } }} /></div></div>
          <div className="dim small">↑/↓ history · pipes, redirection, &&, $VARS supported.</div></div>
        <div><div className="viz-label">File system under /home/student (live)</div><div className="ftree">{tree.map(({ p, n }) => <div key={p} className="small mono"><span className="dim">{modeStr(n)} {n.owner}</span> {p.replace('/home/student/', '')}{n.dir ? '/' : ''}</div>)}{!tree.length && <span className="dim small">empty</span>}</div>
          <div className="small dim">cwd: <b className="mono">{sh.cwd}</b></div></div>
      </div>
      <h4>Git view</h4><GitPanel sh={sh} />
    </div>
  );
}

export function DevWorld() {
  const [tab, setTab] = useState<'c' | 't'>('c'); const useMemoized = useMemo(() => 0, []); void useMemoized;
  return (
    <div className="page"><h1>Developer Tools World</h1>
      <div className="stage-bar"><button className={`tab ${tab === 'c' ? 'on' : ''}`} onClick={() => setTab('c')}>Concepts</button><button className={`tab ${tab === 't' ? 'on' : ''}`} onClick={() => setTab('t')}>Terminal Lab (Git · Linux · missions)</button></div>
      {tab === 'c' ? <ConceptCards concepts={DEV_CONCEPTS} /> : <Terminal />}
    </div>
  );
}
