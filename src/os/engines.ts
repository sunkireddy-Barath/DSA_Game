// Operating-system simulation engines (pure functions / small state machines, no UI).
// These are simplified educational models, not a reproduction of any real kernel.

// ------------------------------------------------------------------ CPU scheduling
export interface Proc { pid: string; arrival: number; burst: number; priority?: number }
export type Algo = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'PRIORITY' | 'PRIORITY_P';
export interface Seg { pid: string | null; start: number; end: number }
export interface Metric { pid: string; arrival: number; burst: number; start: number; completion: number; turnaround: number; waiting: number; response: number }
export interface Tick { t: number; running: string | null; ready: string[]; done: string[]; remaining: Record<string, number> }
export interface SchedResult { segments: Seg[]; metrics: Metric[]; ticks: Tick[]; contextSwitches: number; cpuUtilization: number; avgWaiting: number; avgTurnaround: number; avgResponse: number; makespan: number }

export function schedule(procs: Proc[], algo: Algo, quantum = 2): SchedResult {
  if (procs.some(p => p.burst <= 0 || p.arrival < 0)) throw new Error('burst must be > 0 and arrival >= 0');
  const rem: Record<string, number> = {}, first: Record<string, number> = {}, comp: Record<string, number> = {};
  procs.forEach(p => (rem[p.pid] = p.burst));
  const byPid = new Map(procs.map((p, i) => [p.pid, { ...p, idx: i }]));
  const ticks: Tick[] = []; const timeline: (string | null)[] = [];
  let ready: string[] = []; const added = new Set<string>();
  let cur: string | null = null, used = 0, t = 0;
  const pre = algo === 'SRTF' || algo === 'PRIORITY_P' || algo === 'RR';
  const key = (pid: string): [number, number, number] => {
    const p = byPid.get(pid)!;
    if (algo === 'FCFS') return [p.arrival, p.idx, 0];
    if (algo === 'SJF') return [p.burst, p.arrival, p.idx];
    if (algo === 'SRTF') return [rem[pid], p.arrival, p.idx];
    return [p.priority ?? 0, p.arrival, p.idx];
  };
  const better = (a: string, b: string) => { const x = key(a), y = key(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i]; return false; };
  let guard = 0;
  while (Object.keys(comp).length < procs.length) {
    if (++guard > 100000) throw new Error('simulation did not terminate');
    procs.filter(p => p.arrival <= t && !added.has(p.pid)).forEach(p => { ready.push(p.pid); added.add(p.pid); });
    if (cur !== null) {
      if (rem[cur] === 0) { comp[cur] = t; cur = null; }
      else if (algo === 'RR' && used >= quantum) { ready.push(cur); cur = null; }
    }
    if (cur !== null && pre && algo !== 'RR') {
      const best = ready.reduce<string | null>((b, p) => (b === null || better(p, b) ? p : b), null);
      if (best !== null && better(best, cur)) { ready.push(cur); cur = null; }
    }
    if (cur === null && ready.length) {
      let pick: string;
      if (algo === 'RR') pick = ready[0]; else pick = ready.reduce((b, p) => (better(p, b) ? p : b));
      ready = ready.filter(x => x !== pick); cur = pick; used = 0;
      if (first[pick] === undefined) first[pick] = t;
    }
    if (Object.keys(comp).length === procs.length) break;
    ticks.push({ t, running: cur, ready: [...ready], done: Object.keys(comp), remaining: { ...rem } });
    timeline.push(cur);
    if (cur !== null) { rem[cur]--; used++; }
    t++;
  }
  const segments: Seg[] = [];
  timeline.forEach((pid, i) => { const l = segments[segments.length - 1]; if (l && l.pid === pid) l.end = i + 1; else segments.push({ pid, start: i, end: i + 1 }); });
  const metrics: Metric[] = procs.map(p => ({ pid: p.pid, arrival: p.arrival, burst: p.burst, start: first[p.pid], completion: comp[p.pid], turnaround: comp[p.pid] - p.arrival, waiting: comp[p.pid] - p.arrival - p.burst, response: first[p.pid] - p.arrival }));
  const run = segments.filter(s => s.pid !== null);
  let contextSwitches = 0; for (let i = 1; i < run.length; i++) if (run[i].pid !== run[i - 1].pid) contextSwitches++;
  const makespan = Math.max(...Object.values(comp));
  const busy = timeline.filter(x => x !== null).length;
  const avg = (f: (m: Metric) => number) => metrics.reduce((s, m) => s + f(m), 0) / metrics.length;
  return { segments, metrics, ticks, contextSwitches, cpuUtilization: busy / makespan, avgWaiting: avg(m => m.waiting), avgTurnaround: avg(m => m.turnaround), avgResponse: avg(m => m.response), makespan };
}

