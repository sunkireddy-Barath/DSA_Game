import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from './CodeEditor';
import { runCpp, RunResult, TraceEvent } from '../engine/interp';
import { evaluate, Verdict } from '../engine/judge';
import type { Playable } from '../data/problems';
import { Viz } from './Viz';
import { Complexity } from './Complexity';
import { Tutor } from './Tutor';
import { fmt, Inspector } from './Inspector';
import { AiTutor } from './AiTutor';
import { NativePanel } from './NativePanel';
import { useStore } from '../store';

type Question = { idx: number; kind: 'cond' | 'var'; text: string; options: string[]; answer: string; explain: string };


function makeQuestion(events: TraceEvent[], i: number, lines: string[]): Question | null {
  const ev = events[i], nx = events[i + 1];
  if (!nx) return null;
  const src = (lines[ev.line - 1] ?? '').trim();
  if (ev.kind === 'line' && ev.cond !== undefined)
    return { idx: i, kind: 'cond', text: `The condition on line ${ev.line} is about to be tested:  ${src}\nWill it be true?`, options: ['true', 'false'], answer: String(ev.cond),
      explain: `With the current variable values the condition evaluates to ${ev.cond}, so execution ${ev.cond ? 'enters the body' : 'skips it'}.` };
  if (nx.callId !== ev.callId) return null;
  const a = ev.frames[ev.frames.length - 1], b = nx.frames[nx.frames.length - 1];
  for (const vb of b.vars) {
    const va = a.vars.find(v => v.name === vb.name);
    if (va && typeof vb.value !== 'object' && typeof va.value !== 'object' && va.value !== vb.value) {
      const ans = fmt(vb.value);
      let opts: string[];
      if (typeof vb.value === 'boolean') opts = ['true', 'false'];
      else {
        const s = new Set<string>([ans, fmt(va.value), fmt(vb.value + 1)]);
        if (s.size < 3) s.add(fmt(vb.value - 1));
        opts = [...s].slice(0, 3).sort((x, y) => (x < y ? -1 : 1));
        if (!opts.includes(ans)) opts[0] = ans;
      }
      return { idx: i, kind: 'var', text: `Line ${ev.line} is about to run:  ${src}\nWhat will ${vb.name} be afterwards? (currently ${fmt(va.value)})`, options: opts, answer: ans,
        explain: `${vb.name} changes from ${fmt(va.value)} to ${ans}.` };
    }
  }
  return null;
}

export interface WorkspaceProps { problem: Playable; id: string; diff: 'E' | 'M' | 'H'; playground?: boolean; extra?: React.ReactNode }

