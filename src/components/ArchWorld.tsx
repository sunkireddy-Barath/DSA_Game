import { useMemo, useState } from 'react';
import { COA_CONCEPTS } from '../coa/concepts';
import { ConceptCards } from './ConceptCards';
import { useStepper } from './OSWorld';
import { CacheConfig, addTwos, amat, assemble, cacheGeometry, equivalent, float32, fromTwos, onesComplement, parseBase, parsePipeline, pipeline, range, runProgram, signMagnitude, simulateCache, toBase, truthTable, twosComplement } from '../coa/engines';

function Numbers() {
  const [dec, setDec] = useState('-5'); const [bits, setBits] = useState(8); const [a, setA] = useState('127'); const [b, setB] = useState('1'); const [fl, setFl] = useState('0.1'); const [bin, setBin] = useState('10110');
  const n = parseInt(dec, 10); let rep: { two: string; one: string; sm: string } | null = null, err: string | null = null;
  try { if (Number.isNaN(n)) throw new Error('Enter an integer.'); rep = { two: twosComplement(n, bits), one: onesComplement(n, bits), sm: signMagnitude(n, bits) }; } catch (e: any) { err = e.message; }
  const sum = (() => { try { return addTwos(parseInt(a, 10), parseInt(b, 10), bits); } catch { return null; } })();
  const f = Number.isNaN(parseFloat(fl)) ? null : float32(parseFloat(fl));
  let bv: number | null = null; try { bv = parseBase(bin, 2); } catch { /* shown below */ }
  const r = range(bits);
  return (
    <div>
      <div className="controls"><label>Bits <select value={bits} onChange={e => setBits(+e.target.value)}>{[4, 8, 16].map(x => <option key={x}>{x}</option>)}</select></label><span className="dim">range {r.min} … {r.max}</span></div>
      <h4>Signed representations</h4>
      <div className="controls"><label>Decimal <input value={dec} onChange={e => setDec(e.target.value)} style={{ width: 100 }} /></label></div>
      {err && <div className="err compile">{err}</div>}
      {rep && <table className="sqlt"><tbody><tr><th>Two's complement</th><td className="mono">{rep.two}</td></tr><tr><th>One's complement</th><td className="mono">{rep.one}</td></tr><tr><th>Sign-magnitude</th><td className="mono">{rep.sm}</td></tr><tr><th>Hex / octal (two's)</th><td className="mono">0x{toBase(parseInt(rep.two, 2), 16)} / 0o{toBase(parseInt(rep.two, 2), 8)}</td></tr></tbody></table>}
      <div className="dim small">To negate in two's complement: invert all bits and add 1. Reading it back: {rep ? `${rep.two} → ${fromTwos(rep.two)}` : ''}</div>
      <h4>Addition, carry and overflow</h4>
      <div className="controls"><input value={a} onChange={e => setA(e.target.value)} style={{ width: 70 }} /> + <input value={b} onChange={e => setB(e.target.value)} style={{ width: 70 }} /></div>
      {sum ? <div className="card mono">{sum.a} ({a})<br />+ {sum.b} ({b})<br />= {sum.result} ({sum.value})<br /><span className={sum.overflow ? 'bad' : 'good'}>Overflow flag: {sum.overflow ? 'SET — the signed result does not fit' : 'clear'}</span> · Carry out: {sum.carry} · Zero: {sum.zero ? 1 : 0} · Negative: {sum.negative ? 1 : 0}</div> : <div className="err compile">Both numbers must be integers within {r.min}…{r.max}.</div>}
      <h4>IEEE-754 single precision</h4>
      <div className="controls"><input value={fl} onChange={e => setFl(e.target.value)} style={{ width: 120 }} /></div>
      {f && <div className="card"><div className="bits"><span className="bit h">{f.sign}</span>{f.exp.split('').map((c, k) => <span key={k} className="bit n">{c}</span>)}{f.man.split('').map((c, k) => <span key={k} className="bit">{c}</span>)}</div>
        <div className="small">sign {f.sign} · exponent {f.exp} = {f.biased} (unbiased {f.unbiased}) · fraction {f.man} · {f.hex} · kind: <b>{f.kind}</b></div><div className="small">Stored value: <b className="mono">{f.stored}</b> (the nearest representable number to {fl})</div></div>}
      <h4>Base converter</h4>
      <div className="controls"><input value={bin} onChange={e => setBin(e.target.value)} style={{ width: 160 }} className="mono" /> {bv === null ? <span className="bad">not a binary number</span> : <span className="mono">= {bv} decimal = 0x{toBase(bv, 16)} = 0o{toBase(bv, 8)}</span>}</div>
    </div>
  );
}

function Logic() {
  const [e1, setE1] = useState('!(A & B)'); const [e2, setE2] = useState('!A | !B');
  let t: ReturnType<typeof truthTable> | null = null, err: string | null = null, eq: boolean | null = null;
  try { t = truthTable(e1); } catch (e: any) { err = e.message; } try { eq = equivalent(e1, e2); } catch { eq = null; }
  return (
    <div>
      <div className="note small">Operators: <code>!</code> NOT, <code>&amp;</code> AND, <code>^</code> XOR, <code>|</code> OR (precedence in that order), parentheses, variables A–Z, constants 0/1.</div>
      <div className="controls"><label>Expression 1 <input value={e1} onChange={e => setE1(e.target.value)} style={{ width: 220 }} className="mono" /></label><label>Expression 2 <input value={e2} onChange={e => setE2(e.target.value)} style={{ width: 220 }} className="mono" /></label>
        {eq !== null && <b className={eq ? 'good' : 'bad'}>{eq ? '✓ equivalent on every input' : '✗ not equivalent'}</b>}</div>
      {err && <div className="err compile">{err}</div>}
      {t && <><table className="sqlt"><thead><tr>{t.vars.map(v => <th key={v}>{v}</th>)}<th>Output</th></tr></thead><tbody>{t.rows.map((r, k) => <tr key={k}>{t!.vars.map(v => <td key={v}>{+r.env[v]}</td>)}<td className={r.out ? 'good' : ''}><b>{+r.out}</b></td></tr>)}</tbody></table>
        <div className="small">Sum of minterms: Σm({t.minterms.join(', ')}) (variables ordered {t.vars.join('')}, first variable = most significant bit).</div></>}
    </div>
  );
}

const SUM_PROG = `ADDI R1, R0, 5
ADDI R2, R0, 0
loop: BEQ R1, R0, end
ADD R2, R2, R1
ADDI R1, R1, -1
J loop
end: HALT`;
function Cpu() {
  const [src, setSrc] = useState('ADDI R1, R0, 7\nADDI R2, R0, 5\nADD R3, R1, R2\nSW R3, 0(R0)\nLW R4, 0(R0)\nHALT');
  let prog: ReturnType<typeof assemble> | null = null, err: string | null = null; try { prog = assemble(src); } catch (e: any) { err = e.message; }
  const run = useMemo(() => (prog ? runProgram(prog) : null), [src]); // eslint-disable-line
  const flat = run ? run.executed.flatMap((e, k) => e.phases.map(p => ({ ...p, k, instr: e.instr }))) : [];
  const { i, ui } = useStepper(flat.length);
  const cur = flat[Math.max(0, i - 1)]; const active = i > 0 ? cur.active : [];
  const box = (id: string, label: string, sub?: string) => <div key={id} className={`dp ${active.includes(id) ? 'on' : ''}`}><b>{label}</b>{sub && <div className="small mono">{sub}</div>}</div>;
  const before = i > 0 && cur.k > 0 ? run!.executed[cur.k - 1].phases[5].state : null;
  const st = i > 0 ? cur.state : { pc: 0, ir: '', regs: Array(8).fill(0), mem: Array(16).fill(0), halted: false };
  return (
    <div>
      <div className="note small">A tiny RISC CPU (8 registers, R0 = 0, 16 data words). Instructions: ADD SUB AND OR ADDI LW SW BEQ J HALT. Every value below is produced by actually executing your program.</div>
      <div className="grid2"><div><textarea value={src} onChange={e => setSrc(e.target.value)} rows={8} style={{ width: '100%', fontFamily: 'ui-monospace,monospace', background: 'var(--panel2)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 8 }} />
        <button onClick={() => setSrc(SUM_PROG)}>Load a loop (sum 1..5)</button>{err && <div className="err compile">{err}</div>}{run?.error && <div className="err runtime">{run.error}</div>}</div>
        <div><div className="dp-grid">{box('PC', 'Program Counter', String(st.pc))}{box('IMEM', 'Instruction Memory')}{box('IR', 'Instruction Register', st.ir || '—')}{box('CU', 'Control Unit')}{box('REGS', 'Register File')}{box('ALU', 'ALU')}{box('DMEM', 'Data Memory')}</div></div></div>
      {flat.length > 0 && <>{ui}
        <div className="card">{i === 0 ? 'Press Start / Next to execute the first instruction.' : <><b>Instruction {cur.k + 1}: {cur.instr.text}</b> — <span className="pill ok">{cur.stage}</span><div>{cur.note}</div></>}</div>
        <div className="viz-label">Registers {before ? '(changed values highlighted)' : ''}</div>
        <div className="chips">{st.regs.map((v, k) => <div key={k} className={`chip ${before && before.regs[k] !== v ? 'changed' : ''}`}><span className="n">R{k}</span><span className="e">=</span><span className="v">{v}</span>{before && before.regs[k] !== v && <span className="was">was {before.regs[k]}</span>}</div>)}</div>
        <div className="viz-label">Data memory</div><div className="cells">{st.mem.map((v, k) => <div key={k} className="cell-wrap"><div className={`cell ${before && before.mem[k] !== v ? 'changed' : ''}`}>{v}</div><div className="idx">{k}</div></div>)}</div></>}
    </div>
  );
}

function Cache() {
  const [cfg, setCfg] = useState<CacheConfig>({ sizeBytes: 64, blockBytes: 16, ways: 1, addrBits: 12, policy: 'LRU' });
  const [text, setText] = useState('0, 4, 8, 64, 0, 16, 80, 0, 64');
  const addrs = text.split(/[ ,]+/).filter(Boolean).map(Number); const bad = addrs.some(a => !Number.isInteger(a) || a < 0 || a >= 2 ** cfg.addrBits);
  let g: ReturnType<typeof cacheGeometry> | null = null, err: string | null = null; try { g = cacheGeometry(cfg); } catch (e: any) { err = e.message; }
  const res = useMemo(() => (g && !bad ? simulateCache(cfg, addrs) : null), [cfg, text]); // eslint-disable-line
  const { i, ui } = useStepper(res ? res.accesses.length : 0);
  const done = res ? res.accesses.slice(0, i) : []; const cur = done[done.length - 1];
  const hit = done.filter(a => a.hit).length; const [ht, mp] = [1, 100];
  const set = (k: keyof CacheConfig, v: any) => setCfg(c => ({ ...c, [k]: v }));
  const cmp = useMemo(() => (g && !bad ? [1, 2, 4].map(w => { try { return [w === 1 ? 'direct-mapped' : `${w}-way`, simulateCache({ ...cfg, ways: w }, addrs).hits] as const; } catch { return null; } }).filter(Boolean) : []), [cfg, text]); // eslint-disable-line
  return (
    <div>
      <div className="controls"><label>Cache bytes <select value={cfg.sizeBytes} onChange={e => set('sizeBytes', +e.target.value)}>{[32, 64, 128, 256].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Block bytes <select value={cfg.blockBytes} onChange={e => set('blockBytes', +e.target.value)}>{[4, 8, 16, 32].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Ways <select value={cfg.ways} onChange={e => set('ways', +e.target.value)}>{[1, 2, 4, 8].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Policy <select value={cfg.policy} onChange={e => set('policy', e.target.value)}><option>LRU</option><option>FIFO</option></select></label></div>
      <div className="controls"><label>Address sequence (decimal, {cfg.addrBits}-bit) <input value={text} onChange={e => setText(e.target.value)} style={{ width: 360 }} /></label></div>
      {err && <div className="err compile">{err}</div>}{bad && <div className="err compile">Addresses must be integers in 0…{2 ** cfg.addrBits - 1}.</div>}
      {g && <div className="card">{cfg.addrBits}-bit address = <span className="bit n">tag {g.tagBits}</span> <span className="bit h">index {g.indexBits}</span> <span className="bit">offset {g.offsetBits}</span> · {g.blocks} blocks in {g.sets} set(s) × {cfg.ways} way(s)</div>}
      {res && <>{ui}
        {cur && <div className={`card ${cur.hit ? '' : 'unsafe'}`}>Address <b>{cur.addr}</b> = tag <b>{cur.tag}</b>, index <b>{cur.index}</b>, offset <b>{cur.offset}</b> → set {cur.index}: <b className={cur.hit ? 'good' : 'bad'}>{cur.kind.toUpperCase()}</b>{cur.evicted !== null && <> · evicted tag {cur.evicted}</>}</div>}
        <table className="sqlt"><thead><tr><th>Set</th>{Array.from({ length: cfg.ways }, (_, w) => <th key={w}>Way {w} (tag)</th>)}</tr></thead><tbody>{Array.from({ length: res.sets }, (_, s) => { const last = [...done].reverse().find(a => a.index === s); const v = last ? last.setAfter : Array(cfg.ways).fill(null); return <tr key={s} className={cur && cur.index === s ? '' : ''}><th>{s}</th>{v.map((t, w) => <td key={w} className={cur && cur.index === s && t === cur.tag ? 'changed' : ''}>{t === null ? '—' : t}</td>)}</tr>; })}</tbody></table>
        <div className="small">So far: {hit} hit(s), {done.length - hit} miss(es). Whole sequence: hit rate {(res.hitRate * 100).toFixed(0)}% → AMAT = {ht} + {(1 - res.hitRate).toFixed(2)} × {mp} = <b>{amat(ht, 1 - res.hitRate, mp).toFixed(1)} cycles</b> (assuming 1-cycle hit, 100-cycle miss penalty).</div>
        {cmp.length > 0 && <div className="small">Compare mapping: {cmp.map(c => `${c![0]} → ${c![1]} hits`).join(' · ')}</div>}</>}
    </div>
  );
}

const PIPE_PROG = 'LW R1, 0(R2)\nADD R3, R1, R4\nSUB R5, R3, R6\nSW R5, 0(R7)';
function Pipe() {
  const [src, setSrc] = useState(PIPE_PROG); const [fwd, setFwd] = useState(true);
  let prog: ReturnType<typeof parsePipeline> | null = null, err: string | null = null; try { prog = parsePipeline(src); } catch (e: any) { err = e.message; }
  const res = useMemo(() => (prog ? pipeline(prog, { forwarding: fwd }) : null), [src, fwd]); // eslint-disable-line
  const alt = useMemo(() => (prog ? pipeline(prog, { forwarding: !fwd }) : null), [src, fwd]); // eslint-disable-line
  const { i, ui } = useStepper(res ? res.cycles : 0);
  return (
    <div>
      <div className="note small">Classic 5-stage in-order pipeline: IF ID EX MEM WB. The register file is written in the first half of a cycle and read in the second, so a reader may be in ID during the writer's WB. A branch marked <code>taken</code> is resolved in EX (predict-not-taken: 2 wasted fetches).</div>
      <div className="grid2"><div><textarea value={src} onChange={e => setSrc(e.target.value)} rows={7} style={{ width: '100%', fontFamily: 'ui-monospace,monospace', background: 'var(--panel2)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 8 }} />
        <label><input type="checkbox" checked={fwd} onChange={e => setFwd(e.target.checked)} /> Forwarding (bypassing)</label>
        <div className="dim small">Instructions: ADD SUB AND OR MUL ADDI LW SW BEQ BNE NOP · add "taken" to a branch.</div>{err && <div className="err compile">{err}</div>}</div>
        {res && <div className="card"><div>Cycles: <b>{res.cycles}</b> · instructions: {prog!.length} · CPI: <b>{res.cpi.toFixed(2)}</b> (ideal without hazards: {res.ideal} cycles)</div><div>Stall cycles: <b>{res.stallCycles}</b> · branch flush: <b>{res.flushCycles}</b></div>{alt && <div className="dim small">Without changing anything else, {fwd ? 'turning forwarding off' : 'turning forwarding on'} gives {alt.cycles} cycles.</div>}</div>}</div>
      {res && <>{ui}<div className="sql-table-wrap"><table className="sqlt pipe"><thead><tr><th>Instruction</th>{Array.from({ length: res.cycles }, (_, c) => <th key={c} className={c + 1 === i ? 'curcol' : ''}>{c + 1}</th>)}</tr></thead>
        <tbody>{res.rows.map((r, k) => <tr key={k}><td className="mono">{r.text}</td>{r.cells.map((c, j) => <td key={j} className={`st-${c || 'none'} ${j + 1 > i ? 'future' : ''}`}>{c === 'stall' ? '⏸' : c}</td>)}</tr>)}</tbody></table></div>
        <div className="dim small">⏸ = the instruction is stalled in ID waiting for an operand (a bubble propagates down the pipeline).</div></>}
    </div>
  );
}

export function ArchWorld() {
  const [tab, setTab] = useState<'c' | 'n' | 'l' | 'cpu' | 'cache' | 'pipe'>('c');
  const tabs = [['c', 'Concepts'], ['n', 'Number Systems'], ['l', 'Logic Gates'], ['cpu', 'Inside the CPU'], ['cache', 'Cache Memory'], ['pipe', 'Pipelining']] as const;
  return (
    <div className="page"><h1>Computer Architecture World</h1>
      <div className="note small">Simplified educational models (a tiny RISC CPU, an idealised cache, a textbook 5-stage pipeline). Real processors use out-of-order execution, branch predictors, multi-level caches and many micro-architectural details not modelled here.</div>
      <div className="stage-bar">{tabs.map(([k, n]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{n}</button>)}</div>
      {tab === 'c' && <ConceptCards concepts={COA_CONCEPTS} />}{tab === 'n' && <Numbers />}{tab === 'l' && <Logic />}{tab === 'cpu' && <Cpu />}{tab === 'cache' && <Cache />}{tab === 'pipe' && <Pipe />}
    </div>
  );
}
