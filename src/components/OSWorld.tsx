import { useEffect, useMemo, useState } from 'react';
import { HowTo, Legend } from './Explain';
import { Algo, BankerState, DiskAlgo, PageAlgo, Proc, ResourceSim, diskSchedule, need, pageReplacement, requestResources, safety, schedule } from '../os/engines';

/** shared stepper: Start/Pause/Next/Back/Reset/Speed over `n` positions (0..n) */
export function useStepper(n: number) {
  const [i, setI] = useState(0); const [play, setPlay] = useState(false); const [speed, setSpeed] = useState(1);
  useEffect(() => { setI(0); setPlay(false); }, [n]);
  useEffect(() => { if (!play) return; const t = setInterval(() => setI(x => { if (x >= n) { setPlay(false); return x; } return x + 1; }), 900 / speed); return () => clearInterval(t); }, [play, speed, n]);
  const ui = (
    <div className="controls">
      <button onClick={() => { setI(0); setPlay(false); }}>⏮ Reset</button>
      <button onClick={() => setI(x => Math.max(0, x - 1))} disabled={i === 0}>◀ Back</button>
      {play ? <button className="primary" onClick={() => setPlay(false)}>⏸ Pause</button> : <button className="primary" onClick={() => { if (i >= n) setI(0); setPlay(true); }}>▶ {i > 0 && i < n ? 'Resume' : 'Start'}</button>}
      <button onClick={() => setI(x => Math.min(n, x + 1))} disabled={i >= n}>Next ▶</button>
      <label className="speed">speed <input type="range" min="0.5" max="4" step="0.5" value={speed} onChange={e => setSpeed(+e.target.value)} /> {speed}×</label>
      <input className="scrub" type="range" min={0} max={n} value={i} onChange={e => { setI(+e.target.value); setPlay(false); }} />
      <span className="dim">step {i}/{n}</span>
    </div>
  );
  return { i, ui, setI };
}
const COLORS = ['#7c9cff', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#22d3ee', '#fb923c', '#a3e635'];
const col = (pid: string | null, all: string[]) => (pid === null ? '#2a2f38' : COLORS[all.indexOf(pid) % COLORS.length]);
const Concept = ({ title, simple, tech, analogy, terms }: { title: string; simple: string; tech: string; analogy: string; terms: [string, string][] }) => (
  <details className="card concept" open><summary><b>{title}</b> — concept card</summary>
    <p><b>Simple:</b> {simple}</p><p><b>Technical:</b> {tech}</p><p><b>Analogy:</b> {analogy}</p>
    <div className="kwlist">{terms.map(([a, b]) => <div key={a}><b>{a}</b> — {b}</div>)}</div></details>
);
const num = (v: string) => (v === '' ? 0 : Math.max(0, Math.floor(+v) || 0));

/* ------------------------------------------------------------ CPU scheduling */
function Scheduling() {
  const [procs, setProcs] = useState<Proc[]>([{ pid: 'P1', arrival: 0, burst: 5, priority: 2 }, { pid: 'P2', arrival: 1, burst: 3, priority: 1 }, { pid: 'P3', arrival: 2, burst: 1, priority: 3 }]);
  const [algo, setAlgo] = useState<Algo>('FCFS'); const [q, setQ] = useState(2);
  const res = useMemo(() => { try { return schedule(procs, algo, Math.max(1, q)); } catch (e: any) { return String(e.message); } }, [procs, algo, q]);
  const ok = typeof res !== 'string';
  const { i, ui } = useStepper(ok ? res.makespan : 0);
  const all = procs.map(p => p.pid);
  const set = (k: number, f: Partial<Proc>) => setProcs(ps => ps.map((p, j) => (j === k ? { ...p, ...f } : p)));
  const tick = ok ? res.ticks[Math.min(i, res.ticks.length - 1)] : null;
  const shown = ok ? res.segments.map(s => ({ ...s, end: Math.min(s.end, i) })).filter(s => s.end > s.start) : [];
  const finished = ok ? res.metrics.filter(m => m.completion <= i) : [];
  return (
    <div>
      <Concept title="CPU scheduling" simple="With one CPU and many ready programs, the scheduler decides who runs next." tech="A scheduler selects a process from the ready queue according to a policy (FCFS, SJF, SRTF, Priority, Round Robin). Preemptive policies may take the CPU away before a burst ends." analogy="Customers waiting at one service counter: the clerk's rule decides who is served next." terms={[['Burst time', 'CPU time a process needs.'], ['Turnaround', 'Completion − arrival.'], ['Waiting', 'Turnaround − burst.'], ['Response', 'First CPU time − arrival.'], ['Context switch', 'The CPU is handed to a different process (counted here when consecutive running processes differ).']]} />
      <div className="controls">
        <label>Algorithm <select value={algo} onChange={e => setAlgo(e.target.value as Algo)}>{(['FCFS', 'SJF', 'SRTF', 'PRIORITY', 'PRIORITY_P', 'RR'] as Algo[]).map(a => <option key={a} value={a}>{{ FCFS: 'FCFS', SJF: 'SJF (non-preemptive)', SRTF: 'SRTF (preemptive SJF)', PRIORITY: 'Priority (non-preemptive)', PRIORITY_P: 'Priority (preemptive)', RR: 'Round Robin' }[a]}</option>)}</select></label>
        {algo === 'RR' && <label>Quantum <input type="number" min={1} value={q} onChange={e => setQ(Math.max(1, num(e.target.value)))} style={{ width: 60 }} /></label>}
        <button onClick={() => setProcs(ps => [...ps, { pid: `P${ps.length + 1}`, arrival: 0, burst: 1, priority: 1 }])}>+ Add process</button>
      </div>
      <table className="sqlt"><thead><tr><th>Process</th><th>Arrival</th><th>Burst</th>{algo.startsWith('PRIORITY') && <th>Priority (low = high)</th>}<th /></tr></thead>
        <tbody>{procs.map((p, k) => <tr key={k}><td>{p.pid}</td>
          <td><input type="number" min={0} value={p.arrival} onChange={e => set(k, { arrival: num(e.target.value) })} style={{ width: 70 }} /></td>
          <td><input type="number" min={1} value={p.burst} onChange={e => set(k, { burst: Math.max(1, num(e.target.value)) })} style={{ width: 70 }} /></td>
          {algo.startsWith('PRIORITY') && <td><input type="number" value={p.priority ?? 0} onChange={e => set(k, { priority: num(e.target.value) })} style={{ width: 70 }} /></td>}
          <td><button onClick={() => setProcs(ps => ps.filter((_, j) => j !== k))} disabled={procs.length < 2}>✕</button></td></tr>)}</tbody></table>
      {!ok && <div className="err compile">{res as string}</div>}
      {ok && (<>
        <div className="viz-label">Gantt chart</div>
        <HowTo>Gantt chart: time runs left to right. Each coloured block is one process holding the CPU: its width is how long it ran and the small number under it is the time it started. “idle” means no process was ready to run.</HowTo>
        <div className="gantt">{shown.map((s, k) => <div key={k} className="gseg" style={{ width: `${(s.end - s.start) * 34}px`, background: col(s.pid, all) }}><b>{s.pid ?? 'idle'}</b><span>{s.start}</span></div>)}<span className="gend">{i}</span></div>
        <div className="grid2">
          <div className="card"><h4>At time t = {i}</h4><div>Running: <b>{tick && i < res.makespan ? tick.running ?? 'idle' : '—'}</b></div><div>Ready queue: <b>{tick && i < res.makespan ? tick.ready.join(' → ') || '(empty)' : '—'}</b></div><div>Completed: <b>{finished.map(m => m.pid).join(', ') || '—'}</b></div></div>
          <div className="card"><h4>Totals (whole run)</h4><div>CPU utilization: <b>{(res.cpuUtilization * 100).toFixed(1)}%</b></div><div>Context switches: <b>{res.contextSwitches}</b></div><div>Avg waiting: <b>{res.avgWaiting.toFixed(2)}</b> · Avg turnaround: <b>{res.avgTurnaround.toFixed(2)}</b> · Avg response: <b>{res.avgResponse.toFixed(2)}</b></div></div>
        </div>
        {ui}
        <table className="sqlt"><thead><tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Completion</th><th>Turnaround</th><th>Waiting</th><th>Response</th></tr></thead>
          <tbody>{res.metrics.map(m => <tr key={m.pid} className={m.completion > i ? 'gone' : ''}><td>{m.pid}</td><td>{m.arrival}</td><td>{m.burst}</td><td>{m.completion}</td><td>{m.turnaround}</td><td>{m.waiting}</td><td>{m.response}</td></tr>)}</tbody></table>
        <div className="dim small">Educational model: time advances in whole units, context-switch overhead is zero, and in Round Robin a process that arrives at the same instant a quantum expires is queued before the preempted process.</div>
      </>)}
    </div>
  );
}

/* ------------------------------------------------------------ page replacement */
function Paging() {
  const [refText, setRefText] = useState('7,0,1,2,0,3,0,4'); const [frames, setFrames] = useState(3); const [algo, setAlgo] = useState<PageAlgo>('FIFO');
  const refs = refText.split(/[ ,]+/).filter(Boolean).map(Number);
  const bad = refs.some(n => !Number.isInteger(n) || n < 0) || refs.length === 0;
  const r = useMemo(() => (bad ? null : pageReplacement(refs, Math.max(1, frames), algo)), [refText, frames, algo]); // eslint-disable-line
  const { i, ui } = useStepper(r ? r.steps.length : 0);
  const cmp = useMemo(() => (bad ? null : (['FIFO', 'LRU', 'OPT'] as PageAlgo[]).map(a => [a, pageReplacement(refs, Math.max(1, frames), a).faults] as const)), [refText, frames]); // eslint-disable-line
  const done = r ? r.steps.slice(0, i) : []; const last = done[done.length - 1];
  return (
    <div>
      <Concept title="Page replacement" simple="Memory has few frames; when a needed page is missing, one resident page must be evicted." tech="Demand paging loads pages on a fault. The replacement policy picks the victim: FIFO (oldest), LRU (least recently used) or Optimal (farthest next use, which needs future knowledge and is only a benchmark)." analogy="A small desk that fits 3 books: to open a 4th you must put one back." terms={[['Page fault', 'Needed page is not in a frame.'], ['Hit', 'Needed page is already in a frame.'], ["Belady's anomaly", 'With FIFO, more frames can cause more faults.']]} />
      <div className="controls"><label>Reference string <input value={refText} onChange={e => setRefText(e.target.value)} style={{ width: 280 }} /></label>
        <label>Frames <input type="number" min={1} max={8} value={frames} onChange={e => setFrames(Math.max(1, Math.min(8, num(e.target.value))))} style={{ width: 60 }} /></label>
        <select value={algo} onChange={e => setAlgo(e.target.value as PageAlgo)}><option value="FIFO">FIFO</option><option value="LRU">LRU</option><option value="OPT">Optimal</option></select></div>
      {bad && <div className="err compile">Enter non-negative integers separated by commas.</div>}
      {r && (<>
        <HowTo>Each column is one page reference (the number on top). The boxes under it are the memory frames after that reference. A page already in a frame is a hit; otherwise it is a page fault: the page is loaded, replacing another one when memory is full. The coloured frame is the one used for this reference.</HowTo>
        <Legend items={[['sw-hit', '✓ hit: the page was already in memory'], ['sw-fault', '✗ page fault: it had to be loaded']]} />
        <div className="page-grid">{done.map((s, k) => <div key={k} className="pcol"><div className={`pref ${s.fault ? 'bad' : 'good'}`}>{s.ref}</div>{s.frames.map((f, j) => <div key={j} className={`pf ${j === s.slot ? (s.fault ? 'fault' : 'hit') : ''}`}>{f ?? ''}</div>)}<div className="pm">{s.fault ? '✗' : '✓'}</div></div>)}</div>
        <div className="card">{last ? <><b>Step {i}:</b> {last.why}</> : 'Press Start or Next to request the first page.'}<div>Faults so far: <b>{done.filter(s => s.fault).length}</b> · Hits: <b>{done.filter(s => !s.fault).length}</b></div></div>
        {ui}
        <div className="dim small">Total faults for this string and frame count: {cmp?.map(([a, f]) => `${a} = ${f}`).join(' · ')}</div>
      </>)}
    </div>
  );
}

/* ------------------------------------------------------------ Banker's */
function Banker() {
  const [st, setSt] = useState<BankerState>({ available: [3, 3, 2], max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]], alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]] });
  const [reqP, setReqP] = useState(1); const [req, setReq] = useState([1, 0, 2]); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const nd = need(st); const s = useMemo(() => safety(st), [st]); const { i, ui } = useStepper(s.steps.length);
  const bad = nd.some(r => r.some(x => x < 0));
  const edit = (k: 'max' | 'alloc', a: number, b: number, v: number) => setSt(x => ({ ...x, [k]: x[k].map((r, p) => (p === a ? r.map((c, q) => (q === b ? v : c)) : r)) }));
  const shownWork = i === 0 ? st.available : s.steps[i - 1].after;
  const order = s.steps.slice(0, i).map(x => x.pid);
  const M = (title: string, m: number[][], k?: 'max' | 'alloc') => <div><div className="viz-label">{title}</div><table className="sqlt"><tbody>{m.map((r, a) => <tr key={a}><th>P{a}</th>{r.map((c, b) => <td key={b}>{k ? <input type="number" min={0} value={c} onChange={e => edit(k, a, b, num(e.target.value))} style={{ width: 52 }} /> : c}</td>)}</tr>)}</tbody></table></div>;
  return (
    <div>
      <Concept title="Banker's algorithm (deadlock avoidance)" simple="Before giving a resource, check that everyone could still finish in some order." tech="The system is safe if a sequence exists in which every process can obtain its remaining Need (Max − Allocation) from Available plus the resources released by earlier finishers. A request is granted only if the resulting state is safe." analogy="A banker only lends money if, afterwards, all customers could still eventually repay and finish their projects." terms={[['Available', 'Free units per resource type.'], ['Need', 'Max − Allocation.'], ['Safe sequence', 'An order in which all processes can finish.'], ['Unsafe', 'No such order — deadlock is possible (not certain).']]} />
      <div className="controls"><span>Available:</span>{st.available.map((a, j) => <input key={j} type="number" min={0} value={a} onChange={e => setSt(x => ({ ...x, available: x.available.map((c, k) => (k === j ? num(e.target.value) : c)) }))} style={{ width: 56 }} />)}</div>
      <div className="grid3">{M('Max', st.max, 'max')}{M('Allocation', st.alloc, 'alloc')}{M('Need = Max − Alloc', nd)}</div>
      {bad && <div className="err compile">Allocation exceeds Max for some process: fix the matrices (Need must be ≥ 0).</div>}
      {!bad && <div className={`card ${s.safe ? '' : 'unsafe'}`}><b>{s.safe ? '✓ Safe state' : '✗ Unsafe state'}</b>{s.safe ? ` — safe sequence (lowest index first): ${s.sequence.map(p => 'P' + p).join(' → ')}` : ` — processes that can never finish: ${s.stuck.map(p => 'P' + p).join(', ')}`}</div>}
      {!bad && s.steps.length > 0 && <>{ui}<div className="card">Work (available) now: <b>[{shownWork.join(', ')}]</b> · Finished in order: <b>{order.map(p => 'P' + p).join(' → ') || '—'}</b>{i > 0 && <div className="dim small">P{s.steps[i - 1].pid} needed [{s.steps[i - 1].need.join(', ')}] ≤ work [{s.steps[i - 1].work.join(', ')}], so it finishes and returns its allocation.</div>}</div></>}
      <h4>Request resources</h4>
      <div className="controls"><label>Process <select value={reqP} onChange={e => setReqP(+e.target.value)}>{st.max.map((_, p) => <option key={p} value={p}>P{p}</option>)}</select></label>
        {req.map((r, j) => <input key={j} type="number" min={0} value={r} onChange={e => setReq(x => x.map((c, k) => (k === j ? num(e.target.value) : c)))} style={{ width: 56 }} />)}
        <button className="primary" disabled={bad} onClick={() => { const r = requestResources(st, reqP, req); setMsg({ ok: r.granted, t: r.reason }); if (r.next) setSt(r.next); }}>Request</button></div>
      {msg && <div className={msg.ok ? 'good' : 'bad'}>{msg.ok ? '✓ Granted. ' : '✗ Not granted. '}{msg.t}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ deadlock / resource allocation */
const PROCS = ['T1', 'T2', 'T3'], RES = ['A', 'B', 'C'];
export function Deadlock({ names = PROCS, resources = RES, label = 'process' }: { names?: string[]; resources?: string[]; label?: string }) {
  const [hist, setHist] = useState<ResourceSim[]>([new ResourceSim(names, resources)]);
  const [p, setP] = useState(names[0]); const [r, setR] = useState(resources[0]); const [err, setErr] = useState<string | null>(null);
  const sim = hist[hist.length - 1]; const cycle = sim.findCycle();
  const act = (f: (s: ResourceSim) => void) => { const n = sim.clone(); try { f(n); setErr(null); setHist(h => [...h, n]); } catch (e: any) { setErr(e.message); } };
  const pos = (k: number, total: number, ring: number) => ({ x: 150 + ring * Math.cos((2 * Math.PI * k) / total - Math.PI / 2), y: 110 + ring * Math.sin((2 * Math.PI * k) / total - Math.PI / 2) });
  return (
    <div>
      <div className="controls"><label>{label} <select value={p} onChange={e => setP(e.target.value)}>{names.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>resource <select value={r} onChange={e => setR(e.target.value)}>{resources.map(x => <option key={x}>{x}</option>)}</select></label>
        <button className="primary" onClick={() => act(s => s.request(p, r))}>Request / lock</button>
        <button onClick={() => act(s => s.release(p, r))}>Release</button>
        <button onClick={() => act(s => s.abort(p))} title="Abort the selected process (deadlock victim)">Abort victim</button>
        <button onClick={() => setHist(h => (h.length > 1 ? h.slice(0, -1) : h))} disabled={hist.length < 2}>◀ Undo</button>
        <button onClick={() => { const s = new ResourceSim(names, resources); s.request(names[0], resources[0]); s.request(names[1], resources[1]); setHist([s]); }}>Load "almost deadlock"</button>
        <button onClick={() => setHist([new ResourceSim(names, resources)])}>⏮ Reset</button></div>
      {err && <div className="err compile">{err}</div>}
      <div className="grid2">
        <div><div className="viz-label">Lock table</div><table className="sqlt"><thead><tr><th>Resource</th><th>Held by</th><th>Waiting queue</th></tr></thead><tbody>{resources.map(x => <tr key={x}><td>{x}</td><td>{sim.res[x].holder ?? <i className="dim">free</i>}</td><td>{sim.res[x].queue.join(', ') || '—'}</td></tr>)}</tbody></table>
          <div className="viz-label">Wait-for edges (waiter → holder)</div><div>{sim.waitFor().map(([a, b]) => `${a} → ${b}`).join('   ') || <span className="dim">none</span>}</div></div>
        <div><div className="viz-label">Wait-for graph</div>
          <HowTo>Circles are processes. An arrow A → B means A is waiting for something B holds. A closed loop of arrows is a deadlock: nobody in the loop can ever continue.</HowTo>
          <svg width={300} height={220} className="chart">
            <defs><marker id="dah" markerWidth="8" markerHeight="8" refX="16" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#f87171" /></marker></defs>
            {sim.waitFor().map(([a, b], k) => { const A = pos(names.indexOf(a), names.length, 70), B = pos(names.indexOf(b), names.length, 70); const inCycle = cycle && cycle.includes(a) && cycle.includes(b); return <line key={k} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={inCycle ? '#f87171' : '#8b93a0'} strokeWidth={inCycle ? 3 : 1.5} markerEnd="url(#dah)" />; })}
            {names.map((n, k) => { const q = pos(k, names.length, 70); return <g key={n} transform={`translate(${q.x},${q.y})`}><circle r={16} className={`tn ${cycle?.includes(n) ? 'hot' : ''}`} /><text y={4} textAnchor="middle" className="tl">{n}</text></g>; })}
          </svg></div>
      </div>
      <div className={`card ${cycle ? 'unsafe' : ''}`}>{cycle ? <><b>✗ Deadlock detected:</b> cycle {cycle.join(' → ')} → {cycle[0]}. Each waits for a lock held by the next, so none can proceed. Choose a victim and abort it to break the cycle.</> : <><b>✓ No cycle</b> in the wait-for graph: no deadlock right now.</>}</div>
      <details open><summary className="dim small">Event log</summary>{sim.log.map((l, k) => <div key={k} className="small">{k + 1}. {l}</div>)}</details>
      <div className="dim small">Single-instance resources only: a cycle in the wait-for graph is both necessary and sufficient for deadlock here. With multiple instances per resource a cycle is only necessary.</div>
    </div>
  );
}

/* ------------------------------------------------------------ disk scheduling */
function Disk() {
  const [reqText, setReqText] = useState('98,183,37,122,14,124,65,67'); const [head, setHead] = useState(53); const [algo, setAlgo] = useState<DiskAlgo>('FCFS'); const [dir, setDir] = useState<'up' | 'down'>('up'); const size = 200;
  const reqs = reqText.split(/[ ,]+/).filter(Boolean).map(Number); const bad = reqs.some(n => !Number.isInteger(n) || n < 0 || n >= size) || head < 0 || head >= size;
  const r = useMemo(() => (bad ? null : diskSchedule(reqs, head, algo, size, dir)), [reqText, head, algo, dir]); // eslint-disable-line
  const { i, ui } = useStepper(r ? r.path.length - 1 : 0);
  const pts = r ? r.path.slice(0, i + 1) : []; const W = 520, H = 40 + 28 * (r?.path.length ?? 1);
  const x = (v: number) => 20 + (v / (size - 1)) * (W - 40);
  const dist = pts.reduce((s, v, k) => (k ? s + Math.abs(v - pts[k - 1]) : 0), 0);
  return (
    <div>
      <Concept title="Disk scheduling" simple="A hard disk head moves across tracks; the order of serving requests changes how far it travels." tech="FCFS serves in arrival order, SSTF always goes to the nearest request, SCAN sweeps to one end then reverses, C-SCAN sweeps one way and jumps back. Seek distance dominates HDD latency." analogy="An elevator picking up passengers: going floor by floor in call order wastes time." terms={[['Seek time', 'Time to move the head to a track.'], ['Starvation', 'A request that waits indefinitely (possible with SSTF).']]} />
      <div className="controls"><label>Requests <input value={reqText} onChange={e => setReqText(e.target.value)} style={{ width: 260 }} /></label><label>Head <input type="number" value={head} onChange={e => setHead(num(e.target.value))} style={{ width: 70 }} /></label>
        <select value={algo} onChange={e => setAlgo(e.target.value as DiskAlgo)}><option value="FCFS">FCFS</option><option value="SSTF">SSTF</option><option value="SCAN">SCAN</option><option value="CSCAN">C-SCAN</option></select>
        {(algo === 'SCAN' || algo === 'CSCAN') && <select value={dir} onChange={e => setDir(e.target.value as 'up' | 'down')}><option value="up">towards higher tracks</option><option value="down">towards lower tracks</option></select>}</div>
      {bad && <div className="err compile">Tracks must be integers in 0..{size - 1}.</div>}
      {r && <><HowTo>The head path: each dot is a track the head visits, from top to bottom in the order the requests are served (the amber dot is the starting position). The horizontal distance between two dots is how far the head had to move.</HowTo><svg width={W} height={H} className="chart">{pts.map((v, k) => k > 0 && <line key={k} x1={x(pts[k - 1])} y1={20 + 28 * (k - 1)} x2={x(v)} y2={20 + 28 * k} stroke="#7c9cff" strokeWidth={2} />)}
        {pts.map((v, k) => <g key={k}><circle cx={x(v)} cy={20 + 28 * k} r={4} fill={k === 0 ? '#fbbf24' : '#7c9cff'} /><text x={x(v) + 7} y={24 + 28 * k} className="axis" style={{ fontSize: 11 }}>{v}</text></g>)}</svg>
        {ui}<div className="card">Distance so far: <b>{dist}</b> · Total for the full schedule: <b>{r.total}</b> tracks{(algo === 'SCAN' || algo === 'CSCAN') ? ' (the head travels to the disk edge; in C-SCAN the return jump is counted)' : ''}</div></>}
    </div>
  );
}

export function OSWorld() {
  const [tab, setTab] = useState<'cpu' | 'page' | 'bank' | 'dead' | 'disk'>('cpu');
  const tabs = [['cpu', 'CPU Scheduling Arena'], ['page', 'Page Replacement'], ['bank', "Banker's Algorithm"], ['dead', 'Deadlock'], ['disk', 'Disk Scheduling']] as const;
  return (
    <div className="page">
      <h1>Operating System World</h1>
      <div className="note small">These are <b>simplified educational models</b> driven by real algorithm implementations (tested against textbook results). They are not a reproduction of any specific operating-system kernel.</div>
      <div className="stage-bar">{tabs.map(([k, n]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{n}</button>)}</div>
      {tab === 'cpu' && <Scheduling />}{tab === 'page' && <Paging />}{tab === 'bank' && <Banker />}
      {tab === 'dead' && <div><Concept title="Deadlock" simple="Two or more processes each wait for something another one holds, so nobody can continue." tech="Deadlock requires four conditions at once: mutual exclusion, hold and wait, no preemption and circular wait. Detection searches the wait-for graph for a cycle; recovery aborts a victim or preempts resources." analogy="Two people in a narrow corridor, each refusing to step back until the other does." terms={[['Mutual exclusion', 'A resource has one owner at a time.'], ['Hold and wait', 'Holding one resource while requesting another.'], ['No preemption', 'Resources cannot be forcibly taken.'], ['Circular wait', 'A cycle of processes each waiting for the next.']]} /><Deadlock /></div>}
      {tab === 'disk' && <Disk />}
    </div>
  );
}
