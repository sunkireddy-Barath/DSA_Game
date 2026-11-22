// Shared types and helpers for authoring playable problems.
export type Growth = '1' | 'logn' | 'n' | 'nlogn' | 'n2' | '2n';
export interface Approach { label: string; code: string; time: string; space: string; growth: Growth; why: string }
export interface Playable {
  title: string; fn: string; statement: string; constraints: string[];
  starter: string; approaches: Approach[];
  tests: any[][]; defaultArgs: any[];
  ref: (...a: any[]) => any;
  /** index of argument holding the answer for in-place (void) functions */
  /** custom validator for problems with many valid answers */
  check?: (args: any[], got: any) => boolean;
  /** absolute tolerance for numeric answers (problems returning doubles) */
  tol?: number;
  /** doubly linked list problem (prev pointers are built and checked) */
  dll?: boolean;
  checkArg?: number; unordered?: boolean; viz?: 'queens';
  hints: string[]; intuition: string;
}

export const cls = (body: string) => `class Solution {\npublic:\n${body.split('\n').map(l => '    ' + l).join('\n')}\n};`;
export const stub = (sig: string, ret = 'return 0;') => cls(`${sig} {\n    // write your solution here\n    ${ret}\n}`);


// ---- helpers for reference implementations of tree problems ----
export interface RT { val: number; left: RT | null; right: RT | null }
export const mkTree = (a: (number | null)[]): RT | null => {
  if (!a.length || a[0] === null) return null;
  const root: RT = { val: a[0]!, left: null, right: null }; const q = [root]; let i = 1;
  for (let k = 0; k < q.length && i < a.length; k++) {
    if (i < a.length && a[i] !== null) { q[k].left = { val: a[i]!, left: null, right: null }; q.push(q[k].left!); } i++;
    if (i < a.length && a[i] !== null) { q[k].right = { val: a[i]!, left: null, right: null }; q.push(q[k].right!); } i++;
  }
  return root;
};
export const treeArr = (r: RT | null): (number | null)[] => {
  if (!r) return [];
  const out: (number | null)[] = []; const q: (RT | null)[] = [r];
  for (let i = 0; i < q.length; i++) { const n = q[i]; if (!n) { out.push(null); continue; } out.push(n.val); q.push(n.left, n.right); }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
};

// ---- compact builders used by the problem bank ----
export const ap = (label: string, time: string, space: string, growth: Growth, why: string, code: string): Approach => ({ label, time, space, growth, why, code: cls(code) });
export const mk = (
  title: string, fn: string, statement: string, sig: string, ret: string, approaches: Approach[],
  tests: any[][], ref: (...a: any[]) => any, hints: string[], intuition: string, extra: Partial<Playable> = {},
): Playable => ({
  title, fn, statement, constraints: extra.constraints ?? ['small inputs (the tracer records every step)'],
  starter: stub(sig, ret), approaches, tests, defaultArgs: tests[0], ref, hints, intuition,
  ...(sig.startsWith('void') ? { checkArg: 0 } : {}), ...extra,
});