export function Workspace({ problem, id, diff, playground, extra }: WorkspaceProps) {
  const store = useStore();
  const [mode, setMode] = useState<'watch' | 'solve'>(playground ? 'watch' : 'watch');
  const [apIdx, setApIdx] = useState(0);
  const [code, setCode] = useState(problem.approaches[0].code);
  const [fnName, setFnName] = useState(problem.fn);
  const [argsText, setArgsText] = useState(JSON.stringify(problem.defaultArgs));
  const [run, setRun] = useState<RunResult | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [bps, setBps] = useState<Set<number>>(new Set());
  const [predict, setPredict] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'inspect' | 'complexity' | 'tutor' | 'native'>('inspect');
  const [showProblem, setShowProblem] = useState(!playground);
  const [selectedCall, setSelectedCall] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [peeked, setPeeked] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nativeErr, setNativeErr] = useState<number | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const asked = useRef(new Set<number>());
  const edRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decoRef = useRef<any>(null);
  const idxRef = useRef(0); idxRef.current = idx;
  const lines = useMemo(() => code.split('\n'), [code]);

  const events = run?.events ?? [];
  const N = events.length;
  const ev: TraceEvent | undefined = events[idx];
  const solved = !!store.solved[id];

  // ----- execution -----
  const execute = useCallback((src: string, text = argsText, fn = fnName) => {
    let args: any[];
    try { args = JSON.parse(text); if (!Array.isArray(args)) throw new Error('arguments must be a JSON array'); }
    catch (e: any) { setRun({ ok: false, events: [], error: `Invalid input: ${e.message}`, errorKind: 'compile', stats: { comparisons: 0, calls: 0, loopIterations: 0, mapOps: 0, steps: 0, maxDepth: 0 } }); return; }
    const r = runCpp(src, fn, args, { trace: true });
    setRun(r); setIdx(0); setPlaying(false); setQuestion(null); setPicked(null); setSelectedCall(null); setDirty(false); asked.current = new Set();
  }, [argsText, fnName]);

  useEffect(() => { execute(code); /* initial */ // eslint-disable-next-line
  }, []);
  useEffect(() => { store.setLast(id); store.touchStreak(); const t = setInterval(() => store.addSeconds(15), 15000); return () => clearInterval(t); // eslint-disable-next-line
  }, [id]);

  const loadApproach = (i: number) => {
    setApIdx(i); setCode(problem.approaches[i].code); setMode('watch'); execute(problem.approaches[i].code);
  };

  // ----- debugger-style navigation -----
  const clamp = (n: number) => Math.max(0, Math.min(N - 1, n));
  const to = (n: number) => { setIdx(clamp(n)); setQuestion(null); setPicked(null); };
  const cur = ev;
  const stepInto = () => to(idx + 1);
  const stepOver = () => { if (!cur) return; for (let j = idx + 1; j < N; j++) if (events[j].depth <= cur.depth) return to(j); to(N - 1); };
  const stepOut = () => { if (!cur) return; for (let j = idx + 1; j < N; j++) if (events[j].depth < cur.depth) return to(j); to(N - 1); };
  const nextIter = () => { if (!cur) return; for (let j = idx + 1; j < N; j++) if (events[j].line === cur.line && events[j].callId === cur.callId && events[j].kind === 'line') return to(j); to(N - 1); };
  const prevIter = () => { if (!cur) return; for (let j = idx - 1; j >= 0; j--) if (events[j].line === cur.line && events[j].callId === cur.callId && events[j].kind === 'line') return to(j); to(0); };
  const cont = () => { for (let j = idx + 1; j < N; j++) if (events[j].kind === 'line' && bps.has(events[j].line)) return to(j); to(N - 1); };

  const tryNext = useCallback((): boolean => {
    const i = idxRef.current;
    if (i >= N - 1) return false;
    if (predict && !asked.current.has(i)) {
      asked.current.add(i);
      const q = makeQuestion(events, i, lines);
      if (q) { setQuestion(q); setPicked(null); return false; }
    }
    setIdx(i + 1);
    if (events[i + 1].kind === 'line' && bps.has(events[i + 1].line)) return false;
    return true;
  }, [N, predict, events, lines, bps]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => { if (!tryNext()) setPlaying(false); }, 900 / speed);
    return () => clearInterval(t);
  }, [playing, speed, tryNext]);

  const answer = (opt: string) => {
    if (!question || picked) return;
    setPicked(opt);
    const ok = opt === question.answer;
    store.recordPrediction(ok);
    if (ok) store.addXp(5, 'correct prediction');
  };
  const continueAfter = () => { if (question) { setQuestion(null); setPicked(null); setIdx(question.idx + 1); } };

  // ----- editor decorations -----
  useEffect(() => {
    const ed = edRef.current, m = monacoRef.current;
    if (!ed || !m) return;
    const d: any[] = [];
    if (ev) {
      const seen = new Set<number>();
      for (let j = 0; j < idx; j++) if (events[j].kind === 'line') seen.add(events[j].line);
      seen.forEach(l => { if (l !== ev.line) d.push({ range: new m.Range(l, 1, l, 1), options: { isWholeLine: true, className: 'ln-seen' } }); });
      d.push({ range: new m.Range(ev.line, 1, ev.line, 1), options: { isWholeLine: true, className: 'ln-current', glyphMarginClassName: 'gl-arrow' } });
      ed.revealLineInCenterIfOutsideViewport(ev.line);
    }
    bps.forEach(l => d.push({ range: new m.Range(l, 1, l, 1), options: { glyphMarginClassName: 'gl-bp' } }));
    if (run?.errorLine) d.push({ range: new m.Range(run.errorLine, 1, run.errorLine, 1), options: { isWholeLine: true, className: 'ln-error' } });
    if (nativeErr) d.push({ range: new m.Range(nativeErr, 1, nativeErr, 1), options: { isWholeLine: true, className: 'ln-error' } });
    decoRef.current?.clear();
    decoRef.current = ed.createDecorationsCollection(d);
  }, [idx, events, bps, run, ev, nativeErr, editorReady]);

  const onMount = (ed: any, m: any) => {
    edRef.current = ed; monacoRef.current = m;
    ed.onMouseDown((e: any) => {
      if (e.target.type === 2 || e.target.type === 3) {
        const l = e.target.position.lineNumber;
        setBps(s => { const n = new Set(s); n.has(l) ? n.delete(l) : n.add(l); return n; });
      }
    });
    setEditorReady(true); // the editor can mount after the first run finished: redraw the current-line highlight
  };

  // ----- solve mode -----
  const diffXp = { E: 20, M: 40, H: 80 }[diff];
  const submit = () => {
    store.recordAttempt(id);
    const v = evaluate(problem, code);
    setVerdict(v);
    if (v.passed === v.total && !v.compileError) {
      const xp = Math.max(5, Math.round((diffXp - hintsShown * 4) * (peeked ? 0.5 : 1)));
      if (store.markSolved(id, xp, hintsShown, problem.title)) setToast(`Accepted! +${xp} XP${peeked ? ' (halved: you peeked at a solution)' : ''}`);
      else setToast('Accepted again — already solved, no extra XP.');
    } else setToast(null);
  };
  const switchMode = (m: 'watch' | 'solve') => {
    setMode(m);
    if (m === 'solve') { const d = store.drafts[id] ?? problem.starter; setCode(d); setVerdict(null); setDirty(true); }
    else { setCode(problem.approaches[apIdx].code); execute(problem.approaches[apIdx].code); }
  };
  const onEdit = (v?: string) => {
    const c = v ?? ''; setCode(c); setDirty(true); setPlaying(false);
    if (mode === 'solve') store.saveDraft(id, c);
  };

  // ----- derived -----
  const recursive = (run?.stats.calls ?? 0) > 1;
  const testsList = problem.tests;
  const lastRunSummary = () => {
    const parts: string[] = [];
    if (run) parts.push(run.ok ? `in-browser tracer: returned ${fmt(problem.checkArg !== undefined ? run.args?.[problem.checkArg] : run.result)} after ${run.stats.steps} statements on input ${argsText.slice(0, 200)}` : `in-browser tracer error (${run.errorKind}${run.errorLine ? `, line ${run.errorLine}` : ''}): ${run.error}`);
    if (verdict) {
      if (verdict.compileError) parts.push(`judge: compile error: ${verdict.compileError}`);
      else {
        parts.push(`judge: ${verdict.passed}/${verdict.total} tests passed`);
        const bad = verdict.results.find(r => !r.pass);
        if (bad) parts.push(`first failing test: input ${JSON.stringify(bad.args).slice(0, 150)} expected ${JSON.stringify(bad.expected).slice(0, 100)} got ${bad.error ?? JSON.stringify(bad.got).slice(0, 100)}`);
      }
    }
    return parts.join('\n').slice(0, 1900);
  };
  const iteration = ev ? events.slice(0, idx + 1).filter(e => e.kind === 'line' && e.line === ev.line && e.callId === ev.callId).length : 0;

  return (
    <div className="ws">
      <div className="ws-head">
        <div>
          <h2>{problem.title}</h2>
          <div className="sub">
            <span className={`pill d${diff}`}>{{ E: 'Easy', M: 'Medium', H: 'Hard' }[diff]}</span>
            {solved && <span className="pill ok">✓ solved</span>}
            <button className="link" onClick={() => setShowProblem(s => !s)}>{showProblem ? 'Hide' : 'Show'} problem</button>
          </div>
        </div>
        <div className="seg">
          <button className={mode === 'watch' ? 'on' : ''} onClick={() => switchMode('watch')}>▶ Watch &amp; learn</button>
          {!playground && <button className={mode === 'solve' ? 'on' : ''} onClick={() => switchMode('solve')}>⚔ Solve it</button>}
        </div>
      </div>

      {showProblem && !playground && (
        <div className="problem-panel">
          <p>{problem.statement}</p>
          <div className="dim">Constraints: {problem.constraints.join(' · ')}</div>
          <div className="dim"><b>Intuition:</b> {problem.intuition}</div>
        </div>
      )}

      {extra}

      <div className="panels">
        {/* LEFT: code */}
        <section className="panel code">
          <div className="panel-bar">
            {mode === 'watch' && !playground && problem.approaches.map((a, i) => (
              <button key={i} className={`tab ${i === apIdx ? 'on' : ''}`} onClick={() => loadApproach(i)}>{a.label}</button>
            ))}
            {mode === 'solve' && <><span className="dim">Your solution (saved automatically)</span>
              <button className="tab" onClick={() => { setCode(problem.starter); store.saveDraft(id, problem.starter); }}>Reset to starter</button>
              <button className="tab" title="Loads the reference solution into the editor; XP is halved" onClick={() => { if (confirm('Load a reference solution? XP for this problem will be halved.')) { setPeeked(true); setCode(problem.approaches[problem.approaches.length - 1].code); setDirty(true); } }}>Peek solution</button></>}
            {playground && <><span className="dim">function:</span><input className="fn-in" value={fnName} onChange={e => setFnName(e.target.value)} /></>}
          </div>
          <Editor height="100%" language="cpp" theme="vs-dark" value={code} onChange={onEdit} onMount={onMount}
            options={{ fontSize: 13, minimap: { enabled: false }, glyphMargin: true, lineNumbersMinChars: 3, scrollBeyondLastLine: false, automaticLayout: true, renderLineHighlight: 'none', tabSize: 4 }} />
          <div className="hint-line dim">Click the gutter to set a breakpoint · only the solution function is shown; the harness that calls it is generated internally.</div>
        </section>

        {/* CENTER: viz */}
        <section className="panel viz-panel">
          <div className="panel-bar">
            <span className="dim">Input</span>
            <input className="args" value={argsText} onChange={e => { setArgsText(e.target.value); setDirty(true); }} spellCheck={false} />
            {testsList.length > 0 && <select onChange={e => { const t = JSON.stringify(testsList[+e.target.value]); setArgsText(t); execute(code, t); }} defaultValue="">
              <option value="" disabled>examples…</option>{testsList.map((t, i) => <option key={i} value={i}>{JSON.stringify(t).slice(0, 40)}</option>)}</select>}
            <button className="primary" onClick={() => execute(code)}>{dirty ? '▶ Compile & run' : '↻ Re-run'}</button>
          </div>
          {run && !run.ok && (
            <div className={`err ${run.errorKind}`}>
              <b>{{ compile: 'Compile error', runtime: 'Runtime error', timeout: 'Time limit exceeded', unsupported: 'Not supported by the tracer yet', undefined: 'Error' }[String(run.errorKind) as 'compile']}</b>
              {run.errorLine ? ` (line ${run.errorLine})` : ''}: {run.error}
              {run.errorKind === 'unsupported' && <div className="dim">The tracer runs a C++ subset and never fabricates a trace for constructs it cannot execute. Your code may still be valid C++: <button className="link" onClick={() => setRightTab('native')}>run it on real g++ instead</button>.</div>}
              {run.events.length > 0 && <div className="dim">Showing the trace up to the failure.</div>}
            </div>
          )}
          {run?.ok && <div className="okline">Returned <code>{fmt(problem.checkArg !== undefined ? run.args?.[problem.checkArg] : run.result)}</code> · {run.stats.steps} statements executed{run.truncated ? ' · ⚠ trace truncated at 6000 events (use a smaller input to see everything)' : ''}</div>}
          {ev && !(run && !run.ok && N < 2) ? (
            <Viz events={events} idx={idx} viz={problem.viz} recursive={recursive} selectedCall={selectedCall} onSelectCall={setSelectedCall} lines={lines} />
          ) : <div className="dim pad">No trace yet.</div>}
          {question && (
            <div className="predict">
              <div className="ptitle">🎯 Predict the next step <span className="dim">(+5 XP)</span></div>
              <pre>{question.text}</pre>
              <div className="opts">{question.options.map(o => (
                <button key={o} disabled={!!picked} className={`opt ${picked ? (o === question.answer ? 'right' : o === picked ? 'wrong' : '') : ''}`} onClick={() => answer(o)}>{o}</button>))}</div>
              {picked && <div className={picked === question.answer ? 'good' : 'bad'}>{picked === question.answer ? '✓ Correct. ' : `✗ Not quite — it is ${question.answer}. `}{question.explain}
                <div><button className="primary" onClick={continueAfter}>Show me the step →</button></div></div>}
            </div>
          )}
        </section>

        {/* RIGHT */}
        <section className="panel side">
          <div className="panel-bar">
            {(['inspect', 'complexity', 'tutor', 'native'] as const).map(t => <button key={t} className={`tab ${rightTab === t ? 'on' : ''}`} onClick={() => setRightTab(t)}>{{ inspect: 'Inspector', complexity: 'Complexity Lab', tutor: 'Tutor', native: 'g++ Run' }[t]}</button>)}
          </div>
          <div className="side-body">
            {rightTab === 'inspect' && ev && (
              <Inspector events={events} idx={idx} lines={lines} iteration={iteration} selectedCall={selectedCall} />
            )}
            {rightTab === 'complexity' && <Complexity problem={problem} run={run} apIdx={apIdx} />}
            {rightTab === 'tutor' && <><AiTutor problem={problem} code={code} events={events} idx={idx} lines={lines} lastRun={lastRunSummary()} playground={playground} /><h4>Step explainer <span className="pill">rule-based, always available</span></h4><Tutor problem={problem} events={events} idx={idx} lines={lines} hintsShown={hintsShown} onHint={() => setHintsShown(h => Math.min(problem.hints.length, h + 1))} playground={playground} /></>}
            {rightTab === 'native' && <NativePanel problem={problem} code={code} fnName={fnName} argsText={argsText} tracer={run} playground={playground} onErrorLine={setNativeErr} />}
          </div>
        </section>
      </div>

      {/* BOTTOM: controls or solve console */}
      {mode === 'watch' ? (
        <div className="controls">
          <button onClick={() => to(0)} title="Restart">⏮ Restart</button>
          <button onClick={prevIter} title="Previous iteration">⇤ Prev iter</button>
          <button onClick={() => to(idx - 1)} title="Previous step">◀ Back</button>
          {playing ? <button className="primary" onClick={() => setPlaying(false)}>⏸ Pause</button> : <button className="primary" onClick={() => { if (idx >= N - 1) to(0); setPlaying(true); }} disabled={N < 2}>▶ {idx > 0 ? 'Continue' : 'Start'}</button>}
          <button onClick={stepInto} title="Step into (next line)">⤓ Step into</button>
          <button onClick={stepOver} title="Step over">⤼ Step over</button>
          <button onClick={stepOut} title="Step out">⤒ Step out</button>
          <button onClick={nextIter} title="Next iteration">⇥ Next iter</button>
          <button onClick={cont} title="Run to next breakpoint">⏭ To breakpoint</button>
          <label className="speed">speed <input type="range" min="0.25" max="4" step="0.25" value={speed} onChange={e => setSpeed(+e.target.value)} /> {speed}×</label>
          <label className="speed"><input type="checkbox" checked={predict} onChange={e => setPredict(e.target.checked)} /> Predict mode</label>
          <input className="scrub" type="range" min={0} max={Math.max(0, N - 1)} value={idx} onChange={e => to(+e.target.value)} />
          <span className="dim">step {N ? idx + 1 : 0}/{N}</span>
        </div>
      ) : (
        <div className="solve-bar">
          <div className="solve-actions">
            <button className="primary" onClick={submit}>⚔ Run all {problem.tests.length} tests</button>
            <button onClick={() => execute(code)}>Trace my code on the input above</button>
            <button onClick={() => setHintsShown(h => Math.min(problem.hints.length, h + 1))} disabled={hintsShown >= problem.hints.length}>💡 Hint ({hintsShown}/{problem.hints.length}) −4 XP</button>
            <span className="dim">Reward: {diffXp} XP</span>
            {toast && <span className="good">{toast}</span>}
          </div>
          {hintsShown > 0 && <ol className="hints">{problem.hints.slice(0, hintsShown).map((h, i) => <li key={i}>{h}</li>)}</ol>}
          {verdict && (
            <div className="verdict">
              {verdict.compileError ? <div className="err compile"><b>Compile error</b> (line {verdict.compileLine}): {verdict.compileError}</div> :
                <div><b>{verdict.passed}/{verdict.total} tests passed</b></div>}
              <div className="tests">{verdict.results.map((r, i) => (
                <div key={i} className={`trow ${r.pass ? 'ok' : 'fail'}`}>{r.pass ? '✓' : '✗'} <code>{JSON.stringify(r.args).slice(0, 60)}</code>{!r.pass && <> → expected <code>{JSON.stringify(r.expected)}</code>, got <code>{r.error ?? JSON.stringify(r.got)}</code></>}</div>))}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
