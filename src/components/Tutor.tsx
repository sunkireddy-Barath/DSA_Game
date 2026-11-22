import { useState } from 'react';
import type { Playable } from '../data/problems';
import type { TraceEvent } from '../engine/interp';

const fmt = (v: any): string => (v === undefined ? 'void' : v === null ? 'nullptr' : v && v.$ptr !== undefined ? (v.$ptr ? `node#${v.$ptr}` : 'nullptr') : v && v.$seq ? `${v.kind}[${v.$seq.map(fmt).join(', ')}]` : v && v.$map ? `{${v.$map.map(([k, x]: any) => `${k}:${fmt(x)}`).join(', ')}}` : Array.isArray(v) ? `[${v.map(fmt).join(', ')}]` : String(v));

// A rule-based tutor. It only ever talks about the CURRENT trace event, so it cannot invent
// execution states. A real LLM would sit behind a backend endpoint (keys must never ship to the browser).
function describe(events: TraceEvent[], idx: number, lines: string[]) {
  const ev = events[idx], prev = events[idx - 1];
  const src = (lines[ev.line - 1] ?? '').trim();
  const f = ev.frames[ev.frames.length - 1];
  const pf = prev?.frames.find(x => x.callId === f.callId);
  const changed = f.vars.filter(v => { const p = pf?.vars.find(x => x.name === v.name); return p && JSON.stringify(p.value) !== JSON.stringify(v.value); }).map(v => ({ v, p: pf!.vars.find(x => x.name === v.name)! }));
  const scal = f.vars.filter(v => typeof v.value !== 'object').map(v => `${v.name} = ${fmt(v.value)}`).join(', ');
  return { ev, src, f, changed, scal };
}

export function Tutor({ problem, events, idx, lines, hintsShown, onHint, playground }: { problem: Playable; events: TraceEvent[]; idx: number; lines: string[]; hintsShown: number; onHint: () => void; playground?: boolean }) {
  const [log, setLog] = useState<{ q: string; a: string; step: number }[]>([]);
  const ask = (q: string, a: string) => setLog(l => [{ q, a, step: idx + 1 }, ...l].slice(0, 12));
  const has = events.length > 0 && events[idx];
  const d = has ? describe(events, idx, lines) : null;

  const why = () => {
    if (!d) return;
    const { ev, src } = d;
    if (ev.kind === 'call') return ask('Why did we enter this function?', `${ev.fn} was called${ev.parentId ? ` from the caller (call #${ev.parentId})` : ' as the entry point'} with ${d.scal || 'no arguments'}. A new stack frame was pushed for it.`);
    if (ev.kind === 'return') return ask('Why did the function return?', `Line ${ev.line} (${src}) executed a return (or the function ended) with value ${fmt(ev.ret)}. The frame for ${ev.fn} is about to be popped and control goes back to its caller.`);
    if (ev.cond !== undefined) return ask('Why did this line execute?', `Line ${ev.line} is a ${/^for|^while/.test(src) ? 'loop check' : 'condition'}: ${src}. With ${d.scal} it evaluated to ${ev.cond}, so execution ${ev.cond ? 'enters' : 'skips'} the body${/^for|^while/.test(src) && !ev.cond ? ' (the loop ends)' : ''}.`);
    ask('Why did this line execute?', `The previous statement finished, so control fell through to line ${ev.line}: ${src}.`);
  };
  const changedQ = () => {
    if (!d) return;
    if (!d.changed.length) return ask('What changed?', 'No variable in this frame changed since the previous step.');
    ask('What changed?', d.changed.map(c => `${c.v.name}: ${fmt(c.p.value)} → ${fmt(c.v.value)}`).join('; ') + '.');
  };
  const explain = () => {
    if (!d) return;
    ask('Explain this line', `Line ${d.ev.line}: ${d.src}\nValues right now: ${d.scal || '(none)'}.` + (d.changed.length ? `\nIt just changed ${d.changed.map(c => `${c.v.name} from ${fmt(c.p.value)} to ${fmt(c.v.value)}`).join(' and ')}.` : ''));
  };
  const cx = () => {
    const a = problem.approaches;
    ask('Why this complexity?', a.map(x => `${x.label}: time ${x.time}, space ${x.space}. ${x.why}`).join('\n\n'));
  };
  const hint = () => {
    if (hintsShown >= problem.hints.length) return ask('Hint', 'No more hints — you have seen them all. Try tracing the code and predicting each step.');
    onHint(); ask(`Hint ${hintsShown + 1}`, problem.hints[hintsShown]);
  };
  return (
    <div className="tutor">
      <div className="note small">Rule-based tutor: answers come from the current trace step and the problem's authored notes. No LLM is connected (that needs a backend holding an API key).</div>
      <div className="qbtns">
        <button onClick={why} disabled={!d}>Why did this line run?</button>
        <button onClick={changedQ} disabled={!d}>What changed?</button>
        <button onClick={explain} disabled={!d}>Explain this line</button>
        {!playground && <button onClick={cx}>Why this complexity?</button>}
        {!playground && <button onClick={hint}>Hint (no spoilers)</button>}
      </div>
      {log.length === 0 && <div className="dim small">Step through the code, then ask about the step you are on.</div>}
      {log.map((m, i) => <div key={i} className="msg"><div className="q">{m.q} <span className="dim">· step {m.step}</span></div><pre className="a">{m.a}</pre></div>)}
    </div>
  );
}
