// Page Fault Predictor: for each page reference, predict whether memory already holds the page (hit) or not (fault).
import { pageReplacement, PageAlgo, PageStep } from '../os/engines';
import { int, Level, Rand, rng, Stars } from './rng';

export interface PgRound { refs: number[]; frames: number; algo: PageAlgo; steps: PageStep[]; faults: number; level: Level }

export function makeRound(seed: number, level: Level): PgRound {
  const r: Rand = rng(seed);
  const len = { 1: 10, 2: 12, 3: 14 }[level], pages = { 1: 4, 2: 5, 3: 6 }[level], frames = level === 3 ? 4 : 3;
  const algo: PageAlgo = level === 1 ? 'FIFO' : level === 2 ? 'LRU' : r() < 0.5 ? 'FIFO' : 'LRU';
  const refs: number[] = [];
  for (let i = 0; i < len; i++) refs.push(i > 0 && r() < 0.3 ? refs[int(r, Math.max(0, i - 3), i - 1)] : int(r, 0, pages - 1));   // some locality so hits happen
  const { steps, faults } = pageReplacement(refs, frames, algo);
  return { refs, frames, algo, steps, faults, level };
}

export const truth = (rd: PgRound, k: number): 'hit' | 'fault' => (rd.steps[k].fault ? 'fault' : 'hit');
export function stars(correct: number, total: number): Stars { const a = correct / total; return a === 1 ? 3 : a >= 0.8 ? 2 : a >= 0.5 ? 1 : 0; }
export const ALGO_RULE: Record<string, string> = {
  FIFO: 'FIFO evicts the page that has been in memory the longest, whether or not it was used recently.',
  LRU: 'LRU evicts the page that was used least recently.',
  OPT: 'OPT evicts the page that will not be needed for the longest time.',
};
