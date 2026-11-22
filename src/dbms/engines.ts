// DBMS simulation engines (pure logic). Simplified educational models.

// ------------------------------------------------------------------ functional dependencies & normalization
export type FD = { lhs: string[]; rhs: string[] };
const uniq = (a: string[]) => [...new Set(a)].sort();
export const fd = (l: string, r: string): FD => ({ lhs: uniq(l.split(/[ ,]+/).filter(Boolean)), rhs: uniq(r.split(/[ ,]+/).filter(Boolean)) });
export const fmtFD = (f: FD) => `${f.lhs.join(',')} → ${f.rhs.join(',')}`;
const subset = (a: string[], b: string[]) => a.every(x => b.includes(x));

export function closure(attrs: string[], fds: FD[]): string[] {
  let c = uniq(attrs), changed = true;
  while (changed) { changed = false; for (const f of fds) if (subset(f.lhs, c) && !subset(f.rhs, c)) { c = uniq([...c, ...f.rhs]); changed = true; } }
  return c;
}
export const isSuperkey = (x: string[], R: string[], fds: FD[]) => subset(R, closure(x, fds));

export function candidateKeys(R: string[], fds: FD[]): string[][] {
  const keys: string[][] = [];
  const n = R.length;
  const masks = Array.from({ length: (1 << n) - 1 }, (_, i) => i + 1).sort((a, b) => popcount(a) - popcount(b));
  for (const m of masks) {
    const s = R.filter((_, i) => m >> i & 1);
    if (keys.some(k => subset(k, s))) continue;
    if (isSuperkey(s, R, fds)) keys.push(s);
  }
  return keys;
}
const popcount = (x: number) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };

export interface NFReport { keys: string[][]; prime: string[]; nf2: boolean; nf3: boolean; bcnf: boolean; violations: { form: '2NF' | '3NF' | 'BCNF'; fd: string; why: string }[]; highest: string }
/** Assumes the relation is in 1NF (atomic values). */
export function analyze(R: string[], fdsIn: FD[]): NFReport {
  const fds = fdsIn.map(f => ({ lhs: f.lhs, rhs: f.rhs.filter(a => !f.lhs.includes(a)) })).filter(f => f.rhs.length);
  const keys = candidateKeys(R, fds); const prime = uniq(keys.flat());
  const violations: NFReport['violations'] = [];
  for (const f of fds) for (const a of f.rhs) {
    const nonPrime = !prime.includes(a);
    const partial = nonPrime && keys.some(k => subset(f.lhs, k) && f.lhs.length < k.length);
    if (partial) violations.push({ form: '2NF', fd: fmtFD({ lhs: f.lhs, rhs: [a] }), why: `${a} depends on only part of candidate key ${keys.find(k => subset(f.lhs, k))!.join('')} (partial dependency).` });
    if (!isSuperkey(f.lhs, R, fds) && nonPrime && !partial) violations.push({ form: '3NF', fd: fmtFD({ lhs: f.lhs, rhs: [a] }), why: `${f.lhs.join('')} is not a superkey and ${a} is not a prime attribute (transitive dependency).` });
    if (!isSuperkey(f.lhs, R, fds)) violations.push({ form: 'BCNF', fd: fmtFD({ lhs: f.lhs, rhs: [a] }), why: `${f.lhs.join('')} is not a superkey.` });
  }
  const has = (x: string) => violations.some(v => v.form === x);
  const nf2 = !has('2NF'), nf3 = nf2 && !has('3NF') , bcnf = !has('BCNF');
  // a relation in BCNF is in 3NF is in 2NF; 3NF check must also exclude partial deps (done through nf2)
  const highest = bcnf ? 'BCNF' : nf3 ? '3NF' : nf2 ? '2NF' : '1NF';
  return { keys, prime, nf2, nf3, bcnf, violations, highest };
}

