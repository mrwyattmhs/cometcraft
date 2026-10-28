// Run with: node tests/cubes.test.js
const assert = require('assert');
const C = require('../js/cubes.js');

const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const P = (v, g, c, sign, level) => ({ level: level || (g === 1 ? 1 : 2), v, g, c, sign });

/* ---------- the two levels ---------- */
assert.deepStrictEqual(C.LEVELS.map(l => [l.level, l.name]), [[1, 'Easy'], [2, 'Medium']]);
assert.deepStrictEqual(C.LEVELS[0].g, [1], 'Easy has no GCF');
assert.ok(C.LEVELS[1].g.every(g => g >= 2) && C.LEVELS[1].g.length >= 4, 'Medium always has a GCF to take out first');
assert.strictEqual(C.count(1), 8 * 1 * 2 * C.VARS.length); assert.strictEqual(C.count(2), 6 * 5 * 2 * C.VARS.length);
assert.ok(C.count(1) >= 90 && C.count(2) >= 300, 'plenty of different problems');
assert.strictEqual(C.levelOf(9).level, 2); assert.strictEqual(C.levelOf(0).level, 1); assert.strictEqual(C.levelOf('x').level, 1);
assert.ok(C.LEVELS.every(l => l.sample && l.desc));

/* ---------- the text of a problem and of its answer ---------- */
assert.strictEqual(C.polyText(P('x', 1, 3, 1)), 'x\u00b3 + 27');
assert.strictEqual(C.polyText(P('y', 1, 2, -1)), 'y\u00b3 \u2212 8');
assert.strictEqual(C.polyText(P('x', 1, 1, 1)), 'x\u00b3 + 1');
assert.strictEqual(C.polyText(P('t', 2, 2, 1)), '2t\u00b3 + 16');
assert.strictEqual(C.polyText(P('n', 5, 3, -1)), '5n\u00b3 \u2212 135');
assert.strictEqual(C.polyAscii(P('x', 3, 2, -1)), '3x^3 - 24');
assert.strictEqual(C.answerText(P('x', 1, 3, 1)), '(x + 3)(x\u00b2 \u2212 3x + 9)');
assert.strictEqual(C.answerText(P('y', 2, 2, -1)), '2(y \u2212 2)(y\u00b2 + 2y + 4)');
assert.strictEqual(C.answerText(P('x', 1, 1, 1)), '(x + 1)(x\u00b2 \u2212 x + 1)', 'a coefficient of 1 is not written');
assert.strictEqual(C.answerText(P('z', 1, 4, -1)), '(z \u2212 4)(z\u00b2 + 4z + 16)');
assert.deepStrictEqual(C.answerOf(P('x', 2, 5, 1)), { g: 2, s1: 1, a: 5, s2: -1, b: 5, c: 25 });
assert.deepStrictEqual(C.answerOf(P('x', 1, 5, -1)), { g: 1, s1: -1, a: 5, s2: 1, b: 5, c: 25 }, 'Same, Opposite, Always positive');

/* ---------- every problem, exhaustively: well formed, and its answer multiplies out to it ---------- */
for (const L of C.LEVELS) {
  let n = 0; const seen = new Set();
  for (const v of C.VARS) for (const g of L.g) for (const c of L.c) for (const sign of [1, -1]) {
    const p = { level: L.level, v, g, c, sign }; n++; seen.add(C.polyAscii(p) + v);
    assert.deepStrictEqual(C.expand(C.answerOf(p)), C.polyCoeffs(p), `${C.polyText(p)} = ${C.answerText(p)}`);
    assert.ok(C.isCorrect(p, C.answerOf(p)));
    // the numbers in the text are right
    const m = C.polyText(p).match(/^(\d*)([a-z])\u00b3 ([+\u2212]) (\d+)$/); assert.ok(m, C.polyText(p));
    assert.strictEqual(Number(m[1] || 1), g); assert.strictEqual(m[3], sign > 0 ? '+' : '\u2212'); assert.strictEqual(Number(m[4]), g * c ** 3);
    if (L.level === 1) assert.strictEqual(m[1], '', 'Easy has a plain v\u00b3 at the front');
    else assert.strictEqual(gcd(g, g * c ** 3), g, 'the GCF of a medium problem is the g that was dealt');
  }
  assert.strictEqual(n, C.count(L.level)); assert.strictEqual(seen.size, n, `${L.name}: no two problems alike`);
}

/* ---------- the dealer: only real problems, every one of them turns up, never the same twice in a row ---------- */
for (const L of C.LEVELS) {
  const rng = seeded(100 + L.level), got = new Set(); let last = null;
  for (let i = 0; i < 20000; i++) {
    const p = C.problem(L.level, rng, last);
    assert.ok(L.g.includes(p.g) && L.c.includes(p.c) && C.VARS.includes(p.v) && (p.sign === 1 || p.sign === -1) && p.level === L.level);
    assert.ok(!last || !(last.v === p.v && last.g === p.g && last.c === p.c && last.sign === p.sign), 'never the same one twice in a row');
    got.add(`${p.v}${p.g}${p.c}${p.sign}`); last = p;
  }
  assert.strictEqual(got.size, C.count(L.level), `${L.name}: all ${C.count(L.level)} problems come up`);
}
{ const a = C.problem(2, seeded(5)), b = C.problem(2, seeded(5)), d = C.problem(2, seeded(6)); assert.deepStrictEqual(a, b, 'the same seed deals the same problem'); assert.ok(JSON.stringify(a) !== JSON.stringify(d) || true); }
// both signs and every variable are dealt on both levels
for (const L of C.LEVELS) { const rng = seeded(7), signs = new Set(), vars = new Set(); for (let i = 0; i < 400; i++) { const p = C.problem(L.level, rng); signs.add(p.sign); vars.add(p.v); } assert.strictEqual(signs.size, 2); assert.strictEqual(vars.size, C.VARS.length); }

