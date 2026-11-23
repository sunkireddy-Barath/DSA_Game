import { describe, expect, it } from 'vitest';
import { BADGES, buildMap, dailyQuest, starsFor, Progress } from './quest';
import { parseSheet } from '../data/sheet';

const sheet = parseSheet(`# Step 1: A
## T1 [E]
a1
a2
## T2 [E]
b1
# Step 2: B
## T3 [M]
c1`);
const id = (t: string) => sheet.flatMap(s => s.topics.flatMap(x => x.problems)).find(p => p.title === t)!.id;
const prog = (solved: string[] = []): Progress => ({ solved: Object.fromEntries(solved.map(i => [i, 1])), games: {}, qaDone: {}, streak: { count: 0 }, xp: 0 });

describe('quest map', () => {
  it('star thresholds', () => { expect([starsFor(0, 4), starsFor(1, 4), starsFor(2, 4), starsFor(4, 4), starsFor(0, 0)]).toEqual([0, 1, 2, 3, 0]); });
  it('fresh player: only the first node is open, everything else locked', () => {
    const m = buildMap(prog(), () => true, sheet);
    expect(m[0].nodes.map(n => n.state)).toEqual(['open', 'locked']);
    expect(m[1].unlocked).toBe(false); expect(m[1].nodes[0].state).toBe('locked');
  });
  it('a star unlocks the next node; clearing a chapter unlocks the next chapter and its boss', () => {
    let m = buildMap(prog([id('a1')]), () => true, sheet);
    expect(m[0].nodes.map(n => [n.state, n.stars])).toEqual([['cleared', 2], ['open', 0]]);
    m = buildMap(prog([id('a1'), id('b1')]), () => true, sheet);
    expect(m[0].cleared && m[0].bossUnlocked).toBe(true); expect(m[1].unlocked).toBe(true); expect(m[1].nodes[0].state).toBe('open');
  });
  it('ignores non-playable problems', () => {
    const m = buildMap(prog([id('a1')]), t => t !== 'a2', sheet);
    expect(m[0].nodes[0].total).toBe(1); expect(m[0].nodes[0].stars).toBe(3);
  });
  it('next problem points at the first unsolved one', () => { expect(buildMap(prog([id('a1')]), () => true, sheet)[0].nodes[0].firstOpen).toBe(id('a2')); });
  it('real sheet builds', () => { const m = buildMap(prog()); expect(m.length).toBeGreaterThan(5); expect(m[0].unlocked).toBe(true); });
});
describe('badges and daily', () => {
  it('badges are earned from progress', () => {
    const p: Progress = { ...prog(['x']), streak: { count: 3 }, xp: 1000, games: { 'bs:1': { stars: 3 } } };
    expect(BADGES.filter(b => b.earned(p)).map(b => b.id).sort()).toEqual(['first', 'gamer', 'streak3', 'xp1k']);
    expect(BADGES.filter(b => b.earned(prog())).length).toBe(0);
  });
  it('daily quest is deterministic and in range', () => { expect(dailyQuest(['a', 'b', 'c'], 4)).toBe('b'); expect(dailyQuest([], 4)).toBeNull(); });
});