export const projectFDs = (attrs: string[], fds: FD[]): FD[] => {
  const out: FD[] = []; const n = attrs.length;
  for (let m = 1; m < 1 << n; m++) { const x = attrs.filter((_, i) => m >> i & 1); const rhs = closure(x, fds).filter(a => attrs.includes(a) && !x.includes(a)); if (rhs.length) out.push({ lhs: x, rhs }); }
  return out;
};

/** Chase test for lossless-join decomposition. */
export function isLossless(R: string[], parts: string[][], fds: FD[]): boolean {
  const rows = parts.map((p, i) => R.map(a => (p.includes(a) ? 'a' + a : `b${i}${a}`)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of fds) for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      if (f.lhs.every(a => rows[i][R.indexOf(a)] === rows[j][R.indexOf(a)])) for (const b of f.rhs) {
        const ci = R.indexOf(b); const x = rows[i][ci], y = rows[j][ci];
        if (x !== y) { const keep = x.startsWith('a') ? x : y.startsWith('a') ? y : x < y ? x : y, drop = keep === x ? y : x; rows.forEach(r => { if (r[ci] === drop) r[ci] = keep; }); changed = true; }
      }
    }
  }
  return rows.some(r => r.every((c, k) => c === 'a' + R[k]));
}
export function preservesDependencies(parts: string[][], fds: FD[]): { preserved: boolean; lost: FD[] } {
  const lost = fds.filter(f => {
    let z = [...f.lhs], changed = true;
    while (changed) { changed = false; for (const p of parts) { const gain = closure(z.filter(a => p.includes(a)), fds).filter(a => p.includes(a)); const nz = uniq([...z, ...gain]); if (nz.length !== z.length) { z = nz; changed = true; } } }
    return !subset(f.rhs, z);
  });
  return { preserved: lost.length === 0, lost };
}
/** Standard BCNF decomposition (lossless; may lose dependencies). */
export function bcnfDecompose(R: string[], fds: FD[]): string[][] {
  const out: string[][] = [];
  const go = (r: string[]) => {
    const local = projectFDs(r, fds);
    const bad = local.find(f => !isSuperkey(f.lhs, r, local));
    if (!bad) { out.push(r); return; }
    const x = bad.lhs, xp = closure(x, fds).filter(a => r.includes(a));
    go(uniq(xp)); go(uniq([...x, ...r.filter(a => !xp.includes(a))]));
  };
  go(uniq(R)); return out;
}

// ---- data-level checks for the normalization lab
export type Row = Record<string, string>;
export const project = (rows: Row[], attrs: string[]): Row[] => { const seen = new Set<string>(); return rows.map(r => Object.fromEntries(attrs.map(a => [a, r[a]]))).filter(r => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; }); };
export function naturalJoin(a: Row[], b: Row[]): Row[] {
  const out: Row[] = [];
  for (const x of a) for (const y of b) { const common = Object.keys(x).filter(k => k in y); if (common.every(k => x[k] === y[k])) out.push({ ...x, ...y }); }
  return out;
}
export const sameRelation = (a: Row[], b: Row[]) => { const k = (r: Row) => JSON.stringify(Object.keys(r).sort().map(c => [c, r[c]])); const sa = new Set(a.map(k)), sb = new Set(b.map(k)); return sa.size === sb.size && [...sa].every(x => sb.has(x)); };
export function violatesFD(rows: Row[], f: FD): { x: string; ys: string[] }[] {
  const g = new Map<string, Set<string>>(); rows.forEach(r => { const k = f.lhs.map(a => r[a]).join('|'); (g.get(k) ?? g.set(k, new Set()).get(k)!).add(f.rhs.map(a => r[a]).join('|')); });
  return [...g.entries()].filter(([, s]) => s.size > 1).map(([x, s]) => ({ x, ys: [...s] }));
}
export function redundancy(rows: Row[], f: FD): number { const g = new Map<string, number>(); rows.forEach(r => { const k = f.lhs.map(a => r[a]).join('|'); g.set(k, (g.get(k) ?? 0) + 1); }); return [...g.values()].reduce((s, c) => s + Math.max(0, c - 1), 0); }

