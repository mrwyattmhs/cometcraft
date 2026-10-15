// Run with: node tests/factoring.test.js
const assert = require('assert');
const F = require('../js/factoring.js');

// primes
assert.strictEqual(F.isPrime(2), true);
assert.strictEqual(F.isPrime(37), true);
assert.strictEqual(F.isPrime(1), false);
assert.strictEqual(F.isPrime(49), false);
assert.deepStrictEqual(F.primesUpTo(20), [2, 3, 5, 7, 11, 13, 17, 19]);
assert.strictEqual(F.primesUpTo(79).length, 22); // the largest 4-dice inventory

// factorization
assert.deepStrictEqual(F.primeFactors(48), [2, 2, 2, 2, 3]);
assert.deepStrictEqual(F.primeFactors(37), [37]);
assert.deepStrictEqual(F.primeFactors(64), [2, 2, 2, 2, 2, 2]);
assert.deepStrictEqual(F.primeFactors(77), [7, 11]);

// every reachable sum (2-4 dice) fits in the 9-slot grid and round-trips
for (let n = 2; n <= 80; n++) {
  const f = F.primeFactors(n);
  assert.ok(f.length <= 9, `${n} needs ${f.length} slots`);
  assert.strictEqual(F.product(f), n);
  assert.ok(F.isValidFactorization(f, n));
}

// validation rejects composites and wrong products
assert.strictEqual(F.isValidFactorization([6, 8], 48), false); // composite gems
assert.strictEqual(F.isValidFactorization([2, 3], 48), false); // wrong product
assert.strictEqual(F.isValidFactorization([], 1), false);
assert.strictEqual(F.isValidFactorization([37], 37), true);    // prime sum: the gem itself
assert.strictEqual(F.isValidFactorization([3, 2, 2, 2, 2], 48), true); // order doesn't matter

// exponent form
assert.strictEqual(F.toExponentForm([2, 2, 2, 2, 3]), '2⁴ · 3');
assert.strictEqual(F.toExponentForm([37]), '37');
assert.strictEqual(F.toExponentForm([2, 2, 3, 3, 5]), '2² · 3² · 5');

// dice: deterministic with a fake rng, and always in range
const lo = F.rollDice(3, 20, () => 0);
assert.deepStrictEqual(lo, { dice: [1, 1, 1], sum: 3 });
const hi = F.rollDice(4, 20, () => 0.999999);
assert.deepStrictEqual(hi, { dice: [20, 20, 20, 20], sum: 80 });
for (let i = 0; i < 500; i++) {
  const r = F.rollDice(3);
  assert.ok(r.sum >= 3 && r.sum <= 60);
  assert.strictEqual(r.dice.reduce((a, b) => a + b, 0), r.sum);
}

// economy
assert.strictEqual(F.wagerMultiplier([37]), 1);
assert.strictEqual(F.wagerPayout(10, F.primeFactors(37)), 10);
assert.strictEqual(F.wagerPayout(10, F.primeFactors(48)), 30);
// practice pays a flat 20 chips for every solved round, whatever the dice setting
[2, 3, 4].forEach(n => assert.strictEqual(F.practiceReward(n), 20));
assert.strictEqual(F.PRACTICE_REWARD, 20);

console.log('factoring tests passed');
