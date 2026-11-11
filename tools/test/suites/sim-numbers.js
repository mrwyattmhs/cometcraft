// The Numbers Game through its real boxes and number pad (simulated browser): two targets and two boxes, the plus-or-minus key (off on Easy, on when the answers can be negative), taps that go
// to the box you touched, Enter that moves to the empty box, either order being right, each box marked on its own, the exact pay, and the 100-answer trophy.
const assert = require('assert');
const { plain, text } = require('../lib/util');

module.exports = { name: 'sim:numbers', tier: 'sim', covers: ['js/number-pairs.js', 'js/booth-game.js', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'js/main.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, doc, $, click, w } = s, { NumberPairs: N, NumbersGame: G, Store, Economy } = T; s.start(); await s.frames(2);
  const P = id => $(`nbg-${id}`), keys = () => [...P('pad').querySelectorAll('.eqn-key')], tap = k => click(keys().find(x => x.dataset.key === k));
  const type = (i, v) => { const b = G.boxes[i]; b.value = String(v); b.dispatchEvent(new w.Event('input', { bubbles: true })); }, touch = i => G.boxes[i].dispatchEvent(new w.Event('focus'));
  const enter = i => G.boxes[i].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const chips = () => Store.get().chips, solved = () => (Store.get().solved || {}).numbers || 0, open = lv => { G.open(); click(doc.querySelectorAll('#nbg-levels .bet')[lv - 1]); return G.problem; };
  const tapNumber = (i, n) => { touch(i); String(Math.abs(n)).split('').forEach(tap); if (n < 0) tap('sign'); };

  /* ---------- the menu ---------- */
  G.open(); const cards = [...doc.querySelectorAll('#nbg-levels .bet')];
  assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-amt').textContent)), ['Easy', 'Medium', 'Hard']); assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['10 chips per answer', '25 chips per answer', '50 chips per answer']);
  assert.deepStrictEqual(plain(Economy.PAY.numbers), [10, 25, 50]); assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.poly-sample').textContent)), plain(N.LEVELS.map(l => l.sample)));
  assert.strictEqual(text(doc.querySelector('#nbg .k-wing')), 'House of Algebra'); assert.strictEqual(text($('nbg-title')), 'Numbers Game'); G.close();

  /* ---------- Easy: two targets, two boxes, and a pad with a plus-or-minus key that is switched off ---------- */
  let p = open(1), c0 = chips(); const line = P('eq');
  assert.strictEqual(G.boxes.length, 2, 'two boxes'); assert.ok(line.classList.contains('nbg')); assert.deepStrictEqual(plain(G.boxes.map(b => b.getAttribute('aria-label'))), ['First number', 'Second number']);
  assert.deepStrictEqual(plain([...line.querySelectorAll('.nbg-top span')].map(e => e.textContent)), ['multiply to', N.fmt(p.product)], 'the product is on top'); assert.deepStrictEqual(plain([...line.querySelectorAll('.nbg-bot span')].map(e => e.textContent)), [N.fmt(p.sum), 'add to'], 'the sum is underneath');
  assert.deepStrictEqual(plain([...line.children].map(c => c.className.split(' ')[0])), ['nbg-top', 'eqn-box', 'nbg-x', 'eqn-box', 'nbg-bot'], 'the two boxes sit either side of the cross'); assert.ok(G.boxes.every(b => b.inputMode === 'none' && !b.readOnly));
  assert.deepStrictEqual(plain(keys().map(k => k.dataset.key)), ['7', '8', '9', 'back', '4', '5', '6', 'sign', '1', '2', '3', '0', 'check'], 'four columns: the digits, with backspace, plus-or-minus and 0 down the right, and Check underneath');
  assert.ok(P('pad').classList.contains('eqn-pad4')); assert.strictEqual(P('sign').getAttribute('aria-label'), 'Plus or minus'); assert.strictEqual(P('sign').disabled, true, 'Easy has no negative answers, so the plus-or-minus key is off');
  tap('1'); tap('6'); assert.deepStrictEqual(plain(G.boxes.map(b => b.value)), ['16', ''], 'taps go into the first box to begin with'); touch(1); tap('2'); assert.deepStrictEqual(plain(G.boxes.map(b => b.value)), ['16', '2'], 'and into the second once you touch it');
  touch(0); tap('back'); tap('sign'); assert.deepStrictEqual(plain(G.boxes.map(b => b.value)), ['1', '2'], 'backspace works on the box you touched; plus-or-minus does nothing on Easy'); type(0, '-5'); assert.strictEqual(G.boxes[0].value, '5', 'and a typed minus sign is dropped on Easy');
  type(0, ''); click(P('check')); assert.strictEqual(G.state(), 'playing'); assert.match(P('msg').textContent, /Fill in both boxes first/); assert.strictEqual(chips(), c0);
  type(0, p.a); assert.ok(!P('msg').classList.contains('bad'), 'typing clears the nag'); type(1, ''); enter(0); assert.strictEqual(G.state(), 'playing', 'Enter in a filled box with the other one empty does not check'); assert.strictEqual(doc.__focused, G.boxes[1], 'it moves you to the empty box'); assert.ok(!P('msg').classList.contains('bad'), 'without a nag (it moved on; it did not try to check)');
  const other = N.factorPairs(p.product).find(([d, e]) => d !== Math.min(p.a, p.b)), wrong = other || [p.a + 1, p.b];                // a pair that multiplies to the product but adds to something else
  type(0, wrong[0]); type(1, wrong[1]); click(P('check'));
  assert.strictEqual(G.state(), 'done'); assert.deepStrictEqual([chips(), Store.get().numbersLosses, solved()], [c0, 1, 0], 'a wrong pair pays nothing, and is counted'); assert.ok(G.boxes.every(b => b.disabled));
  assert.deepStrictEqual(plain([...doc.querySelectorAll('#nbg-result .final-expr')].map(e => e.textContent)), plain(N.done(p).split(' and ')), 'the answer is shown as its two equations, a line each');
  assert.strictEqual(doc.querySelectorAll('#nbg-result li').length, 4); assert.ok(doc.querySelector('#nbg-result details').open); assert.ok(P('pad').classList.contains('hidden') && !P('after').classList.contains('hidden') && P('play').classList.contains('answered'), 'the answer takes the pad\'s place');
  click(P('check')); assert.strictEqual(Store.get().numbersLosses, 1, 'one shot only');
  click(P('next')); assert.ok(!P('pad').classList.contains('hidden') && !P('play').classList.contains('answered')); p = G.problem; const [x, y] = N.answerOf(p);
  type(0, y); type(1, x); enter(1); assert.strictEqual(G.state(), 'done', 'Enter with both boxes filled checks'); assert.strictEqual(G.problem, p, 'and does not skip ahead'); assert.strictEqual(chips() - c0, 10, 'the pair in the other order is right too: Easy pays 10');
  assert.ok(G.boxes.every(b => b.classList.contains('ok'))); doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); assert.strictEqual(G.state(), 'playing', 'Enter then moves on');
  p = G.problem; { const [a, b] = N.answerOf(p), bad = a + 1 === b ? a + 2 : a + 1; type(0, a); type(1, bad); click(P('check')); assert.deepStrictEqual(plain(G.boxes.map(b2 => (b2.classList.contains('ok') ? 'ok' : 'miss'))), ['ok', 'miss'], 'each box is marked on its own: the right number is green, the wrong one red'); }
  ctx.log('Easy: the diamond, two boxes, taps to the touched box, Enter to the empty box, either order, marks');

  /* ---------- Medium and Hard: negative answers, by tapping ---------- */
  p = open(2); assert.strictEqual(P('sign').disabled, false, 'Medium has negative answers, so the plus-or-minus key is on'); assert.ok(p.a < 0 && p.b < 0);
  touch(0); tap('1'); tap('2'); tap('sign'); assert.strictEqual(G.boxes[0].value, '-12', 'plus-or-minus makes the box negative'); tap('sign'); assert.strictEqual(G.boxes[0].value, '12', 'and positive again'); tap('sign'); tap('3'); tap('4'); assert.strictEqual(G.boxes[0].value, '-123', 'three digits at most, sign or no sign');
  type(0, '-7'); assert.strictEqual(G.boxes[0].value, '-7', 'a typed minus sign is kept here'); type(0, '7-'); assert.strictEqual(G.boxes[0].value, '7', 'but only in front'); type(0, '');
  let b0 = chips(); N.answerOf(p).forEach((n, i) => tapNumber(i, n)); assert.deepStrictEqual(plain(G.boxes.map(b => Number(b.value))), plain(N.answerOf(p)), 'both negative numbers tapped in'); click(P('check')); assert.strictEqual(chips() - b0, 25, 'Medium pays 25');
  p = open(3); const kinds = new Set(); let zero = false;
  for (let i = 0; i < 300; i++) { const q = G.problem; kinds.add(q.kind); zero = zero || q.sum === 0; const before = chips(); N.answerOf(q).forEach((n, k) => tapNumber(k, n)); click(P('check')); assert.strictEqual(chips() - before, 50, `Hard pays 50 (${N.text(q)})`); click(P('next')); }
  assert.deepStrictEqual([...kinds].sort(), ['nn', 'pn', 'pp'], 'Hard deals all three kinds'); assert.ok(zero, 'including a sum of 0');
  ctx.log('Medium and Hard: negatives by the plus-or-minus key, pay 25 and 50, all three kinds');

  /* ---------- 100 right answers earn the trophy ---------- */
  Store.reset(); const t0 = chips(); open(1);
  for (let n = 1; n <= 100; n++) { N.answerOf(G.problem).forEach((v, i) => type(i, v)); click(P('check')); assert.strictEqual(solved(), n); if (n < 100) assert.ok(!(Store.get().trophies || []).includes('numbers'), `no trophy after ${n}`); click(P('next')); }
  assert.ok(Store.get().trophies.includes('numbers'), 'the 100th right answer earns the Numbers Game trophy'); assert.strictEqual(chips() - t0, 1000, '100 Easy answers at 10 chips');
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log('trophy at 100');
} };