// ------------------------------------------------------------------ transactions (WAL model)
export interface TxState { disk: { A: number; B: number }; buffer: { A: number; B: number }; log: string[]; status: string; note: string }
export interface TxStep { label: string; state: TxState }
export type TxMode = 'no-transactions' | 'wal';
export const TX_OPS = ['BEGIN', 'READ A', 'A = A − amount', 'WRITE A', 'READ B', 'B = B + amount', 'WRITE B', 'COMMIT'] as const;

/** Runs the bank transfer; `crashAt` = index of the operation during which the system crashes (null = no crash).
 *  `flushOnCommit=false` models a crash after COMMIT is logged but before data pages reach disk (durability via REDO). */
export function runTransfer(opts: { amount: number; crashAt: number | null; mode: TxMode; flushOnCommit?: boolean; A?: number; B?: number }): { steps: TxStep[]; recovered: TxState; consistent: boolean; total: number } {
  const A0 = opts.A ?? 10000, B0 = opts.B ?? 5000; const total = A0 + B0;
  const st: TxState = { disk: { A: A0, B: B0 }, buffer: { A: A0, B: B0 }, log: [], status: 'idle', note: '' };
  const snap = (label: string, note = ''): TxStep => ({ label, state: JSON.parse(JSON.stringify({ ...st, note })) });
  const steps: TxStep[] = [snap('initial', 'Both accounts are on disk.')];
  let crashed = false; const wal = opts.mode === 'wal';
  const flush = opts.flushOnCommit !== false;
  for (let i = 0; i < TX_OPS.length && !crashed; i++) {
    if (opts.crashAt === i) { crashed = true; steps.push(snap(`💥 CRASH during "${TX_OPS[i]}"`, 'Power failure: the buffer pool (memory) is lost; only disk and the log survive.')); break; }
    const op = TX_OPS[i];
    if (op === 'BEGIN') { st.status = 'active'; if (wal) st.log.push('<T1, START>'); steps.push(snap(op, 'Transaction T1 starts.')); }
    else if (op === 'READ A' || op === 'READ B') steps.push(snap(op, `Read ${op.slice(-1)} into memory.`));
    else if (op === 'A = A − amount') { st.buffer.A -= opts.amount; steps.push(snap(op, 'Computed in memory only.')); }
    else if (op === 'B = B + amount') { st.buffer.B += opts.amount; steps.push(snap(op, 'Computed in memory only.')); }
    else if (op === 'WRITE A' || op === 'WRITE B') {
      const k = op.slice(-1) as 'A' | 'B';
      if (wal) { st.log.push(`<T1, ${k}, old=${st.disk[k]}, new=${st.buffer[k]}>`); steps.push(snap(op, 'Write-ahead logging: the undo/redo record is logged BEFORE the change can reach disk. The data page stays in the buffer.')); }
      else { st.disk[k] = st.buffer[k]; steps.push(snap(op, 'Without transactions the new value goes straight to disk.')); }
    } else if (op === 'COMMIT') {
      if (wal) { st.log.push('<T1, COMMIT>'); st.status = 'committed'; if (flush) st.disk = { ...st.buffer }; steps.push(snap(op, flush ? 'Commit record is forced to the log, then pages are flushed to disk.' : 'Commit record is durable in the log, but data pages have not been flushed yet.')); }
      else { st.status = 'committed'; steps.push(snap(op, 'Done.')); }
    }
  }
  if (!crashed && opts.crashAt === TX_OPS.length) { crashed = true; steps.push(snap('💥 CRASH right after COMMIT', 'Power failure just after the commit record was written.')); }
  // ---- recovery after a crash
  const rec: TxState = JSON.parse(JSON.stringify(st));
  if (crashed) {
    rec.buffer = { ...rec.disk };
    if (wal) {
      const committed = rec.log.includes('<T1, COMMIT>');
      if (committed) { rec.log.forEach(l => { const m = l.match(/<T1, (A|B), old=(-?\d+), new=(-?\d+)>/); if (m) rec.disk[m[1] as 'A' | 'B'] = +m[3]; }); rec.note = 'Recovery: COMMIT found in the log → REDO all logged writes (durability).'; rec.status = 'committed'; }
      else { [...rec.log].reverse().forEach(l => { const m = l.match(/<T1, (A|B), old=(-?\d+), new=(-?\d+)>/); if (m) rec.disk[m[1] as 'A' | 'B'] = +m[2]; }); rec.note = 'Recovery: no COMMIT in the log → UNDO any changes (atomicity).'; rec.status = 'rolled back'; }
    } else rec.note = 'No log exists, so nothing can be undone or redone: the database stays however the crash left it.';
    rec.buffer = { ...rec.disk };
  } else rec.buffer = { ...rec.disk };
  return { steps, recovered: rec, total, consistent: rec.disk.A + rec.disk.B === total };
}

