import { expect, Page, test } from '@playwright/test';
import { QA_BANK } from '../src/interview/qa';
import { ALL_PROBLEMS } from '../src/data/sheet';
import { register, setEditor, uniqueEmail, watchProblems, xp } from './helpers';

const twoSum = ALL_PROBLEMS.find(p => p.title === 'Two Sum')!;
const openTwoSum = async (page: Page) => {
  await page.goto(`/#/p/${twoSum.id}`);
  await expect(page.locator('.okline')).toContainText('Returned', { timeout: 45_000 });
};
const answerQa = async (page: Page, subject: string, label: string) => {
  await page.goto('/#/interview');
  await page.getByRole('button', { name: label, exact: true }).click();
  const q = QA_BANK.find(x => x.subject === subject)!;
  await page.getByRole('button', { name: q.mcq.options[q.mcq.correct], exact: true }).click();
  await expect(page.getByText('Correct.')).toBeVisible();
};

test.describe('accounts', () => {
  test('register, see server capabilities, sign out, reject a wrong password, sign back in', async ({ page }) => {
    const problems = watchProblems(page);
    const email = uniqueEmail('acct');
    await page.goto('/#/account');
    await expect(page.getByTestId('capabilities')).toContainText('online');
    await expect(page.getByTestId('capabilities')).toContainText('sandbox: ✅ available'.replace('sandbox', 'C++17/20 sandbox'));
    await expect(page.getByTestId('capabilities')).toContainText('AI tutor: ✅ configured');
    await register(page, email, 'correct horse battery', 'Ada');
    await expect(page.getByTestId('nav-account')).toContainText('Ada');
    await expect(page.getByTestId('sync-status')).toContainText(/Progress saved to your account/);
    page.once('dialog', d => void d.accept());
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByTestId('nav-account')).toHaveText('Sign in');
    // wrong password: server message is shown, still signed out
    await expect(page.getByRole('tablist').getByRole('button', { name: 'Sign in' })).toHaveClass(/on/);   // back on the sign-in tab after signing out
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel(/^Password/).fill('definitely wrong');
    await page.getByRole('button', { name: 'Sign in' }).last().click();
    await expect(page.getByRole('alert')).toContainText('incorrect e-mail or password');
    await expect(page.getByTestId('nav-account')).toHaveText('Sign in');
    // right password
    await page.getByLabel(/^Password/).fill('correct horse battery');
    await page.getByRole('button', { name: 'Sign in' }).last().click();
    await expect(page.getByText('Signed in', { exact: true })).toBeVisible();
    await expect(page.getByTestId('nav-account')).toContainText('Ada');
    expect(problems).toEqual([]);
  });

  test('client-side and server-side validation errors are shown to the user', async ({ page }) => {
    watchProblems(page);
    await page.goto('/#/account');
    await page.getByRole('button', { name: 'Create account' }).first().click();
    await page.getByLabel('E-mail').fill('x@example.com');
    await page.getByLabel(/^Password/).fill('short');                       // browser-enforced minlength blocks the submit
    await page.getByRole('button', { name: 'Create account' }).last().click();
    await expect(page.getByText('Signed in', { exact: true })).toHaveCount(0);
    // duplicate e-mail → 409 from the server
    const email = uniqueEmail('dup');
    await register(page, email);
    page.once('dialog', d => void d.accept());
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('button', { name: 'Create account' }).first().click();
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel(/^Password/).fill('correct horse battery');
    await page.getByRole('button', { name: 'Create account' }).last().click();
    await expect(page.getByRole('alert')).toContainText('already exists');
  });

  test('progress follows the account: it is restored from the server after local data is wiped', async ({ page }) => {
    const problems = watchProblems(page);
    await register(page, uniqueEmail('sync'));
    await answerQa(page, 'dbms', 'DBMS');
    await expect.poll(() => xp(page)).toBe(10);
    await page.goto('/#/account');
    await expect(page.getByTestId('sync-status')).toContainText(/Progress saved/, { timeout: 20_000 });
    await page.getByRole('button', { name: 'Sync now' }).click();
    await expect(page.getByTestId('sync-status')).toContainText(/Progress saved/);
    // wipe everything stored in the browser except the session cookie, then reload
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect.poll(() => xp(page), { timeout: 20_000 }).toBe(10);
    expect(problems).toEqual([]);
  });

  test('progress made while signed out is merged into the account at sign-in, and never leaks to the next person', async ({ page }) => {
    watchProblems(page);
    await answerQa(page, 'sql', 'SQL');                                     // anonymous progress: +10 XP
    expect(await xp(page)).toBe(10);
    await register(page, uniqueEmail('merge-a'));
    await expect.poll(() => xp(page)).toBe(10);                             // kept and saved to account A
    page.once('dialog', d => void d.accept());
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect.poll(() => xp(page)).toBe(0);                              // signing out clears this browser
    await register(page, uniqueEmail('merge-b'));
    await page.waitForTimeout(1500);
    expect(await xp(page)).toBe(0);                                         // account B starts clean
  });

  test('reset progress erases it on the server too', async ({ page }) => {
    const problems = watchProblems(page);
    await register(page, uniqueEmail('reset'));
    await answerQa(page, 'os', 'Operating Systems');
    await expect.poll(() => xp(page)).toBe(10);
    await page.goto('/#/profile');
    page.once('dialog', d => void d.accept());
    await page.getByRole('button', { name: 'Reset progress' }).click();
    await expect.poll(() => xp(page)).toBe(0);
    await page.waitForTimeout(3500);                                        // let the auto-sync run
    await page.reload();
    await page.waitForTimeout(1500);
    expect(await xp(page)).toBe(0);
    expect(problems).toEqual([]);
  });

  test('an expired session is detected: sync fails visibly and the user is asked to sign in again', async ({ page, context }) => {
    watchProblems(page);
    await register(page, uniqueEmail('expiry'));
    await expect(page.getByTestId('sync-status')).toContainText(/Progress saved/, { timeout: 20_000 });
    await context.clearCookies();                                           // the server no longer recognises this browser
    await page.getByRole('button', { name: 'Sync now' }).click();
    await expect(page.getByTestId('nav-account')).toHaveText('Sign in');
    await expect(page.getByRole('alert')).toContainText('Your session expired');
    await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible();
  });

  test('when the backend is unreachable the app says so and keeps working locally', async ({ page }) => {
    await page.route('**/api/**', r => r.abort());
    await page.goto('/#/account');
    await expect(page.getByRole('alert').first()).toContainText('backend is not reachable');
    await expect(page.getByRole('button', { name: 'Sign in' }).last()).toBeDisabled();
    await answerQa(page, 'dev', 'Git and Linux');                          // local features still work
    expect(await xp(page)).toBe(10);
  });
});

