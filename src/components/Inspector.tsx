import type { TraceEvent } from '../engine/interp';

export const fmt = (v: any): string => (v === undefined ? '(void)' : v === null ? 'nullptr' : typeof v === 'object' ? ('$ptr' in v ? (v.$ptr ? `node#${v.$ptr}` : 'nullptr') : ('$seq' in v ? `${v.kind}[${v.$seq.map(fmt).join(', ')}]` : JSON.stringify(v))) : String(v));

export function Inspector({ events, idx, lines, iteration, selectedCall }: { events: TraceEvent[]; idx: number; lines: string[]; iteration: number; selectedCall: number | null }) {
  const ev = events[idx], prev = events[idx - 1], next = events[idx + 1];
  const frame = ev.frames[ev.frames.length - 1];
  const pf = prev?.frames.find(f => f.callId === frame.callId);
  const changes = frame.vars.filter(v => { const p = pf?.vars.find(x => x.name === v.name); return !p || JSON.stringify(p.value) !== JSON.stringify(v.value); });
  const text = (e?: TraceEvent) => (e ? (e.kind === 'call' ? `call ${e.fn}(…)` : e.kind === 'return' ? `return ${fmt(e.ret)} from ${e.fn}` : (lines[e.line - 1] ?? '').trim()) : '—');
  const sel = selectedCall != null ? events.find(e => e.kind === 'call' && e.callId === selectedCall) : undefined;
  const selRet = selectedCall != null ? events.slice(0, idx + 1).find(e => e.kind === 'return' && e.callId === selectedCall) : undefined;
  return (
    <div className="insp">
      <div className="kv2"><span>Function</span><b>{ev.fn}</b></div>
      <div className="kv2"><span>Line</span><b>{ev.line}</b></div>
      <div className="kv2"><span>Event</span><b>{ev.kind}</b></div>
      <div className="kv2"><span>Iteration</span><b>{iteration}×  <span className="dim">(this line, this call)</span></b></div>
      <pre className="src">{(lines[ev.line - 1] ?? '').trim()}</pre>
      {ev.cond !== undefined && <div className="note">condition → <b>{String(ev.cond)}</b></div>}
      <h4>Local variables &amp; parameters</h4>
      <table className="vars"><tbody>{frame.vars.map(v => { const ch = changes.includes(v); return <tr key={v.name} className={ch ? 'changed' : ''}><td className="dim">{v.type}</td><td>{v.name}</td><td>{fmt(v.value?.$map ? Object.fromEntries(v.value?.$map) : v.value)}</td></tr>; })}</tbody></table>
      <h4>Call stack</h4>
      <div className="stack">{[...ev.frames].reverse().map((f, i) => (
        <div key={f.callId} className={`sf ${i === 0 ? 'top' : ''}`}><b>{f.fn}</b>({f.vars.filter(v => typeof v.value !== 'object').slice(0, 3).map(v => `${v.name}=${fmt(v.value)}`).join(', ')}) <span className="dim">line {f.line}</span></div>))}</div>
      <h4>Memory changes (this step)</h4>
      {changes.length ? <ul className="mem">{changes.map(v => { const p = pf?.vars.find(x => x.name === v.name); return <li key={v.name}><code>{v.name}</code>: {p ? fmt(p.value?.$map ? Object.fromEntries(p.value?.$map) : p.value) : <i>new</i>} → <b>{fmt(v.value?.$map ? Object.fromEntries(v.value?.$map) : v.value)}</b></li>; })}</ul> : <div className="dim">nothing changed</div>}
      <h4>Previous / next operation</h4>
      <div className="kv2"><span>previous</span><code>{text(prev)}</code></div>
      <div className="kv2"><span>next</span><code>{text(next)}</code></div>
      <h4>Counters so far</h4>
      <div className="kv2"><span>comparisons</span><b>{ev.stats[0]}</b></div>
      <div className="kv2"><span>function calls</span><b>{ev.stats[1]}</b></div>
      <div className="kv2"><span>loop iterations</span><b>{ev.stats[2]}</b></div>
      <div className="kv2"><span>map operations</span><b>{ev.stats[3]}</b></div>
      {sel && (
        <>
          <h4>Selected recursion node</h4>
          <div className="note"><b>{sel.fn}</b>({sel.frames[sel.frames.length - 1].vars.filter(v => typeof v.value !== 'object').map(v => `${v.name}=${fmt(v.value)}`).join(', ')}) · {events.slice(0, idx + 1).filter(e => e.callId === selectedCall && e.kind === 'line').length} lines run · {selRet ? `returned ${fmt(selRet.ret)}` : 'still active'}</div>
        </>
      )}
    </div>
  );
}
