// The Add/Sub table through the real boxes (simulated browser): levels and pay, one shot per problem, no arches when adding, the minus sign's arches when subtracting, the combine step,
// and the 100-answer trophy. (The Multiply table is an area model with its own window: sim-area.js.)
const assert = require('assert');
const { plain, text } = require('../lib/util');

module.exports = { name: 'sim:polynomials', tier: 'sim', covers: ['js/polys.js', 'js/poly-game.js', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'js/main.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, doc, $, click, w } = s, { Polys, PolyAddGame: ADD, Store } = T, M = Polys.MINUS; s.start(); await s.frames(2);
  const type = (b, v) => { b.value = String(v); b.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const enter = (g, first, second) => { const b = g.boxes; first.forEach((v, i) => type(b.first[i], v)); second.forEach((v, i) => type(b.second[i], v)); };
  const rightFor = p => (a => [a.distributed, a.combined])(Polys.addAnswer(p));
  const chips = () => Store.get().chips, solved = id => (Store.get().solved || {})[id] || 0;
  const solveAll = (g, pre) => { const [f, c] = rightFor(g.problem); enter(g, f, c); click($(`${pre}-check`)); assert.strictEqual(g.state(), 'done'); };
  const play = (g, pre, level) => { g.open(); click(doc.querySelectorAll(`#${pre}-levels .bet`)[level - 1]); return g.problem; };

  /* ---------- menu ---------- */
  ADD.open(); const cards = [...doc.querySelectorAll('#padd-levels .bet')];
  assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-amt').textContent)), ['Easy', 'Medium']); assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['10 chips per answer', '25 chips per answer']); ADD.close();

  /* ---------- Add / Subtract ---------- */
  let p = play(ADD, 'padd', 1), bx; assert.strictEqual(p.op, 1); assert.deepStrictEqual(plain([...doc.querySelectorAll('#padd-steps h3')].map(h => h.textContent)), ['Step 1: Combine like terms.']); assert.strictEqual(doc.querySelectorAll('#padd-steps .poly-arch').length, 0, 'no arches when adding');
  let b7 = chips(); solveAll(ADD, 'padd'); assert.strictEqual(chips() - b7, 10);
  click($('padd-change')); click(doc.querySelectorAll('#padd-levels .bet')[1]); p = ADD.problem; bx = ADD.boxes;
  assert.strictEqual(p.op, -1); const sa = doc.querySelector('#padd-steps .poly-arch'); assert.strictEqual(sa.querySelector('[data-ref="S"]').textContent, M, 'an arch from the minus sign');
  assert.deepStrictEqual(plain([...sa.querySelectorAll('path.poly-arc')].map(a => [a.dataset.from, a.dataset.to])), plain(Polys.termsOf(p.Q).map((t, j) => ['S', `R${j}`])), 'to every term of the second polynomial');
  b7 = chips(); const [, c] = rightFor(p); enter(ADD, Polys.termsOf(p.Q).map(t => t.c), c); click($('padd-check')); assert.ok(bx.first.every(b => b.classList.contains('miss')), 'forgetting to distribute the minus sign is marked'); assert.strictEqual(chips(), b7);
  click($('padd-next')); b7 = chips(); solveAll(ADD, 'padd'); assert.strictEqual(chips() - b7, 25);
  ctx.log('Add/Subtract: no arches to add, minus-sign arches to subtract, pay 10 and 25');

  /* ---------- Enter in a box checks the answer, and does not skip ahead ---------- */
  click($('padd-next')); { const p2 = ADD.problem, [f2, c2] = rightFor(p2), bx2 = ADD.boxes, e0 = chips(); enter(ADD, f2, c2);
    bx2.all[bx2.all.length - 1].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.strictEqual(ADD.state(), 'done', 'Enter in a box checks the answer'); assert.strictEqual(ADD.problem, p2, 'and does NOT skip to the next problem'); assert.strictEqual(chips() - e0, 25, 'Medium pays 25');
    doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); assert.strictEqual(ADD.state(), 'playing', 'Enter then moves on'); }

  /* ---------- 100 right answers earn the trophy ---------- */
  Store.reset(); ADD.close(); const t0 = chips(); play(ADD, 'padd', 1);
  for (let n = 1; n <= 100; n++) { solveAll(ADD, 'padd'); assert.strictEqual(solved('polyadd'), n); if (n < 100) assert.ok(!(Store.get().trophies || []).includes('polyadd'), `no polyadd trophy after ${n}`); click($('padd-next')); }
  assert.ok(Store.get().trophies.includes('polyadd'), 'the 100th right answer earns the polyadd trophy'); assert.strictEqual(chips() - t0, 1000, '100 Easy answers at 10 chips'); ADD.close();
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log('the Add/Sub trophy at 100');
} };
