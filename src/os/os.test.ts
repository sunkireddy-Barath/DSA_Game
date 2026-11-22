import { describe, expect, it } from 'vitest';
import { schedule, pageReplacement, safety, requestResources, need, ResourceSim, diskSchedule, Proc } from './engines';

const P: Proc[] = [{ pid: 'P1', arrival: 0, burst: 5 }, { pid: 'P2', arrival: 1, burst: 3 }, { pid: 'P3', arrival: 2, burst: 1 }];
const comp = (r: ReturnType<typeof schedule>) => Object.fromEntries(r.metrics.map(m => [m.pid, m.completion]));

describe('CPU scheduling (spec example, hand-computed)', () => {
  it('FCFS', () => {
    const r = schedule(P, 'FCFS');
    expect(comp(r)).toEqual({ P1: 5, P2: 8, P3: 9 });
    expect(r.metrics.map(m => m.waiting)).toEqual([0, 4, 6]);
    expect(r.metrics.map(m => m.turnaround)).toEqual([5, 7, 7]);
    expect(r.avgWaiting).toBeCloseTo(10 / 3);
    expect(r.contextSwitches).toBe(2); expect(r.cpuUtilization).toBe(1);
  });
  it('SJF (non-preemptive)', () => { expect(comp(schedule(P, 'SJF'))).toEqual({ P1: 5, P3: 6, P2: 9 }); });
  it('SRTF', () => {
    const r = schedule(P, 'SRTF');
    expect(comp(r)).toEqual({ P1: 9, P2: 5, P3: 3 });
    expect(r.segments.map(s => `${s.pid}:${s.start}-${s.end}`)).toEqual(['P1:0-1', 'P2:1-2', 'P3:2-3', 'P2:3-5', 'P1:5-9']);
  });
  it('Round Robin q=2 (arrivals queue before the preempted process)', () => {
    const r = schedule(P, 'RR', 2);
    expect(r.segments.map(s => `${s.pid}:${s.start}-${s.end}`)).toEqual(['P1:0-2', 'P2:2-4', 'P3:4-5', 'P1:5-7', 'P2:7-8', 'P1:8-9']);
    expect(comp(r)).toEqual({ P1: 9, P2: 8, P3: 5 });
  });
  it('Priority (lower number = higher priority)', () => {
    const r = schedule([{ pid: 'A', arrival: 0, burst: 3, priority: 2 }, { pid: 'B', arrival: 0, burst: 2, priority: 1 }, { pid: 'C', arrival: 0, burst: 1, priority: 3 }], 'PRIORITY');
    expect(r.segments.map(s => s.pid)).toEqual(['B', 'A', 'C']);
    const p = schedule([{ pid: 'A', arrival: 0, burst: 4, priority: 3 }, { pid: 'B', arrival: 1, burst: 1, priority: 1 }], 'PRIORITY_P');
    expect(p.segments.map(s => `${s.pid}:${s.start}-${s.end}`)).toEqual(['A:0-1', 'B:1-2', 'A:2-5']);
  });
  it('handles idle time and invariants for random workloads', () => {
    const r = schedule([{ pid: 'A', arrival: 3, burst: 2 }], 'FCFS');
    expect(r.segments[0]).toEqual({ pid: null, start: 0, end: 3 }); expect(r.cpuUtilization).toBeCloseTo(2 / 5);
    for (const algo of ['FCFS', 'SJF', 'SRTF', 'RR', 'PRIORITY', 'PRIORITY_P'] as const) for (let k = 0; k < 40; k++) {
      const ps: Proc[] = Array.from({ length: 1 + (k % 5) }, (_, i) => ({ pid: 'Q' + i, arrival: (k * 7 + i * 3) % 6, burst: 1 + ((k + i * 5) % 6), priority: (k + i) % 4 }));
      const x = schedule(ps, algo, 1 + (k % 3));
      x.metrics.forEach(m => { expect(m.turnaround).toBe(m.completion - m.arrival); expect(m.waiting).toBe(m.turnaround - m.burst); expect(m.waiting).toBeGreaterThanOrEqual(0); expect(m.response).toBeGreaterThanOrEqual(0); });
      const total = x.segments.filter(s => s.pid).reduce((s, g) => s + g.end - g.start, 0);
      expect(total).toBe(ps.reduce((s, p) => s + p.burst, 0));
    }
  });
});

