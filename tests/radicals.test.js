// Run with: node tests/radicals.test.js
const assert = require('assert');
const R = require('../js/radicals.js');
const F = require('../js/factoring.js');

// a hand-checked example: √48 = 4√3
const p48 = { level: 2, k: 4, m: 3, n: 48, factors: F.primeFactors(48) };
const s48 = R.solution(p48);
assert.deepStrictEqual(s48.lines, [
  '√48',
  '√(2 · 2 · 2 · 2 · 3)',
  '√(2 · 2) · √(2 · 2) · √3',
  '2 · 2 · √3',
  '4√3',
]);
assert.strictEqual(s48.answer, '4√3');
assert.deepStrictEqual(s48.state, { factors: [2, 2, 2, 2, 3], pairs: [[0, 1], [2, 3]], outside: 4, inside: 3 });
assert.deepStrictEqual(R.check(p48, s48.state), { factors: true, pairs: true, answer: true, ok: true });

// √12 = 2√3, with an odd run of equal primes (2·2·3)
const s12 = R.solution({ n: 12, factors: F.primeFactors(12) });
assert.strictEqual(s12.answer, '2√3');
// three of one prime: √54 = √(2·3·3·3) = 3√6
const s54 = R.solution({ n: 54, factors: F.primeFactors(54) });
assert.strictEqual(s54.answer, '3√6');
assert.deepStrictEqual(s54.state.pairs, [[1, 2]], 'pairs the first two 3s, leaves one');
// mixed pairs: √144·… e.g. √180 = √(2·2·3·3·5) = 6√5
assert.strictEqual(R.solution({ n: 180, factors: F.primeFactors(180) }).answer, '6√5');

// formatting
assert.strictEqual(R.fmtRoot([3]), '√3');
assert.strictEqual(R.fmtRoot([2, 3]), '√(2 · 3)');
assert.strictEqual(R.fmtAnswer(1, 6), '√6');
assert.strictEqual(R.fmtAnswer(4, 3), '4√3');

// the three checks catch three different mistakes
const good = s48.state;
// 1. wrong factorization (2·2·2·3·3 = 72, not 48), but pairs and answer consistent with it
let r = R.check(p48, { factors: [2, 2, 2, 3, 3], pairs: [[0, 1], [3, 4]], outside: 6, inside: 2 });
assert.deepStrictEqual([r.factors, r.pairs, r.answer, r.ok], [false, true, true, false]);
// composite "factor" is not a prime factorization
r = R.check(p48, { factors: [6, 8], pairs: [], outside: 1, inside: 48 });
assert.strictEqual(r.factors, false);
// 2. a missed pair: only paired one 2·2, left 2·2·3 inside
r = R.check(p48, { factors: good.factors, pairs: [[0, 1]], outside: 2, inside: 12 });
assert.deepStrictEqual([r.factors, r.pairs, r.answer, r.ok], [true, false, true, false]);
// a "pair" of unequal primes
r = R.check(p48, { factors: good.factors, pairs: [[0, 1], [2, 4]], outside: 4, inside: 3 });
assert.strictEqual(r.pairs, false);
assert.strictEqual(r.ok, false);
// the same tile used twice
r = R.check(p48, { factors: good.factors, pairs: [[0, 1], [1, 2]], outside: 4, inside: 3 });
assert.strictEqual(r.pairs, false);
// 3. right pairs, wrong inside/outside
r = R.check(p48, { ...good, outside: 2, inside: 3 });
assert.deepStrictEqual([r.factors, r.pairs, r.answer, r.ok], [true, true, false, false]);
r = R.check(p48, { ...good, outside: 4, inside: 6 });
assert.strictEqual(r.answer, false);
// swapped outside and inside
r = R.check(p48, { ...good, outside: 3, inside: 4 });
assert.strictEqual(r.answer, false);
// any pairing of the same equal primes is fine (indexes 1,2 + 0,3 instead of 0,1 + 2,3)
r = R.check(p48, { factors: good.factors, pairs: [[1, 2], [0, 3]], outside: 4, inside: 3 });
assert.strictEqual(r.ok, true, 'which two 2s you pair does not matter');
// empty work
assert.strictEqual(R.check(p48, { factors: [], pairs: [], outside: 1, inside: 1 }).factors, false);

// tiers: every candidate is valid, squarefree inside, in band, and inside the palette
let prevMean = 0;
for (const t of R.TIERS) {
  const list = R.candidates(t.level);
  assert.ok(list.length >= 10, `level ${t.level} has variety (${list.length})`);
  const pal = R.palette(t.level);
  list.forEach(({ k, m, n }) => {
    assert.strictEqual(n, k * k * m);
    assert.ok(n >= t.nMin && n <= t.nMax);
    assert.ok(F.primeFactors(m).every((p, i, a) => i === 0 || p !== a[i - 1]), `m=${m} squarefree`);
    assert.ok(k >= 2 && m >= 2, 'always something to simplify, never a perfect square');
    const f = F.primeFactors(n);
    assert.ok(f.length <= 9, `${n} fits in 9 slots`);
    assert.ok(f.every(p => pal.primes.includes(p)), `primes of ${n} are offered`);
    assert.ok(k <= pal.numMax && m <= pal.numMax, `answer for ${n} is in the number palette`);
    const sol = R.solution({ n, factors: f });
    assert.strictEqual(sol.outside, k, `outside of √${n}`);
    assert.strictEqual(sol.inside, m, `inside of √${n}`);
    assert.ok(R.check({ n, factors: f }, sol.state).ok);
  });
  // generation matches the candidate list and is reproducible
  for (let i = 0; i < 300; i++) {
    const pr = R.generate(t.level);
    assert.ok(list.some(c => c.n === pr.n && c.k === pr.k && c.m === pr.m));
    assert.strictEqual(F.product(pr.factors), pr.n);
    assert.strictEqual(pr.level, t.level);
  }
  const mean = list.reduce((a, c) => a + c.n, 0) / list.length;
  assert.ok(mean > prevMean, 'a harder level means bigger radicands on average');
  prevMean = mean;
  console.log(`level ${t.level} (${t.name}): ${list.length} radicals, mean N = ${mean.toFixed(0)}`);
}
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
assert.deepStrictEqual(R.generate(3, seeded(3)), R.generate(3, seeded(3)));

// economy
assert.deepStrictEqual([1, 2, 3, 4].map(R.payout), [10, 25, 50, 100], 'Easy, Medium, Hard, Expert pay 10, 25, 50, 100');
assert.deepStrictEqual(R.TIERS.map(t => t.name), ['Easy', 'Medium', 'Hard', 'Expert']);
assert.strictEqual(R.multiplier, undefined, 'no multipliers: a level pays what it pays');

console.log('radical tests passed');
