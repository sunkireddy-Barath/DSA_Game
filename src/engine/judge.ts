import { runCpp } from './interp';
import type { Playable } from '../data/problems';

export interface TestResult { args: any[]; expected: any; got?: any; pass: boolean; error?: string; kind?: string }
export interface Verdict { passed: number; total: number; results: TestResult[]; compileError?: string; compileLine?: number }

export const close = (a: any, b: any, tol: number): boolean => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= tol : Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((x, i) => close(x, b[i], tol)) : JSON.stringify(a) === JSON.stringify(b));
const canon = (v: any): any => (Array.isArray(v) && v.length ? (v.every(Array.isArray) ? v.map(r => JSON.stringify(r)).sort() : v.every(x => typeof x !== 'object') ? [...v].sort() : v) : v);

/** Runs student code against the problem's hidden tests using the real interpreter. */
export function evaluate(p: Playable, code: string): Verdict {
  const results: TestResult[] = [];
  let compileError: string | undefined, compileLine: number | undefined;
  for (const args of p.tests) {
    const expected = p.ref(...structuredClone(args));
    const r = runCpp(code, p.fn, args, { trace: false, maxSteps: 2_000_000, dll: p.dll });
    if (!r.ok) {
      if (r.errorKind === 'compile' || r.errorKind === 'unsupported') { compileError = r.error; compileLine = r.errorLine; }
      results.push({ args, expected, pass: false, error: r.error, kind: r.errorKind });
      if (compileError) break;
      continue;
    }
    const got = p.checkArg !== undefined ? r.args![p.checkArg] : r.result;
    const pass = p.tol !== undefined ? close(got, expected, p.tol) : p.check ? p.check(structuredClone(args), got) : JSON.stringify(p.unordered ? canon(got) : got) === JSON.stringify(p.unordered ? canon(expected) : expected);
    results.push({ args, expected, got, pass });
  }
  return { passed: results.filter(r => r.pass).length, total: p.tests.length, results, compileError, compileLine };
}
