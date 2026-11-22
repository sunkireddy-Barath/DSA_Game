import { useEffect, useMemo, useRef, useState } from 'react';
import { HowTo, Legend } from './Explain';
import { SD_CONCEPTS } from '../sysdesign/concepts';
import { ConceptCards } from './ConceptCards';
import { useStepper } from './OSWorld';
import { useStore } from '../store';
import { DEFAULTS, Design, NType, SCENARIOS, SNode, evaluateGoals, newNode, simulate } from '../sysdesign/engine';

const ICON: Record<NType, string> = { client: '👥', cdn: '🌐', lb: '⚖️', server: '🖥️', cache: '⚡', db: '🗄️', queue: '📨', worker: '⚙️' };
const COLOR = { idle: '#3a4150', ok: '#34d399', hot: '#fbbf24', saturated: '#f87171', down: '#6b7280' } as const;
const RAMP = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5];

function Designer() {
  const store = useStore();
  const [sid, setSid] = useState(SCENARIOS[0].id); const sc = SCENARIOS.find(s => s.id === sid)!;
  const [design, setDesign] = useState<Design>(() => SCENARIOS[0].design());
  const [rps, setRps] = useState(sc.traffic.rps); const [readRatio, setRR] = useState(sc.traffic.readRatio); const [net, setNet] = useState(sc.traffic.netLatency);
  const [sel, setSel] = useState<string | null>(null); const [connectFrom, setConnectFrom] = useState<string | null>(null); const [msg, setMsg] = useState<string | null>(null);
  const [ramp, setRamp] = useState(false);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null); const svg = useRef<SVGSVGElement>(null);
  const load = (id: string) => { const s = SCENARIOS.find(x => x.id === id)!; setSid(id); setDesign(s.design()); setRps(s.traffic.rps); setRR(s.traffic.readRatio); setNet(s.traffic.netLatency); setSel(null); setConnectFrom(null); setMsg(null); };
  const { i, ui } = useStepper(RAMP.length);
  const mult = ramp && i > 0 ? RAMP[i - 1] : 1;
  const traffic = { rps: Math.round(rps * mult), readRatio, netLatency: net };
  const res = useMemo(() => simulate(design, traffic), [design, rps, readRatio, net, mult]); // eslint-disable-line
  const goals = useMemo(() => evaluateGoals(sc, simulate(design, { rps, readRatio, netLatency: net }), design), [design, rps, readRatio, net, sc]);
  const allMet = goals.every(g => g.ok);
  const solvedId = `sd:${sc.id}`;
  useEffect(() => { if (allMet && !store.solved[solvedId]) { store.recordAttempt(solvedId); if (store.markSolved(solvedId, 60, 0, `Design: ${sc.title}`)) setMsg('🎉 All goals met! +60 XP'); } }, [allMet]); // eslint-disable-line

  const selNode = design.nodes.find(n => n.id === sel) ?? null;
  const upd = (id: string, p: Partial<SNode>) => setDesign(d => ({ ...d, nodes: d.nodes.map(n => (n.id === id ? { ...n, ...p } : n)) }));
  const pt = (e: React.PointerEvent) => { const r = svg.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onDown = (e: React.PointerEvent, n: SNode) => { if (connectFrom) { if (connectFrom !== n.id && !design.edges.some(x => x.from === connectFrom && x.to === n.id)) setDesign(d => ({ ...d, edges: [...d.edges, { from: connectFrom, to: n.id }] })); setConnectFrom(null); return; } const p = pt(e); drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y }; setSel(n.id); (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (!drag.current) return; const p = pt(e); const { id, dx, dy } = drag.current; upd(id, { x: Math.max(30, Math.min(720, p.x - dx)), y: Math.max(30, Math.min(320, p.y - dy)) }); };
  const add = (t: NType) => { const n = newNode(t, 60 + Math.random() * 500, 60 + Math.random() * 240); setDesign(d => ({ ...d, nodes: [...d.nodes, n] })); setSel(n.id); };
  const remove = (id: string) => { if (design.nodes.find(n => n.id === id)?.type === 'client') return; setDesign(d => ({ nodes: d.nodes.filter(n => n.id !== id), edges: d.edges.filter(e => e.from !== id && e.to !== id) })); setSel(null); };
  const by = new Map(design.nodes.map(n => [n.id, n]));
  return (
    <div>
      <div className="note small">A steady-state capacity model: each component has a capacity, latency and availability you can edit; load is routed along your connections. Cache hit rates, the write cost on databases (≈3 reads) and the queueing delay formula are illustrative assumptions, not measurements of any real product.</div>
      <div className="controls"><label>Scenario <select value={sid} onChange={e => load(e.target.value)}>{SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.title}{store.solved[`sd:${s.id}`] ? ' ✓' : ''}</option>)}</select></label>
        <button onClick={() => load(sid)}>↺ Reset design</button><button onClick={() => { setDesign({ nodes: [design.nodes.find(n => n.type === 'client')!], edges: [] }); setSel(null); }}>Clear canvas (empty)</button></div>
      <div className="card"><b>{sc.title}</b> — {sc.brief}<ul className="small">{sc.notes.map(n => <li key={n}>{n}</li>)}</ul></div>
      <div className="controls"><label>Traffic <input type="range" min={100} max={30000} step={100} value={rps} onChange={e => setRps(+e.target.value)} /> <b>{rps.toLocaleString()} req/s</b></label>
        <label>Reads <input type="range" min={0} max={1} step={0.01} value={readRatio} onChange={e => setRR(+e.target.value)} /> {(readRatio * 100).toFixed(0)}%</label>
        <label>Network latency/hop <input type="range" min={0} max={200} value={net} onChange={e => setNet(+e.target.value)} /> {net} ms</label></div>
      <div className="controls"><span className="dim">Add:</span>{(['cdn', 'lb', 'server', 'cache', 'db', 'queue', 'worker'] as NType[]).map(t => <button key={t} onClick={() => add(t)}>{ICON[t]} {DEFAULTS[t].label}</button>)}
        <button className={connectFrom ? 'primary' : ''} onClick={() => setConnectFrom(sel)} disabled={!sel}>{connectFrom ? 'Click the target node…' : '🔗 Connect selected →'}</button></div>
      <div className="sd-grid">
        <div><HowTo>Each circle is a component and each arrow a request path. A thicker arrow carries more traffic, and the percentage under a component is its load compared with its capacity. Drag a component to move it.</HowTo><svg ref={svg} width={760} height={350} className="sd-canvas" onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
          <defs><marker id="sdah" markerWidth="8" markerHeight="8" refX="26" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8b93a0" /></marker></defs>
          {design.edges.map((e, k) => { const a = by.get(e.from)!, b = by.get(e.to)!; const f = res.edges.find(x => x.from === e.from && x.to === e.to); return <g key={k}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={f && f.rps > 0 ? '#7c9cff' : '#3a4150'} strokeWidth={f ? 1.5 + Math.min(5, Math.log10(1 + f.rps)) : 1.5} markerEnd="url(#sdah)" onClick={() => setDesign(d => ({ ...d, edges: d.edges.filter((_, j) => j !== k) }))} style={{ cursor: 'pointer' }} /><text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 5} className="axis" style={{ fontSize: 10 }}>{f ? `${Math.round(f.rps).toLocaleString()}/s` : ''}</text></g>; })}
          {design.nodes.map(n => { const s = res.nodes[n.id]; return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`} onPointerDown={e => onDown(e, n)} style={{ cursor: 'grab' }}>
              <circle r={26} fill="#15181d" stroke={n.id === sel ? '#7c9cff' : COLOR[s.status]} strokeWidth={n.id === sel ? 4 : 3} />
              <text y={6} textAnchor="middle" style={{ fontSize: 20 }}>{ICON[n.type]}</text>
              <text y={42} textAnchor="middle" className="tl">{n.label}{n.type !== 'client' && n.count > 1 ? ` ×${n.count}` : ''}</text>
              {n.type !== 'client' && <text y={54} textAnchor="middle" className="axis" style={{ fontSize: 10 }}>{s.status === 'down' ? 'DOWN' : s.capacity > 0 ? `${Math.min(999, Math.round(s.util * 100))}% load` : ''}</text>}
            </g>); })}
        </svg>
          <div className="dim small">Drag nodes · select a node then “Connect” to draw an edge · click an edge to delete it · edge labels show requests/s.</div></div>
        <div>{selNode ? (<div className="card"><b>{ICON[selNode.type]} {selNode.label}</b>
          {selNode.type !== 'client' && <>
            <label className="row small">Instances <input type="number" min={1} max={100} value={selNode.count} onChange={e => upd(selNode.id, { count: Math.max(1, +e.target.value || 1) })} style={{ width: 70 }} /></label>
            {selNode.type !== 'db' || true ? <label className="row small">Capacity/instance (req/s) <input type="number" min={1} value={selNode.capacity} onChange={e => upd(selNode.id, { capacity: Math.max(1, +e.target.value || 1) })} style={{ width: 90 }} /></label> : null}
            <label className="row small">Latency (ms) <input type="number" min={0} value={selNode.latency} onChange={e => upd(selNode.id, { latency: Math.max(0, +e.target.value || 0) })} style={{ width: 70 }} /></label>
            {(selNode.type === 'cache' || selNode.type === 'cdn') && <label className="row small">Hit rate <input type="number" min={0} max={1} step={0.05} value={selNode.hit} onChange={e => upd(selNode.id, { hit: Math.max(0, Math.min(1, +e.target.value || 0)) })} style={{ width: 70 }} /></label>}
            {selNode.type === 'db' && <label className="row small">Read replicas <input type="number" min={0} max={10} value={selNode.replicas} onChange={e => upd(selNode.id, { replicas: Math.max(0, +e.target.value || 0) })} style={{ width: 70 }} /></label>}
            <label className="row small">Availability (per instance) <input type="number" min={0.9} max={0.99999} step={0.0005} value={selNode.avail} onChange={e => upd(selNode.id, { avail: Math.min(0.99999, Math.max(0.5, +e.target.value || 0.99)) })} style={{ width: 90 }} /></label>
            <label className="row small">💥 Failed instances <input type="number" min={0} max={selNode.count} value={selNode.down} onChange={e => upd(selNode.id, { down: Math.max(0, Math.min(selNode.count, +e.target.value || 0)) })} style={{ width: 70 }} /></label>
            <button onClick={() => remove(selNode.id)}>🗑 Remove</button></>}
          {res.nodes[selNode.id].note && <div className="small dim">{res.nodes[selNode.id].note}</div>}</div>) : <div className="dim small card">Select a node to configure it and inject failures.</div>}
          <div className="card"><h4>Goals{allMet ? ' ✓ all met' : ''}</h4>{goals.map(g => <div key={g.id} className={`small ${g.ok ? 'good' : 'bad'}`}>{g.ok ? '✓' : '✗'} {g.label}</div>)}{msg && <div className="good">{msg}</div>}</div></div>
      </div>
      <div className="grid3">
        <div className="card"><h4>Behaviour at {traffic.rps.toLocaleString()} req/s</h4><div>Success rate: <b className={res.successRate >= 0.999 ? 'good' : 'bad'}>{(res.successRate * 100).toFixed(2)}%</b></div><div>Throughput: <b>{Math.round(res.served).toLocaleString()}</b>/s · Dropped: <b>{Math.round(res.dropped).toLocaleString()}</b>/s</div><div>Avg latency of served requests: <b>{res.avgLatency.toFixed(0)} ms</b></div></div>
        <div className="card"><h4>Reliability</h4><div>Design availability: <b>{(res.availability * 100).toFixed(4)}%</b> (≈ {((1 - res.availability) * 525600).toFixed(0)} min downtime/year)</div><div>Bottleneck: <b>{res.bottleneck ? by.get(res.bottleneck)!.label : 'none'}</b></div>{res.neededServers !== null && <div>Servers for 70% utilisation: <b>{res.neededServers}</b></div>}</div>
        <div className="card"><h4>Warnings</h4>{res.warnings.length ? res.warnings.map((w, k) => <div key={k} className="small bad">⚠ {w}</div>) : <span className="good small">none</span>}</div>
      </div>
      <h4>Traffic ramp</h4>
      <div className="controls"><label><input type="checkbox" checked={ramp} onChange={e => setRamp(e.target.checked)} /> Replay a traffic increase (×{RAMP.join(', ×')})</label></div>
      {ramp && <>{ui}<div className="small">Step {i}: traffic ×{i > 0 ? RAMP[i - 1] : 1} → {traffic.rps.toLocaleString()} req/s, success {(res.successRate * 100).toFixed(1)}%{res.bottleneck ? `, first saturated: ${by.get(res.bottleneck)!.label}` : ''}</div></>}
    </div>
  );
}

export function SystemDesignWorld() {
  const [tab, setTab] = useState<'c' | 'd'>('c');
  return (
    <div className="page"><h1>System Design World</h1>
      <div className="stage-bar"><button className={`tab ${tab === 'c' ? 'on' : ''}`} onClick={() => setTab('c')}>Concepts</button><button className={`tab ${tab === 'd' ? 'on' : ''}`} onClick={() => setTab('d')}>Design Lab (URL shortener, chat, video, photos, X, Netflix, food delivery, e-commerce)</button></div>
      {tab === 'c' ? <ConceptCards concepts={SD_CONCEPTS} /> : <Designer />}
    </div>
  );
}
