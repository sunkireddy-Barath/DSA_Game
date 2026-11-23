import { useState } from 'react';
import { SHEET, ALL_PROBLEMS, PROBLEM_BY_ID } from '../data/sheet';
import { PLAYABLE_TITLES } from '../data/playableIndex';
import { SUBJECTS } from '../data/subjects';
import { levelOf, rankOf, useStore } from '../store';
import { ConceptCards } from '../components/ConceptCards';
import { DSA_CONCEPTS } from '../data/dsaConcepts';

// Light pages: they only need the sheet structure and the playable-title index, never the problem bank.
const go = (p: string) => { location.hash = p; };
const PLAYABLE_COUNT = ALL_PROBLEMS.filter(p => PLAYABLE_TITLES.has(p.title)).length;
const playableIds = ALL_PROBLEMS.filter(p => PLAYABLE_TITLES.has(p.title));

const WORLD_ICON: Record<string, string> = { dsa: '🧩', dbms: '🗄️', sql: '🔎', os: '⚙️', oops: '🧱', cn: '🌐', coa: '🧠', sysdesign: '🏗️', se: '🛠️', dev: '💻' };

function Bar({ v, max }: { v: number; max: number }) { return <div className="bar"><div style={{ width: `${max ? (v / max) * 100 : 0}%` }} /></div>; }

function Dashboard() {
  const s = useStore();
  const solvedN = Object.keys(s.solved).length;
  const next = playableIds.find(p => !s.solved[p.id]);
  const daily = playableIds[Math.floor(Date.now() / 86400000) % playableIds.length];
  const lvl = levelOf(s.xp);
  const lastP = s.last && s.last !== 'playground' ? PROBLEM_BY_ID.get(s.last) : null;
  const weak = Object.entries(s.attempts).filter(([id]) => !s.solved[id]).map(([id, n]) => ({ p: PROBLEM_BY_ID.get(id)!, n })).filter(x => x.p).sort((a, b) => b.n - a.n).slice(0, 3);
  const toNext = 150 - (s.xp % 150);
  const hero = lastP ? { label: `Continue: ${lastP.title}`, id: lastP.id } : next ? { label: `Start: ${next.title}`, id: next.id } : null;
  return (
    <div className="page">
      <section className="hero">
        <div>
          <h1>Welcome back</h1>
          <p className="lead">{solvedN === 0 ? 'Watch real C++ run line by line, predict what happens next, then solve it yourself. Pick up where it makes sense:' : `${solvedN} problem${solvedN === 1 ? '' : 's'} solved. ${toNext} XP to level ${lvl + 1}: keep the streak alive.`}</p>
          <div className="hero-cta">
            {hero && <button className="primary" onClick={() => go(`/p/${hero.id}`)}>{hero.label}</button>}
            <button onClick={() => go('/dsa')}>Browse all {ALL_PROBLEMS.length} problems</button>
            <button onClick={() => go('/games')}>🎮 Play a game</button>
            <button onClick={() => go('/interview')}>Interview practice</button>
          </div>
        </div>
        <div className="ring" style={{ '--p': (s.xp % 150) / 1.5 } as React.CSSProperties} role="img" aria-label={`Level ${lvl}, ${s.xp % 150} of 150 XP`}><div><b>{lvl}</b><span>Level</span></div></div>
      </section>
      <div className="stats">
        <div className="card"><span className="ico" aria-hidden="true">✅</span><span>Problems solved</span><b>{solvedN}</b><i>of {PLAYABLE_COUNT} playable · {ALL_PROBLEMS.length} in sheet</i></div>
        <div className="card"><span className="ico" aria-hidden="true">⚡</span><span>Total XP</span><b>{s.xp}</b><Bar v={s.xp % 150} max={150} /><i>Level {lvl} · {rankOf(s.xp)}</i></div>
        <div className="card"><span className="ico" aria-hidden="true">🔥</span><span>Daily streak</span><b>{s.streak.count} 🔥</b><i>days in a row</i></div>
        <div className="card"><span className="ico" aria-hidden="true">⏱</span><span>Learning time</span><b>{(s.seconds / 3600).toFixed(1)} h</b><i>while a workspace is open</i></div>
        <div className="card"><span className="ico" aria-hidden="true">🎯</span><span>Prediction accuracy</span><b>{s.predictions.total ? Math.round((s.predictions.correct / s.predictions.total) * 100) : 0}%</b><i>{s.predictions.correct}/{s.predictions.total} correct</i></div>
      </div>
      <div className="grid2">
        <div className="card">
          <h3>Continue learning</h3>
          {lastP ? <button className="primary" onClick={() => go(`/p/${lastP.id}`)}>Continue: {lastP.title}</button> : next && <button className="primary" onClick={() => go(`/p/${next.id}`)}>Start: {next.title}</button>}
          {next && lastP?.id !== next.id && <p className="dim">Recommended next: <a href={`#/p/${next.id}`}>{next.title}</a></p>}
        </div>
        <div className="card">
          <h3>Daily challenge</h3>
          <p><a href={`#/p/${daily.id}`}>{daily.title}</a> {s.solved[daily.id] ? <span className="pill ok">done</span> : <span className="pill">+{{ E: 20, M: 40, H: 80 }[daily.diff]} XP</span>}</p>
          <p className="dim">One playable problem per day, chosen deterministically from the date.</p>
        </div>
        <div className="card">
          <h3>Weak spots</h3>
          {weak.length ? weak.map(w => <div key={w.p.id}><a href={`#/p/${w.p.id}`}>{w.p.title}</a> <span className="dim">{w.n} attempts, unsolved</span></div>) : <p className="dim">Nothing yet — failed attempts show up here.</p>}
        </div>
        <div className="card">
          <h3>Recent activity</h3>
          {s.log.length ? s.log.slice(0, 5).map((a, i) => <div key={i} className="dim">{a.text}</div>) : <p className="dim">Solve a problem or answer a prediction to earn XP.</p>}
        </div>
      </div>
      <h2>Worlds</h2>
      <div className="subjects">{SUBJECTS.map(sub => (
        <a key={sub.key} className={`card subj world-${sub.key} ${sub.status}`} href={sub.status === 'live' ? (sub.key === 'dsa' ? '#/dsa' : `#/${sub.key}`) : `#/world/${sub.key}`}>
          <div className="row"><span style={{ display: 'flex', alignItems: 'center' }}><span className="world-ico" aria-hidden="true">{WORLD_ICON[sub.key] ?? '◆'}</span><b>{sub.world}</b></span><span className={`pill ${sub.status === 'live' ? 'ok' : ''}`}>{sub.status === 'live' ? 'Live' : 'Not built yet'}</span></div>
          <div className="dim">{sub.name}</div>
          <p>{sub.blurb}</p>
          <div className="dim small">{sub.modules.length} modules · {sub.difficulty} · ~{sub.hours} h</div>
          {sub.key === 'dsa' && <><Bar v={solvedN} max={PLAYABLE_COUNT} /><div className="dim small">{solvedN}/{PLAYABLE_COUNT} playable solved</div></>}
        </a>))}</div>
    </div>
  );
}

