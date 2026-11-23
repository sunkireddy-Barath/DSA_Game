import { useEffect, useMemo, useRef, useState } from 'react';
import { GAMES, GameId, GameShell, Stars3, gameKey } from './GameShell';
import { useStore } from '../../store';
import { Level, rng, Stars } from '../../games/rng';
import * as bs from '../../games/bsHunt';
import * as sg from '../../games/stackGame';
import * as pg from '../../games/pageGame';
import * as sn from '../../games/subnetGame';
import * as bo from '../../games/bigO';
import * as tm from '../../games/termMatch';

type P = { level: Level; seed: number; finish: (stars: Stars, score: number, summary: string) => void };

/* ------------------------------------------------------------------ Binary Search Hunter */
function BsHunter({ level, seed, finish }: P) {
  const rd = useMemo(() => bs.makeRound(seed, level), [seed, level]);
  const [s, setS] = useState(() => bs.initial(rd));
  const [hint, setHint] = useState<number | null>(null);
  const opt = bs.optimalProbes(rd.values.length);
  const last = s.probes[s.probes.length - 1];
  useEffect(() => { if (s.found) { const t = setTimeout(() => finish(bs.stars(rd, s), Math.round((100 * opt) / s.probes.length), `You found ${rd.target} in ${s.probes.length} probe${s.probes.length === 1 ? '' : 's'}. The best possible for ${rd.values.length} numbers is ${opt}: always probe the middle of what is left and the range halves every time.`), 900); return () => clearTimeout(t); } }, [s.found]); // eslint-disable-line
  return (
    <div>
      <div className="game-target">Find <b data-testid="bs-target">{rd.target}</b> <span className="dim">in a sorted list of {rd.values.length} numbers</span></div>
      <div className="game-stats"><span>Probes <b data-testid="bs-probes">{s.probes.length}</b></span><span>Best possible <b>{opt}</b></span><button onClick={() => setHint(bs.hintIndex(s))} disabled={s.found}>💡 Hint</button></div>
      <div className="bs-grid" role="group" aria-label="Sorted numbers">
        {rd.values.map((v, i) => {
          const p = s.probes.find(x => x.idx === i);
          const out = i < s.lo || i > s.hi;
          return <button key={i} data-testid={`bs-cell-${i}`} className={`bs-cell ${out ? 'out' : ''} ${p ? `probed ${p.result}` : ''} ${hint === i && !p ? 'hint' : ''}`} disabled={s.found || !!p} onClick={() => { setS(bs.probe(rd, s, i)); setHint(null); }}>{v}<small>{i}</small></button>;
        })}
      </div>
      <div className="howto"><span aria-hidden="true">ⓘ</span> Each box is a number (its position is underneath). Click one to probe it: you learn whether the target is <b>to the right</b> (probe too small) or <b>to the left</b> (probe too big). Faded boxes are already ruled out. Still possible: positions <b>{s.lo}</b> to <b>{s.hi}</b> ({Math.max(0, s.hi - s.lo + 1)} left).</div>
      {last && <div className={`game-msg ${last.result === 'found' ? 'ok' : last.wasted ? 'bad' : ''}`} data-testid="bs-msg">{bs.explain(rd, last)}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Bracket Balancer */
function BracketGame({ level, seed, finish }: P) {
  const rd = useMemo(() => sg.makeRound(seed, level), [seed, level]);
  const [n, setN] = useState(0);
  const [st, setSt] = useState(() => sg.start(rd.strings[0]));
  const [total, setTotal] = useState(0);
  const act = (a: sg.Action) => { const next = sg.apply(st, a); setSt(next); };
  const nextString = () => {
    const mistakes = total + st.mistakes;
    if (n + 1 >= rd.strings.length) finish(sg.stars(mistakes), Math.max(0, 100 - 15 * mistakes), `${rd.strings.length} strings checked with ${mistakes} mistake${mistakes === 1 ? '' : 's'}. A stack always matches each closer with the most recent unclosed opener: that is exactly how compilers check brackets.`);
    else { setTotal(mistakes); setN(n + 1); setSt(sg.start(rd.strings[n + 1])); }
  };
  return (
    <div>
      <div className="game-stats"><span>String <b>{n + 1}/{rd.strings.length}</b></span><span>Mistakes <b data-testid="sg-mistakes">{total + st.mistakes}</b></span></div>
      <div className="tape" aria-label="Brackets">{[...st.s].map((c, i) => <span key={i} className={`tape-c ${i < st.i ? 'done' : i === st.i ? 'cur' : ''}`}>{c}</span>)}{st.s.length === 0 && <span className="dim">(empty string)</span>}</div>
      <div className="stack-demo"><div className="stack-label">Your stack (top is highest)</div><div className="stack-col" data-testid="sg-stack">{[...st.stack].reverse().map((c, i) => <span key={i} className={`stack-item ${i === 0 ? 'top' : ''}`}>{c}</span>)}{st.stack.length === 0 && <span className="dim">empty</span>}</div></div>
      <div className="howto"><span aria-hidden="true">ⓘ</span> The highlighted character is the one you are reading. <b>Push</b> an opener, <b>Pop</b> when a closer matches the top of the stack, say <b>Invalid</b> when it cannot match, and <b>Valid</b> only after the last character with an empty stack.</div>
      {!st.over ? (
        <div className="game-actions">
          <button onClick={() => act('push')} data-testid="sg-push">⬇ Push</button><button onClick={() => act('pop')} data-testid="sg-pop">⬆ Pop (matches top)</button>
          <button onClick={() => act('reject')} data-testid="sg-reject">✗ Invalid</button><button onClick={() => act('accept')} data-testid="sg-accept">✓ Valid (end)</button>
        </div>
      ) : <div className="game-actions"><button className="primary" onClick={nextString} data-testid="sg-next">{n + 1 >= rd.strings.length ? 'Finish' : 'Next string →'}</button></div>}
      <div className={`game-msg ${st.over ? (st.valid ? 'ok' : 'bad') : st.message.startsWith('Not quite') ? 'bad' : ''}`} data-testid="sg-msg">{st.over ? `${st.valid ? '✓ Valid. ' : '✗ Invalid. '}${st.message}` : st.message}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ Page Fault Predictor */
function PageGame({ level, seed, finish }: P) {
  const rd = useMemo(() => pg.makeRound(seed, level), [seed, level]);
  const [k, setK] = useState(0);
  const [guess, setGuess] = useState<'hit' | 'fault' | null>(null);
  const [correct, setCorrect] = useState(0);
  const before = k === 0 ? Array(rd.frames).fill(null) : rd.steps[k - 1].frames;
  const step = rd.steps[k];
  const answer = (g: 'hit' | 'fault') => { setGuess(g); if (g === pg.truth(rd, k)) setCorrect(c => c + 1); };
  const next = () => {
    if (k + 1 >= rd.refs.length) { const c = correct; finish(pg.stars(c, rd.refs.length), c * 10, `You predicted ${c} of ${rd.refs.length} correctly (${rd.faults} faults in total with ${rd.algo}). ${pg.ALGO_RULE[rd.algo]}`); }
    else { setK(k + 1); setGuess(null); }
  };
  const frames = guess ? step.frames : before;
  return (
    <div>
      <div className="game-stats"><span>Algorithm <b>{rd.algo}</b></span><span>Frames <b>{rd.frames}</b></span><span>Correct <b data-testid="pg-correct">{correct}</b>/{k + (guess ? 1 : 0)}</span></div>
      <div className="refs">{rd.refs.map((r, i) => <span key={i} className={`ref ${i === k ? 'cur' : ''} ${i < k || (i === k && guess) ? (rd.steps[i].fault ? 'fault' : 'hit') : ''}`}>{r}</span>)}</div>
      <div className="game-target">Next page: <b data-testid="pg-page">{step.ref}</b></div>
      <div className="frames" aria-label="Memory frames">{frames.map((f: number | null, i: number) => <span key={i} className={`frame ${guess && i === step.slot ? (step.fault ? 'fault' : 'hit') : ''}`}>{f ?? '·'}</span>)}</div>
      <div className="howto"><span aria-hidden="true">ⓘ</span> The boxes are the memory frames right now. If page <b>{step.ref}</b> is already in one of them it is a <b>hit</b>; if not it is a <b>page fault</b> and the page must be loaded (replacing another page when all frames are full). {pg.ALGO_RULE[rd.algo]}</div>
      {!guess ? <div className="game-actions"><button onClick={() => answer('hit')} data-testid="pg-hit">✓ Hit</button><button onClick={() => answer('fault')} data-testid="pg-fault">✗ Page fault</button></div>
        : <><div className={`game-msg ${guess === pg.truth(rd, k) ? 'ok' : 'bad'}`} data-testid="pg-msg">{guess === pg.truth(rd, k) ? '✓ Correct. ' : `✗ It was a ${pg.truth(rd, k)}. `}{step.why}</div>
          <div className="game-actions"><button className="primary" onClick={next} data-testid="pg-next">{k + 1 >= rd.refs.length ? 'Finish' : 'Next reference →'}</button></div></>}
    </div>
  );
}

/* ------------------------------------------------------------------ Subnet Sniper */
function SubnetGame({ level, seed, finish }: P) {
  const rd = useMemo(() => sn.makeRound(seed, level), [seed, level]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [ok, setOk] = useState(0);
  const q = rd.questions[i];
  const choose = (n: number) => { if (pick !== null) return; setPick(n); if (n === q.correct) setOk(o => o + 1); };
  const next = () => { if (i + 1 >= rd.questions.length) finish(sn.stars(ok, rd.questions.length), ok * 12, `${ok} of ${rd.questions.length} correct. The trick: the prefix length says how many bits are the network; set the rest to 0 for the network address and to 1 for the broadcast address.`); else { setI(i + 1); setPick(null); } };
  return (
    <div>
      <div className="game-stats"><span>Question <b>{i + 1}/{rd.questions.length}</b></span><span>Correct <b data-testid="sn-correct">{ok}</b></span></div>
      <h3 className="game-q" data-testid="sn-q">{q.prompt}</h3>
      <div className="opt-grid">{q.options.map((o, n) => <button key={o} data-testid={`sn-opt-${n}`} className={`opt-big ${pick !== null ? (n === q.correct ? 'right' : n === pick ? 'wrong' : '') : ''}`} disabled={pick !== null} onClick={() => choose(n)}>{o}</button>)}</div>
      {pick !== null && <><div className={`game-msg ${pick === q.correct ? 'ok' : 'bad'}`} data-testid="sn-msg">{pick === q.correct ? '✓ Correct. ' : '✗ Not quite. '}{q.explain}</div><div className="game-actions"><button className="primary" onClick={next} data-testid="sn-next">{i + 1 >= rd.questions.length ? 'Finish' : 'Next →'}</button></div></>}
    </div>
  );
}

/* ------------------------------------------------------------------ Big-O Match */
function BigOGame({ level, seed, finish }: P) {
  const round = useMemo(() => bo.makeRound(rng(seed), level), [seed, level]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<bo.Big | null>(null);
  const [ok, setOk] = useState(0);
  const sn = round[i];
  const measured = useMemo(() => (pick ? bo.measureAll(sn) : null), [pick, sn]);   // real interpreter runs, only after answering
  const max = measured ? Math.max(...measured.map(m => m.steps)) : 1;
  const choose = (c: bo.Big) => { if (pick) return; setPick(c); if (c === sn.label) setOk(o => o + 1); };
  const next = () => { if (i + 1 >= round.length) finish(bo.stars(ok, round.length), ok * 12, `${ok} of ${round.length} correct. Count how the work grows when n grows: that, not the code length, decides the complexity.`); else { setI(i + 1); setPick(null); } };
  return (
    <div>
      <div className="game-stats"><span>Snippet <b>{i + 1}/{round.length}</b></span><span>Correct <b data-testid="bo-correct">{ok}</b></span></div>
      <pre className="game-code" data-testid="bo-code">{sn.code}</pre>
      <h3 className="game-q">How does the running time grow with <code>n</code>?</h3>
      <div className="opt-grid cols4">{bo.CHOICES.map(c => <button key={c} data-testid={`bo-${c}`} className={`opt-big ${pick ? (c === sn.label ? 'right' : c === pick ? 'wrong' : '') : ''}`} disabled={!!pick} onClick={() => choose(c)}>{c}</button>)}</div>
      {pick && measured && <>
        <div className={`game-msg ${pick === sn.label ? 'ok' : 'bad'}`} data-testid="bo-msg">{pick === sn.label ? '✓ Correct: ' : `✗ It is ${sn.label}: `}{sn.why}</div>
        <div className="measure" aria-label="Measured statement counts"><div className="viz-label">Measured by running the code for growing n</div>
          {measured.map(m => <div key={m.n} className="mrow"><span className="mono">n = {m.n}</span><span className="mbar"><i style={{ width: `${Math.max(2, (m.steps / max) * 100)}%` }} /></span><span className="mono">{m.steps} steps</span></div>)}</div>
        <div className="game-actions"><button className="primary" onClick={next} data-testid="bo-next">{i + 1 >= round.length ? 'Finish' : 'Next →'}</button></div></>}
    </div>
  );
}

/* ------------------------------------------------------------------ Term Match */
function TermMatch({ level, seed, finish }: P) {
  const [d, setD] = useState(() => tm.makeDeck(seed, level));
  useEffect(() => { setD(tm.makeDeck(seed, level)); }, [seed, level]);
  const lock = useRef(false);
  useEffect(() => {
    if (d.flipped.length === 2 && !lock.current) { lock.current = true; const t = setTimeout(() => { setD(x => tm.resolve(x)); lock.current = false; }, tm.isMatch(d) ? 450 : 1100); return () => { clearTimeout(t); lock.current = false; }; }
  }, [d.flipped.length]); // eslint-disable-line
  useEffect(() => { if (tm.done(d)) { const t = setTimeout(() => finish(tm.stars(d.moves, d.pairs), Math.max(0, 100 - (d.moves - d.pairs) * 5), `All ${d.pairs} pairs matched in ${d.moves} moves (the minimum is ${d.pairs}). Repeating a term with its meaning is how it sticks.`), 600); return () => clearTimeout(t); } }, [d.matched.size]); // eslint-disable-line
  return (
    <div>
      <div className="game-stats"><span>Moves <b data-testid="tm-moves">{d.moves}</b></span><span>Pairs <b>{d.matched.size}/{d.pairs}</b></span></div>
      <div className="howto"><span aria-hidden="true">ⓘ</span> Flip two cards. A <b>term</b> card (bold) matches the <b>definition</b> card that explains it. Matched pairs stay open. Fewer moves earn more stars.</div>
      <div className="tm-grid">{d.cards.map(c => {
        const up = d.flipped.includes(c.id) || d.matched.has(c.pair);
        return <button key={c.id} data-testid={`tm-card-${c.id}`} data-pair={c.pair} data-kind={c.kind} className={`tm-card ${up ? 'up' : ''} ${d.matched.has(c.pair) ? 'matched' : ''} kind-${c.kind}`} onClick={() => setD(tm.flip(d, c.id))} aria-label={up ? `${c.kind}: ${c.text}` : 'face-down card'}>{up ? c.text : '?'}</button>;
      })}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ rules + hub */
const RULES: Record<GameId, { rules: string[]; View: (p: P) => JSX.Element }> = {
  bs: { View: BsHunter, rules: ['A sorted list hides one target number. Click a box to probe it.', 'A probe tells you if the target is to the left or the right, and everything on the wrong side is ruled out.', 'Find it in as few probes as possible: probing the middle each time guarantees the best score.', '3 stars: no more probes than the optimum.'] },
  sg: { View: BracketGame, rules: ['Three bracket strings. You act as the stack while reading each one left to right.', 'Push an opener, Pop when a closer matches the top, say Invalid when the string cannot be balanced, Valid when it ends with an empty stack.', 'Every wrong move is a mistake and the game explains why.', '3 stars: no mistakes.'] },
  pg: { View: PageGame, rules: ['A reference string asks for pages one at a time. Memory has a few frames.', 'Before each reference, predict: is the page already in memory (hit) or not (page fault)?', 'After you answer the frames update using FIFO or LRU, so you can follow the algorithm.', '3 stars: every prediction right.'] },
  sn: { View: SubnetGame, rules: ['Eight IPv4 subnet questions with four choices each.', 'Use the prefix length: network bits stay, host bits are 0 (network) or 1 (broadcast); usable hosts = 2^host-bits − 2.', 'Every answer comes with the working.', '3 stars: all correct.'] },
  bo: { View: BigOGame, rules: ['Eight short C++ functions. Pick the complexity that describes how the running time grows with n.', 'After you answer, the code is actually run for growing n and the measured statement counts are shown.', 'Look at how the count changes when n grows, not at how long the code looks.', '3 stars: all correct.'] },
  tm: { View: TermMatch, rules: ['Cards are face down: some hold interview terms, the others hold their definitions.', 'Flip two cards: if a term meets its own definition they stay open.', 'Match all pairs in as few moves as you can.', '3 stars: close to the minimum number of moves.'] },
};

export function GamePage({ id }: { id: string }) {
  const g = RULES[id as GameId];
  if (!g) return <div className="page">Unknown game. <a href="#/games">Back to the games</a></div>;
  return <GameShell key={id} id={id as GameId} rules={g.rules}>{p => <g.View {...p} />}</GameShell>;   // keyed: switching games must never reuse the previous game's level
}

export function GamesHub() {
  const games = useStore(s => s.games);
  const total = Object.values(games).reduce((n, g) => n + g.stars, 0);
  return (
    <div className="page">
      <section className="hero games-hero">
        <div><h1>Games</h1><p className="lead">Short, fun rounds that teach the ideas behind the interview questions. Beat your best star rating to earn XP.</p>
          <div className="hero-cta"><span className="pill ok" data-testid="games-stars">★ {total} / {GAMES.length * 9} stars</span></div></div>
      </section>
      <div className="subjects">{GAMES.map(g => {
        const best = Math.max(0, ...[1, 2, 3].map(l => games[gameKey(g.id, l as Level)]?.stars ?? 0));
        return (
          <a key={g.id} href={`#/games/${g.id}`} className="card subj game-card" style={{ '--w': g.color } as React.CSSProperties} data-testid={`game-${g.id}`}>
            <div className="row"><span style={{ display: 'flex', alignItems: 'center' }}><span className="world-ico" aria-hidden="true">{g.icon}</span><b>{g.title}</b></span><Stars3 n={best} /></div>
            <div className="dim">{g.topic}</div><p>{g.blurb}</p><div className="dim small">3 levels · about 2 minutes</div>
          </a>);
      })}</div>
    </div>
  );
}
