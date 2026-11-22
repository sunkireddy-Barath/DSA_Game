import { useMemo, useState } from 'react';
import { QA_BANK, SUBJECTS } from '../interview/qa';
import '../interview/qa2';
import { useStore } from '../store';

/** Interview game: answer the multiple-choice check, then see the model answer, the real-world use and the follow-ups. */
export function InterviewQA() {
  const [sub, setSub] = useState('all');
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const done = useStore(s => s.qaDone), markQa = useStore(s => s.markQa);
  const list = useMemo(() => QA_BANK.filter(x => sub === 'all' || x.subject === sub), [sub]);
  const idx = Math.min(i, list.length - 1);
  const q = list[idx];
  const doneCount = list.filter(x => done[x.id]).length;
  const choose = (n: number) => { if (picked !== null) return; setPicked(n); markQa(q.id, n === q.mcq.correct); };
  const go = (d: number) => { setPicked(null); setI(Math.max(0, Math.min(list.length - 1, idx + d))); };
  const pick = (k: string) => { setSub(k); setI(0); setPicked(null); };
  return (
    <div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
        <button className={sub === 'all' ? 'btn' : 'btn ghost'} onClick={() => pick('all')}>All</button>
        {Object.entries(SUBJECTS).map(([k, v]) => <button key={k} className={sub === k ? 'btn' : 'btn ghost'} onClick={() => pick(k)}>{v}</button>)}
      </div>
      <div className="dim small">Question {idx + 1} of {list.length} · answered correctly: {doneCount}/{list.length} · +10 XP the first time you get one right</div>
      <div className="card" style={{ margin: '8px 0' }}>
        <span className="pill">{SUBJECTS[q.subject]}</span>
        <h3 style={{ margin: '6px 0' }}>{q.q}</h3>
        <p><b>Quick check:</b> {q.mcq.stem}</p>
        {q.mcq.options.map((o, n) => {
          const state = picked === null ? '' : n === q.mcq.correct ? 'ok' : n === picked ? 'bad' : '';
          return <button key={n} className="btn ghost" style={{ display: 'block', margin: '4px 0', textAlign: 'left', borderColor: state === 'ok' ? 'green' : state === 'bad' ? 'crimson' : undefined }} onClick={() => choose(n)}>{o}</button>;
        })}
        {picked !== null && <p>{picked === q.mcq.correct ? '✅ Correct. ' : '❌ Not quite. '}{q.mcq.why}</p>}
      </div>
      {picked !== null && (
        <div className="card">
          <h4>How to answer it</h4><ol>{q.answer.map(a => <li key={a}>{a}</li>)}</ol>
          <h4>Real-world application</h4><p>{q.realWorld}</p>
          <h4>Expect these follow-ups</h4><ul>{q.followUps.map(f => <li key={f}>{f}</li>)}</ul>
        </div>
      )}
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button className="btn ghost" disabled={idx === 0} onClick={() => go(-1)}>← Previous</button>
        <button className="btn" disabled={idx >= list.length - 1} onClick={() => go(1)}>Next →</button>
      </div>
    </div>
  );
}
