import { playbookFor } from '../interview/playbook';

/** Collapsible "how to answer this in an interview" panel shown above every DSA problem. */
export function PlaybookPanel({ step }: { step: number }) {
  const p = playbookFor(step);
  if (!p) return null;
  return (
    <details className="card" style={{ margin: '8px 16px' }}>
      <summary><b>Interview playbook for this topic</b> — how to recognise it, how to answer, where it is used</summary>
      <h4>Recognise it</h4><ul>{p.signals.map(x => <li key={x}>{x}</li>)}</ul>
      <h4>Say it like this</h4><ol>{p.script.map(x => <li key={x}>{x}</li>)}</ol>
      <h4>Real-world application</h4><p>{p.realWorld}</p>
      <h4>Likely follow-ups</h4><ul>{p.followUps.map(x => <li key={x}>{x}</li>)}</ul>
      <h4>Common pitfalls</h4><ul>{p.pitfalls.map(x => <li key={x}>{x}</li>)}</ul>
    </details>
  );
}
