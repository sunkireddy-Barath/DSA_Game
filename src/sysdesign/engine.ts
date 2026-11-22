// System-design simulator: a steady-state, graph-based load model (not a packet-level simulator).
// Every number comes from the capacities/latencies/hit rates you configure; assumptions are listed in the UI.

export type NType = 'client' | 'cdn' | 'lb' | 'server' | 'cache' | 'db' | 'queue' | 'worker';
export interface SNode { id: string; type: NType; label: string; count: number; capacity: number; latency: number; down: number; replicas: number; hit: number; avail: number; x: number; y: number }
export interface SEdge { from: string; to: string }
export interface Design { nodes: SNode[]; edges: SEdge[] }
export interface Traffic { rps: number; readRatio: number; netLatency: number }
export interface NodeStat { id: string; load: number; capacity: number; util: number; served: number; dropped: number; status: 'idle' | 'ok' | 'hot' | 'saturated' | 'down'; note?: string; backlogPerSec?: number }
export interface Result {
  nodes: Record<string, NodeStat>; edges: { from: string; to: string; rps: number }[]; offered: number; served: number; dropped: number; successRate: number; avgLatency: number;
  bottleneck: string | null; warnings: string[]; spof: string[]; availability: number; neededServers: number | null;
}
type Flow = { r: number; w: number };
const tot = (f: Flow) => f.r + f.w;
export const qf = (u: number) => (u >= 0.95 ? 20 : 1 / (1 - u)); // M/M/1-style queueing delay factor, capped

export const DEFAULTS: Record<NType, Omit<SNode, 'id' | 'x' | 'y'>> = {
  client: { type: 'client', label: 'Clients', count: 1, capacity: 0, latency: 0, down: 0, replicas: 0, hit: 0, avail: 1 },
  cdn: { type: 'cdn', label: 'CDN', count: 1, capacity: 100000, latency: 10, down: 0, replicas: 0, hit: 0.9, avail: 0.9999 },
  lb: { type: 'lb', label: 'Load balancer', count: 1, capacity: 50000, latency: 1, down: 0, replicas: 0, hit: 0, avail: 0.9999 },
  server: { type: 'server', label: 'API servers', count: 2, capacity: 500, latency: 20, down: 0, replicas: 0, hit: 0, avail: 0.999 },
  cache: { type: 'cache', label: 'Cache (Redis)', count: 1, capacity: 50000, latency: 1, down: 0, replicas: 0, hit: 0.8, avail: 0.999 },
  db: { type: 'db', label: 'Database', count: 1, capacity: 2000, latency: 8, down: 0, replicas: 0, hit: 0, avail: 0.9995 },
  queue: { type: 'queue', label: 'Message queue', count: 1, capacity: 20000, latency: 2, down: 0, replicas: 0, hit: 0, avail: 0.9995 },
  worker: { type: 'worker', label: 'Analytics workers', count: 1, capacity: 300, latency: 0, down: 0, replicas: 0, hit: 0, avail: 0.999 },
};