test.describe('real C++17/20 execution (sandbox)', () => {
  test('is locked with a clear message until the user signs in', async ({ page }) => {
    watchProblems(page);
    await openTwoSum(page);
    await page.getByRole('button', { name: 'g++ Run' }).click();
    await expect(page.getByTestId('native-gate')).toContainText('Sign in to run code on the real compiler');
    await expect(page.getByTestId('native-run')).toBeDisabled();
  });

  test('runs a function-style solution (no main) on g++, matches the tracer, runs every test, and reports compile errors with the line marked', async ({ page }) => {
    const problems = watchProblems(page);
    await register(page, uniqueEmail('native'));
    await openTwoSum(page);
    await page.getByRole('button', { name: 'g++ Run' }).click();
    await expect(page.getByTestId('native-gate')).toHaveCount(0);

    // one input: g++ result + parity with the in-browser tracer
    await page.getByTestId('native-run').click();
    await expect(page.getByTestId('native-result')).toContainText('g++ returned [0,1]', { timeout: 60_000 });
    await expect(page.getByTestId('parity-ok')).toBeVisible();

    // all hidden tests on the real compiler
    await page.getByTestId('native-run-all').click();
    await expect(page.getByTestId('native-batch-summary')).toHaveText(/^(\d+)\/\1 tests passed on g\+\+ \(c\+\+17\)$/, { timeout: 60_000 });
    expect(await page.locator('.native .trow.ok').count()).toBeGreaterThanOrEqual(3);

    // a wrong solution fails on g++ with expected/got
    await setEditor(page, 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {0, 0};\n    }\n};');
    await page.getByTestId('native-run-all').click();
    await expect(page.getByTestId('native-batch-summary')).toHaveText(/^0\/\d+ tests passed/, { timeout: 60_000 });
    await expect(page.locator('.native .trow.fail').first()).toContainText('expected');

    // compile error: g++'s own message, in the user's own line numbers, and the line is marked in the editor
    await setEditor(page, 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {0, 1}\n    }\n};');
    await page.getByTestId('native-run').click();
    await expect(page.getByTestId('native-result')).toContainText('Compile error', { timeout: 60_000 });
    await expect(page.getByTestId('native-result')).toContainText(/solution\.cpp:\d+:\d+: error/);
    await expect(page.locator('.ln-error')).toHaveCount(1);
    expect(problems).toEqual([]);
  });

  test('C++20 features compile only when C++20 is selected', async ({ page }) => {
    watchProblems(page);
    await register(page, uniqueEmail('cpp20'));
    await openTwoSum(page);
    await page.getByRole('button', { name: 'g++ Run' }).click();
    await setEditor(page, 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        ranges::sort(nums);\n        return {0, 1};\n    }\n};');
    await page.getByLabel('C++ standard').selectOption('c++17');
    await page.getByTestId('native-run').click();
    await expect(page.getByTestId('native-result')).toContainText('Compile error', { timeout: 60_000 });
    await page.getByLabel('C++ standard').selectOption('c++20');
    await page.getByTestId('native-run').click();
    await expect(page.getByTestId('native-result')).toContainText('g++ returned [0,1]', { timeout: 60_000 });
  });

  test('infinite loops and crashes are contained and reported, not hung', async ({ page }) => {
    watchProblems(page);
    await register(page, uniqueEmail('limits'));
    await openTwoSum(page);
    await page.getByRole('button', { name: 'g++ Run' }).click();
    await setEditor(page, 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        while (true) {}\n        return {};\n    }\n};');
    await page.getByTestId('native-run').click();
    await expect(page.getByTestId('native-result')).toContainText('Time limit exceeded', { timeout: 60_000 });
    await setEditor(page, 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        int* p = nullptr;\n        return {*p, 1};\n    }\n};');
    await page.getByTestId('native-run').click();
    await expect(page.getByTestId('native-result')).toContainText(/crashed|signal 11/, { timeout: 60_000 });
  });

  test('a server-side refusal (rate limit / bad input) is shown as a readable message', async ({ page }) => {
    watchProblems(page);
    await register(page, uniqueEmail('badinput'));
    await openTwoSum(page);
    await page.getByRole('button', { name: 'g++ Run' }).click();
    await page.locator('input.args').fill('[[2,7,11,15]]');                      // wrong number of arguments
    await page.getByTestId('native-run').click();
    await expect(page.getByTestId('native-error')).toContainText(/takes 2 argument/);
    await page.locator('input.args').fill('nope');
    await page.getByTestId('native-run').click();
    await expect(page.getByTestId('native-error')).toContainText(/JSON array/);
  });
});

