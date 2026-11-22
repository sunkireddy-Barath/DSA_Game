import { useMemo, useState } from 'react';
import { DBMS_CONCEPTS } from '../dbms/concepts';
import { BNode, BPlusTree, FD, Row, TX_OPS, TxMode, analyze, analyzeSchedule, bcnfDecompose, fd, fmtFD, isLossless, naturalJoin, parseSchedule, preservesDependencies, project, projectFDs, redundancy, runTransfer, sameRelation, violatesFD } from '../dbms/engines';
import { Deadlock, useStepper } from './OSWorld';

/* ------------------------------------------------------------ concept cards */
function Concepts() {
  const [id, setId] = useState(DBMS_CONCEPTS[0].id);
  const c = DBMS_CONCEPTS.find(x => x.id === id)!;
  return (
    <div className="sqlw" style={{ minHeight: 0 }}>
      <aside className="sql-side" style={{ position: 'static', maxHeight: 'none' }}>{DBMS_CONCEPTS.map(x => <button key={x.id} className={`side-item ${x.id === id ? 'on' : ''}`} onClick={() => setId(x.id)}>{x.module}</button>)}</aside>
      <section className="sql-main"><h2>{c.module}</h2>
        <div className="grid2"><div className="card"><h4>In simple words</h4><p>{c.simple}</p></div><div className="card"><h4>Technical definition</h4><p>{c.technical}</p></div>
          <div className="card"><h4>Real-world analogy</h4><p>{c.analogy}</p></div><div className="card"><h4>Real-world use</h4><p>{c.realWorld}</p></div></div>
        <h4>Key terminology</h4><div className="kwlist">{c.keywords.map(([a, b]) => <div key={a}><b>{a}</b> — {b}</div>)}</div>
        <div className="grid2"><div><h4>Advantages</h4><ul>{c.pros.map(x => <li key={x}>{x}</li>)}</ul></div><div><h4>Disadvantages</h4><ul>{c.cons.map(x => <li key={x}>{x}</li>)}</ul></div>
          <div><h4>Common mistakes</h4><ul>{c.mistakes.map(x => <li key={x}>{x}</li>)}</ul></div><div><h4>Interview questions</h4><ul>{c.interview.map(x => <li key={x}>{x}</li>)}</ul></div></div>
        <div className="dim small">Related: {c.related.join(' · ')}. Try the simulators in the other tabs.</div></section>
    </div>
  );
}

/* ------------------------------------------------------------ normalization lab */
const ATTRS = ['StudentID', 'Name', 'Dept', 'DeptHead'];
const START: Row[] = [{ StudentID: '101', Name: 'Arun', Dept: 'CSE', DeptHead: 'Ravi' }, { StudentID: '102', Name: 'Bala', Dept: 'CSE', DeptHead: 'Ravi' }, { StudentID: '103', Name: 'Charan', Dept: 'ECE', DeptHead: 'Kumar' }];
const parseFDs = (t: string): FD[] => t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [a, b] = l.split(/->|→/); if (!b) throw new Error(`Write dependencies like  StudentID -> Name, Dept  (got "${l}")`); return fd(a.replace(/,/g, ' '), b.replace(/,/g, ' ')); });

