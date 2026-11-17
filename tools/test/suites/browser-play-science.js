// The Science Lab's three games with REAL mouse clicks (real Chromium):
//   every part of every cell picture can be clicked: a click point is found with the browser's own hit-testing, so a part hidden under another, or too thin to hit, fails here
//   Element Match and Cell Lab by real clicks (tile or part, then Check), Atom Builder by real taps on its pad
//   all three windows: no scrolling in the picker, while playing or after answering, at four screen sizes (the periodic table may scroll sideways inside its own frame on a narrow phone);
//   tiles big enough to tap (24 px each way is the accessibility minimum), the pad's keys 44 px, and the cell picture big enough to see
const assert = require('assert');
const C = require('../../../js/cells.js'), E = require('../../../js/elements.js'), A = require('../../../js/atoms.js');
const { FITS } = require('../lib/scan');
module.exports = { name: 'browser:play-science', tier: 'browser', covers: ['js/elements.js', 'js/cells.js', 'js/atoms.js', 'js/pick-game.js', 'js/booth-game.js', 'css/style.css', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'index.html'], timeout: 900000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const state = (game, st) => page.waitForFunction((n, s) => (0, eval)(n).state() === s, { timeout: 20000 }, game, st);
  const open = async (game, pre, lv) => { await g.closeAll(); await page.evaluate((n, p, l) => { (0, eval)(n).open(); document.querySelectorAll(`#${p}-levels .bet`)[l - 1].click(); }, game, pre, lv); };      // (one window at a time, as a player has it: which of two open windows is on top depends on which was made first)
  const info = game => page.evaluate(n => ({ chips: Store.get().chips, problem: (0, eval)(n).problem, picked: (0, eval)(n).picked }), game);
  /** A point on screen where a real click lands on this part: found by asking the browser what is there. */
  const pointFor = (pre, key) => page.evaluate((p, k) => { const fig = document.getElementById(`${p}-fig`), r = (fig.querySelector('svg') || fig).getBoundingClientRect(); for (let y = r.top + 2; y < r.bottom; y += 3) for (let x = r.left + 2; x < r.right; x += 3) { const t = document.elementFromPoint(x, y), h = t && t.closest('[data-key]'); if (h && h.dataset.key === k) return { x, y }; } return null; }, pre, key);

  /* ---------- every part of every cell picture can be clicked for real ---------- */
  for (const L of C.LEVELS) { await open('CellGame', 'cel', L.level); await g.sleep(150); for (const k of L.parts) { const pt = await pointFor('cel', k); assert.ok(pt, `${L.name}: the ${k} has a spot a real click can hit`); await page.mouse.click(pt.x, pt.y); assert.strictEqual((await info('CellGame')).picked, k, `${L.name}: a real click on the ${k} picks the ${k}`); } await page.evaluate(() => CellGame.close()); }
  ctx.log('every part of all three cell pictures can be hit by a real click');

  /* ---------- Cell Lab: a real click, then Check ---------- */
  await open('CellGame', 'cel', 3); await state('CellGame', 'playing'); let s = await info('CellGame'); const c0 = s.chips;
  let pt = await pointFor('cel', s.problem.part); await page.mouse.click(pt.x, pt.y); await page.click('#cel-check'); await state('CellGame', 'done'); s = await info('CellGame'); assert.strictEqual(s.chips - c0, 50, 'Hard pays 50');
  assert.ok(await page.evaluate(k => !!document.querySelector(`#cel-fig [data-key="${k}"].right`), s.problem.part), 'the right part is lit green');
  await page.click('#cel-next'); await state('CellGame', 'playing'); s = await info('CellGame'); const other = s.problem.part === 'cytoplasm' ? 'membrane' : 'cytoplasm'; pt = await pointFor('cel', other); await page.mouse.click(pt.x, pt.y); await page.keyboard.press('Enter'); await state('CellGame', 'done');
  assert.strictEqual((await info('CellGame')).chips - c0, 50, 'a wrong click pays nothing'); assert.ok(await page.evaluate(k => !!document.querySelector(`#cel-fig [data-key="${k}"].wrong`), other), 'and is lit red');

  /* ---------- Element Match: real clicks on tiles ---------- */
  await open('ElementGame', 'elm', 3); await state('ElementGame', 'playing'); s = await info('ElementGame'); const e0 = s.chips;
  await page.click(`#elm-fig [data-key="${s.problem.z}"]`); assert.match(await page.$eval('#elm-msg', e => e.textContent), /You picked /); await page.click('#elm-check'); await state('ElementGame', 'done'); s = await info('ElementGame'); assert.strictEqual(s.chips - e0, 50, 'Hard pays 50');
  assert.strictEqual(await page.$eval('#elm-result .final-text', e => e.textContent), E.done(s.problem), 'the answer card says what the element is');
  await page.click('#elm-next'); await state('ElementGame', 'playing'); s = await info('ElementGame'); const wrongZ = s.problem.z === 1 ? 2 : 1; await page.click(`#elm-fig [data-key="${wrongZ}"]`); await page.click('#elm-check'); await state('ElementGame', 'done'); assert.strictEqual((await info('ElementGame')).chips - e0, 50);
  /* ---------- Atom Builder: real taps ---------- */
  await open('AtomsGame', 'abd', 1); await state('AtomsGame', 'playing'); s = await info('AtomsGame'); const a0 = s.chips, ans = A.answerOf(s.problem);
  for (let i = 0; i < 3; i++) { await page.click(`#abd-eq .abd-col:nth-child(${i + 1}) input`); for (const ch of String(ans[i])) await page.click(`#abd-pad [data-key="${ch}"]`); }
  assert.deepStrictEqual((await page.$$eval('#abd-eq input', bs => bs.map(b => Number(b.value)))), ans, `tapped ${ans.join(', ')} into protons, neutrons and electrons`); await page.click('#abd-check'); await state('AtomsGame', 'done'); assert.strictEqual((await info('AtomsGame')).chips - a0, 10);

  /* ---------- no scrolling, and big enough to use, at four screen sizes ---------- */
  const over = () => page.evaluate(() => { const o = document.querySelector('.overlay:not(.hidden)'); return o.scrollHeight - o.clientHeight; });
  const GAMES = [['ElementGame', 'elm', 'Element Match'], ['CellGame', 'cel', 'Cell Lab'], ['AtomsGame', 'abd', 'Atom Builder']];
  for (const [label, w, h] of [['desktop 1280x720', 1280, 720], ['phone 390x760', 390, 760], ['small phone 375x667', 375, 667], ['tiny phone 360x640', 360, 640]]) {
    await page.setViewport({ width: w, height: h }); await g.closeAll();
    for (const [game, pre, name] of GAMES) {
      await page.evaluate(n => (0, eval)(n).open(), game); await g.sleep(120); const pick = await over(); assert.deepStrictEqual(await page.evaluate(FITS), [], `${name}, ${label}: the picker fits sideways`);
      let play = 0, after = 0;
      for (let i = 0; i < 4; i++) {
        await open(game, pre, 3); await state(game, 'playing'); await g.sleep(60); play = Math.max(play, await over());
        if (i === 0) {
          assert.deepStrictEqual(await page.evaluate(FITS), [], `${name}, ${label}: the play screen fits sideways`);
          if (pre === 'elm') { const m = await page.$$eval('#elm-fig .pt-tile', ts => Math.min(...ts.map(t => { const r = t.getBoundingClientRect(); return Math.min(r.width, r.height); }))); assert.ok(m >= 24, `${name}, ${label}: every tile is at least 24 px each way (smallest ${Math.round(m)})`); }
          if (pre === 'cel') { const m = await page.$eval('#cel-fig svg', e => Math.round(e.getBoundingClientRect().width)); assert.ok(m >= 250, `${name}, ${label}: the cell picture is big enough to see (${m} px wide)`); }
          if (pre === 'abd') { const m = await page.$$eval('#abd-pad .eqn-key', ks => Math.min(...ks.map(k => { const r = k.getBoundingClientRect(); return Math.min(r.width, r.height); }))); assert.ok(m >= 44, `${name}, ${label}: every pad key is at least 44 px (smallest ${Math.round(m)})`); }
        }
        if (pre === 'abd') await page.evaluate(() => { AtomsGame.boxes.forEach(b => { b.value = '999'; }); document.getElementById('abd-check').click(); });
        else await page.evaluate((p, n) => { const f = document.querySelector(`#${p}-fig [data-key]`); f.dispatchEvent(new MouseEvent('click', { bubbles: true })); document.getElementById(`${p}-check`).click(); }, pre, game);
        await g.sleep(60); after = Math.max(after, await over());
      }
      assert.deepStrictEqual([pick, play, after].map(n => n <= 1), [true, true, true], `${name}, ${label}: no scrolling in the picker, while playing or after answering (overflow ${pick} / ${play} / ${after} px)`);
    }
  }
  await page.setViewport({ width: 1280, height: 800 }); await g.closeAll();
  ctx.log('real clicks and taps in all three games; no scrolling at 4 screen sizes; tiles, pad keys and the cell picture big enough');
} };
