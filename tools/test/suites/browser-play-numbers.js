// The Numbers Game with REAL taps and typing (real Chromium): tap a box, tap the digits and the plus-or-minus key, Check. Also the keyboard (a typed minus sign; Enter moves to the empty box),
// keys big enough to tap, and no scrolling in the picker, while playing or after answering, at four screen sizes, for the worst of several random problems.
const assert = require('assert');
const N = require('../../../js/number-pairs.js');
const { FITS } = require('../lib/scan');
module.exports = { name: 'browser:play-numbers', tier: 'browser', covers: ['js/number-pairs.js', 'js/booth-game.js', 'css/style.css', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'index.html'], timeout: 600000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const info = () => page.evaluate(() => ({ chips: Store.get().chips, state: NumbersGame.state(), problem: NumbersGame.problem, values: NumbersGame.boxes.map(b => b.value), solved: (Store.get().solved || {}).numbers || 0 }));
  const state = st => page.waitForFunction(s => NumbersGame.state() === s, { timeout: 20000 }, st);
  const open = lv => page.evaluate(l => { NumbersGame.open(); document.querySelectorAll('#nbg-levels .bet')[l - 1].click(); }, lv);
  const box = i => `#nbg-eq input:nth-of-type(${i + 1})`, key = k => page.click(`#nbg-pad [data-key="${k}"]`);
  const tapNumber = async (i, n) => { await page.click(box(i)); for (const ch of String(Math.abs(n))) await key(ch); if (n < 0) await key('sign'); };

  /* ---------- Hard, by taps alone: a box, its digits, plus-or-minus ---------- */
  await open(3); await state('playing'); let s = await info(), p = s.problem; const c0 = s.chips, ans = N.answerOf(p);
  await tapNumber(0, ans[0]); await tapNumber(1, ans[1]); s = await info(); assert.deepStrictEqual(s.values.map(Number), ans, `tapped ${ans.join(' and ')} into the two boxes (${N.text(p)})`);
  await key('check'); await state('done'); s = await info(); assert.strictEqual(s.chips - c0, 50, 'Hard pays exactly 50'); assert.strictEqual(s.solved, 1);
  assert.deepStrictEqual(await page.$$eval('#nbg-result .final-expr', es => es.map(e => e.textContent)), N.done(p).split(' and '), 'the answer shows its two equations, a line each');
  assert.ok(await page.$$eval('#nbg-result .final-expr', es => es.every(e => e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().height < 40)), 'and neither line wraps or spills');
  /* ---------- Medium, by keyboard: a typed minus sign, and Enter moves to the empty box ---------- */
  await open(2); await state('playing'); s = await info(); p = s.problem; const c1 = s.chips, a2 = N.answerOf(p);
  await page.click(box(0)); await page.keyboard.type(String(a2[0])); await page.keyboard.press('Enter');
  assert.strictEqual(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Second number', 'Enter in the first box moves to the second'); assert.strictEqual((await info()).state, 'playing');
  await page.keyboard.type(String(a2[1])); await page.keyboard.press('Enter'); await state('done'); s = await info(); assert.strictEqual(s.chips - c1, 25, 'Medium pays exactly 25');
  /* ---------- Easy: the plus-or-minus key is off, and a pair that multiplies right but adds wrong is wrong ---------- */
  await open(1); await state('playing'); s = await info(); p = s.problem; const c2 = s.chips;
  assert.strictEqual(await page.$eval('#nbg-sign', b => b.disabled), true, 'no negatives on Easy: the plus-or-minus key is off'); await page.click(box(0)); await page.keyboard.type('-9'); assert.strictEqual((await info()).values[0], '9', 'and a typed minus sign is dropped');
  await page.click(box(0)); await page.keyboard.press('Backspace');
  const other = N.factorPairs(p.product).find(([d]) => d !== Math.min(p.a, p.b)) || [p.a + 1, p.b]; await tapNumber(0, other[0]); await tapNumber(1, other[1]); await key('check'); await state('done');
  s = await info(); assert.strictEqual(s.chips, c2, `${other.join(' and ')} is not the pair for "${N.text(p)}": nothing paid`);
  /* ---------- keys big enough to tap, and no scrolling anywhere, at four screen sizes ---------- */
  const over = () => page.evaluate(() => { const o = document.querySelector('.overlay:not(.hidden)'); return o.scrollHeight - o.clientHeight; });
  for (const [label, w, h] of [['desktop 1280x720', 1280, 720], ['phone 390x760', 390, 760], ['small phone 375x667', 375, 667], ['tiny phone 360x640', 360, 640]]) {
    await page.setViewport({ width: w, height: h }); await g.closeAll(); let play = 0, after = 0, smallest = 999;
    await page.evaluate(() => NumbersGame.open()); await g.sleep(120); const pick = await over(); assert.deepStrictEqual(await page.evaluate(FITS), [], `${label}: the picker fits sideways`);
    for (let i = 0; i < 8; i++) {
      await open(3); await state('playing'); await g.sleep(60); play = Math.max(play, await over());
      if (i === 0) { smallest = await page.$$eval('#nbg-pad .eqn-key', ks => Math.min(...ks.map(k => { const r = k.getBoundingClientRect(); return Math.min(r.width, r.height); }))); assert.deepStrictEqual(await page.evaluate(FITS), [], `${label}: the play screen fits sideways`); }
      await page.evaluate(() => { NumbersGame.boxes.forEach(b => { b.value = '999'; }); document.getElementById('nbg-check').click(); }); await g.sleep(60); after = Math.max(after, await over());
    }
    assert.ok(smallest >= 44, `${label}: every key is at least 44 px each way (smallest ${Math.round(smallest)})`);
    assert.deepStrictEqual([pick, play, after].map(n => n <= 1), [true, true, true], `${label}: no scrolling in the picker, while playing or after answering (overflow ${pick} / ${play} / ${after} px)`);
  }
  await page.setViewport({ width: 1280, height: 800 }); await page.evaluate(() => NumbersGame.close());
  ctx.log('Hard by taps (+50), Medium by keyboard (+25), a wrong pair on Easy; keys 44+ px and no scrolling at 4 screen sizes');
} };
