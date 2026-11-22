import { useMemo, useState } from 'react';
import { OOPS_CONCEPTS } from '../oops/concepts';
import { ConceptCards } from './ConceptCards';
import { useStepper } from './OSWorld';
import { SCENARIOS } from '../oops/scenarios';
import { generateCpp, isVirtualMethod, simulate, vtable } from '../oops/engine';

function Lab() {
  const [id, setId] = useState(SCENARIOS[2].id); const sc = SCENARIOS.find(s => s.id === id)!;
  const [tog, setTog] = useState<Record<string, boolean>>(() => Object.fromEntries(sc.toggles.map(t => [t.id, t.default])));
  const pick = (v: string) => { setId(v); const n = SCENARIOS.find(s => s.id === v)!; setTog(Object.fromEntries(n.toggles.map(t => [t.id, t.default]))); };
  const prog = useMemo(() => sc.build(tog), [id, tog]); // eslint-disable-line
  const code = useMemo(() => generateCpp(prog), [prog]); const sim = useMemo(() => simulate(prog), [prog]);
  const { i, ui } = useStepper(sim.events.length);
  const ev = i > 0 ? sim.events[i - 1] : null; const shown = sim.events.slice(0, i);
  const out = shown.flatMap(e => e.output); const snap = ev?.snap ?? { objects: [], vars: {}, refCounts: {} };
  const line = ev ? code.opLine[ev.opIndex] : 0;
  const objs = snap.objects.filter(o => o.where !== 'member');
  const objView = (o: (typeof objs)[number]) => {
    const vt = vtable(prog.classes, o.cls); const members = snap.objects.filter(m => m.owner === o.id);
    return (
      <div key={o.id} className={`obj ${o.alive ? '' : 'dead'}`}><div className="obj-h"><b>{o.cls}</b> <span className="dim small">#{o.id}{o.partial ? ' · only ~' + o.partial + ' ran' : ''}{!o.alive ? ' · destroyed' : ''}</span></div>
        {Object.entries(o.fields).map(([k, v]) => <div key={k} className="small mono">{k} = {String(v)}</div>)}
        {members.map(m => <div key={m.id} className="small mono dim">└ member #{m.id}: {m.cls}{m.alive ? '' : ' (destroyed)'}</div>)}
        {vt.length > 0 && <div className="vt small"><b>vptr →</b> vtable({o.cls}): {vt.map(v => `${v.method} → ${v.impl}::${v.method.replace('~destructor', '~' + v.impl)}`).join(' · ')}</div>}</div>
    );
  };
  return (
    <div>
      <div className="note small">Executes a model of the program (class definitions + statements) and generates the equivalent C++ from the same model, so the code, the trace and the memory diagram always agree. vtable/vptr layout is an implementation detail of typical compilers; addresses are not shown.</div>
      <div className="controls"><label>Scenario <select value={id} onChange={e => pick(e.target.value)}>{SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        {sc.toggles.map(t => <label key={t.id} title={t.help}><input type="checkbox" checked={!!tog[t.id]} onChange={e => setTog(x => ({ ...x, [t.id]: e.target.checked }))} /> {t.label}</label>)}</div>
      <div className="dim small">{sc.goal}</div>
      <div className="grid2">
        <div><div className="viz-label">Generated C++ (the highlighted line is the statement being executed)</div>
          <pre className="codeview">{code.lines.map((l, k) => <div key={k} className={k + 1 === line ? 'cl cur' : 'cl'}><span className="ln">{k + 1}</span>{l || ' '}</div>)}</pre></div>
        <div>{ui}
          <div className="card">{ev ? <><b>{ev.title}</b>{ev.detail.map((d, k) => <div key={k} className="small">• {d}</div>)}{ev.warnings.map((w, k) => <div key={k} className="small bad">⚠ {w}</div>)}
            {ev.dispatch && <div className={`small ${ev.dispatch.dynamic ? 'good' : 'bad'}`}>{ev.dispatch.dynamic ? 'Dynamic dispatch' : 'Static dispatch'}: static type {ev.dispatch.staticClass} → runs {ev.dispatch.resolvedClass}::{ev.dispatch.method}</div>}</> : 'Press Start or Next to execute the first statement.'}</div>
          <div className="viz-label">Program output (console)</div><pre className="console">{out.join('\n') || ' '}</pre>
          {i >= sim.events.length && sim.events.length > 0 && <div className={`card ${sim.leaks.length ? 'unsafe' : ''}`}>{sim.leaks.length ? `⚠ ${sim.leaks.length} heap object(s) were never fully destroyed (resource leak).` : '✓ Every object was destroyed: no leaks.'}</div>}</div>
      </div>
      <div className="grid2">
        <div><div className="viz-label">Stack variables / pointers</div>
          <table className="sqlt"><thead><tr><th>Name</th><th>Kind</th><th>Static type</th><th>Refers to</th></tr></thead><tbody>{Object.entries(snap.vars).map(([n, v]) => <tr key={n}><td className="mono">{n}</td><td>{{ obj: 'object', ptr: 'raw pointer', shared: 'shared_ptr', unique: 'unique_ptr' }[v.kind]}</td><td>{v.staticType}{v.kind === 'obj' ? '' : '*'}</td><td>{v.obj === null ? <i className="dim">null / moved-from</i> : `#${v.obj}${v.kind === 'shared' ? ` (use_count ${snap.refCounts[v.obj] ?? 1})` : ''}`}</td></tr>)}{Object.keys(snap.vars).length === 0 && <tr><td colSpan={4} className="dim">nothing yet</td></tr>}</tbody></table></div>
        <div><div className="viz-label">Memory: objects</div><div className="objs">{objs.filter(o => o.where === 'stack').length > 0 && <div className="dim small">STACK</div>}{objs.filter(o => o.where === 'stack').map(objView)}{objs.filter(o => o.where === 'heap').length > 0 && <div className="dim small">HEAP</div>}{objs.filter(o => o.where === 'heap').map(objView)}{objs.length === 0 && <span className="dim">no objects yet</span>}</div></div>
      </div>
      <details><summary className="small dim">Class definitions in this scenario</summary>{prog.classes.map(c => <div key={c.name} className="small"><b>{c.name}</b>{c.base ? ` : ${c.base}` : ''} — methods: {c.methods.map(m => `${m.name}${isVirtualMethod(prog.classes, c.name, m.name) ? ' (virtual)' : ''}`).join(', ') || 'none'}</div>)}</details>
    </div>
  );
}

export function OopsWorld() {
  const [tab, setTab] = useState<'c' | 'l'>('c');
  return (
    <div className="page"><h1>OOPS World</h1>
      <div className="stage-bar"><button className={`tab ${tab === 'c' ? 'on' : ''}`} onClick={() => setTab('c')}>Concepts</button><button className={`tab ${tab === 'l' ? 'on' : ''}`} onClick={() => setTab('l')}>Object Lab (Car · Inheritance · Polymorphism · Lifetime · Copy/Move)</button></div>
      {tab === 'c' ? <ConceptCards concepts={OOPS_CONCEPTS} /> : <Lab />}
    </div>
  );
}
