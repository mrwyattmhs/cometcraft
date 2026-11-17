// The Multiply table's AREA MODEL with REAL clicking and typing (real Chromium):
//   THE LAYOUT, MEASURED   each term across the top is centred over its column, each term down the side is level with its row, the combine line is underneath, and the squares are big enough
//   REAL INPUT             click a square and type a term on the keyboard (a minus sign, ^2), tap the pad's keys, Enter to go on and to check, Check by a real click
//   LIGHTING               the row and column heads light up for the square you are in
//   FOUR SCREEN SIZES      no scrolling in the picker, while playing or after answering (the 3 by 3 problems and every answer wrong are the worst case); the steps open on a wide screen, closed on a phone
const assert = require('assert');
const P = require('../../../js/polys.js');
const { FITS } = require('../lib/scan');
module.exports = { name: 'browser:play-area', tier: 'browser', covers: ['js/polys.js', 'js/area-game.js', 'css/style.css', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'index.html'], timeout: 900000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const state = st => page.waitForFunction(s => PolyMulGame.state() === s, { timeout: 20000 }, st);
  const info = () => page.evaluate(() => ({ chips: Store.get().chips, problem: PolyMulGame.problem, shape: [PolyMulGame.grid.rows.length, PolyMulGame.grid.cols.length] }));
  const open = lv => page.evaluate(l => { PolyMulGame.open(); document.querySelectorAll('#pmul-levels .bet')[l - 1].click(); }, lv);
  const dealShape = (lv, want) => page.evaluate((l, w) => { for (let k = 0; k < 500; k++) { PolyMulGame.open(); document.querySelectorAll('#pmul-levels .bet')[l - 1].click(); const G = PolyMulGame; if (!w || (G.grid.rows.length === w[0] && G.grid.cols.length === w[1])) return true; } return false; }, lv, want);
  const cellSel = (i, j) => `#pmul-grid .area-cell[data-row="${i}"][data-col="${j}"]`;
  const active = () => page.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('area-cell') ? `cell ${a.dataset.row},${a.dataset.col}` : a && a.classList.contains('area-sum') ? `sum ${[...document.querySelectorAll('.area-sum')].indexOf(a)}` : a ? a.tagName : 'none'; });

  /* ---------- the layout, measured on the real screen ---------- */
  await dealShape(3, [3, 3]); await g.sleep(200); let s = await info();
  const lay = await page.evaluate(() => {
    const c = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
    const cells = [...document.querySelectorAll('#pmul-grid .area-cell')].map(b => ({ i: Number(b.dataset.row), j: Number(b.dataset.col), ...c(b) }));
    const cols = [...document.querySelectorAll('#pmul-grid .area-colhead')].map(c), rows = [...document.querySelectorAll('#pmul-grid .area-rowhead')].map(c);
    return { cells, cols, rows, combineTop: document.getElementById('pmul-combine').getBoundingClientRect().top, gridBottom: Math.max(...cells.map(x => x.bottom)), sums: [...document.querySelectorAll('#pmul-combine .area-sum')].map(c), polyTop: document.getElementById('pmul-poly').getBoundingClientRect().top, gridTop: document.getElementById('pmul-grid').getBoundingClientRect().top };
  });
  assert.strictEqual(lay.cells.length, 9); assert.strictEqual(lay.cols.length, 3); assert.strictEqual(lay.rows.length, 3);
  for (const x of lay.cells) { assert.ok(Math.abs(x.x - lay.cols[x.j].x) < 2, `the column heading ${x.j} is centred over its column (${Math.round(x.x)} vs ${Math.round(lay.cols[x.j].x)})`); assert.ok(Math.abs(x.y - lay.rows[x.i].y) < 2, `the row heading ${x.i} is level with its row (${Math.round(x.y)} vs ${Math.round(lay.rows[x.i].y)})`); }
  assert.ok(lay.cols.every(h => h.bottom <= Math.min(...lay.cells.map(x => x.top)) + 1), 'the second polynomial is ABOVE the rectangle'); assert.ok(lay.rows.every(h => h.right <= Math.min(...lay.cells.map(x => x.left)) + 1), 'the first polynomial is LEFT of the rectangle');
  assert.ok(lay.combineTop >= lay.gridBottom, 'the combine line is underneath the rectangle'); assert.ok(lay.sums.every(b => b.top >= lay.combineTop - 1), 'with its boxes on it'); assert.ok(lay.cells.every(x => x.w >= 60 && x.h >= 30), `the squares are big enough (${Math.round(Math.min(...lay.cells.map(x => x.w)))} x ${Math.round(Math.min(...lay.cells.map(x => x.h)))} px)`);
  assert.ok(new Set(lay.cells.map(x => Math.round(x.w))).size === 1 && new Set(lay.cells.map(x => Math.round(x.h))).size === 1, 'every square the same size: it is an area model, a tidy rectangle');
  ctx.log('measured: headings centred over their columns and level with their rows, the line underneath');

  /* ---------- real typing, Enter, lighting, Check by a click ---------- */
  await open(2); await state('playing'); s = await info(); let p = s.problem; const c0 = s.chips; let w = P.mulAnswer(p), v = p.v;
  assert.strictEqual(await active(), 'cell 0,0', 'the first square is ready to type in'); assert.deepStrictEqual(await page.evaluate(() => [...document.querySelectorAll('#pmul-grid .area-head.on')].map(h => h.dataset.row !== undefined ? `row${h.dataset.row}` : `col${h.dataset.col}`).sort()), ['col0', 'row0'], 'the heads of the square you are in light up');
  await page.click(cellSel(1, 1)); assert.deepStrictEqual(await page.evaluate(() => [...document.querySelectorAll('#pmul-grid .area-head.on')].map(h => h.dataset.row !== undefined ? `row${h.dataset.row}` : `col${h.dataset.col}`).sort()), ['col1', 'row1'], 'a click on another square moves the light');
  assert.ok(await page.evaluate(() => { const h = document.querySelector('#pmul-grid .area-head.on'); return getComputedStyle(h).outlineStyle !== 'none'; }), 'and it really shows');
  await page.click(cellSel(0, 0)); const typeTerm = async t => { await page.keyboard.type(`${t.c < 0 ? '-' : ''}${t.d === 0 || Math.abs(t.c) !== 1 ? Math.abs(t.c) : ''}${t.d > 0 ? v : ''}${t.d > 1 ? '^' + t.d : ''}`); };
  await typeTerm(w.cells[0]); assert.strictEqual(await page.$eval(cellSel(0, 0), b => b.value), P.termText(w.cells[0].c, w.cells[0].d, v), 'typed with a minus sign and ^ and tidied into a real term'); await page.keyboard.press('Enter'); assert.strictEqual(await active(), 'cell 0,1', 'Enter goes to the next empty square');
  for (let k = 1; k < w.cells.length; k++) { await typeTerm(w.cells[k]); await page.keyboard.press('Enter'); }
  assert.strictEqual(await active(), 'sum 0', 'after the squares, on to the line below'); for (let k = 0; k < w.combined.length; k++) { await page.keyboard.type(String(w.combined[k])); if (k < w.combined.length - 1) await page.keyboard.press('Enter'); }
  assert.strictEqual(await page.evaluate(() => PolyMulGame.state()), 'playing'); await page.keyboard.press('Enter'); await state('done'); s = await info(); assert.strictEqual(s.chips - c0, 25, 'Medium pays 25'); assert.deepStrictEqual(s.problem, p, 'Enter checked it and did NOT skip to the next problem');
  assert.ok(await page.evaluate(() => PolyMulGame.boxes.every(b => b.classList.contains('ok'))), 'everything is green'); assert.ok(await page.evaluate(() => !document.querySelector('#pmul-result details').open), 'a right answer leaves the steps closed');
  ctx.log('typed a whole Medium problem on the keyboard: terms, Enter between boxes, Enter to check, +25');

  /* ---------- the pad, by real clicks: a wrong answer shows the right one ---------- */
  await page.click('#pmul-next'); await state('playing'); s = await info(); p = s.problem; w = P.mulAnswer(p); v = p.v; const c1 = s.chips;
  const padTerm = async t => { if (t.c < 0) await page.click('#pmul-pad [data-key="neg"]'); if (Math.abs(t.c) !== 1 || t.d === 0) for (const ch of String(Math.abs(t.c))) await page.click(`#pmul-pad [data-key="${ch}"]`); if (t.d > 0) await page.click(`#pmul-pad [data-key="v${t.d}"]`); };
  const cellsNow = await page.$$('#pmul-grid .area-cell'); for (let k = 0; k < cellsNow.length; k++) { await cellsNow[k].click(); const t = k === 1 ? { c: w.cells[1].c + 1, d: w.cells[1].d } : w.cells[k]; await padTerm(t); }
  const sumsNow = await page.$$('#pmul-combine .area-sum'); for (let k = 0; k < sumsNow.length; k++) { await sumsNow[k].click(); const n = w.combined[k]; if (n < 0) await page.click('#pmul-pad [data-key="neg"]'); for (const ch of String(Math.abs(n))) await page.click(`#pmul-pad [data-key="${ch}"]`); }
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('#pmul-pad [data-key^="v"]')].every(k => !k.disabled)) === false, 'the variable keys are off while a box on the line is chosen'); await page.click('#pmul-check'); await state('done');
  s = await info(); assert.strictEqual(s.chips, c1, 'a wrong square: nothing paid'); assert.deepStrictEqual(await page.evaluate(() => PolyMulGame.cells.map((b, i) => (b.classList.contains('miss') ? i : -1)).filter(i => i >= 0)), [1], 'only the one wrong square is red');
  assert.strictEqual(await page.$eval(cellSel(0, 1), b => b.value), P.termText(w.cells[1].c, w.cells[1].d, v), 'and it now shows the right area'); assert.ok(await page.evaluate(() => document.querySelector('#pmul-result details').open), 'on a wide screen the steps open after a wrong answer');
  assert.deepStrictEqual(await page.evaluate(() => [...document.querySelectorAll('#pmul-result .work li')].map(l => l.textContent)), P.mulSteps(p)); ctx.log('the pad by real clicks: every square and the line, one wrong square marked and corrected');

  /* ---------- Easy and Hard, solved with the pad ---------- */
  for (const [lv, pay, want] of [[1, 10, null], [3, 50, [3, 3]]]) {
    await dealShape(lv, want); await state('playing'); s = await info(); p = s.problem; w = P.mulAnswer(p); const b0 = s.chips;
    const cs = await page.$$('#pmul-grid .area-cell'); for (let k = 0; k < cs.length; k++) { await cs[k].click(); await padTerm(w.cells[k]); }
    const ss = await page.$$('#pmul-combine .area-sum'); for (let k = 0; k < ss.length; k++) { await ss[k].click(); const n = w.combined[k]; if (n < 0) await page.click('#pmul-pad [data-key="neg"]'); for (const ch of String(Math.abs(n))) await page.click(`#pmul-pad [data-key="${ch}"]`); }
    await page.click('#pmul-check'); await state('done'); s = await info(); assert.strictEqual(s.chips - b0, pay, `level ${lv} pays ${pay}`); assert.ok(await page.evaluate(() => PolyMulGame.boxes.every(b => b.classList.contains('ok'))), `${P.mulText(p)}: everything green`);
  }
  ctx.log('Easy +10 and a 3 by 3 Hard +50, by the pad');

  /* ---------- four screen sizes: no scrolling anywhere ---------- */
  const over = () => page.evaluate(() => { const o = document.querySelector('.overlay:not(.hidden)'); return [o.scrollHeight - o.clientHeight, o.scrollWidth - o.clientWidth]; });
  const wrongAnswers = () => page.evaluate(() => { const G = PolyMulGame; G.cells.forEach(b => { b.value = '99' + G.problem.v; }); G.sums.forEach(b => { b.value = '\u221299'; }); document.getElementById('pmul-check').click(); });
  for (const [label, wd, ht] of [['desktop 1280x720', 1280, 720], ['phone 390x760', 390, 760], ['small phone 375x667', 375, 667], ['tiny phone 360x640', 360, 640]]) {
    await page.setViewport({ width: wd, height: ht }); await g.closeAll(); await page.evaluate(() => PolyMulGame.open()); await g.sleep(100);
    assert.deepStrictEqual((await over()).map(n => n <= 1), [true, true], `${label}: the picker fits`); assert.deepStrictEqual(await page.evaluate(FITS), [], `${label}: the picker fits sideways`);
    for (const [name, lv, want] of [['Easy', 1, null], ['Medium', 2, null], ['Hard 2x3', 3, [2, 3]], ['Hard 3x2', 3, [3, 2]], ['Hard 3x3', 3, [3, 3]]]) {
      await dealShape(lv, want); await state('playing'); await g.sleep(60); const play = await over(); assert.deepStrictEqual(await page.evaluate(FITS), [], `${name}, ${label}: fits sideways`);
      const sizes = await page.evaluate(() => ({ cell: Math.min(...[...document.querySelectorAll('.area-cell')].map(b => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))), sum: Math.min(...[...document.querySelectorAll('.area-sum')].map(b => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))), key: Math.min(...[...document.querySelectorAll('#pmul-pad .eqn-key')].map(b => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))) }));
      assert.ok(sizes.cell >= 28 && sizes.sum >= 28 && sizes.key >= 30, `${name}, ${label}: squares, boxes and keys are big enough to tap (${JSON.stringify(sizes)})`);
      await wrongAnswers(); await state('done'); await g.sleep(60); const after = await over(); const open_ = await page.evaluate(() => document.querySelector('#pmul-result details').open);
      assert.strictEqual(open_, wd > 860, `${label}: the steps are ${wd > 860 ? 'open' : 'closed'} after a wrong answer`);
      assert.deepStrictEqual([play, after].flat().map(n => n <= 1), [true, true, true, true], `${name}, ${label}: no scrolling while playing or after answering (${play} / ${after})`);
    }
  }
  await page.setViewport({ width: 1280, height: 800 }); await g.closeAll();
  ctx.log('no scrolling at 4 screen sizes, 3 by 3 and every answer wrong included; the steps open wide and closed on a phone');
} };
