// Run with: node tests/equations.test.js
const assert = require('assert');
const E = require('../js/equations.js');
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = E.MINUS, P = (form, a, b, x, flip = false, level = 1) => ({ level, form, a, b, x, flip });

/* ---------- the levels ---------- */
assert.deepStrictEqual(E.LEVELS.map(l => [l.level, l.name]), [[1, 'Easy'], [2, 'Medium'], [3, 'Hard']]);
assert.deepStrictEqual(E.LEVELS.map(l => l.forms), [['add1'], ['sub1', 'add2'], ['add1', 'add2', 'sub1', 'sub2']]);
assert.ok(E.LEVELS.every(l => l.sample && l.desc)); assert.strictEqual(E.levelOf(9).level, 3); assert.strictEqual(E.levelOf(0).level, 1); assert.strictEqual(E.levelOf('x').level, 1);

/* ---------- how an equation reads ---------- */
assert.strictEqual(E.text(P('add1', 5, 7, 2)), '[ ] + 5 = 7', 'the example from the lesson: put a 2 in the box');
assert.strictEqual(E.text(P('sub1', 4, 9, 13)), `[ ] ${M} 4 = 9`); assert.strictEqual(E.text(P('add2', 3, 11, 8)), '3 + [ ] = 11'); assert.strictEqual(E.text(P('sub2', 15, 6, 9)), `15 ${M} [ ] = 6`);
assert.strictEqual(E.text(P('add1', 5, 7, 2, true)), '7 = [ ] + 5', 'turned round'); assert.strictEqual(E.text(P('sub2', 15, 6, 9, true)), `6 = 15 ${M} [ ]`);
{ const ps = E.pieces(P('add1', 5, 7, 2)); assert.deepStrictEqual(JSON.parse(JSON.stringify(ps)), [{ box: true }, { op: '+' }, { num: 5 }, { eq: true }, { num: 7 }]); }

/* ---------- every problem: the answer works, nothing else does, all numbers whole and at least 1 ---------- */
for (const L of E.LEVELS) {
  const rng = seeded(40 + L.level); let last = null; const forms = new Set(), flips = new Set(); const keys = new Set();
  for (let i = 0; i < 20000; i++) {
    const p = E.problem(L.level, rng, last); last = p; forms.add(p.form); flips.add(p.flip); keys.add(`${p.form}${p.a}.${p.b}${p.flip ? 'f' : ''}`);
    assert.ok(L.forms.includes(p.form) && p.level === L.level); assert.ok([p.a, p.b, p.x].every(n => Number.isInteger(n) && n >= 1), `whole numbers of at least 1: ${E.text(p)} (${p.x})`);
    assert.ok(E.holds(p, p.x) && E.isCorrect(p, E.answerOf(p)), `${E.text(p)}: the answer ${p.x} works`);
    for (let n = 0; n <= 120; n++) if (n !== p.x) assert.ok(!E.holds(p, n), `${E.text(p)}: ${n} must not work (only ${p.x} does)`);
    if (L.level === 1) { assert.ok(p.a <= 10 && p.x <= 10 && p.b <= 20 && !p.flip, 'Easy stays small and unturned'); }
    if (L.level === 2) { assert.ok(!p.flip && p.b <= 24 && p.x <= 25); }
    if (L.level === 3) { assert.ok(p.a <= 45 && p.b <= 50 && p.x <= 50); }
    assert.strictEqual(E.pieces(p).filter(x => x.box).length, 1, 'exactly one box'); assert.strictEqual(E.pieces(p).filter(x => x.eq).length, 1, 'exactly one equals sign');
  }
  assert.deepStrictEqual([...forms].sort(), [...L.forms].sort(), `${L.name}: every shape it promises turns up`); assert.deepStrictEqual([...flips].sort(), L.flips ? [false, true] : [false], `${L.name}: turned-round equations only on Hard`);
  assert.ok(keys.size <= E.count(L.level), `${L.name}: no more problems than count says`);
  if (L.level < 3) assert.strictEqual(keys.size, E.count(L.level), `${L.name}: all ${E.count(L.level)} different problems turn up`); else assert.ok(keys.size > 0.9 * E.count(3), `Hard: plenty of the ${E.count(3)} come up (${keys.size})`);
}
assert.deepStrictEqual([1, 2, 3].map(E.count), [100, 264, 4750]);

/* ---------- the dealer: never the same twice in a row, and the same seed deals the same problem ---------- */
for (const L of E.LEVELS) { const rng = seeded(5); let last = null; for (let i = 0; i < 3000; i++) { const p = E.problem(L.level, rng, last); assert.ok(!last || E.text(p) !== E.text(last) || p.x !== last.x, 'never the same twice in a row'); last = p; } assert.deepStrictEqual(E.problem(L.level, seeded(9)), E.problem(L.level, seeded(9))); }

/* ---------- the classic wrong answers are wrong ---------- */
assert.ok(!E.isCorrect(P('add1', 5, 7, 2), 12), 'adding the two numbers instead of undoing the addition'); assert.ok(!E.isCorrect(P('sub1', 4, 9, 13), 5), 'taking away when the number should be put back');
assert.ok(!E.isCorrect(P('sub2', 15, 6, 9), 21), 'adding when the box was taken away'); assert.ok(!E.isCorrect(P('sub2', 15, 6, 9), -9)); assert.ok(!E.isCorrect(P('add1', 5, 7, 2), 2.5) && !E.isCorrect(P('add1', 5, 7, 2), '2') && !E.isCorrect(P('add1', 5, 7, 2), NaN) && !E.isCorrect(P('add1', 5, 7, 2), null) && !E.isCorrect(P('add1', 5, 7, 2), undefined));
assert.ok(E.isCorrect(P('add1', 5, 7, 2), 2) && E.isCorrect(P('sub1', 4, 9, 13), 13) && E.isCorrect(P('add2', 3, 11, 8), 8) && E.isCorrect(P('sub2', 15, 6, 9), 9));

/* ---------- the worked solution ---------- */
assert.deepStrictEqual(E.steps(P('add1', 5, 7, 2)), ['[ ] + 5 = 7: the box and 5 are added to make 7.', `To find the box, take 5 away from 7: 7 ${M} 5 = 2.`, 'Check: 2 + 5 = 7.']);
assert.deepStrictEqual(E.steps(P('sub1', 4, 9, 13)), [`[ ] ${M} 4 = 9: 4 was taken away from the box and 9 was left.`, 'To find the box, put the 4 back: 9 + 4 = 13.', `Check: 13 ${M} 4 = 9.`]);
assert.deepStrictEqual(E.steps(P('sub2', 15, 6, 9)).slice(1), [`To find the box, ask how much was taken away: 15 ${M} 6 = 9.`, `Check: 15 ${M} 9 = 6.`]);
for (const L of E.LEVELS) { const rng = seeded(21); for (let i = 0; i < 500; i++) { const p = E.problem(L.level, rng), s = E.steps(p); assert.strictEqual(s.length, 3); assert.ok(s[2].startsWith('Check: ') && s[2].endsWith(`= ${p.b}.`), 'the last step checks the answer'); assert.ok(s[1].includes(`= ${p.x}.`), 'the middle step finds it'); assert.strictEqual(/Turned round/.test(s[0]), p.flip); } }
console.log('equations tests passed');
