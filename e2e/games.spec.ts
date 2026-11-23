import { expect, Page, test } from '@playwright/test';
import * as bs from '../src/games/bsHunt';
import * as sg from '../src/games/stackGame';
import * as pg from '../src/games/pageGame';
import * as sn from '../src/games/subnetGame';
import * as bo from '../src/games/bigO';
import * as tm from '../src/games/termMatch';
import { rng } from '../src/games/rng';
import { watchProblems, xp } from './helpers';

// Math.random is fixed so the round (seed) is known; the tests then use the game engines to play perfectly.
const SEED = Math.floor(0.25 * 2 ** 31);
const fixSeed = (page: Page) => page.addInitScript(() => { Math.random = () => 0.25; });
const open = async (page: Page, id: string, level = 1) => {
  await fixSeed(page);
  await page.goto(`/#/games/${id}`);
  await page.getByTestId(`level-${level}`).click();
};

test('the games hub lists all six games with a topic and a star count', async ({ page }) => {
  const problems = watchProblems(page);
  await page.goto('/#/games');
  await expect(page.getByRole('heading', { name: 'Games', exact: true })).toBeVisible();
  for (const id of ['bs', 'sg', 'pg', 'sn', 'bo', 'tm']) await expect(page.getByTestId(`game-${id}`)).toBeVisible();
  await expect(page.getByTestId('games-stars')).toContainText('0 / 54');
  await page.getByTestId('game-bs').click();
  await expect(page).toHaveURL(/#\/games\/bs$/);
  await expect(page.getByRole('heading', { name: 'How to play' })).toBeVisible();
  await expect(page.getByTestId('level-1')).toBeVisible();
  await page.goto('/#/games/nope');
  await expect(page.getByText('Unknown game')).toBeVisible();
  expect(problems).toEqual([]);
});

test('Binary Search Hunter: probing the middle wins 3 stars, XP is paid once, replaying pays nothing', async ({ page }) => {
  const problems = watchProblems(page);
  await open(page, 'bs');
  const rd = bs.makeRound(SEED, 1);
  await expect(page.getByTestId('bs-target')).toHaveText(String(rd.target));
  expect(await xp(page)).toBe(0);
  // a probe outside what is still possible is flagged as wasted, but the game goes on
  let s = bs.initial(rd);
  while (!s.found) {
    const idx = bs.hintIndex(s);
    await page.getByTestId(`bs-cell-${idx}`).click();
    s = bs.probe(rd, s, idx);
  }
  await expect(page.getByTestId('game-result')).toBeVisible();
  await expect(page.getByRole('img', { name: '3 of 3 stars' }).first()).toBeVisible();
  await expect(page.getByText('+24 XP for a better rating')).toBeVisible();
  expect(await xp(page)).toBe(24);
  await page.getByRole('button', { name: 'Play again' }).click();
  await page.getByTestId('bs-cell-0').click();
  await expect(page.getByTestId('bs-probes')).toHaveText('1');
  expect(problems).toEqual([]);
});

test('Binary Search Hunter: the hint, the explanation and the rules of "ruled out" are shown', async ({ page }) => {
  watchProblems(page);
  await open(page, 'bs');
  await page.getByRole('button', { name: /Hint/ }).click();
  await expect(page.locator('.bs-cell.hint')).toHaveCount(1);
  const rd = bs.makeRound(SEED, 1);
  await page.getByTestId(`bs-cell-${rd.values.indexOf(rd.target) === 0 ? 1 : 0}`).click();   // never the target itself
  await expect(page.getByTestId('bs-msg')).toContainText(/ruled out/);
  await expect(page.locator('.bs-cell.out').first()).toBeVisible();
  await expect(page.locator('.howto')).toContainText('Still possible: positions');
});

test('Bracket Balancer: wrong moves cost a mistake and are explained; perfect play earns 3 stars', async ({ page }) => {
  const problems = watchProblems(page);
  await open(page, 'sg');
  const rd = sg.makeRound(SEED, 1);
  // a deliberately wrong first move
  const first = sg.expected(sg.start(rd.strings[0]));
  const wrong = first === 'push' ? 'sg-pop' : 'sg-push';
  await page.getByTestId(wrong).click();
  await expect(page.getByTestId('sg-mistakes')).toHaveText('1');
  await expect(page.getByTestId('sg-msg')).toContainText('Not quite');
  for (let n = 0; n < rd.strings.length; n++) {
    let st = sg.start(rd.strings[n]);
    while (!st.over) {
      const a = sg.expected(st);
      await page.getByTestId({ push: 'sg-push', pop: 'sg-pop', reject: 'sg-reject', accept: 'sg-accept' }[a]).click();
      st = sg.apply(st, a);
    }
    await page.getByTestId('sg-next').click();
  }
  await expect(page.getByTestId('game-result')).toBeVisible();
  await expect(page.getByRole('img', { name: '2 of 3 stars' }).first()).toBeVisible();      // one mistake → 2 stars
  expect(problems).toEqual([]);
});

test('Page Fault Predictor: predictions follow the real FIFO/LRU simulation', async ({ page }) => {
  const problems = watchProblems(page);
  await open(page, 'pg');
  const rd = pg.makeRound(SEED, 1);
  for (let k = 0; k < rd.refs.length; k++) {
    await expect(page.getByTestId('pg-page')).toHaveText(String(rd.refs[k]));
    await page.getByTestId(pg.truth(rd, k) === 'hit' ? 'pg-hit' : 'pg-fault').click();
    await expect(page.getByTestId('pg-msg')).toContainText('Correct');
    await page.getByTestId('pg-next').click();
  }
  await expect(page.getByTestId('game-result')).toBeVisible();
  await expect(page.getByRole('img', { name: '3 of 3 stars' }).first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('Subnet Sniper: every answer is checked, explained, and a perfect round earns 3 stars', async ({ page }) => {
  const problems = watchProblems(page);
  await open(page, 'sn', 2);
  const rd = sn.makeRound(SEED, 2);
  for (const q of rd.questions) {
    await expect(page.getByTestId('sn-q')).toHaveText(q.prompt);
    await page.getByTestId(`sn-opt-${q.correct}`).click();
    await expect(page.getByTestId('sn-msg')).toContainText('Correct');
    await page.getByTestId('sn-next').click();
  }
  await expect(page.getByRole('img', { name: '3 of 3 stars' }).first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('Subnet Sniper: a wrong answer is marked and the working is shown', async ({ page }) => {
  watchProblems(page);
  await open(page, 'sn');
  const q = sn.makeRound(SEED, 1).questions[0];
  const wrong = q.options.findIndex((_, i) => i !== q.correct);
  await page.getByTestId(`sn-opt-${wrong}`).click();
  await expect(page.getByTestId('sn-msg')).toContainText('Not quite');
  await expect(page.locator('.opt-big.right')).toHaveCount(1);
  await expect(page.locator('.opt-big.wrong')).toHaveCount(1);
  await expect(page.getByTestId('sn-correct')).toHaveText('0');
});

test('Big-O Match: answers are confirmed by measured step counts shown from the real interpreter', async ({ page }) => {
  const problems = watchProblems(page);
  await open(page, 'bo');
  const round = bo.makeRound(rng(SEED), 1);
  for (const sn0 of round) {
    await expect(page.getByTestId('bo-code')).toContainText(sn0.code.split('\n')[0]);
    await page.getByTestId(`bo-${sn0.label}`).click();
    await expect(page.getByTestId('bo-msg')).toContainText('Correct');
    await expect(page.locator('.mrow')).toHaveCount(4);                                     // four measured sizes
    await expect(page.locator('.mrow').first()).toContainText(/steps/);
    await page.getByTestId('bo-next').click();
  }
  await expect(page.getByRole('img', { name: '3 of 3 stars' }).first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('Term Match: mismatches flip back, matches stay, and finishing in the minimum moves earns 3 stars', async ({ page }) => {
  const problems = watchProblems(page);
  await open(page, 'tm');
  const deck = tm.makeDeck(SEED, 1);
  const box = await page.locator('.tm-card').first().boundingBox();
  expect(box!.height, 'cards must not inherit the Developer World terminal height').toBeLessThan(200);
  const idOf = (pair: number, kind: 'term' | 'def') => deck.cards.find(c => c.pair === pair && c.kind === kind)!.id;
  // a mismatch first: two cards of different pairs
  await page.getByTestId(`tm-card-${idOf(0, 'term')}`).click();
  await page.getByTestId(`tm-card-${idOf(1, 'def')}`).click();
  await expect(page.getByTestId('tm-moves')).toHaveText('1');
  await expect(page.locator('.tm-card.up')).toHaveCount(2);
  await expect(page.locator('.tm-card.up')).toHaveCount(0, { timeout: 4000 });               // flipped back
  for (let p = 0; p < deck.pairs; p++) {
    await page.getByTestId(`tm-card-${idOf(p, 'term')}`).click();
    await page.getByTestId(`tm-card-${idOf(p, 'def')}`).click();
    await expect(page.locator('.tm-card.matched')).toHaveCount(2 * (p + 1), { timeout: 4000 });
  }
  await expect(page.getByTestId('game-result')).toBeVisible();
  await expect(page.getByRole('img', { name: '3 of 3 stars' }).first()).toBeVisible();       // pairs + 1 moves is within 1.6 × pairs
  expect(problems).toEqual([]);
});

test('stars and XP persist across reloads and show on the hub', async ({ page }) => {
  watchProblems(page);
  await open(page, 'pg');
  const rd = pg.makeRound(SEED, 1);
  for (let k = 0; k < rd.refs.length; k++) {
    await page.getByTestId(pg.truth(rd, k) === 'hit' ? 'pg-hit' : 'pg-fault').click();
    await page.getByTestId('pg-next').click();
  }
  await expect(page.getByTestId('game-result')).toBeVisible();
  const earned = await xp(page);
  expect(earned).toBe(24);
  await page.goto('/#/games');
  await page.reload();
  expect(await xp(page)).toBe(earned);
  await expect(page.getByTestId('games-stars')).toContainText('3 / 54');
});

test('switching straight from one game to another shows the new game\'s level picker (regression)', async ({ page }) => {
  watchProblems(page);
  await open(page, 'bs', 3);
  await expect(page.getByTestId('bs-target')).toBeVisible();
  await page.goto('/#/games/sg');
  await expect(page.getByRole('heading', { name: 'Bracket Balancer' })).toBeVisible();
  await expect(page.getByTestId('level-1')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Binary Search Hunter' })).toBeVisible();
  await expect(page.getByTestId('level-3')).toBeVisible();
});

test('games work on a phone without horizontal scrolling', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await fixSeed(page);
  for (const id of ['bs', 'sg', 'pg', 'sn', 'bo', 'tm']) {
    await page.goto(`http://127.0.0.1:4173/#/games/${id}`);
    await page.getByTestId('level-3').click();
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `overflow in ${id}`).toBeLessThanOrEqual(1);
  }
  await ctx.close();
});
