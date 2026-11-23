import { Component, ComponentType, CSSProperties, lazy, LazyExoticComponent, ReactNode, Suspense, useEffect, useState } from 'react';
import { SUBJECTS } from './data/subjects';
import { levelOf, rankOf, RANKS, useStore } from './store';
import { startAutoSync, useAuth } from './auth';
import { api, ApiError } from './api';
import { useTheme } from './theme';

// Every page is its own chunk, loaded on demand. The Monaco editor itself is fetched only when a workspace opens.
const page = <K extends string>(load: () => Promise<Record<K, any>>, key: K): LazyExoticComponent<ComponentType<any>> => lazy(() => load().then(m => ({ default: m[key] as ComponentType<any> })));
const Dashboard = page(() => import('./pages/Home'), 'Dashboard');
const Learn = page(() => import('./pages/Home'), 'Learn');
const ProblemPage = page(() => import('./pages/ProblemRoute'), 'ProblemPage');
const PlaygroundPage = page(() => import('./pages/ProblemRoute'), 'PlaygroundPage');
const SqlWorld = page(() => import('./components/SqlWorld'), 'SqlWorld');
const OSWorld = page(() => import('./components/OSWorld'), 'OSWorld');
const DBMSWorld = page(() => import('./components/DBMSWorld'), 'DBMSWorld');
const NetworkWorld = page(() => import('./components/NetworkWorld'), 'NetworkWorld');
const ArchWorld = page(() => import('./components/ArchWorld'), 'ArchWorld');
const OopsWorld = page(() => import('./components/OopsWorld'), 'OopsWorld');
const SystemDesignWorld = page(() => import('./components/SystemDesignWorld'), 'SystemDesignWorld');
const SoftwareEngWorld = page(() => import('./components/SoftwareEngWorld'), 'SoftwareEngWorld');
const DevWorld = page(() => import('./components/DevWorld'), 'DevWorld');
const InterviewGlossary = page(() => import('./components/InterviewGlossary'), 'InterviewGlossary');
const Account = page(() => import('./components/Account'), 'Account');
const GamesHub = page(() => import('./components/games/Games'), 'GamesHub');
const QuestMap = page(() => import('./components/QuestMap'), 'QuestMap');
const GamePage = page(() => import('./components/games/Games'), 'GamePage');

const useHash = () => {
  const [h, setH] = useState(location.hash.slice(1) || '/');
  useEffect(() => { const f = () => setH(location.hash.slice(1) || '/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h;
};
const go = (p: string) => { location.hash = p; };

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false }); }
  render() {
    return this.state.failed
      ? <div className="page" role="alert"><h2>This page failed to load</h2><p>Check your connection and <button onClick={() => location.reload()}>reload</button>. If a new version was just deployed, reloading fetches it.</p></div>
      : this.props.children;
  }
}

