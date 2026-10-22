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

// economy: practice pays by the number of dice (a harder number pays more), and there is no wagering
assert.deepStrictEqual([2, 3, 4].map(F.practiceReward), [10, 25, 50], '2 dice 10 chips, 3 dice 25, 4 dice 50');
assert.strictEqual(F.practiceReward(9), 25, 'an unknown setting falls back to the middle one');
assert.ok(F.practiceReward(4) > F.practiceReward(3) && F.practiceReward(3) > F.practiceReward(2), 'more dice, more chips');
assert.strictEqual(F.wagerMultiplier, undefined); assert.strictEqual(F.wagerPayout, undefined); assert.strictEqual(F.PRACTICE_REWARD, undefined);


/* ---------- the factor tree as you build it ---------- */
const ts = F.treeSteps;
const vals = (t, kind) => t.nodes.filter(n => n.kind === kind).map(n => n.v);
// the target alone at first, and a "?" before the dice are thrown
let t0 = ts(60, []); assert.deepStrictEqual(t0.nodes, [{ v: 60, col: 1, lvl: 0, kind: 'pending' }]); assert.deepStrictEqual([t0.lines, t0.misfits, t0.left, t0.done], [[], [], 60, false]);
t0 = ts(null, []); assert.deepStrictEqual(t0.nodes, [{ v: '?', col: 1, lvl: 0, kind: 'pending' }]); assert.strictEqual(t0.left, null); assert.strictEqual(t0.done, false);
// each prime that divides what is left splits it
let t1 = ts(60, [2]); assert.deepStrictEqual(t1.nodes.map(n => [n.v, n.col, n.lvl, n.kind]), [[60, 1, 0, 'split'], [2, 0, 1, 'prime'], [30, 2, 1, 'pending']]);
assert.deepStrictEqual(t1.lines, [[1, 0, 0, 1], [1, 0, 2, 1]]); assert.strictEqual(t1.left, 30);
t1 = ts(60, [2, 5]); assert.deepStrictEqual(t1.nodes.map(n => [n.v, n.kind]), [[60, 'split'], [2, 'prime'], [30, 'split'], [5, 'prime'], [6, 'pending']]); assert.strictEqual(t1.left, 6);
// the last prime turns what was left into a leaf: finished
t1 = ts(60, [2, 5, 3, 2]); assert.strictEqual(t1.done, true); assert.strictEqual(t1.left, 1); assert.deepStrictEqual(vals(t1, 'prime'), [2, 5, 3, 2]); assert.strictEqual(vals(t1, 'pending').length, 0);
assert.deepStrictEqual(t1.nodes.map(n => n.v), [60, 2, 30, 5, 6, 3, 2]);
// a prime sum is one leaf
t1 = ts(37, [37]); assert.deepStrictEqual(t1.nodes, [{ v: 37, col: 1, lvl: 0, kind: 'prime' }]); assert.strictEqual(t1.done, true); assert.deepStrictEqual(t1.lines, []);
t1 = ts(37, [2]); assert.deepStrictEqual(t1.misfits, [2]); assert.strictEqual(t1.nodes.length, 1); assert.strictEqual(t1.nodes[0].kind, 'pending'); assert.strictEqual(t1.left, 37);
// a prime that does not divide what is left changes nothing and is listed
t1 = ts(60, [2, 5, 7]); assert.deepStrictEqual(t1.misfits, [7]); assert.deepStrictEqual(t1.nodes, ts(60, [2, 5]).nodes); assert.strictEqual(t1.left, 6);
t1 = ts(60, [2, 2, 2]); assert.deepStrictEqual(t1.misfits, [2], 'a third 2 does not fit in 60 = 2 x 2 x 3 x 5'); assert.strictEqual(t1.left, 15);
t1 = ts(60, [2, 2, 3, 5, 2, 7]); assert.deepStrictEqual(t1.misfits, [2, 7], 'once it is all factored, anything more is a misfit'); assert.strictEqual(t1.done, true);
// the input is not touched
const keep = [2, 5, 7]; ts(60, keep); assert.deepStrictEqual(keep, [2, 5, 7]);
// six factors is the most any throw can need, and the tree for 64 uses the whole staircase
assert.strictEqual(F.MAX_TREE_FACTORS, 6); assert.strictEqual(2 ** F.MAX_TREE_FACTORS, 64); assert.ok(2 ** (F.MAX_TREE_FACTORS + 1) > 4 * 20, 'four d20 can never make a number with more than six prime factors');

// every sum from 2 to 80, in several orders: a finished tree with the right shape, and every line joins real nodes
const lcg = (seed => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)(12345);
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(lcg() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
for (let n = 2; n <= 80; n++) {
  const f = F.primeFactors(n), k = f.length;
  [f, f.slice().reverse(), shuffle(f), shuffle(f)].forEach(order => {
    const t = ts(n, order);
    assert.ok(t.done && t.left === 1 && t.misfits.length === 0, `${n} in order ${order} finishes`);
    assert.deepStrictEqual(vals(t, 'prime').slice().sort((a, b) => a - b), f, `${n}: the leaves are its prime factors`);
    assert.strictEqual(t.nodes.length, k === 1 ? 1 : 2 * k - 1, `${n}: node count`);
    assert.strictEqual(t.lines.length, 2 * (k - 1));
    assert.ok(t.nodes.filter(x => x.kind === 'split').every(x => x.v > 3 && !F.isPrime(x.v)), `${n}: only composites are split`);
    assert.strictEqual(vals(t, 'pending').length, 0);
    assert.ok(k <= F.MAX_TREE_FACTORS, `${n} has ${k} factors`);
    t.nodes.forEach(x => { assert.ok(x.col >= 0 && x.col <= k && x.lvl >= 0 && x.lvl <= Math.max(0, k - 1), `${n}: node ${x.v} is on the staircase`); });
    const at = (c, l) => t.nodes.find(x => x.col === c && x.lvl === l);
    t.lines.forEach(([pc, pl, cc, cl]) => { const p = at(pc, pl), c = at(cc, cl); assert.ok(p && c && p.kind === 'split' && cl === pl + 1, `${n}: a line joins a split number to its child`); assert.ok(p.v % c.v === 0, 'and the child divides its parent'); });
    new Set(t.nodes.map(x => `${x.col},${x.lvl}`)).size === t.nodes.length || assert.fail(`${n}: two nodes on one spot`);
  });
}
// step by step, with any primes at all: what has been split off times what is left is always the target, and misfits never divide what was left
for (let trial = 0; trial < 400; trial++) {
  const n = 2 + Math.floor(lcg() * 79), placed = Array.from({ length: Math.floor(lcg() * 9) }, () => F.primesUpTo(80)[Math.floor(lcg() * 22)]);
  const t = ts(n, placed);
  const used = placed.slice(); t.misfits.forEach(m => used.splice(used.indexOf(m), 1));
  assert.strictEqual(F.product(used) * (t.done ? 1 : t.left), n, `${n} ${placed}: the primes that fit times what is left make the target`);
  assert.ok(used.every(p => n % p === 0), 'each prime that fit divides the target');
  assert.strictEqual(t.nodes.filter(x => x.kind === 'pending').length, t.done ? 0 : 1, 'one number is left to factor until it is all done');
  // the same primes in any order leave the same misfits (the same primes do not fit)
  assert.deepStrictEqual(ts(n, shuffle(placed)).misfits.slice().sort((a, b) => a - b), t.misfits.slice().sort((a, b) => a - b), `${n} ${placed}: misfits do not depend on the order`);
  assert.strictEqual(ts(n, shuffle(placed)).left, t.left);
}

console.log('factoring tests passed');
