import { useState } from 'react';
import type { Concept } from '../dbms/concepts';

/** Generic theory-card browser shared by every world (definition, analogy, terminology, trade-offs, interview). */
export function ConceptCards({ concepts }: { concepts: Concept[] }) {
  const [id, setId] = useState(concepts[0].id);
  const c = concepts.find(x => x.id === id) ?? concepts[0];
  return (
    <div className="sqlw" style={{ minHeight: 0 }}>
      <aside className="sql-side" style={{ position: 'static', maxHeight: 'none' }}>{concepts.map(x => <button key={x.id} className={`side-item ${x.id === c.id ? 'on' : ''}`} onClick={() => setId(x.id)}>{x.module}</button>)}</aside>
      <section className="sql-main"><h2>{c.module}</h2>
        <div className="grid2"><div className="card"><h4>In simple words</h4><p>{c.simple}</p></div><div className="card"><h4>Technical definition</h4><p>{c.technical}</p></div>
          <div className="card"><h4>Real-world analogy</h4><p>{c.analogy}</p></div><div className="card"><h4>Real-world use</h4><p>{c.realWorld}</p></div></div>
        <h4>Key terminology</h4><div className="kwlist">{c.keywords.map(([a, b]) => <div key={a}><b>{a}</b> — {b}</div>)}</div>
        <div className="grid2"><div><h4>Advantages</h4><ul>{c.pros.map(x => <li key={x}>{x}</li>)}</ul></div><div><h4>Disadvantages</h4><ul>{c.cons.map(x => <li key={x}>{x}</li>)}</ul></div>
          <div><h4>Common mistakes</h4><ul>{c.mistakes.map(x => <li key={x}>{x}</li>)}</ul></div><div><h4>Interview questions</h4><ul>{c.interview.map(x => <li key={x}>{x}</li>)}</ul></div></div>
        <div className="dim small">Related: {c.related.join(' · ')}</div></section>
    </div>
  );
}
