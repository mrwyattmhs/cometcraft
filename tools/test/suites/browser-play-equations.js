// The House of Algebra's two equation booths with REAL typing (real Chromium): the box is right inside the equation, you click into it and type the number, Enter checks. Wrong then right, Medium and Hard,
// the exact pay, only digits go in, the box is big enough to type in, and the window fits a phone.
const assert = require('assert');
const { FITS } = require('../lib/scan');
const TABLES = [
  { name: 'Missing Number', game: 'EquationGame', mod: '../../../js/equations.js', pre: 'eqn', pay: 'missing', solvedKey: 'missing' },
  { name: 'Multiply & Divide', game: 'MulDivGame', mod: '../../../js/equations-md.js', pre: 'eqm', pay: 'muldiv', solvedKey: 'muldiv' },
];
module.exports = { name: 'browser:play-equations', tier: 'browser', covers: ['js/equations.js', 'js/equations-md.js', 'js/equation-game.js', 'css/style.css', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'index.html'], timeout: 600000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  for (const tb of TABLES) {
    const E = require(tb.mod), sel = x => `#${tb.pre}-${x}`;
    const info = () => page.evaluate(n => { const G = (0, eval)(n); return { chips: Store.get().chips, state: G.state(), problem: G.problem, solved: (Store.get().solved || {}) }; }, tb.game);
    const state = st => page.waitForFunction((n, s) => (0, eval)(n).state() === s, { timeout: 20000 }, tb.game, st);
    const open = lv => page.evaluate((n, pre, l) => { (0, eval)(n).open(); document.querySelectorAll(`#${pre}-levels .bet`)[l - 1].click(); }, tb.game, tb.pre, lv);
    const typeIn = async v => { await page.click(`${sel('eq')} .eqn-box`); await page.keyboard.type(String(v)); };

    await open(1); await state('playing'); let s = await info(), p = s.problem; const c0 = s.chips;
    const box = await page.$eval(`${sel('eq')} .eqn-box`, b => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), inLine: b.parentElement.id.endsWith('-eq'), focused: document.activeElement === b }; });
    assert.ok(box.w >= 44 && box.h >= 44 && box.inLine, `${tb.name}: the box is big (${box.w} x ${box.h}) and is part of the equation`); assert.ok(box.focused, 'and it is ready to type in');
    await page.click(`${sel('eq')} .eqn-box`); await page.keyboard.type('a1b'); assert.strictEqual(await page.$eval(`${sel('eq')} .eqn-box`, b => b.value), '1', 'only digits go in');
    await page.keyboard.press('Backspace'); await page.click(sel('check')); await g.sleep(150); assert.match(await page.evaluate(q => document.querySelector(q).innerText, sel('msg')), /Type a number into the box first/);
    await typeIn(p.x + p.a); await page.keyboard.press('Enter'); await state('done');                                             // Enter checks, and does not skip ahead
    s = await info(); assert.strictEqual(s.chips, c0, 'a wrong answer pays nothing'); assert.deepStrictEqual(s.problem, p, 'the same problem stays on screen with its answer');
    assert.strictEqual(await page.$eval(`${sel('result')} .final-expr`, e => e.textContent), E.text(p).replace('[ ]', String(p.x)), 'the right answer is shown filled in');
    await page.click(sel('next')); await state('playing'); s = await info(); await typeIn(s.problem.x); await page.click(sel('check')); await state('done'); s = await info(); assert.strictEqual(s.chips - c0, 10, 'Easy pays exactly 10'); assert.strictEqual(s.solved[tb.solvedKey], 1);
    for (const [lv, pay] of [[2, 25], [3, 50]]) { await open(lv); await state('playing'); s = await info(); const b0 = s.chips; await typeIn(s.problem.x); await page.keyboard.press('Enter'); await state('done'); s = await info(); assert.strictEqual(s.chips - b0, pay, `${tb.name}: level ${lv} pays ${pay}`); }
    await page.setViewport({ width: 390, height: 800 }); await open(3); await state('playing'); assert.deepStrictEqual(await page.evaluate(FITS), [], `${tb.name}: the window fits a phone`);
    const pb = await page.$eval(`${sel('eq')} .eqn-box`, b => Math.round(b.getBoundingClientRect().width)); assert.ok(pb >= 44, `and the box is still big enough on a phone (${pb})`); await page.setViewport({ width: 1280, height: 800 });
    await page.evaluate(n => (0, eval)(n).close(), tb.game);
    ctx.log(`${tb.name}: Easy: wrong then right, +10; Medium +25; Hard +50; fits a phone`);
  }
} };
