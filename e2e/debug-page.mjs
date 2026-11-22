// node e2e/debug-page.mjs "<problem title>"   prints uncaught errors / console errors for a problem page
import { chromium } from '@playwright/test';
const title = process.argv[2] ?? 'Reverse a LL';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', e => console.log('PAGEERROR:', e.message, '\n', (e.stack ?? '').split('\n').slice(0, 6).join('\n')));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE.ERROR:', m.text().slice(0, 400)); });
await page.goto('http://127.0.0.1:4173/#/dsa');
await page.getByPlaceholder('Search problems…').fill(title);
console.log('matches:', await page.locator('a.prow').count(), await page.locator('a.prow').first().innerText().catch(() => '(none)'));
await page.locator('a.prow').first().click();
await page.waitForSelector('.okline', { timeout: 30000 });
for (let i = 0; i < 40; i++) {
  await page.getByRole('button', { name: /Step into/ }).click().catch(() => {});
  if (await page.getByText('This page failed to load').count()) { console.log('CRASHED after step', i + 1); break; }
}
console.log('failed boundary visible:', await page.getByText('This page failed to load').count());
await browser.close();
