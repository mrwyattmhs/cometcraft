// The Add/Sub table with REAL typing and clicking (real Chromium): subtracting (the minus sign's arches), adding, and a phone-sized window. (The Multiply table is an area model with its own
// window: browser-play-area.js.)
// What it measures that the simulated browser cannot: every arch really starts and ends at its two terms on screen; blanks are outlined in their arch's colour; the arch of the blank you
// are in is fully drawn while the others fade; the boxes are big enough to type in; the window fits.
const assert = require('assert');
const P = require('../../../js/polys.js');
const { FITS } = require('../lib/scan');

module.exports = { name: 'browser:play-polys', tier: 'browser', covers: ['js/polys.js', 'js/poly-game.js', 'css/style.css', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'index.html'], timeout: 900000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const info = name => page.evaluate(n => { const G = (0, eval)(n); return { chips: Store.get().chips, state: G.state(), problem: G.problem, solved: Store.get().solved || {} }; }, name);
  const answer = p => (a => [...a.distributed, ...a.combined])(P.addAnswer(p));
  const typeAll = async (pre, values) => { const hs = await page.$$(`#${pre}-steps .poly-stage:last-child .poly-num`); assert.strictEqual(hs.length, values.length, `${values.length} boxes on screen`); for (let i = 0; i < hs.length; i++) { await hs[i].click(); await page.keyboard.type(String(values[i])); } };
  const waitState = (name, st) => page.waitForFunction((n, s) => (0, eval)(n).state() === s, { timeout: 20000 }, name, st);
  const open = (name, pre, level) => page.evaluate((n, l, lv) => { (0, eval)(n + '.open()'); document.querySelectorAll(`#${l}-levels .bet`)[lv - 1].click(); }, name, pre, level);
  const draw = pre => page.waitForFunction(i => { const a = [...document.querySelectorAll(`#${i}-steps path.poly-arc`)]; return a.length > 0 && a.every(x => x.getAttribute('d')); }, { timeout: 20000 }, pre);
  /** every arch starts and ends at its terms, above or below the line as it says (measured on the real screen) */
  const geometry = async pre => {
    await draw(pre);
    const r = await page.evaluate(i => { const out = { arches: 0, arcs: 0, bad: [] };
      document.querySelectorAll(`#${i}-steps .poly-arch`).forEach(box => { out.arches++; const br = box.getBoundingClientRect(), pos = ref => { const t = box.querySelector(`[data-ref="${ref}"]`).getBoundingClientRect(); return { x: t.left + t.width / 2 - br.left + box.scrollLeft, top: t.top - br.top, bottom: t.bottom - br.top }; };
        box.querySelectorAll('path.poly-arc').forEach(a => { out.arcs++; const m = (a.getAttribute('d') || '').match(/M ([\d.-]+) ([\d.-]+) C [\d.-]+ [\d.-]+, [\d.-]+ [\d.-]+, ([\d.-]+) ([\d.-]+)/); if (!m) { out.bad.push(`${a.dataset.from}>${a.dataset.to}: no path`); return; }
          const [x1, y1, x2, y2] = m.slice(1).map(Number), f = pos(a.dataset.from), t = pos(a.dataset.to), up = a.dataset.side === 'above';
          const okX = Math.abs(x1 - f.x) < 14 && Math.abs(x2 - t.x) < 14, okY = up ? (Math.abs(y1 - (f.top - 3)) < 3 && Math.abs(y2 - (t.top - 5)) < 3) : (Math.abs(y1 - (f.bottom + 3)) < 3 && Math.abs(y2 - (t.bottom + 5)) < 3);
          if (!okX || !okY) out.bad.push(`${a.dataset.from}>${a.dataset.to} (${up ? 'above' : 'below'}): from ${x1.toFixed(0)},${y1.toFixed(0)} to ${x2.toFixed(0)},${y2.toFixed(0)}, terms at ${f.x.toFixed(0)} and ${t.x.toFixed(0)}`); if (!a.getAttribute('marker-end')) out.bad.push('no arrowhead'); }); }); return out; }, pre);
    assert.deepStrictEqual(r.bad, [], `every arch starts and ends at its terms (${r.arcs} measured)`); return r;
  };
  /** Step 1 is one line of blanks: nothing worked out inline, each outlined in its arch's colour and tied to its arch, and the arch of the blank you are in is drawn while the others fade */
  const blanks = async pre => {
    await draw(pre); await page.mouse.move(2, 2); await g.sleep(150);
    const r = await page.evaluate(i => { const steps = document.getElementById(`${i}-steps`), ex = steps.querySelector('.poly-stage:last-child .poly-expand'), arch = steps.querySelector('.poly-stage:last-child .poly-arch'), bs = [...ex.querySelectorAll('input.poly-num')], arcs = [...arch.querySelectorAll('path.poly-arc')];
      const out = { text: steps.textContent, extras: steps.querySelectorAll('.poly-cap, .poly-eq, .poly-dot').length, n: bs.length, arcs: arcs.length, colours: bs.map(b => getComputedStyle(b).borderTopColor), arc: arcs.map(a => a.getAttribute('stroke')), pairs: arcs.map(a => [a.dataset.from, a.dataset.to]) };
      bs[0].focus(); out.op = arcs.map(a => getComputedStyle(a).opacity); bs[0].blur(); return out; }, pre);
    assert.strictEqual(r.extras, 0, 'no captions, equals signs or dots'); assert.ok(!/\u00b7/.test(r.text), 'no multiplication written out in the steps'); assert.strictEqual(r.n, r.arcs, 'one blank for each arch');
    const rgb = h => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`; assert.deepStrictEqual(r.colours, r.arc.map(rgb), 'each blank is outlined in its arch\'s colour');
    assert.strictEqual(r.op[0], '1', 'the arch of the blank you are in is fully drawn'); assert.ok(r.op.slice(1).every(o => parseFloat(o) < 0.5), `and the others fade (${r.op})`); return r;
  };
  const sizes = async pre => { const s = await page.evaluate(i => [...document.querySelectorAll(`#${i}-steps .poly-num`)].map(b => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))), pre); assert.ok(s.every(h => h >= 44), `every box is big enough to type in (${s})`); };
  const solve = async (name, pre, p, { wrongAtEnd = false, enterAtEnd = false } = {}) => {
    const a = answer(p); if (wrongAtEnd) a[a.length - 1] += 3; await typeAll(pre, a);
    if (enterAtEnd) await page.keyboard.press('Enter'); else await page.click(`#${pre}-check`);
    await waitState(name, 'done');
  };

  /* ---------- Subtract: a wrong answer (with Enter), then a right one ---------- */
  let s, c1;
  await open('PolyAddGame', 'padd', 2); await waitState('PolyAddGame', 'playing'); s = await info('PolyAddGame'); const p0 = s.problem; c1 = s.chips; await geometry('padd'); await blanks('padd'); await sizes('padd');
  await page.click('#padd-check'); await g.sleep(150); assert.match(await page.evaluate(() => document.getElementById('padd-msg').innerText), /Fill in every box first/);
  await solve('PolyAddGame', 'padd', p0, { wrongAtEnd: true, enterAtEnd: true });
  s = await info('PolyAddGame'); assert.strictEqual(s.chips, c1, 'a wrong answer pays nothing'); assert.deepStrictEqual(s.problem, p0, 'Enter checked it and did NOT skip to the next problem');
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('#padd-steps .poly-num.miss').length), 1, 'only the wrong box is marked');
  await page.click('#padd-next'); await waitState('PolyAddGame', 'playing'); s = await info('PolyAddGame'); await solve('PolyAddGame', 'padd', s.problem);
  s = await info('PolyAddGame'); assert.strictEqual(s.chips - c1, 25, 'subtracting pays exactly 25'); assert.strictEqual(s.solved.polyadd, 1);
  ctx.log('Subtract: arches measured, blanks outlined, wrong then right, +25');

  /* ---------- and add ---------- */
  await open('PolyAddGame', 'padd', 1); await waitState('PolyAddGame', 'playing'); s = await info('PolyAddGame'); c1 = s.chips; assert.strictEqual(await page.evaluate(() => document.querySelectorAll('#padd-steps .poly-arch').length), 0, 'no arches when adding');
  await solve('PolyAddGame', 'padd', s.problem); s = await info('PolyAddGame'); assert.strictEqual(s.chips - c1, 10, 'adding pays 10');
  ctx.log('Add +10, no arches');

  /* ---------- a phone: subtraction problems fit ---------- */
  await page.setViewport({ width: 390, height: 800 });
  for (let i = 0; i < 12; i++) { await open('PolyAddGame', 'padd', 2); await draw('padd'); assert.deepStrictEqual(await page.evaluate(FITS), [], `phone: subtraction problem ${i + 1} fits`); }
  await page.setViewport({ width: 1280, height: 800 }); ctx.log('phone: 12 subtraction problems fit');
} };
