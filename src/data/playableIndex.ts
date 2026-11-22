import titles from './playableTitles.json';

/** Titles of every playable problem (generated, see playableIndex.test.ts). Light enough to load on the first screen. */
export const PLAYABLE_TITLES: ReadonlySet<string> = new Set(titles);
