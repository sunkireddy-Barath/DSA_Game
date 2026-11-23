// Big-O Match: guess the complexity of a code snippet. The "truth" is MEASURED: each snippet is run through the real C++ interpreter
// for growing inputs and the statement counts are shown, so the answer is not just an assertion.
import { runCpp } from '../engine/interp';
import { Level, Rand, shuffle, Stars } from './rng';

export type Big = 'O(1)' | 'O(log n)' | 'O(√n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(n³)' | 'O(2ⁿ)';
export const CHOICES: Big[] = ['O(1)', 'O(log n)', 'O(√n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)'];

export interface Snippet { id: string; label: Big; level: Level; code: string; sizes: [number, number, number, number]; why: string }

const f = (body: string) => `int f(int n) {\n${body.split('\n').map(l => '    ' + l).join('\n')}\n}`;

export const SNIPPETS: Snippet[] = [
  { id: 'formula', label: 'O(1)', level: 1, sizes: [16, 64, 256, 1024], code: f('return n * (n + 1) / 2;'), why: 'One calculation, whatever n is: constant time.' },
  { id: 'sum', label: 'O(n)', level: 1, sizes: [16, 64, 256, 1024], code: f('int s = 0;\nfor (int i = 1; i <= n; i++) {\n    s += i;\n}\nreturn s;'), why: 'One pass over n numbers: the work grows in step with n.' },
  { id: 'halve', label: 'O(log n)', level: 1, sizes: [16, 64, 256, 1024], code: f('int c = 0;\nwhile (n > 1) {\n    n = n / 2;\n    c++;\n}\nreturn c;'), why: 'n is halved every round, so only about log₂ n rounds happen.' },
  { id: 'pairs', label: 'O(n²)', level: 1, sizes: [8, 16, 32, 64], code: f('int c = 0;\nfor (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {\n        c++;\n    }\n}\nreturn c;'), why: 'A loop of n inside a loop of n: n × n steps.' },
  { id: 'fact', label: 'O(n)', level: 1, sizes: [16, 32, 64, 128], code: `int f(int n) {\n    if (n <= 1) {\n        return 1;\n    }\n    return n + f(n - 1);\n}`, why: 'The recursion goes n levels deep with constant work per level.' },
  { id: 'twopow', label: 'O(log n)', level: 2, sizes: [16, 64, 256, 1024], code: `int f(int n) {\n    if (n <= 1) {\n        return 1;\n    }\n    return f(n / 2) + 1;\n}`, why: 'One recursive call on half the input: log₂ n levels.' },
  { id: 'tri', label: 'O(n²)', level: 2, sizes: [8, 16, 32, 64], code: f('int c = 0;\nfor (int i = 0; i < n; i++) {\n    for (int j = 0; j < i; j++) {\n        c++;\n    }\n}\nreturn c;'), why: 'The inner loop runs 0 + 1 + … + (n−1) = n(n−1)/2 times: still quadratic.' },
  { id: 'nlogn', label: 'O(n log n)', level: 2, sizes: [16, 64, 256, 1024], code: f('int c = 0;\nfor (int i = 0; i < n; i++) {\n    for (int j = 1; j < n; j = j * 2) {\n        c++;\n    }\n}\nreturn c;'), why: 'n outer rounds, each doing log₂ n doublings.' },
  { id: 'sqrt', label: 'O(√n)', level: 2, sizes: [16, 64, 256, 1024], code: f('int c = 0;\nfor (int i = 1; i * i <= n; i++) {\n    c++;\n}\nreturn c;'), why: 'The loop stops when i² passes n, after about √n rounds.' },
  { id: 'cube', label: 'O(n³)', level: 3, sizes: [4, 8, 16, 32], code: f('int c = 0;\nfor (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {\n        for (int k = 0; k < n; k++) {\n            c++;\n        }\n    }\n}\nreturn c;'), why: 'Three nested loops of n: n × n × n.' },
  { id: 'fib', label: 'O(2ⁿ)', level: 3, sizes: [6, 8, 10, 12], code: `int f(int n) {\n    if (n <= 1) {\n        return n;\n    }\n    return f(n - 1) + f(n - 2);\n}`, why: 'Each call makes two more calls and the same subproblems repeat: the call count roughly doubles with every +1 of n.' },
  { id: 'twoptr', label: 'O(n)', level: 3, sizes: [16, 64, 256, 1024], code: f('int lo = 0;\nint hi = n - 1;\nint c = 0;\nwhile (lo < hi) {\n    lo++;\n    hi--;\n    c++;\n}\nreturn c;'), why: 'Two pointers walk toward each other: together they cover n positions once.' },
  { id: 'nested-log', label: 'O(n log n)', level: 3, sizes: [16, 64, 256, 1024], code: f('int c = 0;\nfor (int i = 1; i <= n; i = i * 2) {\n    for (int j = 0; j < n; j++) {\n        c++;\n    }\n}\nreturn c;'), why: 'The outer loop doubles i (log₂ n rounds) and each round does n steps.' },
];

/** statements executed by the real interpreter for f(n) */
export function measure(code: string, n: number): number {
  const r = runCpp(code, 'f', [n], { trace: false, maxSteps: 4_000_000 });
  if (!r.ok) throw new Error(r.error);
  return r.stats.steps;
}

export function measureAll(sn: Snippet): { n: number; steps: number }[] { return sn.sizes.map(n => ({ n, steps: measure(sn.code, n) })); }

/** classify measured growth from the exponent between the last two sizes: slope = ln(steps ratio) / ln(size ratio) */
export function classify(_sn: Snippet, m: { n: number; steps: number }[]): Big {
  const [a, b] = [m[m.length - 2], m[m.length - 1]];
  const ratio = b.steps / a.steps;
  if (b.n - a.n === 2 && b.n < 20) return ratio > 2 ? 'O(2ⁿ)' : 'O(n²)';        // +2 on n: an exponential at least doubles the work, a polynomial barely moves
  if (ratio < 1.12) return 'O(1)';
  const slope = Math.log(ratio) / Math.log(b.n / a.n);
  if (slope < 0.4) return 'O(log n)';
  if (slope < 0.75) return 'O(√n)';
  if (slope < 1.12) return 'O(n)';
  if (slope < 1.45) return 'O(n log n)';
  if (slope < 2.5) return 'O(n²)';
  return 'O(n³)';
}

export function makeRound(r: Rand, level: Level): Snippet[] {
  const pool = SNIPPETS.filter(s => s.level <= level);
  return shuffle(r, pool).slice(0, 8);
}

export const stars = (correct: number, total: number): Stars => { const a = correct / total; return a === 1 ? 3 : a >= 0.75 ? 2 : a >= 0.5 ? 1 : 0; };
