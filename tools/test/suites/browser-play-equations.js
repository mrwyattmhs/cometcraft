// The House of Algebra's two equation booths with REAL typing (real Chromium): the box is right inside the equation, you click into it and type the number, Enter checks. Wrong then right, Medium and Hard,
// the exact pay, only digits go in, the box is big enough to type in, and the window fits a phone.
const assert = require('assert');
const { FITS } = require('../lib/scan');
const TABLES = [
  { name: 'Missing Number', game: 'EquationGame', mod: '../../../js/equations.js', pre: 'eqn', pay: 'missing', solvedKey: 'missing' },
  { name: 'Multiply & Divide', game: 'MulDivGame', mod: '../../../js/equations-md.js', pre: 'eqm', pay: 'muldiv', solvedKey: 'muldiv' },
];
module.exports = { name: 'browser:play-equations', tier: 'browser', covers: ['js/equations.js', 'js/equations-md.js', 'js/booth-game.js', 'css/style.css', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'index.html'], timeout: 600000, run: async ctx => {
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
    await page.keyboard.press('Backspace'); await page.click(sel('check')); await g.sleep(150); assert.match(await page.evaluate(q => document.querySelector(q).innerText, sel('msg')), /Tap or type a number into the box first/);
    await typeIn(p.x + p.a); await page.keyboard.press('Enter'); await state('done');                                             // Enter checks, and does not skip ahead
    s = await info(); assert.strictEqual(s.chips, c0, 'a wrong answer pays nothing'); assert.deepStrictEqual(s.problem, p, 'the same problem stays on screen with its answer');
    assert.strictEqual(await page.$eval(`${sel('result')} .final-expr`, e => e.textContent), E.text(p).replace('[ ]', String(p.x)), 'the right answer is shown filled in');
    await page.click(sel('next')); await state('playing'); s = await info(); await typeIn(s.problem.x); await page.click(sel('check')); await state('done'); s = await info(); assert.strictEqual(s.chips - c0, 10, 'Easy pays exactly 10'); assert.strictEqual(s.solved[tb.solvedKey], 1);
    for (const [lv, pay] of [[2, 25], [3, 50]]) { await open(lv); await state('playing'); s = await info(); const b0 = s.chips; await typeIn(s.problem.x); await page.keyboard.press('Enter'); await state('done'); s = await info(); assert.strictEqual(s.chips - b0, pay, `${tb.name}: level ${lv} pays ${pay}`); }
    await page.setViewport({ width: 390, height: 800 }); await open(3); await state('playing'); assert.deepStrictEqual(await page.evaluate(FITS), [], `${tb.name}: the window fits a phone`);
    const pb = await page.$eval(`${sel('eq')} .eqn-box`, b => Math.round(b.getBoundingClientRect().width)); assert.ok(pb >= 44, `and the box is still big enough on a phone (${pb})`); await page.setViewport({ width: 1280, height: 800 });
    /* ---------- the number pad, with REAL clicks: tap the answer, no keyboard ---------- */
    await page.setViewport({ width: 1280, height: 800 }); await open(1); await state('playing'); s = await info(); p = s.problem; const c9 = s.chips, pk = k => page.click(`${sel('pad')} [data-key="${k}"]`);
    await pk('9'); await pk('9'); await pk('back'); await pk('back'); assert.strictEqual(await page.$eval(`${sel('eq')} .eqn-box`, b => b.value), '', 'tap two digits, backspace twice: empty again');
    for (const ch of String(p.x)) await pk(ch); assert.strictEqual(await page.$eval(`${sel('eq')} .eqn-box`, b => b.value), String(p.x), 'tapping the answer fills the box'); await pk('check'); await state('done');
    s = await info(); assert.strictEqual(s.chips - c9, 10, 'an answer given by tapping alone pays like a typed one');
    assert.ok(await page.evaluate(q => document.querySelector(q).classList.contains('hidden'), sel('pad')), 'the worked answer takes the pad\'s place');
    /* ---------- the window never needs scrolling: every state, four screen sizes, the worst of several random problems ---------- */
    const over = () => page.evaluate(() => { const o = document.querySelector('.overlay:not(.hidden)'); return o.scrollHeight - o.clientHeight; });
    const worst = {};
    for (const [label, w, h] of [['desktop 1280x720', 1280, 720], ['phone 390x760', 390, 760], ['small phone 375x667', 375, 667], ['tiny phone 360x640', 360, 640]]) {
      await page.setViewport({ width: w, height: h }); await g.closeAll(); let pick = 0, play = 0, after = 0, smallest = 999;
      await page.evaluate(n => (0, eval)(n).open(), tb.game); await g.sleep(120); pick = await over();
      for (let i = 0; i < 6; i++) {
        await open(3); await state('playing'); await g.sleep(60); play = Math.max(play, await over());
        if (i === 0) smallest = await page.$$eval(`${sel('pad')} .eqn-key`, ks => Math.min(...ks.map(k => { const r = k.getBoundingClientRect(); return Math.min(r.width, r.height); })));
        await page.evaluate((n, pre) => { (0, eval)(n).box.value = '999'; document.getElementById(pre + '-check').click(); }, tb.game, tb.pre); await g.sleep(60); after = Math.max(after, await over());
      }
      assert.ok(smallest >= 44, `${tb.name}, ${label}: every key is at least 44 px each way, big enough to tap (smallest ${Math.round(smallest)})`);
      worst[label] = Math.max(pick, play, after); assert.deepStrictEqual([pick, play, after].map(n => n <= 1), [true, true, true], `${tb.name}, ${label}: no scrolling in the picker, while playing or after answering (overflow ${pick} / ${play} / ${after} px)`);
    }
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluate(n => (0, eval)(n).close(), tb.game);
    ctx.log(`${tb.name}: Easy: wrong then right, +10; Medium +25; Hard +50; the pad by real taps; no scrolling at 4 screen sizes; fits a phone`);
  }
} };
