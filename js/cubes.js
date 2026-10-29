/* The Cubes Table: factor a sum or a difference of cubes. No DOM here, so it is all unit tested in Node (tests/cubes.test.js). cubes-game.js is the interface.

     a^3 + b^3 = (a + b)(a^2 - ab + b^2)         a^3 - b^3 = (a - b)(a^2 + ab + b^2)         (the signs go "Same, Opposite, Always Positive")

   Easy:   v^3 + c^3  or  v^3 - c^3         for example  x^3 + 27 = (x + 3)(x^2 - 3x + 9)
   Medium: the same with a GCF to take out first: g(v^3 +- c^3) for example  2x^3 + 16 = 2(x + 2)(x^2 - 2x + 4)

   The answer always has the shape   g (v s1 a)(v^2 s2 b v + c)   where g is the GCF (1 on Easy, so it is not asked for), s1 and s2 are signs, and a, b, c are whole
   numbers. For these problems that form is the only one that works, so a problem has exactly one correct answer. */
const Cubes = (() => {
  const BUILD = 39; // bump together with the ?v= numbers in index.html
  const LEVELS = [
    { level: 1, name: 'Easy', c: [1, 2, 3, 4, 5, 6, 7, 8], g: [1], sample: 'x\u00b3 + 27', desc: 'A sum or a difference of cubes, like x\u00b3 + 27' },
    { level: 2, name: 'Medium', c: [1, 2, 3, 4, 5, 6], g: [2, 3, 4, 5, 6], sample: '2x\u00b3 + 16', desc: 'Take out the GCF first, then factor, like 2x\u00b3 + 16' },
  ];
  const VARS = ['x', 'y', 'z', 'a', 'n', 't'];
  const MINUS = '\u2212';

  const levelOf = l => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(Number(l)) || 1)) - 1];
  /** How many different problems a level can deal. */
  const count = level => { const L = levelOf(level); return L.c.length * L.g.length * 2 * VARS.length; };

  /** A problem: { level, v: the variable, g: the GCF, c: the number that is cubed, sign: +1 for a sum of cubes, -1 for a difference }. `last` is skipped, so the same one never comes twice in a row. */
  function problem(level, rng = Math.random, last = null) {
    const L = levelOf(level), pick = list => list[Math.floor(rng() * list.length)];
    for (let tries = 0; tries < 50; tries++) {
      const p = { level: L.level, v: pick(VARS), g: pick(L.g), c: pick(L.c), sign: rng() < 0.5 ? 1 : -1 };
      if (!last || last.v !== p.v || last.g !== p.g || last.c !== p.c || last.sign !== p.sign) return p;
    }
    return { level: L.level, v: VARS[0], g: L.g[0], c: L.c[0], sign: 1 };
  }

  const sup = n => (n === 3 ? '\u00b3' : n === 2 ? '\u00b2' : '');
  const signChar = s => (s < 0 ? MINUS : '+');

  /** The polynomial you are given, as text: "2x\u00b3 + 16". */
  const polyText = p => `${p.g === 1 ? '' : p.g}${p.v}${sup(3)} ${signChar(p.sign)} ${p.g * p.c ** 3}`;
  /** The same as plain ASCII (for tests and for anything that cannot show the superscripts). */
  const polyAscii = p => `${p.g === 1 ? '' : p.g}${p.v}^3 ${p.sign < 0 ? '-' : '+'} ${p.g * p.c ** 3}`;

  /** The correct answer, box by box: g, then (v s1 a)(v^2 s2 b v + c). */
  function answerOf(p) {
    return { g: p.g, s1: p.sign, a: p.c, s2: -p.sign, b: p.c, c: p.c * p.c };
  }
  /** The answer as text: "2(x + 2)(x\u00b2 \u2212 2x + 4)". */
  function answerText(p) {
    const a = answerOf(p);
    return `${a.g === 1 ? '' : a.g}(${p.v} ${signChar(a.s1)} ${a.a})(${p.v}${sup(2)} ${signChar(a.s2)} ${a.b === 1 ? '' : a.b}${p.v} + ${a.c})`;
  }

  /** Multiply g(v + s1*a)(v^2 + s2*b*v + c) out: the coefficients of v^3, v^2, v and the number, as [c3, c2, c1, c0]. */
  function expand(ans) {
    const g = ans.g, p = ans.s1 * ans.a, q = ans.s2 * ans.b, r = ans.c;
    return [g, g * (q + p), g * (r + p * q), g * p * r];
  }
  /** The coefficients of the polynomial in the problem. */
  const polyCoeffs = p => [p.g, 0, 0, p.sign * p.g * p.c ** 3];

  const whole = n => Number.isInteger(n) && n >= 0;
  const validAnswer = a => !!a && (a.s1 === 1 || a.s1 === -1) && (a.s2 === 1 || a.s2 === -1) && whole(a.g) && whole(a.a) && whole(a.b) && whole(a.c);
  /** Is the answer right? It is, exactly when it multiplies out to the polynomial. */
  function isCorrect(p, ans) {
    if (!validAnswer(ans) || ans.g < 1) return false;
    const got = expand(ans), want = polyCoeffs(p);
    return got.every((v, i) => v === want[i]);
  }
  /** Which boxes are right, so the screen can mark them: { g, s1, a, s2, b, c } of true/false. A box is right if it holds what the correct answer holds there. */
  function boxesOk(p, ans) {
    const want = answerOf(p), out = {};
    for (const k of ['g', 's1', 'a', 's2', 'b', 'c']) out[k] = !!ans && ans[k] === want[k];
    return out;
  }

  /** The worked solution, a line at a time. */
  function steps(p) {
    const a = answerOf(p), v = p.v, sum = p.sign > 0, word = sum ? 'sum' : 'difference', cube = p.c ** 3, out = [];
    if (p.g !== 1) {
      out.push(`Take out the GCF first: ${polyText(p)} = ${p.g}(${v}${sup(3)} ${signChar(p.sign)} ${cube}).`);
    }
    out.push(`${v}${sup(3)} ${signChar(p.sign)} ${cube} is a ${word} of cubes: ${cube} = ${p.c}${sup(3)}, so a = ${v} and b = ${p.c}.`);
    out.push(sum ? 'Sum of cubes: a\u00b3 + b\u00b3 = (a + b)(a\u00b2 \u2212 ab + b\u00b2).' : 'Difference of cubes: a\u00b3 \u2212 b\u00b3 = (a \u2212 b)(a\u00b2 + ab + b\u00b2).');
    out.push(`Same, Opposite, Always positive: ${sum ? 'the sign in the first factor is the same (+), in the middle it is the opposite (\u2212)' : 'the sign in the first factor is the same (\u2212), in the middle it is the opposite (+)'}, and the last term is always +.`);
    out.push(`So ${p.g === 1 ? '' : `${p.g}(${v}${sup(3)} ${signChar(p.sign)} ${cube}) = `}${answerText(p)}. (The last term is b\u00b2 = ${p.c}\u00b2 = ${a.c}.)`);
    return out;
  }

  return { BUILD, LEVELS, VARS, MINUS, levelOf, count, problem, polyText, polyAscii, answerOf, answerText, expand, polyCoeffs, isCorrect, boxesOk, validAnswer, steps };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Cubes;
