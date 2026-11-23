import { useMemo } from 'react';
import { ALL_PROBLEMS } from '../data/sheet';
import { PLAYABLE_TITLES } from '../data/playableIndex';
import { levelOf, rankOf, useStore } from '../store';
import { BADGES, buildMap, dailyQuest } from '../quest/quest';
import { GAMES, Stars3 } from './games/GameShell';

const playableIds = ALL_PROBLEMS.filter(p => PLAYABLE_TITLES.has(p.title)).map(p => p.id);

export function QuestMap() {
  const s = useStore();
  const map = useMemo(() => buildMap(s, t => PLAYABLE_TITLES.has(t)), [s.solved]); // eslint-disable-line
  const earned = BADGES.filter(b => b.earned(s));
  const daily = dailyQuest(playableIds, Math.floor(Date.now() / 86400000));
  const dailyDone = daily ? !!s.solved[daily] : false;
  const current = map.findIndex(c => !c.cleared);
  const hp = s.xp % 150;
  return (
    <div className="page quest">
      <header className="quest-hero">
        <div className="avatar" aria-hidden="true">🧙</div>
        <div className="quest-id">
          <h1>Quest Map</h1>
          <div className="dim">Level {levelOf(s.xp)} · {rankOf(s.xp)} · 🔥 {s.streak.count}-day streak</div>
          <div className="bar" aria-label={`${150 - hp} XP to next level`}><div style={{ width: `${(hp / 150) * 100}%` }} /></div>
        </div>
        {daily && <a className={`daily card ${dailyDone ? 'done' : ''}`} href={`#/p/${daily}`}><b>{dailyDone ? '✅ Daily quest done' : '⚡ Daily quest'}</b><span className="dim small">Same problem for everyone today</span></a>}
      </header>

      <section aria-label="Badges"><h3>Badges {earned.length}/{BADGES.length}</h3>
        <div className="badges">{BADGES.map(b => { const ok = b.earned(s); return <span key={b.id} className={`badge ${ok ? 'on' : ''}`} title={`${b.name}: ${b.desc}`}><i>{ok ? b.icon : '🔒'}</i><small>{b.name}</small></span>; })}</div>
      </section>

      <div className="chapters">
        {map.map((c, ci) => {
          const boss = GAMES[ci % GAMES.length];
          const bossStars = Math.max(0, ...[1, 2, 3].map(l => s.games[`${boss.id}:${l}`]?.stars ?? 0));
          return (
            <section key={c.step.n} className={`chapter card ${c.unlocked ? '' : 'locked'} ${ci === current ? 'current' : ''}`}>
              <div className="row"><b>{c.unlocked ? '🗺️' : '🔒'} {c.step.name}</b><span className="pill">{c.stars}/{c.maxStars} ★</span></div>
              <div className="path">
                {c.nodes.map(n => (
                  <a key={n.index} className={`qnode ${n.state}`} data-testid="qnode" aria-disabled={n.state === 'locked'}
                    href={n.state === 'locked' || !n.firstOpen ? undefined : `#/p/${n.firstOpen}`} title={n.state === 'locked' ? 'Earn a star on the previous node to unlock' : `${n.done}/${n.total} solved`}>
                    <span className="qdot">{n.state === 'locked' ? '🔒' : n.state === 'cleared' && n.stars === 3 ? '🏆' : n.index + 1}</span>
                    <span className="qname">{n.topic.name}</span>
                    {n.state !== 'locked' && <><Stars3 n={n.stars} /><small className="dim">{n.done}/{n.total}</small></>}
                  </a>))}
                <a className={`qnode boss ${c.bossUnlocked ? 'open' : 'locked'}`} href={c.bossUnlocked ? `#/games/${boss.id}` : undefined} aria-disabled={!c.bossUnlocked} data-testid="qboss">
                  <span className="qdot">{c.bossUnlocked ? boss.icon : '🔒'}</span><span className="qname">Boss: {boss.title}</span>{c.bossUnlocked && <Stars3 n={bossStars} />}
                </a>
              </div>
            </section>);
        })}
      </div>
    </div>
  );
}
