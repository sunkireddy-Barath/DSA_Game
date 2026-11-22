// Mock interviewer: grades a typed answer against the key points of a question. Rule-based (keyword coverage), NOT an LLM.
import type { QA } from './qa';

const STOP = new Set('a an the and or of to in on for with is are was were be been it its this that these those as at by from into than then so if but not no yes can could should would will may might do does did done have has had you your we they he she i me my our their them what which who whom when where why how all any each every both either neither some such only own same too very just also more most other another one two three use used using uses like make makes made get gets got per via vs etc e g i e'.split(' '));

const stem = (w: string) => w.length > 5 && w.endsWith('ing') ? w.slice(0, -3) : w.length > 4 && w.endsWith('ed') ? w.slice(0, -2) : w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(w => (w.length >= 3 || /\d/.test(w)) && !STOP.has(w)).map(stem);
}

export interface PointResult { point: string; covered: boolean; matched: number; total: number }
export interface Feedback {
  score: number; verdict: 'strong' | 'okay' | 'weak';
  points: PointResult[]; missing: string[]; tips: string[]; modelAnswer: string; exampleMentioned: boolean;
}

export function evaluate(qa: QA, answer: string): Feedback {
  const given = new Set(tokens(answer));
  const words = (answer.match(/[A-Za-z0-9]+/g) ?? []).length;
  const points: PointResult[] = qa.answer.map(point => {
    const sal = [...new Set(tokens(point))];
    const matched = sal.filter(t => given.has(t)).length;
    const need = sal.length <= 4 ? Math.max(1, Math.ceil(sal.length * 0.6)) : Math.max(3, Math.ceil(sal.length * 0.35));
    return { point, covered: matched >= need, matched, total: sal.length };
  });
  const coveredN = points.filter(p => p.covered).length;
  const score = points.length ? coveredN / points.length : 0;
  const ex = [...new Set(tokens(qa.realWorld))];
  const exampleMentioned = ex.filter(t => given.has(t)).length >= 2 || /\b(for example|for instance|e\.g\.|such as|in practice|real[- ]world)\b/i.test(answer);
  const tips: string[] = [];
  if (words < 15) tips.push('Your answer is very short. Aim for 3–5 sentences: definition, how it works, trade-off, example.');
  if (!exampleMentioned) tips.push(`Add a real-world example, for instance: ${qa.realWorld}`);
  if (qa.subject === 'dsa' && !/(o\(|big[- ]?o|complexity|time|space)/i.test(answer)) tips.push('For algorithm questions always state time and space complexity.');
  if (score < 1 && words >= 15) tips.push('Structure your answer: start with a one-line definition, then the mechanism, then trade-offs, then an example.');
  return {
    score, verdict: score >= 0.7 ? 'strong' : score >= 0.4 ? 'okay' : 'weak', points,
    missing: points.filter(p => !p.covered).map(p => p.point), tips,
    modelAnswer: qa.answer.join(' ') + ' Example: ' + qa.realWorld, exampleMentioned,
  };
}

/** Deterministic shuffle so a session is reproducible in tests. */
export function pickQuestions(bank: QA[], subject: string, n: number, rand: () => number = Math.random): QA[] {
  const pool = bank.filter(q => subject === 'all' || q.subject === subject).slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, Math.min(n, pool.length));
}
