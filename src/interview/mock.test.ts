import { describe, expect, it } from 'vitest';
import { QA_BANK } from './qa';
import './qa2';
import { evaluate, pickQuestions, tokens } from './mock';

describe('mock interviewer grader', () => {
  it('a model answer scores as strong for every question in the bank', () => {
    for (const q of QA_BANK) {
      const f = evaluate(q, q.answer.join(' ') + ' ' + q.realWorld);
      expect(f.verdict, q.id).toBe('strong');
      expect(f.score, q.id).toBe(1);
      expect(f.missing, q.id).toEqual([]);
    }
  });
  it('an empty answer scores zero and lists every point as missing with the model answer', () => {
    const q = QA_BANK.find(x => x.id === 'os-2')!;
    const f = evaluate(q, '');
    expect(f.score).toBe(0); expect(f.verdict).toBe('weak');
    expect(f.missing.length).toBe(q.answer.length);
    expect(f.modelAnswer).toContain('circular wait');
    expect(f.tips.join(' ')).toMatch(/short/);
  });
  it('an unrelated answer is weak; a partial answer is in between', () => {
    const q = QA_BANK.find(x => x.id === 'os-2')!;
    expect(evaluate(q, 'I like pizza and football on weekends, they are very fun to play with friends.').verdict).toBe('weak');
    const partial = evaluate(q, 'A deadlock needs mutual exclusion, hold and wait, no preemption and circular wait. You prevent it by breaking one of the conditions, for example lock ordering.');
    expect(partial.score).toBeGreaterThan(0.3);
    expect(partial.score).toBeLessThan(1.01);
    expect(partial.points[0].covered).toBe(true);
  });
  it('algorithm answers without complexity get a reminder', () => {
    const q = QA_BANK.find(x => x.id === 'dsa-11')!;
    expect(evaluate(q, 'Use a hash map to store each number and look for the target minus the current number while looping over the array once.').tips.join(' ')).toMatch(/complexity/);
  });
  it('tokenizer drops stop words and stems plurals', () => {
    expect(tokens('The threads are sharing the heaps')).toEqual(['thread', 'shar', 'heap']);
  });
  it('picks the requested number of distinct questions from the chosen subject', () => {
    const qs = pickQuestions(QA_BANK, 'sql', 5, () => 0.3);
    expect(qs.length).toBe(5); expect(new Set(qs.map(q => q.id)).size).toBe(5);
    expect(qs.every(q => q.subject === 'sql')).toBe(true);
    expect(pickQuestions(QA_BANK, 'dev', 1000).length).toBe(QA_BANK.filter(q => q.subject === 'dev').length);
  });
});
