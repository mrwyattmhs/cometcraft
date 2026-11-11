// Run with: node tests/equations-md.test.js
const assert = require('assert');
const E = require('../js/equations-md.js');
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const X = E.TIMES, D = E.DIVIDE, P = (form, a, b, x, flip = false, level = 1) => ({ level, form, a, b, x, flip });

/* ---------- the levels ---------- */
assert.deepStrictEqual(E.LEVELS.map(l => [l.level, l.name]), [[1, 'Easy'], [2, 'Medium'], [3, 'Hard']]);
assert.deepStrictEqual(E.LEVELS.map(l => l.forms), [['mul1'], ['div1', 'mul2'], ['mul1', 'mul2', 'div1', 'div2']]);
assert.ok(E.LEVELS.every(l => l.sample && l.desc)); assert.strictEqual(E.levelOf(9).level, 3); assert.strictEqual(E.levelOf(0).level, 1); assert.strictEqual(E.levelOf('x').level, 1);
assert.strictEqual(X, '\u00d7'); assert.strictEqual(D, '\u00f7');

/* ---------- how an equation reads ---------- */
assert.strictEqual(E.text(P('mul1', 4, 20, 5)), `[ ] ${X} 4 = 20`, 'the example: put a 5 in the box'); assert.strictEqual(E.text(P('mul2', 3, 21, 7)), `3 ${X} [ ] = 21`);
assert.strictEqual(E.text(P('div1', 3, 6, 18)), `[ ] ${D} 3 = 6`); assert.strictEqual(E.text(P('div2', 24, 4, 6)), `24 ${D} [ ] = 4`);
assert.strictEqual(E.text(P('mul1', 4, 20, 5, true)), `20 = [ ] ${X} 4`, 'turned round'); assert.strictEqual(E.text(P('div2', 24, 4, 6, true)), `4 = 24 ${D} [ ]`);
{ const ps = E.pieces(P('mul1', 4, 20, 5)); assert.deepStrictEqual(JSON.parse(JSON.stringify(ps)), [{ box: true }, { op: X }, { num: 4 }, { eq: true }, { num: 20 }]); }

/* ---------- every problem: the answer works, nothing else does, all numbers whole and at least 2 ---------- */
for (const L of E.LEVELS) {
  const rng = seeded(70 + L.level); let last = null; const forms = new Set(), flips = new Set(), keys = new Set();
  for (let i = 0; i < 20000; i++) {
    const p = E.problem(L.level, rng, last); last = p; forms.add(p.form); flips.add(p.flip); keys.add(`${p.form}${p.a}.${p.b}${p.flip ? 'f' : ''}`);
    assert.ok(L.forms.includes(p.form) && p.level === L.level); assert.ok([p.a, p.b, p.x].every(n => Number.isInteger(n) && n >= 2), `whole numbers of at least 2: ${E.text(p)} (${p.x})`);
    assert.ok(E.holds(p, p.x) && E.isCorrect(p, E.answerOf(p)), `${E.text(p)}: the answer ${p.x} works`);
    for (let n = 0; n <= 200; n++) if (n !== p.x) assert.ok(!E.holds(p, n), `${E.text(p)}: ${n} must not work (only ${p.x} does)`);
    if (L.level === 1) assert.ok(p.a <= 9 && p.x <= 10 && p.b <= 90 && !p.flip, 'Easy stays within the tables and unturned');
    if (L.level === 2) assert.ok(!p.flip && p.a <= 9 && p.x <= 90);
    if (L.level === 3) assert.ok(p.a <= 144 && p.b <= 144 && p.x <= 144);
    assert.strictEqual(E.pieces(p).filter(x => x.box).length, 1, 'exactly one box'); assert.strictEqual(E.pieces(p).filter(x => x.eq).length, 1, 'exactly one equals sign');
    if (p.form === 'div2') assert.strictEqual(p.a, p.x * p.b, 'a / [ ] = b divides exactly');
  }
  assert.deepStrictEqual([...forms].sort(), [...L.forms].sort(), `${L.name}: every shape it promises turns up`); assert.deepStrictEqual([...flips].sort(), L.flips ? [false, true] : [false], `${L.name}: turned-round equations only on Hard`);
  assert.ok(keys.size <= E.count(L.level), `${L.name}: no more problems than count says`); assert.strictEqual(keys.size, E.count(L.level), `${L.name}: all ${E.count(L.level)} different problems turn up`);
}
assert.deepStrictEqual([1, 2, 3].map(E.count), [72, 144, 968]);

