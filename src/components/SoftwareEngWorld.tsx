import { useMemo, useState } from 'react';
import { HowTo, Legend } from './Explain';
import { SE_CONCEPTS } from '../se/concepts';
import { PATTERNS } from '../se/patterns';
import { ConceptCards } from './ConceptCards';
import { useStepper } from './OSWorld';
import { useStore } from '../store';
import { Editor, Kanban, Registry, STAGES, SWITCH_SITES, Strategy, Subject, burndown, decorate, factory, orderStateMachine, pipeline, planSprints, strategyDemo, strategyDesign, supportChain, switchDesign } from '../se/engine';

function Catalogue() {
  const [cat, setCat] = useState<'All' | 'Creational' | 'Structural' | 'Behavioral'>('All'); const [name, setName] = useState(PATTERNS[0].name);
  const list = PATTERNS.filter(p => cat === 'All' || p.category === cat); const p = PATTERNS.find(x => x.name === name) ?? list[0];
  return (
    <div className="sqlw" style={{ minHeight: 0 }}>
      <aside className="sql-side" style={{ position: 'static', maxHeight: 'none' }}>
        <div className="controls">{(['All', 'Creational', 'Structural', 'Behavioral'] as const).map(c => <button key={c} className={`tab ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
        {list.map(x => <button key={x.name} className={`side-item ${x.name === p.name ? 'on' : ''}`} onClick={() => setName(x.name)}>{x.name} <span className="dim small">{x.category[0]}</span></button>)}</aside>
      <section className="sql-main"><h2>{p.name} <span className="pill">{p.category}</span>{p.demo && <span className="pill ok">runnable demo in Pattern Lab</span>}</h2>
        <div className="grid2"><div className="card"><h4>Intent</h4>{p.intent}</div><div className="card"><h4>Problem it solves</h4>{p.problem}</div><div className="card"><h4>Structure</h4>{p.structure}</div><div className="card"><h4>Use it when</h4>{p.useWhen}</div></div>
        <div className="grid2"><div><h4>Advantages</h4><ul>{p.pros.map(x => <li key={x}>{x}</li>)}</ul></div><div><h4>Disadvantages</h4><ul>{p.cons.map(x => <li key={x}>{x}</li>)}</ul></div></div>
        <h4>C++17 reference code</h4><pre className="codeview" style={{ maxHeight: 'none' }}>{p.code.split('\n').map((l, k) => <div key={k} className="cl"><span className="ln">{k + 1}</span>{l || ' '}</div>)}</pre>
        <div className="dim small">Reference snippets for study (headers omitted). They have not been compiled by this app; the runnable demos use equivalent logic written in TypeScript.</div></section>
    </div>
  );
}

const Log = ({ lines }: { lines: string[] }) => <pre className="console">{lines.join('\n') || ' '}</pre>;
function Lab() {
  const [demo, setDemo] = useState('strategy'); const [amount, setAmount] = useState(100); const [method, setMethod] = useState('card');
  const [subj] = useState(() => new Subject()); const [obsLog, setObsLog] = useState<string[]>([]); const [subs, setSubs] = useState<string[]>([]);
  const [ed] = useState(() => new Editor()); const [edLog, setEdLog] = useState<string[]>([]); const [txt, setTxt] = useState('');
  const [events, setEvents] = useState('Paid, Shipped, Delivered'); const [tops, setTops] = useState<string[]>(['milk', 'sugar']); const [sev, setSev] = useState(2); const [kind, setKind] = useState('circle'); const [size, setSize] = useState(2); const [single, setSingle] = useState<string[]>([]);
  const names = ['Mobile app', 'Email', 'Dashboard'];
  const sync = () => setObsLog([...subj.log]);
  let body: JSX.Element;
  if (demo === 'strategy') { let r: ReturnType<typeof strategyDemo> | null = null, err = ''; try { r = strategyDemo(amount, method); } catch (e: any) { err = e.message; } body = <div><div className="controls"><input type="number" value={amount} onChange={e => setAmount(+e.target.value || 0)} style={{ width: 90 }} /><select value={method} onChange={e => setMethod(e.target.value)}>{['card', 'paypal', 'upi', 'crypto'].map(m => <option key={m}>{m}</option>)}</select></div>{err ? <div className="err compile">{err}</div> : <Log lines={r!.log} />}</div>; }
  else if (demo === 'observer') body = <div><div className="controls">{names.map(n => <button key={n} onClick={() => { subs.includes(n) ? (subj.unsubscribe(n), setSubs(subs.filter(x => x !== n))) : (subj.subscribe(n, e => `${n} reacts to "${e}"`), setSubs([...subs, n])); sync(); }}>{subs.includes(n) ? 'Unsubscribe' : 'Subscribe'} {n}</button>)}<button className="primary" onClick={() => { subj.notify('price changed'); sync(); }}>Publish event</button><button onClick={() => { subj.log = []; sync(); }}>Clear log</button></div><Log lines={obsLog} /></div>;
  else if (demo === 'command') body = <div><div className="controls"><input value={txt} onChange={e => setTxt(e.target.value)} placeholder="text" style={{ width: 120 }} /><button onClick={() => { if (txt) { ed.insert(txt); setTxt(''); setEdLog([...ed.log]); } }}>Insert</button><button onClick={() => { ed.del(1); setEdLog([...ed.log]); }}>Delete 1 char</button><button onClick={() => { ed.doUndo(); setEdLog([...ed.log]); }}>↶ Undo</button><button onClick={() => { ed.doRedo(); setEdLog([...ed.log]); }}>↷ Redo</button></div><div className="card">Document: <b className="mono">"{ed.text}"</b> · undo stack {ed.undo.length} · redo stack {ed.redoStack.length}</div><Log lines={edLog} /></div>;
  else if (demo === 'state') { const r = orderStateMachine(events.split(/[ ,]+/).filter(Boolean)); body = <div><div className="controls"><input value={events} onChange={e => setEvents(e.target.value)} style={{ width: 320 }} /><span className="dim small">events: Paid, Shipped, Delivered, Cancelled</span></div><div className="card">Final state: <b>{r.state}</b></div><Log lines={r.log} /></div>; }
  else if (demo === 'decorator') { let r: ReturnType<typeof decorate> | null = null, err = ''; try { r = decorate('espresso', tops); } catch (e: any) { err = e.message; } body = <div><div className="controls">{['milk', 'sugar', 'whip', 'caramel'].map(t => <label key={t}><input type="checkbox" checked={tops.includes(t)} onChange={e => setTops(e.target.checked ? [...tops, t] : tops.filter(x => x !== t))} /> {t}</label>)}</div>{err ? <div className="err compile">{err}</div> : <><div className="card"><b>{r!.description}</b> — ${r!.cost.toFixed(2)}</div><Log lines={r!.log} /></>}</div>; }
  else if (demo === 'chain') { const r = supportChain(sev); body = <div><div className="controls"><label>Severity <input type="range" min={0} max={8} value={sev} onChange={e => setSev(+e.target.value)} /> {sev}</label></div><div className="card">Handled by: <b>{r.handledBy ?? 'nobody (unhandled)'}</b></div><Log lines={r.trail} /></div>; }
  else if (demo === 'factory') { let r: ReturnType<typeof factory> | null = null, err = ''; try { r = factory(kind, size); } catch (e: any) { err = e.message; } body = <div><div className="controls"><select value={kind} onChange={e => setKind(e.target.value)}>{['circle', 'square', 'triangle', 'hexagon'].map(k => <option key={k}>{k}</option>)}</select><input type="number" value={size} onChange={e => setSize(+e.target.value || 0)} style={{ width: 70 }} /></div>{err ? <div className="err compile">{err}</div> : <div className="card">Factory created a <b>{r!.name}</b> with area <b>{r!.area}</b>. The caller only knew the string "{kind}", not the concrete class.</div>}</div>; }
  else body = <div><div className="controls"><button className="primary" onClick={() => { const a = Registry.get(); setSingle(s => [...s, `getInstance() call #${s.length + 1}: same object? ${a === Registry.get()} · constructors run so far: ${Registry.created}`]); }}>getInstance()</button><button onClick={() => { Registry.reset(); setSingle([]); }}>Reset</button></div><Log lines={single} /></div>;
  return (
    <div>
      <div className="controls">{[['strategy', 'Strategy'], ['observer', 'Observer'], ['command', 'Command (undo/redo)'], ['state', 'State'], ['decorator', 'Decorator'], ['chain', 'Chain of Responsibility'], ['factory', 'Factory'], ['singleton', 'Singleton']].map(([k, n]) => <button key={k} className={`tab ${demo === k ? 'on' : ''}`} onClick={() => setDemo(k)}>{n}</button>)}</div>
      <div className="note small">These demos execute real TypeScript implementations of each pattern and show the runtime behaviour step by step. See the Catalogue tab for the C++ structure.</div>{body}
    </div>
  );
}

function StrategyGame() {
  const store = useStore(); const [m, setM] = useState('upi'); const [edited, setEdited] = useState<string[]>([]); const [impl, setImpl] = useState<string[]>([]); const [msg, setMsg] = useState('');
  const bad = useMemo(() => switchDesign(m, edited), [m, edited]); const good = useMemo(() => strategyDesign(m, impl), [m, impl]);
  const ops = ['charge()', 'refund()', 'describe()'];
  const check = () => { const ok = bad.works.every(w => w.ok) && good.works.every(w => w.ok); if (ok) { store.recordAttempt('se:strategy'); setMsg(store.markSolved('se:strategy', 40, 0, 'Strategy pattern') ? 'Both designs now support the new method. +40 XP' : 'Both designs work.'); } else setMsg('Something is still broken: see the red rows below.'); };
  return (
    <div>
      <div className="note small"><b>Mission:</b> an e-commerce app supports card and PayPal. Add a new payment method. In the poorly designed code every operation has its own <code>switch (method)</code>; in the Strategy design there is a <code>PaymentStrategy</code> interface. Do the work in each design and watch what the language and run time tell you.</div>
      <div className="controls"><label>New method <select value={m} onChange={e => { setM(e.target.value); setEdited([]); setImpl([]); setMsg(''); }}>{['upi', 'crypto'].map(x => <option key={x}>{x}</option>)}</select></label></div>
      <div className="grid2">
        <div className="card"><h4>❌ Switch-based design (3 places to edit)</h4><pre className="codeview" style={{ maxHeight: 'none' }}>{`double charge(Method m, double a) {
    switch (m) {
        case CARD:   return a * 1.02;
        case PAYPAL: return a * 1.03 + 0.3;
        default: throw std::runtime_error("unsupported");
    }
}
// refund() and describe() contain the same switch…`}</pre>
          <div className="small dim">Tick the files you edited:</div>{SWITCH_SITES.map(s => <label key={s} className="row small"><span>{s}</span><input type="checkbox" checked={edited.includes(s)} onChange={e => setEdited(e.target.checked ? [...edited, s] : edited.filter(x => x !== s))} /></label>)}
          {bad.works.map((w, k) => <div key={k} className={`small ${w.ok ? 'good' : 'bad'}`}>{w.ok ? '✓' : '✗'} {w.op}: {w.why}</div>)}<div className="small dim">Compiler help: {bad.compilerHelp}</div></div>
        <div className="card"><h4>✅ Strategy design (1 new file)</h4><pre className="codeview" style={{ maxHeight: 'none' }}>{`class ${m[0].toUpperCase() + m.slice(1)}Payment : public PaymentStrategy {
    // implement every function of the interface
};
// Checkout, Refund and Receipt are NOT modified.`}</pre>
          <div className="small dim">Implement the interface functions:</div>{ops.map(o => <label key={o} className="row small"><span>{o}</span><input type="checkbox" checked={impl.includes(o)} onChange={e => setImpl(e.target.checked ? [...impl, o] : impl.filter(x => x !== o))} /></label>)}
          {good.works.map((w, k) => <div key={k} className={`small ${w.ok ? 'good' : 'bad'}`}>{w.ok ? '✓' : '✗'} {w.op}: {w.why}</div>)}<div className="small dim">Files to touch: {good.filesToTouch.join(', ')}. {good.compilerHelp}</div></div>
      </div>
      <div className="controls"><button className="primary" onClick={check}>Check both designs</button>{msg && <span className={msg.includes('still') ? 'bad' : 'good'}>{msg}</span>}</div>
      <div className="dim small">Lesson: the Strategy design turns "remember to edit three files" (a run-time failure risk) into "implement one interface" (a compile-time guarantee), which is the Open/Closed Principle.</div>
    </div>
  );
}

function Process() {
  const [k, setK] = useState(() => new Kanban(8)); const [, force] = useState(0); const [kmsg, setKmsg] = useState('');
  const refresh = () => force(x => x + 1); const met = k.metrics();
  const [vel, setVel] = useState(10); const stories = [['Login', 5, 1], ['Search', 3, 2], ['Checkout', 8, 3], ['Profile', 2, 4], ['Reports', 13, 5], ['Notifications', 5, 6]] as const;
  const plan = useMemo(() => { try { return planSprints(stories.map(([title, points, priority]) => ({ title, points, priority })), vel); } catch { return null; } }, [vel]); // eslint-disable-line
  const [done, setDone] = useState('2,3,1,4,2,3,4,3,2,4'); const perDay = done.split(/[ ,]+/).map(Number).filter(n => !Number.isNaN(n)); const bd = burndown(24, 10, perDay);
  const [fail, setFail] = useState<number | null>(null); const [strat, setStrat] = useState<Strategy>('canary'); const [err, setErr] = useState(0.2);
  const pl = useMemo(() => pipeline({ failAt: fail, strategy: strat, canaryErrorRate: err }), [fail, strat, err]); const { i, ui } = useStepper(pl.log.length);
  return (
    <div>
      <h3>Kanban board (WIP limits: In Progress 2, Review 2)</h3>
      <HowTo>Work moves left to right across the board. The number beside a column name is how many cards it holds; “/N” is its work-in-progress limit, so a column at its limit cannot take another card until one moves on.</HowTo>
      <div className="kanban">{k.cols.map((c, ci) => <div key={c} className="kcol"><b>{c}</b> <span className="dim small">{k.count(ci)}{k.wip[ci] !== null ? `/${k.wip[ci]}` : ''}</span>
        {k.cards.filter(x => x.col === ci).map(card => <div key={card.id} className="kcard">{card.title}{ci < 3 && <button onClick={() => { const r = k.move(card.id, ci + 1); setKmsg(r.ok ? '' : r.reason ?? ''); refresh(); }}>→</button>}</div>)}</div>)}</div>
      <div className="controls"><button onClick={() => { k.nextDay(); refresh(); }}>Next day (day {k.day})</button><button onClick={() => { setK(new Kanban(8)); setKmsg(''); }}>Reset</button>{kmsg && <span className="bad">{kmsg}</span>}</div>
      <div className="small">Done: <b>{met.done}</b> · throughput {met.throughput.toFixed(2)}/day · avg lead time {met.avgLeadTime.toFixed(1)} days · in progress {met.inProgress}</div>
      <h3>Scrum: sprint planning and burndown</h3>
      <div className="controls"><label>Team velocity <input type="number" min={1} value={vel} onChange={e => setVel(Math.max(1, +e.target.value || 1))} style={{ width: 70 }} /> points/sprint</label></div>
      {plan && <div className="small">{plan.sprints.map((s, n) => <div key={n}><b>Sprint {n + 1}</b> ({s.points}/{vel} pts): {s.items.map(x => `${x.title} (${x.points})`).join(', ')}</div>)}{plan.tooBig.length > 0 && <div className="bad">Too big for one sprint — split these stories: {plan.tooBig.map(x => `${x.title} (${x.points})`).join(', ')}</div>}</div>}
      <div className="controls"><label>Points done per day <input value={done} onChange={e => setDone(e.target.value)} style={{ width: 240 }} /></label></div>
      <svg width={420} height={150} className="chart">{[bd.ideal, bd.actual].map((s, j) => <polyline key={j} fill="none" stroke={j ? '#f87171' : '#8b93a0'} strokeDasharray={j ? '' : '4 3'} strokeWidth={2} points={s.map((v, d) => `${30 + d * 36},${130 - (v / 24) * 110}`).join(' ')} />)}</svg>
      <div className="small"><span className="dim">dashed = ideal</span> · <span className="bad">red = actual</span> · {bd.onTrack ? <b className="good">on track</b> : <b className="bad">behind the ideal line: remaining {bd.actual[bd.actual.length - 1]} points</b>}</div>
      <h3>CI/CD pipeline</h3>
      <div className="controls"><label>Fail at <select value={fail ?? ''} onChange={e => setFail(e.target.value === '' ? null : +e.target.value)}><option value="">(no failure)</option>{STAGES.map((s, n) => <option key={s} value={n}>{s}</option>)}</select></label>
        <label>Strategy <select value={strat} onChange={e => setStrat(e.target.value as Strategy)}><option value="rolling">rolling</option><option value="blue-green">blue-green</option><option value="canary">canary</option></select></label>
        <label>Error rate of v2 <input type="range" min={0} max={0.3} step={0.01} value={err} onChange={e => setErr(+e.target.value)} /> {(err * 100).toFixed(0)}% (rollback above 2%)</label></div>
      <div className="steps-row">{pl.stages.map(s => <span key={s.name} className={`pill ${s.status === 'passed' ? 'ok' : ''}`}>{s.status === 'passed' ? '✓' : s.status === 'failed' ? '✗' : '–'} {s.name}</span>)}</div>
      {ui}<Log lines={pl.log.slice(0, i)} /><div className={`card ${pl.deployed ? '' : 'unsafe'}`}>Production now runs <b>{pl.prod}</b>{pl.deployed ? ' — the new version was released.' : ' — the release was stopped or rolled back.'}</div>
    </div>
  );
}

export function SoftwareEngWorld() {
  const [tab, setTab] = useState<'c' | 'p' | 'l' | 's' | 'x'>('c');
  const tabs = [['c', 'Concepts'], ['p', 'Pattern Catalogue (18)'], ['l', 'Pattern Lab'], ['s', 'Strategy Design Game'], ['x', 'Process Lab (Kanban · Scrum · CI/CD)']] as const;
  return (
    <div className="page"><h1>Software Engineering World</h1>
      <div className="stage-bar">{tabs.map(([k, n]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{n}</button>)}</div>
      {tab === 'c' && <ConceptCards concepts={SE_CONCEPTS} />}{tab === 'p' && <Catalogue />}{tab === 'l' && <Lab />}{tab === 's' && <StrategyGame />}{tab === 'x' && <Process />}
    </div>
  );
}
