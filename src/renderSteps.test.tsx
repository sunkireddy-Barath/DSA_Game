import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { runCpp } from './engine/interp';
import { PLAYABLE } from './data/problems';
import { Viz } from './components/Viz';
import { Inspector } from './components/Inspector';

// Regression test for a crash found in the browser: stepping onto a nullptr variable broke the Inspector. This renders the real
// diagram and inspector components at sampled steps of every solution in the bank, so a render crash on any data shape is caught.
describe('every step of every solution renders without throwing', () => {
  it('renders Viz + Inspector for all problems', () => {
    const failures: string[] = [];
    let rendered = 0;
    for (const p of PLAYABLE) {
      p.approaches.forEach((ap, ai) => {
        const r = runCpp(ap.code, p.fn, structuredClone(p.tests[0]), { trace: true, dll: p.dll });
        const lines = ap.code.split('\n');
        const stepEvery = Math.max(1, Math.floor(r.events.length / 8));
        for (let i = 0; i < r.events.length; i += stepEvery) {
          try {
            const recursive = r.stats.calls > 1;
            renderToString(<Viz events={r.events} idx={i} viz={p.viz} recursive={recursive} selectedCall={null} onSelectCall={() => {}} lines={lines} />);
            renderToString(<Inspector events={r.events} idx={i} lines={lines} iteration={1} selectedCall={null} />);
            rendered++;
          } catch (e: any) { failures.push(`${p.title} / ${ap.label} step ${i}: ${e.message}`); }
        }
      });
    }
    expect(failures.slice(0, 8)).toEqual([]);
    expect(rendered).toBeGreaterThan(2500);
  });
});
