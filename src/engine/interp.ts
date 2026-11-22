// Tree-walking interpreter for the supported C++ subset.
// Every visualization in the app is derived from the Event[] this produces.
import { CppError, FnDef, Node, Type, parse } from './parser';
import { CMap, Dbl, END, FnRef, IterV, Lambda, MapIter, arith, cmpVals, norm, toN, truthy, valEq } from './values';
export { CMap } from './values';

export class RuntimeError extends Error {
  constructor(msg: string, public line: number) { super(msg); }
}
export class PNode {
  next: PNode | null = null; left: PNode | null = null; right: PNode | null = null;
  prev: PNode | null = null; random: PNode | null = null; bottom: PNode | null = null;
  constructor(public id: number, public kind: 'ListNode' | 'TreeNode', public val: number) {}
}
/** stack / queue / deque / priority_queue (a real binary heap) */
export class CSeq {
  constructor(public kind: 'stack' | 'queue' | 'deque' | 'pq', public a: any[] = [], public minHeap = false) {}
  before(x: any, y: any) { return this.minHeap ? cmpVals(x, y) < 0 : cmpVals(x, y) > 0; }
  hpush(v: any) {
    const a = this.a; a.push(v); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (this.before(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break; }
  }
  hpop() {
    const a = this.a, top = a[0], last = a.pop()!;
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && this.before(a[l], a[m])) m = l; if (r < a.length && this.before(a[r], a[m])) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
    return top;
  }
}
export interface HeapNode { id: number; kind: string; val: number; next: number; left: number; right: number; prev?: number; random?: number; bottom?: number }
type Cell = { v: any; type: Type };
interface Frame { id: number; fn: FnDef; scopes: Map<string, Cell>[]; line: number }

export interface VarSnap { name: string; type: string; value: any }
export interface FrameSnap { callId: number; fn: string; line: number; vars: VarSnap[]; idxVars: string[] }
export interface TraceEvent {
  id: number; kind: 'call' | 'line' | 'return'; line: number; depth: number;
  callId: number; parentId: number; fn: string; frames: FrameSnap[];
  ret?: any; cond?: boolean; heap?: HeapNode[];
  /** cumulative [comparisons, calls, loopIterations, mapOps] */
  stats: [number, number, number, number];
}
export interface RunResult {
  ok: boolean; result?: any; args?: any[]; events: TraceEvent[];
  error?: string; errorLine?: number; errorKind?: 'compile' | 'runtime' | 'timeout' | 'unsupported';
  truncated?: boolean;
  stats: { comparisons: number; calls: number; loopIterations: number; mapOps: number; steps: number; maxDepth: number };
}
export interface RunOpts { trace: boolean; maxEvents?: number; maxSteps?: number; /** doubly linked list problem: build prev pointers and verify them in the result */ dll?: boolean }

type Sig = null | { t: 'break' } | { t: 'continue' } | { t: 'return'; v: any; line: number };
const BREAK: Sig = { t: 'break' }, CONTINUE: Sig = { t: 'continue' };
const MAX_DEPTH = 400;

const tstr = (t: Type): string => t.base + (t.args.length ? `<${t.args.map(tstr).join(',')}>` : '') + (t.ptr ? '*' : '');
const isContainerType = (t: Type) => ['stack', 'queue', 'deque', 'priority_queue', 'vector', 'unordered_map', 'map', 'unordered_set', 'set'].includes(t.base);

export function copyVal(v: any): any {
  if (v instanceof CSeq) return new CSeq(v.kind, v.a.map(copyVal), v.minHeap);
  if (Array.isArray(v)) return v.map(copyVal);
  if (v instanceof CMap) { const c = new CMap(v.kind, v.sorted, v.valType); v.keys().forEach(k => c.set(k, copyVal(v.get(k)))); return c; }
  return v;
}
export function snapVal(v: any): any {
  if (v instanceof PNode) return { $ptr: v.id };
  if (v instanceof Dbl) return v.v;
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof IterV) return `iterator@${v.i}`;
  if (v instanceof MapIter) return `iterator(${v.k})`;
  if (v === END) return 'end()';
  if (v instanceof Lambda || v instanceof FnRef) return '[callable]';
  if (v instanceof CSeq) return { $seq: v.a.map(snapVal), kind: v.kind, min: v.minHeap };
  if (Array.isArray(v)) return v.map(snapVal);
  if (v instanceof CMap) {
    const ents = v.keys().map(k => [k, v.get(k)] as [any, any]);
    return { $map: ents.map(([k, x]) => [snapVal(k), snapVal(x)]), kind: v.kind };
  }
  return v;
}
export function toJSON(v: any, checkPrev = false): any {
  if (v instanceof Dbl) return v.v;
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof PNode) {
    if (v.kind === 'ListNode') {
      const out: number[] = [], nodes: PNode[] = [], seen = new Set<PNode>(); let c: PNode | null = v; let hasRandom = false;
      const follow = (n: PNode) => n.next ?? n.bottom;
      while (c && !seen.has(c) && out.length < 1000) { seen.add(c); nodes.push(c); out.push(c.val); if (c.random) hasRandom = true; c = follow(c); }
      if (hasRandom) return { list: out, random: nodes.map(n => (n.random ? nodes.indexOf(n.random) : -1)) };
      if (checkPrev && !nodes.every((n, i) => n.prev === (i === 0 ? null : nodes[i - 1]))) return { list: out, brokenPrev: true };
      return out;
    }
    const out: (number | null)[] = []; const q: (PNode | null)[] = [v];
    for (let i = 0; i < q.length && i < 2000; i++) { const n = q[i]; if (!n) { out.push(null); continue; } out.push(n.val); q.push(n.left, n.right); }
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  }
  if (v instanceof CSeq) return v.a.map(x => toJSON(x, checkPrev));
  if (Array.isArray(v)) return v.map(x => toJSON(x, checkPrev));
  if (v instanceof CMap) return snapVal(v);
  return v;
}

class Interp {
  fns: Record<string, FnDef> = {};
  globals = new Map<string, Cell>();
  frames: Frame[] = [];
  events: TraceEvent[] = [];
  lastEv: TraceEvent | null = null;
  callCounter = 0; evId = 0; steps = 0; nodeId = 0;
  mkNode(kind: 'ListNode' | 'TreeNode', val: number) { return new PNode(++this.nodeId, kind, val); }
  collectHeap(extra?: any): HeapNode[] {
    const seen = new Map<number, PNode>(); const stack: PNode[] = [];
    const root = (v: any) => { if (v instanceof PNode) stack.push(v); else if (Array.isArray(v)) v.forEach(root); else if (v instanceof CSeq) v.a.forEach(root); };
    for (const f of this.frames) for (const sc of f.scopes) sc.forEach(c => root(c.v));
    root(extra);
    while (stack.length && seen.size < 400) { const n = stack.pop()!; if (seen.has(n.id)) continue; seen.set(n.id, n); [n.next, n.left, n.right, n.prev, n.random, n.bottom].forEach(c => c && stack.push(c)); }
    return [...seen.values()].sort((a, b) => a.id - b.id).map(n => ({ id: n.id, kind: n.kind, val: n.val, next: n.next?.id ?? 0, left: n.left?.id ?? 0, right: n.right?.id ?? 0, ...(n.prev ? { prev: n.prev.id } : {}), ...(n.random ? { random: n.random.id } : {}), ...(n.bottom ? { bottom: n.bottom.id } : {}) }));
  }
  cmp = 0; calls = 0; iters = 0; mapOps = 0; maxDepth = 0;
  truncated = false;

