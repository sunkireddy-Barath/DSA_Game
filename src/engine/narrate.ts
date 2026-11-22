// Plain-English explanation of the current trace step. Pure function of the recorded events, so it can never describe a state
// the program was not in (same rule as the step explainer).
import type { TraceEvent, VarSnap } from './interp';

export interface Narration { headline: string; points: string[]; next?: string; tone: 'call' | 'return' | 'test' | 'work' }

const show = (v: any, type = ''): string => {
  if (v === undefined) return 'void';
  if (v === null) return 'nullptr';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number' && type.includes('char')) return `'${String.fromCharCode(v)}'`;
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'object') {
    if ('$ptr' in v) return v.$ptr ? `node #${v.$ptr}` : 'nullptr';
    if ('$seq' in v) return `${v.kind}[${v.$seq.map((x: any) => show(x)).join(', ')}]`;
    if ('$map' in v) return `{${v.$map.map(([k, x]: any) => `${show(k)}: ${show(x)}`).join(', ')}}`;
    const s = JSON.stringify(v);
    return s.length > 40 ? s.slice(0, 37) + '…' : s;
  }
  return String(v);
};

const OPS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/(\w+)\.push_back\(/, m => `adds an element to the end of ${m[1]}`],
  [/(\w+)\.pop_back\(/, m => `removes the last element of ${m[1]}`],
  [/(\w+)\.push\(/, m => `pushes a value onto ${m[1]} (a stack pushes on top, a queue at the back)`],
  [/(\w+)\.pop\(/, m => `removes an element from ${m[1]} (a stack pops the top, a queue the front)`],
  [/(\w+)\.(?:emplace_back|emplace)\(/, m => `adds a new element to ${m[1]}`],
  [/(\w+)\.insert\(/, m => `inserts into ${m[1]}`],
  [/(\w+)\.erase\(/, m => `erases from ${m[1]}`],
  [/swap\(/, () => 'swaps two values'],
  [/sort\(/, () => 'sorts the range in place'],
  [/reverse\(/, () => 'reverses the range in place'],
  [/(\w+)\[[^\]]+\]\s*(?:\+\+|--|\+=|-=|=(?!=))/, m => `writes into an element of ${m[1]}`],
  [/\bnew\s+\w+/, () => 'allocates a new node on the heap'],
  [/->next\s*=(?!=)/, () => 're-links a next pointer'],
  [/->(?:left|right)\s*=(?!=)/, () => 're-links a child pointer'],
];

function changes(ev: TraceEvent, prev: TraceEvent | undefined): { name: string; was?: string; now: string; type: string }[] {
  const f = ev.frames[ev.frames.length - 1];
  const pf = prev?.frames.find(x => x.callId === f.callId);
  const out: { name: string; was?: string; now: string; type: string }[] = [];
  for (const v of f.vars as VarSnap[]) {
    const p = pf?.vars.find(x => x.name === v.name);
    if (!p) { if (prev && pf) out.push({ name: v.name, now: show(v.value, v.type), type: v.type }); continue; }
    if (JSON.stringify(p.value) !== JSON.stringify(v.value)) out.push({ name: v.name, was: show(p.value, v.type), now: show(v.value, v.type), type: v.type });
  }
  return out;
}

export function narrate(events: TraceEvent[], idx: number, lines: string[]): Narration | null {
  const ev = events[idx];
  if (!ev) return null;
  const prev = events[idx - 1];
  const f = ev.frames[ev.frames.length - 1];
  const src = (lines[ev.line - 1] ?? '').trim();
  const nextEv = events[idx + 1];
  const next = nextEv ? (nextEv.kind === 'call' ? `call ${nextEv.fn}(…)` : nextEv.kind === 'return' ? `return from ${nextEv.fn}` : (lines[nextEv.line - 1] ?? '').trim()) : undefined;

  if (ev.kind === 'call') {
    const args = f.vars.filter(v => typeof v.value !== 'object' || v.value === null).map(v => `${v.name} = ${show(v.value, v.type)}`).join(', ');
    return { tone: 'call', headline: `Calling ${ev.fn}${args ? ` with ${args}` : ''}`, next,
      points: ['A new stack frame is created for this call; its parameters are its first local variables.', ev.parentId ? 'The caller is paused and waits for this call to return.' : 'This is the entry point, the call the test harness makes.'] };
  }
  if (ev.kind === 'return') {
    return { tone: 'return', headline: `${ev.fn} returns ${show(ev.ret)}`, next,
      points: ['The stack frame of this call is removed.', ev.depth > 1 ? 'Control goes back to the caller, which receives the value above.' : 'This was the outermost call: the value is the final answer.'] };
  }
  const points: string[] = [];
  // the trace stores the state BEFORE a line runs, so what this line does is visible in the next recorded step of the same call
  const after = nextEv && nextEv.callId === ev.callId ? changes(nextEv, ev) : [];
  const nextLine = nextEv && nextEv.kind === 'line' && nextEv.callId === ev.callId ? nextEv.line : undefined;
  const goes = nextLine !== undefined ? `Execution then continues at line ${nextLine}: ${(lines[nextLine - 1] ?? '').trim()}` : undefined;
  if (ev.cond !== undefined) {
    const loop = /^(for|while)\b/.test(src);
    const isElse = /^}?\s*else\s+if\b/.test(src);
    return { tone: 'test', headline: `Test ${src.replace(/\s*\{$/, '')} → ${ev.cond ? 'true' : 'false'}`, next,
      points: [loop ? (ev.cond ? 'The condition holds, so the loop body runs once more.' : 'The condition is false, so the loop ends and execution continues after it.')
        : (ev.cond ? 'The condition holds, so the block below runs.' : (isElse ? 'The condition is false, so this branch is skipped and the next one is tried.' : 'The condition is false, so the block is skipped (an else branch, if any, runs).')),
      ...(goes ? [goes] : [])] };
  }
  for (const [re, say] of OPS) { const m = src.match(re); if (m) { points.push(`This line ${say(m)}.`); break; } }
  if (nextEv && nextEv.kind === 'call' && nextEv.callId !== ev.callId) points.push(`It calls ${nextEv.fn}: a new stack frame is pushed and this function waits.`);
  if (after.length) points.push(...after.map(c => {
    const ptr = c.type.endsWith('*');
    if (ptr) return c.was === undefined ? `After it runs, ${c.name} points to ${c.now}.` : `After it runs, ${c.name} points to ${c.now} instead of ${c.was}.`;
    return c.was === undefined ? `After it runs, ${c.name} exists with value ${c.now}.` : `After it runs, ${c.name} changes: ${c.was} → ${c.now}.`;
  }));
  else if (!points.length) points.push('This line changes no variable; it only evaluates an expression or enters a block.');
  const f2 = f.vars;
  const num = (n: string) => { const v = f2.find(x => x.name === n); return typeof v?.value === 'number' ? v.value : undefined; };
  for (const [a, b] of [['low', 'high'], ['lo', 'hi'], ['left', 'right'], ['l', 'r']] as const) {
    const A = num(a), B = num(b);
    if (A !== undefined && B !== undefined) { points.push(B >= A ? `The part of the array still being searched is positions ${A} to ${B} (${B - A + 1} element${B - A ? 's' : ''}).` : `${a} has passed ${b}: nothing is left to search.`); break; }
  }
  return { tone: 'work', headline: src.length > 70 ? src.slice(0, 67) + '…' : src || 'Executing', points, next };
}