function Normalization() {
  const [rows, setRows] = useState<Row[]>(START);
  const [fdText, setFdText] = useState('StudentID -> Name, Dept\nDept -> DeptHead');
  const [partsText, setPartsText] = useState('StudentID Name Dept | Dept DeptHead');
  const [msg, setMsg] = useState<string | null>(null);
  let fds: FD[] = [], fdErr: string | null = null;
  try { fds = parseFDs(fdText); fds.forEach(f => [...f.lhs, ...f.rhs].forEach(a => { if (!ATTRS.includes(a)) throw new Error(`Unknown attribute "${a}". Attributes: ${ATTRS.join(', ')}`); })); } catch (e: any) { fdErr = e.message; }
  const report = useMemo(() => (fdErr ? null : analyze(ATTRS, fds)), [fdText]); // eslint-disable-line
  const parts = partsText.split('|').map(p => p.trim().split(/[ ,]+/).filter(Boolean));
  const partsErr = parts.some(p => p.length === 0 || p.some(a => !ATTRS.includes(a))) ? 'Each part must list known attributes separated by spaces; separate parts with |.' : null;
  const cov = ATTRS.every(a => parts.some(p => p.includes(a)));
  const dec = useMemo(() => {
    if (fdErr || partsErr || !cov) return null;
    const lossless = isLossless(ATTRS, parts, fds), dp = preservesDependencies(parts, fds);
    const proj = parts.map(p => project(rows, p));
    const joined = proj.reduce((a, b) => naturalJoin(a, b));
    return { lossless, dp, perPart: parts.map(p => analyze(p, projectFDs(p, fds))), dataOK: sameRelation(joined, rows), joinedCount: joined.length, proj };
  }, [partsText, fdText, rows]); // eslint-disable-line
  const edit = (r: number, a: string, v: string) => setRows(x => x.map((row, i) => (i === r ? { ...row, [a]: v } : row)));
  const viol = fdErr ? [] : fds.flatMap(f => violatesFD(rows, f).map(v => ({ f, ...v })));
  return (
    <div>
      <div className="note small">Edit the table and the dependencies. All analysis (closure, keys, normal forms, chase test for lossless join, dependency preservation) is computed by tested algorithms. Dependencies are <b>design assumptions you declare</b>: they cannot be proven from sample rows.</div>
      <div className="grid2">
        <div><div className="viz-label">Relation Student(StudentID, Name, Dept, DeptHead)</div>
          <table className="sqlt"><thead><tr>{ATTRS.map(a => <th key={a}>{a}</th>)}<th /></tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{ATTRS.map(a => <td key={a}><input value={r[a]} onChange={e => edit(i, a, e.target.value)} style={{ width: 90 }} className={viol.some(v => v.f.rhs.includes(a) && r[v.f.lhs[0]] === v.x) ? 'bad-cell' : ''} /></td>)}<td><button onClick={() => setRows(x => x.filter((_, k) => k !== i))}>✕</button></td></tr>)}</tbody></table>
          <div className="controls"><button onClick={() => setRows(x => [...x, { StudentID: String(100 + x.length + 1), Name: 'New', Dept: 'CSE', DeptHead: 'Ravi' }])}>+ Row</button><button onClick={() => setRows(START)}>↺ Reset</button></div></div>
        <div><div className="viz-label">Functional dependencies (one per line)</div><textarea value={fdText} onChange={e => setFdText(e.target.value)} rows={4} style={{ width: '100%', fontFamily: 'ui-monospace,monospace', background: 'var(--panel2)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 8 }} />
          {fdErr && <div className="err compile">{fdErr}</div>}</div>
      </div>
      <h4>Anomalies in this table</h4>
      <div className="grid3">
        <div className="card"><b>Redundancy</b>{fdErr ? null : fds.map(f => <div key={fmtFD(f)} className="small">{fmtFD(f)}: <b>{redundancy(rows, f)}</b> repeated fact(s)</div>)}</div>
        <div className="card"><b>Update anomaly</b><div className="small">{viol.length ? <span className="bad">Inconsistent! {viol.map(v => `${v.f.lhs.join(',')}=${v.x} has ${v.ys.length} different ${v.f.rhs.join(',')} values (${v.ys.join(' / ')})`).join('; ')}</span> : 'Currently consistent. Try changing one row\'s DeptHead for CSE: you must edit every CSE row or the data contradicts itself.'}</div>
          <button onClick={() => setRows(x => x.map((r, i) => (i === 0 ? { ...r, DeptHead: 'Mohan' } : r)))}>Change only row 1's head</button></div>
        <div className="card"><b>Insertion / deletion anomaly</b><div className="small">Insertion: a new department (e.g. MECH, head Latha) cannot be stored until a student exists, because StudentID is part of the key and cannot be NULL. Deletion: removing Charan also erases the fact "ECE's head is Kumar".</div>
          <button onClick={() => setRows(x => x.filter(r => r.Name !== 'Charan'))}>Delete Charan</button>{!rows.some(r => r.Dept === 'ECE') && <div className="bad small">Fact lost: ECE → Kumar no longer exists anywhere.</div>}</div>
      </div>
      {report && (<><h4>Normal form analysis</h4>
        <div className="card"><div>Candidate key(s): <b>{report.keys.map(k => `{${k.join(', ')}}`).join('  ')}</b> · Prime attributes: <b>{report.prime.join(', ')}</b></div>
          <div className="nfrow">{(['1NF', '2NF', '3NF', 'BCNF'] as const).map(n => { const ok = n === '1NF' || (n === '2NF' ? report.nf2 : n === '3NF' ? report.nf3 : report.bcnf); return <span key={n} className={`pill ${ok ? 'ok' : ''}`}>{ok ? '✓' : '✗'} {n}</span>; })} <b>Highest: {report.highest}</b></div>
          {report.violations.map((v, i) => <div key={i} className="small bad">{v.form} violated by {v.fd}: {v.why}</div>)}
          <div className="dim small">1NF is assumed (all values atomic). 4NF/5NF concern multivalued/join dependencies and are not analysed here.</div></div></>)}
      <h4>Decompose it</h4>
      <div className="controls"><input value={partsText} onChange={e => setPartsText(e.target.value)} style={{ width: 380 }} />
        <button onClick={() => { if (!fdErr) setPartsText(bcnfDecompose(ATTRS, fds).map(p => p.join(' ')).join(' | ')); }}>Auto: BCNF decomposition</button>
        <button onClick={() => setPartsText('StudentID Name | Dept DeptHead')}>Try a lossy split</button></div>
      {partsErr && <div className="err compile">{partsErr}</div>}
      {!partsErr && !cov && <div className="err compile">Every attribute must appear in at least one part.</div>}
      {dec && <div className="grid2"><div className="card">
        <div className={dec.lossless ? 'good' : 'bad'}>{dec.lossless ? '✓ Lossless join (chase test)' : '✗ Lossy decomposition (chase test)'}</div>
        <div className={dec.dp.preserved ? 'good' : 'bad'}>{dec.dp.preserved ? '✓ Dependencies preserved' : `✗ Lost dependencies: ${dec.dp.lost.map(fmtFD).join('; ')}`}</div>
        <div className={dec.dataOK ? 'good' : 'bad'}>{dec.dataOK ? '✓ Joining the parts reproduces exactly the original rows' : `✗ Joining the parts gives ${dec.joinedCount} rows that do not match the original (spurious tuples)`}</div>
        {parts.map((p, i) => <div key={i} className="small">R{i + 1}({p.join(', ')}): highest <b>{dec.perPart[i].highest}</b>, key {dec.perPart[i].keys.map(k => `{${k.join(',')}}`).join(' ')}</div>)}</div>
        <div>{dec.proj.map((t, i) => <div key={i}><div className="viz-label">R{i + 1}({parts[i].join(', ')})</div><table className="sqlt"><thead><tr>{parts[i].map(a => <th key={a}>{a}</th>)}</tr></thead><tbody>{t.map((r, k) => <tr key={k}>{parts[i].map(a => <td key={a}>{r[a]}</td>)}</tr>)}</tbody></table></div>)}</div></div>}
    </div>
  );
}