  constructor(public trace: boolean, public maxEvents: number, public maxSteps: number) {}

  // ---------- helpers ----------
  get frame() { return this.frames[this.frames.length - 1]; }
  tick(line: number) {
    if (++this.steps > this.maxSteps) throw new RuntimeError('Time limit exceeded (infinite loop or input too large)', line);
  }
  defaultOf(t: Type): any {
    if (t.ptr) return null;
    switch (t.base) {
      case 'stack': return new CSeq('stack');
      case 'queue': return new CSeq('queue');
      case 'deque': return new CSeq('deque');
      case 'priority_queue': return new CSeq('pq', [], t.args[2]?.base === 'greater');
      case 'bool': return false;
      case 'double': case 'float': return new Dbl(0);
      case 'string': return '';
      case 'vector': return t.size ? Array.from({ length: t.size }, () => this.defaultOf(t.args[0])) : [];
      case 'pair': return [this.defaultOf(t.args[0]), this.defaultOf(t.args[1])];
      case 'map': return new CMap('map', true, t.args[1]);
      case 'unordered_map': return new CMap('map', false, t.args[1]);
      case 'set': return new CMap('set', true);
      case 'unordered_set': return new CMap('set', false);
      default: return 0;
    }
  }
  truthy(v: any) { return truthy(v); }
  coerce(t: Type, v: any): any {
    if (v === undefined || t.ptr) return v;
    switch (t.base) {
      case 'int': case 'short': {
        if (typeof v === 'boolean') return +v; if (v instanceof Dbl) v = Math.trunc(v.v);
        if (typeof v === 'bigint') return Number(BigInt.asIntN(32, v)); return typeof v === 'number' ? v | 0 : v;
      }
      case 'char': { if (typeof v === 'boolean') return +v; if (v instanceof Dbl) return Math.trunc(v.v); if (typeof v === 'bigint') return Number(BigInt.asIntN(8, v)); return v; }
      case 'long': case 'size_t': {
        if (typeof v === 'boolean') return +v; if (v instanceof Dbl) return norm(BigInt(Math.trunc(v.v)));
        if (typeof v === 'bigint') return norm(BigInt.asIntN(64, v)); return v;
      }
      case 'double': case 'float': return v instanceof Dbl ? v : typeof v === 'number' || typeof v === 'bigint' || typeof v === 'boolean' ? new Dbl(toN(v)) : v;
      case 'bool': return typeof v === 'number' || typeof v === 'bigint' || v instanceof Dbl ? truthy(v) : v;
      default: return v;
    }
  }
  lookup(name: string, line: number): Cell {
    const f = this.frame;
    if (f) for (let i = f.scopes.length - 1; i >= 0; i--) { const c = f.scopes[i].get(name); if (c) return c; }
    const g = this.globals.get(name);
    if (g) return g;
    const I = (base: string) => ({ base, args: [], ref: false });
    switch (name) {
      case 'INT_MAX': return { v: 2147483647, type: I('int') }; case 'INT_MIN': return { v: -2147483648, type: I('int') };
      case 'UINT_MAX': return { v: 4294967295, type: I('long') };
      case 'LLONG_MAX': case 'LONG_MAX': case 'INT64_MAX': return { v: 9223372036854775807n, type: I('long') };
      case 'LLONG_MIN': case 'LONG_MIN': case 'INT64_MIN': return { v: -9223372036854775808n, type: I('long') };
      case 'DBL_MAX': return { v: new Dbl(Number.MAX_VALUE), type: I('double') }; case 'M_PI': return { v: new Dbl(Math.PI), type: I('double') };
    }
    if (this.fns[name]) return { v: new FnRef(name), type: I('auto') };
    throw new CppError(`error: '${name}' was not declared in this scope`, line);
  }
  declare(name: string, type: Type, v: any) {
    this.frame.scopes[this.frame.scopes.length - 1].set(name, { v, type });
  }

  // ---------- tracing ----------
  snapFrame(f: Frame): FrameSnap {
    const vars: VarSnap[] = [];
    const seen = new Set<string>();
    for (let i = f.scopes.length - 1; i >= 0; i--) {
      f.scopes[i].forEach((c, name) => { if (!seen.has(name)) { seen.add(name); vars.push({ name, type: tstr(c.type), value: snapVal(c.v) }); } });
    }
    vars.reverse(); // outer scopes first, roughly declaration order
    return { callId: f.id, fn: f.fn.name, line: f.line, vars, idxVars: [...f.fn.idxVars] };
  }
  dll = false; quiet = 0; sharedChains = new Map<string, PNode | null>();
  event(kind: TraceEvent['kind'], line: number, ret?: any) {
    if (!this.trace || this.quiet) return;
    if (this.events.length >= this.maxEvents) { this.truncated = true; return; }
    this.frame.line = line;
    const ev: TraceEvent = {
      id: this.evId++, kind, line, depth: this.frames.length, callId: this.frame.id,
      parentId: this.frames.length > 1 ? this.frames[this.frames.length - 2].id : 0, fn: this.frame.fn.name,
      frames: this.frames.map(f => this.snapFrame(f)), ret: ret === undefined ? undefined : snapVal(ret),
      stats: [this.cmp, this.calls, this.iters, this.mapOps],
    };
    const h = this.collectHeap(ret); if (h.length) ev.heap = h;
    this.events.push(ev); this.lastEv = ev;
  }
  mark(line: number) { this.tick(line); const n = this.events.length; this.event('line', line); this.markEv = this.events.length > n ? this.lastEv : null; }
  markEv: TraceEvent | null = null;
  setCond(c: boolean) { if (this.markEv) this.markEv.cond = c; }

  // ---------- functions ----------
  callFn(fn: FnDef, args: { v: any; cell?: Cell }[], line: number) {
    if (this.frames.length >= MAX_DEPTH) throw new RuntimeError('Stack overflow (recursion too deep)', line);
    if (args.length !== fn.params.length) throw new CppError(`error: no matching call to '${fn.name}' (expected ${fn.params.length} args, got ${args.length})`, line);
    const scope = new Map<string, Cell>();
    fn.params.forEach((p, i) => {
      if (p.type.ref && args[i].cell) scope.set(p.name, args[i].cell!);
      else scope.set(p.name, { v: this.coerce(p.type, p.type.ref ? args[i].v : copyVal(args[i].v)), type: p.type });
    });
    this.frames.push({ id: ++this.callCounter, fn, scopes: [scope], line: fn.line });
    this.maxDepth = Math.max(this.maxDepth, this.frames.length);
    this.calls++;
    this.event('call', fn.line);
    const sig = this.execBlockIn(fn.body.body);
    let ret: any, rl = fn.endLine;
    if (sig && sig.t === 'return') { ret = fn.ret.base === 'void' ? undefined : this.coerce(fn.ret, sig.v); rl = sig.line; }
    this.event('return', rl, ret);
    this.frames.pop();
    return ret;
  }

