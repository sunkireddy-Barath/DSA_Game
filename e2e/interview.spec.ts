import { expect, test } from '@playwright/test';
import { QA_BANK } from '../src/interview/qa';
import '../src/interview/qa2';
import { GLOSSARY } from '../src/interview/glossary';
import { watchProblems, xp } from './helpers';

test.describe('Interview Q&A game', () => {
  test('answering correctly gives feedback, the model answer, real-world use and 10 XP once', async ({ page }) => {
    const problems = watchProblems(page);
    await page.goto('/#/interview');
    await page.getByRole('button', { name: 'DBMS', exact: true }).click();
    const q = QA_BANK.find(x => x.subject === 'dbms')!;
    await expect(page.getByRole('heading', { name: q.q })).toBeVisible();
    expect(await xp(page)).toBe(0);
    // wrong answer first: no XP, correct one is revealed with the explanation
    const wrong = q.mcq.options.findIndex((_, i) => i !== q.mcq.correct);
    await page.getByRole('button', { name: q.mcq.options[wrong], exact: true }).click();
    await expect(page.getByText('Not quite.')).toBeVisible();
    await expect(page.getByText(q.mcq.why)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'How to answer it' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Real-world application' })).toBeVisible();
    expect(await xp(page)).toBe(0);
    // next question, answer correctly
    await page.getByRole('button', { name: 'Next →' }).click();
    const q2 = QA_BANK.filter(x => x.subject === 'dbms')[1];
    await expect(page.getByRole('heading', { name: q2.q })).toBeVisible();
    await page.getByRole('button', { name: q2.mcq.options[q2.mcq.correct], exact: true }).click();
    await expect(page.getByText('Correct.')).toBeVisible();
    await expect.poll(() => xp(page)).toBe(10);
    // the same question again does not pay twice
    await page.getByRole('button', { name: '← Previous' }).click();
    await page.getByRole('button', { name: 'Next →' }).click();
    await page.getByRole('button', { name: q2.mcq.options[q2.mcq.correct], exact: true }).click();
    expect(await xp(page)).toBe(10);
    expect(problems).toEqual([]);
  });

  test('every subject filter shows only that subject and previous/next respect the ends', async ({ page }) => {
    watchProblems(page);
    await page.goto('/#/interview');
    for (const [label, key] of [['SQL', 'sql'], ['Operating Systems', 'os'], ['Networks', 'cn'], ['System Design', 'sysdesign']] as const) {
      await page.getByRole('button', { name: label, exact: true }).click();
      const n = QA_BANK.filter(x => x.subject === key).length;
      await expect(page.getByText(new RegExp(`Question 1 of ${n} `))).toBeVisible();
      await expect(page.getByRole('button', { name: '← Previous' })).toBeDisabled();
    }
  });
});

test.describe('Mock interviewer', () => {
  test('waits until you are ready, asks, then corrects a strong answer and a missing one', async ({ page }) => {
    const problems = watchProblems(page);
    await page.goto('/#/interview');
    await page.getByRole('button', { name: 'Mock interviewer' }).click();
    // nothing is asked before the learner says they are ready
    await expect(page.getByRole('heading', { name: /🎤/ })).toHaveCount(0);
    await expect(page.getByText('rule-based grader')).toBeVisible();
    await page.getByLabel('Subject').selectOption('os');
    await page.getByLabel('Questions').selectOption('3');
    await page.getByRole('button', { name: 'I am ready — ask me' }).click();

    // question 1: answer with the model answer → strong
    const asked = async () => (await page.getByRole('heading', { name: /🎤/ }).innerText()).replace('🎤', '').trim();
    const text1 = await asked();
    const q = QA_BANK.find(x => x.q === text1)!;
    expect(q).toBeTruthy();
    await page.getByLabel('Your answer').fill(q.answer.join(' ') + ' For example: ' + q.realWorld);
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Strong answer')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Model answer (what to say)' })).toBeVisible();
    await page.getByRole('button', { name: 'Next question' }).click();

    // question 2: a vague one-liner → correction lists what to add
    const text2 = await asked();
    const qq = QA_BANK.find(x => x.q === text2)!;
    await page.getByLabel('Your answer').fill('It depends.');
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText(/Needs work/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Correction: you should also say' })).toBeVisible();
    await expect(page.getByText(/very short/)).toBeVisible();
    await expect(page.getByText(qq.answer[0], { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Next question' }).click();

    // question 3: "I don't know" shows the model answer; then the summary
    await page.getByRole('button', { name: /I don.t know/ }).click();
    await expect(page.getByRole('heading', { name: 'Model answer (what to say)' })).toBeVisible();
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByRole('heading', { name: /Interview finished: \d+% key-point coverage/ })).toBeVisible();
    await page.getByRole('button', { name: 'New interview' }).click();
    await expect(page.getByRole('button', { name: 'I am ready — ask me' })).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('Glossary', () => {
  test('search filters, subject chips work and quiz mode hides then reveals answers', async ({ page }) => {
    const problems = watchProblems(page);
    await page.goto('/#/interview');
    await page.getByRole('button', { name: 'Glossary of terms' }).click();
    const total = GLOSSARY.reduce((n, s) => n + s.entries.length, 0);
    await expect(page.getByText(`${total} shown`)).toBeVisible();
    await page.getByLabel('Search glossary').fill('deadlock');
    await expect(page.getByRole('heading', { name: /Deadlock/ }).first()).toBeVisible();
    await expect(page.getByText(`${total} shown`)).toHaveCount(0);
    await page.getByLabel('Search glossary').fill('zzzz-no-such-term');
    await expect(page.getByText('No matching terms.')).toBeVisible();
    await page.getByLabel('Search glossary').fill('');
    await page.getByRole('button', { name: 'Networks', exact: true }).click();
    const cn = GLOSSARY.find(s => s.key === 'cn')!.entries.length;
    await expect(page.getByText(`${cn} shown`)).toBeVisible();
    await page.getByLabel(/Quiz mode/).check();
    await expect(page.getByRole('button', { name: 'Reveal answer' }).first()).toBeVisible();
    await expect(page.getByText('Interviewers ask:')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reveal answer' }).first().click();
    await expect(page.getByText('Interviewers ask:')).toHaveCount(1);
    expect(problems).toEqual([]);
  });
});
