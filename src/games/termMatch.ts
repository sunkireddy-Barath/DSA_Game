// Term Match: a memory game. Flip two cards; a term and its definition are a pair. Built from the interview glossary.
import { GLOSSARY } from '../interview/glossary';
import { Level, Rand, rng, shuffle, Stars } from './rng';

export interface Card { id: number; pair: number; kind: 'term' | 'def'; text: string }
export interface TmState { cards: Card[]; flipped: number[]; matched: Set<number>; moves: number; pairs: number }
export interface Fact { term: string; def: string; subject: string }

/** the first sentence of the definition, if it is short enough to fit on a card */
export function facts(subject?: string): Fact[] {
  const out: Fact[] = [];
  for (const sec of GLOSSARY) {
    if (subject && sec.key !== subject) continue;
    for (const [term, definition] of sec.entries) {
      const first = definition.split(/(?<=[.!?])\s/)[0];
      if (first.length >= 25 && first.length <= 120 && term.length <= 34) out.push({ term, def: first, subject: sec.key });
    }
  }
  return out;
}

export function makeDeck(seed: number, level: Level, subject?: string): TmState {
  const r: Rand = rng(seed);
  const n = { 1: 6, 2: 8, 3: 10 }[level];
  const chosen = shuffle(r, facts(subject)).slice(0, n);
  const cards: Card[] = shuffle(r, chosen.flatMap((f, i) => [
    { pair: i, kind: 'term' as const, text: f.term },
    { pair: i, kind: 'def' as const, text: f.def },
  ])).map((c, id) => ({ ...c, id }));
  return { cards, flipped: [], matched: new Set(), moves: 0, pairs: chosen.length };
}

/** Flip a card. After two cards are face up the caller shows them briefly and then calls resolve(). */
export function flip(s: TmState, id: number): TmState {
  if (s.flipped.length >= 2 || s.flipped.includes(id) || s.matched.has(s.cards[id].pair)) return s;
  const flipped = [...s.flipped, id];
  return { ...s, flipped, moves: flipped.length === 2 ? s.moves + 1 : s.moves };
}

export const isMatch = (s: TmState) => s.flipped.length === 2 && s.cards[s.flipped[0]].pair === s.cards[s.flipped[1]].pair && s.cards[s.flipped[0]].kind !== s.cards[s.flipped[1]].kind;

export function resolve(s: TmState): TmState {
  if (s.flipped.length < 2) return s;
  const matched = new Set(s.matched);
  if (isMatch(s)) matched.add(s.cards[s.flipped[0]].pair);
  return { ...s, flipped: [], matched };
}

export const done = (s: TmState) => s.matched.size === s.pairs;
export const stars = (moves: number, pairs: number): Stars => (moves <= Math.ceil(pairs * 1.6) ? 3 : moves <= Math.ceil(pairs * 2.4) ? 2 : 1);