  // ---------- statements ----------
  execBlockIn(body: Node[]): Sig {
    for (const s of body) { const sig = this.exec(s); if (sig) return sig; }
    return null;
  }
  scoped<T>(f: () => T): T {
    this.frame.scopes.push(new Map());
    try { return f(); } finally { this.frame.scopes.pop(); }
  }
  declStmt(s: Node) {
    for (const d of s.ds) {
      let v: any;
      const t: Type = s.type;
      if (d.sizes) {
        const dims: number[] = d.sizes.map((x: Node) => toN(this.eval(x)));
        const build = (k: number): any => (k === dims.length ? this.defaultOf(t) : Array.from({ length: dims[k] }, () => build(k + 1)));
        const tyAt = (k: number): Type => (k === dims.length ? t : { base: 'vector', args: [tyAt(k + 1)], ref: false });
        v = build(0);
        if (d.init) { const items = this.eval(d.init, tyAt(0)); if (Array.isArray(items)) for (let k = 0; k < items.length && k < v.length; k++) v[k] = this.coerce(t, items[k]); }
        this.declare(d.name, tyAt(0), v); continue;
      }
      if (d.init) {
        const r = this.eval(d.init, t);
        v = t.ref && isContainerType(t) || (t.base === 'auto' && t.ref) ? r : copyVal(r);
        v = this.fromInit(t, v);
        if (t.base === 'auto') { this.declare(d.name, { base: this.guessBase(v), args: [], ref: t.ref }, v); continue; }
        if (t.ref && !isContainerType(t) && d.init.k === 'id') { this.frame.scopes[this.frame.scopes.length - 1].set(d.name, this.lookup(d.init.name, d.line)); continue; }
        v = this.coerce(t, v);
      } else if (d.ctor) v = this.construct(t, d.ctor.map((a: Node) => this.eval(a)));
      else v = this.defaultOf(t);
      this.declare(d.name, t, v);
    }
  }
  /** Convert a brace-initialiser list into the declared container type (set, map, fixed-size array). */
  fromInit(t: Type, v: any) {
    if (!Array.isArray(v) || t.ptr) return v;
    if (t.base === 'set' || t.base === 'unordered_set') { const s = this.defaultOf(t) as CMap; v.forEach(k => s.set(k, true)); return s; }
    if (t.base === 'map' || t.base === 'unordered_map') { const m = this.defaultOf(t) as CMap; v.forEach(kv => { if (Array.isArray(kv)) m.set(kv[0], kv[1]); }); return m; }
    if (t.base === 'vector' && t.size) { const out = [...v]; while (out.length < t.size) out.push(this.defaultOf(t.args[0])); return out; }
    return v;
  }
  guessBase(v: any) {
    return typeof v === 'boolean' ? 'bool' : typeof v === 'string' ? 'string' : v instanceof Dbl ? 'double' : typeof v === 'bigint' ? 'long' : Array.isArray(v) ? 'vector'
      : v instanceof CMap ? 'map' : v instanceof CSeq ? (v.kind === 'pq' ? 'priority_queue' : v.kind) : v instanceof IterV || v instanceof MapIter || v === END ? 'auto' : v instanceof Lambda || v instanceof FnRef ? 'auto' : 'int';
  }
  construct(t: Type, a: any[]): any {
    if (t.base === 'pair') return [this.coerce(t.args[0], a[0] ?? this.defaultOf(t.args[0])), this.coerce(t.args[1], a[1] ?? this.defaultOf(t.args[1]))];
    if (t.base === 'vector') {
      if (a.length === 0) return t.size ? this.defaultOf(t) : [];
      if (a.length === 1 && Array.isArray(a[0])) return copyVal(a[0]);
      const el = t.args[0] ?? { base: 'int', args: [], ref: false };
      return Array.from({ length: toN(a[0]) }, () => (a.length > 1 ? this.coerce(el, copyVal(a[1])) : this.defaultOf(el)));
    }
    if (t.base === 'string') return a.length >= 2 ? String.fromCharCode(a[1]).repeat(a[0]) : a.length === 1 ? String(a[0]) : '';
    return this.defaultOf(t);
  }

