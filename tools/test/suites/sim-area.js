// The Multiply table as an AREA MODEL through its real boxes (simulated browser):
//   THE PICTURE   the first polynomial down the left and the second across the top, a square for each row and column, and a "combine like terms" line with a box for each power
//   TYPING        a term in each square from the pad (digits, minus, the variable with a power) or the keyboard; a number in each box of the line; Enter moves on
//   MARKING       every square and every box is marked on its own, a wrong one shows the right answer; one shot; Easy 10, Medium 25, Hard 50; the trophy at 100
const assert = require('assert');
const { plain, text } = require('../lib/util');

module.exports = { name: 'sim:area', tier: 'sim', covers: ['js/polys.js', 'js/area-game.js', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'js/main.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, doc, $, click, w } = s, { Polys, PolyMulGame: G, Store } = T, M = Polys.MINUS; s.start(); await s.frames(2);
  const chips = () => Store.get().chips, solved = () => (Store.get().solved || {}).polymul || 0, trophies = () => Store.get().trophies || [];
  const type = (b, v) => { b.value = String(v); b.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const focused = []; w.HTMLElement.prototype.focus = function () { focused.push(this); };                  // (the simulated page does not track focus, so every focus() call is recorded instead)
  const last = () => focused[focused.length - 1];
  const focus = b => b.dispatchEvent(new w.Event('focus')), blur = b => b.dispatchEvent(new w.Event('blur')), key = (b, k) => b.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const pad = k => doc.querySelector(`#pmul-pad [data-key="${k}"]`), tap = k => click(pad(k)), check = () => click($('pmul-check'));
  const want = () => Polys.mulAnswer(G.problem), termText = x => Polys.termText(x.c, x.d, G.problem.v);
  const solve = () => { const w2 = want(); G.cells.forEach((b, i) => type(b, termText(w2.cells[i]))); G.sums.forEach((b, i) => type(b, String(w2.combined[i]).replace('-', M))); check(); assert.strictEqual(G.state(), 'done'); };
  const open = lv => { G.open(); click(doc.querySelectorAll('#pmul-levels .bet')[lv - 1]); return G.problem; };

  /* ---------- the menu ---------- */
  G.open(); const cards = [...doc.querySelectorAll('#pmul-levels .bet')];
  assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-amt').textContent)), ['Easy', 'Medium', 'Hard']); assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['10 chips per answer', '25 chips per answer', '50 chips per answer']);
  assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.poly-sample').textContent)), plain(Polys.MUL_LEVELS.map(l => l.sample))); assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-desc').textContent)), plain(Polys.MUL_LEVELS.map(l => l.desc)));
  assert.strictEqual(text(doc.querySelector('#pmul .k-wing')), 'Polynomials wing'); assert.strictEqual(text($('pmul-title')), 'Multiply Table'); assert.strictEqual(text($('pmul-close')), 'Leave table'); G.close();

  /* ---------- the picture (Easy: a monomial times a binomial) ---------- */
  s.seed(2024); let p = open(1); const c0 = chips(), g = G.grid, v = p.v;
  assert.strictEqual(text($('pmul-poly')), Polys.mulText(p)); assert.deepStrictEqual([g.rows.length, g.cols.length, G.cells.length], [1, 2, 2], 'one row of two squares');
  assert.deepStrictEqual(plain([...doc.querySelectorAll('#pmul-grid .area-colhead')].map(h => h.textContent)), plain(g.cols.map((t, j) => (j === 0 ? Polys.termText(t.c, t.d, v) : `${t.c < 0 ? M : '+'}${Polys.termText(Math.abs(t.c), t.d, v)}`))), 'the second polynomial across the top, the signs kept');
  assert.deepStrictEqual(plain([...doc.querySelectorAll('#pmul-grid .area-rowhead')].map(h => h.textContent)), [Polys.termText(g.rows[0].c, g.rows[0].d, v)], 'the monomial down the side'); assert.strictEqual(text(doc.querySelector('#pmul-grid .area-corner')), '\u00d7');
  assert.strictEqual($('pmul-grid').style.gridTemplateColumns, 'auto repeat(2, minmax(0, 1fr))'); assert.ok(G.cells.every(b => b.classList.contains('eqn-box') && b.inputMode === 'none' && b.type === 'text'), 'real inputs that do not summon a phone keyboard');
  assert.deepStrictEqual(plain(G.cells.map(b => [b.dataset.row, b.dataset.col])), [['0', '0'], ['0', '1']], 'squares are in order, row by row'); assert.strictEqual(text(doc.querySelector('#pmul-combine .area-lead')), 'Combine like terms:');
  assert.deepStrictEqual(plain([...doc.querySelectorAll('#pmul-combine .area-pow')].map(e => e.textContent)), plain(g.degrees.map(d => Polys.power(v, d))), 'a box for each power, highest first'); assert.strictEqual(G.sums.length, g.degrees.length); assert.strictEqual(doc.querySelectorAll('#pmul-combine .area-plus').length, g.degrees.length - 1);
  assert.deepStrictEqual(plain([...doc.querySelectorAll('#pmul-pad .eqn-key')].map(k => k.dataset.key || 'check')), ['7', '8', '9', 'back', '4', '5', '6', 'neg', '1', '2', '3', 'v1', '0', 'v2', 'v3', 'v4', 'check'], 'the pad: digits, backspace, minus, and the variable with its powers; Check underneath');
  assert.deepStrictEqual(plain(['v1', 'v2', 'v3', 'v4'].map(k => pad(k).textContent)), [v, `${v}\u00b2`, `${v}\u00b3`, `${v}\u2074`], 'the pad shows this problem\'s variable'); assert.ok(!doc.querySelector('#pmul-pad').classList.contains('hidden') && doc.querySelector('#pmul-after').classList.contains('hidden'));
  assert.ok(G.cells.every(b => !b.getAttribute('aria-label').includes('\u00b7') && /^The area of the square for /.test(b.getAttribute('aria-label'))), 'a screen reader hears what to multiply, not the answer'); assert.strictEqual(last(), G.cells[0], 'the first square is ready to type in');

  /* ---------- lighting the row and column ---------- */
  { const lit = () => plain([...doc.querySelectorAll('#pmul-grid .area-head.on')].map(h => (h.dataset.row !== undefined ? `row${h.dataset.row}` : `col${h.dataset.col}`)).sort());
    focus(G.cells[1]); assert.deepStrictEqual(lit(), ['col1', 'row0'], 'focusing a square lights the head of its row and its column'); focus(G.cells[0]); assert.deepStrictEqual(lit(), ['col0', 'row0']); focus(G.sums[0]); assert.deepStrictEqual(lit(), [], 'a box on the combine line lights nothing'); focus(G.cells[1]); blur(G.cells[1]); assert.deepStrictEqual(lit(), []); }

  /* ---------- typing from the pad ---------- */
  focus(G.cells[0]); ['neg', '6', 'v2'].forEach(tap); assert.strictEqual(G.cells[0].value, `${M}6${v}\u00b2`, 'minus, 6, then the variable squared'); tap('v1'); assert.strictEqual(G.cells[0].value, `${M}6${v}`, 'a new power replaces the old one'); tap('5'); assert.strictEqual(G.cells[0].value, `${M}6${v}`, 'no digits after the variable');
  tap('back'); assert.strictEqual(G.cells[0].value, `${M}6`, 'backspace takes the variable off in one go'); tap('back'); tap('back'); assert.strictEqual(G.cells[0].value, ''); ['1', '2', '3'].forEach(tap); assert.strictEqual(G.cells[0].value, '12', 'two digits at most'); tap('neg'); assert.strictEqual(G.cells[0].value, `${M}12`); tap('neg'); assert.strictEqual(G.cells[0].value, '12', 'the minus key flips the sign'); type(G.cells[0], '');
  focus(G.sums[0]); ['neg', '4', '2'].forEach(tap); assert.strictEqual(G.sums[0].value, `${M}42`, 'the combine line takes a number'); tap('v2'); tap('v1'); assert.strictEqual(G.sums[0].value, `${M}42`, 'the variable keys do nothing there'); assert.ok(pad('v1').disabled && pad('v4').disabled, 'and they are switched off while you are in one'); tap('3'); assert.strictEqual(G.sums[0].value, `${M}42`, 'two digits at most'); type(G.sums[0], '');
  focus(G.cells[1]); assert.ok(!pad('v1').disabled && !pad('v4').disabled, 'and back on in a square'); 
  type(G.cells[0], ''); type(G.cells[1], ''); tap('7'); assert.ok(G.cells[0].value === '7' || G.cells[1].value === '7', 'with nothing chosen, a tap goes into a square');

  /* ---------- typing from a keyboard ---------- */
  type(G.cells[0], `-6${v}^2`); assert.strictEqual(G.cells[0].value, `${M}6${v}\u00b2`, 'a minus sign and ^2 are tidied'); type(G.cells[0], '123'); assert.strictEqual(G.cells[0].value, '12'); type(G.cells[0], `5${v}${v}`); assert.strictEqual(G.cells[0].value, `5${v}`); type(G.cells[0], '5q'); assert.strictEqual(G.cells[0].value, '5', 'letters that are not the variable do not go in');
  { let acc = ''; for (const ch of `-3${v}^2`) { acc += ch; type(G.cells[0], acc); acc = G.cells[0].value; } assert.strictEqual(G.cells[0].value, `${M}3${v}\u00b2`, 'typed one key at a time: the ^ waits for its 2'); }
  type(G.sums[0], '-5'); assert.strictEqual(G.sums[0].value, `${M}5`); type(G.sums[0], '12x3'); assert.strictEqual(G.sums[0].value, '12'); type(G.sums[0], '1-2'); assert.strictEqual(G.sums[0].value, '12', 'a minus sign only goes at the front'); type(G.sums[0], '123'); assert.strictEqual(G.sums[0].value, '12');
  G.boxes.forEach(b => type(b, ''));

  /* ---------- Enter moves on, then checks ---------- */
  type(G.cells[0], '1'); key(G.cells[0], 'Enter'); assert.strictEqual(last(), G.cells[1], 'Enter goes to the next empty box'); assert.strictEqual(G.state(), 'playing'); type(G.cells[1], '1'); key(G.cells[1], 'Enter'); assert.strictEqual(last(), G.sums[0], 'and on to the line below'); assert.strictEqual(G.state(), 'playing');
  G.sums.forEach(b => type(b, '1')); key(G.sums[G.sums.length - 1], 'Enter'); assert.strictEqual(G.state(), 'done', 'with every box filled, Enter checks'); assert.strictEqual(G.problem, p, 'and does NOT skip to the next problem'); const lost = Store.get().polymulLosses; assert.ok(lost >= 0);
  Store.reset(); doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); assert.strictEqual(G.state(), 'playing', 'Enter then moves on'); assert.notStrictEqual(G.problem, p);

  /* ---------- a wrong answer: marks, the right answer filled in, one shot ---------- */
  s.seed(77); p = open(1); const b0 = chips(); let w2 = want(); const wrongCell = 1;
  check(); assert.strictEqual(G.state(), 'playing'); assert.match($('pmul-msg').textContent, /Type a term in every square/); assert.strictEqual(chips(), b0); assert.strictEqual(last(), G.cells[0], 'it takes you to the first empty box');
  G.cells.forEach((b, i) => type(b, termText(w2.cells[i]))); type(G.cells[wrongCell], `${w2.cells[wrongCell].c + 1}${p.v}`); check(); assert.strictEqual(G.state(), 'playing'); assert.match($('pmul-msg').textContent, /Type a number in every box on the line/, 'the line below is empty');
  type(G.cells[1], 'q'); assert.strictEqual(G.cells[1].value, '', 'a wrong letter cannot even be typed'); type(G.cells[1], `${w2.cells[1].c + 1}${p.v}`); G.sums.forEach((b, i) => type(b, String(w2.combined[i])));
  G.sums[0].value = `${w2.combined[0] + 1}`; check();
  assert.strictEqual(G.state(), 'done'); assert.deepStrictEqual(plain(G.cells.map(b => (b.classList.contains('miss') ? 'miss' : 'ok'))), ['ok', 'miss'], 'only the wrong square is red'); assert.strictEqual(G.cells[1].value, termText(w2.cells[1]), 'and it now shows the right area'); assert.strictEqual(G.cells[1].dataset.typed, Polys.tidyTerm(`${w2.cells[1].c + 1}${p.v}`, p.v), 'what you typed is kept in the box\'s data');
  assert.deepStrictEqual(plain(G.sums.map((b, i) => (b.classList.contains('miss') ? 'miss' : 'ok'))), plain(G.sums.map((b, i) => (i === 0 ? 'miss' : 'ok'))), 'the line is marked box by box'); assert.strictEqual(G.sums[0].value, String(w2.combined[0]).replace('-', M), 'with the right number filled in'); assert.ok(G.boxes.every(b => b.disabled), 'and everything is locked');
  assert.deepStrictEqual([chips(), Store.get().polymulLosses, solved()], [b0, 1, 0], 'a wrong answer pays nothing and costs nothing'); check(); assert.strictEqual(Store.get().polymulLosses, 1, 'one shot only'); assert.strictEqual(text($('pmul-msg')), 'Not this time. Nothing lost. The right answers are filled in.');
  assert.ok($('pmul-pad').classList.contains('hidden') && !$('pmul-after').classList.contains('hidden') && $('pmul-play').classList.contains('answered'), 'the answer card takes the pad\'s place');
  assert.strictEqual(text($('pmul-result').querySelector('.final-expr')), `${Polys.mulText(p)} = ${Polys.fmt(Polys.mulResult(p), p.v)}`); assert.ok($('pmul-result').querySelector('details').open, 'the steps are open after a wrong answer'); assert.deepStrictEqual(plain([...$('pmul-result').querySelectorAll('.work li')].map(l => l.textContent)), plain(Polys.mulSteps(p)));
  /* on a narrow screen the steps start closed (the right answers are already in the boxes), on a wide one they open after a wrong answer */
  { const wide = w.innerWidth; w.innerWidth = 390; click($('pmul-next')); G.cells.forEach(b => type(b, '1')); G.sums.forEach(b => type(b, '1')); check(); assert.ok(G.boxes.some(b => b.classList.contains('miss')) && !$('pmul-result').querySelector('details').open, 'narrow: the steps are one tap away'); assert.strictEqual($('pmul-result').querySelectorAll('.work li').length, Polys.mulSteps(G.problem).length, 'but they are all there'); w.innerWidth = wide; click($('pmul-next')); }
  ctx.log('the picture, the pad, the keyboard, Enter, marks per box, one shot, the right answers shown');

  /* ---------- a right answer, and every level's pay ---------- */
  click($('pmul-next')); p = G.problem; const r0 = chips(); solve(); assert.strictEqual(chips() - r0, 10, 'Easy pays 10'); assert.strictEqual(solved(), 1); assert.ok(G.boxes.every(b => b.classList.contains('ok') && !b.dataset.typed), 'everything green'); assert.ok(!$('pmul-result').querySelector('details').open, 'the steps stay closed after a right answer'); assert.strictEqual(text($('pmul-msg')), 'Correct! +10 chips.');
  for (const [lv, pay, shape] of [[2, 25, [2, 2]], [3, 50, null]]) { open(lv); const b1 = chips(); if (shape) assert.deepStrictEqual([G.grid.rows.length, G.grid.cols.length], shape); solve(); assert.strictEqual(chips() - b1, pay, `level ${lv} pays ${pay}`); }

  /* ---------- the sizes of Medium and Hard, and the variable on the pad, over many problems ---------- */
  { s.seed(5); const sizes = {}, vars = new Set(); for (const lv of [2, 3]) { open(lv); sizes[lv] = new Set(); for (let i = 0; i < 150; i++) { sizes[lv].add(`${G.grid.rows.length}x${G.grid.cols.length}`); vars.add(G.problem.v); assert.deepStrictEqual(plain(['v1', 'v2'].map(k => pad(k).textContent)), [G.problem.v, `${G.problem.v}\u00b2`]); solve(); click($('pmul-next')); } }
    assert.deepStrictEqual([...sizes[2]], ['2x2']); assert.deepStrictEqual([...sizes[3]].sort(), ['2x3', '3x2', '3x3'], 'Hard deals 2 by 3, 3 by 2 and 3 by 3'); assert.strictEqual(vars.size, Polys.VARS.length, 'every variable turns up'); }
  /* ---------- the pad can type every answer there is ---------- */
  { s.seed(9); for (const lv of [1, 2, 3]) { open(lv); for (let i = 0; i < 40; i++) { const a = want(); G.cells.forEach((b, k) => { type(b, ''); focus(b); const { c, d } = a.cells[k]; if (c < 0) tap('neg'); if (Math.abs(c) !== 1 || d === 0) String(Math.abs(c)).split('').forEach(tap); if (d > 0) tap(`v${d}`); }); G.sums.forEach((b, k) => { type(b, ''); focus(b); const c = a.combined[k]; if (c < 0) tap('neg'); String(Math.abs(c)).split('').forEach(tap); });
        check(); assert.ok(G.boxes.every(b => b.classList.contains('ok')), `the pad typed every right answer for ${Polys.mulText(G.problem)}`); click($('pmul-next')); } } }
  ctx.log('Medium and Hard: 2 by 2, 2 by 3, 3 by 2 and 3 by 3; pay 25 and 50; the pad can type every right answer');

  /* ---------- 100 right answers earn the trophy ---------- */
  Store.reset(); G.close(); const t0 = chips(); open(1);
  for (let n = 1; n <= 100; n++) { solve(); assert.strictEqual(solved(), n); if (n < 100) assert.ok(!trophies().includes('polymul'), `no trophy after ${n}`); click($('pmul-next')); }
  assert.ok(trophies().includes('polymul'), 'the 100th right answer earns the Multiply table trophy'); assert.strictEqual(chips() - t0, 1000, '100 Easy answers at 10 chips'); assert.strictEqual(Store.get().polymulWins, 100); G.close();
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log('the trophy at 100');
} };