// ------------------------------------------------------------------ schedules
export interface Op { t: number; kind: 'R' | 'W' | 'C'; item?: string }
export function parseSchedule(s: string): Op[] {
  return s.trim().split(/\s+/).filter(Boolean).map(tok => {
    const m = tok.match(/^([RW])(\d+)\(([A-Za-z0-9_]+)\)$/i) ?? tok.match(/^(C)(\d+)$/i);
    if (!m) throw new Error(`Cannot parse "${tok}". Use forms like R1(A) W2(A) C1.`);
    return m[1].toUpperCase() === 'C' ? { t: +m[2], kind: 'C' as const } : { t: +m[2], kind: m[1].toUpperCase() as 'R' | 'W', item: m[3] };
  });
}
export function precedenceGraph(ops: Op[]) {
  const edges = new Map<string, { from: number; to: number; why: string }>();
  for (let i = 0; i < ops.length; i++) for (let j = i + 1; j < ops.length; j++) {
    const a = ops[i], b = ops[j];
    if (a.kind === 'C' || b.kind === 'C' || a.t === b.t || a.item !== b.item || (a.kind === 'R' && b.kind === 'R')) continue;
    edges.set(`${a.t}>${b.t}`, { from: a.t, to: b.t, why: `${a.kind}${a.t}(${a.item}) before ${b.kind}${b.t}(${b.item}) conflict` });
  }
  return [...edges.values()];
}
export function analyzeSchedule(ops: Op[]) {
  const txs = [...new Set(ops.map(o => o.t))].sort((a, b) => a - b); const edges = precedenceGraph(ops);
  const indeg = new Map(txs.map(t => [t, 0])); edges.forEach(e => indeg.set(e.to, indeg.get(e.to)! + 1));
  const order: number[] = []; const q = txs.filter(t => !indeg.get(t));
  while (q.length) { const x = q.shift()!; order.push(x); edges.filter(e => e.from === x).forEach(e => { indeg.set(e.to, indeg.get(e.to)! - 1); if (!indeg.get(e.to)) q.push(e.to); }); }
  const serializable = order.length === txs.length;
  // recoverability: Tj reads an item last written by Ti (i != j) then Tj must not commit before Ti commits
  let recoverable = true, aca = true; const why: string[] = [];
  const commitAt = new Map<number, number>(); ops.forEach((o, i) => { if (o.kind === 'C') commitAt.set(o.t, i); });
  ops.forEach((o, j) => {
    if (o.kind !== 'R') return;
    let w: Op | undefined, wi = -1; for (let i = j - 1; i >= 0; i--) if (ops[i].kind === 'W' && ops[i].item === o.item) { w = ops[i]; wi = i; break; }
    if (!w || w.t === o.t) return;
    const wc = commitAt.get(w.t);
    if (wc === undefined || wc > j) { aca = false; why.push(`T${o.t} reads ${o.item} written by uncommitted T${w.t} (dirty read) → not cascadeless.`); }
    const rc = commitAt.get(o.t);
    if (rc !== undefined && (wc === undefined || wc > rc)) { recoverable = false; why.push(`T${o.t} commits before T${w.t}, which it read from → not recoverable.`); }
    void wi;
  });
  return { txs, edges, serializable, serialOrder: serializable ? order : null, recoverable, cascadeless: aca, notes: why, cycle: serializable ? null : findCycle(txs, edges) };
}
function findCycle(txs: number[], edges: { from: number; to: number }[]): number[] | null {
  const st = new Map<number, number>(); const path: number[] = []; let found: number[] | null = null;
  const dfs = (u: number) => { st.set(u, 1); path.push(u); for (const e of edges.filter(x => x.from === u)) { if (found) return; if (st.get(e.to) === 1) { found = path.slice(path.indexOf(e.to)); return; } if (!st.get(e.to)) dfs(e.to); } path.pop(); st.set(u, 2); };
  txs.forEach(t => { if (!st.get(t) && !found) dfs(t); });
  return found;
}

