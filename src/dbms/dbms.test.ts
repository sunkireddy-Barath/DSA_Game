import { describe, expect, it } from 'vitest';
import { analyze, bcnfDecompose, BPlusTree, candidateKeys, closure, fd, isLossless, naturalJoin, parseSchedule, analyzeSchedule, preservesDependencies, project, runTransfer, sameRelation, violatesFD, redundancy } from './engines';

const R = ['D', 'H', 'N', 'S'];
const fds = [fd('S', 'N D'), fd('D', 'H')];

describe('functional dependencies and normalization', () => {
  it('closure and keys', () => {
    expect(closure(['S'], fds)).toEqual(['D', 'H', 'N', 'S']);
    expect(closure(['D'], fds)).toEqual(['D', 'H']);
    expect(candidateKeys(R, fds)).toEqual([['S']]);
  });
  it('student/department table is 2NF but not 3NF (transitive dependency)', () => {
    const r = analyze(R, fds); expect(r.highest).toBe('2NF'); expect(r.violations.some(v => v.form === '3NF' && v.fd === 'D → H')).toBe(true);
  });
  it('3NF but not BCNF: AB→C, C→B', () => {
    const g = [fd('A B', 'C'), fd('C', 'B')];
    expect(candidateKeys(['A', 'B', 'C'], g)).toEqual([['A', 'B'], ['A', 'C']]);
    const r = analyze(['A', 'B', 'C'], g);
    expect(r.highest).toBe('3NF'); expect(r.bcnf).toBe(false);
  });
  it('partial dependency violates 2NF', () => { const r = analyze(['A', 'B', 'C'], [fd('A B', 'C'), fd('A', 'C')]); expect(r.nf2).toBe(false); });
  it('BCNF decomposition is lossless and preserves dependencies here', () => {
    const parts = bcnfDecompose(R, fds);
    expect(parts.map(p => p.join('')).sort()).toEqual(['DH', 'DNS']);
    expect(isLossless(R, parts, fds)).toBe(true);
    expect(preservesDependencies(parts, fds).preserved).toBe(true);
  });
  it('lossless / lossy and dependency preservation', () => {
    const f = [fd('A', 'B')];
    expect(isLossless(['A', 'B', 'C'], [['A', 'B'], ['A', 'C']], f)).toBe(true);
    expect(isLossless(['A', 'B', 'C'], [['A', 'B'], ['B', 'C']], f)).toBe(false);
    const g = [fd('A B', 'C'), fd('C', 'B')];
    const pp = preservesDependencies([['A', 'C'], ['B', 'C']], g); expect(pp.preserved).toBe(false); expect(pp.lost.length).toBe(1);
  });
  const rows = [{ S: '101', N: 'Arun', D: 'CSE', H: 'Ravi' }, { S: '102', N: 'Bala', D: 'CSE', H: 'Ravi' }, { S: '103', N: 'Charan', D: 'ECE', H: 'Kumar' }];
  it('data: decomposition then natural join returns the original rows', () => {
    const a = project(rows, ['D', 'H']), b = project(rows, ['S', 'N', 'D']);
    expect(a.length).toBe(2); expect(sameRelation(naturalJoin(a, b), rows)).toBe(true);
    const lossy = naturalJoin(project(rows, ['S', 'N']), project(rows, ['D', 'H'])); expect(lossy.length).toBe(6); expect(sameRelation(lossy, rows)).toBe(false);
  });
  it('data: update anomaly and redundancy are detected', () => {
    expect(redundancy(rows, fd('D', 'H'))).toBe(1);
    const bad = rows.map((r, i) => (i === 0 ? { ...r, H: 'Mohan' } : r));
    expect(violatesFD(bad, fd('D', 'H'))).toEqual([{ x: 'CSE', ys: ['Mohan', 'Ravi'] }]);
    expect(violatesFD(rows, fd('D', 'H'))).toEqual([]);
  });
});

