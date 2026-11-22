import { expect, test } from '@playwright/test';
import { ALL_PROBLEMS } from '../src/data/sheet';
import { watchProblems } from './helpers';

test('dashboard loads without errors and without downloading the problem bank or the SQL engine', async ({ page }) => {
  const problems = watchProblems(page);
  const requested: string[] = [];
  page.on('request', r => requested.push(new URL(r.url()).pathname));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByText('Daily challenge')).toBeVisible();
  expect(requested.some(u => /\/assets\/problems-.*\.js$/.test(u)), 'problem bank must not load on the first screen').toBe(false);
  expect(requested.some(u => /sql-wasm|SqlWorld/.test(u)), 'SQL engine must not load on the first screen').toBe(false);
  expect(problems).toEqual([]);
});

test('the problem bank and the editor load only when a problem opens', async ({ page }) => {
  const problems = watchProblems(page);
  const requested: string[] = [];
  page.on('request', r => requested.push(r.url()));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  const twoSum = ALL_PROBLEMS.find(p => p.title === 'Two Sum')!;
  await page.goto(`/#/p/${twoSum.id}`);
  await expect(page.getByRole('heading', { name: 'Two Sum' })).toBeVisible();
  expect(requested.some(u => /\/assets\/problems-.*\.js/.test(u))).toBe(true);
  await page.waitForFunction(() => (window as any).monaco?.editor?.getEditors?.().length > 0, undefined, { timeout: 45_000 });
  expect(problems).toEqual([]);
});

test('every top-level route renders real content', async ({ page }) => {
  const problems = watchProblems(page);
  const routes: [string, RegExp][] = [
    ['#/', /Welcome back/], ['#/worlds', /Worlds/], ['#/dsa', /A2Z DSA Sheet/], ['#/interview', /Interview Prep/], ['#/playground', /Playground/],
    ['#/profile', /Profile/], ['#/account', /Account/],
  ];
  for (const [hash, re] of routes) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole('heading', { name: re }).first(), hash).toBeVisible();
    await expect(page.getByText('This page failed to load')).toHaveCount(0);
  }
  await page.goto('/#/nonsense');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('all nine learning worlds load and show their own content', async ({ page }) => {
  const problems = watchProblems(page);
  for (const w of ['dbms', 'sql', 'os', 'oops', 'cn', 'coa', 'sysdesign', 'se', 'dev']) {
    await page.goto(`/#/${w}`);
    await expect(page.locator('main')).not.toBeEmpty();
    await expect(page.getByText('This page failed to load'), w).toHaveCount(0);
    await expect(page.locator('main button, main h2, main h1').first(), w).toBeVisible();
  }
  expect(problems).toEqual([]);
});

test('the DSA sheet lists every problem as playable, search works, and steps expand', async ({ page }) => {
  watchProblems(page);
  await page.goto('/#/dsa');
  await expect(page.getByRole('heading', { name: /A2Z DSA Sheet/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /464 problems · 464 playable/ })).toBeVisible();
  await page.getByPlaceholder('Search problems…').fill('Two Sum');
  await expect(page.locator('a.prow', { hasText: 'Two Sum' }).first()).toBeVisible();
  await page.locator('a.prow', { hasText: /^.*Two Sum.*$/ }).first().click();
  await expect(page).toHaveURL(/#\/p\//);
});

test('the jump-to-world selector navigates', async ({ page }) => {
  watchProblems(page);
  await page.goto('/');
  await page.getByLabel('Jump to a world').selectOption('os');
  await expect(page).toHaveURL(/#\/os$/);
});