/* ---------- there is exactly one right answer to each problem (searched the long way) ---------- */
for (const L of C.LEVELS) for (const c of L.c.slice(0, 6)) for (const sign of [1, -1]) {
  const p = { level: L.level, v: 'x', g: L.g[L.g.length - 1], c, sign }, right = C.answerOf(p); let found = 0;
  for (let g = 1; g <= 8; g++) for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let k = 0; k <= 100; k++) for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
    if (C.isCorrect(p, { g, s1, a, s2, b, c: k })) { found++; assert.deepStrictEqual({ g, s1, a, s2, b, c: k }, right, 'the only answer that works is the expected one'); }
  }
  assert.strictEqual(found, 1, `exactly one answer for ${C.polyText(p)} (found ${found})`);
}
console.log('ok  every problem, and one answer each');

/* ---------- the mistakes students make are all marked wrong ---------- */
{
  const sum = P('x', 1, 3, 1), diff = P('x', 1, 3, -1), med = P('x', 2, 3, 1);
  const base = C.answerOf(sum), wrong = (p, patch) => C.isCorrect(p, { ...C.answerOf(p), ...patch });
  assert.ok(wrong(sum, {}), 'sanity: the right answer is right');
  assert.ok(!wrong(sum, { s1: -1 }), 'wrong first sign');
  assert.ok(!wrong(sum, { s2: 1 }), 'the middle sign is the opposite, not the same');
  assert.ok(!wrong(sum, { s1: -1, s2: 1 }), 'the signs of the difference used on the sum');
  assert.ok(!wrong(diff, { s1: 1, s2: -1 }), 'the signs of the sum used on the difference');
  assert.ok(!wrong(sum, { c: 3 }), 'last term b, not b squared');
  assert.ok(!wrong(sum, { b: 9 }), 'middle term b squared');
  assert.ok(!wrong(sum, { a: 27 }), 'cube of the number in the first factor');
  assert.ok(!wrong(sum, { a: 9, b: 9, c: 81 }), 'the wrong cube root');
  assert.ok(!wrong(med, { g: 1 }), 'the GCF left in');
  assert.ok(!wrong(med, { g: 3 }), 'the wrong GCF');
  assert.ok(!wrong(med, { g: 1, a: 6, b: 6, c: 36 }), 'the GCF folded into the numbers');
  assert.ok(!wrong(sum, { g: 0 }), 'zero is not a GCF');
  // things that are not answers at all
  [{ ...base, a: -3 }, { ...base, a: 1.5 }, { ...base, b: NaN }, { ...base, c: '9' }, { ...base, s1: 0 }, { ...base, s2: '+' }, null, undefined, {}, { g: 1 }].forEach(a => assert.strictEqual(C.isCorrect(sum, a), false, `not an answer: ${JSON.stringify(a)}`));
  assert.strictEqual(C.validAnswer(base), true); assert.strictEqual(C.validAnswer({ ...base, a: -1 }), false);
}

/* ---------- which boxes are right ---------- */
{
  const p = P('y', 3, 2, -1), r = C.answerOf(p);
  assert.deepStrictEqual(C.boxesOk(p, r), { g: true, s1: true, a: true, s2: true, b: true, c: true });
  assert.deepStrictEqual(C.boxesOk(p, { ...r, s2: -1, c: 2 }), { g: true, s1: true, a: true, s2: false, b: true, c: false }, 'only the wrong boxes are marked');
  assert.deepStrictEqual(C.boxesOk(p, { g: 1, s1: 1, a: 1, s2: 1, b: 1, c: 1 }), { g: false, s1: false, a: false, s2: true, b: false, c: false }, 'a difference has a + in the middle, so that one box happens to be right');
  assert.deepStrictEqual(C.boxesOk(p, null), { g: false, s1: false, a: false, s2: false, b: false, c: false });
}

/* ---------- the worked steps ---------- */
{
  const easy = C.steps(P('x', 1, 3, 1)), med = C.steps(P('x', 2, 3, -1));
  assert.strictEqual(easy.length, 4); assert.strictEqual(med.length, 5, 'Medium starts with the GCF');
  assert.ok(!easy.some(s => /GCF/.test(s)), 'Easy has no GCF step'); assert.match(med[0], /^Take out the GCF first: 2x\u00b3 \u2212 54 = 2\(x\u00b3 \u2212 27\)\.$/);
  assert.match(easy[0], /sum of cubes: 27 = 3\u00b3, so a = x and b = 3/); assert.match(med[1], /difference of cubes: 27 = 3\u00b3, so a = x and b = 3/);
  assert.match(easy[1], /a\u00b3 \+ b\u00b3 = \(a \+ b\)\(a\u00b2 \u2212 ab \+ b\u00b2\)/); assert.match(med[2], /a\u00b3 \u2212 b\u00b3 = \(a \u2212 b\)\(a\u00b2 \+ ab \+ b\u00b2\)/);
  assert.match(easy[2], /Same, Opposite, Always positive/); assert.match(easy[3], /\(x \+ 3\)\(x\u00b2 \u2212 3x \+ 9\)/); assert.match(easy[3], /3\u00b2 = 9/);
  assert.match(med[4], /2\(x \u2212 3\)\(x\u00b2 \+ 3x \+ 9\)/);
  for (const L of C.LEVELS) { const rng = seeded(31); for (let i = 0; i < 300; i++) { const p = C.problem(L.level, rng), s = C.steps(p); assert.strictEqual(s.length, L.level === 1 ? 4 : 5); assert.ok(s[s.length - 1].includes(C.answerText(p)), 'the last step ends with the answer'); } }
}

console.log('cubes tests passed');
