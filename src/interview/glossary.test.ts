import { describe, expect, it } from 'vitest';
import { GLOSSARY } from './glossary';

describe('interview glossary', () => {
  it('covers all ten subjects with substantial, well-formed entries', () => {
    expect(GLOSSARY.map(s => s.key)).toEqual(['dsa', 'dbms', 'sql', 'os', 'oops', 'cn', 'coa', 'sysdesign', 'se', 'dev']);
    for (const s of GLOSSARY) {
      expect(s.entries.length, s.key).toBeGreaterThanOrEqual(12);
      const seen = new Set<string>();
      for (const [t, d, p] of s.entries) {
        expect(t.length).toBeGreaterThan(2); expect(d.length, t).toBeGreaterThan(40); expect(p.length, t).toBeGreaterThan(15);
        expect(seen.has(t), `duplicate ${t}`).toBe(false); seen.add(t);
      }
    }
  });
  it('key numeric facts are stated correctly', () => {
    const all = GLOSSARY.flatMap(s => s.entries.map(e => e.join(' '))).join('\n');
    expect(all).toMatch(/99\.9% ≈ 8\.8 h/);        // 0.001 * 8766 h = 8.77 h
    expect(all).toMatch(/2\^\(32−n\) − 2/);
    expect(all).toMatch(/CPI × clock cycle time/);
  });
});
