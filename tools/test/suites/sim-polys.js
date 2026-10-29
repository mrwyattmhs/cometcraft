// The Polynomials tables through the real boxes (simulated browser): levels and pay, one shot per problem, the arches (Step 1 is one line of outlined blanks, no worked-out arithmetic),
// the cube's two rounds, the minus sign's arches, the combine step, Enter, and the 100-answer trophies.
const assert = require('assert');
const { plain, text } = require('../lib/util');

module.exports = { name: 'sim:polynomials', tier: 'sim', covers: ['js/polys.js', 'js/poly-game.js', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'js/main.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, doc, $, click, w } = s, { Polys, PolyMulGame: MUL, PolyAddGame: ADD, Store, Economy, Trophies } = T, M = Polys.MINUS; s.start(); await s.frames(2);
  const type = (b, v) => { b.value = String(v); b.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const enter = (g, first, second) => { const b = g.boxes; first.forEach((v, i) => type(b.first[i], v)); second.forEach((v, i) => type(b.second[i], v)); };
  const rightFor = (p, k = 0) => (p.kind === 'mul' ? (a => [a.products, a.combined])(Polys.stageAnswer(Polys.mulStages(p)[k])) : (a => [a.distributed, a.combined])(Polys.addAnswer(p)));
  const chips = () => Store.get().chips, solved = id => (Store.get().solved || {})[id] || 0;
  const solveAll = (g, pre) => { const p = g.problem; for (let k = 0; k < g.stageCount; k++) { const [f, c] = rightFor(p, k); enter(g, f, c); click($(`${pre}-check`)); if (k < g.stageCount - 1) { assert.strictEqual(g.state(), 'between'); click($(`${pre}-next`)); } } assert.strictEqual(g.state(), 'done'); };
  const rollUntil = (g, pre, want) => { for (let i = 0; i < 500; i++) { if (want(g)) return true; if (g.state() === 'playing' || g.state() === 'between') solveAll(g, pre); click($(`${pre}-next`)); } return false; };
  const play = (g, pre, level) => { g.open(); click(doc.querySelectorAll(`#${pre}-levels .bet`)[level - 1]); return g.problem; };

  /* ---------- menus ---------- */
  MUL.open(); let cards = [...doc.querySelectorAll('#pmul-levels .bet')];
  assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-amt').textContent)), ['Easy', 'Medium', 'Hard']); assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['10 chips per answer', '25 chips per answer', '50 chips per answer']);
  MUL.close(); ADD.open(); cards = [...doc.querySelectorAll('#padd-levels .bet')];
  assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-amt').textContent)), ['Easy', 'Medium']); assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['10 chips per answer', '25 chips per answer']); ADD.close();

  /* ---------- Multiply, Easy: arches, outlined blanks, one shot ---------- */
  s.seed(2024); let p = play(MUL, 'pmul', 1), bx = MUL.boxes; const st0 = Polys.mulStages(p)[0];
  assert.deepStrictEqual([bx.first.length, bx.second.length, MUL.stageCount], [4, 3, 1]);
  assert.deepStrictEqual(plain([...doc.querySelectorAll('#pmul-steps .poly-step h3')].map(h => h.textContent)), ['Step 1: Distribute: multiply along every arch and write out the answer.', 'Step 2: Combine like terms.']);
  const steps = $('pmul-steps'); assert.strictEqual(steps.querySelectorAll('.poly-cap, .poly-eq, .poly-dot').length, 0, 'nothing worked out inline'); assert.ok(!/\u00b7/.test(steps.textContent), 'no multiplication shown in the steps');
  const arch = steps.querySelector('.poly-arch'); assert.deepStrictEqual(plain([...arch.querySelectorAll('.poly-term')].map(t => t.dataset.ref)), ['L0', 'L1', 'R0', 'R1']);
  assert.deepStrictEqual(plain([...arch.querySelectorAll('path.poly-arc')].map(a => [a.dataset.from, a.dataset.to, a.dataset.side, a.dataset.color])), [['L0', 'R0', 'above', '0'], ['L0', 'R1', 'above', '0'], ['L1', 'R0', 'below', '1'], ['L1', 'R1', 'below', '1']], 'the first term across the second polynomial (above), then the next term (below)');
  const ex = steps.querySelector('.poly-expand'), blanks = [...ex.querySelectorAll('input.poly-num')];
  assert.deepStrictEqual(plain(blanks.map(b => b.style.borderColor)), plain(st0.products.map(x => ({ 0: 'rgb(255, 196, 92)', 1: 'rgb(127, 227, 255)' })[x.i])), 'each blank is outlined in the colour of its arch');
  assert.deepStrictEqual(plain(blanks.map(b => b.getAttribute('aria-label'))), plain(st0.products.map(x => `The number for ${x.caption}`)), 'screen readers still hear the multiplication');
  blanks[2].dispatchEvent(new w.Event('mouseenter')); assert.deepStrictEqual(plain([...arch.querySelectorAll('path.poly-arc')].map(a => a.classList.contains('on'))), [false, false, true, false], 'pointing at a blank lights its arch'); blanks[2].dispatchEvent(new w.Event('mouseleave'));
  const c0 = chips(); click($('pmul-check')); assert.strictEqual(MUL.state(), 'playing'); assert.match($('pmul-msg').textContent, /Fill in every box first/); assert.strictEqual(chips(), c0);
  let [f, c] = rightFor(p); const wrong = f.slice(); wrong[1] += 1; enter(MUL, wrong, c); click($('pmul-check'));
  assert.strictEqual(MUL.state(), 'done'); assert.deepStrictEqual(plain(bx.first.map(b => b.classList.contains('miss'))), [false, true, false, false], 'only the wrong product is red'); assert.ok(bx.first.every(b => b.style.borderColor === ''), 'the outlines give way to the marks');
  assert.deepStrictEqual([chips(), Store.get().polymulLosses, solved('polymul')], [c0, 1, 0], 'a wrong answer pays nothing and costs nothing'); click($('pmul-check')); assert.strictEqual(Store.get().polymulLosses, 1, 'one shot only');
  click($('pmul-next')); p = MUL.problem; bx = MUL.boxes; [f, c] = rightFor(p); enter(MUL, f, c); const c1 = chips();
  bx.all[bx.all.length - 1].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.strictEqual(MUL.state(), 'done', 'Enter in a box checks the answer'); assert.strictEqual(MUL.problem, p, 'and does NOT skip to the next problem'); assert.strictEqual(chips() - c1, 10, 'Easy pays 10');
  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); assert.strictEqual(MUL.state(), 'playing', 'Enter then moves on');
  ctx.log('Multiply Easy: arches, outlined blanks, marks, one shot, Enter');

  /* ---------- Multiply, Medium and Hard: the same screen, bigger problems, bigger pay ---------- */
  for (const [lv, pay, n] of [[2, 25, 6]]) { MUL.open(); click(doc.querySelectorAll('#pmul-levels .bet')[lv - 1]); p = MUL.problem; assert.strictEqual(MUL.boxes.first.length, n, 'a binomial and a trinomial: six products'); const b4 = chips(); solveAll(MUL, 'pmul'); assert.strictEqual(chips() - b4, pay); }
  MUL.open(); click(doc.querySelectorAll('#pmul-levels .bet')[2]);
  assert.ok(rollUntil(MUL, 'pmul', g => g.stageCount === 1), 'a squared trinomial came up');
  { const arcs = [...doc.querySelectorAll('#pmul-steps .poly-arc')]; assert.strictEqual(arcs.length, 9); assert.deepStrictEqual(plain(['0', '1', '2'].map(k => arcs.filter(a => a.dataset.color === k).length)), [3, 3, 3], 'nine arches in three colours'); }
  /* a cube is two rounds, and round two starts from the right answer to round one */
  assert.ok(rollUntil(MUL, 'pmul', g => g.stageCount === 2), 'a cubed binomial came up');
  { p = MUL.problem; const stg = Polys.mulStages(p); bx = MUL.boxes; const lost0 = Store.get().polymulLosses, b5 = chips(); assert.strictEqual(doc.querySelectorAll('#pmul-steps .poly-stage').length, 1); assert.deepStrictEqual([bx.first.length, doc.querySelectorAll('#pmul-steps .poly-arc').length], [4, 4]);
    let [f1, s1] = rightFor(p, 0); f1 = f1.slice(); f1[0] += 1; enter(MUL, f1, s1); click($('pmul-check'));
    assert.strictEqual(MUL.state(), 'between'); assert.strictEqual(text($('pmul-next')), 'Continue'); assert.strictEqual(chips(), b5, 'nothing paid or lost between rounds'); assert.strictEqual(Store.get().polymulLosses, lost0, 'the loss is counted only at the end');
    click($('pmul-next')); assert.strictEqual(MUL.stageIndex, 1); assert.strictEqual(doc.querySelectorAll('#pmul-steps .poly-stage').length, 2, 'round two appears below round one');
    const a2 = doc.querySelector('#pmul-steps .poly-arch[data-stage="2"]'); assert.deepStrictEqual(plain([...a2.querySelectorAll('.poly-term')].slice(0, stg[1].leftTerms.length).map(t => t.textContent.replace(/\s+/g, ' '))), plain(stg[1].leftTerms.map((t, i) => (i === 0 ? Polys.termText(t.c, t.d, p.v) : `${t.c < 0 ? M : '+'} ${Polys.termText(Math.abs(t.c), t.d, p.v)}`))), 'round two starts from the CORRECT round-one answer, not what was typed');
    bx = MUL.boxes; assert.strictEqual(bx.first.length, 6); const [f2, s2] = rightFor(p, 1); enter(MUL, f2, s2); click($('pmul-check'));
    assert.strictEqual(MUL.state(), 'done'); assert.strictEqual(chips(), b5, 'a slip in round one means no pay, even with round two right'); assert.strictEqual(Store.get().polymulLosses, lost0 + 1);
    assert.ok(rollUntil(MUL, 'pmul', g => g.stageCount === 2 && g.state() === 'playing'), 'another cube'); const b6 = chips(); solveAll(MUL, 'pmul'); assert.strictEqual(chips() - b6, 50, 'both rounds right: Hard pays 50'); }
  ctx.log('Multiply Medium and Hard: nine arches, the cube in two rounds, pay 25 and 50');

  /* ---------- Add / Subtract ---------- */
  p = play(ADD, 'padd', 1); assert.strictEqual(p.op, 1); assert.deepStrictEqual(plain([...doc.querySelectorAll('#padd-steps h3')].map(h => h.textContent)), ['Step 1: Combine like terms.']); assert.strictEqual(doc.querySelectorAll('#padd-steps .poly-arch').length, 0, 'no arches when adding');
  let b7 = chips(); solveAll(ADD, 'padd'); assert.strictEqual(chips() - b7, 10);
  click($('padd-change')); click(doc.querySelectorAll('#padd-levels .bet')[1]); p = ADD.problem; bx = ADD.boxes;
  assert.strictEqual(p.op, -1); const sa = doc.querySelector('#padd-steps .poly-arch'); assert.strictEqual(sa.querySelector('[data-ref="S"]').textContent, M, 'an arch from the minus sign');
  assert.deepStrictEqual(plain([...sa.querySelectorAll('path.poly-arc')].map(a => [a.dataset.from, a.dataset.to])), plain(Polys.termsOf(p.Q).map((t, j) => ['S', `R${j}`])), 'to every term of the second polynomial');
  b7 = chips(); [f, c] = rightFor(p); enter(ADD, Polys.termsOf(p.Q).map(t => t.c), c); click($('padd-check')); assert.ok(bx.first.every(b => b.classList.contains('miss')), 'forgetting to distribute the minus sign is marked'); assert.strictEqual(chips(), b7);
  click($('padd-next')); b7 = chips(); solveAll(ADD, 'padd'); assert.strictEqual(chips() - b7, 25);
  ctx.log('Add/Subtract: no arches to add, minus-sign arches to subtract, pay 10 and 25');

  /* ---------- 100 right answers earn each table's trophy ---------- */
  for (const [g, id, pre] of [[MUL, 'polymul', 'pmul'], [ADD, 'polyadd', 'padd']]) {
    Store.reset(); g.close(); const t0 = chips(); play(g, pre, 1);
    for (let n = 1; n <= 100; n++) { solveAll(g, pre); assert.strictEqual(solved(id), n); if (n < 100) assert.ok(!(Store.get().trophies || []).includes(id), `no ${id} trophy after ${n}`); click($(`${pre}-next`)); }
    assert.ok(Store.get().trophies.includes(id), `the 100th right answer earns the ${id} trophy`); assert.strictEqual(chips() - t0, 1000, '100 Easy answers at 10 chips'); g.close();
  }
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log('both trophies at 100');
} };