/* ------------------------------------------------------------ transactions */
function Transactions() {
  const [amount, setAmount] = useState(2000); const [mode, setMode] = useState<TxMode>('wal'); const [crash, setCrash] = useState<string>('none'); const [flush, setFlush] = useState(true);
  const crashAt = crash === 'none' ? null : +crash;
  const run = useMemo(() => runTransfer({ amount, crashAt, mode, flushOnCommit: flush }), [amount, crashAt, mode, flush]);
  const { i, ui } = useStepper(run.steps.length - 1);
  const s = run.steps[Math.min(i, run.steps.length - 1)]; const end = i >= run.steps.length - 1;
  const crashed = run.steps[run.steps.length - 1].label.includes('CRASH');
  return (
    <div>
      <div className="note small">Simplified model of write-ahead logging with an undo/redo log (A = ₹10,000, B = ₹5,000). Real systems add checkpoints, page LSNs, group commit and much more.</div>
      <div className="controls"><label>Amount ₹<input type="number" min={0} max={10000} value={amount} onChange={e => setAmount(Math.max(0, Math.min(10000, +e.target.value || 0)))} style={{ width: 80 }} /></label>
        <label>System <select value={mode} onChange={e => setMode(e.target.value as TxMode)}><option value="wal">DBMS transaction (WAL + recovery)</option><option value="no-transactions">No transactions (direct file writes)</option></select></label>
        <label>Inject failure <select value={crash} onChange={e => setCrash(e.target.value)}><option value="none">none</option>{TX_OPS.map((o, k) => <option key={o} value={k}>crash during: {o}</option>)}<option value={TX_OPS.length}>crash right after COMMIT</option></select></label>
        {mode === 'wal' && <label><input type="checkbox" checked={flush} onChange={e => setFlush(e.target.checked)} /> flush pages at commit</label>}</div>
      <div className="steps-row">{run.steps.map((st, k) => <span key={k} className={`pill ${k === i ? 'ok' : ''}`}>{k}. {st.label}</span>)}</div>
      {ui}
      <div className="grid3">
        <div className="card"><h4>Memory (buffer pool)</h4>A = ₹{s.state.buffer.A} · B = ₹{s.state.buffer.B}</div>
        <div className="card"><h4>Disk (durable)</h4>A = ₹{s.state.disk.A} · B = ₹{s.state.disk.B}</div>
        <div className="card"><h4>Log (durable)</h4>{s.state.log.length ? s.state.log.map((l, k) => <div key={k} className="small mono">{l}</div>) : <span className="dim">{mode === 'wal' ? 'empty' : 'no log in this mode'}</span>}</div>
      </div>
      <div className="card">{s.state.note}</div>
      {end && <div className={`card ${run.consistent ? '' : 'unsafe'}`}><h4>{crashed ? 'After restart / recovery' : 'Final state'}</h4>
        <div>Disk: A = ₹{run.recovered.disk.A}, B = ₹{run.recovered.disk.B} → total ₹{run.recovered.disk.A + run.recovered.disk.B} (expected ₹{run.total})</div>
        {crashed && <div>{run.recovered.note}</div>}
        <div className={run.consistent ? 'good' : 'bad'}>{run.consistent ? '✓ Consistent: money is neither created nor destroyed.' : '✗ INCONSISTENT: the invariant A + B was broken (no atomicity).'}</div>
        {run.recovered.status !== 'idle' && <div>Transaction outcome: <b>{run.recovered.status}</b></div>}</div>}
      <details><summary className="small dim">What each ACID property shows here</summary><ul className="small"><li><b>Atomicity</b>: crash during WRITE A/B with WAL → rolled back; without transactions money is lost.</li><li><b>Consistency</b>: A + B must stay ₹15,000.</li><li><b>Isolation</b>: see the Schedules tab.</li><li><b>Durability</b>: untick "flush pages at commit" and crash right after COMMIT: the log lets recovery REDO the transfer.</li></ul></details>
    </div>
  );
}

