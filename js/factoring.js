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

  return {
    isPrime, primesUpTo, primeFactors, product, rollDice,
    isValidFactorization, toExponentForm,
    practiceReward,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Factoring;
