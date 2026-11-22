import { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import type { SqlJsStatic } from 'sql.js';
import { loadSql, SqlSession, RunOutcome, QResult, Stage } from '../sql/engine';
import { CHALLENGES, Challenge, judge, Verdict } from '../sql/challenges';
import { SQL_LESSONS, Lesson } from '../sql/lessons';
import { useStore } from '../store';

const cell = (v: any) => (v === null ? <i className="dim">NULL</i> : String(v));

function Table({ q, keep, dim }: { q: QResult; keep?: boolean[]; dim?: boolean }) {
  if (!q.columns.length) return <div className="dim small">(no columns)</div>;
  return (
    <div className="sql-table-wrap">
      <table className="sqlt"><thead><tr>{q.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>{q.rows.map((r, i) => <tr key={i} className={keep && !keep[i] ? 'gone' : ''}>{r.map((v, j) => <td key={j}>{cell(v)}</td>)}</tr>)}
          {q.rows.length === 0 && <tr><td colSpan={q.columns.length} className="dim">0 rows</td></tr>}</tbody></table>
      {dim && null}
    </div>
  );
}

function StageStepper({ stages, note }: { stages: Stage[]; note?: string }) {
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => { setI(0); setPlay(false); }, [stages]);
  useEffect(() => {
    if (!play) return;
    const t = setInterval(() => setI(x => { if (x >= stages.length - 1) { setPlay(false); return x; } return x + 1; }), 1400 / speed);
    return () => clearInterval(t);
  }, [play, speed, stages.length]);
  const st = stages[i];
  const whereDone = stages.findIndex(s => s.id === 'where') !== -1 && i >= stages.findIndex(s => s.id === 'where');
  return (
    <div className="sql-stages">
      <div className="viz-label">Logical processing flow <span className="dim">(the SQL processing <i>model</i>; the real physical plan is under EXPLAIN)</span></div>
      <div className="stage-bar">{stages.map((s, k) => <button key={s.id} className={`tab ${k === i ? 'on' : ''} ${k < i ? 'done' : ''}`} onClick={() => { setI(k); setPlay(false); }}>{k + 1}. {s.title}</button>)}</div>
      <div className="note small">{st.explain}</div>
      <pre className="src small">{st.sql}</pre>
      <Table q={st} keep={st.id === 'from' && whereDone ? st.keep : undefined} />
      <div className="dim small">{st.rows.length} row(s){st.id === 'from' && whereDone && st.keep ? ` · ${st.keep.filter(Boolean).length} survive the WHERE filter (struck-through rows are removed)` : ''}</div>
      <div className="controls">
        <button onClick={() => { setI(0); setPlay(false); }}>⏮ Reset</button>
        <button onClick={() => setI(x => Math.max(0, x - 1))} disabled={i === 0}>◀ Back</button>
        {play ? <button className="primary" onClick={() => setPlay(false)}>⏸ Pause</button> : <button className="primary" onClick={() => { if (i >= stages.length - 1) setI(0); setPlay(true); }}>▶ Play</button>}
        <button onClick={() => setI(x => Math.min(stages.length - 1, x + 1))} disabled={i >= stages.length - 1}>Next ▶</button>
        <label className="speed">speed <input type="range" min="0.5" max="3" step="0.5" value={speed} onChange={e => setSpeed(+e.target.value)} /> {speed}×</label>
      </div>
      {note && <div className="dim small">{note}</div>}
    </div>
  );
}

function Lab({ session, initial, onRun, height = 150 }: { session: SqlSession; initial: string; onRun?: (sql: string, out: RunOutcome) => void; height?: number }) {
  const [sql, setSql] = useState(initial);
  const [out, setOut] = useState<RunOutcome | null>(null);
  const [history, setHistory] = useState<{ sql: string; ok: boolean; ms: number }[]>([]);
  const [tbl, setTbl] = useState('Students');
  const [tick, setTick] = useState(0);
  useEffect(() => { setSql(initial); setOut(null); }, [initial]);
  const run = () => { const o = session.run(sql); setOut(o); setHistory(h => [{ sql, ok: o.ok, ms: o.ms }, ...h].slice(0, 12)); setTick(t => t + 1); onRun?.(sql, o); };
  const tables = session.tables();
  const data = useMemo(() => (tables.includes(tbl) ? session.table(tbl) : { columns: [], rows: [] }), [tbl, tick, session]); // eslint-disable-line
  return (
    <div className="lab">
      <div className="lab-top">
        <div className="lab-editor">
          <Editor height={height} language="sql" theme="vs-dark" value={sql} onChange={v => setSql(v ?? '')}
            options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true }}
            onMount={(ed, m) => ed.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Enter, () => document.getElementById('sql-run')?.click())} />
          <div className="controls"><button id="sql-run" className="primary" onClick={run}>▶ Run (Ctrl+Enter)</button>
            <button onClick={() => { session.reset(); setOut(null); setTick(t => t + 1); }} title="Restore the original sample database">↺ Reset database</button></div>
        </div>
        <div className="lab-tables">
          <div className="panel-bar">{tables.map(t => <button key={t} className={`tab ${t === tbl ? 'on' : ''}`} onClick={() => setTbl(t)}>{t}</button>)}</div>
          <Table q={data} />
        </div>
      </div>
      {out && !out.ok && <div className="err compile"><b>SQL error:</b> {out.error}{out.hint && <div className="small">💡 {out.hint}</div>}</div>}
      {out?.ok && (
        <>
          {out.results.map((r, i) => <div key={i}><div className="okline">Result {out.results.length > 1 ? i + 1 : ''} · {r.rows.length} row(s) · {out.ms.toFixed(1)} ms</div><Table q={r} /></div>)}
          {out.results.length === 0 && <div className="okline">OK · {out.changes ?? 0} row(s) affected · {out.ms.toFixed(1)} ms</div>}
          {out.stages && <StageStepper stages={out.stages} note={out.stageNote} />}
          {!out.stages && out.stageNote && <div className="note small">{out.stageNote}</div>}
          {out.plan && <div className="viz-block"><div className="viz-label">EXPLAIN QUERY PLAN <span className="dim">(real SQLite physical plan)</span></div><pre className="src small">{out.plan.join('\n') || '(no plan)'}</pre></div>}
        </>
      )}
      {history.length > 0 && <details><summary className="dim small">Execution history ({history.length})</summary>{history.map((h, i) => <div key={i} className="small"><span className={h.ok ? 'good' : 'bad'}>{h.ok ? '✓' : '✗'}</span> <button className="link" onClick={() => setSql(h.sql)}>{h.sql.slice(0, 70)}</button> <span className="dim">{h.ms.toFixed(1)} ms</span></div>)}</details>}
    </div>
  );
}

