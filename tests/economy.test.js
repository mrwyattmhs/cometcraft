// Run with: node tests/economy.test.js
const assert = require('assert');
const E = require('../js/economy.js');
const R = require('../js/radicals.js'), T = require('../js/trinomials.js'), P = require('../js/parabolas.js'), F = require('../js/factoring.js'), A = require('../js/arithmetic.js'), B = require('../js/blueprint.js'), M = require('../js/usmap.js');

// the whole economy in one table
assert.deepStrictEqual(E.LEVELS, ['Easy', 'Medium', 'Hard', 'Expert']);
assert.deepStrictEqual(E.PAY, {
  practice: { 2: 10, 3: 25, 4: 50 },
  radical: [10, 25, 50, 100], trinomial: [10, 25, 50, 100], parabola: [25, 50, 100], vertex: [25, 50, 100],
  arithmetic: { add: 2, sub: 2, mul: 4, div: 5 }, map: 5, blueprint: [50, 100, 150, 200],
});
assert.deepStrictEqual([1, 2, 3, 4, 0, 9].map(l => E.levelName(l)), ['Easy', 'Medium', 'Hard', 'Expert', 'Easy', 'Expert'], 'names, kept in range');

// the easiest of anything that has levels is the same small number, and each level pays more than the one before it
[E.PAY.radical, E.PAY.trinomial].forEach(p => assert.strictEqual(p[0], 10, 'the easiest casino level pays 10'));
Object.entries({ radical: E.PAY.radical, trinomial: E.PAY.trinomial, parabola: E.PAY.parabola, vertex: E.PAY.vertex, blueprint: E.PAY.blueprint, practice: Object.values(E.PAY.practice) })
  .forEach(([game, pay]) => pay.forEach((v, i) => { if (i) assert.ok(v > pay[i - 1], `${game}: each level pays more than the one before`); assert.ok(Number.isInteger(v) && v > 0); }));
assert.deepStrictEqual(E.PAY.blueprint, [50, 100, 150, 200], 'the sandbox pays the most');
assert.ok(Math.min(...E.PAY.blueprint) > Math.max(E.PAY.map, ...Object.values(E.PAY.arithmetic)), 'a blueprint pays more than a single quick answer anywhere');

// every game really pays what the table says: no module keeps its own number
assert.deepStrictEqual([1, 2, 3, 4].map(R.payout), E.PAY.radical);
assert.deepStrictEqual([1, 2, 3, 4].map(T.payout), E.PAY.trinomial);
assert.deepStrictEqual([1, 2, 3].map(l => P.payout(l, 'parabola')), E.PAY.parabola);
assert.deepStrictEqual([1, 2, 3].map(l => P.payout(l, 'vertex')), E.PAY.vertex);
assert.deepStrictEqual([2, 3, 4].map(F.practiceReward), Object.values(E.PAY.practice));
assert.deepStrictEqual(['add', 'sub', 'mul', 'div'].map(A.rewardFor), ['add', 'sub', 'mul', 'div'].map(o => E.PAY.arithmetic[o]));
assert.deepStrictEqual([1, 2, 3, 4].map(l => B.LEVELS[l].pay), E.PAY.blueprint);
assert.strictEqual(M.REWARD, E.PAY.map);

// and there is no wagering left to configure: nothing a player can lose by answering
[R, T, P, F].forEach(m => ['multiplier', 'wagerMultiplier', 'wagerPayout', 'WAGER', 'MULT', 'PRACTICE_REWARD'].forEach(k => assert.strictEqual(m[k], undefined, `${k} is gone`)));
console.log('economy tests passed');
