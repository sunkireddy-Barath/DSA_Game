import { expect, Page, test } from '@playwright/test';
import { ALL_PROBLEMS } from '../src/data/sheet';
import { watchProblems } from './helpers';

const idOf = (title: string) => ALL_PROBLEMS.find(p => p.title === title)!.id;
const open = async (page: Page, title: string) => {
  await page.goto(`/#/p/${idOf(title)}`);
  await expect(page.locator('.okline')).toContainText('Returned', { timeout: 45_000 });
};
const stepInto = async (page: Page, n: number) => { for (let i = 0; i < n; i++) await page.getByRole('button', { name: /Step into/ }).click(); };

test.describe('diagrams explain themselves', () => {
  test('binary search: pointers are labelled, the active range is shaded and explained, a legend and a narration are shown', async ({ page }) => {
    const problems = watchProblems(page);
    await open(page, 'Floor/Ceil in Sorted Array');
    await stepInto(page, 9);
    await expect(page.locator('.ptr-tag', { hasText: /^low$/ }).first()).toBeVisible();
    await expect(page.locator('.ptr-tag', { hasText: /^high$/ }).first()).toBeVisible();
    await expect(page.locator('.ptr-tag', { hasText: /^mid$/ }).first()).toBeVisible();
    await expect(page.locator('.range-note')).toContainText(/Active range low = \d+ … high = \d+/);
    await expect(page.locator('.cell.in').first()).toBeVisible();
    await expect(page.locator('.legend-row').first()).toContainText('variable currently holding that index');
    const narr = page.getByTestId('narration');
    await expect(narr).toBeVisible();
    await expect(narr).toContainText(/step \d+\/\d+/);
    await expect(narr).toContainText(/Next:/);
    // narration follows the step: moving forward changes what it says
    const before = await narr.innerText();
    await stepInto(page, 2);
    expect(await narr.innerText()).not.toBe(before);
    expect(problems).toEqual([]);
  });

  test('narration states the result of a condition and where control goes', async ({ page }) => {
    watchProblems(page);
    await open(page, 'If Else statements');
    await stepInto(page, 1);
    await expect(page.getByTestId('narration')).toContainText(/Test if \(marks >= 75\) → true/);
    await expect(page.getByTestId('narration')).toContainText(/so the block below runs/);
  });

  test('recursion tree has a legend and an explanation, and its boxes name the node each call works on', async ({ page }) => {
    watchProblems(page);
    await open(page, 'Height of a Binary Tree');
    await stepInto(page, 12);
    await expect(page.locator('.howto', { hasText: 'Each box is one function call' })).toBeVisible();
    await expect(page.locator('.legend-row', { hasText: 'call running right now' })).toBeVisible();
    await expect(page.locator('svg .tl').first()).toContainText(/maxDepth\(\d/);      // node value, not just "maxDepth…"
  });

  test('stepping through a whole linked-list trace never crashes (regression: nullptr variables broke the inspector)', async ({ page }) => {
    const problems = watchProblems(page);
    await page.goto('/#/dsa');
    await page.getByPlaceholder('Search problems…').fill('Reverse a LL');
    await page.locator('a.prow').first().click();
    await expect(page.locator('.okline')).toContainText('Returned', { timeout: 45_000 });
    for (let i = 0; i < 30; i++) {
      await page.getByRole('button', { name: /Step into/ }).click({ timeout: 3000 }).catch(() => {});
      await expect(page.getByText('This page failed to load')).toHaveCount(0);
    }
    await expect(page.locator('.howto', { hasText: 'Each box is a node' })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('other worlds explain their diagrams too (OS Gantt, paging, B+ tree, TCP, pipeline)', async ({ page }) => {
    watchProblems(page);
    await page.goto('/#/os');
    await expect(page.getByText(/Gantt chart: time runs left to right/)).toBeVisible();
    await page.getByRole('button', { name: 'Page Replacement' }).click();
    await expect(page.getByText(/Each column is one page reference/)).toBeVisible();
    await expect(page.locator('.legend-row', { hasText: 'page fault' })).toBeVisible();
    await page.goto('/#/dbms');
    await page.getByRole('button', { name: /B\+ tree/i }).first().click();
    await page.getByRole('button', { name: 'Insert sample keys' }).click();
    await expect(page.getByText(/Each box is a node holding sorted keys/)).toBeVisible();
    await page.goto('/#/cn');
    await page.getByRole('button', { name: /TCP/i }).first().click();
    await expect(page.getByText(/segments travelling between them/)).toBeVisible();
    await page.goto('/#/coa');
    await page.getByRole('button', { name: 'Pipelining', exact: true }).click();
    await expect(page.getByText(/Each row is an instruction and each column a clock cycle/)).toBeVisible();
    await expect(page.locator('.legend-row', { hasText: 'IF fetch' })).toBeVisible();
  });
});

test.describe('design system', () => {
  test('light / dark theme toggle switches the whole app, persists across reloads, and the editor follows', async ({ page }) => {
    watchProblems(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/#/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(bgDark);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');                  // remembered
    await open(page, 'Two Sum');
    await page.waitForFunction(() => (window as any).monaco?.editor?.getEditors?.().length > 0);
    await expect(page.locator('.monaco-editor').first()).toHaveClass(/vs(?!-dark)/);            // light editor theme (not vs-dark)
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.locator('.monaco-editor').first()).toHaveClass(/vs-dark/);
  });

  test('first visit follows the system colour scheme', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:4173/#/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await ctx.close();
  });

  test('on a phone the navigation collapses into a menu that opens, navigates and closes', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const problems = watchProblems(page);
    await page.goto('http://127.0.0.1:4173/#/');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Interview', exact: true })).toBeHidden();
    const menu = page.getByRole('button', { name: 'Menu' });
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('link', { name: 'Interview', exact: true }).click();
    await expect(page).toHaveURL(/#\/interview$/);
    await expect(page.getByRole('link', { name: 'Interview', exact: true })).toBeHidden();       // menu closed after navigating
    // no horizontal scrolling on the main pages
    for (const hash of ['#/', '#/dsa', '#/interview', '#/account', '#/worlds']) {
      await page.goto(`http://127.0.0.1:4173/${hash}`);
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on ${hash}`).toBeLessThanOrEqual(1);
    }
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('keyboard users can see where focus is', async ({ page }) => {
    watchProblems(page);
    await page.goto('/#/');
    await page.keyboard.press('Tab');
    const shadow = await page.evaluate(() => getComputedStyle(document.activeElement as Element).boxShadow);
    expect(shadow).not.toBe('none');
  });
});
