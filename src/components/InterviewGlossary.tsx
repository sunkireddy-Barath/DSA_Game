import { useMemo, useState } from 'react';
import { GLOSSARY } from '../interview/glossary';
import { InterviewQA } from './InterviewQA';
import { SUBJECTS } from '../interview/qa';
import { MockInterview } from './MockInterview';

/** Searchable interview glossary with a self-test mode (term -> try to recall -> reveal). */
export function InterviewGlossary() {
  const [sub, setSub] = useState('all');
  const [q, setQ] = useState('');
  const [quiz, setQuiz] = useState(false);
  const [tab, setTab] = useState<'qa' | 'mock' | 'gl'>('qa');
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return GLOSSARY.filter(s => sub === 'all' || s.key === sub).flatMap(s => s.entries.map(e => ({ s, e })))
      .filter(({ e }) => !needle || (e[0] + ' ' + e[1] + ' ' + e[2]).toLowerCase().includes(needle));
  }, [sub, q]);
  const total = GLOSSARY.reduce((n, s) => n + s.entries.length, 0);
  return (
    <div className="page">
      <h1>Interview Prep</h1>
      <div className="row" style={{ gap: 8 }}>
        <button className={tab === 'qa' ? 'btn' : 'btn ghost'} onClick={() => setTab('qa')}>Interview Q&amp;A game</button>
        <button className={tab === 'mock' ? 'btn' : 'btn ghost'} onClick={() => setTab('mock')}>Mock interviewer</button>
        <button className={tab === 'gl' ? 'btn' : 'btn ghost'} onClick={() => setTab('gl')}>Glossary of terms</button>
      </div>
      {tab === 'qa' ? <InterviewQA /> : tab === 'mock' ? <MockInterview /> : <>
      <p className="dim">{total} precise terms across {GLOSSARY.length} subjects: the exact definition, plus what interviewers usually probe. Use quiz mode to test yourself.</p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
        <button className={sub === 'all' ? 'btn' : 'btn ghost'} onClick={() => setSub('all')}>All</button>
        {GLOSSARY.map(s => <button key={s.key} className={sub === s.key ? 'btn' : 'btn ghost'} onClick={() => setSub(s.key)}>{SUBJECTS[s.key] ?? s.title}</button>)}
        <input placeholder="Search a term, e.g. deadlock, B+ tree, CIDR…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} aria-label="Search glossary" />
        <label><input type="checkbox" checked={quiz} onChange={e => { setQuiz(e.target.checked); setShown({}); }} /> Quiz mode</label>
      </div>
      <div className="dim small">{rows.length} shown</div>
      {rows.map(({ s, e }) => {
        const id = s.key + e[0];
        const hide = quiz && !shown[id];
        return (
          <div key={id} className="card" style={{ margin: '8px 0' }}>
            <h4 style={{ margin: 0 }}>{e[0]} <span className="pill">{s.title}</span></h4>
            {hide ? <button className="btn ghost" onClick={() => setShown({ ...shown, [id]: true })}>Reveal answer</button>
              : <><p style={{ margin: '6px 0' }}>{e[1]}</p><p className="dim small" style={{ margin: 0 }}><b>Interviewers ask:</b> {e[2]}</p></>}
          </div>
        );
      })}
      {!rows.length && <p className="dim">No matching terms.</p>}
      </>}
    </div>
  );
}
