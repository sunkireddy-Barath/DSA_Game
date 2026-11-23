import { ReactNode, useEffect, useState } from 'react';
import { useStore } from '../../store';
import { LEVEL_NAME, Level, Stars } from '../../games/rng';

export const GAMES = [
  { id: 'bs', title: 'Binary Search Hunter', topic: 'Algorithms', icon: '🎯', color: '#7c8cff', blurb: 'Find the hidden number in as few probes as possible. Learn why halving wins.' },
  { id: 'sg', title: 'Bracket Balancer', topic: 'Stacks', icon: '🥞', color: '#f472b6', blurb: 'Be the stack: push, pop or reject each bracket to validate the string.' },
  { id: 'pg', title: 'Page Fault Predictor', topic: 'Operating systems', icon: '🧠', color: '#34d399', blurb: 'Predict hit or fault as FIFO and LRU manage memory frames.' },
  { id: 'sn', title: 'Subnet Sniper', topic: 'Networks', icon: '🌐', color: '#38bdf8', blurb: 'Hosts, network and broadcast addresses: calculate subnets like a network engineer.' },
  { id: 'bo', title: 'Big-O Match', topic: 'Complexity', icon: '📈', color: '#fbbf24', blurb: 'Match code to its complexity, then see the real measured step counts.' },
  { id: 'tm', title: 'Term Match', topic: 'All subjects', icon: '🃏', color: '#a78bfa', blurb: 'A memory game: pair each interview term with its definition.' },
] as const;
export type GameId = (typeof GAMES)[number]['id'];
export const gameKey = (id: GameId, level: Level) => `${id}:${level}`;

export const Stars3 = ({ n, big }: { n: number; big?: boolean }) => (
  <span className={`stars ${big ? 'big' : ''}`} aria-label={`${n} of 3 stars`} role="img">{[1, 2, 3].map(i => <span key={i} className={i <= n ? 'on' : ''}>★</span>)}</span>
);

/** Level picker + rules + result screen around a game. The game itself is rendered by `children(level, seed, finish)`. */
export function GameShell({ id, rules, children }: { id: GameId; rules: string[]; children: (p: { level: Level; seed: number; finish: (stars: Stars, score: number, summary: string) => void }) => ReactNode }) {
  const meta = GAMES.find(g => g.id === id)!;
  const games = useStore(s => s.games);
  const finishGame = useStore(s => s.finishGame);
  const [level, setLevel] = useState<Level | null>(null);
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState<{ stars: Stars; score: number; summary: string; xp: number } | null>(null);

  const start = (l: Level) => { setLevel(l); setSeed(Math.floor(Math.random() * 2 ** 31)); setResult(null); };
  const finish = (stars: Stars, score: number, summary: string) => {
    if (!level) return;
    const xp = finishGame(gameKey(id, level), stars, score, meta.title);
    setResult({ stars, score, summary, xp });
  };
  useEffect(() => { window.scrollTo({ top: 0 }); }, [level, result]);

  if (!level) return (
    <div className="page game-page" style={{ '--g': meta.color } as React.CSSProperties}>
      <a href="#/games">← All games</a>
      <header className="game-head"><span className="game-ico">{meta.icon}</span><div><h1>{meta.title}</h1><p className="dim">{meta.topic} · {meta.blurb}</p></div></header>
      <section className="card"><h3>How to play</h3><ol className="rules">{rules.map(r => <li key={r}>{r}</li>)}</ol></section>
      <h3>Choose a level</h3>
      <div className="level-row">{([1, 2, 3] as Level[]).map(l => {
        const g = games[gameKey(id, l)];
        return <button key={l} className="level-card" onClick={() => start(l)} data-testid={`level-${l}`}>
          <b>{LEVEL_NAME[l]}</b><Stars3 n={g?.stars ?? 0} /><span className="dim small">{g ? `${g.plays} play${g.plays === 1 ? '' : 's'}` : 'not played yet'}</span></button>;
      })}</div>
    </div>
  );

  if (result) return (
    <div className="page game-page" style={{ '--g': meta.color } as React.CSSProperties}>
      <section className={`card result ${result.stars === 3 ? 'perfect' : ''}`} data-testid="game-result">
        {result.stars === 3 && <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>}
        <h2>{result.stars === 3 ? 'Perfect!' : result.stars >= 2 ? 'Well played!' : result.stars === 1 ? 'Finished' : 'Keep practising'}</h2>
        <Stars3 n={result.stars} big />
        <p className="lead">{result.summary}</p>
        <p className="xp-gain">{result.xp > 0 ? `+${result.xp} XP for a better rating` : 'No new XP: beat your best rating to earn more.'}</p>
        <div className="hero-cta"><button className="primary" onClick={() => start(level)}>Play again</button><button onClick={() => { setLevel(null); setResult(null); }}>Change level</button><a className="button" href="#/games">All games</a></div>
      </section>
    </div>
  );

  return (
    <div className="page game-page" style={{ '--g': meta.color } as React.CSSProperties}>
      <div className="game-bar"><a href="#/games">← Games</a><b>{meta.icon} {meta.title}</b><span className="pill">{LEVEL_NAME[level]}</span></div>
      {children({ level, seed, finish })}
    </div>
  );
}
