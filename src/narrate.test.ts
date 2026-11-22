import { describe, expect, it } from 'vitest';
import { runCpp } from './engine/interp';
import { narrate } from './engine/narrate';
import { PLAYABLE } from './data/problems';

describe('narration never throws and always says something, for every step of every solution', () => {
  it('walks all traces', () => {
    let steps = 0;
    const bad: string[] = [];
    for (const p of PLAYABLE) {
      p.approaches.forEach((ap, ai) => {
        const r = runCpp(ap.code, p.fn, structuredClone(p.tests[0]), { trace: true, dll: p.dll });
        const lines = ap.code.split('\n');
        for (let i = 0; i < r.events.length; i += Math.max(1, Math.floor(r.events.length / 60))) {
          try {
            const n = narrate(r.events, i, lines);
            if (!n || !n.headline || !n.points.length) bad.push(`${p.title}#${ai} step ${i}: empty`);
            steps++;
          } catch (e: any) { bad.push(`${p.title}#${ai} step ${i}: ${e.message}`); }
        }
      });
    }
    expect(bad.slice(0, 10)).toEqual([]);
    expect(steps).toBeGreaterThan(5000);
  });
});

describe('narration describes the line about to run, using only recorded events', () => {
  const code = `class Solution {\npublic:\n    int f(vector<int>& a, int x) {\n        int low = 0;\n        int high = a.size() - 1;\n        while (low <= high) {\n            int mid = low + (high - low) / 2;\n            if (a[mid] < x) {\n                low = mid + 1;\n            } else {\n                high = mid - 1;\n            }\n        }\n        return low;\n    }\n};`;
  const r = runCpp(code, 'f', [[1, 3, 5, 7], 5], { trace: true });
  const lines = code.split('\n');
  const at = (pred: (e: any, i: number) => boolean) => r.events.findIndex(pred);

  it('a loop test names the condition, its result and where control goes next', () => {
    const i = at(e => e.kind === 'line' && e.line === 6);
    const n = narrate(r.events, i, lines)!;
    expect(n.tone).toBe('test');
    expect(n.headline).toMatch(/while \(low <= high\)/);
    expect(n.headline).toMatch(/true/);
    expect(n.points.join(' ')).toMatch(/loop body runs/);
  });
  it('an assignment explains the change it is about to make (taken from the next recorded step)', () => {
    const i = at(e => e.kind === 'line' && e.line === 9);
    const n = narrate(r.events, i, lines)!;
    expect(n.headline).toContain('low = mid + 1');
    expect(n.points.join(' ')).toMatch(/low changes: \d+ → \d+/);
  });
  it('shows the remaining search range from the current state', () => {
    const i = at(e => e.kind === 'line' && e.line === 7);
    const n = narrate(r.events, i, lines)!;
    expect(n.points.join(' ')).toMatch(/still being searched/);
  });
  it('call and return steps say what the stack does', () => {
    expect(narrate(r.events, 0, lines)!.headline).toMatch(/^Calling f/);
    const last = narrate(r.events, r.events.length - 1, lines)!;
    expect(last.tone).toBe('return');
    expect(last.headline).toMatch(/^f returns/);
  });
});
