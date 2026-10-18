/* Pure logic for the radical table (no DOM, no THREE, unit tested in Node).

   Method: simplify √N by pairing prime factors
     1. break N into primes:            √48 = √(2 · 2 · 2 · 2 · 3)
     2. group equal primes into pairs:  √(2·2) · √(2·2) · √3
     3. each pair sends one number outside; leftovers stay inside:  2 · 2 · √3 = 4√3

   The student's work is described by a state object:
     { factors: [2,2,2,2,3], pairs: [[0,1],[2,3]], outside: 4, inside: 3 }
   `pairs` holds indexes into `factors`. */
const Radicals = (() => {
  const BUILD = 17; // bump together with radical-game.js and the ?v= numbers in index.html
  const F = typeof Factoring !== 'undefined' ? Factoring : require('./factoring.js');

  /* ---------- wager tiers: a bigger bet deals a bigger radicand ---------- */
  // N = k² · m with m squarefree (so k is the number that comes out, m stays in).
  // kMin..kMax / mMax shape the problem, nMin..nMax bound N. primeMax is the largest
  // prime gem offered; numMax is how far the answer palette (1..numMax) reaches.
  const TIERS = [
    { bet: 10,  mult: 1,   desc: 'Roots up to 63',  kMin: 2, kMax: 3,  mMax: 7,  nMin: 8,   nMax: 63,  primeMax: 7,  numMax: 12 },
    { bet: 25,  mult: 1.5, desc: 'Roots up to 150', kMin: 2, kMax: 5,  mMax: 15, nMin: 40,  nMax: 150, primeMax: 13, numMax: 16 },
    { bet: 50,  mult: 2,   desc: 'Roots up to 300', kMin: 2, kMax: 8,  mMax: 15, nMin: 100, nMax: 300, primeMax: 13, numMax: 20 },
    { bet: 100, mult: 3,   desc: 'Roots up to 600', kMin: 2, kMax: 10, mMax: 15, nMin: 200, nMax: 600, primeMax: 17, numMax: 24 },
  ];
  const tierFor = bet => TIERS.find(t => t.bet === bet) || TIERS[0];

  const isSquarefree = m => {
    const f = F.primeFactors(m);
    return f.every((p, i) => i === 0 || p !== f[i - 1]);
  };

  /** Every (k, m) the tier can deal. Exposed so tests and the UI can see the variety. */
  function candidates(bet) {
    const t = tierFor(bet);
    const out = [];
    for (let k = t.kMin; k <= t.kMax; k++) {
      for (let m = 2; m <= t.mMax; m++) {
        const n = k * k * m;
        if (isSquarefree(m) && n >= t.nMin && n <= t.nMax) out.push({ k, m, n });
      }
    }
    return out;
  }

  function generate(bet, rng = Math.random) {
    const t = tierFor(bet);
    const list = candidates(bet);
    const c = list[Math.floor(rng() * list.length)];
    return { bet: t.bet, k: c.k, m: c.m, n: c.n, factors: F.primeFactors(c.n) };
  }

  const palette = bet => {
    const t = tierFor(bet);
    return { primes: F.primesUpTo(t.primeMax), numMax: t.numMax };
  };
  const multiplier = bet => tierFor(bet).mult;
  const payout = bet => Math.round(bet * multiplier(bet));

  /* ---------- formatting ---------- */
  const fmtRoot = list => (list.length === 1 ? `√${list[0]}` : `√(${list.join(' · ')})`);
  const fmtAnswer = (outside, inside) => `${outside > 1 ? outside : ''}√${inside}`;

  /* ---------- checking ---------- */
  /** Three checks, each judged on the student's own work:
        factors: their primes really are the prime factorization of N
        pairs:   every pair is two equal primes, and no equal primes were left unpaired
        answer:  outside = one number from each pair, multiplied; inside = leftovers, multiplied */
  function check(problem, s) {
    const f = s.factors;
    const factors = f.length > 0 && f.every(F.isPrime) && F.product(f) === problem.n;

    const used = new Set();
    let valid = true;
    s.pairs.forEach(([i, j]) => {
      if (i === j || f[i] === undefined || f[j] === undefined || f[i] !== f[j] || used.has(i) || used.has(j)) valid = false;
      used.add(i); used.add(j);
    });
    const left = f.filter((_, i) => !used.has(i));
    const counts = new Map();
    left.forEach(p => counts.set(p, (counts.get(p) || 0) + 1));
    const maximal = [...counts.values()].every(c => c <= 1);
    const pairs = valid && maximal;

    const expectOutside = F.product(s.pairs.map(([i]) => f[i]));
    const expectInside = F.product(left);
    const answer = valid && s.outside === expectOutside && s.inside === expectInside;

    return { factors, pairs, answer, ok: factors && pairs && answer };
  }

  /** The textbook solution for a problem. */
  function solution(problem) {
    const f = problem.factors; // ascending, so equal primes sit together
    const outs = [], left = [], pairs = [];
    for (let i = 0; i < f.length;) {
      let j = i;
      while (j < f.length && f[j] === f[i]) j++;
      const run = j - i;
      for (let k = 0; k < Math.floor(run / 2); k++) { pairs.push([i + 2 * k, i + 2 * k + 1]); outs.push(f[i]); }
      if (run % 2) left.push(f[i]);
      i = j;
    }
    const outside = F.product(outs), inside = F.product(left);
    const groups = [...outs.map(p => `√(${p} · ${p})`), ...(left.length ? [fmtRoot(left)] : [])];
    return {
      outside, inside, outs, left,
      answer: fmtAnswer(outside, inside),
      state: { factors: [...f], pairs, outside, inside },
      lines: [
        `√${problem.n}`,
        fmtRoot(f),
        groups.join(' · '),
        `${outs.join(' · ')} · ${fmtRoot(left)}`,
        fmtAnswer(outside, inside),
      ],
    };
  }

  return { BUILD, TIERS, tierFor, candidates, generate, palette, multiplier, payout, fmtRoot, fmtAnswer, check, solution };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Radicals;