test.describe('AI tutor (talking to a stand-in for the Anthropic API)', () => {
  test('sends the learner\'s code, last run and current trace step, and shows the answer', async ({ page, request }) => {
    const problems = watchProblems(page);
    await register(page, uniqueEmail('tutor'));
    await openTwoSum(page);
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Step into/ }).click();
    await page.getByRole('button', { name: 'Tutor', exact: true }).click();
    await expect(page.getByTestId('ai-gate')).toHaveCount(0);
    await page.getByLabel('Help level').selectOption('hint');
    await page.getByLabel('Question for the tutor').fill('Why does the loop start at 0?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.locator('.ai-tutor .msg.assistant')).toContainText('FAKE-LLM answer (level hint)', { timeout: 30_000 });
    await expect(page.locator('.ai-tutor .msg.assistant')).toContainText('step 4 of');
    await expect(page.locator('.ai-tutor .msg.user')).toContainText('Why does the loop start at 0?');
    // what the model actually received
    const last = await (await request.get('http://127.0.0.1:9911/last')).json();
    const sent: string = last.messages.at(-1).content;
    expect(sent).toContain('Two Sum');
    expect(sent).toContain('<student_code>');
    expect(sent).toContain('twoSum');
    expect(sent).toMatch(/step 4 of \d+; line \d+/);
    expect(sent).toContain('in-browser tracer: returned');
    expect(sent).toContain('Help level requested: hint');
    expect(last.system).toContain('Never invent program state');
    expect(JSON.stringify(last)).not.toContain('e2e-key');                      // the API key never appears in the payload
    // follow-up question keeps the conversation history
    await page.getByLabel('Question for the tutor').fill('And what is the time complexity?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.locator('.ai-tutor .msg.assistant')).toHaveCount(2, { timeout: 30_000 });
    const last2 = await (await request.get('http://127.0.0.1:9911/last')).json();
    expect(last2.messages.length).toBe(3);
    expect(problems).toEqual([]);
  });

  test('an upstream failure is reported to the learner without leaking details', async ({ page }) => {
    watchProblems(page);
    await register(page, uniqueEmail('tutor-err'));
    await openTwoSum(page);
    await page.getByRole('button', { name: 'Tutor', exact: true }).click();
    await page.getByLabel('Question for the tutor').fill('trigger-upstream-error');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.getByTestId('ai-error')).toContainText('the tutor service returned an error');
    await expect(page.getByTestId('ai-error')).not.toContainText('boom');
    await page.getByLabel('Question for the tutor').fill('a normal question now');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.locator('.ai-tutor .msg.assistant')).toContainText('FAKE-LLM', { timeout: 30_000 });   // recovers
  });

  test('is locked until sign-in and the Ask button needs a question', async ({ page }) => {
    watchProblems(page);
    await openTwoSum(page);
    await page.getByRole('button', { name: 'Tutor', exact: true }).click();
    await expect(page.getByTestId('ai-gate')).toContainText('Sign in to use the AI tutor');
    await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();
  });
});
