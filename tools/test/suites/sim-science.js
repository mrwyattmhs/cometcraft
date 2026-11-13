// The Science Lab's three games through their real DOM (simulated browser):
//   ELEMENT MATCH  tap a tile, Check; one shot; the right tile lights green and a wrong pick red; pay 10 / 25 / 50; Enter; the keyboard on a tile; the trophy at 100
//   CELL LAB       the same, on a picture: tap a part (any shape inside it), and a part drawn twice (the mitochondria) is one choice
//   ATOM BUILDER   three boxes on the booth engine's pad: tap a box, tap digits; each box is marked by its own place (protons, neutrons, electrons); Enter moves to the empty box
const assert = require('assert');
const { plain, text } = require('../lib/util');

module.exports = { name: 'sim:science', tier: 'sim', covers: ['js/elements.js', 'js/cells.js', 'js/atoms.js', 'js/pick-game.js', 'js/booth-game.js', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'js/main.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, doc, $, click, w } = s, { Store, Economy } = T; s.start(); await s.frames(2);
  const chips = () => Store.get().chips, solved = id => (Store.get().solved || {})[id] || 0, trophies = () => Store.get().trophies || [];
  const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })), docKey = k => doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

  /* ---------- the two click-the-picture games, through the same checks ---------- */
  const PICK = [
    { name: 'Element Match', game: 'ElementGame', logic: 'Elements', pre: 'elm', pay: 'elements', trophy: 'elements', losses: 'elementsLosses', things: [36, 71, 118], keyOf: p => String(p.z), others: p => String(p.z === 1 ? 2 : 1), sel: k => `#elm-fig [data-key="${k}"]` },
    { name: 'Cell Lab', game: 'CellGame', logic: 'Cells', pre: 'cel', pay: 'cells', trophy: 'cells', losses: 'cellsLosses', things: [6, 7, 11], keyOf: p => p.part, others: p => (p.part === 'cytoplasm' ? 'membrane' : 'cytoplasm'), sel: k => `#cel-fig [data-key="${k}"]` },
  ];
  for (const tb of PICK) {
    const G = T[tb.game], E = T[tb.logic], P = id => $(`${tb.pre}-${id}`), open = lv => { G.open(); click(doc.querySelectorAll(`#${tb.pre}-levels .bet`)[lv - 1]); return G.problem; }, thing = k => doc.querySelector(tb.sel(k));
    Store.reset(); G.open(); const cards = [...doc.querySelectorAll(`#${tb.pre}-levels .bet`)];
    assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-amt').textContent)), ['Easy', 'Medium', 'Hard'], `${tb.name}: three levels`); assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['10 chips per answer', '25 chips per answer', '50 chips per answer']);
    assert.deepStrictEqual(plain(Economy.PAY[tb.pay]), [10, 25, 50]); assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.poly-sample').textContent)), plain(E.LEVELS.map(l => l.sample))); assert.strictEqual(text(doc.querySelector(`#${tb.pre} .k-wing`)), 'Science Lab'); assert.strictEqual(text(P('close')), 'Leave station'); G.close();
    const counts = [1, 2, 3].map(lv => { open(lv); return doc.querySelectorAll(`#${tb.pre}-fig [data-key]`).length; }); assert.deepStrictEqual(counts, tb.things, `${tb.name}: the picture has ${tb.things.join(', ')} things to click at the three levels`);

    /* ----- Easy: pick, change your mind, check; one shot ----- */
    let p = open(1); const c0 = chips();
    assert.strictEqual(text(P('ask')), E.prompt(p), 'the question is on screen'); assert.strictEqual(P('check').disabled, true, 'Check is off until you pick something'); assert.strictEqual(G.picked, null);
    const wrong = tb.others(p); click(thing(wrong)); assert.strictEqual(G.picked, wrong); assert.ok(thing(wrong).classList.contains('picked') && P('check').disabled === false, 'a pick lights up and turns Check on');
    click(thing(tb.keyOf(p))); assert.strictEqual(G.picked, tb.keyOf(p)); assert.ok(!thing(wrong).classList.contains('picked'), 'picking another takes the light off the first'); assert.strictEqual(doc.querySelectorAll(`#${tb.pre}-fig .picked`).length, 1, 'only one choice is lit');
    click(thing(wrong)); click(P('check'));
    assert.strictEqual(G.state(), 'done'); assert.deepStrictEqual([chips(), Store.get()[tb.losses], solved(tb.trophy)], [c0, 1, 0], 'a wrong answer pays nothing, and is counted');
    assert.ok(thing(tb.keyOf(p)).classList.contains('right') && thing(wrong).classList.contains('wrong'), 'the right one lights green and the wrong pick red'); assert.strictEqual(text(P('result').querySelector('.final-text')), E.done(p), 'a line says what it was');
    assert.ok(P('bar').classList.contains('hidden') && !P('after').classList.contains('hidden') && P('play').classList.contains('answered'), 'the answer card takes the check bar\'s place (the window does not grow)'); assert.strictEqual(text(P('msg')), 'Not this time. Nothing lost.');
    click(thing(tb.keyOf(p))); assert.strictEqual(G.picked, wrong, 'the picture is finished: more taps change nothing'); click(P('check')); assert.strictEqual(Store.get()[tb.losses], 1, 'one shot only');
    click(P('next')); assert.ok(!P('bar').classList.contains('hidden') && P('after').classList.contains('hidden') && P('check').disabled === true && doc.querySelectorAll(`#${tb.pre}-fig .picked, #${tb.pre}-fig .right, #${tb.pre}-fig .wrong`).length === 0, 'the next question starts clean'); assert.strictEqual(G.picked, null);
    p = G.problem; click(thing(tb.keyOf(p))); docKey('Enter'); assert.strictEqual(G.state(), 'done', 'Enter checks a pick'); assert.strictEqual(chips() - c0, 10, 'Easy pays 10'); assert.strictEqual(solved(tb.trophy), 1); assert.ok(thing(tb.keyOf(p)).classList.contains('right')); assert.strictEqual(doc.querySelectorAll(`#${tb.pre}-fig .wrong`).length, 0);
    docKey('Enter'); assert.strictEqual(G.state(), 'playing', 'Enter then moves on'); docKey('Enter'); assert.strictEqual(G.state(), 'playing', 'and Enter with nothing picked does not check');
    /* ----- the keyboard on the picture itself: Enter or Space on a part picks it, and does not also check ----- */
    p = G.problem; key(thing(tb.keyOf(p)), 'Enter'); assert.strictEqual(G.picked, tb.keyOf(p), 'Enter on a tile or part picks it'); assert.strictEqual(G.state(), 'playing', 'without checking'); key(thing(tb.others(p)), ' '); assert.strictEqual(G.picked, tb.others(p), 'and so does Space'); key(thing(tb.keyOf(p)), 'Enter'); assert.strictEqual(G.picked, tb.keyOf(p), 'Enter on a different one moves the pick');
    key(thing(tb.keyOf(p)), 'Enter'); assert.strictEqual(G.state(), 'done', 'Enter on the one already picked checks it (a mouse click leaves the focus there, so Enter must still mean Check)'); assert.ok(text(P('msg')).startsWith('Correct'));
    /* ----- Medium and Hard ----- */
    for (const [lv, pay] of [[2, 25], [3, 50]]) { p = open(lv); assert.strictEqual(p.level, lv); const b0 = chips(); click(thing(tb.keyOf(p))); click(P('check')); assert.strictEqual(chips() - b0, pay, `${tb.name}: level ${lv} pays ${pay}`); }
    /* ----- every question on Hard can be answered by clicking its own picture ----- */
    s.seed(11); p = open(3); const asked = new Set();                                         // (seeded, so this is the same every time, and enough draws for every one to come up)
    for (let i = 0; i < E.count(3) * 14; i++) { asked.add(tb.keyOf(G.problem)); assert.ok(thing(tb.keyOf(G.problem)), 'what is asked is on the picture'); click(thing(tb.keyOf(G.problem))); click(P('check')); assert.ok(G.state() === 'done' && text(P('msg')).startsWith('Correct')); click(P('next')); }
    assert.strictEqual(asked.size, E.count(3), `${tb.name}: every one of the ${E.count(3)} things comes up`);
    /* ----- 100 right answers earn the trophy ----- */
    Store.reset(); const t0 = chips(); open(1);
    for (let n = 1; n <= 100; n++) { click(thing(tb.keyOf(G.problem))); click(P('check')); assert.strictEqual(solved(tb.trophy), n); if (n < 100) assert.ok(!trophies().includes(tb.trophy), `no trophy after ${n}`); click(P('next')); }
    assert.ok(trophies().includes(tb.trophy), `the 100th right answer earns the ${tb.name} trophy`); assert.strictEqual(chips() - t0, 1000, '100 Easy answers at 10 chips'); G.close();
    ctx.log(`${tb.name}: levels and pay, pick and change your mind, one shot, marks, keyboard, every Hard question, trophy at 100`);
  }
  /* ---------- Cell Lab only: a click anywhere inside a part picks it, and a part drawn twice is one choice ---------- */
  { const G = T.CellGame; G.open(); click(doc.querySelectorAll('#cel-levels .bet')[0]);
    const inner = doc.querySelector('#cel-fig [data-key="nucleus"] ellipse'); click(inner); assert.strictEqual(G.picked, 'nucleus', 'a click on the shape inside the part picks the part');
    const mito = doc.querySelector('#cel-fig [data-key="mitochondrion"]'); assert.strictEqual(mito.querySelectorAll('ellipse').length, 2, 'two mitochondria in one choice'); click(mito.querySelector('ellipse')); assert.ok(mito.classList.contains('picked') && !doc.querySelector('#cel-fig [data-key="nucleus"]').classList.contains('picked'));
    const hard = (G.close(), G.open(), click(doc.querySelectorAll('#cel-levels .bet')[2]), G.problem); assert.ok(/^Click the part that /.test(text($('cel-ask'))), 'on Hard you are told the job'); assert.ok(hard.part); G.close(); }

  /* ---------- Atom Builder: three boxes, tapped in by place ---------- */
  { const G = T.AtomsGame, A = T.AtomBuilder, P = id => $(`abd-${id}`), keys = () => [...P('pad').querySelectorAll('.eqn-key')], tap = k => click(keys().find(x => x.dataset.key === k));
    const type = (i, v) => { const b = G.boxes[i]; b.value = String(v); b.dispatchEvent(new w.Event('input', { bubbles: true })); }, touch = i => G.boxes[i].dispatchEvent(new w.Event('focus'));
    const open = lv => { G.open(); click(doc.querySelectorAll('#abd-levels .bet')[lv - 1]); return G.problem; }, tapNumber = (i, n) => { touch(i); String(n).split('').forEach(tap); };
    Store.reset(); G.open(); const cards = [...doc.querySelectorAll('#abd-levels .bet')];
    assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-amt').textContent)), ['Easy', 'Medium', 'Hard']); assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['10 chips per answer', '25 chips per answer', '50 chips per answer']); assert.strictEqual(text(doc.querySelector('#abd .k-wing')), 'Science Lab'); assert.strictEqual(text(P('close')), 'Leave station'); G.close();
    let p = open(1); const c0 = chips(), v = A.view(p);
    assert.strictEqual(G.boxes.length, 3, 'three boxes'); assert.deepStrictEqual(plain([...doc.querySelectorAll('#abd-eq .abd-cap')].map(e => e.textContent)), ['protons', 'neutrons', 'electrons']); assert.deepStrictEqual(plain(G.boxes.map(b => b.getAttribute('aria-label'))), ['Protons', 'Neutrons', 'Electrons']);
    assert.deepStrictEqual(plain([text(doc.querySelector('#abd-eq .abd-title')), text(doc.querySelector('#abd-eq .abd-sub'))]), [v.head, v.sub], 'the headline says which atom'); assert.deepStrictEqual(plain(keys().map(k => k.dataset.key)), ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'back', '0', 'check'], 'no negative numbers: the plain phone pad');
    touch(0); ['1', '2', '3', '4', '5'].forEach(tap); assert.strictEqual(G.boxes[0].value, '123', 'a box takes three digits at most, from the pad'); type(0, 98765); assert.strictEqual(G.boxes[0].value, '987', 'and from a keyboard'); type(0, '1a2'); assert.strictEqual(G.boxes[0].value, '12', 'digits only'); type(0, ''); tap('back');
    const [pr, ne, el] = A.answerOf(p); tapNumber(0, pr); tapNumber(1, ne); touch(2); assert.deepStrictEqual(plain(G.boxes.map(b => b.value)), [String(pr), String(ne), ''], 'taps go into the box you touched'); click(P('check')); assert.strictEqual(G.state(), 'playing'); assert.match(text(P('msg')), /Fill in all three boxes first/);
    tapNumber(2, el === 9 ? 8 : el + 1); click(P('check'));
    assert.strictEqual(G.state(), 'done'); assert.deepStrictEqual([chips(), Store.get().atomsLosses, solved('atoms')], [c0, 1, 0]); assert.deepStrictEqual(plain(G.boxes.map(b => (b.classList.contains('ok') ? 'ok' : 'miss'))), ['ok', 'ok', 'miss'], 'each box is marked by its own place: protons and neutrons right, electrons wrong');
    assert.strictEqual(text(doc.querySelector('#abd-result .final-expr')), A.done(p)); assert.strictEqual(doc.querySelectorAll('#abd-result li').length, 3); assert.ok(P('pad').classList.contains('hidden') && P('play').classList.contains('answered'));
    click(P('next')); p = G.problem; const a = A.answerOf(p); a.forEach((n, i) => type(i, n)); G.boxes[2].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); assert.strictEqual(G.state(), 'done'); assert.strictEqual(chips() - c0, 10, 'Easy pays 10'); assert.ok(G.boxes.every(b => b.classList.contains('ok')));
    docKey('Enter'); let swapped; do { swapped = A.answerOf(open(1)); } while (swapped[0] === swapped[1]);                    // an atom whose protons and neutrons differ
    type(0, swapped[1]); type(1, swapped[0]); type(2, swapped[2]); const cs = chips(); click(P('check')); assert.strictEqual(chips(), cs, 'the protons and neutrons the wrong way round is wrong (the places mean something)'); assert.deepStrictEqual(plain(G.boxes.map(b => (b.classList.contains('ok') ? 'ok' : 'miss'))), ['miss', 'miss', 'ok'], 'each box is marked by its own place, even when the number is one of the answers');
    for (const [lv, pay] of [[2, 25], [3, 50]]) { p = open(lv); const b0 = chips(); A.answerOf(p).forEach((n, i) => tapNumber(i, n)); click(P('check')); assert.strictEqual(chips() - b0, pay, `Atom Builder: level ${lv} pays ${pay}`); }
    p = open(3); const kinds = new Set(); for (let i = 0; i < 200; i++) { kinds.add(G.problem.kind); A.answerOf(G.problem).forEach((n, k) => type(k, n)); click(P('check')); assert.ok(text(P('msg')).startsWith('Correct')); click(P('next')); } assert.deepStrictEqual([...kinds].sort(), ['ion', 'isotope'], 'Hard deals ions and isotopes');
    Store.reset(); const t0 = chips(); open(1);
    for (let n = 1; n <= 100; n++) { A.answerOf(G.problem).forEach((v2, i) => type(i, v2)); click(P('check')); assert.strictEqual(solved('atoms'), n); if (n < 100) assert.ok(!trophies().includes('atoms')); click(P('next')); }
    assert.ok(trophies().includes('atoms'), 'the 100th right answer earns the Atom Builder trophy'); assert.strictEqual(chips() - t0, 1000); G.close();
    ctx.log('Atom Builder: the headline, three labelled boxes, taps by place, marks by place, Enter, pay 10 / 25 / 50, ions and isotopes, trophy at 100'); }
  assert.deepStrictEqual(s.errors, [], 'no errors');
} };
