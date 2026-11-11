// Run with: node tests/number-pairs.test.js
const assert = require('assert');
const N = require('../js/number-pairs.js');
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = N.MINUS, X = N.TIMES, P = (a, b, kind = 'pp', level = 1) => ({ level, kind, product: a * b, sum: a + b, a, b });

/* ---------- the levels ---------- */
assert.deepStrictEqual(N.LEVELS.map(l => [l.level, l.name, l.signed]), [[1, 'Easy', false], [2, 'Medium', true], [3, 'Hard', true]], 'only Easy can be played without a minus sign');
assert.deepStrictEqual(N.LEVELS.map(l => [...new Set(l.kinds)].sort()), [['pp'], ['nn'], ['nn', 'pn', 'pp']]); assert.ok(N.LEVELS.every(l => l.sample && l.desc));
assert.strictEqual(N.levelOf(9).level, 3); assert.strictEqual(N.levelOf(0).level, 1); assert.strictEqual(N.levelOf('x').level, 1);

/* ---------- the example from the brief: multiply to 32, add to 18 -> 16 and 2 ---------- */
const ex = P(16, 2);
assert.strictEqual(N.text(ex), 'multiply to 32, add to 18'); assert.deepStrictEqual(N.answerOf(ex), [16, 2]);
assert.ok(N.isCorrect(ex, 16, 2) && N.isCorrect(ex, 2, 16), 'either order is right');
assert.ok(!N.isCorrect(ex, 4, 8), '4 and 8 multiply to 32 but add to 12'); assert.ok(!N.isCorrect(ex, 9, 9), '9 and 9 add to 18 but multiply to 81'); assert.ok(!N.isCorrect(ex, 32, 1) && !N.isCorrect(ex, -16, -2) && !N.isCorrect(ex, 16, -2));
assert.ok(!N.isCorrect(ex, 16, 2.0001) && !N.isCorrect(ex, '16', 2) && !N.isCorrect(ex, NaN, 2) && !N.isCorrect(ex, 16, undefined) && !N.isCorrect(ex, null, null));
assert.deepStrictEqual(N.view(ex), { kind: 'diamond', top: '32', bottom: '18', boxes: 2, topLabel: 'multiply to', bottomLabel: 'add to' });
assert.deepStrictEqual(N.factorPairs(32), [[1, 32], [2, 16], [4, 8]]); assert.deepStrictEqual(N.factorPairs(36).slice(-1), [[6, 6]]); assert.deepStrictEqual(N.factorPairs(1), [[1, 1]]); assert.deepStrictEqual(N.factorPairs(7), [[1, 7]]);

/* ---------- every problem: one pair and only one, and the signs the level promises ---------- */
for (const L of N.LEVELS) {
  const rng = seeded(90 + L.level); let last = null; const kinds = new Set(), keys = new Set(); let zeroSum = 0;
  for (let i = 0; i < 20000; i++) {
    const p = N.problem(L.level, rng, last); last = p; kinds.add(p.kind); keys.add(`${p.product},${p.sum}`); if (p.sum === 0) zeroSum++;
    assert.ok([p.a, p.b, p.product, p.sum].every(Number.isInteger) && p.a !== 0 && p.b !== 0); assert.strictEqual(p.product, p.a * p.b); assert.strictEqual(p.sum, p.a + p.b);
    assert.ok(Math.abs(p.product) >= 4 && Math.abs(p.product) <= L.maxProduct, `${N.text(p)}: the product is a sensible size for ${L.name}`); assert.ok(Math.min(Math.abs(p.a), Math.abs(p.b)) <= 9 && Math.max(Math.abs(p.a), Math.abs(p.b)) <= 36);
    const [x, y] = N.answerOf(p); assert.ok(x >= y && N.isCorrect(p, x, y) && N.isCorrect(p, y, x), `${N.text(p)}: ${x} and ${y} work`);
    const sols = []; for (let u = -90; u <= 90; u++) if (N.isCorrect(p, u, p.sum - u)) sols.push(u);            // every whole number that could be one of the two
    assert.deepStrictEqual([...new Set(sols)].sort((s, t) => s - t), [...new Set([p.a, p.b])].sort((s, t) => s - t), `${N.text(p)}: only its own pair works`);
    if (p.kind === 'pp') assert.ok(p.a > 0 && p.b > 0 && p.product > 0 && p.sum > 0); if (p.kind === 'nn') assert.ok(p.a < 0 && p.b < 0 && p.product > 0 && p.sum < 0); if (p.kind === 'pn') assert.ok(p.product < 0 && (p.a > 0) !== (p.b > 0));
    if (!L.signed) assert.ok(p.a > 0 && p.b > 0, 'a level without the minus key never needs one');
    assert.ok(Math.abs(p.sum) === Math.abs(p.a) + Math.abs(p.b) || Math.abs(p.sum) === Math.abs(Math.abs(p.a) - Math.abs(p.b)), 'the sum is the sum or the difference of the two factors');
  }
  assert.deepStrictEqual([...kinds].sort(), [...new Set(L.kinds)].sort(), `${L.name}: every kind it promises turns up`);
  assert.strictEqual(keys.size, N.count(L.level), `${L.name}: all ${N.count(L.level)} different problems turn up`);
  if (L.level === 3) assert.ok(zeroSum > 0, 'Hard includes a sum of 0 (like 6 and -6), the difference of two squares');
}
assert.ok(N.count(1) > 40 && N.count(2) > 50 && N.count(3) > 200, `plenty of problems: ${[1, 2, 3].map(N.count)}`);
for (const L of N.LEVELS) { const rng = seeded(5); let last = null; for (let i = 0; i < 3000; i++) { const p = N.problem(L.level, rng, last); assert.ok(!last || p.product !== last.product || p.sum !== last.sum, 'never the same twice in a row'); last = p; } assert.deepStrictEqual(N.problem(L.level, seeded(9)), N.problem(L.level, seeded(9))); }

