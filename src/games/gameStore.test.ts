import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';
import { mergeProgress, Progress } from '../progressMerge';

describe('game progress and XP', () => {
  beforeEach(() => useStore.getState().reset());

  it('pays 8 XP per NEW star only, so replaying can never farm XP', () => {
    const { finishGame } = useStore.getState();
    expect(finishGame('bs:1', 2, 50, 'Binary Search Hunter')).toBe(16);
    expect(useStore.getState().xp).toBe(16);
    expect(finishGame('bs:1', 2, 60, 'Binary Search Hunter')).toBe(0);       // same rating: nothing
    expect(finishGame('bs:1', 1, 90, 'Binary Search Hunter')).toBe(0);       // worse rating: nothing, best stars kept
    expect(finishGame('bs:1', 3, 40, 'Binary Search Hunter')).toBe(8);       // one more star
    const g = useStore.getState().games['bs:1'];
    expect(g).toEqual({ stars: 3, best: 90, plays: 4 });
    expect(useStore.getState().xp).toBe(24);
    expect(useStore.getState().log[0].text).toContain('Binary Search Hunter');
  });

  it('every level of every game is tracked separately', () => {
    const { finishGame } = useStore.getState();
    finishGame('bs:1', 3, 1, 't'); finishGame('bs:2', 1, 1, 't');
    expect(useStore.getState().xp).toBe(24 + 8);
    expect(Object.keys(useStore.getState().games).sort()).toEqual(['bs:1', 'bs:2']);
  });

  it('a zero-star run is recorded as a play but earns nothing', () => {
    expect(useStore.getState().finishGame('pg:1', 0, 0, 't')).toBe(0);
    expect(useStore.getState().games['pg:1']).toEqual({ stars: 0, best: 0, plays: 1 });
  });

  it('game stats merge by maximum, like the server does', () => {
    const base = (games: Progress['games']): Progress => ({ xp: 0, solved: {}, attempts: {}, drafts: {}, qaDone: {}, games, predictions: { correct: 0, total: 0 }, streak: { last: '', count: 0 }, seconds: 0, last: null, log: [] });
    const m = mergeProgress(base({ 'bs:1': { stars: 2, best: 40, plays: 3 } }), base({ 'bs:1': { stars: 3, best: 10, plays: 1 }, 'sg:2': { stars: 1, best: 5, plays: 1 } }));
    expect(m.games).toEqual({ 'bs:1': { stars: 3, best: 40, plays: 3 }, 'sg:2': { stars: 1, best: 5, plays: 1 } });
  });
});
