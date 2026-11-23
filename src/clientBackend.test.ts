import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeProgress, pick, toWire, Progress } from './progressMerge';
import { api, ApiError } from './api';
import { accepts } from './components/NativePanel';
import { buildTraceContext } from './components/AiTutor';
import { runCpp } from './engine/interp';
import { PLAYABLE_BY_TITLE } from './data/problems';
import { readFileSync } from 'node:fs';

const empty = (): Progress => ({ xp: 0, solved: {}, attempts: {}, drafts: {}, qaDone: {}, games: {}, predictions: { correct: 0, total: 0 }, streak: { last: '', count: 0 }, seconds: 0, last: null, log: [] });
const A: Progress = { ...empty(), xp: 100, solved: { 'two-sum': { at: 1000, attempts: 2, hints: 1 } }, attempts: { 'two-sum': 2 }, qaDone: { 'dsa-1': true }, predictions: { correct: 3, total: 5 }, streak: { last: '2025-01-02', count: 2 }, seconds: 60, log: [{ t: 10, text: 'a' }], drafts: { p1: 'int x;' } };
const B: Progress = { ...empty(), xp: 80, solved: { 'two-sum': { at: 500, attempts: 4, hints: 0 }, lru: { at: 2000, attempts: 1, hints: 0 } }, attempts: { 'two-sum': 4, lru: 1 }, qaDone: { 'os-2': true }, predictions: { correct: 1, total: 9 }, streak: { last: '2025-01-05', count: 1 }, seconds: 10, log: [{ t: 20, text: 'b' }] };

describe('progress merge (must match backend/app/routes_progress.py)', () => {
  it('unions and takes maxima exactly like the server test expects', () => {
    const m = mergeProgress(A, B);
    expect(m.xp).toBe(100);
    expect(Object.keys(m.solved).sort()).toEqual(['lru', 'two-sum']);
    expect(m.solved['two-sum'].at).toBe(500);
    expect(m.attempts['two-sum']).toBe(4);
    expect(m.qaDone).toEqual({ 'dsa-1': true, 'os-2': true });
    expect(m.predictions).toEqual({ correct: 3, total: 9 });
    expect(m.streak).toEqual({ last: '2025-01-05', count: 1 });
    expect(m.log.map(x => x.t)).toEqual([20, 10]);
    expect(m.seconds).toBe(60);
  });
  it('is idempotent and never loses data in either direction', () => {
    expect(mergeProgress(A, A)).toEqual(mergeProgress(mergeProgress(A, A), A));
    const ab = mergeProgress(A, B), ba = mergeProgress(B, A);
    expect(ab.xp).toBe(ba.xp); expect(Object.keys(ab.solved)).toEqual(expect.arrayContaining(Object.keys(ba.solved)));
  });
  it('trims drafts that the server would reject and keeps only the synced keys', () => {
    const w = toWire({ ...A, drafts: { ok: 'x', big: 'y'.repeat(20001), ['k'.repeat(81)]: 'z' } });
    expect(Object.keys(w.drafts)).toEqual(['ok']);
    expect(Object.keys(pick({ ...A, token: 'nope', foo: 1 })).sort()).toEqual(['attempts', 'drafts', 'games', 'last', 'log', 'predictions', 'qaDone', 'seconds', 'solved', 'streak', 'xp']);
  });
});

describe('api client', () => {
  afterEach(() => vi.unstubAllGlobals());
  const respond = (status: number, body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })));

  it('sends credentials and the CSRF header on every request', async () => {
    respond(200, { id: 1, email: 'a@b.c', displayName: 'A' });
    await api.login('a@b.c', 'password1');
    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(init.credentials).toBe('include');
    expect(init.headers['X-Requested-With']).toBe('csquest');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.c', password: 'password1' });
  });
  it('turns server errors into readable ApiError messages', async () => {
    respond(401, { detail: 'incorrect e-mail or password' });
    await expect(api.login('a@b.c', 'wrongpass')).rejects.toMatchObject({ status: 401, message: 'incorrect e-mail or password' });
    respond(503, { detail: { code: 'sandbox_unavailable', message: 'the code sandbox is disabled on this server' } });
    await expect(api.runCpp({ code: 'x', std: 'c++17', fn: 'f', args: [] })).rejects.toMatchObject({ status: 503, code: 'sandbox_unavailable', message: 'the code sandbox is disabled on this server' });
    respond(422, { detail: 'invalid request', errors: [{ field: 'password', message: 'String should have at least 8 characters' }] });
    await expect(api.register('a@b.c', 'short', '')).rejects.toThrow(/password String should have at least 8 characters/);
    respond(500, 'not json');
    await expect(api.me()).rejects.toMatchObject({ status: 500, message: 'Request failed (HTTP 500)' });
  });
  it('reports an unreachable backend clearly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const err = await api.health().catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, code: 'network' });
    expect(err.message).toMatch(/Cannot reach the server/);
  });
});

describe('native results are judged with the same rules as the in-browser judge', () => {
  const p = PLAYABLE_BY_TITLE.get('Two Sum')!;
  it('accepts equal results and rejects different ones', () => {
    expect(accepts(p, [[2, 7], 9], [0, 1], [0, 1])).toBe(true);
    expect(accepts(p, [[2, 7], 9], [1, 0], [0, 1])).toBe(false);
  });
  it('honours unordered problems and custom checkers', () => {
    const unordered = [...PLAYABLE_BY_TITLE.values()].find(x => x.unordered)!;
    expect(accepts(unordered, [], [[2], [1]], [[1], [2]])).toBe(true);
    const custom = [...PLAYABLE_BY_TITLE.values()].find(x => x.check)!;
    expect(typeof accepts(custom, structuredClone(custom.tests[0]), null, null)).toBe('boolean');
  });
});

describe('tutor context is built only from what is on screen', () => {
  it('describes the current trace step, variables and call stack', () => {
    const p = PLAYABLE_BY_TITLE.get('Fibonacci Number')!;
    const code = p.approaches[0].code;
    const run = runCpp(code, p.fn, [4], { trace: true });
    const lines = code.split('\n');
    const idx = Math.min(5, run.events.length - 1);
    const ctx = buildTraceContext(run.events, idx, lines)!;
    expect(ctx.step).toBe(idx + 1); expect(ctx.total).toBe(run.events.length);
    expect(ctx.lineText).toBe((lines[run.events[idx].line - 1] ?? '').trim());
    expect(ctx.variables).toMatch(/n = \d/);
    expect(ctx.callStack).toContain(p.fn);
    expect(buildTraceContext([], 0, lines)).toBeNull();
  });
});

describe('deployment config', () => {
  it('vercel.json carries a strict CSP and security headers that the dev preview reuses', () => {
    const v = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const h = Object.fromEntries(v.headers[0].headers.map((x: any) => [x.key, x.value]));
    expect(h['Content-Security-Policy']).toContain("default-src 'self'");
    expect(h['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(h['Content-Security-Policy']).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d+/);
  });
});
