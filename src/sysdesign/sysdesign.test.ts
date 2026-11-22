import { describe, expect, it } from 'vitest';
import { DEFAULTS, Design, SCENARIOS, SNode, evaluateGoals, newNode, qf, simulate } from './engine';

const node = (type: SNode['type'], id: string, o: Partial<SNode> = {}): SNode => ({ ...DEFAULTS[type], id, x: 0, y: 0, ...o });
const base = (o: { rps?: number; servers?: number; cap?: number; hit?: number; dbCap?: number; replicas?: number } = {}) => {
  const d: Design = { nodes: [node('client', 'c'), node('lb', 'lb', { count: 2 }), node('server', 's', { count: o.servers ?? 3, capacity: o.cap ?? 100 }), node('cache', 'ca', { hit: o.hit ?? 0.8 }), node('db', 'db', { capacity: o.dbCap ?? 1000, replicas: o.replicas ?? 1 })],
    edges: [{ from: 'c', to: 'lb' }, { from: 'lb', to: 's' }, { from: 's', to: 'ca' }, { from: 'ca', to: 'db' }, { from: 's', to: 'db' }] };
  return { d, t: { rps: o.rps ?? 200, readRatio: 0.9, netLatency: 1 } };
};

describe('load model', () => {
  it('within capacity: everything is served', () => { const { d, t } = base(); const r = simulate(d, t); expect(r.successRate).toBeCloseTo(1); expect(r.nodes.s.load).toBeCloseTo(200); expect(r.nodes.s.util).toBeCloseTo(200 / 300); expect(r.dropped).toBeCloseTo(0); });
  it('overload drops the excess at the saturated tier and names the bottleneck', () => {
    const { d, t } = base({ rps: 1000 }); const r = simulate(d, t); expect(r.successRate).toBeCloseTo(0.3); expect(r.bottleneck).toBe('s'); expect(r.dropped).toBeCloseTo(700); expect(r.warnings.join(' ')).toMatch(/saturated/);
  });
  it('conservation: served + dropped = offered, for random designs', () => {
    for (let k = 0; k < 60; k++) { const { d, t } = base({ rps: 50 + k * 40, servers: 1 + (k % 4), cap: 50 + (k % 5) * 40, hit: (k % 10) / 10, dbCap: 100 + k * 20 }); const r = simulate(d, t); expect(r.served + r.dropped).toBeCloseTo(r.offered, 6); expect(r.successRate).toBeLessThanOrEqual(1); expect(r.successRate).toBeGreaterThanOrEqual(0); }
  });
  it('a cache cuts database load by the hit rate', () => {
    const none = simulate(...Object.values(base({ hit: 0 })) as [Design, any]), hi = simulate(...Object.values(base({ hit: 0.9 })) as [Design, any]);
    expect(none.nodes.db.load).toBeGreaterThan(hi.nodes.db.load * 3); expect(hi.nodes.ca.served).toBeGreaterThan(0);
  });
  it('removing the cache sends every read to the database', () => {
    const { d, t } = base(); const noCache: Design = { nodes: d.nodes.filter(n => n.id !== 'ca'), edges: [{ from: 'c', to: 'lb' }, { from: 'lb', to: 's' }, { from: 's', to: 'db' }] };
    const r = simulate(noCache, t); expect(r.nodes.db.load).toBeGreaterThan(simulate(d, t).nodes.db.load);
  });
});

describe('failures', () => {
  it('all servers down: total outage', () => { const { d, t } = base(); d.nodes.find(n => n.id === 's')!.down = 3; const r = simulate(d, t); expect(r.successRate).toBe(0); expect(r.nodes.s.status).toBe('down'); });
  it('losing one of three servers reduces capacity by a third', () => { const { d, t } = base({ rps: 250 }); expect(simulate(d, t).successRate).toBeCloseTo(1); d.nodes.find(n => n.id === 's')!.down = 1; const r = simulate(d, t); expect(r.successRate).toBeCloseTo(200 / 250); });
  it('LB down (both instances) cuts everything off', () => { const { d, t } = base(); d.nodes.find(n => n.id === 'lb')!.down = 2; expect(simulate(d, t).successRate).toBe(0); });
  it('database failure: a replica takes over; without one the system loses data access', () => {
    const a = base({ replicas: 1 }); a.d.nodes.find(n => n.id === 'db')!.down = 1; const ra = simulate(a.d, a.t); expect(ra.successRate).toBeGreaterThan(0.99); expect(ra.nodes.db.note).toMatch(/promoted/);
    const b = base({ replicas: 0 }); b.d.nodes.find(n => n.id === 'db')!.down = 1; const rb = simulate(b.d, b.t); expect(rb.successRate).toBeCloseTo(0.9 * 0.8, 6); expect(rb.nodes.db.status).toBe('down'); // only cache hits survive: misses and all writes fail
  });
  it('cache failure is a degradation, not an outage (cold database)', () => {
    const { d, t } = base({ dbCap: 5000 }); d.nodes.find(n => n.id === 'ca')!.down = 1; const r = simulate(d, t); expect(r.successRate).toBeCloseTo(1); expect(r.nodes.db.load).toBeGreaterThan(simulate(base({ dbCap: 5000 }).d, t).nodes.db.load);
  });
});