// ------------------------------------------------------------------ page replacement
export type PageAlgo = 'FIFO' | 'LRU' | 'OPT';
export interface PageStep { ref: number; frames: (number | null)[]; fault: boolean; victim: number | null; slot: number; why: string }
export function pageReplacement(refs: number[], frameCount: number, algo: PageAlgo): { steps: PageStep[]; faults: number; hits: number } {
  const frames: (number | null)[] = Array(frameCount).fill(null);
  const loadedAt: number[] = Array(frameCount).fill(-1), usedAt: number[] = Array(frameCount).fill(-1);
  let fifoPtr = 0; const steps: PageStep[] = []; let faults = 0;
  refs.forEach((r, i) => {
    const hit = frames.indexOf(r);
    if (hit !== -1) { usedAt[hit] = i; steps.push({ ref: r, frames: [...frames], fault: false, victim: null, slot: hit, why: `Page ${r} is already in a frame: hit.` }); return; }
    faults++;
    let slot = frames.indexOf(null), victim: number | null = null, why: string;
    if (slot !== -1) why = `Page ${r} is not in memory and a frame is free: fault, load into frame ${slot}.`;
    else {
      if (algo === 'FIFO') { slot = fifoPtr; fifoPtr = (fifoPtr + 1) % frameCount; why = `FIFO evicts the page that has been in memory longest.`; }
      else if (algo === 'LRU') { slot = usedAt.indexOf(Math.min(...usedAt)); why = `LRU evicts the page whose last use is oldest.`; }
      else {
        const nextUse = frames.map(f => { const n = refs.indexOf(f as number, i + 1); return n === -1 ? Infinity : n; });
        slot = nextUse.indexOf(Math.max(...nextUse));
        why = nextUse[slot] === Infinity ? 'Optimal evicts a page that is never used again (ties: lowest frame number).' : 'Optimal evicts the page whose next use is farthest in the future.';
      }
      victim = frames[slot];
      why = `Page ${r} is not in memory: fault. ${why} Victim: page ${victim}.`;
    }
    frames[slot] = r; loadedAt[slot] = i; usedAt[slot] = i;
    steps.push({ ref: r, frames: [...frames], fault: true, victim, slot, why });
  });
  return { steps, faults, hits: refs.length - faults };
}

// ------------------------------------------------------------------ Banker's algorithm
export interface BankerState { available: number[]; max: number[][]; alloc: number[][] }
export const need = (s: BankerState) => s.max.map((row, i) => row.map((m, j) => m - s.alloc[i][j]));
export interface SafetyStep { pid: number; work: number[]; need: number[]; after: number[] }
export function safety(s: BankerState): { safe: boolean; sequence: number[]; steps: SafetyStep[]; stuck: number[] } {
  const n = s.max.length, nd = need(s); let work = [...s.available]; const fin = Array(n).fill(false); const sequence: number[] = []; const steps: SafetyStep[] = [];
  for (;;) {
    const i = nd.findIndex((row, k) => !fin[k] && row.every((x, j) => x <= work[j]));
    if (i === -1) break;
    const after = work.map((w, j) => w + s.alloc[i][j]);
    steps.push({ pid: i, work: [...work], need: nd[i], after }); work = after; fin[i] = true; sequence.push(i);
  }
  return { safe: sequence.length === n, sequence, steps, stuck: fin.map((f, i) => (f ? -1 : i)).filter(i => i >= 0) };
}
export function requestResources(s: BankerState, pid: number, req: number[]): { granted: boolean; reason: string; next?: BankerState } {
  const nd = need(s)[pid];
  if (req.some((r, j) => r > nd[j])) return { granted: false, reason: 'The process asked for more than its declared maximum need (error).' };
  if (req.some((r, j) => r > s.available[j])) return { granted: false, reason: 'Not enough resources are available right now: the process must wait.' };
  const next: BankerState = { available: s.available.map((a, j) => a - req[j]), max: s.max, alloc: s.alloc.map((row, i) => (i === pid ? row.map((x, j) => x + req[j]) : [...row])) };
  const r = safety(next);
  return r.safe ? { granted: true, reason: `Granting keeps the system safe (safe sequence: ${r.sequence.map(i => 'P' + i).join(', ')}).`, next } : { granted: false, reason: 'Granting would leave the system in an UNSAFE state, so the request is delayed.' };
}

