import { describe, expect, it } from 'vitest';
import { QA_BANK, SUBJECTS } from './qa';
import { PLAYBOOKS } from './playbook';
import { SHEET } from '../data/sheet';

describe('interview bank', () => {
  it('every subject has questions and each is well-formed with a valid answer key', () => {
    const ids = new Set<string>();
    for (const k of Object.keys(SUBJECTS)) expect(QA_BANK.filter(q => q.subject === k).length, k).toBeGreaterThanOrEqual(6);
    for (const q of QA_BANK) {
      expect(ids.has(q.id), q.id).toBe(false); ids.add(q.id);
      expect(q.answer.length, q.id).toBeGreaterThanOrEqual(1);
      expect(q.mcq.options.length, q.id).toBeGreaterThanOrEqual(3);
      expect(q.mcq.correct).toBeGreaterThanOrEqual(0); expect(q.mcq.correct).toBeLessThan(q.mcq.options.length);
      expect(new Set(q.mcq.options).size, q.id).toBe(q.mcq.options.length);
      expect(q.realWorld.length, q.id).toBeGreaterThan(15);
    }
  });
  it('correct options are spread (not always the same position)', () => {
    expect(new Set(QA_BANK.map(q => q.mcq.correct)).size).toBeGreaterThanOrEqual(3);
  });
  it('a playbook exists for every A2Z step', () => {
    expect(PLAYBOOKS.map(p => p.step)).toEqual(SHEET.map(s => s.n));
  });
});
