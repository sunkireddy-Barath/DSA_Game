// Bracket Balancer: you ARE the stack. For every character decide: push, pop (it closes the top) or reject (the string is invalid).
import { int, Level, pick, Rand, rng, Stars } from './rng';

export type Action = 'push' | 'pop' | 'reject' | 'accept';
export interface SgRound { strings: string[]; level: Level }
export interface SgState { s: string; i: number; stack: string[]; mistakes: number; over: boolean; valid: boolean | null; message: string }

const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
const OPEN = ['(', '[', '{'], CLOSE = [')', ']', '}'];
const OF = (o: string) => CLOSE[OPEN.indexOf(o)];

function balanced(r: Rand, pairs: number, kinds: number): string {
  let out = '';
  const gen = (n: number): void => {
    if (n === 0) return;
    const inside = int(r, 0, n - 1), o = OPEN[int(r, 0, kinds - 1)];
    out += o; gen(inside); out += OF(o); gen(n - 1 - inside);
  };
  gen(pairs);
  return out;
}

export function corrupt(r: Rand, s: string): string {
  const mode = int(r, 0, 2);
  if (mode === 0 && s.length > 1) return s.slice(0, s.length - 1);                      // unclosed opener
  if (mode === 1) { const i = int(r, 0, s.length - 1); const all = [...OPEN, ...CLOSE].filter(c => c !== s[i]); return s.slice(0, i) + pick(r, all) + s.slice(i + 1); }
  return CLOSE[int(r, 0, 2)] + s;                                                         // closer with nothing to close
}

export const isBalanced = (s: string): boolean => {
  const st: string[] = [];
  for (const c of s) { if (OPEN.includes(c)) st.push(c); else if (st.pop() !== PAIRS[c]) return false; }
  return st.length === 0;
};

export function makeRound(seed: number, level: Level): SgRound {
  const r = rng(seed);
  const pairs = { 1: 3, 2: 4, 3: 6 }[level], kinds = { 1: 1, 2: 2, 3: 3 }[level];
  const strings = Array.from({ length: 3 }, (_, k) => { const b = balanced(r, pairs, kinds); return k === 1 || r() < 0.4 ? corrupt(r, b) : b; });
  return { strings, level };
}

export const start = (s: string): SgState => ({ s, i: 0, stack: [], mistakes: 0, over: false, valid: null, message: 'Read the first character.' });

export function expected(st: SgState): Action {
  if (st.i >= st.s.length) return st.stack.length === 0 ? 'accept' : 'reject';
  const c = st.s[st.i];
  if (OPEN.includes(c)) return 'push';
  return st.stack.length > 0 && st.stack[st.stack.length - 1] === PAIRS[c] ? 'pop' : 'reject';
}

export function why(st: SgState, a: Action): string {
  if (st.i >= st.s.length) return a === 'accept' ? 'Every opener was closed and the stack is empty: the string is valid.' : `The string ended but ${st.stack.length} opener(s) are still on the stack, so something was never closed.`;
  const c = st.s[st.i], top = st.stack[st.stack.length - 1];
  if (OPEN.includes(c)) return `${c} opens something that must be closed later: push it.`;
  if (a === 'pop') return `${c} closes the ${top} on top of the stack: pop it.`;
  return st.stack.length === 0 ? `${c} has nothing to close (the stack is empty): the string is invalid.` : `${c} would close ${PAIRS[c]}, but the top of the stack is ${top}: the brackets cross, so the string is invalid.`;
}

export function apply(st: SgState, action: Action): SgState {
  if (st.over) return st;
  const exp = expected(st);
  if (action !== exp) return { ...st, mistakes: st.mistakes + 1, message: `Not quite. ${why(st, exp)}` };
  const message = why(st, exp);
  if (exp === 'push') return { ...st, i: st.i + 1, stack: [...st.stack, st.s[st.i]], message };
  if (exp === 'pop') return { ...st, i: st.i + 1, stack: st.stack.slice(0, -1), message };
  return { ...st, over: true, valid: exp === 'accept', message };
}

export const stars = (mistakes: number): Stars => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
