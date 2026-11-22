import { useState } from 'react';
import { api, ApiError, TutorContext } from '../api';
import { useAuth } from '../auth';
import type { Playable } from '../data/problems';
import type { TraceEvent } from '../engine/interp';

const show = (v: any): string => {
  if (v === undefined) return 'void';
  if (v === null) return 'nullptr';
  if (typeof v === 'object') { if ('$ptr' in v) return v.$ptr ? `node#${v.$ptr}` : 'nullptr'; if ('$seq' in v) return `${v.kind}[${v.$seq.map(show).join(', ')}]`; if ('$map' in v) return `map{${v.$map.map(([k, x]: any) => `${show(k)}:${show(x)}`).join(', ')}}`; try { return JSON.stringify(v); } catch { return '…'; } }
  return String(v);
};

/** The data the tutor is allowed to see: exactly what is on the learner's screen right now. */
export function buildTraceContext(events: TraceEvent[], idx: number, lines: string[]): TutorContext['trace'] {
  const ev = events[idx];
  if (!ev) return null;
  const f = ev.frames[ev.frames.length - 1];
  return {
    step: idx + 1, total: events.length, line: ev.line, lineText: (lines[ev.line - 1] ?? '').trim().slice(0, 400), event: ev.kind,
    variables: f.vars.map(v => `${v.name} = ${show(v.value)}`).join(', ').slice(0, 1500),
    callStack: ev.frames.map(x => x.fn).join(' > ').slice(0, 600),
  };
}

interface Props { problem: Playable; code: string; events: TraceEvent[]; idx: number; lines: string[]; lastRun: string; playground?: boolean }
type Msg = { role: 'user' | 'assistant'; content: string };

export function AiTutor({ problem, code, events, idx, lines, lastRun, playground }: Props) {
  const auth = useAuth();
  const [level, setLevel] = useState<'hint' | 'explain' | 'solution'>('explain');
  const [question, setQuestion] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gate = auth.backendDown ? 'The backend is not reachable.'
    : auth.status !== 'authed' ? 'Sign in to use the AI tutor.'
      : auth.health && !auth.health.tutor.configured ? 'The AI tutor is not configured on this server (no API key set). The rule-based explainer below still works.'
        : null;

  const ask = async () => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true); setError(null);
    const body: TutorContext = {
      question: q, level,
      problem: { title: problem.title, statement: problem.statement, constraints: problem.constraints, hints: playground ? [] : problem.hints, approaches: problem.approaches.map(a => `${a.label}: time ${a.time}, space ${a.space}`) },
      code, lastRun, trace: buildTraceContext(events, idx, lines), history: msgs.slice(-6),
    };
    try {
      const r = await api.tutorAsk(body);
      setMsgs(m => [...m, { role: 'user', content: q }, { role: 'assistant', content: r.answer }]);
      setQuestion('');
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Unexpected error'); } finally { setBusy(false); }
  };

  return (
    <div className="ai-tutor" data-testid="ai-tutor">
      <h4>AI tutor <span className="pill">uses your code, last run and current step</span></h4>
      {gate && <div className="note" role="status" data-testid="ai-gate">{gate} {auth.status !== 'authed' && !auth.backendDown && <a href="#/account">Sign in →</a>}</div>}
      <div className="chat" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`msg ${m.role}`}><b>{m.role === 'user' ? 'You' : 'Tutor'}:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span></div>)}
      </div>
      {error && <div className="err" role="alert" data-testid="ai-error">{error}</div>}
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <select value={level} onChange={e => setLevel(e.target.value as typeof level)} aria-label="Help level">
          <option value="hint">Hint only</option><option value="explain">Explain</option><option value="solution">Show solution</option>
        </select>
        <input style={{ flex: 1, minWidth: 160 }} value={question} maxLength={2000} placeholder="Ask about your code or this step…" aria-label="Question for the tutor"
          onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void ask(); }} disabled={!!gate} />
        <button className="primary" onClick={() => void ask()} disabled={!!gate || busy || !question.trim()}>{busy ? 'Thinking…' : 'Ask'}</button>
      </div>
      <p className="dim small">Answers come from a language model, so double-check them against the trace. The tutor only sees this problem, your code, the last run and the current step.</p>
    </div>
  );
}