describe('latency, queues, availability', () => {
  it('network latency adds to the end-to-end latency', () => { const { d, t } = base(); const a = simulate(d, t).avgLatency, b = simulate(d, { ...t, netLatency: 20 }).avgLatency; expect(b).toBeGreaterThan(a + 20); });
  it('latency rises sharply near saturation (queueing)', () => { expect(qf(0.9)).toBeCloseTo(10); expect(qf(0.5)).toBe(2); expect(qf(1)).toBe(20); const lo = base({ rps: 60 }), hi = base({ rps: 280 }); expect(simulate(hi.d, hi.t).avgLatency).toBeGreaterThan(simulate(lo.d, lo.t).avgLatency); });
  it('queue absorbs writes; slow workers build a backlog', () => {
    const d: Design = { nodes: [node('client', 'c'), node('server', 's', { count: 5, capacity: 1000 }), node('queue', 'q'), node('worker', 'w', { capacity: 100 })], edges: [{ from: 'c', to: 's' }, { from: 's', to: 'q' }, { from: 'q', to: 'w' }] };
    const r = simulate(d, { rps: 1000, readRatio: 0, netLatency: 1 }); expect(r.successRate).toBeCloseTo(1); expect(r.nodes.w.backlogPerSec).toBeCloseTo(900); expect(r.nodes.w.note).toMatch(/backlog/);
  });
  it('availability: redundancy multiplies nines', () => {
    const one = base({ servers: 1, replicas: 0 }); one.d.nodes.find(n => n.id === 'lb')!.count = 1; const many = base({ servers: 3, replicas: 2 });
    const a = simulate(one.d, one.t), b = simulate(many.d, many.t); expect(b.availability).toBeGreaterThan(a.availability); expect(a.spof.sort()).toEqual(['db', 'lb', 's']); expect(b.spof).toEqual([]);
    expect(simulate(many.d, many.t).availability).toBeCloseTo((1 - 1e-4 ** 2) * (1 - 1e-3 ** 3) * (1 - 5e-4 ** 3), 8);
  });
  it('capacity planning recommendation targets 70% utilisation', () => { const { d, t } = base({ rps: 700, servers: 10 }); expect(simulate(d, t).neededServers).toBe(Math.ceil(700 / (100 * 0.7))); });
});

describe('structure and scenarios', () => {
  it('unconnected clients are reported', () => { const r = simulate({ nodes: [node('client', 'c'), node('server', 's')], edges: [] }, { rps: 10, readRatio: 1, netLatency: 1 }); expect(r.successRate).toBe(0); expect(r.warnings[0]).toMatch(/not connected/); });
  it('a CDN absorbs read traffic before it reaches the origin', () => {
    const d: Design = { nodes: [node('client', 'c'), node('cdn', 'cdn', { hit: 0.9 }), node('server', 's', { count: 2, capacity: 100 })], edges: [{ from: 'c', to: 'cdn' }, { from: 'c', to: 's' }, { from: 'cdn', to: 's' }] };
    const r = simulate(d, { rps: 1000, readRatio: 1, netLatency: 1 }); expect(r.nodes.s.load).toBeCloseTo(100); expect(r.successRate).toBeCloseTo(1);
  });
  it('every scenario starts as a playable but unfinished design, and goals can be met by scaling up', () => {
    for (const s of SCENARIOS) {
      const d = s.design(); const r = simulate(d, s.traffic); const g = evaluateGoals(s, r, d);
      expect(g.length).toBeGreaterThan(4); expect(g.some(x => !x.ok), s.id).toBe(true); // starter is not already perfect
      const srv = d.nodes.find(n => n.type === 'server')!, lb = d.nodes.find(n => n.type === 'lb')!, db = d.nodes.find(n => n.type === 'db')!, ca = d.nodes.find(n => n.type === 'cache');
      srv.count = Math.ceil((s.traffic.rps * 1.0) / (srv.capacity * 0.6)) + 1; lb.count = 2; db.replicas = 2; db.capacity = 100000; if (ca) ca.hit = 0.9; db.latency = 4;
      if (s.goals.some(x => x.id === 'cdn')) { const cdn = newNode('cdn'); d.nodes.push(cdn); d.edges.push({ from: d.nodes[0].id, to: cdn.id }, { from: cdn.id, to: lb.id }); }
      const r2 = simulate(d, s.traffic); expect(r2.successRate, s.id).toBeGreaterThanOrEqual(0.999); expect(r2.spof, s.id).toEqual([]);
    }
  });
});