describe('page replacement (textbook results)', () => {
  const s = [7, 0, 1, 2, 0, 3, 0, 4];
  it('spec example, 3 frames', () => { expect(pageReplacement(s, 3, 'FIFO').faults).toBe(7); expect(pageReplacement(s, 3, 'LRU').faults).toBe(6); expect(pageReplacement(s, 3, 'OPT').faults).toBe(6); });
  const b = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
  it("Belady's anomaly", () => { expect(pageReplacement(b, 3, 'FIFO').faults).toBe(9); expect(pageReplacement(b, 4, 'FIFO').faults).toBe(10); expect(pageReplacement(b, 3, 'LRU').faults).toBe(10); expect(pageReplacement(b, 3, 'OPT').faults).toBe(7); });
  it('steps are consistent', () => { const r = pageReplacement(b, 3, 'LRU'); expect(r.steps.filter(x => x.fault).length).toBe(r.faults); r.steps.forEach(x => expect(x.frames).toContain(x.ref)); });
});

describe("Banker's algorithm (Silberschatz example)", () => {
  const st = { available: [3, 3, 2], max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]], alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]] };
  it('need matrix and safe sequence', () => {
    expect(need(st)).toEqual([[7, 4, 3], [1, 2, 2], [6, 0, 0], [0, 1, 1], [4, 3, 1]]);
    const r = safety(st); expect(r.safe).toBe(true); expect(r.sequence).toEqual([1, 3, 0, 2, 4]);
  });
  it('requests', () => {
    const a = requestResources(st, 1, [1, 0, 2]); expect(a.granted).toBe(true);
    const b = requestResources(a.next!, 4, [3, 3, 0]); expect(b.granted).toBe(false); expect(b.reason).toMatch(/wait/);
    const c = requestResources(a.next!, 0, [0, 2, 0]); expect(c.granted).toBe(false); expect(c.reason).toMatch(/UNSAFE/);
  });
  it('detects an unsafe state', () => { expect(safety({ available: [0], max: [[2], [2]], alloc: [[1], [1]] }).safe).toBe(false); });
});

describe('deadlock simulator', () => {
  it('T1 holds A wants B, T2 holds B wants A', () => {
    const s = new ResourceSim(['T1', 'T2'], ['A', 'B']);
    expect(s.request('T1', 'A')).toBe('granted'); expect(s.request('T2', 'B')).toBe('granted');
    expect(s.findCycle()).toBeNull();
    expect(s.request('T1', 'B')).toBe('blocked'); expect(s.request('T2', 'A')).toBe('blocked');
    expect(s.waitFor().sort()).toEqual([['T1', 'T2'], ['T2', 'T1']]);
    expect(s.findCycle()!.sort()).toEqual(['T1', 'T2']);
    s.abort('T2');
    expect(s.findCycle()).toBeNull(); expect(s.res.B.holder).toBe('T1'); expect(s.res.A.holder).toBe('T1');
  });
  it('release hands the lock to the first waiter', () => {
    const s = new ResourceSim(['T1', 'T2', 'T3'], ['A']); s.request('T1', 'A'); s.request('T2', 'A'); s.request('T3', 'A'); s.release('T1', 'A');
    expect(s.res.A.holder).toBe('T2'); expect(s.res.A.queue).toEqual(['T3']);
  });
});

describe('disk scheduling (classic 53 / 98 183 37 122 14 124 65 67)', () => {
  const q = [98, 183, 37, 122, 14, 124, 65, 67];
  it('totals', () => {
    expect(diskSchedule(q, 53, 'FCFS').total).toBe(640);
    expect(diskSchedule(q, 53, 'SSTF').total).toBe(236);
    expect(diskSchedule(q, 53, 'SCAN', 200, 'down').total).toBe(236);
    expect(diskSchedule(q, 53, 'SCAN', 200, 'up').total).toBe(331);
  });
});
