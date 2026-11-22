import { describe, expect, it } from 'vitest';
import { runCpp } from './interp';
import { PLAYABLE } from '../data/problems';
import { ALL_PROBLEMS, SHEET } from '../data/sheet';
import { evaluate, close } from './judge';

const canon = (v: any): any => (Array.isArray(v) && v.length ? (v.every(Array.isArray) ? v.map(r => JSON.stringify(r)).sort() : v.every(x => typeof x !== 'object') ? [...v].sort() : v) : v);

describe('curriculum', () => {
  it('has all 18 steps and every playable title exists in the sheet', () => {
    expect(SHEET.length).toBe(18);
    const titles = new Set(ALL_PROBLEMS.map(p => p.title));
    for (const p of PLAYABLE) expect(titles.has(p.title), p.title).toBe(true);
    console.log('sheet problems:', ALL_PROBLEMS.length, 'playable:', PLAYABLE.length);
  });
});

describe.each(PLAYABLE)('$title', p => {
  p.approaches.forEach((ap, ai) => {
    it(`approach "${ap.label}" matches reference on all tests (no-trace and traced agree)`, () => {
      for (const args of p.tests) {
        const expected = p.ref(...structuredClone(args));
        const plain = runCpp(ap.code, p.fn, args, { trace: false, dll: p.dll });
        expect(plain.error, JSON.stringify(args)).toBeUndefined();
        const got = p.checkArg !== undefined ? plain.args![p.checkArg] : plain.result;
        if (p.tol !== undefined) expect(close(got, expected, p.tol), JSON.stringify(args)).toBe(true); else if (p.check) expect(p.check(structuredClone(args), got), JSON.stringify(args)).toBe(true); else expect(p.unordered ? canon(got) : got, JSON.stringify(args)).toEqual(p.unordered ? canon(expected) : expected);
        const traced = runCpp(ap.code, p.fn, args, { trace: true, dll: p.dll });
        expect(traced.result).toEqual(plain.result);
        // trace invariants
        const ev = traced.events;
        if (traced.truncated) { expect(ev.length).toBe(6000); continue; }
        expect(ev.length).toBeGreaterThan(1);
        const lines = ap.code.split('\n').length;
        let depth = 0;
        for (const e of ev) {
          expect(e.line).toBeGreaterThanOrEqual(1); expect(e.line).toBeLessThanOrEqual(lines);
          expect(e.frames.length).toBe(e.depth);
          expect(e.frames[e.frames.length - 1].callId).toBe(e.callId);
          if (e.kind === 'call') depth++;
          if (e.kind === 'return') depth--;
        }
        expect(depth).toBe(0);
        expect(ev[ev.length - 1].kind).toBe('return');
        expect(ev[0].kind).toBe('call');
        // number of call events == number of return events == stats.calls
        expect(ev.filter(e => e.kind === 'call').length).toBe(traced.stats.calls);
        const lr = ev[ev.length - 1].ret; if (p.checkArg === undefined && !(lr && typeof lr === 'object' && '$ptr' in lr) && lr !== null) expect(lr).toEqual(plain.result);
      }
    });
  });
  it('judge passes the reference approach and the starter fails', () => {
    const good = evaluate(p, p.approaches[p.approaches.length - 1].code);
    expect(good.passed).toBe(good.total);
    const bad = evaluate(p, p.starter);
    expect(bad.passed).toBeLessThan(bad.total);
  });
});

describe('recursion tree facts', () => {
  it('fib(4) makes 9 calls with max depth 4', () => {
    const p = PLAYABLE.find(x => x.fn === 'fib')!;
    const r = runCpp(p.approaches[0].code, 'fib', [4], { trace: true });
    expect(r.stats.calls).toBe(9);
    expect(r.stats.maxDepth).toBe(4);
    expect(r.result).toBe(3);
  });
});

describe('errors are real', () => {
  it('reports a syntax error with a line', () => {
    const r = runCpp('class Solution { public: int f(int n) { return n + ; } };', 'f', [1], { trace: true });
    expect(r.ok).toBe(false); expect(r.errorKind).toBe('compile'); expect(r.errorLine).toBe(1);
  });
  it('reports timeouts', () => {
    const r = runCpp('class Solution { public: int f(int n) { while (true) { n++; } return n; } };', 'f', [1], { trace: false, maxSteps: 10000 });
    expect(r.errorKind).toBe('timeout');
  });
  it('reports out-of-bounds', () => {
    const r = runCpp('class Solution { public: int f(vector<int>& a) { return a[5]; } };', 'f', [[1, 2]], { trace: false });
    expect(r.errorKind).toBe('runtime');
  });
  it('labels unsupported constructs instead of faking', () => {
    const r = runCpp('class Solution { public: int f(int n) { Foo f; return n; } };', 'f', [1], { trace: false });
    expect(r.errorKind).toBe('unsupported');
  });
});

describe('pointer trace agrees with the real result', () => {
  it('reverseList: final heap, followed from ret, equals the returned list', () => {
    const p = PLAYABLE.find(x => x.title === 'Reverse a LL (Iterative)')!;
    const r = runCpp(p.approaches[0].code, p.fn, [[10, 20, 30, 40]], { trace: true });
    const last = r.events[r.events.length - 1];
    const byId = new Map(last.heap!.map(n => [n.id, n]));
    const out: number[] = []; let c = (last.ret as any).$ptr;
    while (c) { const n = byId.get(c)!; out.push(n.val); c = n.next; }
    expect(out).toEqual(r.result);
    expect(out).toEqual([40, 30, 20, 10]);
  });
  it('queue/stack/heap operations obey their semantics', () => {
    const src = 'class Solution { public: vector<int> f(vector<int>& a) { priority_queue<int> pq; stack<int> st; queue<int> q; vector<int> out; for (int i = 0; i < a.size(); i++) { pq.push(a[i]); st.push(a[i]); q.push(a[i]); } out.push_back(pq.top()); out.push_back(st.top()); out.push_back(q.front()); pq.pop(); st.pop(); q.pop(); out.push_back(pq.top()); out.push_back(st.top()); out.push_back(q.front()); return out; } };';
    const r = runCpp(src, 'f', [[3, 9, 1, 5]], { trace: false });
    expect(r.result).toEqual([9, 5, 3, 5, 1, 9]);
  });
  it('null dereference is a runtime error, not a crash', () => {
    const r = runCpp('class Solution { public: int f(ListNode* h) { return h->val; } };', 'f', [[]], { trace: false });
    expect(r.errorKind).toBe('runtime');
  });
});