function LessonView({ l, openChallenge, onTry }: { l: Lesson; openChallenge: (id: string) => void; onTry: (sql: string) => void }) {
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => setPick(null), [l.id]);
  return (
    <div className="lesson">
      <h2>{l.title} <span className="pill">{l.module}</span></h2>
      <div className="grid2">
        <div className="card"><h4>In simple words</h4><p>{l.simple}</p></div>
        <div className="card"><h4>Technical definition</h4><p>{l.technical}</p></div>
        <div className="card"><h4>Real-world analogy</h4><p>{l.analogy}</p></div>
        <div className="card"><h4>Where it is used</h4><p>{l.realWorld}</p></div>
      </div>
      <h4>Key terminology</h4>
      <div className="kwlist">{l.keywords.map(k => <div key={k.term}><b>{k.term}</b> — {k.meaning}</div>)}</div>
      <h4>Example (runs on a real SQLite database)</h4>
      <pre className="src">{l.example}</pre>
      <button className="primary" onClick={() => onTry(l.example)}>▶ Open in the lab</button>
      <div className="grid2">
        <div><h4>Common mistakes</h4><ul>{l.mistakes.map(m => <li key={m}>{m}</li>)}</ul></div>
        <div><h4>Interview questions</h4><ul>{l.interview.map(m => <li key={m}>{m}</li>)}</ul></div>
      </div>
      <h4>Knowledge check</h4>
      <div className="card"><p>{l.quiz.q}</p><div className="opts">{l.quiz.options.map((o, i) => <button key={o} className={`opt ${pick !== null ? (i === l.quiz.answer ? 'right' : i === pick ? 'wrong' : '') : ''}`} disabled={pick !== null} onClick={() => setPick(i)}>{o}</button>)}</div>
        {pick !== null && <div className={pick === l.quiz.answer ? 'good' : 'bad'}>{pick === l.quiz.answer ? '✓ ' : '✗ '}{l.quiz.why}</div>}</div>
      <h4>Practice</h4>
      <div>{l.challenges.map(id => { const c = CHALLENGES.find(x => x.id === id)!; return <button key={id} onClick={() => openChallenge(id)} style={{ marginRight: 6 }}>⚔ {c.title}</button>; })}</div>
    </div>
  );
}

