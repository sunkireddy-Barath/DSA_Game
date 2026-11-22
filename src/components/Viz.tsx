import { useMemo } from 'react';
import type { FrameSnap, HeapNode, TraceEvent, VarSnap } from '../engine/interp';
import { GraphView, PtrRegion, SeqView, isPtrType } from './PtrViz';

const isMap = (v: any) => v && typeof v === 'object' && '$map' in v;
const isNum1D = (v: any) => Array.isArray(v) && v.every(x => typeof x !== 'object');
const isGrid = (v: any) => Array.isArray(v) && v.length > 0 && v.every(r => Array.isArray(r) && r.length === v[0].length && isNum1D(r));
const isCharType = (t: string) => t.includes('char');
const disp = (x: any, t: string) => (isCharType(t) && typeof x === 'number' ? String.fromCharCode(x) : x === true ? 'T' : x === false ? 'F' : String(x));

function prevVar(prev: FrameSnap | undefined, name: string): VarSnap | undefined {
  return prev?.vars.find(v => v.name === name);
}

function ArrayView({ v, prev, pointers }: { v: VarSnap; prev?: VarSnap; pointers: Record<number, string[]> }) {
  const arr: any[] = typeof v.value === 'string' ? [...v.value] : v.value;
  const pa: any[] | undefined = typeof prev?.value === 'string' ? [...prev.value] : prev?.value;
  const t = typeof v.value === 'string' ? 'char' : v.type;
  return (
    <div className="viz-block">
      <div className="viz-label">{v.name} <span className="dim">{v.type} · size {arr.length}</span></div>
      <div className="cells">
        {arr.length === 0 && <span className="dim">empty</span>}
        {arr.map((x, i) => {
          const changed = pa && (pa[i] !== x);
          const ptrs = pointers[i];
          return (
            <div key={i} className="cell-wrap">
              <div className={`cell ${changed ? 'changed' : ''} ${ptrs ? 'ptr' : ''}`}>{typeof v.value === 'string' ? x : disp(x, t)}</div>
              <div className="idx">{i}</div>
              <div className="ptrs">{ptrs?.map(p => <span key={p} className="ptr-tag">{p}</span>)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GridView({ v, prev }: { v: VarSnap; prev?: VarSnap }) {
  const g: any[][] = v.value, pg: any[][] | undefined = prev?.value;
  return (
    <div className="viz-block">
      <div className="viz-label">{v.name} <span className="dim">{v.type} · {g.length}×{g[0].length} — DP table</span></div>
      <table className="grid"><tbody>
        {g.map((row, r) => (
          <tr key={r}><th>{r}</th>{row.map((x, c) => {
            const changed = pg?.[r] && pg[r][c] !== x;
            return <td key={c} className={changed ? 'changed' : ''}>{String(x)}</td>;
          })}</tr>
        ))}
      </tbody></table>
    </div>
  );
}

function RowsView({ v }: { v: VarSnap }) {
  const rows: any[][] = v.value;
  return (
    <div className="viz-block">
      <div className="viz-label">{v.name} <span className="dim">{v.type} · {rows.length} row(s)</span></div>
      <div className="rows">{rows.length === 0 && <span className="dim">empty</span>}
        {rows.map((r, i) => <div key={i} className="row-chip">[{Array.isArray(r) ? r.join(', ') : String(r)}]</div>)}</div>
    </div>
  );
}

function MapView({ v, prev }: { v: VarSnap; prev?: VarSnap }) {
  const ents: [any, any][] = v.value.$map;
  const old = new Map<any, any>((prev?.value?.$map ?? []).map(([k, x]: any) => [k, JSON.stringify(x)]));
  return (
    <div className="viz-block">
      <div className="viz-label">{v.name} <span className="dim">{v.type} · {ents.length} entr{ents.length === 1 ? 'y' : 'ies'}</span></div>
      <div className="cells">
        {ents.length === 0 && <span className="dim">empty</span>}
        {ents.map(([k, x]) => {
          const changed = prev && old.get(k) !== JSON.stringify(x);
          return <div key={String(k)} className={`kv ${changed ? 'changed' : ''}`}><span className="k">{String(k)}</span><span className="arrow">→</span><span className="val">{v.value.kind === 'set' ? '✓' : JSON.stringify(x)}</span></div>;
        })}
      </div>
    </div>
  );
}

function QueensBoard({ pos, row, col, n }: { pos: number[]; row?: number; col?: number; n: number }) {
  return (
    <div className="viz-block">
      <div className="viz-label">board <span className="dim">derived from pos[] (row → column)</span></div>
      <div className="board" style={{ gridTemplateColumns: `repeat(${n}, 34px)` }}>
        {Array.from({ length: n * n }, (_, k) => {
          const r = Math.floor(k / n), c = k % n;
          const q = pos[r] === c, trying = row === r && col === c;
          return <div key={k} className={`sq ${(r + c) % 2 ? 'dark' : ''} ${trying ? 'trying' : ''}`}>{q ? '♛' : trying ? '?' : ''}</div>;
        })}
      </div>
    </div>
  );
}

interface Node { id: number; fn: string; label: string; parent: number; ret?: any; children: Node[]; done: boolean; x: number; y: number }

export function buildTree(events: TraceEvent[], upto: number): Node[] {
  const nodes = new Map<number, Node>();
  for (let i = 0; i <= upto; i++) {
    const e = events[i];
    if (e.kind === 'call') {
      const f = e.frames[e.frames.length - 1];
      const nargs = f.vars.slice(0, 4).filter(v => typeof v.value !== 'object').map(v => v.value);
      nodes.set(e.callId, { id: e.callId, fn: e.fn, label: `${e.fn}(${nargs.join(',')})`, parent: e.parentId, children: [], done: false, x: 0, y: 0 });
    } else if (e.kind === 'return') {
      const n = nodes.get(e.callId); if (n) { n.done = true; n.ret = e.ret; }
    }
  }
  const roots: Node[] = [];
  nodes.forEach(n => { const p = nodes.get(n.parent); if (p) p.children.push(n); else roots.push(n); });
  return roots;
}

export function RecursionTree({ events, idx, onSelect, selected }: { events: TraceEvent[]; idx: number; onSelect: (id: number) => void; selected: number | null }) {
  const cur = events[idx];
  const { nodes, w, h } = useMemo(() => {
    const roots = buildTree(events, idx);
    let leaf = 0, maxD = 0; const all: Node[] = [];
    const lay = (n: Node, d: number) => {
      maxD = Math.max(maxD, d); all.push(n); n.y = d;
      if (!n.children.length) n.x = leaf++; else { n.children.forEach(c => lay(c, d + 1)); n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2; }
    };
    roots.forEach(r => lay(r, 0));
    return { nodes: all, w: Math.max(1, leaf), h: maxD + 1 };
  }, [events, idx]);
  const W = 64, H = 54;
  return (
    <div className="viz-block">
      <div className="viz-label">recursion tree <span className="dim">built from call/return events · click a node to inspect</span></div>
      <div className="tree-scroll">
        <svg width={w * W + 20} height={h * H + 20}>
          {nodes.map(n => n.children.map(c => <line key={`${n.id}-${c.id}`} x1={n.x * W + W / 2 + 10} y1={n.y * H + 22} x2={c.x * W + W / 2 + 10} y2={c.y * H + 22} className="edge" />))}
          {nodes.map(n => (
            <g key={n.id} transform={`translate(${n.x * W + 10}, ${n.y * H + 4})`} onClick={() => onSelect(n.id)} style={{ cursor: 'pointer' }}>
              <rect width={W - 6} height={36} rx={8} className={`tnode ${n.id === cur.callId ? 'active' : ''} ${n.done ? 'done' : ''} ${selected === n.id ? 'sel' : ''}`} />
              <text x={(W - 6) / 2} y={15} textAnchor="middle" className="tl">{n.label.length > 9 ? n.label.slice(0, 8) + '…' : n.label}</text>
              <text x={(W - 6) / 2} y={30} textAnchor="middle" className="tr">{n.done ? `→ ${JSON.stringify(n.ret)}` : '…'}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function Viz({ events, idx, viz, onSelectCall, selectedCall, recursive }: {
  events: TraceEvent[]; idx: number; viz?: 'queens'; onSelectCall: (id: number) => void; selectedCall: number | null; recursive: boolean;
}) {
  const ev = events[idx];
  const frame = ev.frames[ev.frames.length - 1];
  const prevEv = idx > 0 ? events[idx - 1] : undefined;
  const prevFrame = prevEv?.frames.find(f => f.callId === frame.callId);

  const scalars = frame.vars.filter(v => !isPtrType(v.type) && typeof v.value !== 'object');
  const ptrs = frame.vars.filter(v => isPtrType(v.type));
  const heap: HeapNode[] = ev.heap ?? [];
  const ptrText = (v: any) => { const id = v?.$ptr; if (!id) return 'nullptr'; const n = heap.find(x => x.id === id); return n ? `→ #${id} (val ${n.val})` : `→ #${id}`; };
  const idxNames = new Set([...frame.idxVars]);
  const pointerVars = scalars.filter(v => typeof v.value === 'number' && !v.type.includes('char') && idxNames.has(v.name));
  const pointersFor = (len: number) => {
    const m: Record<number, string[]> = {};
    for (const p of pointerVars) if (p.value >= 0 && p.value < len) (m[p.value] ||= []).push(p.name);
    return m;
  };
  const pos = frame.vars.find(v => v.name === 'pos');
  const nVar = frame.vars.find(v => v.name === 'n');

  return (
    <div className="viz">
      {recursive && <RecursionTree events={events} idx={idx} onSelect={onSelectCall} selected={selectedCall} />}
      {viz === 'queens' && pos && Array.isArray(pos.value) && (
        <QueensBoard pos={pos.value} n={pos.value.length} row={frame.vars.find(v => v.name === 'row')?.value} col={frame.vars.find(v => v.name === 'col')?.value} />
      )}
      <PtrRegion ev={ev} prevEv={prevEv} frame={frame} />
      {(() => { const g = frame.vars.find(v => v.name === 'adj' && Array.isArray(v.value) && v.value.length > 0 && v.value.every((r: any) => Array.isArray(r))); return g ? <GraphView adj={g.value} frame={frame} /> : null; })()}
      {frame.vars.map(v => {
        if (isPtrType(v.type)) return null;
        const pv = prevVar(prevFrame, v.name);
        if (v.value && typeof v.value === 'object' && '$seq' in v.value) return <SeqView key={v.name} name={v.name} type={v.type} v={v.value} heap={heap} prev={pv?.value} />;
        if (isMap(v.value)) return <MapView key={v.name} v={v} prev={pv} />;
        if (typeof v.value === 'string') return <ArrayView key={v.name} v={v} prev={pv} pointers={pointersFor(v.value.length)} />;
        if (isGrid(v.value)) return <GridView key={v.name} v={v} prev={pv} />;
        if (Array.isArray(v.value) && v.value.length && v.value.every(Array.isArray)) return <RowsView key={v.name} v={v} />;
        if (isNum1D(v.value)) return <ArrayView key={v.name} v={v} prev={pv} pointers={pointersFor(v.value.length)} />;
        return null;
      })}
      <div className="viz-block">
        <div className="viz-label">variables in <code>{frame.fn}</code></div>
        <div className="chips">
          {scalars.map(v => {
            const pv = prevVar(prevFrame, v.name);
            const changed = pv && pv.value !== v.value;
            return <div key={v.name} className={`chip ${changed ? 'changed' : ''}`}><span className="n">{v.name}</span><span className="e">=</span><span className="v">{disp(v.value, v.type)}</span>{changed && <span className="was">was {disp(pv!.value, v.type)}</span>}</div>;
          })}
          {ptrs.map(v => { const pv = prevVar(prevFrame, v.name); const changed = pv && JSON.stringify(pv.value) !== JSON.stringify(v.value); return <div key={v.name} className={`chip ptrchip ${changed ? 'changed' : ''}`}><span className="n">{v.name}</span><span className="e">{v.type.replace('*', '')}*</span><span className="v">{ptrText(v.value)}</span>{changed && <span className="was">was {ptrText(pv!.value)}</span>}</div>; })}
          {scalars.length === 0 && ptrs.length === 0 && <span className="dim">no scalar variables yet</span>}
        </div>
        {ev.kind === 'return' && <div className="ret-banner">return {ev.ret && typeof ev.ret === 'object' && '$ptr' in ev.ret ? ptrText(ev.ret) : ev.ret === null ? 'nullptr' : JSON.stringify(ev.ret) ?? '(void)'}</div>}
      </div>
      {!nVar && null}
    </div>
  );
}
