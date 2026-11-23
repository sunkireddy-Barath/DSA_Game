// Binary Search Hunter: a sorted array hides a target. Each probe reveals "too small", "too big" or "found".
import { int, Level, rng, Stars } from './rng';

export interface BsRound { values: number[]; target: number; level: Level }
export interface Probe { idx: number; value: number; result: 'low' | 'high' | 'found'; wasted: boolean }
export interface BsState { lo: number; hi: number; probes: Probe[]; found: boolean }

const SIZE: Record<Level, number> = { 1: 15, 2: 31, 3: 63 };

export function makeRound(seed: number, level: Level): BsRound {
  const r = rng(seed);
  const n = SIZE[level];
  const values: number[] = [];
  let v = int(r, 1, 9);
  for (let i = 0; i < n; i++) { values.push(v); v += int(r, 2, 9); }
  return { values, target: values[int(r, 0, n - 1)], level };
}

export const initial = (rd: BsRound): BsState => ({ lo: 0, hi: rd.values.length - 1, probes: [], found: false });

/** Probing outside the still-possible range is allowed but "wasted": it tells you nothing new. */
export function probe(rd: BsRound, s: BsState, idx: number): BsState {
  if (s.found || idx < 0 || idx >= rd.values.length) return s;
  const value = rd.values[idx];
  const wasted = idx < s.lo || idx > s.hi;
  if (value === rd.target) return { ...s, found: true, probes: [...s.probes, { idx, value, result: 'found', wasted }] };
  if (value < rd.target) return { ...s, lo: Math.max(s.lo, idx + 1), probes: [...s.probes, { idx, value, result: 'low', wasted }] };
  return { ...s, hi: Math.min(s.hi, idx - 1), probes: [...s.probes, { idx, value, result: 'high', wasted }] };
}

/** the best worst-case number of probes for n sorted elements: ceil(log2(n + 1)) */
export const optimalProbes = (n: number) => Math.ceil(Math.log2(n + 1));
export const hintIndex = (s: BsState) => Math.floor((s.lo + s.hi) / 2);

export function stars(rd: BsRound, s: BsState): Stars {
  if (!s.found) return 0;
  const opt = optimalProbes(rd.values.length), used = s.probes.length;
  return used <= opt ? 3 : used <= opt + 1 ? 2 : 1;
}

export function explain(rd: BsRound, p: Probe): string {
  if (p.result === 'found') return `${p.value} is the target. Found it!`;
  const side = p.result === 'low' ? `${p.value} is smaller than ${rd.target}, so the target must be to the right: everything at or left of position ${p.idx} is ruled out.`
    : `${p.value} is bigger than ${rd.target}, so the target must be to the left: everything at or right of position ${p.idx} is ruled out.`;
  return p.wasted ? `${side} (That part was already ruled out, so this probe taught you nothing new.)` : side;
}