/* ---------- the dealer ---------- */
for (const L of E.LEVELS) { const rng = seeded(5); let last = null; for (let i = 0; i < 3000; i++) { const p = E.problem(L.level, rng, last); assert.ok(!last || E.text(p) !== E.text(last) || p.x !== last.x, 'never the same twice in a row'); last = p; } assert.deepStrictEqual(E.problem(L.level, seeded(9)), E.problem(L.level, seeded(9))); }

/* ---------- the classic wrong answers are wrong ---------- */
assert.ok(!E.isCorrect(P('mul1', 4, 20, 5), 24), 'adding instead of dividing'); assert.ok(!E.isCorrect(P('mul1', 4, 20, 5), 80), 'multiplying again instead of dividing');
assert.ok(!E.isCorrect(P('div1', 3, 6, 18), 2), 'dividing when the number should be multiplied back'); assert.ok(!E.isCorrect(P('div2', 24, 4, 6), 96), 'multiplying when 24 should be divided by 4');
assert.ok(!E.isCorrect(P('div2', 24, 4, 6), 4), 'a number already written in the equation is not the answer');
assert.ok(!E.isCorrect(P('mul1', 4, 20, 5), 5.5) && !E.isCorrect(P('mul1', 4, 20, 5), '5') && !E.isCorrect(P('mul1', 4, 20, 5), NaN) && !E.isCorrect(P('mul1', 4, 20, 5), null) && !E.isCorrect(P('mul1', 4, 20, 5), undefined) && !E.isCorrect(P('div2', 24, 4, 6), 0));
assert.ok(E.isCorrect(P('mul1', 4, 20, 5), 5) && E.isCorrect(P('mul2', 3, 21, 7), 7) && E.isCorrect(P('div1', 3, 6, 18), 18) && E.isCorrect(P('div2', 24, 4, 6), 6));

/* ---------- the worked solution ---------- */
assert.deepStrictEqual(E.steps(P('mul1', 4, 20, 5)), [`[ ] ${X} 4 = 20: the box was multiplied by 4 to make 20.`, `To find the box, divide 20 by 4: 20 ${D} 4 = 5.`, `Check: 5 ${X} 4 = 20.`]);
assert.deepStrictEqual(E.steps(P('div1', 3, 6, 18)), [`[ ] ${D} 3 = 6: the box was shared into 3 equal parts, and each part is 6.`, `To find the box, put the parts back together: 6 ${X} 3 = 18.`, `Check: 18 ${D} 3 = 6.`]);
assert.deepStrictEqual(E.steps(P('div2', 24, 4, 6)).slice(1), [`To find the box, ask how many parts of 4 make 24: 24 ${D} 4 = 6.`, `Check: 24 ${D} 6 = 4.`]);
for (const L of E.LEVELS) { const rng = seeded(21); for (let i = 0; i < 500; i++) { const p = E.problem(L.level, rng), s = E.steps(p); assert.strictEqual(s.length, 3); assert.ok(s[2].startsWith('Check: ') && s[2].endsWith(`= ${p.b}.`), 'the last step checks the answer'); assert.ok(s[1].includes(`= ${p.x}.`), 'the middle step finds it'); assert.strictEqual(/Turned round/.test(s[0]), p.flip); } }
console.log('equations-md tests passed');
