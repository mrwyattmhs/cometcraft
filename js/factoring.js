/* Pure math helpers: no DOM, no THREE. Safe to unit-test in Node. */
const Factoring = (() => {
  const E = typeof Economy !== 'undefined' ? Economy : require('./economy.js');
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).split('').map(d => SUP[+d]).join('');

  function isPrime(n) {
    if (!Number.isInteger(n) || n < 2) return false;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  }

  function primesUpTo(max) {
    const out = [];
    for (let i = 2; i <= max; i++) if (isPrime(i)) out.push(i);
    return out;
  }

  /** 48 -> [2, 2, 2, 2, 3] (ascending). A prime returns [itself]. */
  function primeFactors(n) {
    const f = [];
    let m = n;
    for (let p = 2; p * p <= m; p++) {
      while (m % p === 0) { f.push(p); m /= p; }
    }
    if (m > 1) f.push(m);
    return f;
  }

  const product = list => list.reduce((a, b) => a * b, 1);

  /** The outcome is decided here, first. The animation only reveals it. */
  function rollDice(count, sides = 20, rng = Math.random) {
    const dice = Array.from({ length: count }, () => 1 + Math.floor(rng() * sides));
    return { dice, sum: dice.reduce((a, b) => a + b, 0) };
  }

  /** Every entry prime and the product matches => it IS the factorization (it is unique). */
  function isValidFactorization(primes, target) {
    return primes.length > 0 && primes.every(isPrime) && product(primes) === target;
  }

  /** [2,2,2,2,3] -> "2⁴ · 3" */
  function toExponentForm(factors) {
    const counts = new Map();
    factors.forEach(p => counts.set(p, (counts.get(p) || 0) + 1));
    return [...counts].map(([p, c]) => (c > 1 ? `${p}${sup(c)}` : `${p}`)).join(' · ');
  }

  /* ---- Economy (the amounts live in economy.js) ---- */
  /** Chips for a solved practice round: more dice make a harder number, so they pay more (2 dice 10, 3 dice 25, 4 dice 50). */
  const practiceReward = dice => E.PAY.practice[dice] || E.PAY.practice[3];

  /* ---- the factor tree, as you build it ---- */
  /** The most prime factors any sum can have: 2 x 2 x ... for the biggest throw (4 dice make at most 80, and 64 is six 2s). */
  const MAX_TREE_FACTORS = 6;

  /** The factor tree so far, from the target and the primes placed in the grid (in grid order).
      Each prime that divides what is left splits off a leaf, and what is left carries on as a new node. A prime that does not divide
      what is left changes nothing and is listed in misfits. When what is left IS the prime placed, that node itself becomes a leaf.
      Nodes sit on a staircase: the number left to factor goes down and to the right, each leaf down and to the left.
        nodes:  { v, col, lvl, kind } with kind 'split' (a number already broken up), 'prime' (a leaf you placed), or 'pending' (still to factor)
        lines:  [parentCol, parentLvl, childCol, childLvl]
        left:   what is still to factor (1 when it is all done), or null before the dice are rolled
      With no sum yet (sum is null) the tree is a single "?" waiting for the throw. */
  function treeSteps(sum, placed) {
    if (!sum) return { nodes: [{ v: '?', col: 1, lvl: 0, kind: 'pending' }], lines: [], misfits: [], left: null, done: false };
    const nodes = [{ v: sum, col: 1, lvl: 0, kind: 'pending' }], lines = [], misfits = [];
    let rem = sum, i = 0;                       // i: how many times the tree has split so far
    for (const p of placed) {
      if (rem % p !== 0) { misfits.push(p); continue; }          // once everything is factored rem is 1, so every later prime lands here
      const cur = nodes[nodes.length - 1];
      if (rem === p) { cur.kind = 'prime'; rem = 1; continue; }
      cur.kind = 'split';
      nodes.push({ v: p, col: i, lvl: i + 1, kind: 'prime' });
      rem /= p; i++;
      nodes.push({ v: rem, col: i + 1, lvl: i, kind: 'pending' });
      lines.push([cur.col, cur.lvl, i - 1, i], [cur.col, cur.lvl, i + 1, i]);
    }
    return { nodes, lines, misfits, left: rem, done: rem === 1 };
  }

  return {
    isPrime, primesUpTo, primeFactors, product, rollDice,
    isValidFactorization, toExponentForm,
    practiceReward, MAX_TREE_FACTORS, treeSteps,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Factoring;
