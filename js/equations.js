/* The House of Algebra's first table: the MISSING NUMBER. One-step equations with addition and subtraction, with a box where the number you have to find goes:

       [ ] + 5 = 7        put a 2 in the box.

   No DOM here, so it is all unit tested in Node (tests/equations.test.js); booth-game.js is the window. Every number is a whole number of at least 1, and so is the answer.
   Easy    the box first, added to:       [ ] + 5 = 7
   Medium  the box first, taken from:     [ ] - 4 = 9         or the number first:   3 + [ ] = 11
   Hard    all four shapes, bigger numbers, the box taken away (15 - [ ] = 6), and sometimes the equation turned round:  7 = [ ] + 5 */
const Equations = (() => {
  const BUILD = 47; // bump together with the ?v= numbers in index.html
  const MINUS = '\u2212';
  const LEVELS = [
    { level: 1, name: 'Easy', sample: '[ ] + 5 = 7', desc: 'Find the number that was added on, like [ ] + 5 = 7', forms: ['add1'] },
    { level: 2, name: 'Medium', sample: '[ ] \u2212 4 = 9', desc: 'Find the number that was taken away, or added in front, like [ ] \u2212 4 = 9 or 3 + [ ] = 11', forms: ['sub1', 'add2'] },
    { level: 3, name: 'Hard', sample: '15 \u2212 [ ] = 6', desc: 'Every shape, bigger numbers, the box taken away, and the equation turned round, like 15 \u2212 [ ] = 6', forms: ['add1', 'add2', 'sub1', 'sub2'], flips: true },
  ];
  const levelOf = l => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(Number(l)) || 1)) - 1];
  const between = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)), pick = (rng, list) => list[Math.floor(rng() * list.length)];

  /** A problem: { level, form, a, b, x, flip }. The box is x, and:
        add1  [ ] + a = b     add2  a + [ ] = b     sub1  [ ] - a = b     sub2  a - [ ] = b       flip: the two sides are written the other way round (b = [ ] + a) */
  function problem(level, rng = Math.random, last = null) {
    const L = levelOf(level), big = L.level === 3;
    for (let tries = 0; tries < 60; tries++) {
      const form = pick(rng, L.forms), flip = !!L.flips && rng() < 0.3; let a, b, x;
      if (form === 'add1' || form === 'add2') { a = between(rng, 1, big ? 25 : form === 'add2' ? 12 : 10); x = between(rng, 1, big ? 25 : form === 'add2' ? 12 : 10); b = a + x; }
      else if (form === 'sub1') { a = between(rng, 1, big ? 25 : 10); b = between(rng, 1, big ? 25 : 12); x = a + b; }
      else { b = between(rng, 1, big ? 20 : 10); x = between(rng, 1, big ? 25 : 12); a = b + x; }                    // sub2: a - [ ] = b
      const p = { level: L.level, form, a, b, x, flip };
      if (!last || last.form !== p.form || last.a !== p.a || last.b !== p.b || last.flip !== p.flip) return p;
    }
    return { level: L.level, form: 'add1', a: 1, b: 2, x: 1, flip: false };
  }
  /** How many different problems a level can deal. */
  function count(level) {
    const L = levelOf(level), big = L.level === 3, n = (lo, hi) => hi - lo + 1; let total = 0;
    for (const form of L.forms) {
      if (form === 'add1' || form === 'add2') total += n(1, big ? 25 : form === 'add2' ? 12 : 10) ** 2;
      else if (form === 'sub1') total += n(1, big ? 25 : 10) * n(1, big ? 25 : 12);
      else total += n(1, big ? 20 : 10) * n(1, big ? 25 : 12);
    }
    return total * (L.flips ? 2 : 1);
  }

  /** The equation as pieces to draw: { box: true }, { num }, { op } and { eq }. For [ ] + 5 = 7: box, +, 5, =, 7. */
  function pieces(p) {
    const box = { box: true }, plus = { op: '+' }, minus = { op: MINUS }, eq = { eq: true }, n = v => ({ num: v });
    const left = { add1: [box, plus, n(p.a)], add2: [n(p.a), plus, box], sub1: [box, minus, n(p.a)], sub2: [n(p.a), minus, box] }[p.form], right = [n(p.b)];
    return p.flip ? [...right, eq, ...left] : [...left, eq, ...right];
  }
  /** The equation as text, with [ ] for the box: "[ ] + 5 = 7". */
  const text = p => pieces(p).map(x => (x.box ? '[ ]' : x.op ? x.op : x.eq ? '=' : String(x.num))).join(' ');
  const answerOf = p => p.x;
  /** The finished statement: the equation with its answer in the box. */
  const done = p => text(p).replace('[ ]', String(p.x));
  /** The box holds n if the equation is true with n in it. (Whole numbers only.) */
  function holds(p, n) {
    if (typeof n !== 'number' || !Number.isInteger(n)) return false;
    const v = { add1: n + p.a, add2: p.a + n, sub1: n - p.a, sub2: p.a - n }[p.form]; return v === p.b;
  }
  const isCorrect = (p, n) => holds(p, n);

  /** The worked solution, a line at a time. */
  function steps(p) {
    const eq = text(p), x = p.x, out = [];
    const round = p.flip ? ' (Turned round: it means the same.)' : '';
    if (p.form === 'add1' || p.form === 'add2') {
      out.push(`${eq}: the box and ${p.a} are added to make ${p.b}.${round}`);
      out.push(`To find the box, take ${p.a} away from ${p.b}: ${p.b} ${MINUS} ${p.a} = ${x}.`);
      out.push(`Check: ${p.form === 'add1' ? `${x} + ${p.a}` : `${p.a} + ${x}`} = ${p.b}.`);
    } else if (p.form === 'sub1') {
      out.push(`${eq}: ${p.a} was taken away from the box and ${p.b} was left.${round}`);
      out.push(`To find the box, put the ${p.a} back: ${p.b} + ${p.a} = ${x}.`);
      out.push(`Check: ${x} ${MINUS} ${p.a} = ${p.b}.`);
    } else {
      out.push(`${eq}: the box was taken away from ${p.a} and ${p.b} was left.${round}`);
      out.push(`To find the box, ask how much was taken away: ${p.a} ${MINUS} ${p.b} = ${x}.`);
      out.push(`Check: ${p.a} ${MINUS} ${x} = ${p.b}.`);
    }
    return out;
  }

  return { BUILD, LEVELS, MINUS, levelOf, problem, count, pieces, text, answerOf, holds, isCorrect, steps, done };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Equations;
