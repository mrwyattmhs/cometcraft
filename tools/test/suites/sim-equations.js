// The House of Algebra's two equation booths through the real box (simulated browser), both run through the same checks: levels and pay, the box inside the equation, one shot per problem,
// the exact pay, Enter, every shape on Hard, and the 100-answer trophy. (One window engine runs both, so they must behave the same.)
const assert = require('assert');
const { plain, text } = require('../lib/util');

const TABLES = [
  { name: 'Missing Number', game: 'EquationGame', logic: 'Equations', pre: 'eqn', pay: 'missing', trophy: 'missing', losses: 'missingLosses', op: '+', easy: 'add1', slip: p => p.x + p.a, shapes: ['add1', 'add2', 'sub1', 'sub2'] },
  { name: 'Multiply & Divide', game: 'MulDivGame', logic: 'EquationsMD', pre: 'eqm', pay: 'muldiv', trophy: 'muldiv', losses: 'muldivLosses', op: '\u00d7', easy: 'mul1', slip: p => p.x + p.a, shapes: ['mul1', 'mul2', 'div1', 'div2'] },
];

module.exports = { name: 'sim:equations', tier: 'sim', covers: ['js/equations.js', 'js/equations-md.js', 'js/equation-game.js', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'js/main.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, doc, $, click, w } = s, { Store, Economy } = T; s.start(); await s.frames(2);
  for (const tb of TABLES) {
    const G = T[tb.game], E = T[tb.logic], P = id => $(`${tb.pre}-${id}`), at = (sel) => doc.querySelectorAll(`#${tb.pre}-levels .bet`);
    const type = n => { const b = G.box; b.value = String(n); b.dispatchEvent(new w.Event('input', { bubbles: true })); };
    const chips = () => Store.get().chips, solved = () => (Store.get().solved || {})[tb.trophy] || 0, open = lv => { G.open(); click(doc.querySelectorAll(`#${tb.pre}-levels .bet`)[lv - 1]); return G.problem; };
    Store.reset(); G.open(); const cards = [...doc.querySelectorAll(`#${tb.pre}-levels .bet`)];
    assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-amt').textContent)), ['Easy', 'Medium', 'Hard'], `${tb.name}: three levels`);
    assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['10 chips per answer', '25 chips per answer', '50 chips per answer']); assert.deepStrictEqual(plain(Economy.PAY[tb.pay]), [10, 25, 50]);
    assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.poly-sample').textContent)), plain(E.LEVELS.map(l => l.sample)), 'each card shows a sample equation'); assert.strictEqual(text(doc.querySelector(`#${tb.pre} .k-wing`)), 'House of Algebra'); G.close();

    /* ---------- Easy: the box is IN the equation; typing the missing number into it ---------- */
    let p = open(1), c0 = chips();
    assert.strictEqual(p.form, tb.easy); const line = P('eq'); assert.ok(line.querySelector('input.eqn-box'), `${tb.name}: the missing number is a real box in the equation`);
    assert.strictEqual(line.textContent.replace(/\s/g, ''), `${tb.op}${p.a}=${p.b}`, 'the rest of the equation is written round it');
    assert.deepStrictEqual(plain([...line.children].map(c => c.tagName === 'INPUT' ? '[ ]' : c.textContent)), plain(E.pieces(p).map(x => (x.box ? '[ ]' : x.op || (x.eq ? '=' : String(x.num))))), 'in the right order');
    type('abc'); assert.strictEqual(G.box.value, '', 'only digits go in the box'); click(P('check')); assert.strictEqual(G.state(), 'playing'); assert.match(P('msg').textContent, /Type a number into the box first/); assert.strictEqual(chips(), c0);
    type(tb.slip(p)); click(P('check'));                                                                                       // the classic slip: adding the two numbers
    assert.strictEqual(G.state(), 'done'); assert.deepStrictEqual([chips(), Store.get()[tb.losses], solved()], [c0, 1, 0], 'a wrong answer pays nothing, and is counted'); assert.ok(G.box.classList.contains('miss') && G.box.disabled);
    assert.strictEqual(doc.querySelector(`#${tb.pre}-result .final-expr`).textContent, E.text(p).replace('[ ]', String(p.x)), 'the right answer is shown filled in'); assert.strictEqual(doc.querySelectorAll(`#${tb.pre}-result li`).length, 3); assert.ok(doc.querySelector(`#${tb.pre}-result details`).open, 'the steps are open after a miss');
    click(P('check')); assert.strictEqual(Store.get()[tb.losses], 1, 'one shot only');
    click(P('next')); p = G.problem; type(p.x); G.box.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.strictEqual(G.state(), 'done', 'Enter in the box checks the answer'); assert.strictEqual(G.problem, p, 'and does not skip to the next problem'); assert.strictEqual(chips() - c0, 10, 'Easy pays 10'); assert.ok(G.box.classList.contains('ok')); assert.ok(!doc.querySelector(`#${tb.pre}-result details`).open);
    doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); assert.strictEqual(G.state(), 'playing', 'Enter then moves on');

    /* ---------- Medium and Hard ---------- */
    for (const [lv, pay] of [[2, 25], [3, 50]]) { p = open(lv); assert.strictEqual(p.level, lv); const b0 = chips(); type(p.x); click(P('check')); assert.strictEqual(chips() - b0, pay, `${tb.name}: level ${lv} pays ${pay}`); }
    p = open(3); const forms = new Set(), flips = new Set();
    for (let i = 0; i < 300; i++) { forms.add(G.problem.form); flips.add(G.problem.flip); type(G.problem.x); click(P('check')); click(P('next')); }
    assert.deepStrictEqual([...forms].sort(), [...tb.shapes].sort(), `${tb.name}: Hard deals every shape`); assert.deepStrictEqual([...flips].sort(), [false, true], 'and turned-round equations');

    /* ---------- 100 right answers earn the trophy ---------- */
    Store.reset(); const t0 = chips(); open(1);
    for (let n = 1; n <= 100; n++) { type(G.problem.x); click(P('check')); assert.strictEqual(solved(), n); if (n < 100) assert.ok(!(Store.get().trophies || []).includes(tb.trophy), `no trophy after ${n}`); click(P('next')); }
    assert.ok(Store.get().trophies.includes(tb.trophy), `the 100th right answer earns the ${tb.name} trophy`); assert.strictEqual(chips() - t0, 1000, '100 Easy answers at 10 chips'); G.close();
    ctx.log(`${tb.name}: Easy, Medium, Hard, one shot, Enter, trophy at 100`);
  }
  assert.deepStrictEqual(s.errors, [], 'no errors');
} };
