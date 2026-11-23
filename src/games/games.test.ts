import { describe, expect, it } from 'vitest';
import { int, newSeed, rng, shuffle } from './rng';
import * as bs from './bsHunt';
import * as sg from './stackGame';
import * as pg from './pageGame';
import * as sn from './subnetGame';
import * as bo from './bigO';
import * as tm from './termMatch';

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const LEVELS = [1, 2, 3] as const;

describe('random helpers', () => {
  it('are deterministic per seed and well spread', () => {
    const a = rng(42), b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(rng(1)()).not.toBe(rng(2)());
    const r = rng(5); const xs = Array.from({ length: 2000 }, () => r());
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0); expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.reduce((s, x) => s + x, 0) / xs.length).toBeGreaterThan(0.45);
    expect(shuffle(rng(3), [1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(int(rng(9), 3, 3)).toBe(3);
    expect(typeof newSeed()).toBe('number');
  });
});

describe('Binary Search Hunter', () => {
  it('rounds are sorted, unique, and contain the target', () => {
    for (const seed of SEEDS) for (const lv of LEVELS) {
      const rd = bs.makeRound(seed, lv);
      expect(rd.values.length).toBe({ 1: 15, 2: 31, 3: 63 }[lv]);
      expect(rd.values.every((v, i) => i === 0 || v > rd.values[i - 1])).toBe(true);
      expect(rd.values).toContain(rd.target);
    }
  });
  it('probing the middle every time always finds the target within the optimal number of probes (3 stars)', () => {
    for (const seed of SEEDS) for (const lv of LEVELS) {
      const rd = bs.makeRound(seed, lv);
      let s = bs.initial(rd);
      while (!s.found) { const before = s; s = bs.probe(rd, s, bs.hintIndex(s)); expect(s).not.toBe(before); }
      expect(s.probes.length).toBeLessThanOrEqual(bs.optimalProbes(rd.values.length));
      expect(bs.stars(rd, s)).toBe(3);
      expect(s.probes.every(p => !p.wasted)).toBe(true);
    }
  });
  it('the range shrinks correctly and probes outside it are marked wasted', () => {
    const rd = { values: [10, 20, 30, 40, 50, 60, 70], target: 60, level: 1 as const };
    let s = bs.initial(rd);
    s = bs.probe(rd, s, 1);                                  // 20 < 60
    expect([s.lo, s.hi]).toEqual([2, 6]);
    s = bs.probe(rd, s, 0);                                  // outside the range
    expect(s.probes[1].wasted).toBe(true); expect([s.lo, s.hi]).toEqual([2, 6]);
    s = bs.probe(rd, s, 6);                                  // 70 > 60
    expect([s.lo, s.hi]).toEqual([2, 5]);
    s = bs.probe(rd, s, 5);
    expect(s.found).toBe(true);
    expect(s.probes.length).toBe(4);
    expect(bs.stars(rd, s)).toBe(2);                         // optimal for 7 elements is 3; 4 probes (one wasted) is one over → 2 stars
  });
  it('star thresholds: optimal = 3, one over = 2, more = 1, not found = 0', () => {
    const rd = bs.makeRound(1, 1);
    const mk = (n: number, found: boolean) => ({ lo: 0, hi: 0, found, probes: Array.from({ length: n }, () => ({ idx: 0, value: 0, result: 'low' as const, wasted: false })) });
    expect(bs.stars(rd, mk(4, true))).toBe(3); expect(bs.stars(rd, mk(5, true))).toBe(2); expect(bs.stars(rd, mk(6, true))).toBe(1); expect(bs.stars(rd, mk(2, false))).toBe(0);
    expect(bs.optimalProbes(15)).toBe(4); expect(bs.optimalProbes(31)).toBe(5); expect(bs.optimalProbes(63)).toBe(6);
  });
  it('ignores invalid indices and probes after the target was found', () => {
    const rd = bs.makeRound(3, 1); const s = bs.initial(rd);
    expect(bs.probe(rd, s, -1)).toBe(s); expect(bs.probe(rd, s, 99)).toBe(s);
    const idx = rd.values.indexOf(rd.target); const f = bs.probe(rd, s, idx);
    expect(bs.probe(rd, f, 0)).toBe(f);
    expect(bs.explain(rd, f.probes[0])).toMatch(/Found it/);
  });
});

describe('Bracket Balancer', () => {
  const play = (str: string) => {
    let st = sg.start(str); let guard = 0;
    while (!st.over && guard++ < 200) st = sg.apply(st, sg.expected(st));
    return st;
  };
  it('perfect play reaches the right verdict with zero mistakes on random rounds (checked against an independent balance test)', () => {
    let valid = 0, invalid = 0;
    for (const seed of SEEDS) for (const lv of LEVELS) {
      for (const s of sg.makeRound(seed, lv).strings) {
        const st = play(s);
        expect(st.over).toBe(true);
        expect(st.mistakes).toBe(0);
        expect(st.valid).toBe(sg.isBalanced(s));
        st.valid ? valid++ : invalid++;
      }
    }
    expect(valid).toBeGreaterThan(50); expect(invalid).toBeGreaterThan(50);           // both outcomes occur
  });
  it('a wrong action costs a mistake, leaves the state untouched and explains why', () => {
    const st = sg.start('([)]');
    const wrong = sg.apply(st, 'pop');
    expect(wrong.mistakes).toBe(1); expect(wrong.i).toBe(0); expect(wrong.stack).toEqual([]);
    expect(wrong.message).toMatch(/push/);
    let s = sg.apply(sg.apply(st, 'push'), 'push');                                    // stack: ( [
    expect(sg.expected(s)).toBe('reject');                                              // ')' would close '(' but top is '['
    expect(sg.apply(s, 'pop').message).toMatch(/cross/);
    s = sg.apply(s, 'reject'); expect(s.valid).toBe(false);
    expect(sg.apply(s, 'push')).toBe(s);                                               // finished rounds ignore input
  });
  it('an unclosed string is rejected at the end and a balanced one is accepted', () => {
    expect(play('(((').valid).toBe(false); expect(play('(){}[]').valid).toBe(true); expect(play(')').valid).toBe(false); expect(play('').valid).toBe(true);
    expect(sg.stars(0)).toBe(3); expect(sg.stars(2)).toBe(2); expect(sg.stars(3)).toBe(1);
  });
});

describe('Page Fault Predictor', () => {
  // independent FIFO / LRU simulators
  const sim = (refs: number[], frames: number, algo: 'FIFO' | 'LRU') => {
    const mem: number[] = []; const out: ('hit' | 'fault')[] = [];
    for (const p of refs) {
      const at = mem.indexOf(p);
      if (at >= 0) { out.push('hit'); if (algo === 'LRU') { mem.splice(at, 1); mem.push(p); } continue; }
      out.push('fault'); if (mem.length === frames) mem.shift(); mem.push(p);
    }
    return out;
  };
  it('the answers match an independent simulation for every round', () => {
    for (const seed of SEEDS) for (const lv of LEVELS) {
      const rd = pg.makeRound(seed, lv);
      const want = sim(rd.refs, rd.frames, rd.algo as 'FIFO' | 'LRU');
      expect(rd.refs.map((_, k) => pg.truth(rd, k))).toEqual(want);
      expect(rd.faults).toBe(want.filter(x => x === 'fault').length);
    }
  });
  it('rounds contain both hits and faults so prediction is a real task', () => {
    const mix = SEEDS.map(s => pg.makeRound(s, 2)).filter(rd => rd.faults > 0 && rd.faults < rd.refs.length);
    expect(mix.length).toBeGreaterThan(50);
    expect(pg.stars(10, 10)).toBe(3); expect(pg.stars(8, 10)).toBe(2); expect(pg.stars(5, 10)).toBe(1); expect(pg.stars(4, 10)).toBe(0);
  });
});

describe('Subnet Sniper', () => {
  const toNum = (ip: string) => ip.split('.').reduce((a, o) => a * 256 + Number(o), 0);
  const fmt = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  it('every question has four distinct options, exactly one correct, and an explanation', () => {
    for (const seed of SEEDS) for (const lv of LEVELS) for (const q of sn.makeRound(seed, lv).questions) {
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correct).toBeGreaterThanOrEqual(0); expect(q.correct).toBeLessThan(q.options.length);
      expect(q.explain.length).toBeGreaterThan(20);
    }
  });
  it('correct answers equal an independent bit-level computation', () => {
    let checked = 0;
    for (const seed of SEEDS) for (const lv of LEVELS) for (const q of sn.makeRound(seed, lv).questions) {
      const m = q.prompt.match(/(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
      const ans = q.options[q.correct];
      if (q.kind === 'hosts' && m) { expect(Number(ans)).toBe(2 ** (32 - Number(m[2])) - 2); checked++; }
      if ((q.kind === 'network' || q.kind === 'broadcast') && m) {
        const mask = Number(m[2]) === 0 ? 0 : (0xffffffff << (32 - Number(m[2]))) >>> 0;
        const net = (toNum(m[1]) & mask) >>> 0;
        expect(ans).toBe(fmt(q.kind === 'network' ? net : (net | (~mask >>> 0)) >>> 0)); checked++;
      }
      if (q.kind === 'first' && m) { const mask = (0xffffffff << (32 - Number(m[2]))) >>> 0; expect(ans).toBe(fmt(((toNum(m[1]) & mask) >>> 0) + 1)); checked++; }
      if (q.kind === 'need') { const n = Number(q.prompt.match(/fits (\d+) hosts/)![1]); const p = Number(ans.slice(1)); expect(2 ** (32 - p) - 2).toBeGreaterThanOrEqual(n); expect(2 ** (32 - p - 1) - 2).toBeLessThan(n); checked++; }
    }
    expect(checked).toBeGreaterThan(600);
  });
  it('scores', () => { expect(sn.stars(8, 8)).toBe(3); expect(sn.stars(6, 8)).toBe(2); expect(sn.stars(4, 8)).toBe(1); expect(sn.stars(3, 8)).toBe(0); });
});

describe('Big-O Match', () => {
  it('the declared complexity of every snippet is confirmed by MEASURED statement counts from the interpreter', () => {
    for (const sn of bo.SNIPPETS) {
      const m = bo.measureAll(sn);
      expect(m.every(x => x.steps > 0), sn.id).toBe(true);
      expect(bo.classify(sn, m), `${sn.id}: ${JSON.stringify(m)}`).toBe(sn.label);
    }
  });
  it('the bank covers every complexity class and every level', () => {
    expect(new Set(bo.SNIPPETS.map(s => s.label)).size).toBe(bo.CHOICES.length);
    expect([1, 2, 3].every(l => bo.SNIPPETS.some(s => s.level === l))).toBe(true);
    expect(new Set(bo.SNIPPETS.map(s => s.id)).size).toBe(bo.SNIPPETS.length);
  });
  it('rounds respect the level', () => { expect(bo.makeRound(rng(1), 1).every(s => s.level === 1)).toBe(true); expect(bo.makeRound(rng(1), 3).length).toBe(8); });
});

describe('Term Match', () => {
  it('there are plenty of cards and every card pair is a real glossary term with its own definition', () => {
    const all = tm.facts();
    expect(all.length).toBeGreaterThan(60);
    expect(tm.facts('os').length).toBeGreaterThan(5);
    for (const f of all) { expect(f.def.length).toBeLessThanOrEqual(120); expect(f.def).not.toContain(f.term + ' —'); }
  });
  it('a deck holds each pair exactly twice (one term, one definition)', () => {
    for (const lv of LEVELS) {
      const d = tm.makeDeck(11, lv);
      expect(d.cards.length).toBe(d.pairs * 2);
      for (let p = 0; p < d.pairs; p++) expect(d.cards.filter(c => c.pair === p).map(c => c.kind).sort()).toEqual(['def', 'term']);
      expect(d.cards.map(c => c.id)).toEqual(d.cards.map((_, i) => i));
    }
  });
  it('flipping, matching and mismatching work, and perfect play finishes in `pairs` moves', () => {
    let d = tm.makeDeck(5, 1);
    const find = (pair: number, kind: 'term' | 'def') => d.cards.find(c => c.pair === pair && c.kind === kind)!.id;
    // a wrong pair
    d = tm.flip(d, find(0, 'term')); expect(tm.flip(d, find(0, 'term'))).toBe(d);                   // same card twice is ignored
    d = tm.flip(d, find(1, 'def'));
    expect(d.moves).toBe(1); expect(tm.isMatch(d)).toBe(false);
    expect(tm.flip(d, find(2, 'term'))).toBe(d);                                                      // a third card cannot be flipped
    d = tm.resolve(d); expect(d.flipped).toEqual([]); expect(d.matched.size).toBe(0);
    for (let p = 0; p < d.pairs; p++) { d = tm.flip(tm.flip(d, find(p, 'term')), find(p, 'def')); expect(tm.isMatch(d)).toBe(true); d = tm.resolve(d); }
    expect(tm.done(d)).toBe(true); expect(d.moves).toBe(1 + d.pairs);
    expect(tm.stars(6, 6)).toBe(3); expect(tm.stars(14, 6)).toBe(2); expect(tm.stars(30, 6)).toBe(1);
  });
});