  exec(s: Node): Sig {
    switch (s.k) {
      case 'block': return this.scoped(() => this.execBlockIn(s.body));
      case 'decl': this.mark(s.line); this.declStmt(s); return null;
      case 'expr': this.mark(s.line); this.eval(s.e); return null;
      case 'if': {
        this.mark(s.line);
        const c = this.truthy(this.eval(s.cond)); this.setCond(c);
        if (c) return this.exec(s.then);
        return s.els ? this.exec(s.els) : null;
      }
      case 'while': {
        for (;;) {
          this.mark(s.line); this.iters++;
          const c = this.truthy(this.eval(s.cond)); this.setCond(c);
          if (!c) return null;
          const sig = this.exec(s.body);
          if (sig?.t === 'break') return null;
          if (sig?.t === 'return') return sig;
        }
      }
      case 'dowhile': {
        for (;;) {
          this.iters++;
          const sig = this.exec(s.body);
          if (sig?.t === 'break') return null;
          if (sig?.t === 'return') return sig;
          this.mark(s.cond.line);
          const c = this.truthy(this.eval(s.cond)); this.setCond(c);
          if (!c) return null;
        }
      }
      case 'for': return this.scoped(() => {
        let first = true;
        for (;;) {
          if (first) {
            this.mark(s.line);
            if (s.init) { s.init.k === 'decl' ? this.declStmt(s.init) : this.eval(s.init.e); }
            first = false;
          } else {
            if (s.inc) this.eval(s.inc);
            this.mark(s.line);
          }
          this.iters++;
          const c = s.cond ? this.truthy(this.eval(s.cond)) : true; this.setCond(c);
          if (!c) return null;
          const sig = this.exec(s.body);
          if (sig?.t === 'break') return null;
          if (sig?.t === 'return') return sig;
        }
      });
      case 'foreach': return this.scoped(() => {
        const it = this.eval(s.iter); let isMap = false; let items: any[];
        if (typeof it === 'string') items = [...it].map(c => c.charCodeAt(0));
        else if (Array.isArray(it)) items = it;
        else if (it instanceof CMap) { if (it.kind === 'map') { isMap = true; items = it.keys().map(k => [k, it.get(k)]); } else items = it.keys(); }
        else throw new CppError('unsupported: range-for over this type', s.line, true);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (s.bind) s.bind.forEach((nm: string, k: number) => this.declare(nm, { base: this.guessBase(item[k]), args: [], ref: false }, copyVal(item[k])));
          else { const ty: Type = s.type.base === 'auto' ? { base: this.guessBase(item), args: [], ref: false } : s.type; this.declare(s.name, ty, this.coerce(ty, copyVal(item))); }
          this.mark(s.line); this.iters++;
          const sig = this.exec(s.body);
          if (s.type.ref) {
            if (s.bind) { const vals = s.bind.map((nm: string) => this.lookup(nm, s.line).v); if (isMap) (it as CMap).set(item[0], vals[1]); else if (Array.isArray(it)) it[i] = vals; }
            else if (Array.isArray(it)) it[i] = this.lookup(s.name, s.line).v;
          }
          if (sig?.t === 'break') return null;
          if (sig?.t === 'return') return sig;
        }
        return null;
      });
      case 'bind': {
        this.mark(s.line); let v = this.eval(s.init);
        if (v instanceof MapIter) v = [v.k, v.m.get(v.k)];
        if (!Array.isArray(v) || v.length < s.names.length) throw new CppError('error: cannot decompose this value in a structured binding', s.line);
        s.names.forEach((nm: string, k: number) => this.declare(nm, { base: this.guessBase(v[k]), args: [], ref: false }, copyVal(v[k])));
        return null;
      }
      case 'switch': {
        this.mark(s.line); const v = this.eval(s.e); let at = -1;
        for (let i = 0; i < s.cases.length && at < 0; i++) { const c = s.cases[i]; if (c.v && valEq(this.eval(c.v), v)) at = i; }
        if (at < 0) at = s.cases.findIndex((c: any) => !c.v);
        if (at < 0) return null;
        return this.scoped(() => { for (let i = at; i < s.cases.length; i++) { const sig = this.execBlockIn(s.cases[i].body); if (sig) return sig.t === 'break' ? null : sig; } return null; });
      }
      case 'return': {
        this.mark(s.line);
        const v = s.e ? this.eval(s.e, this.frame.fn.ret) : undefined;
        return { t: 'return', v: Array.isArray(v) ? copyVal(v) : v, line: s.line };
      }
      case 'break': this.mark(s.line); return BREAK;
      case 'continue': this.mark(s.line); return CONTINUE;
    }
    throw new CppError(`unsupported statement '${s.k}'`, s.line, true);
  }

  // ---------- expressions ----------
  num(v: any) { return typeof v === 'boolean' ? +v : v; }
  iterOp(op: string, a: any, b: any, line: number): any {
    if (op === '+' || op === '-') {
      if (a instanceof IterV && b instanceof IterV && op === '-') return a.i - b.i;
      if (a instanceof IterV) return new IterV(a.arr, a.i + (op === '+' ? 1 : -1) * toN(b), a.ref);
      if (b instanceof IterV && op === '+') return new IterV(b.arr, b.i + toN(a), b.ref);
    }
    if (a instanceof IterV && b instanceof IterV) {
      this.cmp++;
      switch (op) { case '==': return a.i === b.i; case '!=': return a.i !== b.i; case '<': return a.i < b.i; case '>': return a.i > b.i; case '<=': return a.i <= b.i; case '>=': return a.i >= b.i; }
    }
    throw new CppError(`unsupported operator '${op}' on iterators`, line, true);
  }
  bop(op: string, a: any, b: any, line: number): any {
    if (typeof a === 'string' && typeof b === 'number' && op === '+') return a + String.fromCharCode(b);
    if (typeof a === 'number' && typeof b === 'string' && op === '+') return String.fromCharCode(a) + b;
    if (typeof a === 'string' && typeof b === 'string') {
      switch (op) { case '+': return a + b; case '==': this.cmp++; return a === b; case '!=': this.cmp++; return a !== b; case '<': this.cmp++; return a < b; case '>': this.cmp++; return a > b; case '<=': this.cmp++; return a <= b; case '>=': this.cmp++; return a >= b; }
    }
    if (a instanceof IterV || b instanceof IterV) return this.iterOp(op, a, b, line);
    if (op === '==' || op === '!=') {
      if (a === null || b === null || a instanceof PNode || b instanceof PNode || a === END || b === END || a instanceof MapIter || b instanceof MapIter) {
        this.cmp++; const eq = a instanceof MapIter && b instanceof MapIter ? a.k === b.k && a.m === b.m : a === b; return op === '==' ? eq : !eq;
      }
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      this.cmp++; const c = cmpVals(a, b);
      switch (op) { case '==': return c === 0; case '!=': return c !== 0; case '<': return c < 0; case '>': return c > 0; case '<=': return c <= 0; case '>=': return c >= 0; }
    }
    if ((op === '/' || op === '%') && !(a instanceof Dbl || b instanceof Dbl) && toN(b) === 0)
      throw new RuntimeError(op === '/' ? 'Division by zero (undefined behavior in C++)' : 'Modulo by zero (undefined behavior in C++)', line);
    if (op === '==' || op === '!=' || op === '<' || op === '>' || op === '<=' || op === '>=') this.cmp++;
    try { return arith(op, a, b); } catch (err: any) { throw new CppError(`unsupported: ${err.message}`, line, true); }
  }
  checkIdx(arr: any[] | string, i: number, line: number) {
    if (!Number.isInteger(i) || i < 0 || i >= arr.length)
      throw new RuntimeError(`Index ${i} out of bounds for size ${arr.length} (undefined behavior in C++)`, line);
  }
  getRef(e: Node): { get(): any; set(v: any): void } {
    if (e.k === 'id') { const c = this.lookup(e.name, e.line); return { get: () => c.v, set: v => { c.v = this.coerce(c.type, copyVal(v)); } }; }
    if (e.k === 'idx') {
      const base = this.eval(e.obj), i = this.eval(e.i);
      if (typeof base === 'string') {
        const br = this.getRef(e.obj);
        this.checkIdx(base, i, e.line);
        return { get: () => base.charCodeAt(i), set: v => br.set(base.slice(0, i) + String.fromCharCode(v) + base.slice(i + 1)) };
      }
      if (Array.isArray(base)) { this.checkIdx(base, i, e.line); return { get: () => base[i], set: v => { base[i] = copyVal(v); } }; }
      if (base instanceof CMap) {
        this.mapOps++;
        const ensure = () => { if (!base.has(i)) base.set(i, base.valType ? this.defaultOf(base.valType) : 0); return base.get(i); };
        return { get: ensure, set: v => { ensure(); base.set(i, copyVal(v)); } };
      }
    }
    if (e.k === 'mem') {
      const n = this.eval(e.obj);
      if (e.name === 'first' || e.name === 'second') {
        const k = e.name === 'first' ? 0 : 1;
        if (Array.isArray(n)) return { get: () => n[k], set: v => { n[k] = copyVal(v); } };
        if (n instanceof MapIter) return k === 0 ? { get: () => n.k, set: () => { throw new CppError('error: cannot assign to a map key', e.line); } } : { get: () => n.m.get(n.k), set: v => { n.m.set(n.k, copyVal(v)); } };
        if (n instanceof IterV && Array.isArray(n.arr)) { const el = n.arr[n.i]; return { get: () => el[k], set: v => { el[k] = copyVal(v); } }; }
        throw new CppError(`unsupported: .${e.name} on this value`, e.line, true);
      }
      if (!['val', 'next', 'left', 'right', 'prev', 'random', 'bottom'].includes(e.name)) throw new CppError(`unsupported: member '${e.arrow ? '->' : '.'}${e.name}'`, e.line, true);
      if (!(n instanceof PNode)) throw new RuntimeError(`Null pointer dereference: ->${e.name} on nullptr (segmentation fault in C++)`, e.line);
      return { get: () => (n as any)[e.name], set: v => { (n as any)[e.name] = v; } };
    }
    if (e.k === 'mcall' && (e.name === 'back' || e.name === 'front')) {
      const arr = this.eval(e.obj);
      if (!arr.length) throw new RuntimeError(`${e.name}() on empty vector (undefined behavior in C++)`, e.line);
      const k = e.name === 'back' ? arr.length - 1 : 0;
      return { get: () => arr[k], set: v => { arr[k] = copyVal(v); } };
    }
    return { get: () => this.eval(e), set: () => { throw new CppError('error: lvalue required as left operand of assignment', e.line); } };
  }
  eval(e: Node, hint?: Type): any {
    switch (e.k) {
      case 'num': return e.dbl ? new Dbl(e.v) : e.v;
      case 'bool': case 'str': return e.v;
      case 'null': return null;
      case 'lambda': return new Lambda(e.def, [...this.frame.scopes]);
      case 'deref': {
        const v = this.eval(e.e);
        if (v instanceof IterV) { if (v.i < 0 || v.i >= v.arr.length) throw new RuntimeError('Dereferencing an iterator outside its range (undefined behavior in C++)', e.line); return typeof v.arr === 'string' ? v.arr.charCodeAt(v.i) : v.arr[v.i]; }
        if (v instanceof MapIter) return v.m.kind === 'set' ? v.k : [v.k, v.m.get(v.k)];
        if (v === END) throw new RuntimeError('Dereferencing end() is undefined behavior in C++', e.line);
        throw new CppError('unsupported: dereferencing this value', e.line, true);
      }
      case 'new': {
        if (e.name !== 'ListNode' && e.name !== 'TreeNode') throw new CppError(`unsupported: new ${e.name}`, e.line, true);
        const a = e.args.map((x: Node) => this.eval(x));
        const n = this.mkNode(e.name, a[0] ?? 0);
        if (e.name === 'ListNode' && a.length > 1) n.next = a[1];
        if (e.name === 'TreeNode' && a.length > 2) { n.left = a[1]; n.right = a[2]; }
        return n;
      }
      case 'id': return this.lookup(e.name, e.line).v;
      case 'seq': { let r; for (const x of e.items) r = this.eval(x); return r; }
      case 'bin': {
        if (e.op === '&&') return this.truthy(this.eval(e.l)) && this.truthy(this.eval(e.r));
        if (e.op === '||') return this.truthy(this.eval(e.l)) || this.truthy(this.eval(e.r));
        return this.bop(e.op, this.eval(e.l), this.eval(e.r), e.line);
      }
      case 'un': {
        const v = this.eval(e.e);
        if (e.op === '!') return !truthy(v);
        if (e.op === '-') return v instanceof Dbl ? new Dbl(-v.v) : typeof v === 'bigint' ? norm(-v) : -this.num(v);
        if (e.op === '~') return typeof v === 'bigint' ? norm(~v) : -this.num(v) - 1;
        return this.num(v);
      }
      case 'cast': {
        const v = this.eval(e.e); const b = e.type.base;
        if (b === 'bool') return truthy(v);
        if (b === 'double' || b === 'float') return new Dbl(toN(v));
        if (b === 'int' || b === 'short' || b === 'long' || b === 'char' || b === 'size_t') return this.coerce(e.type, v);
        return v;
      }
      case 'pre': case 'post': {
        const r = this.getRef(e.e); const old = r.get(); const step = e.op === '++' ? 1 : -1;
        if (old instanceof IterV) { const nv = new IterV(old.arr, old.i + step, old.ref); r.set(nv); return e.k === 'pre' ? nv : old; }
        if (old instanceof MapIter) { const ks = old.m.keys(); const nk = ks[ks.findIndex(k => cmpVals(k, old.k) === 0) + step]; const nv = nk === undefined ? END : new MapIter(old.m, nk); r.set(nv); return e.k === 'pre' ? nv : old; }
        const nv = this.bop(step === 1 ? '+' : '-', old, 1, e.line); r.set(nv);
        return e.k === 'pre' ? r.get() : old;
      }
      case 'assign': {
        const rv = this.eval(e.r);
        const ref = this.getRef(e.l);
        if (e.op === '=') { ref.set(rv); return rv; }
        const nv = this.bop(e.op.slice(0, -1), ref.get(), rv, e.line);
        ref.set(nv); return nv;
      }
      case 'cond': return this.truthy(this.eval(e.c)) ? this.eval(e.a) : this.eval(e.b);
      case 'idx': return this.getRef(e).get();
      case 'init': {
        if (hint?.base === 'pair') return [this.coerce(hint.args[0], this.eval(e.items[0], hint.args[0])), this.coerce(hint.args[1], this.eval(e.items[1], hint.args[1]))];
        const el = hint?.args?.[0];
        const items = e.items.map((x: Node) => this.eval(x, el));
        return el && el.base !== 'auto' ? items.map((x: any) => this.coerce(el, x)) : items;
      }
      case 'ctor': return this.construct(e.type, e.args.map((a: Node) => this.eval(a)));
      case 'call': return this.callByName(e);
      case 'mcall': return this.method(e);
      case 'mem': return this.getRef(e).get();
    }
    throw new CppError(`unsupported expression '${e.k}'`, e.line, true);
  }
  callByName(e: Node): any {
    const fn = this.fns[e.name];
    if (fn) {
      const args = e.args.map((a: Node, i: number) => {
        const p = fn.params[i];
        if (p?.type.ref && (a.k === 'id' || a.k === 'idx')) {
          const r = this.getRef(a);
          const cur = r.get();
          if (typeof cur === 'object' && !(cur instanceof Dbl)) return { v: cur };
          const cell: Cell = { get v() { return r.get(); }, set v(x) { r.set(x); }, type: p.type } as any;
          return { v: cur, cell };
        }
        return { v: this.eval(a, p?.type) };
      });
      return this.callFn(fn, args, e.line);
    }
    try { const c = this.lookup(e.name, e.line); if (c.v instanceof Lambda || c.v instanceof FnRef) return this.callValue(c.v, e.args.map((x: Node) => this.eval(x)), e.line); } catch (err) { if (!(err instanceof CppError)) throw err; }
    return this.builtin(e);
  }
  callValue(f: any, args: any[], line: number): any {
    if (f instanceof Lambda) return this.callLambda(f, args, line);
    if (f instanceof FnRef) return this.callFn(this.fns[f.name], args.map(v => ({ v })), line);
    throw new CppError('error: this value is not callable', line);
  }
  callLambda(l: Lambda, args: any[], line: number) {
    const def = l.def; if (this.frames.length >= MAX_DEPTH) throw new RuntimeError('Stack overflow (recursion too deep)', line);
    const scope = new Map<string, Cell>();
    def.params.forEach((p: any, i: number) => scope.set(p.name, { v: this.coerce(p.type, p.type.ref ? args[i] : copyVal(args[i])), type: p.type }));
    this.frames.push({ id: ++this.callCounter, fn: def, scopes: [...l.captured, scope], line: def.line });
    this.quiet++;
    try { const sig = this.execBlockIn(def.body.body); return sig && sig.t === 'return' ? sig.v : undefined; } finally { this.quiet--; this.frames.pop(); }
  }
  rangeArgs(a: Node[], line: number) {
    const f = this.eval(a[0]), l = this.eval(a[1]);
    if (!(f instanceof IterV) || !(l instanceof IterV)) throw new CppError('unsupported: algorithm over a range that is not made of vector/string iterators', line, true);
    const isStr = typeof f.arr === 'string';
    const arr: any[] = isStr ? [...(f.arr as string)].map(c => c.charCodeAt(0)) : (f.arr as any[]);
    return { arr, lo: f.i, hi: l.i, last: l, commit: () => { if (isStr && f.ref) f.ref.set(String.fromCharCode(...arr)); } };
  }
  builtin(e: Node): any {
    const a = e.args, line = e.line; const ev = (k: number) => this.eval(a[k]);
    const dbl = (x: number) => new Dbl(x);
    const pick = (x: any, y: any, wantMax: boolean) => { this.cmp++; const c = cmpVals(x, y); return wantMax ? (c >= 0 ? x : y) : (c <= 0 ? x : y); };
    switch (e.name) {
      case 'max': case 'min': {
        const w = e.name === 'max';
        if (a.length === 1 && a[0].k === 'init') { const xs = ev(0) as any[]; return xs.reduce((p, q) => pick(p, q, w)); }
        return pick(ev(0), ev(1), w);
      }
      case 'abs': case 'labs': case 'llabs': { const v = ev(0); return v instanceof Dbl ? dbl(Math.abs(v.v)) : typeof v === 'bigint' ? norm(v < 0n ? -v : v) : Math.abs(toN(v)); }
      case 'fabs': return dbl(Math.abs(toN(ev(0))));
      case 'sqrt': return dbl(Math.sqrt(toN(ev(0)))); case 'pow': return dbl(Math.pow(toN(ev(0)), toN(ev(1))));
      case 'floor': return dbl(Math.floor(toN(ev(0)))); case 'ceil': return dbl(Math.ceil(toN(ev(0)))); case 'round': return dbl(Math.round(toN(ev(0))));
      case 'log': return dbl(Math.log(toN(ev(0)))); case 'log2': return dbl(Math.log2(toN(ev(0)))); case 'log10': return dbl(Math.log10(toN(ev(0)))); case 'exp': return dbl(Math.exp(toN(ev(0))));
      case 'swap': { const r1 = this.getRef(a[0]), r2 = this.getRef(a[1]); const t = copyVal(r1.get()); r1.set(r2.get()); r2.set(t); return undefined; }
      case 'gcd': case '__gcd': { let x = Math.abs(toN(ev(0))), y = Math.abs(toN(ev(1))); while (y) [x, y] = [y, x % y]; return x; }
      case 'lcm': { const x = Math.abs(toN(ev(0))), y = Math.abs(toN(ev(1))); let g = x, h = y; while (h) [g, h] = [h, g % h]; return g ? (x / g) * y : 0; }
      case 'make_pair': return [ev(0), ev(1)];
      case 'to_string': { const v = ev(0); return v instanceof Dbl ? v.v.toFixed(6) : String(v); }
      case 'stoi': case 'stol': case 'stoll': case 'atoi': { const s = ev(0) as string; if (!/^\s*[+-]?\d+/.test(s)) throw new RuntimeError('stoi: invalid argument (throws std::invalid_argument)', line); return parseInt(s, 10); }
      case 'isalpha': { const c = toN(ev(0)); return (c >= 65 && c <= 90) || (c >= 97 && c <= 122); }
      case 'isdigit': { const c = toN(ev(0)); return c >= 48 && c <= 57; }
      case 'isalnum': { const c = toN(ev(0)); return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122); }
      case 'islower': { const c = toN(ev(0)); return c >= 97 && c <= 122; } case 'isupper': { const c = toN(ev(0)); return c >= 65 && c <= 90; }
      case 'isspace': { const c = toN(ev(0)); return c === 32 || (c >= 9 && c <= 13); }
      case 'tolower': { const c = toN(ev(0)); return c >= 65 && c <= 90 ? c + 32 : c; } case 'toupper': { const c = toN(ev(0)); return c >= 97 && c <= 122 ? c - 32 : c; }
      case '__builtin_popcount': case '__builtin_popcountll': { let x = BigInt.asUintN(e.name.endsWith('ll') ? 64 : 32, BigInt(typeof ev(0) === 'bigint' ? ev(0) : toN(ev(0)))); let c = 0; while (x) { c += Number(x & 1n); x >>= 1n; } return c; }
      case '__builtin_ctz': { let x = toN(ev(0)) >>> 0; if (!x) return 32; let c = 0; while (!(x & 1)) { x >>>= 1; c++; } return c; }
      case '__builtin_clz': { const x = toN(ev(0)) >>> 0; return x ? Math.clz32(x) : 32; }
      case 'sort': case 'stable_sort': {
        const r = this.rangeArgs(a, line); const seg = r.arr.slice(r.lo, r.hi);
        let less: ((x: any, y: any) => boolean) | null = null; let quiet = false;
        if (a[2]) { if (a[2].k === 'ctor' && a[2].type.base === 'greater') less = (x, y) => cmpVals(x, y) > 0; else if (a[2].k === 'ctor' && a[2].type.base === 'less') less = null; else { const f = ev(2); less = (x, y) => truthy(this.callValue(f, [x, y], line)); quiet = true; } }
        if (quiet) this.quiet++;
        try { seg.sort((x, y) => { this.cmp++; return less ? (less(x, y) ? -1 : less(y, x) ? 1 : 0) : cmpVals(x, y); }); } finally { if (quiet) this.quiet--; }
        seg.forEach((v, k) => { r.arr[r.lo + k] = v; }); r.commit(); return undefined;
      }
      case 'reverse': { const r = this.rangeArgs(a, line); const seg = r.arr.slice(r.lo, r.hi).reverse(); seg.forEach((v, k) => { r.arr[r.lo + k] = v; }); r.commit(); return undefined; }
      case 'fill': { const r = this.rangeArgs(a, line); const v = ev(2); for (let k = r.lo; k < r.hi; k++) r.arr[k] = copyVal(v); r.commit(); return undefined; }
      case 'iota': { const r = this.rangeArgs(a, line); let v = ev(2); for (let k = r.lo; k < r.hi; k++) { r.arr[k] = v; v = this.bop('+', v, 1, line); } return undefined; }
      case 'accumulate': { const r = this.rangeArgs(a, line); let acc = ev(2); for (let k = r.lo; k < r.hi; k++) acc = this.bop('+', acc, r.arr[k], line); return acc; }
      case 'max_element': case 'min_element': { const r = this.rangeArgs(a, line); if (r.lo >= r.hi) return r.last; let best = r.lo; for (let k = r.lo + 1; k < r.hi; k++) { this.cmp++; const c = cmpVals(r.arr[k], r.arr[best]); if (e.name === 'max_element' ? c > 0 : c < 0) best = k; } return new IterV(r.last.arr, best, r.last.ref); }
      case 'count': { const r = this.rangeArgs(a, line); const x = ev(2); let c = 0; for (let k = r.lo; k < r.hi; k++) if (valEq(r.arr[k], x)) c++; return c; }
      case 'find': { const r = this.rangeArgs(a, line); const x = ev(2); for (let k = r.lo; k < r.hi; k++) { this.cmp++; if (valEq(r.arr[k], x)) return new IterV(r.last.arr, k, r.last.ref); } return r.last; }
      case 'lower_bound': case 'upper_bound': case 'binary_search': {
        const r = this.rangeArgs(a, line); const x = ev(2); let lo = r.lo, hi = r.hi; const upper = e.name === 'upper_bound';
        while (lo < hi) { const mid = (lo + hi) >> 1; this.cmp++; const c = cmpVals(r.arr[mid], x); if (upper ? c <= 0 : c < 0) lo = mid + 1; else hi = mid; }
        if (e.name === 'binary_search') return lo < r.hi && cmpVals(r.arr[lo], x) === 0;
        return new IterV(r.last.arr, lo, r.last.ref);
      }
      case 'unique': { const r = this.rangeArgs(a, line); if (r.lo >= r.hi) return r.last; let w = r.lo; for (let k = r.lo + 1; k < r.hi; k++) if (!valEq(r.arr[k], r.arr[w])) r.arr[++w] = r.arr[k]; r.commit(); return new IterV(r.last.arr, w + 1, r.last.ref); }
      case 'is_sorted': { const r = this.rangeArgs(a, line); for (let k = r.lo + 1; k < r.hi; k++) if (cmpVals(r.arr[k - 1], r.arr[k]) > 0) return false; return true; }
      case 'next_permutation': case 'prev_permutation': {
        const r = this.rangeArgs(a, line); const x = r.arr; const nx = e.name === 'next_permutation'; const cmp = (p: any, q: any) => (nx ? cmpVals(p, q) : cmpVals(q, p));
        let i = r.hi - 2; while (i >= r.lo && cmp(x[i], x[i + 1]) >= 0) i--;
        if (i < r.lo) { const seg = x.slice(r.lo, r.hi).reverse(); seg.forEach((v, k) => { x[r.lo + k] = v; }); r.commit(); return false; }
        let j = r.hi - 1; while (cmp(x[j], x[i]) <= 0) j--;
        [x[i], x[j]] = [x[j], x[i]]; const seg = x.slice(i + 1, r.hi).reverse(); seg.forEach((v, k) => { x[i + 1 + k] = v; }); r.commit(); return true;
      }
    }
    throw new CppError(`error: '${e.name}' was not declared in this scope (or is not supported by the tracer yet)`, e.line, true);
  }
  method(e: Node): any {
    const obj = this.eval(e.obj);
    const a = e.args.map((x: Node) => this.eval(x));
    const n = e.name;
    if (typeof obj === 'string') {
      switch (n) {
        case 'size': case 'length': return obj.length;
        case 'empty': return obj.length === 0;
        case 'substr': { const st = toN(a[0] ?? 0); if (st > obj.length || st < 0) throw new RuntimeError(`substr: position ${st} is out of range (throws std::out_of_range)`, e.line); return obj.substr(st, a.length > 1 ? toN(a[1]) : undefined); }
        case 'find': { const x = typeof a[0] === 'number' ? String.fromCharCode(a[0]) : a[0]; return obj.indexOf(x, a.length > 1 ? toN(a[1]) : 0); }
        case 'rfind': { const x = typeof a[0] === 'number' ? String.fromCharCode(a[0]) : a[0]; return obj.lastIndexOf(x); }
        case 'append': this.getRef(e.obj).set(obj + (typeof a[0] === 'number' ? String.fromCharCode(a[0]) : a[0])); return undefined;
        case 'compare': return obj < a[0] ? -1 : obj > a[0] ? 1 : 0;
        case 'clear': this.getRef(e.obj).set(''); return undefined;
        case 'c_str': return obj;
        case 'at': this.checkIdx(obj, a[0], e.line); return obj.charCodeAt(a[0]);
        case 'begin': return new IterV(obj, 0, this.getRef(e.obj)); case 'end': return new IterV(obj, obj.length, this.getRef(e.obj));
        case 'push_back': this.getRef(e.obj).set(obj + String.fromCharCode(a[0])); return undefined;
        case 'pop_back': if (!obj.length) throw new RuntimeError('pop_back() on empty string (undefined behavior in C++)', e.line); this.getRef(e.obj).set(obj.slice(0, -1)); return undefined;
        case 'back': return obj.charCodeAt(obj.length - 1);
        case 'front': return obj.charCodeAt(0);
      }
    } else if (Array.isArray(obj)) {
      switch (n) {
        case 'size': return obj.length;
        case 'empty': return obj.length === 0;
        case 'push_back': obj.push(copyVal(a[0])); return undefined;
        case 'emplace_back': obj.push(a.length > 1 ? copyVal(a) : copyVal(a[0])); return undefined;
        case 'begin': return new IterV(obj, 0); case 'end': return new IterV(obj, obj.length);
        case 'reserve': case 'shrink_to_fit': return undefined;
        case 'assign': { const el = a.length > 1 ? a[1] : 0; obj.length = 0; for (let k = 0; k < toN(a[0]); k++) obj.push(copyVal(el)); return undefined; }
        case 'swap': { const other = a[0] as any[]; const t = obj.splice(0, obj.length, ...other); other.splice(0, other.length, ...t); return undefined; }
        case 'insert': { const it = a[0]; if (!(it instanceof IterV)) throw new CppError('unsupported: insert needs an iterator position', e.line, true); if (a.length >= 3 && typeof a[1] === 'number') obj.splice(it.i, 0, ...Array.from({ length: a[1] }, () => copyVal(a[2]))); else obj.splice(it.i, 0, copyVal(a[1])); return undefined; }
        case 'erase': {
          const f = a[0]; if (!(f instanceof IterV)) throw new CppError('unsupported: erase needs an iterator', e.line, true);
          if (a[1] instanceof IterV) { const l = a[1].i; if (f.i < 0 || l > obj.length || f.i > l) throw new RuntimeError('erase() with an invalid iterator range (undefined behavior in C++)', e.line); obj.splice(f.i, l - f.i); return undefined; }
          if (f.i < 0 || f.i >= obj.length) throw new RuntimeError('erase() with an invalid iterator (undefined behavior in C++)', e.line);
          obj.splice(f.i, 1); return undefined;
        }
        case 'pop_back': if (!obj.length) throw new RuntimeError('pop_back() on empty vector (undefined behavior in C++)', e.line); obj.pop(); return undefined;
        case 'back': case 'front': return this.getRef(e).get();
        case 'clear': obj.length = 0; return undefined;
        case 'resize': { const el = { base: 'int', args: [], ref: false }; while (obj.length < a[0]) obj.push(a.length > 1 ? copyVal(a[1]) : this.defaultOf(el)); obj.length = a[0]; return undefined; }
        case 'at': this.checkIdx(obj, a[0], e.line); return obj[a[0]];
      }
    } else if (obj instanceof CSeq) {
      const q = obj, bad = (m: string) => new RuntimeError(`${m} on empty ${q.kind} (undefined behavior in C++)`, e.line);
      switch (n) {
        case 'size': return q.a.length;
        case 'empty': return q.a.length === 0;
        case 'push': case 'emplace': { const v = n === 'emplace' && a.length > 1 ? [...a] : a[0]; if (q.kind === 'pq') q.hpush(copyVal(v)); else q.a.push(copyVal(v)); this.mapOps++; return undefined; }
        case 'push_back': q.a.push(copyVal(a[0])); return undefined;
        case 'push_front': q.a.unshift(copyVal(a[0])); return undefined;
        case 'pop': if (!q.a.length) throw bad('pop()'); this.mapOps++; if (q.kind === 'pq') q.hpop(); else if (q.kind === 'stack') q.a.pop(); else q.a.shift(); return undefined;
        case 'pop_back': if (!q.a.length) throw bad('pop_back()'); q.a.pop(); return undefined;
        case 'pop_front': if (!q.a.length) throw bad('pop_front()'); q.a.shift(); return undefined;
        case 'top': if (!q.a.length) throw bad('top()'); return q.kind === 'stack' ? q.a[q.a.length - 1] : q.a[0];
        case 'front': if (!q.a.length) throw bad('front()'); return q.a[0];
        case 'back': if (!q.a.length) throw bad('back()'); return q.a[q.a.length - 1];
        case 'clear': q.a.length = 0; return undefined;
      }
    } else if (obj instanceof CMap) {
      this.mapOps++;
      const ks = () => obj.keys();
      switch (n) {
        case 'size': return obj.size;
        case 'empty': return obj.size === 0;
        case 'count': return obj.has(a[0]) ? 1 : 0;
        case 'contains': return obj.has(a[0]);
        case 'find': return obj.has(a[0]) ? new MapIter(obj, a[0]) : END;
        case 'end': return END;
        case 'begin': { const k = ks(); return k.length ? new MapIter(obj, k[0]) : END; }
        case 'rbegin': { const k = ks(); return k.length ? new MapIter(obj, k[k.length - 1]) : END; }
        case 'lower_bound': case 'upper_bound': { const k = ks().find(x => (n === 'lower_bound' ? cmpVals(x, a[0]) >= 0 : cmpVals(x, a[0]) > 0)); return k === undefined ? END : new MapIter(obj, k); }
        case 'erase': { if (a[0] instanceof MapIter) { obj.del(a[0].k); return undefined; } return obj.del(a[0]) ? 1 : 0; }
        case 'clear': obj.clear(); return undefined;
        case 'insert': case 'emplace':
          if (obj.kind === 'set') { obj.set(a[0], true); return undefined; }
          { const kv = n === 'emplace' && a.length > 1 ? a : a[0]; if (!Array.isArray(kv)) break; if (!obj.has(kv[0])) obj.set(kv[0], copyVal(kv[1])); return undefined; }
        case 'at': if (!obj.has(a[0])) throw new RuntimeError('map::at key not found (throws std::out_of_range)', e.line); return obj.get(a[0]);
      }
    }
    throw new CppError(`unsupported: method '.${n}()' on this type`, e.line, true);
  }
}