/* ------------------------------------------------------------ schedules */
const SAMPLES = ['R1(A) W1(A) R2(A) W2(A) C1 C2', 'R1(A) W2(A) W1(A) C1 C2', 'W1(A) R2(A) C1 C2', 'W1(A) R2(A) C2 C1', 'R1(A) R2(A) W1(A) W2(A) C1 C2'];
function Schedules() {
  const [text, setText] = useState(SAMPLES[1]);
  let res: ReturnType<typeof analyzeSchedule> | null = null, err: string | null = null;
  try { res = analyzeSchedule(parseSchedule(text)); } catch (e: any) { err = e.message; }
  const pos = (t: number, ts: number[]) => { const k = ts.indexOf(t); return { x: 110 + 70 * Math.cos((2 * Math.PI * k) / ts.length - Math.PI / 2), y: 90 + 55 * Math.sin((2 * Math.PI * k) / ts.length - Math.PI / 2) }; };
  return (
    <div>
      <div className="controls"><input value={text} onChange={e => setText(e.target.value)} style={{ width: 420, fontFamily: 'ui-monospace,monospace' }} />{SAMPLES.map((s, i) => <button key={i} onClick={() => setText(s)}>example {i + 1}</button>)}</div>
      <div className="dim small">Syntax: R1(A) = transaction 1 reads A, W2(B) = transaction 2 writes B, C1 = transaction 1 commits.</div>
      {err && <div className="err compile">{err}</div>}
      {res && (<div className="grid2">
        <div><div className="viz-label">Precedence (conflict) graph</div>
          <svg width={220} height={180} className="chart"><defs><marker id="sah" markerWidth="8" markerHeight="8" refX="17" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#f87171" /></marker></defs>
            {res.edges.map((e, k) => { const a = pos(e.from, res!.txs), b = pos(e.to, res!.txs); const hot = res!.cycle?.includes(e.from) && res!.cycle?.includes(e.to); return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot ? '#f87171' : '#8b93a0'} strokeWidth={hot ? 3 : 1.5} markerEnd="url(#sah)" />; })}
            {res.txs.map(t => { const p = pos(t, res!.txs); return <g key={t} transform={`translate(${p.x},${p.y})`}><circle r={16} className="tn" /><text y={4} textAnchor="middle" className="tl">T{t}</text></g>; })}</svg>
          {res.edges.map((e, k) => <div key={k} className="small dim">T{e.from} → T{e.to}: {e.why}</div>)}</div>
        <div className="card">
          <div className={res.serializable ? 'good' : 'bad'}>{res.serializable ? `✓ Conflict-serializable — equivalent serial order: ${res.serialOrder!.map(t => 'T' + t).join(' → ')}` : `✗ NOT conflict-serializable — cycle ${res.cycle!.map(t => 'T' + t).join(' → ')} → T${res.cycle![0]}`}</div>
          <div className={res.recoverable ? 'good' : 'bad'}>{res.recoverable ? '✓ Recoverable' : '✗ Not recoverable'}</div>
          <div className={res.cascadeless ? 'good' : 'bad'}>{res.cascadeless ? '✓ Avoids cascading rollback' : '✗ Can cause cascading rollback'}</div>
          {res.notes.map((n, k) => <div key={k} className="small dim">{n}</div>)}
          <div className="dim small">Checks conflict serializability only (view serializability is a weaker, NP-complete test and is not computed).</div></div></div>)}
    </div>
  );
}

