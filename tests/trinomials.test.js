// Run with: node tests/trinomials.test.js
const assert = require('assert');
const T = require('../js/trinomials.js');
const t = T.term;

// formatting
assert.strictEqual(T.fmtTerms([t(6, 2), t(7, 1), t(2, 0)]), '6x² + 7x + 2');
assert.strictEqual(T.fmtTerms([t(1, 2), t(-1, 1), t(-6, 0)]), 'x² - x - 6');
assert.strictEqual(T.fmtTerms([t(-1, 1), t(3, 0)]), '-x + 3');
assert.strictEqual(T.fmtTerms([t(2, 2), { ph: '?x' }, { ph: '?x' }, t(5, 0)]), '2x² + ?x + ?x + 5');
assert.strictEqual(T.fmtBlock(t(-3, 1)), '-3x');
assert.strictEqual(T.fmtBlock(t(1, 1)), 'x');

assert.deepStrictEqual(T.termParts([t(6, 2), t(-3, 1), t(2, 0)]), ['6x²', ' - 3x', ' + 2']);

// a hand-checked example: 6x² + 7x + 2 = (3x + 2)(2x + 1)
const ex = { bet: 50, p: 3, q: 2, r: 2, s: 1, a: 6, b: 7, c: 2 };
assert.strictEqual(T.fmtTrinomial(ex), '6x² + 7x + 2');
const sol = T.solution(ex, 3);
assert.deepStrictEqual(sol.lines, [
  '6x² + 7x + 2',
  '6x² + 3x + 4x + 2',
  '3x(2x + 1) + 2(2x + 1)',
  '(3x + 2)(2x + 1)',
]);
// the other order of the split works too
const sol2 = T.solution(ex, 4);
assert.strictEqual(sol2.lines[1], '6x² + 4x + 3x + 2');
assert.strictEqual(sol2.lines[2], '2x(3x + 2) + 1(3x + 2)');
assert.strictEqual(sol2.final, '(2x + 1)(3x + 2)');

// negatives: 6x² - 7x + 2 -> 3x(2x - 1) - 2(2x - 1)
const neg = { bet: 50, p: 3, q: -2, r: 2, s: -1, a: 6, b: -7, c: 2 };
assert.strictEqual(T.solution(neg, -3).lines[2], '3x(2x - 1) - 2(2x - 1)');

// checking
assert.deepStrictEqual(T.check(ex, sol.slots), { split: true, pull: true, match: true, ok: true });
assert.ok(T.check(ex, sol2.slots).ok);

// sign-flipped but valid: -3x(-2x - 1) - 2(-2x - 1)... group2 needs g2 = -2 -> inside -2x-1
const flipped = [t(3, 0), t(4, 0), t(-3, 1), t(-2, 1), t(-1, 0), t(-2, 0), t(-2, 1), t(-1, 0)];
assert.ok(T.check(ex, flipped).ok, 'negated GCFs with negated insides are still correct');

// wrong split
const wrongSplit = [t(2, 0), t(5, 0), ...sol.slots.slice(2)];
let r = T.check(ex, wrongSplit);
assert.strictEqual(r.split, false);
assert.strictEqual(r.ok, false);
// x-term in a split slot is not a number
assert.strictEqual(T.check(ex, [t(3, 1), t(4, 0), ...sol.slots.slice(2)]).split, false);
// GCF too small (pulled out x instead of 3x): inside no longer rebuilds the group
const smallGcf = [...sol.slots];
smallGcf[2] = t(1, 1);
r = T.check(ex, smallGcf);
assert.strictEqual(r.pull, false);
// insides that do not match
const mismatch = [...sol.slots];
mismatch[6] = t(3, 1); mismatch[7] = t(1, 0);
r = T.check(ex, mismatch);
assert.strictEqual(r.match, false);
assert.strictEqual(r.ok, false);

// generation: every wager tier deals valid, primitive, in-band, palette-covered, solvable problems
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const means = [];
for (const tier of T.TIERS) {
  const pal = T.palette(tier.bet);
  const seen = new Set();
  const acs = [];
  for (let i = 0; i < 4000; i++) {
    const pr = T.generate(tier.bet);
    seen.add(T.fmtTrinomial(pr));
    acs.push(Math.abs(pr.a * pr.c));
    assert.strictEqual(pr.bet, tier.bet);
    assert.strictEqual(pr.a, pr.p * pr.r);
    assert.strictEqual(pr.b, pr.p * pr.s + pr.q * pr.r);
    assert.strictEqual(pr.c, pr.q * pr.s);
    assert.notStrictEqual(pr.b, 0);
    assert.strictEqual(T.gcd(T.gcd(pr.a, pr.b), pr.c), 1, 'trinomial has no common factor');
    assert.ok(pr.a >= tier.aMin && pr.a <= tier.aMax, `a=${pr.a} in tier ${tier.bet}`);
    const ac = Math.abs(pr.a * pr.c);
    assert.ok(ac >= tier.acMin && ac <= tier.acMax, `|ac|=${ac} in band for tier ${tier.bet}`);

    // both split orders yield a fully correct canonical answer inside the palette
    [pr.p * pr.s, pr.q * pr.r].forEach(m1k => {
      const sol = T.solution(pr, m1k);
      assert.ok(T.check(pr, sol.slots).ok, `${T.fmtTrinomial(pr)} order ${m1k}`);
      sol.slots.forEach(blk => {
        if (blk.e === 0) assert.ok(Math.abs(blk.k) >= 1 && Math.abs(blk.k) <= pal.constMax, `const ${blk.k} in palette (tier ${tier.bet})`);
        else assert.ok(Math.abs(blk.k) >= 1 && Math.abs(blk.k) <= pal.xMax, `x-term ${blk.k} in palette`);
      });
      // the final answer expands back to the trinomial
      const lin = T.poly([sol.g1, sol.g2]);
      const expanded = T.mul([lin[0], lin[1], 0, 0], T.poly(sol.inside));
      assert.deepStrictEqual(expanded.slice(0, 3), [pr.c, pr.b, pr.a]);
    });
  }
  assert.ok(seen.size > 25, `tier ${tier.bet} has variety (${seen.size})`);
  means.push(mean(acs));
  console.log(`tier ${tier.bet}: ${seen.size} distinct, mean |a*c| = ${mean(acs).toFixed(1)}`);
}
// a bigger wager means a bigger a*c, on average and at the top end of each band
for (let i = 1; i < means.length; i++) assert.ok(means[i] > means[i - 1], 'mean |a*c| rises with the wager');
assert.strictEqual(T.tierFor(10).aMax, 1);
assert.strictEqual(T.tierFor(25).aMax, 1, 'a = 1 until the 50 chip tier');
assert.ok(T.tierFor(50).aMin >= 2 && T.tierFor(100).aMin >= 2);

// seeded generation is reproducible
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
assert.deepStrictEqual(T.generate(50, seeded(7)), T.generate(50, seeded(7)));

// economy: harder wagers pay a better multiplier
assert.strictEqual(T.payout(10), 10);
assert.strictEqual(T.payout(25), 38);
assert.strictEqual(T.payout(50), 100);
assert.strictEqual(T.payout(100), 300);
assert.ok(T.multiplier(100) > T.multiplier(50) && T.multiplier(50) > T.multiplier(25) && T.multiplier(25) > T.multiplier(10));

console.log('trinomial tests passed');