export default function App() {
  const hash = useHash();
  const s = useStore();
  const auth = useAuth();
  const [, route, arg] = hash.split('/');
  const lvl = levelOf(s.xp);
  const theme = useTheme(t => t.theme), toggleTheme = useTheme(t => t.toggle);
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [hash]);
  useEffect(() => { void useAuth.getState().init(); return startAutoSync(); }, []);
  return (
    <>
      <nav className="top">
        <a className="brand" href="#/"><span className="logo"><svg viewBox="0 0 24 24" fill="none" stroke="#0a0d1f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5" /></svg></span><span className="word">CS&nbsp;QUEST</span></a>
        <div className={`links ${menu ? 'open' : ''}`} id="main-links">
          <a className={!route ? 'on' : ''} href="#/">Dashboard</a>
          <a className={route === 'worlds' || route === 'world' ? 'on' : ''} href="#/worlds">Worlds</a>
          <a className={route === 'dsa' || route === 'p' ? 'on' : ''} href="#/dsa">Learn DSA</a>
          <select className="worldsel" value={['dbms', 'sql', 'os', 'oops', 'cn', 'coa', 'sysdesign', 'se', 'dev'].includes(route) ? route : ''} onChange={e => { if (e.target.value) go(`/${e.target.value}`); }} aria-label="Jump to a world">
            <option value="">Jump to a world…</option><option value="dbms">Database World</option><option value="sql">SQL World</option><option value="os">Operating System World</option><option value="oops">OOPS World</option><option value="cn">Network World</option><option value="coa">Computer Architecture World</option><option value="sysdesign">System Design World</option><option value="se">Software Engineering World</option><option value="dev">Developer Tools World</option>
          </select>
          <a className={route === 'quest' ? 'on' : ''} href="#/quest">Quest</a>
          <a className={route === 'games' ? 'on' : ''} href="#/games">Games</a>
          <a className={route === 'interview' ? 'on' : ''} href="#/interview">Interview</a>
          <a className={route === 'playground' ? 'on' : ''} href="#/playground">Playground</a>
          <a className={route === 'profile' ? 'on' : ''} href="#/profile">Profile</a>
        </div>
        <span className="spacer" />
        <a className={route === 'account' ? 'on' : ''} href="#/account" data-testid="nav-account">{auth.status === 'authed' && auth.user ? `👤 ${auth.user.displayName}` : 'Sign in'}</a>
        <span className="hud" title="Daily streak">🔥 {s.streak.count}</span>
        <span className="hud lvl">Lv {lvl} · {rankOf(s.xp)}</span>
        <span className="hud xp" style={{ '--p': `${((s.xp % 150) / 150) * 100}%` } as CSSProperties} title={`${150 - (s.xp % 150)} XP to level ${lvl + 1}`}>{s.xp} XP</span>
        <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle light / dark theme">{theme === 'dark' ? '☀' : '☾'}</button>
        <button className="icon-btn menu-btn" onClick={() => setMenu(m => !m)} aria-label="Menu" aria-expanded={menu} aria-controls="main-links">{menu ? '✕' : '☰'}</button>
      </nav>
      <main>
        <Boundary resetKey={hash}>
          <Suspense fallback={<div className="page dim" role="status">Loading…</div>}>
            {!route && <Dashboard />}
            {route === 'worlds' && <Worlds />}
            {route === 'world' && <World k={arg} />}
            {route === 'dsa' && <Learn />}
            {route === 'p' && <ProblemPage id={arg} />}
            {route === 'playground' && <PlaygroundPage />}
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
            {route === 'games' && (arg ? <GamePage id={arg} /> : <GamesHub />)}
            {route === 'quest' && <QuestMap />}
            {route === 'account' && <Account />}
            {route === 'profile' && <Profile />}
            {route && !['worlds', 'world', 'dsa', 'p', 'playground', 'sql', 'os', 'dbms', 'cn', 'coa', 'oops', 'sysdesign', 'se', 'dev', 'interview', 'games', 'quest', 'account', 'profile'].includes(route) && <div className="page"><h1>Page not found</h1><p><a href="#/">Back to the dashboard</a></p></div>}
          </Suspense>
        </Boundary>
      </main>
    </>
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

function Profile() {
  const s = useStore();
  const auth = useAuth();
  const [resetError, setResetError] = useState<string | null>(null);
  const resetAll = async () => {
    if (!confirm(auth.status === 'authed' ? 'Erase progress in this browser AND in your account? This cannot be undone.' : 'Erase all progress stored in this browser?')) return;
    setResetError(null);
    if (auth.status === 'authed') {
      try { await api.deleteProgress(); } catch (e) { setResetError(e instanceof ApiError ? e.message : 'Could not reset your account progress.'); return; }
    }
    s.reset();
  };
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
      <p><button onClick={() => void resetAll()}>Reset progress</button></p>
      {resetError && <div className="err" role="alert">{resetError}</div>}
      <p className="dim small">{auth.status === 'authed'
        ? 'You are signed in: progress is saved to your account and merged across your devices. Reset erases it here and in your account.'
        : <>Progress is stored in this browser only (localStorage). <a href="#/account">Sign in</a> to save it to an account and use it across devices.</>}</p>
    </div>
  );
}