function ChallengeView({ c, SQL, session }: { c: Challenge; SQL: SqlJsStatic; session: SqlSession }) {
  const store = useStore();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hints, setHints] = useState(0);
  const [sql, setSql] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const id = `sql:${c.id}`;
  useEffect(() => { setVerdict(null); setHints(0); setMsg(null); setSql(store.drafts[id] ?? '-- write your query here\n'); }, [c.id]); // eslint-disable-line
  const xp = [0, 15, 25, 40, 60, 90][c.level];
  const submit = () => {
    store.recordAttempt(id);
    const v = judge(SQL, c, sql); setVerdict(v);
    if (v.pass) { const gain = Math.max(5, xp - hints * 5); setMsg(store.markSolved(id, gain, hints, c.title) ? `Accepted! +${gain} XP` : 'Accepted again (no extra XP).'); } else setMsg(null);
  };
  return (
    <div>
      <h2>{c.title} <span className="pill">Level {c.level}</span> <span className="pill">{c.topic}</span> {store.solved[id] && <span className="pill ok">✓ solved</span>}</h2>
      <p>{c.prompt}</p>
      <Lab session={session} initial={sql} onRun={s => { setSql(s); store.saveDraft(id, s); }} />
      <div className="controls">
        <button className="primary" onClick={submit}>⚔ Check my answer (+{xp} XP)</button>
        <button onClick={() => setHints(h => Math.min(c.hints.length, h + 1))} disabled={hints >= c.hints.length}>💡 Hint ({hints}/{c.hints.length}) −5 XP</button>
        {msg && <span className="good">{msg}</span>}
      </div>
      <div className="dim small">Checking runs your last executed query on a fresh private copy of the database and compares it with the expected rows.</div>
      {hints > 0 && <ol className="hints">{c.hints.slice(0, hints).map(h => <li key={h}>{h}</li>)}</ol>}
      {verdict && <div className={verdict.pass ? 'good' : 'bad'}>{verdict.pass ? '✓ ' : '✗ '}{verdict.message}{!verdict.pass && verdict.got && <Table q={{ columns: verdict.columns ?? [], rows: verdict.got }} />}</div>}
    </div>
  );
}

export function SqlWorld() {
  const [SQL, setSQL] = useState<SqlJsStatic | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const sessionRef = useRef<SqlSession | null>(null);
  const [view, setView] = useState<{ k: 'lesson' | 'challenge' | 'lab'; id?: string; sql?: string }>({ k: 'lesson', id: SQL_LESSONS[0].id });
  const store = useStore();
  useEffect(() => { loadSql(() => wasmUrl).then(s => { sessionRef.current = new SqlSession(s); setSQL(s); }).catch(e => setErr(String(e))); }, []);
  if (err) return <div className="page"><div className="err compile">Could not load the SQL engine (WebAssembly): {err}</div></div>;
  if (!SQL || !sessionRef.current) return <div className="page dim">Loading SQLite engine…</div>;
  const session = sessionRef.current;
  const modules = [...new Set(SQL_LESSONS.map(l => l.module))];
  return (
    <div className="sqlw">
      <aside className="sql-side">
        <h4>Lessons</h4>
        {modules.map(m => <div key={m}><div className="dim small">{m}</div>{SQL_LESSONS.filter(l => l.module === m).map(l => <button key={l.id} className={`side-item ${view.k === 'lesson' && view.id === l.id ? 'on' : ''}`} onClick={() => setView({ k: 'lesson', id: l.id })}>{l.title}</button>)}</div>)}
        <h4>Challenges ({CHALLENGES.filter(c => store.solved[`sql:${c.id}`]).length}/{CHALLENGES.length})</h4>
        {CHALLENGES.map(c => <button key={c.id} className={`side-item ${view.k === 'challenge' && view.id === c.id ? 'on' : ''}`} onClick={() => setView({ k: 'challenge', id: c.id })}>{store.solved[`sql:${c.id}`] ? '✅' : `L${c.level}`} {c.title}</button>)}
        <h4>Playground</h4>
        <button className={`side-item ${view.k === 'lab' ? 'on' : ''}`} onClick={() => setView({ k: 'lab' })}>Free query lab</button>
      </aside>
      <section className="sql-main">
        <div className="note small">Queries run on <b>real SQLite</b> (WebAssembly) in your browser, in memory. The step-by-step flow is the logical SQL processing model built by running real partial queries; the EXPLAIN section is SQLite's actual plan. Other engines (PostgreSQL, MySQL) may plan and behave differently.</div>
        {view.k === 'lesson' && <LessonView l={SQL_LESSONS.find(l => l.id === view.id)!} openChallenge={id => setView({ k: 'challenge', id })} onTry={s => setView({ k: 'lab', sql: s })} />}
        {view.k === 'challenge' && <ChallengeView key={view.id} c={CHALLENGES.find(c => c.id === view.id)!} SQL={SQL} session={session} />}
        {view.k === 'lab' && <div><h2>Query lab</h2><Lab session={session} height={170} initial={view.sql ?? "SELECT name, department_name\nFROM Students\nINNER JOIN Departments\n  ON Students.department_id = Departments.id\nWHERE marks > 80;"} /></div>}
      </section>
    </div>
  );
}