describe('transactions (WAL model, bank transfer)', () => {
  it('success', () => { const r = runTransfer({ amount: 2000, crashAt: null, mode: 'wal' }); expect(r.recovered.disk).toEqual({ A: 8000, B: 7000 }); expect(r.consistent).toBe(true); });
  it('atomicity: crash before COMMIT is rolled back', () => {
    for (const at of [1, 2, 3, 4, 5, 6, 7]) { const r = runTransfer({ amount: 2000, crashAt: at, mode: 'wal' }); expect(r.recovered.disk, `crash at ${at}`).toEqual({ A: 10000, B: 5000 }); expect(r.recovered.status).toBe('rolled back'); }
  });
  it('without transactions a mid-transfer crash destroys money', () => {
    const r = runTransfer({ amount: 2000, crashAt: 6, mode: 'no-transactions' });
    expect(r.recovered.disk).toEqual({ A: 8000, B: 5000 }); expect(r.consistent).toBe(false);
  });
  it('durability: crash after COMMIT but before page flush is redone from the log', () => {
    const r = runTransfer({ amount: 2000, crashAt: 8, mode: 'wal', flushOnCommit: false });
    expect(r.steps[r.steps.length - 1].state.disk).toEqual({ A: 10000, B: 5000 });
    expect(r.recovered.disk).toEqual({ A: 8000, B: 7000 }); expect(r.recovered.status).toBe('committed');
  });
  it('total is always preserved with WAL, for any crash point', () => {
    for (let at = 0; at <= 8; at++) for (const f of [true, false]) { const r = runTransfer({ amount: 1234, crashAt: at, mode: 'wal', flushOnCommit: f }); expect(r.consistent).toBe(true); }
  });
});

describe('schedules', () => {
  it('conflict-serializable', () => { const a = analyzeSchedule(parseSchedule('R1(A) W1(A) R2(A) W2(A) C1 C2')); expect(a.serializable).toBe(true); expect(a.serialOrder).toEqual([1, 2]); });
  it('non-serializable has a cycle', () => { const a = analyzeSchedule(parseSchedule('R1(A) W2(A) W1(A) C1 C2')); expect(a.serializable).toBe(false); expect([...a.cycle!].sort()).toEqual([1, 2]); });
  it('recoverability and cascading rollback', () => {
    const d = analyzeSchedule(parseSchedule('W1(A) R2(A) C1 C2')); expect(d.recoverable).toBe(true); expect(d.cascadeless).toBe(false);
    const u = analyzeSchedule(parseSchedule('W1(A) R2(A) C2 C1')); expect(u.recoverable).toBe(false);
    const ok = analyzeSchedule(parseSchedule('W1(A) C1 R2(A) C2')); expect(ok.recoverable && ok.cascadeless).toBe(true);
  });
  it('rejects bad syntax', () => { expect(() => parseSchedule('X1(A)')).toThrow(); });
});

describe('B+ tree', () => {
  const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (const m of [3, 4, 5, 6]) it(`fuzz insert/delete/search keeps all invariants (max ${m} keys)`, () => {
    const t = new BPlusTree(m), model = new Set<number>(), r = rng(m * 97);
    for (let step = 0; step < 600; step++) {
      const k = Math.floor(r() * 120);
      if (r() < 0.6) { t.insert(k); model.add(k); } else { t.delete(k); model.delete(k); }
      t.check();
      expect(t.keys()).toEqual([...model].sort((a, b) => a - b));
      expect(t.search(k).found).toBe(model.has(k));
    }
  });
  it('splits grow the tree and deletes shrink it back', () => {
    const t = new BPlusTree(3); for (let i = 1; i <= 20; i++) t.insert(i); expect(t.height()).toBeGreaterThan(2);
    for (let i = 1; i <= 20; i++) t.delete(i); t.check(); expect(t.height()).toBe(1); expect(t.keys()).toEqual([]);
  });
  it('reports split events', () => { const t = new BPlusTree(3); t.insert(1); t.insert(2); t.insert(3); expect(t.insert(4).join(' ')).toMatch(/Leaf overflow/); });
});
