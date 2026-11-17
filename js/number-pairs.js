/* The NUMBERS GAME, in the House of Algebra: the step at the heart of factoring a trinomial by splitting the middle term. You are given two targets,

       multiply to 32, add to 18

   and you find the two whole numbers that do both (16 and 2). The sum you are asked for is always the sum of a real pair of factors, so there is always exactly one pair (in either order).
   No DOM here, so it is all unit tested in Node (tests/number-pairs.test.js); booth-game.js is the window (the same engine as the other booths, with two boxes and a +/- key).
   Easy    both numbers positive:          multiply to 32, add to 18        (16 and 2)
   Medium  both numbers negative:          multiply to 32, add to -18       (-16 and -2)
   Hard    one of each (a negative product, so the "sum" is a difference of the factors), mixed with the first two kinds:   multiply to -32, add to 14   (16 and -2) */
const NumberPairs = (() => {
  const BUILD = 50; // bump together with the ?v= numbers in index.html
  const MINUS = '\u2212', TIMES = '\u00d7';
  const LEVELS = [
    { level: 1, name: 'Easy', sample: `${TIMES} 32, + 18`, desc: 'Both numbers are positive, like 16 and 2', kinds: ['pp'], maxProduct: 48, signed: false },
    { level: 2, name: 'Medium', sample: `${TIMES} 32, + ${MINUS}18`, desc: `The sum is negative, so both numbers are negative, like ${MINUS}16 and ${MINUS}2`, kinds: ['nn'], maxProduct: 60, signed: true },
    { level: 3, name: 'Hard', sample: `${TIMES} ${MINUS}32, + 14`, desc: `A negative product: one number of each sign, like 16 and ${MINUS}2. Mixed with the first two kinds`, kinds: ['pn', 'pn', 'pn', 'pp', 'nn'], maxProduct: 72, signed: true },
  ];
  const levelOf = l => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(Number(l)) || 1)) - 1];
  const between = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)), pick = (rng, list) => list[Math.floor(rng() * list.length)];
  const fmt = n => (n < 0 ? `${MINUS}${-n}` : String(n)), paren = n => (n < 0 ? `(${fmt(n)})` : String(n));

  /** The pairs of whole numbers (smaller first) that multiply to n, a positive whole number: for 32, [1, 32], [2, 16], [4, 8]. */
  function factorPairs(n) { const out = []; for (let d = 1; d * d <= n; d++) if (n % d === 0) out.push([d, n / d]); return out; }
  /** Every pair of sizes (m <= n) a level uses: m from 1 to 9, n up to 36, and the product no bigger than the level allows. */
  function sizes(level) { const L = levelOf(level), out = []; for (let m = 1; m <= 9; m++) for (let n = m; n <= 36; n++) if (m * n <= L.maxProduct && m * n >= 4) out.push([m, n]); return out; }

  /** The two numbers for a kind: 'pp' both positive, 'nn' both negative, 'pn' one of each (bigPositive says which one is the bigger). a is the one that is bigger in size. */
  function build(level, kind, m, n, bigPositive) {
    const [a, b] = kind === 'pp' ? [n, m] : kind === 'nn' ? [-n, -m] : bigPositive ? [n, -m] : [-n, m];
    return { level, kind, product: a * b, sum: a + b, a, b };
  }
  /** A problem: { level, kind, product, sum, a, b }. */
  function problem(level, rng = Math.random, last = null) {
    const L = levelOf(level), S = sizes(L.level);
    for (let tries = 0; tries < 60; tries++) {
      const kind = pick(rng, L.kinds), [m, n] = S[between(rng, 0, S.length - 1)], p = build(L.level, kind, m, n, rng() < 0.5);
      if (!last || last.product !== p.product || last.sum !== p.sum) return p;
    }
    return build(L.level, L.kinds[0], 2, 16, true);
  }
  /** How many different problems (different product-and-sum targets) a level can deal. */
  function count(level) {
    const L = levelOf(level), seen = new Set();
    for (const kind of new Set(L.kinds)) for (const [m, n] of sizes(L.level)) for (const big of kind === 'pn' ? [true, false] : [true]) { const p = build(L.level, kind, m, n, big); seen.add(`${p.product},${p.sum}`); }
    return seen.size;
  }

  /** How the window draws it: two boxes, the product above them and the sum below. */
  const view = p => ({ kind: 'diamond', top: fmt(p.product), bottom: fmt(p.sum), boxes: 2, topLabel: 'multiply to', bottomLabel: 'add to' });
  const text = p => `multiply to ${fmt(p.product)}, add to ${fmt(p.sum)}`;
  /** The two numbers, the bigger first. */
  const answerOf = p => [p.a, p.b].sort((x, y) => y - x);
  /** x and y are right if they are whole numbers that multiply to the product and add to the sum (in either order). */
  function isCorrect(p, x, y) { return [x, y].every(v => typeof v === 'number' && Number.isInteger(v)) && x * y === p.product && x + y === p.sum; }
  /** The finished statement: "16 x 2 = 32 and 16 + 2 = 18". */
  function done(p) { const [x, y] = answerOf(p); return `${fmt(x)} ${TIMES} ${paren(y)} = ${fmt(p.product)} and ${fmt(x)} + ${paren(y)} = ${fmt(p.sum)}`; }

  /** The worked solution, a line at a time: list the factor pairs, use the signs, find the pair with the right sum or difference, and name the two numbers (the window shows the check,
      done(p), right above the steps). Kept short: it is read in a narrow column. */
  function steps(p) {
    const size = Math.abs(p.product), pairs = factorPairs(size), [x, y] = answerOf(p), m = Math.min(Math.abs(p.a), Math.abs(p.b)), n = Math.max(Math.abs(p.a), Math.abs(p.b)), out = [];
    out.push(`Factor pairs of ${size}: ${pairs.map(([d, e]) => `${d} ${TIMES} ${e}`).join(', ')}.`);
    if (p.product > 0) {
      out.push(p.sum > 0 ? 'Positive product, positive sum: both numbers are positive.' : 'Positive product, negative sum: both numbers are negative.');
      out.push(`Which pair adds to ${Math.abs(p.sum)}? ${m} + ${n} = ${m + n}.`);
    } else {
      out.push(`Negative product: one positive, one negative. ${p.sum === 0 ? 'The sum is 0: they are the same size.' : `${p.sum > 0 ? 'Positive' : 'Negative'} sum: the bigger one is ${p.sum > 0 ? 'positive' : 'negative'}.`}`);
      out.push(`Which pair is ${Math.abs(p.sum)} apart? ${n} ${MINUS} ${m} = ${n - m}.`);
    }
    out.push(`So the numbers are ${fmt(x)} and ${fmt(y)}.`);
    return out;
  }

  return { BUILD, LEVELS, MINUS, TIMES, levelOf, factorPairs, sizes, problem, count, view, text, answerOf, isCorrect, done, steps, fmt };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = NumberPairs;
