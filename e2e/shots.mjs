// Screenshot helper for design review:  node e2e/shots.mjs <outDir> [dark|light]   (needs `npx vite preview --port 4173` running)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots';
const scheme = process.argv[3] ?? 'dark';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const base = 'http://127.0.0.1:4173';
const simple = [['dashboard', '/#/'], ['dsa', '/#/dsa'], ['sql', '/#/sql'], ['interview', '/#/interview'], ['account', '/#/account'], ['os', '/#/os'], ['dbms', '/#/dbms']];
for (const [vw, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: size, colorScheme: scheme });
  const page = await ctx.newPage();
  for (const [name, url] of simple) {
    await page.goto(base + url);
    await page.waitForTimeout(name === 'sql' ? 3500 : 1000);
    await page.screenshot({ path: `${out}/${vw}-${name}.png` });
  }
  for (const [name, title, steps] of [['bsearch', 'Floor/Ceil in Sorted Array', 9], ['recursion', 'Fibonacci Number', 12], ['list', 'Reverse a LL', 14], ['tree', 'Height of a Binary Tree', 10], ['twosum', 'Two Sum', 8]]) {
    await page.goto(base + '/#/dsa');
    await page.getByPlaceholder('Search problems…').fill(title);
    await page.locator('a.prow').first().click();
    await page.waitForSelector('.okline', { timeout: 30000 });
    for (let i = 0; i < steps; i++) await page.getByRole('button', { name: /Step into/ }).click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${vw}-${name}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log('done');
