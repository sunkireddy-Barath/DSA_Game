import { useMemo } from 'react';
import type { FrameSnap, HeapNode, TraceEvent } from '../engine/interp';
import { HowTo, Legend } from './Explain';

export const isPtrType = (t: string) => t.endsWith('*');
const ptrId = (v: any): number => (v && typeof v === 'object' && '$ptr' in v ? v.$ptr : 0);

/** pointer variables of the current frame -> node id they point to */
function tagsFor(frame: FrameSnap): Map<number, string[]> {
  const m = new Map<number, string[]>();
  for (const v of frame.vars) if (isPtrType(v.type)) { const id = ptrId(v.value); if (id) (m.get(id) ?? m.set(id, []).get(id)!).push(v.name); }
  return m;
}
const nullTags = (frame: FrameSnap) => frame.vars.filter(v => isPtrType(v.type) && !ptrId(v.value)).map(v => v.name);

/* ---------------- Linked list ---------------- */
export function ListView({ heap, prevHeap, frame }: { heap: HeapNode[]; prevHeap?: HeapNode[]; frame: FrameSnap }) {
  const nodes = heap.filter(n => n.kind === 'ListNode');
  const byId = new Map(nodes.map(n => [n.id, n]));
  const tags = tagsFor(frame);
  const layout = useMemo(() => {
    const indeg = new Map<number, number>(); nodes.forEach(n => indeg.set(n.id, 0));
    nodes.forEach(n => n.next && byId.has(n.next) && indeg.set(n.next, (indeg.get(n.next) ?? 0) + 1));
    const heads = nodes.filter(n => !indeg.get(n.id)).map(n => n.id);
    const placed = new Map<number, { x: number; y: number }>(); const chains: number[][] = [];
    const walk = (start: number) => {
      const chain: number[] = []; let c: number | undefined = start;
      while (c && byId.has(c) && !placed.has(c)) { placed.set(c, { x: chain.length, y: chains.length }); chain.push(c); c = byId.get(c)!.next; }
      if (chain.length) chains.push(chain);
    };
    heads.forEach(walk);
    nodes.forEach(n => { if (!placed.has(n.id)) walk(n.id); }); // pure cycles
    return { placed, rows: chains.length, cols: Math.max(1, ...chains.map(c => c.length)) };
  }, [heap]); // eslint-disable-line
  const W = 92, H = 78, R = 56;
  const old = new Map((prevHeap ?? []).map(n => [n.id, n]));
  return (
    <div className="viz-block">
      <div className="viz-label">linked list <span className="dim">{nodes.length} node(s) · arrows are real <code>next</code> pointers</span></div>
      <div className="tree-scroll">
        <svg width={layout.cols * W + 70} height={layout.rows * H + 40}>
          <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8b93a0" /></marker>
            <marker id="ah2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#fbbf24" /></marker></defs>
          {nodes.map(n => {
            const p = layout.placed.get(n.id)!; const x = p.x * W + 20, y = p.y * H + 26;
            let arrow: JSX.Element | null = null;
            if (!n.next) {
              arrow = <g><line x1={x + R} y1={y + 18} x2={x + R + 24} y2={y + 18} className="edge2" markerEnd="url(#ah)" /><text x={x + R + 26} y={y + 22} className="nulltxt">null</text></g>;
            } else if (layout.placed.has(n.next)) {
              const t = layout.placed.get(n.next)!; const tx = t.x * W + 20, ty = t.y * H + 26;
              const changed = old.has(n.id) && old.get(n.id)!.next !== n.next;
              const cls = changed ? 'edge2 hot' : 'edge2';
              if (t.y === p.y && t.x === p.x + 1) arrow = <line x1={x + R} y1={y + 18} x2={tx - 2} y2={ty + 18} className={cls} markerEnd={changed ? 'url(#ah2)' : 'url(#ah)'} />;
              else arrow = <path d={`M ${x + R / 2} ${y + 38} C ${x + R / 2} ${y + 70}, ${tx + R / 2} ${ty + 70}, ${tx + R / 2} ${ty + 38}`} className={cls} fill="none" markerEnd={changed ? 'url(#ah2)' : 'url(#ah)'} />;
            }
            return <g key={`a${n.id}`}>{arrow}</g>;
          })}
          {nodes.map(n => {
            const p = layout.placed.get(n.id)!; const x = p.x * W + 20, y = p.y * H + 26;
            const tg = tags.get(n.id);
            return (
              <g key={n.id} className="lnode" style={{ transform: `translate(${x}px, ${y}px)` }}>
                <rect width={R} height={36} rx={8} className={`ln-box ${tg ? 'tagged' : ''}`} />
                <line x1={R - 16} x2={R - 16} y1={0} y2={36} className="ln-div" />
                <text x={(R - 16) / 2} y={22} textAnchor="middle" className="tl">{n.val}</text>
                <circle cx={R - 8} cy={18} r={3} className="ln-dot" />
                <text x={R / 2} y={52} textAnchor="middle" className="ln-id">#{n.id}</text>
                {tg && <text x={R / 2} y={-8} textAnchor="middle" className="ptr-lbl">{tg.join(', ')}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      {nullTags(frame).length > 0 && <div className="dim small">nullptr: {nullTags(frame).join(', ')}</div>}
      <HowTo>Each box is a node: the left part is its value, the dot on the right is its <code>next</code> pointer, which the arrow follows. A name above a node is a pointer variable currently pointing at it; <code>null</code> marks the end of the list.</HowTo>
      <Legend items={[['sw-ptr', 'node a pointer variable points to'], ['sw-hot', 'arrow re-linked in the last step']]} />
    </div>
  );
}

/* ---------------- Binary tree ---------------- */
export function TreeView({ heap, prevHeap, frame }: { heap: HeapNode[]; prevHeap?: HeapNode[]; frame: FrameSnap }) {
  const nodes = heap.filter(n => n.kind === 'TreeNode');
  const byId = new Map(nodes.map(n => [n.id, n]));
  const tags = tagsFor(frame);
  const { pos, w, h } = useMemo(() => {
    const child = new Set<number>(); nodes.forEach(n => { if (n.left) child.add(n.left); if (n.right) child.add(n.right); });
    const roots = nodes.filter(n => !child.has(n.id)).map(n => n.id);
    const pos = new Map<number, { x: number; y: number }>(); let leaf = 0, maxD = 0;
    const lay = (id: number, d: number): number => {
      const n = byId.get(id)!; maxD = Math.max(maxD, d);
      const kids = [n.left, n.right].filter(c => c && byId.has(c) && !pos.has(c));
      let x: number;
      if (!kids.length) x = leaf++;
      else { pos.set(id, { x: 0, y: d }); const xs = [n.left, n.right].filter(c => c && byId.has(c)).map(c => lay(c, d + 1)); x = (xs[0] + xs[xs.length - 1]) / 2; }
      pos.set(id, { x, y: d }); return x;
    };
    roots.forEach(r => lay(r, 0));
    return { pos, w: Math.max(1, leaf), h: maxD + 1 };
  }, [heap]); // eslint-disable-line
  const old = new Map((prevHeap ?? []).map(n => [n.id, n]));
  const W = 56, H = 62;
  return (
    <div className="viz-block">
      <div className="viz-label">binary tree <span className="dim">{nodes.length} node(s) · edges are real <code>left</code>/<code>right</code> pointers</span></div>
      <div className="tree-scroll">
        <svg width={w * W + 30} height={h * H + 30}>
          {nodes.map(n => [n.left, n.right].map((c, k) => c && pos.has(c) && pos.has(n.id) ? <line key={`${n.id}-${k}`} x1={pos.get(n.id)!.x * W + 28} y1={pos.get(n.id)!.y * H + 24} x2={pos.get(c)!.x * W + 28} y2={pos.get(c)!.y * H + 24} className="edge" /> : null))}
          {nodes.map(n => {
            const p = pos.get(n.id); if (!p) return null; const tg = tags.get(n.id);
            const chg = old.has(n.id) && old.get(n.id)!.val !== n.val;
            return (
              <g key={n.id} className="lnode" style={{ transform: `translate(${p.x * W + 28}px, ${p.y * H + 24}px)` }}>
                <circle r={18} className={`tn ${tg ? 'tagged' : ''} ${chg ? 'hot' : ''}`} />
                <text y={4} textAnchor="middle" className="tl">{n.val}</text>
                {tg && <text y={-24} textAnchor="middle" className="ptr-lbl">{tg.join(', ')}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      {nullTags(frame).length > 0 && <div className="dim small">nullptr: {nullTags(frame).join(', ')}</div>}
      <HowTo>The top circle is the root; each node has at most two children (left below-left, right below-right). A name above a node is a pointer variable currently pointing at it.</HowTo>
      <Legend items={[['sw-ptr', 'node a pointer variable points to'], ['sw-hot', 'value changed in the last step']]} />
    </div>
  );
}

/* ---------------- stack / queue / deque / heap ---------------- */
function elText(v: any, heap: HeapNode[]) {
  if (v && typeof v === 'object' && '$ptr' in v) { const n = heap.find(x => x.id === v.$ptr); return n ? `${n.val}` : 'null'; }
  return Array.isArray(v) ? `[${v.join(',')}]` : String(v);
}

export function SeqView({ name, type, v, heap, prev }: { name: string; type: string; v: { $seq: any[]; kind: string; min?: boolean }; heap: HeapNode[]; prev?: any }) {
  const a = v.$seq; const pa: any[] | undefined = prev?.$seq;
  const changed = (i: number) => !pa || JSON.stringify(pa[i]) !== JSON.stringify(a[i]);
  if (v.kind === 'stack')
    return (
      <div className="viz-block"><div className="viz-label">{name} <span className="dim">{type} · size {a.length}</span></div>
        <HowTo>Last in, first out: new values are pushed on top and only the top can be popped.</HowTo>
        <div className="stack-v">{a.length === 0 && <span className="dim">empty</span>}
          {[...a].reverse().map((x, k) => { const i = a.length - 1 - k; return <div key={i} className={`stk ${i === a.length - 1 ? 'top' : ''} ${changed(i) ? 'changed' : ''}`}>{elText(x, heap)}{i === a.length - 1 && <span className="top-tag">top</span>}</div>; })}
        </div></div>
    );
  if (v.kind === 'queue' || v.kind === 'deque')
    return (
      <div className="viz-block"><div className="viz-label">{name} <span className="dim">{type} · size {a.length}</span></div>
        <HowTo>First in, first out: values join at the back and leave from the front.</HowTo>
        <div className="cells">{a.length === 0 && <span className="dim">empty</span>}
          {a.map((x, i) => <div key={i} className="cell-wrap"><div className={`cell ${changed(i) ? 'changed' : ''}`}>{elText(x, heap)}</div><div className="idx">{i === 0 ? 'front' : i === a.length - 1 ? 'back' : ''}{a.length === 1 ? '' : ''}</div></div>)}
        </div></div>
    );
  // priority_queue: show the actual heap array and its tree
  const W = 44, H = 48; const levels = Math.max(1, Math.floor(Math.log2(Math.max(1, a.length))) + 1);
  const pos = (i: number) => { const d = Math.floor(Math.log2(i + 1)); const k = i + 1 - 2 ** d; const slots = 2 ** d; return { x: ((k + 0.5) / slots) * (2 ** (levels - 1) * W), y: d * H }; };
  return (
    <div className="viz-block"><div className="viz-label">{name} <span className="dim">{type} · {v.min ? 'min' : 'max'}-heap · size {a.length}</span></div>
      <div className="cells">{a.length === 0 && <span className="dim">empty</span>}
        {a.map((x, i) => <div key={i} className="cell-wrap"><div className={`cell ${i === 0 ? 'ptr' : ''} ${changed(i) ? 'changed' : ''}`}>{elText(x, heap)}</div><div className="idx">{i}</div></div>)}</div>
      {a.length > 0 && <div className="tree-scroll" style={{ marginTop: 6 }}>
        <svg width={2 ** (levels - 1) * W + 20} height={levels * H + 10}>
          {a.map((_, i) => i > 0 ? <line key={i} x1={pos((i - 1) >> 1).x + 10} y1={pos((i - 1) >> 1).y + 18} x2={pos(i).x + 10} y2={pos(i).y + 18} className="edge" /> : null)}
          {a.map((x, i) => <g key={i} transform={`translate(${pos(i).x + 10}, ${pos(i).y + 18})`}><circle r={15} className={`tn ${i === 0 ? 'tagged' : ''}`} /><text y={4} textAnchor="middle" className="tl">{elText(x, heap)}</text></g>)}
        </svg></div>}
      <div className="dim small">heap property: every parent is {v.min ? '≤' : '≥'} its children (children of i are 2i+1 and 2i+2)</div>
    </div>
  );
}

export function PtrRegion({ ev, prevEv, frame }: { ev: TraceEvent; prevEv?: TraceEvent; frame: FrameSnap }) {
  const heap = ev.heap ?? [];
  const hasList = heap.some(n => n.kind === 'ListNode'), hasTree = heap.some(n => n.kind === 'TreeNode');
  return <>{hasList && <ListView heap={heap} prevHeap={prevEv?.heap} frame={frame} />}{hasTree && <TreeView heap={heap} prevHeap={prevEv?.heap} frame={frame} />}</>;
}

/* ---------------- graph (derived from an `adj` adjacency-list variable) ---------------- */
export function GraphView({ adj, frame }: { adj: number[][]; frame: FrameSnap }) {
  const n = adj.length;
  const visitedVar = frame.vars.find(v => (v.name === 'visited' || v.name === 'color' || v.name === 'indegree') && Array.isArray(v.value) && typeof v.value[0] !== 'object');
  const cur = frame.vars.filter(v => ['node', 'city', 'u', 'start', 'course', 'src', 'parent'].includes(v.name) && typeof v.value === 'number').map(v => ({ name: v.name, val: v.value as number }));
  const nextV = frame.vars.find(v => v.name === 'next' && typeof v.value === 'number');
  const R = Math.max(70, n * 14), cx = R + 34, cy = R + 30;
  const P = (i: number) => ({ x: cx + R * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), y: cy + R * Math.sin((2 * Math.PI * i) / n - Math.PI / 2) });
  const has = (a: number, b: number) => adj[a]?.includes(b);
  const directed = adj.some((row, u) => row.some(v => !has(v, u)));
  const edges: [number, number][] = [];
  adj.forEach((row, u) => row.forEach(v => { if (v >= 0 && v < n && (directed || u <= v)) edges.push([u, v]); }));
  return (
    <div className="viz-block">
      <div className="viz-label">graph <span className="dim">{n} vertices · {directed ? 'directed' : 'undirected'} · drawn from adj[]</span></div>
      <div className="tree-scroll">
        <svg width={2 * R + 68} height={2 * R + 60}>
          <defs><marker id="gah" markerWidth="8" markerHeight="8" refX="14" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8b93a0" /></marker></defs>
          {edges.map(([u, v], i) => { const a = P(u), b = P(v); return u === v ? null : <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="edge" markerEnd={directed ? 'url(#gah)' : undefined} />; })}
          {Array.from({ length: n }, (_, i) => {
            const p = P(i); const vis = visitedVar && (visitedVar.name === 'indegree' ? visitedVar.value[i] === 0 : visitedVar.value[i] !== 0 && visitedVar.value[i] !== -1);
            const isCur = cur.some(c => c.val === i); const isNext = nextV?.value === i;
            return (
              <g key={i} transform={`translate(${p.x}, ${p.y})`}>
                <circle r={16} className={`tn ${vis ? 'visited' : ''} ${isCur ? 'tagged' : ''} ${isNext ? 'hot' : ''}`} />
                <text y={4} textAnchor="middle" className="tl">{i}</text>
                {isCur && <text y={-22} textAnchor="middle" className="ptr-lbl">{cur.filter(c => c.val === i).map(c => c.name).join(',')}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="dim small"><span className="legend v" /> visited/coloured · <span className="legend c" /> current vertex · <span className="legend h" /> neighbour being examined</div>
    </div>
  );
}