function toCpp(it: Interp, v: any, t: Type): any {
  if (t.ptr && t.base === 'ListNode') {
    if (v && !Array.isArray(v) && Array.isArray(v.cols)) { // flatten input: columns linked by next, each column's nodes linked by bottom
      let head: PNode | null = null, prevHead: PNode | null = null;
      for (const col of v.cols as number[][]) { let top: PNode | null = null, tail: PNode | null = null; for (const x of col) { const n = it.mkNode('ListNode', x); if (tail) tail.bottom = n; else top = n; tail = n; } if (top) { if (prevHead) prevHead.next = top; else head = top; prevHead = top; } }
      return head;
    }
    const vals: number[] = Array.isArray(v) ? v : v?.list ?? []; const pos: number = Array.isArray(v) ? -1 : v?.pos ?? -1;
    let head: PNode | null = null, tail: PNode | null = null; const nodes: PNode[] = [];
    for (const x of vals) { const n = it.mkNode('ListNode', x); nodes.push(n); if (tail) { tail.next = n; if (it.dll) n.prev = tail; } else head = n; tail = n; }
    if (tail && pos >= 0 && pos < nodes.length) tail.next = nodes[pos];
    if (v && !Array.isArray(v) && Array.isArray(v.random)) (v.random as number[]).forEach((r, i) => { if (r >= 0 && r < nodes.length) nodes[i].random = nodes[r]; });
    if (v && !Array.isArray(v) && v.share) { // a chain shared between two arguments (intersection problems)
      const id = String(v.share.id); if (!it.sharedChains.has(id)) { let sh: PNode | null = null, st: PNode | null = null; for (const x of v.share.list as number[]) { const n = it.mkNode('ListNode', x); if (st) { st.next = n; n.prev = st; } else sh = n; st = n; } it.sharedChains.set(id, sh); }
      const sh = it.sharedChains.get(id) ?? null; if (tail) tail.next = sh; else head = sh;
    }
    return head;
  }
  if (t.ptr && t.base === 'TreeNode') {
    const arr: (number | null)[] = v ?? []; if (!arr.length || arr[0] === null) return null;
    const root = it.mkNode('TreeNode', arr[0]!); const q: PNode[] = [root]; let i = 1;
    for (let k = 0; k < q.length && i < arr.length; k++) {
      const n = q[k];
      if (i < arr.length && arr[i] !== null) { n.left = it.mkNode('TreeNode', arr[i]!); q.push(n.left); } i++;
      if (i < arr.length && arr[i] !== null) { n.right = it.mkNode('TreeNode', arr[i]!); q.push(n.right); } i++;
    }
    return root;
  }
  if (Array.isArray(v)) { if (t.base === 'pair') return v.map((x, k) => toCpp(it, x, t.args[k] ?? t)); return v.map(x => toCpp(it, x, t.args[0] ?? t)); }
  if (typeof v === 'string' && t.base === 'char') return v.charCodeAt(0);
  if (typeof v === 'number' && (t.base === 'double' || t.base === 'float')) return new Dbl(v);
  if (typeof v === 'number' && !Number.isSafeInteger(v) && t.base === 'long') return BigInt(v);
  return v;
}