/* ------------------------------------------------------------ B+ tree */
function layoutTree(root: BNode) {
  const pos = new Map<number, { x: number; y: number; w: number }>(); let leafX = 0; const NW = (n: BNode) => Math.max(1, n.keys.length) * 26 + 12;
  const go = (n: BNode, d: number): number => {
    if (n.leaf) { const x = leafX + NW(n) / 2; leafX += NW(n) + 18; pos.set(n.id, { x, y: d * 70 + 20, w: NW(n) }); return x; }
    const xs = n.children.map(c => go(c, d + 1)); const x = (xs[0] + xs[xs.length - 1]) / 2; pos.set(n.id, { x, y: d * 70 + 20, w: NW(n) }); return x;
  };
  go(root, 0); return { pos, width: leafX + 20 };
}
function BTree() {
  const [m, setM] = useState(3); const [ops, setOps] = useState<{ k: 'ins' | 'del' | 'find'; key: number }[]>([]); const [val, setVal] = useState('');
  const { tree, events, path } = useMemo(() => { const t = new BPlusTree(m); let ev: string[] = []; let p: BNode[] = []; ops.forEach(o => { if (o.k === 'ins') { ev = t.insert(o.key); p = []; } else if (o.k === 'del') { ev = t.delete(o.key); p = []; } else { const r = t.search(o.key); p = r.path; ev = [`Search ${o.key}: ${r.found ? 'found' : 'not found'}. Path: ${r.path.map(n => `[${n.keys.join(',')}]`).join(' → ')} (${r.path.length} node(s) read — the cost of a lookup is the tree height).`]; } }); return { tree: t, events: ev, path: new Set(p.map(n => n.id)) }; }, [ops, m]);
  const { pos, width } = useMemo(() => layoutTree(tree.root), [tree, ops, m]);
  const nodes: BNode[] = []; const walk = (n: BNode) => { nodes.push(n); n.children.forEach(walk); }; walk(tree.root);
  const h = tree.height();
  const submit = (k: 'ins' | 'del' | 'find') => { const key = parseInt(val, 10); if (Number.isNaN(key)) return; setOps(o => [...o, { k, key }]); setVal(''); };
  return (
    <div>
      <div className="note small">A B+ tree stores all keys in linked leaves; internal nodes only route. Each node holds at most <b>{m}</b> keys. Splits, borrowing (redistribution) and merging are executed by the tested implementation below (fuzz-tested for invariants).</div>
      <div className="controls"><label>Max keys per node <select value={m} onChange={e => { setM(+e.target.value); setOps([]); }}>{[3, 4, 5, 6].map(x => <option key={x}>{x}</option>)}</select></label>
        <input placeholder="key" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit('ins')} style={{ width: 80 }} />
        <button className="primary" onClick={() => submit('ins')}>Insert</button><button onClick={() => submit('del')}>Delete</button><button onClick={() => submit('find')}>Search</button>
        <button onClick={() => setOps(o => [...o, ...[50, 20, 70, 10, 30, 60, 80, 25, 35, 65].map(k => ({ k: 'ins' as const, key: k }))])}>Insert sample keys</button>
        <button onClick={() => setOps(o => o.slice(0, -1))} disabled={!ops.length}>◀ Undo</button><button onClick={() => setOps([])}>⏮ Reset</button></div>
      <div className="tree-scroll"><svg width={Math.max(width, 300)} height={h * 70 + 30}>
        {nodes.filter(n => !n.leaf).map(n => n.children.map(c => <line key={`${n.id}-${c.id}`} x1={pos.get(n.id)!.x} y1={pos.get(n.id)!.y + 24} x2={pos.get(c.id)!.x} y2={pos.get(c.id)!.y} className="edge" />))}
        {nodes.filter(n => n.leaf && n.next).map(n => <line key={`l${n.id}`} x1={pos.get(n.id)!.x + pos.get(n.id)!.w / 2} y1={pos.get(n.id)!.y + 12} x2={pos.get(n.next!.id)!.x - pos.get(n.next!.id)!.w / 2} y2={pos.get(n.next!.id)!.y + 12} stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 3" />)}
        {nodes.map(n => { const p = pos.get(n.id)!; return <g key={n.id} transform={`translate(${p.x - p.w / 2},${p.y})`}><rect width={p.w} height={24} rx={6} className={`ln-box ${path.has(n.id) ? 'tagged' : ''}`} />{n.keys.map((k, i) => <text key={i} x={6 + i * 26 + 13} y={16} textAnchor="middle" className="tl">{k}</text>)}{n.keys.length === 0 && <text x={p.w / 2} y={16} textAnchor="middle" className="nulltxt">empty</text>}</g>; })}
      </svg></div>
      <div className="dim small">Height {h} · {tree.keys().length} key(s) · dashed amber arrows are the leaf-level links used by range scans. Leaves in order: {tree.keys().join(', ') || '—'}</div>
      <div className="card">{events.length ? events.map((e, i) => <div key={i} className="small">{e}</div>) : 'Insert keys to see splits; delete keys to see redistribution and merging.'}</div>
      <details><summary className="small dim">Why B+ trees for indexes?</summary><p className="small">With hundreds of keys per page a B+ tree of height 3–4 indexes millions of rows, so a lookup reads only a few pages. Because every leaf is at the same depth and leaves are linked, range queries (BETWEEN, ORDER BY) scan sequentially after one lookup.</p></details>
    </div>
  );
}

export function DBMSWorld() {
  const [tab, setTab] = useState<'concepts' | 'norm' | 'tx' | 'sched' | 'lock' | 'bt'>('concepts');
  const tabs = [['concepts', 'Concepts'], ['norm', 'Normalization Lab'], ['tx', 'Transaction Simulator'], ['sched', 'Schedules'], ['lock', 'Locks & Deadlock'], ['bt', 'B+ Tree Index']] as const;
  return (
    <div className="page">
      <h1>Database World</h1>
      <div className="note small">Each simulator is a <b>simplified educational model</b> implemented as tested algorithms. Real database engines add many optimisations and engine-specific behaviour. Distributed databases, query-plan lessons beyond the SQL Lab, and 4NF/5NF are covered by concept cards only.</div>
      <div className="stage-bar">{tabs.map(([k, n]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{n}</button>)}</div>
      {tab === 'concepts' && <Concepts />}{tab === 'norm' && <Normalization />}{tab === 'tx' && <Transactions />}{tab === 'sched' && <Schedules />}
      {tab === 'lock' && <div><div className="note small">Exclusive-lock model: transaction T1 locks A and wants B while T2 locks B and wants A. Use "Load almost deadlock", then request the crossing locks, detect the cycle and abort a victim.</div><Deadlock names={['T1', 'T2', 'T3']} resources={['A', 'B', 'C']} label="transaction" /></div>}
      {tab === 'bt' && <BTree />}
    </div>
  );
}
