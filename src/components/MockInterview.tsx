import { useState } from 'react';
import { QA_BANK, SUBJECTS, type QA } from '../interview/qa';
import '../interview/qa2';
import { evaluate, pickQuestions, type Feedback } from '../interview/mock';
import { useStore } from '../store';

type Phase = 'intro' | 'ask' | 'feedback' | 'done';

/** Mock interview: the interviewer waits until you say you are ready, asks, then corrects your answer and shows what to say. */
export function MockInterview() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [sub, setSub] = useState('all');
  const [count, setCount] = useState(5);
  const [qs, setQs] = useState<QA[]>([]);
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [fb, setFb] = useState<Feedback | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const markQa = useStore(s => s.markQa);

  const start = () => { setQs(pickQuestions(QA_BANK, sub, count)); setI(0); setScores([]); setText(''); setFb(null); setPhase('ask'); };
  const submit = () => { const f = evaluate(qs[i], text); setFb(f); setScores([...scores, f.score]); markQa(qs[i].id, f.verdict === 'strong'); setPhase('feedback'); };
  const next = () => { if (i + 1 >= qs.length) setPhase('done'); else { setI(i + 1); setText(''); setFb(null); setPhase('ask'); } };
  const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0;

  if (phase === 'intro') return (
    <div className="card" style={{ margin: '8px 0' }}>
      <h3>Mock interviewer</h3>
      <p>I will wait until you are ready. When you start, I ask one question at a time. You type your answer as you would say it aloud; then I show which key points you covered, what you missed and what you should say.</p>
      <p className="dim small">This is a rule-based grader (it checks your answer against the key points of each question). It does not understand free text like a human or an LLM, so a correct answer in very different words can be marked as missing a point; always compare with the model answer.</p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <label>Subject <select value={sub} onChange={e => setSub(e.target.value)}><option value="all">All</option>{Object.entries(SUBJECTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>Questions <select value={count} onChange={e => setCount(Number(e.target.value))}>{[3, 5, 8, 10].map(n => <option key={n}>{n}</option>)}</select></label>
        <button className="btn" onClick={start}>I am ready — ask me</button>
      </div>
    </div>
  );

  if (phase === 'done') return (
    <div className="card" style={{ margin: '8px 0' }}>
      <h3>Interview finished: {avg}% key-point coverage</h3>
      <p>{avg >= 70 ? 'Strong performance. Practise saying the examples out loud.' : avg >= 40 ? 'Decent base. Review the missed points and retry.' : 'Review the model answers, then try again.'}</p>
      <ul>{qs.map((q, n) => <li key={q.id}>{q.q} — {Math.round((scores[n] ?? 0) * 100)}%</li>)}</ul>
      <button className="btn" onClick={() => setPhase('intro')}>New interview</button>
    </div>
  );

  const q = qs[i];
  return (
    <div className="card" style={{ margin: '8px 0' }}>
      <div className="dim small">Question {i + 1} of {qs.length} · {SUBJECTS[q.subject]}</div>
      <h3>🎤 {q.q}</h3>
      {phase === 'ask' && <>
        <textarea rows={6} style={{ width: '100%' }} placeholder="Type your answer the way you would say it in the interview…" value={text} onChange={e => setText(e.target.value)} aria-label="Your answer" />
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={submit}>Submit answer</button>
          <button className="btn ghost" onClick={() => { setFb(evaluate(q, '')); setScores([...scores, 0]); setPhase('feedback'); }}>I don&apos;t know — show me</button>
        </div>
      </>}
      {phase === 'feedback' && fb && <>
        <p><b>{fb.verdict === 'strong' ? '✅ Strong answer' : fb.verdict === 'okay' ? '🟡 Partly there' : '❌ Needs work'}</b> — you covered {fb.points.filter(p => p.covered).length} of {fb.points.length} key points ({Math.round(fb.score * 100)}%).</p>
        {fb.points.filter(p => p.covered).length > 0 && <><h4>What you covered</h4><ul>{fb.points.filter(p => p.covered).map(p => <li key={p.point}>✔ {p.point}</li>)}</ul></>}
        {fb.missing.length > 0 && <><h4>Correction: you should also say</h4><ul>{fb.missing.map(m => <li key={m}>➕ {m}</li>)}</ul></>}
        {fb.tips.length > 0 && <><h4>How to improve</h4><ul>{fb.tips.map(t => <li key={t}>{t}</li>)}</ul></>}
        <h4>Model answer (what to say)</h4><p>{fb.modelAnswer}</p>
        <h4>Expect these follow-ups</h4><ul>{q.followUps.map(f => <li key={f}>{f}</li>)}</ul>
        <button className="btn" onClick={next}>{i + 1 >= qs.length ? 'Finish' : 'Next question'}</button>
      </>}
    </div>
  );
}
