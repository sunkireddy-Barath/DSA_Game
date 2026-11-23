// Progress only ever grows, so merging device state with server state is a union/max. Mirrors backend/app/routes_progress.py (merge()).
export interface Progress {
  xp: number;
  solved: Record<string, { at: number; attempts: number; hints: number }>;
  attempts: Record<string, number>;
  drafts: Record<string, string>;
  qaDone: Record<string, boolean>;
  games: Record<string, { stars: number; best: number; plays: number }>;
  predictions: { correct: number; total: number };
  streak: { last: string; count: number };
  seconds: number;
  last: string | null;
  log: { t: number; text: string }[];
}

export const SYNC_KEYS = ['xp', 'solved', 'attempts', 'drafts', 'qaDone', 'games', 'predictions', 'streak', 'seconds', 'last', 'log'] as const;
const MAX_DRAFTS = 200, MAX_DRAFT_CHARS = 20000;

export function mergeProgress(a: Progress, b: Progress): Progress {
  const solved = { ...a.solved };
  for (const [k, v] of Object.entries(b.solved)) if (!solved[k] || v.at < solved[k].at) solved[k] = v;
  const attempts = { ...a.attempts };
  for (const [k, n] of Object.entries(b.attempts)) attempts[k] = Math.max(attempts[k] ?? 0, n);
  const games = { ...a.games };
  for (const [k, g] of Object.entries(b.games ?? {})) { const o = games[k]; games[k] = o ? { stars: Math.max(o.stars, g.stars), best: Math.max(o.best, g.best), plays: Math.max(o.plays, g.plays) } : g; }
  const streak = `${b.streak.last}|${String(b.streak.count).padStart(6, '0')}` >= `${a.streak.last}|${String(a.streak.count).padStart(6, '0')}` ? b.streak : a.streak;
  const log = new Map<string, { t: number; text: string }>();
  for (const x of [...a.log, ...b.log]) log.set(`${x.t}|${x.text}`, x);
  return {
    xp: Math.max(a.xp, b.xp), solved, attempts, qaDone: { ...a.qaDone, ...b.qaDone }, games,
    drafts: { ...a.drafts, ...b.drafts },
    predictions: { correct: Math.max(a.predictions.correct, b.predictions.correct), total: Math.max(a.predictions.total, b.predictions.total) },
    streak, seconds: Math.max(a.seconds, b.seconds), last: b.last ?? a.last,
    log: [...log.values()].sort((x, y) => y.t - x.t).slice(0, 30),
  };
}

/** What may be sent to the server: drafts are trimmed to the server's limits so a huge draft cannot make the whole sync fail. */
export function toWire(p: Progress): Progress {
  const drafts = Object.fromEntries(Object.entries(p.drafts).filter(([k, v]) => k.length <= 80 && v.length <= MAX_DRAFT_CHARS).slice(-MAX_DRAFTS));
  return { ...p, drafts, log: p.log.slice(0, 30).map(x => ({ t: Math.max(0, Math.floor(x.t)), text: x.text.slice(0, 200) })) };
}

export function pick(state: Record<string, any>): Progress {
  return Object.fromEntries(SYNC_KEYS.map(k => [k, state[k]])) as unknown as Progress;
}
