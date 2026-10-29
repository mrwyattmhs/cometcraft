// The Cubes Table through the real boxes and sign buttons (simulated browser): Easy and Medium, one shot, the exact pay, Enter, and the 100-answer trophy.
const assert = require('assert');
const { plain, text } = require('../lib/util');

module.exports = { name: 'sim:cubes', tier: 'sim', covers: ['js/cubes.js', 'js/cubes-game.js', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'js/main.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, doc, $, click, w } = s, { Cubes, CubesGame: G, Store, Economy } = T; s.start(); await s.frames(2);
  const box = k => doc.querySelector(`#cub-form [data-box="${k}"]`), type = (k, v) => { const b = box(k); b.value = String(v); b.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const setSign = (k, v) => { const b = box(k); for (let i = 0; i < 3 && b.textContent !== (v > 0 ? '+' : Cubes.MINUS); i++) click(b); };
  const fill = a => { if (box('g')) type('g', a.g); setSign('s1', a.s1); type('a', a.a); setSign('s2', a.s2); type('b', a.b); type('c', a.c); };
  const chips = () => Store.get().chips, solved = () => (Store.get().solved || {}).cubes || 0;
  G.open(); const cards = [...doc.querySelectorAll('#cub-levels .bet')];
  assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['10 chips per answer', '25 chips per answer']); assert.deepStrictEqual(plain(Economy.PAY.cubes), [10, 25]);
  const c0 = chips(); click(cards[0]); let p = G.problem;
  assert.ok(!box('g'), 'Easy has no GCF box'); assert.deepStrictEqual(plain([...doc.querySelectorAll('#cub-form .cub-sign')].map(b => b.textContent)), ['?', '?'], 'every sign starts as a choice');
  click($('cub-check')); assert.strictEqual(G.state(), 'playing'); assert.match($('cub-msg').textContent, /Fill in every box first/); assert.strictEqual(chips(), c0);
  const r = Cubes.answerOf(p); fill({ ...r, s2: r.s1, c: r.c + 1 }); click($('cub-check'));
  assert.strictEqual(G.state(), 'done'); assert.deepStrictEqual([chips(), Store.get().cubesLosses], [c0, 1], 'a wrong answer pays nothing, and is counted'); click($('cub-check')); assert.strictEqual(Store.get().cubesLosses, 1, 'one shot');
  click($('cub-next')); p = G.problem; fill(Cubes.answerOf(p)); box('c').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.strictEqual(G.state(), 'done', 'Enter in a box checks the answer'); assert.strictEqual(G.problem, p, 'and does not skip ahead'); assert.strictEqual(chips() - c0, 10); assert.strictEqual(solved(), 1);
  click($('cub-change')); click(cards[1]); p = G.problem; assert.ok(p.g >= 2 && box('g'), 'Medium has a GCF to take out first'); const c1 = chips();
  fill({ ...Cubes.answerOf(p), g: 1 }); click($('cub-check')); assert.strictEqual(chips(), c1, 'forgetting the GCF pays nothing'); click($('cub-next')); fill(Cubes.answerOf(G.problem)); click($('cub-check')); assert.strictEqual(chips() - c1, 25, 'Medium pays 25');
  Store.reset(); click($('cub-change')); click(cards[0]); const t0 = chips();
  for (let n = 1; n <= 100; n++) { fill(Cubes.answerOf(G.problem)); click($('cub-check')); assert.strictEqual(solved(), n); if (n < 100) assert.ok(!(Store.get().trophies || []).includes('cubes')); click($('cub-next')); }
  assert.ok(Store.get().trophies.includes('cubes'), 'the 100th right answer earns the Cubes trophy'); assert.strictEqual(chips() - t0, 1000);
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log('Easy, Medium, one shot, Enter, trophy at 100');
} };