// ------------------------------------------------------------------ B+ tree
export interface BNode { id: number; leaf: boolean; keys: number[]; children: BNode[]; next: BNode | null }
export interface BSnap { id: number; leaf: boolean; keys: number[]; children: number[]; next: number | null }
export class BPlusTree {
  root: BNode; nid = 0;
  /** maxKeys = maximum number of keys per node (>= 3) */
  constructor(public maxKeys = 3) { if (maxKeys < 3) throw new Error('maxKeys must be >= 3'); this.root = this.node(true); }
  node(leaf: boolean): BNode { return { id: ++this.nid, leaf, keys: [], children: [], next: null }; }
  get minKeys() { return Math.floor(this.maxKeys / 2); }
  search(key: number) { const path: BNode[] = []; let n = this.root; path.push(n); while (!n.leaf) { let i = 0; while (i < n.keys.length && key >= n.keys[i]) i++; n = n.children[i]; path.push(n); } return { found: n.keys.includes(key), path }; }
  insert(key: number): string[] {
    const ev: string[] = []; const { found, path } = this.search(key);
    if (found) { ev.push(`Key ${key} already exists; B+ trees here store unique keys.`); return ev; }
    ev.push(`Search path: ${path.map(n => `[${n.keys.join(',')}]`).join(' → ')}`);
    const leaf = path[path.length - 1]; let i = 0; while (i < leaf.keys.length && leaf.keys[i] < key) i++; leaf.keys.splice(i, 0, key);
    ev.push(`Insert ${key} into leaf [${leaf.keys.join(',')}]`);
    let child: BNode = leaf; let k = path.length - 1;
    while (child.keys.length > this.maxKeys) {
      const mid = Math.ceil(child.keys.length / 2); const right = this.node(child.leaf); let up: number;
      if (child.leaf) { right.keys = child.keys.splice(mid); right.next = child.next; child.next = right; up = right.keys[0]; ev.push(`Leaf overflow: split into [${child.keys.join(',')}] and [${right.keys.join(',')}]; copy ${up} up (leaf keys stay in the leaves).`); }
      else { up = child.keys[mid - 1]; right.keys = child.keys.splice(mid); child.keys.pop(); right.children = child.children.splice(mid); ev.push(`Internal overflow: split; move ${up} up (it leaves this level).`); }
      if (k === 0) { const r = this.node(false); r.keys = [up]; r.children = [child, right]; this.root = r; ev.push(`Root split: new root [${up}] — the tree grows one level.`); break; }
      const parent = path[k - 1]; const pi = parent.children.indexOf(child); parent.keys.splice(pi, 0, up); parent.children.splice(pi + 1, 0, right);
      child = parent; k--;
    }
    return ev;
  }
  delete(key: number): string[] {
    const ev: string[] = []; const { found, path } = this.search(key);
    if (!found) { ev.push(`Key ${key} not found.`); return ev; }
    const leaf = path[path.length - 1]; leaf.keys.splice(leaf.keys.indexOf(key), 1); ev.push(`Remove ${key} from leaf → [${leaf.keys.join(',')}]`);
    let k = path.length - 1;
    while (k > 0) {
      const n = path[k], parent = path[k - 1];
      if (n.keys.length >= this.minKeys) break;
      const ci = parent.children.indexOf(n); const left = parent.children[ci - 1], right = parent.children[ci + 1];
      if (left && left.keys.length > this.minKeys) {
        if (n.leaf) { n.keys.unshift(left.keys.pop()!); parent.keys[ci - 1] = n.keys[0]; }
        else { n.keys.unshift(parent.keys[ci - 1]); n.children.unshift(left.children.pop()!); parent.keys[ci - 1] = left.keys.pop()!; }
        ev.push(`Underflow: borrow from the left sibling (redistribution); parent separator updated.`); break;
      }
      if (right && right.keys.length > this.minKeys) {
        if (n.leaf) { n.keys.push(right.keys.shift()!); parent.keys[ci] = right.keys[0]; }
        else { n.keys.push(parent.keys[ci]); n.children.push(right.children.shift()!); parent.keys[ci] = right.keys.shift()!; }
        ev.push(`Underflow: borrow from the right sibling (redistribution); parent separator updated.`); break;
      }
      const li = left ? ci - 1 : ci; const L = parent.children[li], R = parent.children[li + 1];
      if (L.leaf) { L.keys.push(...R.keys); L.next = R.next; } else { L.keys.push(parent.keys[li], ...R.keys); L.children.push(...R.children); }
      parent.keys.splice(li, 1); parent.children.splice(li + 1, 1);
      ev.push(`Underflow: merge with sibling into [${L.keys.join(',')}]; remove separator from the parent.`);
      k--;
    }
    if (!this.root.leaf && this.root.children.length === 1) { this.root = this.root.children[0]; ev.push('Root has a single child: the tree shrinks one level.'); }
    return ev;
  }
  keys(): number[] { let n = this.root; while (!n.leaf) n = n.children[0]; const out: number[] = []; for (let c: BNode | null = n; c; c = c.next) out.push(...c.keys); return out; }
  height() { let h = 1, n = this.root; while (!n.leaf) { n = n.children[0]; h++; } return h; }
  snapshot(): BSnap[] { const out: BSnap[] = []; const go = (n: BNode) => { out.push({ id: n.id, leaf: n.leaf, keys: [...n.keys], children: n.children.map(c => c.id), next: n.next?.id ?? null }); n.children.forEach(go); }; go(this.root); return out; }
  /** throws if any B+ tree invariant is broken */
  check() {
    const depths = new Set<number>();
    const go = (n: BNode, d: number, lo: number | null, hi: number | null, isRoot: boolean) => {
      if (n.keys.length > this.maxKeys) throw new Error('node overflow');
      if (!isRoot && n.keys.length < this.minKeys) throw new Error(`node underflow ${n.keys}`);
      for (let i = 1; i < n.keys.length; i++) if (n.keys[i - 1] >= n.keys[i]) throw new Error('keys not sorted');
      n.keys.forEach(k => { if ((lo !== null && k < lo) || (hi !== null && k >= hi)) throw new Error(`key ${k} outside range`); });
      if (n.leaf) { depths.add(d); return; }
      if (n.children.length !== n.keys.length + 1) throw new Error('child count');
      n.children.forEach((c, i) => go(c, d + 1, i === 0 ? lo : n.keys[i - 1], i === n.keys.length ? hi : n.keys[i], false));
    };
    go(this.root, 0, null, null, true);
    if (depths.size > 1) throw new Error('leaves at different depths');
    const ks = this.keys(); for (let i = 1; i < ks.length; i++) if (ks[i - 1] >= ks[i]) throw new Error('leaf chain not sorted');
  }
}
