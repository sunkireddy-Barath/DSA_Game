import { expect, Page, test } from '@playwright/test';
import { ALL_PROBLEMS } from '../src/data/sheet';
import { getEditor, setEditor, watchProblems, xp } from './helpers';

const idOf = (title: string) => ALL_PROBLEMS.find(p => p.title === title)!.id;
const stepText = async (page: Page) => (await page.locator('.controls span.dim').last().innerText()).trim();
const stepNow = async (page: Page) => Number((await stepText(page)).match(/step (\d+)\//)![1]);
const stepTotal = async (page: Page) => Number((await stepText(page)).match(/\/(\d+)$/)![1]);

async function openProblem(page: Page, title: string) {
  await page.goto(`/#/p/${idOf(title)}`);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.locator('.okline')).toContainText('Returned', { timeout: 45_000 });
}

test('watch mode: the trace is stepped through line by line and the code, variables and step counter stay in sync', async ({ page }) => {
  const problems = watchProblems(page);
  await openProblem(page, 'Two Sum');
  const total = await stepTotal(page);
  expect(total).toBeGreaterThan(5);
  expect(await stepNow(page)).toBe(1);
  await expect(page.locator('.ln-current')).toHaveCount(1);                     // the highlighted line in the editor
  await page.getByRole('button', { name: /Step into/ }).click();
  expect(await stepNow(page)).toBe(2);
  await page.getByRole('button', { name: /Step into/ }).click();
  await page.getByRole('button', { name: /Step into/ }).click();
  expect(await stepNow(page)).toBe(4);
  await expect(page.getByRole('heading', { name: 'Local variables & parameters' })).toBeVisible();
  await expect(page.locator('table.vars')).toContainText('nums');
  await expect(page.locator('table.vars')).toContainText('target');
  await page.getByRole('button', { name: /Back/ }).click();
  expect(await stepNow(page)).toBe(3);
  await page.getByRole('button', { name: /Restart/ }).click();
  expect(await stepNow(page)).toBe(1);
  // scrubbing to the end shows the finished state
  await page.locator('input.scrub').fill(String(total - 1));
  expect(await stepNow(page)).toBe(total);
  expect(problems).toEqual([]);
});

test('playing, pausing and switching between the optimized and brute-force approaches re-runs the real code', async ({ page }) => {
  watchProblems(page);
  await openProblem(page, 'Two Sum');
  const tabs = page.locator('.panel-bar button.tab');
  await expect(tabs.first()).toBeVisible();
  expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  const before = await getEditor(page);
  await tabs.nth(1).click();
  await expect(page.locator('.okline')).toContainText('Returned');
  expect(await getEditor(page)).not.toBe(before);
  await page.getByRole('button', { name: /Start/ }).click();
  await expect(page.getByRole('button', { name: /Pause/ })).toBeVisible();
  await expect.poll(() => stepNow(page), { timeout: 10_000 }).toBeGreaterThan(1);
  await page.getByRole('button', { name: /Pause/ }).click();
  await expect(page.getByRole('button', { name: /Continue/ })).toBeVisible();
});

test('predict mode asks about the next step, grades the answer and explains it', async ({ page }) => {
  const problems = watchProblems(page);
  await openProblem(page, 'Two Sum');
  await page.getByLabel(/Predict mode/).check();
  await page.getByRole('button', { name: /Start/ }).click();
  await expect(page.getByText('Predict the next step')).toBeVisible({ timeout: 20_000 });
  const opts = page.locator('.predict .opt');
  expect(await opts.count()).toBeGreaterThanOrEqual(2);
  await opts.first().click();
  await expect(page.locator('.predict .good, .predict .bad')).toBeVisible();
  await page.getByRole('button', { name: /Show me the step/ }).click();
  await expect(page.locator('.predict')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('inspector, complexity lab and the built-in step explainer all show real data', async ({ page }) => {
  watchProblems(page);
  await openProblem(page, 'Two Sum');
  await page.getByRole('button', { name: /Step into/ }).click();
  await page.getByRole('button', { name: 'Complexity Lab' }).click();
  await expect(page.locator('.side-body')).toContainText(/O\(n\)/);
  await page.getByRole('button', { name: 'Tutor', exact: true }).click();
  await expect(page.getByText(/Step explainer/)).toBeVisible();
  await expect(page.getByTestId('ai-gate')).toContainText(/Sign in to use the AI tutor/);   // honest state while signed out
  await page.getByRole('button', { name: /Explain this line/ }).click();
  await expect(page.locator('.side-body')).toContainText(/Line \d+/);
});

test('solve mode: wrong starter fails with details, hints cost XP, peeking halves XP, and the solved state survives a reload', async ({ page }) => {
  const problems = watchProblems(page);
  await openProblem(page, 'Two Sum');
  await page.getByRole('button', { name: /Solve it/ }).click();
  await expect.poll(() => getEditor(page)).toContain('write your solution here');
  await page.getByRole('button', { name: /Run all \d+ tests/ }).click();
  await expect(page.locator('.verdict')).toContainText(/0\/\d+ tests passed/);
  await expect(page.locator('.trow.fail').first()).toContainText('expected');
  expect(await xp(page)).toBe(0);
  await page.getByRole('button', { name: /Hint \(0\// }).click();
  await expect(page.locator('ol.hints li')).toHaveCount(1);
  page.once('dialog', d => void d.accept());
  await page.getByRole('button', { name: 'Peek solution' }).click();
  await page.getByRole('button', { name: /Run all \d+ tests/ }).click();
  await expect(page.locator('.verdict')).toContainText(/(\d+)\/\1 tests passed/);
  await expect(page.getByText(/Accepted! \+\d+ XP \(halved/)).toBeVisible();
  const earned = await xp(page);
  expect(earned).toBeGreaterThan(0);
  await expect(page.getByText('✓ solved')).toBeVisible();
  await page.getByRole('button', { name: /Run all \d+ tests/ }).click();
  await expect(page.getByText(/already solved, no extra XP/)).toBeVisible();
  expect(await xp(page)).toBe(earned);
  await page.reload();
  await expect(page.getByText('✓ solved')).toBeVisible();
  expect(await xp(page)).toBe(earned);
  expect(problems).toEqual([]);
});

test('errors are shown, not hidden: invalid input, compile errors with the failing line marked, and recovery', async ({ page }) => {
  const problems = watchProblems(page);
  await openProblem(page, 'Two Sum');
  await page.locator('input.args').fill('this is not json');
  await page.getByRole('button', { name: /Re-run|Compile & run/ }).click();
  await expect(page.locator('.err')).toContainText('Invalid input');
  await page.locator('input.args').fill('[[2,7,11,15],9]');
  await setEditor(page, 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {0, 1}\n    }\n};');
  await page.getByRole('button', { name: /Compile & run/ }).click();
  await expect(page.locator('.err.compile')).toContainText('Compile error');
  await expect(page.locator('.ln-error')).toHaveCount(1);
  await setEditor(page, 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {0, 1};\n    }\n};');
  await page.getByRole('button', { name: /Compile & run/ }).click();
  await expect(page.locator('.okline')).toContainText('Returned [0,1]');
  await expect(page.locator('.err')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('a recursive problem draws the recursion tree and a tree problem draws the tree', async ({ page }) => {
  const problems = watchProblems(page);
  await openProblem(page, 'Fibonacci Number');
  await expect(page.locator('main')).toContainText(/call|recurs/i);
  await openProblem(page, 'Height of a Binary Tree');
  await expect(page.locator('main svg, main canvas, main .viz').first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('playground: any function in the supported subset can be written, traced and re-run', async ({ page }) => {
  const problems = watchProblems(page);
  await page.goto('/#/playground');
  await expect(page.locator('.okline')).toContainText('Returned', { timeout: 45_000 });
  await setEditor(page, 'class Solution {\npublic:\n    int square(int n) {\n        int r = n * n;\n        return r;\n    }\n};');
  await page.locator('input.fn-in').fill('square');
  await page.locator('input.args').fill('[7]');
  await page.getByRole('button', { name: /Compile & run/ }).click();
  await expect(page.locator('.okline')).toContainText('Returned 49');
  await page.getByRole('button', { name: /Step into/ }).click();
  expect(await stepNow(page)).toBe(2);
  expect(problems).toEqual([]);
});

test('every playable problem page opens without a crash (sampled across all 18 steps)', async ({ page }) => {
  const problems = watchProblems(page);
  const sample = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(step => ALL_PROBLEMS.filter(p => p.step === step)[2] ?? ALL_PROBLEMS.find(p => p.step === step)!);
  for (const p of sample) {
    await page.goto(`/#/p/${p.id}`);
    await expect(page.getByRole('heading', { name: p.title, exact: true }), p.title).toBeVisible();
    await expect(page.locator('.okline, .err').first(), p.title).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Interview playbook for this topic')).toBeVisible();
  }
  expect(problems).toEqual([]);
});