export function simulate(d: Design, t: Traffic): Result {
  const by = new Map(d.nodes.map(n => [n.id, n])); const out = (id: string) => d.edges.filter(e => e.from === id).map(e => by.get(e.to)!).filter(Boolean);
  const stats: Record<string, NodeStat> = {}; d.nodes.forEach(n => { stats[n.id] = { id: n.id, load: 0, capacity: 0, util: 0, served: 0, dropped: 0, status: 'idle' }; });
  const edgeFlow = new Map<string, number>(); const warnings: string[] = [];
  const addEdge = (a: string, b: string, f: Flow) => edgeFlow.set(`${a}>${b}`, (edgeFlow.get(`${a}>${b}`) ?? 0) + tot(f));
  const scale = (f: Flow, k: number): Flow => ({ r: f.r * k, w: f.w * k });
  const none = { r: 0, w: 0, lat: 0 };
  const poolUsed = new Map<string, number>(), writesUsed = new Map<string, number>();
  const effCount = (n: SNode) => Math.max(0, n.count - n.down);
  const split = (n: SNode, f: Flow, kids: SNode[], depth: number) => {
    let acc = { ...none }; if (!kids.length) return acc;
    kids.forEach(k => { const part = scale(f, 1 / kids.length); addEdge(n.id, k.id, part); const r = route(k, part, depth + 1); acc = { r: acc.r + r.r, w: acc.w + r.w, lat: acc.lat + r.lat }; });
    return acc;
  };
  const finish = (n: SNode, load: Flow, served: number, cap: number, note?: string) => {
    const s = stats[n.id]; s.load += tot(load); s.served += served; s.dropped += tot(load) - served; s.capacity = cap || s.capacity;
    s.util = s.capacity > 0 ? s.load / s.capacity : 0; if (note) s.note = note;
    s.status = n.down >= n.count && n.type !== 'client' ? 'down' : s.util > 1.0001 ? 'saturated' : s.util > 0.7 ? 'hot' : s.load > 0 ? 'ok' : 'idle';
  };
  function route(n: SNode, f: Flow, depth: number): Flow & { lat: number } {
    if (depth > 12 || tot(f) <= 0) return { ...none };
    const net = t.netLatency;
    if (n.type === 'cdn') {
      if (n.down >= n.count) { finish(n, f, 0, 0, 'CDN down: all requests go to the origin'); const r = split(n, f, out(n.id), depth); return { ...r, lat: r.lat + tot(r) * net }; }
      const cap = effCount(n) * n.capacity; const hits = Math.min(f.r * n.hit, cap); const miss: Flow = { r: f.r - hits, w: f.w };
      const down = split(n, miss, out(n.id), depth); finish(n, f, hits + tot(down), cap, `edge hit rate ${(n.hit * 100).toFixed(0)}%`);
      return { r: hits + down.r, w: down.w, lat: hits * (n.latency + net) + down.lat + tot(down) * net };
    }
    if (n.type === 'lb') {
      const cap = effCount(n) * n.capacity; const f2 = n.down >= n.count ? { r: 0, w: 0 } : scale(f, Math.min(1, cap / tot(f)));
      const kids = out(n.id); const r = split(n, f2, kids, depth); finish(n, f, tot(r), cap, n.down >= n.count ? 'LB down: nothing can reach the servers' : kids.length ? undefined : 'LB has no backend servers');
      return { ...r, lat: r.lat + tot(r) * (n.latency + net) };
    }
    if (n.type === 'server') {
      const cap = effCount(n) * n.capacity; const util = cap > 0 ? tot(f) / cap : 20; const k = cap > 0 ? Math.min(1, cap / tot(f)) : 0; const adm = scale(f, k);
      const kids = out(n.id); const caches = kids.filter(x => x.type === 'cache'), dbs = kids.filter(x => x.type === 'db'), qs = kids.filter(x => x.type === 'queue');
      let served = { r: 0, w: 0, lat: 0 };
      if (!caches.length && !dbs.length) served = { r: adm.r, w: adm.w, lat: 0 };
      else {
        const rr = split(n, { r: adm.r, w: 0 }, caches.length ? caches : dbs, depth); const ww = split(n, { r: 0, w: adm.w }, dbs.length ? dbs : [], depth);
        served = { r: rr.r + (dbs.length || caches.length ? 0 : 0), w: ww.w + (dbs.length ? 0 : adm.w), lat: rr.lat + ww.lat };
        if (!dbs.length && adm.w > 0) served.w = adm.w;
      }
      qs.forEach(q => { const part = { r: 0, w: served.w }; addEdge(n.id, q.id, part); route(q, part, depth + 1); });
      finish(n, f, tot(served), cap, cap === 0 ? 'all instances are down' : undefined);
      return { r: served.r, w: served.w, lat: served.lat + tot(served) * (n.latency * qf(Math.min(util, 1)) + net) };
    }
    if (n.type === 'cache') {
      const cap = effCount(n) * n.capacity; const hitRate = n.down >= n.count ? 0 : n.hit; const hits = Math.min(f.r * hitRate, cap); const miss: Flow = { r: f.r - hits, w: f.w };
      const kids = out(n.id).filter(x => x.type === 'db'); const dn = kids.length ? split(n, miss, kids, depth) : { r: 0, w: 0, lat: 0 };
      finish(n, f, hits + tot(dn), cap, n.down >= n.count ? 'cache down: every read becomes a database read (cold start)' : `hit rate ${(hitRate * 100).toFixed(0)}%`);
      return { r: hits + dn.r, w: dn.w, lat: hits * (n.latency + net) + dn.lat + tot(dn) * net };
    }
    if (n.type === 'db') {
      const nodes = n.down >= 1 ? n.replicas : n.replicas + 1; const pool = nodes * n.capacity;
      if (nodes === 0) { finish(n, f, 0, 0, 'database down: no replica to fail over to'); stats[n.id].status = 'down'; return { ...none }; }
      const used = poolUsed.get(n.id) ?? 0, wUsed = writesUsed.get(n.id) ?? 0;
      const wS = Math.max(0, Math.min(f.w, n.capacity / 3 - wUsed, (pool - used) / 3)); const rS = Math.max(0, Math.min(f.r, pool - used - 3 * wS));
      poolUsed.set(n.id, used + 3 * wS + rS); writesUsed.set(n.id, wUsed + wS);
      finish(n, f, rS + wS, pool, n.down >= 1 ? 'primary failed: a replica was promoted' : n.replicas ? `1 primary + ${n.replicas} read replica(s); a write costs about 3 reads` : 'single node; a write costs about 3 reads');
      const st = stats[n.id]; st.load = (poolUsed.get(n.id) ?? 0) + (st.dropped > 0 ? st.dropped : 0); st.util = st.load / pool; st.status = st.util > 1.0001 || st.dropped > 0.5 ? 'saturated' : st.util > 0.7 ? 'hot' : 'ok';
      return { r: rS, w: wS, lat: (rS + wS) * (n.latency * qf(Math.min(1, (poolUsed.get(n.id) ?? 0) / pool)) + net) };
    }
    if (n.type === 'queue') {
      const cap = effCount(n) * n.capacity; const acc = Math.min(f.w, cap); const workers = out(n.id).filter(x => x.type === 'worker');
      workers.forEach(w => { addEdge(n.id, w.id, { r: 0, w: acc / workers.length }); route(w, { r: 0, w: acc / workers.length }, depth + 1); });
      finish(n, f, acc, cap, 'asynchronous: the caller does not wait for consumers'); return { r: 0, w: acc, lat: 0 };
    }
    if (n.type === 'worker') {
      const cap = effCount(n) * n.capacity; finish(n, f, Math.min(tot(f), cap), cap); const s = stats[n.id]; s.backlogPerSec = Math.max(0, tot(f) - cap);
      if (s.backlogPerSec > 0) s.note = `backlog grows by ${s.backlogPerSec.toFixed(0)} msgs/s: consumers cannot keep up`; return { ...none };
    }
    return { ...none };
  }
  const client = d.nodes.find(x => x.type === 'client'); const offered = t.rps;
  let res = { r: 0, w: 0, lat: 0 };
  if (!client) warnings.push('Add a Clients node: nothing generates traffic.');
  else {
    const f: Flow = { r: t.rps * t.readRatio, w: t.rps * (1 - t.readRatio) }; const kids = out(client.id);
    if (!kids.length) warnings.push('Clients are not connected to anything: every request is lost.');
    const cdn = kids.find(k => k.type === 'cdn'); const rest = kids.filter(k => k !== cdn);
    if (cdn) { const part = { r: f.r, w: 0 }; addEdge(client.id, cdn.id, part); const r = route(cdn, part, 1); res = { r: res.r + r.r, w: res.w + r.w, lat: res.lat + r.lat }; const wf = { r: 0, w: f.w }; const r2 = split(client, wf, rest, 0); res = { r: res.r + r2.r, w: res.w + r2.w, lat: res.lat + r2.lat }; }
    else { const r = split(client, f, kids, 0); res = r; }
    finish(client, { r: f.r, w: f.w }, tot(res), 0);
  }
  const served = tot(res); const successRate = offered > 0 ? Math.min(1, served / offered) : 1;
  const bottleneck = Object.values(stats).filter(s => s.status === 'saturated').sort((a, b) => b.util - a.util)[0]?.id ?? null;
  // single points of failure & design warnings (structural)
  const reach = new Set<string>(); const stack = client ? [client.id] : []; while (stack.length) { const x = stack.pop()!; if (reach.has(x)) continue; reach.add(x); d.edges.filter(e => e.from === x).forEach(e => stack.push(e.to)); }
  const spof: string[] = []; d.nodes.forEach(n => { if (['lb', 'server', 'db'].includes(n.type) && reach.has(n.id)) { const redundant = n.type === 'db' ? n.replicas > 0 : n.count > 1; if (!redundant) spof.push(n.id); } });
  spof.forEach(id => warnings.push(`Single point of failure: ${by.get(id)!.label} has no redundancy.`));
  if (successRate < 0.999 && bottleneck) warnings.push(`${by.get(bottleneck)!.label} is saturated (${(stats[bottleneck].util * 100).toFixed(0)}% of capacity): ${(100 * (1 - successRate)).toFixed(1)}% of requests are dropped.`);
  if (t.readRatio > 0.8 && !d.nodes.some(n => n.type === 'cache' || n.type === 'cdn')) warnings.push('Read-heavy workload without a cache or CDN: the database serves every read.');
  // design availability under independent failures (serial path; instances in parallel)
  const grp = (n: SNode) => 1 - Math.pow(1 - n.avail, n.type === 'db' ? n.replicas + 1 : n.count);
  const path = d.nodes.filter(n => ['lb', 'server', 'db'].includes(n.type) && reach.has(n.id)); const availability = path.reduce((a, n) => a * grp(n), 1);
  const srv = d.nodes.find(n => n.type === 'server'); const needed = srv ? Math.ceil(stats[srv.id].load / (srv.capacity * 0.7)) : null;
  const latency = served > 0 ? res.lat / served : 0;
  return { nodes: stats, edges: [...edgeFlow.entries()].map(([k, rps]) => { const [from, to] = k.split('>'); return { from, to, rps }; }), offered, served, dropped: offered - served, successRate, avgLatency: latency, bottleneck, warnings, spof, availability, neededServers: needed };
}

