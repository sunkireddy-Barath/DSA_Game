import { expect, test } from '@playwright/test';
import { CHALLENGES } from '../src/sql/challenges';
import { SQL_LESSONS } from '../src/sql/lessons';
import { getEditor, setEditor, watchProblems, xp } from './helpers';

const openLab = async (page: import('@playwright/test').Page) => {
  await page.goto('/#/sql');
  await expect(page.getByText('Loading SQLite engine…')).toHaveCount(0, { timeout: 45_000 });
  await page.getByRole('button', { name: 'Free query lab' }).click();
};
const runQuery = async (page: import('@playwright/test').Page, sql: string) => {
  await setEditor(page, sql);
  await page.locator('#sql-run').click();
};

test('SQL engine loads (WebAssembly, under the production CSP) and runs a real query with stages and EXPLAIN', async ({ page }) => {
  const problems = watchProblems(page);
  await openLab(page);
  await runQuery(page, 'SELECT name, marks FROM Students WHERE marks > 80 ORDER BY marks DESC, name');
  await expect(page.getByText(/Result\s+· 4 row\(s\)/)).toBeVisible();
  const table = page.locator('.sql-table-wrap').nth(1);
  await expect(table).toContainText('Divya');
  await expect(table).toContainText('92');
  await expect(page.getByText('Logical processing flow')).toBeVisible();
  await expect(page.getByText('EXPLAIN QUERY PLAN')).toBeVisible();
  await expect(page.locator('pre.src.small').last()).toContainText(/SCAN|SEARCH/);
  // the stepper walks through the real intermediate results
  await page.getByRole('button', { name: 'Next ▶' }).click();
  await expect(page.getByText(/^2\. WHERE$/).first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('invalid SQL shows the real SQLite error and a helpful explanation instead of crashing', async ({ page }) => {
  const problems = watchProblems(page);
  await openLab(page);
  await runQuery(page, 'SELECT * FROM Student');
  await expect(page.getByText('SQL error:')).toBeVisible();
  await expect(page.getByText(/no such table: Student/)).toBeVisible();
  await expect(page.getByText(/There is no table called "Student"/)).toBeVisible();
  await runQuery(page, 'SELECT FROM Students');
  await expect(page.getByText(/syntax error/i)).toBeVisible();
  await runQuery(page, 'SELECT name FROM Students WHERE COUNT(*) > 1');
  await expect(page.getByText(/WHERE runs before grouping/)).toBeVisible();
  // the page is still usable after errors
  await runQuery(page, 'SELECT COUNT(*) AS n FROM Students');
  await expect(page.getByText(/Result\s+· 1 row\(s\)/)).toBeVisible();
  expect(problems).toEqual([]);
});

test('data changes really persist in the session until the database is reset', async ({ page }) => {
  watchProblems(page);
  await openLab(page);
  await runQuery(page, "INSERT INTO Students VALUES (7, 'Gita', 30, 71)");
  await expect(page.getByText(/OK · 1 row\(s\) affected/)).toBeVisible();
  await runQuery(page, 'SELECT COUNT(*) FROM Students');
  await expect(page.locator('.sql-table-wrap').nth(1)).toContainText('7');
  await page.getByRole('button', { name: '↺ Reset database' }).click();
  await runQuery(page, 'SELECT COUNT(*) FROM Students');
  await expect(page.locator('.sql-table-wrap').nth(1)).toContainText('6');
});

test('a challenge accepts the right query (+XP once) and rejects a wrong one with the rows it returned', async ({ page }) => {
  const problems = watchProblems(page);
  await page.goto('/#/sql');
  await expect(page.getByText('Loading SQLite engine…')).toHaveCount(0, { timeout: 45_000 });
  const c = CHALLENGES.find(x => x.id === 'q02')!;
  await page.getByRole('button', { name: new RegExp(`L${c.level} ${c.title}`) }).click();
  await expect(page.getByRole('heading', { name: new RegExp(c.title) })).toBeVisible();
  // wrong query first
  await runQuery(page, 'SELECT name FROM Students');
  await page.getByRole('button', { name: /Check my answer/ }).click();
  await expect(page.getByText(/Expected 4 row\(s\) but got 6/)).toBeVisible();
  expect(await xp(page)).toBe(0);
  // correct query
  await runQuery(page, c.solution);
  await page.getByRole('button', { name: /Check my answer/ }).click();
  await expect(page.getByText(/Accepted! \+\d+ XP/)).toBeVisible();
  const gained = await xp(page);
  expect(gained).toBeGreaterThan(0);
  await page.getByRole('button', { name: /Check my answer/ }).click();
  await expect(page.getByText(/no extra XP/)).toBeVisible();
  expect(await xp(page)).toBe(gained);
  // hints cost XP and are revealed progressively
  await page.getByRole('button', { name: /Hint \(0\// }).click();
  await expect(page.locator('ol.hints li')).toHaveCount(1);
  expect(problems).toEqual([]);
});

test('every one of the SQL challenges accepts its own reference solution in the real UI (spot check across levels)', async ({ page }) => {
  watchProblems(page);
  await page.goto('/#/sql');
  await expect(page.getByText('Loading SQLite engine…')).toHaveCount(0, { timeout: 45_000 });
  for (const id of ['q01', 'q10', 'q20', 'q24', 'q39', 'q43']) {
    const c = CHALLENGES.find(x => x.id === id)!;
    await page.getByRole('button', { name: new RegExp(`L${c.level} ${c.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click();
    await runQuery(page, c.solution);
    await page.getByRole('button', { name: /Check my answer/ }).click();
    await expect(page.getByText(/Accepted! \+\d+ XP|Accepted again/), id).toBeVisible();
  }
});

test('lessons show real runnable examples that open in the lab and the knowledge check gives feedback', async ({ page }) => {
  const problems = watchProblems(page);
  await page.goto('/#/sql');
  await expect(page.getByText('Loading SQLite engine…')).toHaveCount(0, { timeout: 45_000 });
  const l = SQL_LESSONS.find(x => x.id === 'l-set')!;
  await page.getByRole('button', { name: l.title }).click();
  await expect(page.getByRole('heading', { name: new RegExp(l.title.slice(0, 20)) })).toBeVisible();
  await page.getByRole('button', { name: l.quiz.options[l.quiz.answer], exact: true }).click();
  await expect(page.getByText(l.quiz.why)).toBeVisible();
  await page.getByRole('button', { name: '▶ Open in the lab' }).click();
  await expect(page.getByRole('heading', { name: 'Query lab' })).toBeVisible();
  expect((await getEditor(page)).replace(/\s+/g, ' ')).toContain(l.example.slice(0, 40));
  await page.locator('#sql-run').click();
  await expect(page.getByText(/Result/)).toBeVisible();
  expect(problems).toEqual([]);
});