export function runCpp(src: string, fnName: string, args: any[], opts: RunOpts): RunResult {
  const it = new Interp(opts.trace, opts.maxEvents ?? 6000, opts.maxSteps ?? 4_000_000); it.dll = !!opts.dll;
  const fin = (extra: Partial<RunResult>): RunResult => ({
    ok: false, events: it.events, truncated: it.truncated,
    stats: { comparisons: it.cmp, calls: it.calls, loopIterations: it.iters, mapOps: it.mapOps, steps: it.steps, maxDepth: it.maxDepth },
    ...extra,
  });
  try {
    const prog = parse(src);
    it.fns = prog.fns;
    const fn = prog.fns[fnName];
    if (!fn) return fin({ error: `error: function '${fnName}' not found. Keep the signature the problem expects.`, errorKind: 'compile', errorLine: 1 });
    const a = args.map((x, i) => toCpp(it, copyVal(x), fn.params[i]?.type ?? { base: 'int', args: [], ref: false }));
    // globals evaluated in a synthetic frame
    it.frames.push({ id: 0, fn, scopes: [new Map()], line: 1 });
    for (const g of prog.globals) it.declStmt(g);
    it.frames[0].scopes[0].forEach((c, k) => it.globals.set(k, c));
    it.frames.pop();
    const result = it.callFn(fn, a.map(v => ({ v })), fn.line);
    return fin({ ok: true, result: fn.ret.ptr && result === null ? [] : toJSON(result, it.dll), args: a.map(x => toJSON(x, it.dll)) });
  } catch (e: any) {
    if (e instanceof CppError) return fin({ error: e.message, errorLine: e.line, errorKind: e.unsupported ? 'unsupported' : 'compile' });
    if (e instanceof RuntimeError) return fin({ error: e.message, errorLine: e.line, errorKind: e.message.startsWith('Time limit') ? 'timeout' : 'runtime' });
    if (e instanceof RangeError) return fin({ error: 'Stack overflow (recursion too deep)', errorKind: 'runtime' });
    throw e;
  }
}
