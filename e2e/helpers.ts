import { expect, Page } from '@playwright/test';

/** Records anything the browser reports as wrong: uncaught errors, console errors and Content-Security-Policy violations. */
export function watchProblems(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource.*(40[134]|503)/.test(t)) return;       // expected API refusals are asserted by the tests themselves
    problems.push(`console.error: ${t}`);
  });
  void page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`)));
  return problems;
}

/** Replaces the whole content of the (first) Monaco editor on the page, exactly as typing would (fires onChange). */
export async function setEditor(page: Page, code: string, index = 0) {
  await page.waitForFunction(() => (window as any).monaco?.editor?.getEditors?.().length > 0, undefined, { timeout: 45_000 });
  await page.evaluate(([c, i]) => { (window as any).monaco.editor.getEditors()[i as number].setValue(c as string); }, [code, index] as const);
}

export async function getEditor(page: Page, index = 0): Promise<string> {
  await page.waitForFunction(() => (window as any).monaco?.editor?.getEditors?.().length > 0, undefined, { timeout: 45_000 });
  return page.evaluate(i => (window as any).monaco.editor.getEditors()[i].getValue(), index);
}

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

export async function register(page: Page, email: string, password = 'correct horse battery', name = 'E2E User') {
  await page.goto('/#/account');
  await page.getByRole('button', { name: 'Create account' }).first().click();
  await page.getByLabel(/Display name/).fill(name);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await expect(page.getByText('Signed in', { exact: true })).toBeVisible();
}

export async function xp(page: Page): Promise<number> {
  const t = await page.locator('.hud.xp').innerText();
  return Number(t.replace(/\D/g, ''));
}
