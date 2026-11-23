import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const RANKS = ['Novice Programmer', 'Algorithm Explorer', 'Pointer Warrior', 'Recursion Master', 'Tree Guardian', 'Graph Architect', 'DP Champion', 'Algorithm Legend'];
export const levelOf = (xp: number) => Math.floor(xp / 150) + 1;
export const rankOf = (xp: number) => RANKS[Math.min(RANKS.length - 1, Math.floor((levelOf(xp) - 1) / 2))];
const today = () => new Date().toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

interface Activity { t: number; text: string }
interface State {
  xp: number; solved: Record<string, { at: number; attempts: number; hints: number }>;
  attempts: Record<string, number>; drafts: Record<string, string>;
  predictions: { correct: number; total: number };
  streak: { last: string; count: number }; seconds: number; last: string | null; log: Activity[];
  qaDone: Record<string, boolean>;
  markQa(id: string, ok: boolean): boolean;
  games: Record<string, { stars: number; best: number; plays: number }>;
  finishGame(key: string, stars: number, score: number, title: string): number;
  addXp(n: number, text: string): void;
  touchStreak(): void;
  recordAttempt(id: string): void;
  markSolved(id: string, xp: number, hints: number, title: string): boolean;
  recordPrediction(ok: boolean): void;
  saveDraft(id: string, code: string): void;
  addSeconds(n: number): void;
  setLast(id: string): void;
  reset(): void;
}
const init = { qaDone: {} as Record<string, boolean>, games: {} as Record<string, { stars: number; best: number; plays: number }>, xp: 0, solved: {}, attempts: {}, drafts: {}, predictions: { correct: 0, total: 0 }, streak: { last: '', count: 0 }, seconds: 0, last: null, log: [] as Activity[] };

export const useStore = create<State>()(persist((set, get) => ({
  ...init,
  finishGame: (key, stars, score, title) => {
    const prev = get().games[key] ?? { stars: 0, best: 0, plays: 0 };
    const gained = 8 * Math.max(0, stars - prev.stars);        // replays never farm XP: only a better star rating pays
    set(s => ({ games: { ...s.games, [key]: { stars: Math.max(prev.stars, stars), best: Math.max(prev.best, score), plays: prev.plays + 1 } } }));
    if (gained > 0) get().addXp(gained, `Game: ${title} (${'★'.repeat(stars)})`);
    get().touchStreak();
    return gained;
  },
  markQa: (id, ok) => { if (!ok || get().qaDone[id]) return false; set(s => ({ qaDone: { ...s.qaDone, [id]: true } })); get().addXp(10, 'Interview question answered'); get().touchStreak(); return true; },
  addXp: (n, text) => set(s => ({ xp: s.xp + n, log: [{ t: Date.now(), text: `+${n} XP · ${text}` }, ...s.log].slice(0, 30) })),
  touchStreak: () => set(s => {
    const t = today(); if (s.streak.last === t) return s;
    return { streak: { last: t, count: s.streak.last && dayDiff(s.streak.last, t) === 1 ? s.streak.count + 1 : 1 } };
  }),
  recordAttempt: id => set(s => ({ attempts: { ...s.attempts, [id]: (s.attempts[id] ?? 0) + 1 } })),
  markSolved: (id, xp, hints, title) => {
    if (get().solved[id]) return false;
    set(s => ({ solved: { ...s.solved, [id]: { at: Date.now(), attempts: s.attempts[id] ?? 1, hints } } }));
    get().addXp(xp, `Solved “${title}”`); get().touchStreak(); return true;
  },
  recordPrediction: ok => set(s => ({ predictions: { correct: s.predictions.correct + (ok ? 1 : 0), total: s.predictions.total + 1 } })),
  saveDraft: (id, code) => set(s => ({ drafts: { ...s.drafts, [id]: code } })),
  addSeconds: n => set(s => ({ seconds: s.seconds + n })),
  setLast: id => set({ last: id }),
  reset: () => set({ ...init }),
}), { name: 'cs-quest-v1' }));
