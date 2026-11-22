// Cross-checks every solution in the problem bank against REAL g++ (run through the backend sandbox tooling).
//   1) NATIVE_VERIFY=dump    npx vitest run src/nativeVerify.test.ts   -> writes tools/native/cases.json
//   2) python backend/tools/verify_problems.py                        -> runs them in Docker, writes tools/native/results.json
//   3) NATIVE_VERIFY=compare npx vitest run src/nativeVerify.test.ts   -> compares native output with the reference using the app's judge rules
// Skipped in a normal `npm test`.
import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PLAYABLE } from './data/problems';
import { close } from './engine/judge';

const MODE = process.env.NATIVE_VERIFY;
const DIR = 'tools/native';
const canon = (v: any): any => (Array.isArray(v) && v.length ? (v.every(Array.isArray) ? v.map(r => JSON.stringify(r)).sort() : v.every(x => typeof x !== 'object') ? [...v].sort() : v) : v);
const key = (title: string, ai: number) => `${title}#${ai}`;

describe.runIf(MODE === 'dump')('dump cases', () => {
  it('writes cases.json', () => {
    mkdirSync(DIR, { recursive: true });
    const cases = PLAYABLE.flatMap(p => p.approaches.map((ap, ai) => ({
      key: key(p.title, ai), title: p.title, approach: ap.label, fn: p.fn, code: ap.code,
      tests: p.tests.map(args => ({ args, expected: p.ref(...structuredClone(args)) })),
    })));
    writeFileSync(`${DIR}/cases.json`, JSON.stringify(cases));
    expect(cases.length).toBeGreaterThan(400);
  });
});

describe.runIf(MODE === 'compare')('native g++ agrees with the reference', () => {
  const results: Record<string, { status: string; message?: string; outputs?: ({ result: any; args: any[] } | { error: string })[] }> = existsSync(`${DIR}/results.json`) ? JSON.parse(readFileSync(`${DIR}/results.json`, 'utf8')) : {};
  it('has native results for every approach', () => {
    expect(Object.keys(results).length).toBe(PLAYABLE.reduce((n, p) => n + p.approaches.length, 0));
  });
  const report: string[] = [];
  const stats = { checked: 0, passed: 0, skippedInput: 0, compileFail: 0, wrong: 0, runtime: 0 };
  it('every approach produces the reference answer', () => {
    for (const p of PLAYABLE) p.approaches.forEach((ap, ai) => {
      const r = results[key(p.title, ai)];
      if (!r) return;
      if (r.status === 'compile_error') { stats.compileFail++; report.push(`COMPILE  ${p.title} / ${ap.label}: ${(r.message ?? '').split('\n').slice(0, 3).join(' | ')}`); return; }
      if (r.status === 'harness_error') { stats.skippedInput++; report.push(`SKIPPED  ${p.title} / ${ap.label}: ${r.message}`); return; }
      p.tests.forEach((args, ti) => {
        stats.checked++;
        const out = r.outputs?.[ti];
        if (out && 'error' in out && out.error.includes('not supported by the native runner')) { stats.skippedInput++; report.push(`SKIPPED  ${p.title} / ${ap.label} test ${ti}: tracer-only input form`); return; }
        if (!out || 'error' in out) { stats.runtime++; report.push(`RUNTIME  ${p.title} / ${ap.label} test ${ti} ${JSON.stringify(args).slice(0, 80)}: ${out && 'error' in out ? out.error : 'no output'}`); return; }
        const expected = p.ref(...structuredClone(args));
        const got = p.checkArg !== undefined ? out.args[p.checkArg] : out.result;
        const gotN = typeof got === 'string' && /^-?\d{16,}$/.test(got) ? got : got;
        let ok: boolean;
        if (p.tol !== undefined) ok = close(gotN, expected, p.tol);
        else if (p.check) ok = p.check(structuredClone(args), gotN);
        else ok = JSON.stringify(p.unordered ? canon(gotN) : gotN) === JSON.stringify(p.unordered ? canon(expected) : expected);
        if (ok) stats.passed++; else { stats.wrong++; report.push(`WRONG    ${p.title} / ${ap.label} test ${ti} ${JSON.stringify(args).slice(0, 80)}: expected ${JSON.stringify(expected).slice(0, 60)} got ${JSON.stringify(gotN).slice(0, 60)}`); }
      });
    });
    mkdirSync(DIR, { recursive: true });
    writeFileSync(`${DIR}/report.txt`, JSON.stringify(stats) + '\n' + report.join('\n'));
    console.log('NATIVE STATS', JSON.stringify(stats));
    expect(stats.wrong + stats.runtime + stats.compileFail).toBe(0);
  });
});
