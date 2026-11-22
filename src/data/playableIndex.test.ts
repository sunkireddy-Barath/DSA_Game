// playableTitles.json is a tiny index of the playable problem titles, so the dashboard and the sheet page do not have to
// download the whole problem bank. This test keeps it honest: it fails if the index and the bank ever disagree.
//   regenerate with:  GEN_INDEX=1 npx vitest run src/data/playableIndex.test.ts
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import index from './playableTitles.json';
import { PLAYABLE } from './problems';
import { ALL_PROBLEMS } from './sheet';

describe('playable index', () => {
  it.runIf(process.env.GEN_INDEX === '1')('writes playableTitles.json', () => {
    writeFileSync('src/data/playableTitles.json', JSON.stringify(PLAYABLE.map(p => p.title).sort()));
  });
  it('matches the problem bank exactly', () => {
    expect([...index].sort()).toEqual(PLAYABLE.map(p => p.title).sort());
  });
  it('covers every problem in the A2Z sheet', () => {
    const set = new Set(index);
    expect(ALL_PROBLEMS.filter(p => !set.has(p.title)).map(p => p.title)).toEqual([]);
  });
});