function Learn() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [onlyPlay, setOnlyPlay] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const solvedN = Object.keys(s.solved).length;
  const [tab, setTab] = useState<'sheet' | 'concepts'>('sheet');
  if (tab === 'concepts') return (
    <div className="page"><h1>DSA Concepts</h1>
      <div className="stage-bar"><button className="tab" onClick={() => setTab('sheet')}>A2Z problem sheet</button><button className="tab on">Concept cards (16 topics)</button></div>
      <ConceptCards concepts={DSA_CONCEPTS} /></div>
  );
  return (
    <div className="page">
      <div className="stage-bar"><button className="tab on">A2Z problem sheet</button><button className="tab" onClick={() => setTab('concepts')}>Concept cards (16 topics)</button></div>
      <h1>Striver's A2Z DSA Sheet <span className="dim">— {ALL_PROBLEMS.length} problems · {PLAYABLE_COUNT} playable</span></h1>
      <div className="note small">The full step/topic/problem structure is listed. Every problem marked <span className="pill ok">Playable</span> has real C++ code, tracing, a visualization, hidden tests and a solve mode. The list was reconstructed from the public sheet's structure and may differ slightly from the live page.</div>
      <div className="filters"><input placeholder="Search problems…" value={q} onChange={e => setQ(e.target.value)} />
        <label><input type="checkbox" checked={onlyPlay} onChange={e => setOnlyPlay(e.target.checked)} /> Playable only</label>
        <span className="dim">{solvedN} solved</span></div>
      {SHEET.map(step => {
        const probs = step.topics.flatMap(t => t.problems);
        const play = probs.filter(p => PLAYABLE_TITLES.has(p.title));
        const done = probs.filter(p => s.solved[p.id]).length;
        const isOpen = open[step.n] ?? !!q;
        const shown = (t: typeof step.topics[0]) => t.problems.filter(p => p.title.toLowerCase().includes(q.toLowerCase()) && (!onlyPlay || PLAYABLE_TITLES.has(p.title)));
        if ((q || onlyPlay) && !step.topics.some(t => shown(t).length)) return null;
        return (
          <div key={step.n} className="step">
            <button className="step-head" onClick={() => setOpen(o => ({ ...o, [step.n]: !isOpen }))}>
              <span>{isOpen ? '▾' : '▸'} Step {step.n}: {step.name}</span>
              <span className="dim">{play.length} playable · {done}/{probs.length}</span>
              <Bar v={done} max={probs.length} />
            </button>
            {isOpen && step.topics.map((t, ti) => shown(t).length > 0 && (
              <div key={ti} className="topic"><h4>{t.name}</h4>
                {shown(t).map(p => {
                  const pl = PLAYABLE_TITLES.has(p.title);
                  return <a key={p.id} className={`prow ${pl ? '' : 'off'}`} href={`#/p/${p.id}`}>
                    <span>{s.solved[p.id] ? '✅' : pl ? '▶' : '·'}</span><span className="t">{p.title}</span>
                    <span className={`pill d${p.diff}`}>{{ E: 'Easy', M: 'Medium', H: 'Hard' }[p.diff]}</span>
                    {pl && <span className="pill ok">Playable</span>}</a>;
                })}</div>))}
          </div>
        );
      })}
    </div>
  );
}

export { Dashboard, Learn };
