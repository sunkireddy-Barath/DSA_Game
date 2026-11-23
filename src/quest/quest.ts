// Campaign layer: turns the A2Z sheet into a quest map. Pure functions over the persisted store state, so they are unit-tested.
import { SHEET, SheetStep, SheetTopic } from '../data/sheet';

export interface Progress { solved: Record<string, unknown>; games: Record<string, { stars: number }>; qaDone: Record<string, boolean>; streak: { count: number }; xp: number }
export type NodeState = 'locked' | 'open' | 'cleared';
export interface QuestNode { step: number; index: number; topic: SheetTopic; total: number; done: number; stars: 0 | 1 | 2 | 3; state: NodeState; firstOpen: string | null }
export interface Chapter { step: SheetStep; nodes: QuestNode[]; stars: number; maxStars: number; bossUnlocked: boolean; cleared: boolean; unlocked: boolean }

/** Stars for a node: 1 = first solve, 2 = half the topic, 3 = whole topic. */
export const starsFor = (done: number, total: number): 0 | 1 | 2 | 3 =>
  total === 0 || done === 0 ? 0 : done >= total ? 3 : done * 2 >= total ? 2 : 1;

export function buildMap(p: Progress, playable: (title: string) => boolean = () => true, sheet: SheetStep[] = SHEET): Chapter[] {
  let prevCleared = true;
  return sheet.map(step => {
    const unlocked = prevCleared;
    let prevOpen = unlocked;
    const nodes: QuestNode[] = step.topics.map((topic, index) => {
      const ps = topic.problems.filter(x => playable(x.title));
      const done = ps.filter(x => p.solved[x.id]).length;
      const stars = starsFor(done, ps.length);
      const state: NodeState = stars > 0 ? 'cleared' : prevOpen ? 'open' : 'locked';
      // the next node unlocks as soon as this one has at least one star
      prevOpen = stars > 0;
      return { step: step.n, index, topic, total: ps.length, done, stars, state, firstOpen: (ps.find(x => !p.solved[x.id]) ?? ps[0])?.id ?? null };
    });
    const stars = nodes.reduce((a, n) => a + n.stars, 0);
    const cleared = nodes.length > 0 && nodes.every(n => n.stars > 0);
    prevCleared = cleared;
    return { step, nodes, stars, maxStars: nodes.length * 3, bossUnlocked: cleared, cleared, unlocked };
  });
}

export interface Badge { id: string; icon: string; name: string; desc: string; earned: (p: Progress) => boolean }
const gameStars = (p: Progress) => Object.values(p.games).reduce((a, g) => a + g.stars, 0);
export const BADGES: Badge[] = [
  { id: 'first', icon: '🌱', name: 'First Blood', desc: 'Solve your first problem', earned: p => Object.keys(p.solved).length >= 1 },
  { id: 'ten', icon: '🔟', name: 'Double Digits', desc: 'Solve 10 problems', earned: p => Object.keys(p.solved).length >= 10 },
  { id: 'fifty', icon: '⚔️', name: 'Veteran', desc: 'Solve 50 problems', earned: p => Object.keys(p.solved).length >= 50 },
  { id: 'hundred', icon: '👑', name: 'Centurion', desc: 'Solve 100 problems', earned: p => Object.keys(p.solved).length >= 100 },
  { id: 'streak3', icon: '🔥', name: 'On Fire', desc: '3-day streak', earned: p => p.streak.count >= 3 },
  { id: 'streak7', icon: '☄️', name: 'Unstoppable', desc: '7-day streak', earned: p => p.streak.count >= 7 },
  { id: 'gamer', icon: '🎮', name: 'Player One', desc: 'Earn a star in any mini-game', earned: p => gameStars(p) >= 1 },
  { id: 'stars10', icon: '⭐', name: 'Star Collector', desc: 'Earn 10 mini-game stars', earned: p => gameStars(p) >= 10 },
  { id: 'qa', icon: '🎤', name: 'Interview Ready', desc: 'Answer 10 interview questions', earned: p => Object.keys(p.qaDone).length >= 10 },
  { id: 'xp1k', icon: '💎', name: 'Four Digits', desc: 'Reach 1,000 XP', earned: p => p.xp >= 1000 },
];

/** Deterministic daily quest: same for everyone on a given UTC day. */
export function dailyQuest(ids: string[], day: number): string | null { return ids.length ? ids[((day % ids.length) + ids.length) % ids.length] : null; }
