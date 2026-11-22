import { useState } from 'react';
import { api, ApiError, NativeBatch, NativeRun } from '../api';
import { useAuth } from '../auth';
import { close } from '../engine/judge';
import type { RunResult } from '../engine/interp';
import type { Playable } from '../data/problems';

const canon = (v: any): any => (Array.isArray(v) && v.length ? (v.every(Array.isArray) ? v.map(r => JSON.stringify(r)).sort() : v.every(x => typeof x !== 'object') ? [...v].sort() : v) : v);

/** Same acceptance rule the in-browser judge uses, applied to a result produced by real g++. */
export function accepts(p: Playable, args: any[], got: any, expected: any): boolean {
  if (p.tol !== undefined) return close(got, expected, p.tol);
  if (p.check) return p.check(structuredClone(args), got);
  return JSON.stringify(p.unordered ? canon(got) : got) === JSON.stringify(p.unordered ? canon(expected) : expected);
}

interface Props {
  problem: Playable; code: string; fnName: string; argsText: string; tracer: RunResult | null; playground?: boolean;
  onErrorLine(line: number | null): void;
}

const errLine = (out: string): number | null => { const m = out.match(/solution\.cpp:(\d+):\d+: error/); return m ? Number(m[1]) : null; };
const show = (v: any) => (v === undefined ? '(void)' : JSON.stringify(v));
const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'Unexpected error');

export function NativePanel({ problem, code, fnName, argsText, tracer, playground, onErrorLine }: Props) {
  const auth = useAuth();
  const [std, setStd] = useState<'c++17' | 'c++20'>('c++17');
  const [busy, setBusy] = useState<'one' | 'all' | null>(null);
  const [one, setOne] = useState<NativeRun | null>(null);
  const [all, setAll] = useState<NativeBatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = auth.status === 'authed' && auth.health?.sandbox.available;
  const gate = auth.backendDown ? 'The backend is not reachable.' : auth.status !== 'authed' ? 'Sign in to run code on the real compiler.' : !auth.health?.sandbox.available ? `The sandbox is unavailable on this server (${auth.health?.sandbox.detail ?? 'unknown'}).` : null;

  const runOne = async () => {
    setError(null); setAll(null); onErrorLine(null);
    let args: any[];
    try { args = JSON.parse(argsText); if (!Array.isArray(args)) throw new Error(); } catch { setError('The input must be a JSON array, e.g. [[2,7,11,15], 9].'); return; }
    setBusy('one');
    try {
      const r = await api.runCpp({ code, std, fn: fnName, args });
      setOne(r);
      onErrorLine(r.stage === 'compile' ? errLine(r.compileOutput) : null);
    } catch (e) { setOne(null); setError(errText(e)); } finally { setBusy(null); }
  };

  const runAll = async () => {
    setError(null); setOne(null); onErrorLine(null);
    setBusy('all');
    try {
      const r = await api.runCppTests({ code, std, fn: fnName, tests: problem.tests });
      setAll(r);
      onErrorLine(r.compiled ? null : errLine(r.compileOutput));
    } catch (e) { setAll(null); setError(errText(e)); } finally { setBusy(null); }
  };

  // does the real compiler agree with the in-browser tracer on this input?
  let parity: { same: boolean; native: any; tracer: any } | null = null;
  if (one?.ok && tracer?.ok) {
    const native = problem.checkArg !== undefined ? one.args?.[problem.checkArg] : one.result;
    const tr = problem.checkArg !== undefined ? tracer.args?.[problem.checkArg] : tracer.result;
    parity = { same: JSON.stringify(native) === JSON.stringify(tr), native, tracer: tr };
  }

  return (
    <div className="native" data-testid="native-panel">
      <p className="dim small">Compiles your code with <b>g++ 13</b> inside an isolated container (no network, read-only filesystem, memory/CPU/time limits) and runs it. You write the function only — no <code>main()</code> needed.</p>
      <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>Standard <select value={std} onChange={e => setStd(e.target.value as 'c++17' | 'c++20')} aria-label="C++ standard"><option value="c++17">C++17</option><option value="c++20">C++20</option></select></label>
        <button className="primary" onClick={runOne} disabled={!ready || busy !== null} data-testid="native-run">{busy === 'one' ? 'Compiling & running…' : '▶ Run on g++ (input above)'}</button>
        {!playground && problem.tests.length > 0 && <button onClick={runAll} disabled={!ready || busy !== null} data-testid="native-run-all">{busy === 'all' ? 'Running tests…' : `Run all ${problem.tests.length} tests on g++`}</button>}
      </div>
      {gate && <div className="note" role="status" data-testid="native-gate">{gate} {auth.status !== 'authed' && !auth.backendDown && <a href="#/account">Sign in →</a>}</div>}
      {error && <div className="err" role="alert" data-testid="native-error">{error}</div>}

      {one && (
        <div data-testid="native-result">
          {!one.compiled && <div className="err compile"><b>Compile error</b> (g++ {std})<pre className="src" style={{ whiteSpace: 'pre-wrap' }}>{one.compileOutput}</pre></div>}
          {one.compiled && one.error && <div className="err runtime"><b>{one.timedOut ? 'Time limit exceeded' : 'Runtime error'}</b>: {one.error}</div>}
          {one.compiled && one.compileOutput.trim() && <details><summary className="dim">compiler warnings</summary><pre className="src" style={{ whiteSpace: 'pre-wrap' }}>{one.compileOutput}</pre></details>}
          {one.ok && <div className="okline">g++ returned <code>{show(problem.checkArg !== undefined ? one.args?.[problem.checkArg] : one.result)}</code> in {one.timeMs} ms</div>}
          {one.stdout && <><h4>Program output</h4><pre className="src">{one.stdout}</pre></>}
          {parity && (parity.same
            ? <div className="good" data-testid="parity-ok">✓ Same result as the in-browser tracer, so the visualization reflects what real g++ computes.</div>
            : <div className="bad" data-testid="parity-diff">⚠ The result differs from the in-browser tracer: g++ gave <code>{show(parity.native)}</code>, the tracer <code>{show(parity.tracer)}</code>. Trust g++; the tracer implements a C++ subset.</div>)}
        </div>
      )}

      {all && (
        <div data-testid="native-batch">
          {!all.compiled ? <div className="err compile"><b>Compile error</b><pre className="src" style={{ whiteSpace: 'pre-wrap' }}>{all.compileOutput}</pre></div> : (() => {
            const rows = all.cases.map((c, i) => {
              const args = problem.tests[i];
              const expected = problem.ref(...structuredClone(args));
              const got = c.ok ? (problem.checkArg !== undefined ? c.args?.[problem.checkArg] : c.result) : undefined;
              return { args, expected, got, c, pass: c.ok && accepts(problem, args, got, expected) };
            });
            const passed = rows.filter(r => r.pass).length;
            return <>
              <div><b data-testid="native-batch-summary">{passed}/{rows.length} tests passed on g++ ({all.std})</b></div>
              <div className="tests">{rows.map((r, i) => (
                <div key={i} className={`trow ${r.pass ? 'ok' : 'fail'}`}>{r.pass ? '✓' : '✗'} <code>{JSON.stringify(r.args).slice(0, 60)}</code>{!r.pass && <> → expected <code>{show(r.expected)}</code>, got <code>{r.c.error ?? show(r.got)}</code></>} <span className="dim">{r.c.timeMs} ms</span></div>))}</div>
            </>;
          })()}
        </div>
      )}
    </div>
  );
}