/* ---------- negative numbers: the answers, and how they are written ---------- */
const nn = P(-16, -2, 'nn', 2), pn = P(16, -2, 'pn', 3), np = P(-16, 2, 'pn', 3), zero = P(6, -6, 'pn', 3);
assert.strictEqual(N.text(nn), `multiply to 32, add to ${M}18`); assert.deepStrictEqual(N.answerOf(nn), [-2, -16]); assert.ok(N.isCorrect(nn, -16, -2) && !N.isCorrect(nn, 16, 2), 'the positive pair multiplies right but adds to +18');
assert.strictEqual(N.text(pn), `multiply to ${M}32, add to 14`); assert.deepStrictEqual(N.answerOf(pn), [16, -2]); assert.ok(N.isCorrect(pn, -2, 16) && !N.isCorrect(pn, -16, 2), 'the signs the other way round add to -14');
assert.strictEqual(N.text(np), `multiply to ${M}32, add to ${M}14`); assert.deepStrictEqual(N.answerOf(np), [2, -16]); assert.ok(N.isCorrect(zero, 6, -6) && N.isCorrect(zero, -6, 6) && !N.isCorrect(zero, 6, 6));
assert.strictEqual(N.done(ex), `16 ${X} 2 = 32 and 16 + 2 = 18`); assert.strictEqual(N.done(nn), `${M}2 ${X} (${M}16) = 32 and ${M}2 + (${M}16) = ${M}18`);
assert.strictEqual(N.done(pn), `16 ${X} (${M}2) = ${M}32 and 16 + (${M}2) = 14`); assert.strictEqual(N.done(np), `2 ${X} (${M}16) = ${M}32 and 2 + (${M}16) = ${M}14`);

/* ---------- the worked solution: list the pairs, use the signs, find the pair, check ---------- */
assert.deepStrictEqual(N.steps(ex), [`Factor pairs of 32: 1 ${X} 32, 2 ${X} 16, 4 ${X} 8.`, 'Positive product, positive sum: both numbers are positive.', 'Which pair adds to 18? 2 + 16 = 18.', 'So the numbers are 16 and 2.']);
assert.deepStrictEqual(N.steps(nn).slice(1), ['Positive product, negative sum: both numbers are negative.', 'Which pair adds to 18? 2 + 16 = 18.', `So the numbers are ${M}2 and ${M}16.`]);
assert.deepStrictEqual(N.steps(pn).slice(1), ['Negative product: one positive, one negative. Positive sum: the bigger one is positive.', `Which pair is 14 apart? 16 ${M} 2 = 14.`, `So the numbers are 16 and ${M}2.`]);
assert.strictEqual(N.steps(np)[1], 'Negative product: one positive, one negative. Negative sum: the bigger one is negative.');
assert.strictEqual(N.steps(zero)[1], 'Negative product: one positive, one negative. The sum is 0: they are the same size.'); assert.strictEqual(N.steps(zero)[2], `Which pair is 0 apart? 6 ${M} 6 = 0.`);
for (const L of N.LEVELS) { const rng = seeded(31); for (let i = 0; i < 400; i++) { const p = N.problem(L.level, rng), s = N.steps(p); assert.strictEqual(s.length, 4); { const [x, y] = N.answerOf(p); assert.strictEqual(s[3], `So the numbers are ${N.fmt(x)} and ${N.fmt(y)}.`, 'the last step names the two numbers'); assert.ok(s.every(t => t.length <= 110), `every step is short enough for a narrow column (${Math.max(...s.map(t => t.length))})`); } assert.ok(s[0].includes(`${Math.min(Math.abs(p.a), Math.abs(p.b))} ${X} ${Math.max(Math.abs(p.a), Math.abs(p.b))}`), 'the list of pairs includes the answer'); } }
console.log('number-pairs tests passed');
