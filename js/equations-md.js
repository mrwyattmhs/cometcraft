/* The House of Algebra's second table: MULTIPLY AND DIVIDE. The same idea as the Missing Number, one-step equations with a box where the answer goes, but undoing multiplying and dividing:

       [ ] x 4 = 20       put a 5 in the box.

   No DOM here, so it is all unit tested in Node (tests/equations-md.test.js); equation-game.js is the window, and it is the same window as the first table's. It has the same shape as
   equations.js (LEVELS, problem, count, pieces, text, answerOf, holds, isCorrect, steps), so one window can run both. Every number and answer is a whole number of at least 2.
   Easy    the box first, multiplied:                [ ] x 4 = 20
   Medium  the box first, divided:                   [ ] / 3 = 6          or the number first, multiplied:   3 x [ ] = 21
   Hard    all four shapes, up to 12, the box divided into (24 / [ ] = 4), and sometimes the equation turned round:  20 = [ ] x 4
   (x is the multiplication sign and / the division sign, drawn as the real symbols.) */
const EquationsMD = (() => {
  const BUILD = 42; // bump together with the ?v= numbers in index.html
  const TIMES = '\u00d7', DIVIDE = '\u00f7';
  const LEVELS = [
    { level: 1, name: 'Easy', sample: `[ ] ${TIMES} 4 = 20`, desc: `Find the number that was multiplied, like [ ] ${TIMES} 4 = 20`, forms: ['mul1'] },
    { level: 2, name: 'Medium', sample: `[ ] ${DIVIDE} 3 = 6`, desc: `Find the number that was divided, or the one multiplied by, like [ ] ${DIVIDE} 3 = 6 or 3 ${TIMES} [ ] = 21`, forms: ['div1', 'mul2'] },
    { level: 3, name: 'Hard', sample: `24 ${DIVIDE} [ ] = 4`, desc: `Every shape, up to 12, the box divided into, and the equation turned round, like 24 ${DIVIDE} [ ] = 4`, forms: ['mul1', 'mul2', 'div1', 'div2'], flips: true },
  ];
  const levelOf = l => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(Number(l)) || 1)) - 1];
  const between = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)), pick = (rng, list) => list[Math.floor(rng() * list.length)];

  /** A problem: { level, form, a, b, x, flip }. The box is x, and:
        mul1  [ ] x a = b     mul2  a x [ ] = b     div1  [ ] / a = b     div2  a / [ ] = b       flip: the two sides are written the other way round (b = [ ] x a) */
  function problem(level, rng = Math.random, last = null) {
    const L = levelOf(level), big = L.level === 3, top = big ? 12 : 9;
    for (let tries = 0; tries < 60; tries++) {
      const form = pick(rng, L.forms), flip = !!L.flips && rng() < 0.3; let a, b, x;
      if (form === 'mul1' || form === 'mul2') { a = between(rng, 2, top); x = between(rng, 2, big ? 12 : 10); b = a * x; }
      else if (form === 'div1') { a = between(rng, 2, top); b = between(rng, 2, big ? 12 : 10); x = a * b; }
      else { b = between(rng, 2, 12); x = between(rng, 2, 12); a = x * b; }                                          // div2: a / [ ] = b
      const p = { level: L.level, form, a, b, x, flip };
      if (!last || last.form !== p.form || last.a !== p.a || last.b !== p.b || last.flip !== p.flip) return p;
    }
    return { level: L.level, form: 'mul1', a: 2, b: 4, x: 2, flip: false };
  }
  /** How many different problems a level can deal. */
  function count(level) {
    const L = levelOf(level), big = L.level === 3, top = big ? 12 : 9, n = (lo, hi) => hi - lo + 1; let total = 0;
    for (const form of L.forms) {
      if (form === 'mul1' || form === 'mul2') total += n(2, top) * n(2, big ? 12 : 10);
      else if (form === 'div1') total += n(2, top) * n(2, big ? 12 : 10);
      else total += n(2, 12) * n(2, 12);
    }
    return total * (L.flips ? 2 : 1);
  }

  /** The equation as pieces to draw: { box: true }, { num }, { op } and { eq }. For [ ] x 4 = 20: box, x, 4, =, 20. */
  function pieces(p) {
    const box = { box: true }, times = { op: TIMES }, divide = { op: DIVIDE }, eq = { eq: true }, n = v => ({ num: v });
    const left = { mul1: [box, times, n(p.a)], mul2: [n(p.a), times, box], div1: [box, divide, n(p.a)], div2: [n(p.a), divide, box] }[p.form], right = [n(p.b)];
    return p.flip ? [...right, eq, ...left] : [...left, eq, ...right];
  }
  /** The equation as text, with [ ] for the box: "[ ] x 4 = 20". */
  const text = p => pieces(p).map(x => (x.box ? '[ ]' : x.op ? x.op : x.eq ? '=' : String(x.num))).join(' ');
  const answerOf = p => p.x;
  /** The box holds n if the equation is true with n in it. (Whole numbers only.) */
  function holds(p, n) {
    if (typeof n !== 'number' || !Number.isInteger(n)) return false;
    const v = { mul1: n * p.a, mul2: p.a * n, div1: n / p.a, div2: n === 0 ? NaN : p.a / n }[p.form]; return v === p.b;
  }
  const isCorrect = (p, n) => holds(p, n);

  /** The worked solution, a line at a time. */
  function steps(p) {
    const eq = text(p), x = p.x, out = [], round = p.flip ? ' (The equation is turned round, and it means the same: both sides are equal.)' : '';
    if (p.form === 'mul1' || p.form === 'mul2') {
      out.push(`${eq}: the box was multiplied by ${p.a} to make ${p.b}.${round}`);
      out.push(`To find the box, divide ${p.b} by ${p.a}: ${p.b} ${DIVIDE} ${p.a} = ${x}.`);
      out.push(`Check: ${p.form === 'mul1' ? `${x} ${TIMES} ${p.a}` : `${p.a} ${TIMES} ${x}`} = ${p.b}.`);
    } else if (p.form === 'div1') {
      out.push(`${eq}: the box was shared into ${p.a} equal parts, and each part is ${p.b}.${round}`);
      out.push(`To find the box, put the parts back together: ${p.b} ${TIMES} ${p.a} = ${x}.`);
      out.push(`Check: ${x} ${DIVIDE} ${p.a} = ${p.b}.`);
    } else {
      out.push(`${eq}: ${p.a} was shared into the box's number of equal parts, and each part is ${p.b}.${round}`);
      out.push(`To find the box, ask how many parts of ${p.b} make ${p.a}: ${p.a} ${DIVIDE} ${p.b} = ${x}.`);
      out.push(`Check: ${p.a} ${DIVIDE} ${x} = ${p.b}.`);
    }
    return out;
  }

  return { BUILD, LEVELS, TIMES, DIVIDE, levelOf, problem, count, pieces, text, answerOf, holds, isCorrect, steps };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = EquationsMD;