// ------------------------------------------------------------------ goals ("design game")
export interface Goal { id: string; label: string; check: (r: Result, d: Design) => boolean }
export interface Scenario { id: string; title: string; brief: string; traffic: Traffic; goals: Goal[]; notes: string[]; design: () => Design }
let nid = 0; const mkn = (type: NType, x: number, y: number, o: Partial<SNode> = {}): SNode => ({ ...DEFAULTS[type], id: `${type}${++nid}`, x, y, ...o });
const wire = (ns: SNode[]): SEdge[] => ns.slice(0, -1).map((n, i) => ({ from: n.id, to: ns[i + 1].id }));
export const emptyDesign = (): Design => ({ nodes: [mkn('client', 60, 140)], edges: [] });
const std = (rps: number, over: Partial<Record<NType, Partial<SNode>>> = {}) => (): Design => {
  const c = mkn('client', 40, 140), lb = mkn('lb', 170, 140, over.lb), s = mkn('server', 310, 140, over.server), ca = mkn('cache', 450, 70, over.cache), db = mkn('db', 590, 140, over.db), q = mkn('queue', 450, 230, over.queue), w = mkn('worker', 590, 230, over.worker);
  void rps; return { nodes: [c, lb, s, ca, db, q, w], edges: [...wire([c, lb, s]), { from: s.id, to: ca.id }, { from: ca.id, to: db.id }, { from: s.id, to: db.id }, { from: s.id, to: q.id }, { from: q.id, to: w.id }] };
};
const common = (rps: number, lat: number): Goal[] => [
  { id: 'ok', label: `Serve ${rps.toLocaleString()} requests/s with ≥ 99.9% success`, check: r => r.successRate >= 0.999 },
  { id: 'lat', label: `Average latency ≤ ${lat} ms`, check: r => r.avgLatency > 0 && r.avgLatency <= lat },
  { id: 'spof', label: 'No single point of failure (LB, servers, DB are redundant)', check: r => r.spof.length === 0 },
  { id: 'avail', label: 'Design availability ≥ 99.99%', check: r => r.availability >= 0.9999 },
];
export const SCENARIOS: Scenario[] = [
  { id: 'url', title: 'URL shortener', brief: 'Create short links and redirect: read-heavy (about 100 reads per write). Click analytics must not slow the redirect.', traffic: { rps: 3000, readRatio: 0.99, netLatency: 2 },
    goals: [...common(3000, 60), { id: 'cache', label: 'Use a cache for hot links', check: (_, d) => d.nodes.some(n => n.type === 'cache') }, { id: 'async', label: 'Record analytics asynchronously (queue + workers)', check: (_, d) => d.nodes.some(n => n.type === 'queue') && d.nodes.some(n => n.type === 'worker') }],
    notes: ['Cache hot short codes: a few links get most of the traffic.', 'Reads can be served by database read replicas.', 'Analytics events go through a queue so a slow analytics service never blocks redirects.'], design: std(3000) },
  { id: 'chat', title: 'WhatsApp-style chat', brief: 'Many small messages, write-heavy, delivery must be reliable. Fan-out to recipients and receipts go through queues.', traffic: { rps: 4000, readRatio: 0.4, netLatency: 3 },
    goals: [...common(4000, 80), { id: 'queue', label: 'Use a message queue to decouple delivery', check: (_, d) => d.nodes.some(n => n.type === 'queue') }],
    notes: ['Persistent connections (WebSockets) keep servers stateful: scale by sharding users.', 'Queues buffer bursts and retry delivery to offline users.'], design: std(4000) },
  { id: 'video', title: 'YouTube-style video streaming', brief: 'Huge read traffic for large objects. Serve video segments from a CDN so the origin only sees misses.', traffic: { rps: 20000, readRatio: 0.995, netLatency: 4 },
    goals: [...common(20000, 120), { id: 'cdn', label: 'Put a CDN in front of the origin', check: (_, d) => d.nodes.some(n => n.type === 'cdn') }], notes: ['A CDN with a high hit rate removes most origin load.', 'Uploads are rare writes: process asynchronously.'], design: std(20000) },
  { id: 'photo', title: 'Instagram-style photo feed', brief: 'Read-heavy feeds with occasional uploads. Cache feeds, store images in object storage/CDN.', traffic: { rps: 8000, readRatio: 0.95, netLatency: 3 },
    goals: [...common(8000, 100), { id: 'cache', label: 'Cache feeds', check: (_, d) => d.nodes.some(n => n.type === 'cache') }], notes: ['Pre-compute feeds (fan-out on write) for normal users; fan-out on read for celebrities.'], design: std(8000) },
  { id: 'tweet', title: 'Twitter/X timeline', brief: 'Very read-heavy timelines and bursty writes (trending events).', traffic: { rps: 12000, readRatio: 0.97, netLatency: 3 },
    goals: [...common(12000, 100), { id: 'queue', label: 'Absorb write bursts with a queue', check: (_, d) => d.nodes.some(n => n.type === 'queue') }], notes: ['Timelines are cached lists; writes fan out through queues.'], design: std(12000) },
  { id: 'netflix', title: 'Netflix-style streaming', brief: 'Catalogue browsing is light; playback traffic is served from CDN appliances close to users.', traffic: { rps: 15000, readRatio: 0.99, netLatency: 4 },
    goals: [...common(15000, 120), { id: 'cdn', label: 'Serve content from a CDN', check: (_, d) => d.nodes.some(n => n.type === 'cdn') }], notes: ['Control plane (catalogue, billing) is small; data plane (video) dominates.'], design: std(15000) },
  { id: 'food', title: 'Food delivery', brief: 'Moderate traffic, strong consistency for orders and payments, lots of small writes (location updates).', traffic: { rps: 2500, readRatio: 0.7, netLatency: 3 },
    goals: [...common(2500, 90), { id: 'queue', label: 'Process location/analytics updates asynchronously', check: (_, d) => d.nodes.some(n => n.type === 'queue') }], notes: ['Orders need transactions; location pings can be lossy and asynchronous.'], design: std(2500) },
  { id: 'shop', title: 'E-commerce platform', brief: 'Browse-heavy catalogue plus checkout. Flash sales create sudden spikes.', traffic: { rps: 6000, readRatio: 0.9, netLatency: 3 },
    goals: [...common(6000, 100), { id: 'cache', label: 'Cache catalogue pages', check: (_, d) => d.nodes.some(n => n.type === 'cache') }, { id: 'replica', label: 'Replicate the database', check: (_, d) => d.nodes.some(n => n.type === 'db' && n.replicas > 0) }], notes: ['Scale stateless servers horizontally; protect inventory writes with queues and idempotency keys.'], design: std(6000) },
];
export const evaluateGoals = (s: Scenario, r: Result, d: Design) => s.goals.map(g => ({ ...g, ok: g.check(r, d) }));
export const newNode = (type: NType, x = 100, y = 100) => mkn(type, x, y);
