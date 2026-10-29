// The Cubes Table with real typing and clicking (real Chromium): Easy wrong then right, Medium with a GCF, the sign buttons, Enter.
const assert = require('assert');
const C = require('../../../js/cubes.js');
module.exports = { name: 'browser:play-cubes', tier: 'browser', covers: ['js/cubes.js', 'js/cubes-game.js', 'css/style.css', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'index.html'], timeout: 600000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const info = () => page.evaluate(() => ({ chips: Store.get().chips, state: CubesGame.state(), problem: CubesGame.problem, solved: (Store.get().solved || {}).cubes || 0 }));
  const state = st => page.waitForFunction(s => CubesGame.state() === s, { timeout: 20000 }, st);
  const setSign = async (k, v) => { for (let i = 0; i < 3; i++) { if ((await page.$eval(`[data-box="${k}"]`, e => e.textContent)) === (v > 0 ? '+' : C.MINUS)) return; await page.click(`[data-box="${k}"]`); } };
  const fill = async (a, hasG) => { if (hasG) { await page.click('[data-box="g"]'); await page.keyboard.type(String(a.g)); } await setSign('s1', a.s1); await page.click('[data-box="a"]'); await page.keyboard.type(String(a.a)); await setSign('s2', a.s2); await page.click('[data-box="b"]'); await page.keyboard.type(String(a.b)); await page.click('[data-box="c"]'); await page.keyboard.type(String(a.c)); };
  const open = lv => page.evaluate(l => { CubesGame.open(); document.querySelectorAll('#cub-levels .bet')[l - 1].click(); }, lv);
  await open(1); await state('playing'); let s = await info(), p = s.problem; const c0 = s.chips;
  const sizes = await page.evaluate(() => [...document.querySelectorAll('#cub-form input, #cub-form .cub-sign')].map(b => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)))); assert.ok(sizes.every(h => h >= 44), `boxes are big enough (${sizes})`);
  await page.click('#cub-check'); await g.sleep(150); assert.match(await page.evaluate(() => document.getElementById('cub-msg').innerText), /Fill in every box first/); assert.strictEqual((await info()).state, 'playing');
  const r = C.answerOf(p); await fill({ ...r, s2: r.s1, c: r.c + 1 }, false); await page.keyboard.press('Enter'); await state('done');           // Enter in the last box checks, and does not skip ahead
  s = await info(); assert.strictEqual(s.chips, c0, 'a wrong answer pays nothing'); assert.deepStrictEqual(s.problem, p, 'the same problem stays on screen');
  assert.deepStrictEqual((await page.evaluate(() => [...document.querySelectorAll('#cub-form .miss')].map(b => b.dataset.box))).sort(), ['c', 's2'], 'the two wrong boxes are marked');
  await page.click('#cub-next'); await state('playing'); s = await info(); await fill(C.answerOf(s.problem), false); await page.click('#cub-check'); await state('done'); s = await info(); assert.strictEqual(s.chips - c0, 10, 'Easy pays exactly 10');
  await open(2); await state('playing'); s = await info(); const c1 = s.chips; assert.ok(await page.$('[data-box="g"]'), 'a box for the GCF'); await fill(C.answerOf(s.problem), true); await page.keyboard.press('Enter'); await state('done'); s = await info(); assert.strictEqual(s.chips - c1, 25, 'Medium pays exactly 25');
  ctx.log('Easy: wrong then right, +10; Medium with a GCF, +25');
} };
