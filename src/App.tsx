import { useEffect, useMemo, useState } from 'react';
import { PlaybookPanel } from './components/PlaybookPanel';
import { InterviewGlossary } from './components/InterviewGlossary';
import { SHEET, ALL_PROBLEMS, PROBLEM_BY_ID } from './data/sheet';
import { PLAYABLE, PLAYABLE_BY_TITLE, Playable } from './data/problems';
import { SUBJECTS } from './data/subjects';
import { levelOf, rankOf, RANKS, useStore } from './store';
import { Workspace } from './components/Workspace';
import { SqlWorld } from './components/SqlWorld';
import { OSWorld } from './components/OSWorld';
import { DBMSWorld } from './components/DBMSWorld';
import { NetworkWorld } from './components/NetworkWorld';
import { ArchWorld } from './components/ArchWorld';
import { OopsWorld } from './components/OopsWorld';
import { SystemDesignWorld } from './components/SystemDesignWorld';
import { SoftwareEngWorld } from './components/SoftwareEngWorld';
import { DevWorld } from './components/DevWorld';
import { ConceptCards } from './components/ConceptCards';
import { DSA_CONCEPTS } from './data/dsaConcepts';

const useHash = () => {
  const [h, setH] = useState(location.hash.slice(1) || '/');
  useEffect(() => { const f = () => setH(location.hash.slice(1) || '/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h;
};
const go = (p: string) => { location.hash = p; };
const PLAYABLE_COUNT = ALL_PROBLEMS.filter(p => PLAYABLE_BY_TITLE.has(p.title)).length;
const playableIds = ALL_PROBLEMS.filter(p => PLAYABLE_BY_TITLE.has(p.title));

const PLAYGROUND: Playable = {
  title: 'Playground', fn: 'fib', statement: '', constraints: [], hints: [], intuition: '',
  starter: '', tests: [], defaultArgs: [5], ref: () => 0,
  approaches: [{ label: 'Your code', time: '—', space: '—', growth: 'n', why: 'Write any function in the supported subset and trace it.',
    code: `class Solution {
public:
    int fib(int n) {
        if (n <= 1) {
            return n;
        }
        return fib(n - 1) + fib(n - 2);
    }
};` }],
};

export default function App() {
  const hash = useHash();
  const s = useStore();
  const [, route, arg] = hash.split('/');
  const lvl = levelOf(s.xp);
  return (
    <>
      <nav className="top">
        <a className="brand" href="#/">CS&nbsp;QUEST</a>
        <a className={!route ? 'on' : ''} href="#/">Dashboard</a>
        <a className={route === 'worlds' || route === 'world' ? 'on' : ''} href="#/worlds">Worlds</a>
        <a className={route === 'dsa' || route === 'p' ? 'on' : ''} href="#/dsa">Learn DSA</a>
        <select className="worldsel" value={['dbms', 'sql', 'os', 'oops', 'cn', 'coa', 'sysdesign', 'se', 'dev'].includes(route) ? route : ''} onChange={e => { if (e.target.value) go(`/${e.target.value}`); }} aria-label="Jump to a world">
          <option value="">Jump to a world…</option><option value="dbms">Database World</option><option value="sql">SQL World</option><option value="os">Operating System World</option><option value="oops">OOPS World</option><option value="cn">Network World</option><option value="coa">Computer Architecture World</option><option value="sysdesign">System Design World</option><option value="se">Software Engineering World</option><option value="dev">Developer Tools World</option>
        </select>
        <a className={route === 'interview' ? 'on' : ''} href="#/interview">Interview</a>
        <a className={route === 'playground' ? 'on' : ''} href="#/playground">Playground</a>
        <a className={route === 'profile' ? 'on' : ''} href="#/profile">Profile</a>
        <span className="spacer" />
        <span className="hud">🔥 {s.streak.count}</span>
        <span className="hud">Lv {lvl} · {rankOf(s.xp)}</span>
        <span className="hud xp">{s.xp} XP</span>
      </nav>
      <main>
        {!route && <Dashboard />}
        {route === 'worlds' && <Worlds />}
        {route === 'world' && <World k={arg} />}
        {route === 'dsa' && <Learn />}
        {route === 'p' && <ProblemPage id={arg} />}
        {route === 'playground' && <Workspace key="pg" problem={PLAYGROUND} id="playground" diff="E" playground />}
        {route === 'sql' && <SqlWorld />}
        {route === 'os' && <OSWorld />}
        {route === 'dbms' && <DBMSWorld />}
        {route === 'cn' && <NetworkWorld />}
        {route === 'coa' && <ArchWorld />}
        {route === 'oops' && <OopsWorld />}
        {route === 'sysdesign' && <SystemDesignWorld />}
        {route === 'se' && <SoftwareEngWorld />}
        {route === 'dev' && <DevWorld />}
        {route === 'interview' && <InterviewGlossary />}
        {route === 'profile' && <Profile />}
      </main>
    </>
  );
}

function Bar({ v, max }: { v: number; max: number }) { return <div className="bar"><div style={{ width: `${max ? (v / max) * 100 : 0}%` }} /></div>; }

function Dashboard() {
  const s = useStore();
  const solvedN = Object.keys(s.solved).length;
  const next = playableIds.find(p => !s.solved[p.id]);
  const daily = playableIds[Math.floor(Date.now() / 86400000) % playableIds.length];
  const lvl = levelOf(s.xp);
  const lastP = s.last && s.last !== 'playground' ? PROBLEM_BY_ID.get(s.last) : null;
  const weak = Object.entries(s.attempts).filter(([id]) => !s.solved[id]).map(([id, n]) => ({ p: PROBLEM_BY_ID.get(id)!, n })).filter(x => x.p).sort((a, b) => b.n - a.n).slice(0, 3);
  return (
    <div className="page">
      <h1>Welcome back</h1>
      <div className="stats">
        <div className="card"><span>Problems solved</span><b>{solvedN}</b><i>of {PLAYABLE_COUNT} playable · {ALL_PROBLEMS.length} in sheet</i></div>
        <div className="card"><span>Total XP</span><b>{s.xp}</b><Bar v={s.xp % 150} max={150} /><i>Level {lvl} · {rankOf(s.xp)}</i></div>
        <div className="card"><span>Daily streak</span><b>{s.streak.count} 🔥</b><i>days in a row</i></div>
        <div className="card"><span>Learning time</span><b>{(s.seconds / 3600).toFixed(1)} h</b><i>while a workspace is open</i></div>
        <div className="card"><span>Prediction accuracy</span><b>{s.predictions.total ? Math.round((s.predictions.correct / s.predictions.total) * 100) : 0}%</b><i>{s.predictions.correct}/{s.predictions.total} correct</i></div>
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
        <a key={sub.key} className={`card subj ${sub.status}`} href={sub.status === 'live' ? (sub.key === 'dsa' ? '#/dsa' : `#/${sub.key}`) : `#/world/${sub.key}`}>
          <div className="row"><b>{sub.world}</b><span className={`pill ${sub.status === 'live' ? 'ok' : ''}`}>{sub.status === 'live' ? 'Live' : 'Not built yet'}</span></div>
          <div className="dim">{sub.name}</div>
          <p>{sub.blurb}</p>
          <div className="dim small">{sub.modules.length} modules · {sub.difficulty} · ~{sub.hours} h</div>
          {sub.key === 'dsa' && <><Bar v={solvedN} max={PLAYABLE_COUNT} /><div className="dim small">{solvedN}/{PLAYABLE_COUNT} playable solved</div></>}
        </a>))}</div>
    </div>
  );
}