// ------------------------------------------------------------------ single-instance resource / lock simulator (deadlocks)
export interface Held { holder: string | null; queue: string[] }
export class ResourceSim {
  res: Record<string, Held> = {}; log: string[] = [];
  constructor(public procs: string[], resources: string[]) { resources.forEach(r => (this.res[r] = { holder: null, queue: [] })); }
  clone() { const c = new ResourceSim(this.procs, []); c.res = JSON.parse(JSON.stringify(this.res)); c.log = [...this.log]; return c; }
  request(p: string, r: string) {
    const h = this.res[r]; if (!h) throw new Error('unknown resource');
    if (h.holder === p) { this.log.push(`${p} already holds ${r}`); return 'already'; }
    if (h.queue.includes(p)) return 'waiting';
    if (h.holder === null) { h.holder = p; this.log.push(`${p} acquires ${r}`); return 'granted'; }
    h.queue.push(p); this.log.push(`${p} requests ${r} (held by ${h.holder}) and waits`); return 'blocked';
  }
  release(p: string, r: string) {
    const h = this.res[r]; if (h.holder !== p) throw new Error(`${p} does not hold ${r}`);
    h.holder = null; this.log.push(`${p} releases ${r}`);
    if (h.queue.length) { const n = h.queue.shift()!; h.holder = n; this.log.push(`${n} (waiting) acquires ${r}`); }
  }
  abort(p: string) {
    this.log.push(`${p} is aborted: all its locks are released and its requests removed`);
    Object.keys(this.res).forEach(r => { const h = this.res[r]; h.queue = h.queue.filter(x => x !== p); if (h.holder === p) { h.holder = null; if (h.queue.length) { h.holder = h.queue.shift()!; this.log.push(`${h.holder} acquires ${r}`); } } });
  }
  /** wait-for edges: waiter -> holder */
  waitFor(): [string, string][] { const e: [string, string][] = []; Object.values(this.res).forEach(h => h.queue.forEach(w => { if (h.holder) e.push([w, h.holder]); })); return e; }
  findCycle(): string[] | null {
    const adj = new Map<string, string[]>(); this.waitFor().forEach(([a, b]) => (adj.get(a) ?? adj.set(a, []).get(a)!).push(b));
    const state = new Map<string, number>(); const path: string[] = []; let found: string[] | null = null;
    const dfs = (u: string) => { state.set(u, 1); path.push(u); for (const v of adj.get(u) ?? []) { if (found) return; if (state.get(v) === 1) { found = path.slice(path.indexOf(v)); return; } if (!state.get(v)) dfs(v); } path.pop(); state.set(u, 2); };
    for (const p of this.procs) if (!state.get(p) && !found) dfs(p);
    return found;
  }
}

// ------------------------------------------------------------------ disk scheduling
export type DiskAlgo = 'FCFS' | 'SSTF' | 'SCAN' | 'CSCAN';
export function diskSchedule(requests: number[], head: number, algo: DiskAlgo, diskSize = 200, dir: 'up' | 'down' = 'up') {
  const path: number[] = [head]; let rest = [...requests];
  if (algo === 'FCFS') path.push(...rest);
  else if (algo === 'SSTF') { let cur = head; while (rest.length) { const i = rest.reduce((b, r, k) => (Math.abs(r - cur) < Math.abs(rest[b] - cur) ? k : b), 0); cur = rest[i]; path.push(cur); rest.splice(i, 1); } }
  else {
    const lo = rest.filter(r => r < head).sort((a, b) => b - a), hi = rest.filter(r => r >= head).sort((a, b) => a - b);
    if (algo === 'SCAN') { if (dir === 'up') { path.push(...hi); if (lo.length) { path.push(diskSize - 1); path.push(...lo); } } else { path.push(...lo); if (hi.length) { path.push(0); path.push(...hi); } } }
    else if (dir === 'up') { path.push(...hi); if (lo.length) { path.push(diskSize - 1, 0); path.push(...[...lo].reverse()); } } else { path.push(...lo); if (hi.length) { path.push(0, diskSize - 1); path.push(...[...hi].reverse().reverse().sort((a, b) => b - a)); } }
  }
  let total = 0; for (let i = 1; i < path.length; i++) total += Math.abs(path[i] - path[i - 1]);
  return { path, total };
}