function Worlds() {
  return (
    <div className="page"><h1>Worlds</h1>
      <p className="dim">Each subject gets its own workspace and simulators. All ten worlds are live. Each has concept cards plus simulators or labs backed by tested engines; they are simplified educational models and say so on their pages.</p>
      <div className="subjects">{SUBJECTS.map(sub => (
        <a key={sub.key} className={`card subj ${sub.status}`} href={sub.status === 'live' ? (sub.key === 'dsa' ? '#/dsa' : `#/${sub.key}`) : `#/world/${sub.key}`}>
          <div className="row"><b>{sub.world}</b><span className={`pill ${sub.status === 'live' ? 'ok' : ''}`}>{sub.status === 'live' ? 'Live' : sub.phase}</span></div>
          <p>{sub.blurb}</p><div className="dim small">Workspace: {sub.workspace}</div>
        </a>))}</div>
    </div>
  );
}

function World({ k }: { k: string }) {
  const sub = SUBJECTS.find(x => x.key === k);
  if (!sub) return <div className="page">Unknown world.</div>;
  return (
    <div className="page"><a href="#/worlds">← Worlds</a><h1>{sub.world}</h1><p>{sub.blurb}</p>
      <div className="note">Status: <b>{sub.status === 'live' ? 'live' : `not built yet (${sub.phase} of the roadmap)`}</b>. The outline below is the planned curriculum. No simulator exists for this subject yet, so none is shown.</div>
      <h3>Planned workspace</h3><p>{sub.workspace}</p>
      <h3>Planned modules</h3><ol>{sub.modules.map(m => <li key={m}>{m}</li>)}</ol>
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
      <div className="note small">The full step/topic/problem structure is listed. Problems marked <span className="pill ok">Playable</span> have real C++ code, tracing, a visualization, hidden tests and a solve mode. The rest are listed but their code is not authored yet — opening them says so. The list was reconstructed from the public sheet's structure and may differ slightly from the live page.</div>
      <div className="filters"><input placeholder="Search problems…" value={q} onChange={e => setQ(e.target.value)} />
        <label><input type="checkbox" checked={onlyPlay} onChange={e => setOnlyPlay(e.target.checked)} /> Playable only</label>
        <span className="dim">{solvedN} solved</span></div>
      {SHEET.map(step => {
        const probs = step.topics.flatMap(t => t.problems);
        const play = probs.filter(p => PLAYABLE_BY_TITLE.has(p.title));
        const done = probs.filter(p => s.solved[p.id]).length;
        const isOpen = open[step.n] ?? !!q;
        const shown = (t: typeof step.topics[0]) => t.problems.filter(p => p.title.toLowerCase().includes(q.toLowerCase()) && (!onlyPlay || PLAYABLE_BY_TITLE.has(p.title)));
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
                  const pl = PLAYABLE_BY_TITLE.has(p.title);
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

function ProblemPage({ id }: { id: string }) {
  const p = PROBLEM_BY_ID.get(id);
  if (!p) return <div className="page">Problem not found. <a href="#/dsa">Back</a></div>;
  const pl = PLAYABLE_BY_TITLE.get(p.title);
  if (!pl) return (
    <div className="page"><a href="#/dsa">← A2Z sheet</a><h1>{p.title}</h1>
      <div className="note">This problem is in the A2Z curriculum but <b>its C++ solution, tests and visualization have not been authored yet</b>, so there is nothing real to trace. Rather than show a fake animation, it is left empty.</div>
      <p>Meanwhile you can paste any function using the supported subset into the <a href="#/playground">Playground</a> and trace it, or try one of the {PLAYABLE_COUNT} playable problems.</p>
      <p className="dim">Step {p.step} · {SHEET.find(x => x.n === p.step)?.topics[p.topic].name}</p></div>
  );
  return <><PlaybookPanel step={p.step} /><Workspace key={id} problem={pl} id={id} diff={p.diff} /></>;
}

function Profile() {
  const s = useStore();
  const solvedN = Object.keys(s.solved).length;
  const lvl = levelOf(s.xp);
  const ach = [
    ['First Blood', 'Solve your first problem', solvedN >= 1], ['Pointer Warrior', 'Solve 5 problems', solvedN >= 5], ['Algorithm Explorer', 'Solve 15 problems', solvedN >= 15],
    ['Fortune Teller', 'Answer 10 predictions correctly', s.predictions.correct >= 10], ['Streak x3', 'Learn 3 days in a row', s.streak.count >= 3],
    ['No Peeking', 'Solve a problem with zero hints', Object.values(s.solved).some(x => x.hints === 0)],
  ] as const;
  return (
    <div className="page"><h1>Profile</h1>
      <div className="stats"><div className="card"><span>Rank</span><b>{rankOf(s.xp)}</b><i>Level {lvl}</i></div><div className="card"><span>XP</span><b>{s.xp}</b></div><div className="card"><span>Solved</span><b>{solvedN}</b></div></div>
      <h3>Ranks</h3><div className="ranks">{RANKS.map((r, i) => <span key={r} className={`pill ${rankOf(s.xp) === r ? 'ok' : ''}`}>{i * 2 + 1}+ · {r}</span>)}</div>
      <h3>Achievements</h3>
      <div className="subjects">{ach.map(([n, d, ok]) => <div key={n} className={`card ${ok ? '' : 'locked'}`}><b>{ok ? '🏆' : '🔒'} {n}</b><div className="dim">{d}</div></div>)}</div>
      <p><button onClick={() => { if (confirm('Erase all progress stored in this browser?')) s.reset(); }}>Reset progress</button></p>
      <p className="dim small">Progress is stored in this browser only (localStorage). Accounts and cross-device sync need the backend phase (Supabase auth), which is not built yet.</p>
    </div>
  );
}
