/* The Polynomials wing: the maths for the Multiplication table and the Add/Subtract table. No DOM here, so all of it is unit tested in Node (tests/polys.test.js);
   poly-game.js is the screen.

   A polynomial is a list of whole-number coefficients, the constant first: [15, 8, 1] is x^2 + 8x + 15.

   Every problem has the same two-part shape, and the screen asks for both parts:
     Multiplication:   1. DISTRIBUTE. The screen draws an arch from each term of the first polynomial to each term of the second (the way students picture the distributive
                          property), and asks for each multiplication the arches stand for: one box for each product (a coefficient: the power of x is shown).
                       2. COMBINE LIKE TERMS: one box for each power of x, highest first, zeros included.
                       A cubed binomial is two rounds of this, as it is on paper: (x + 2)(x + 2) first, then that answer times the last (x + 2). Each round is a "stage".
     Subtraction:      1. Distribute the minus sign: one box for each term of the second polynomial, with its sign changed.
                       2. COMBINE LIKE TERMS.
     Addition:         COMBINE LIKE TERMS (there is nothing to distribute).

   Multiplication levels:  Easy   two binomials, like (x + 3)(x + 5); perfect squares like (x - 4)^2 come up, and so do (x + 2)(x - 2)
                           Medium a binomial and a trinomial (either way round): (x + 2)(x^2 - x + 4), (x^2 + 3)(2x^2 + x - 1)
                           Hard   a cubed binomial (x + 2)^3, or a squared trinomial (x^2 + x - 3)^2
   Add/Subtract levels:    Easy   add two polynomials, each a binomial or a trinomial
                           Medium subtract them: the minus sign has to be distributed first */
const Polys = (() => {
  const BUILD = 38; // bump together with the ?v= numbers in index.html
  const VARS = ['x', 'y', 'z', 'a', 'n', 't'];
  const MINUS = '\u2212';
  const SUP = { 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076' };

  /* ---------- polynomial arithmetic ---------- */
  const trim = p => { const q = p.slice(); while (q.length > 1 && q[q.length - 1] === 0) q.pop(); return q; };
  const degree = p => trim(p).length - 1;
  const add = (p, q) => trim(Array.from({ length: Math.max(p.length, q.length) }, (_, i) => (p[i] || 0) + (q[i] || 0)));
  const neg = p => p.map(c => (c === 0 ? 0 : -c));
  const sub = (p, q) => add(p, neg(q));
  function mul(p, q) { const r = new Array(p.length + q.length - 1).fill(0); p.forEach((a, i) => q.forEach((b, j) => { r[i + j] += a * b; })); return trim(r); }
  const equal = (p, q) => { const a = trim(p), b = trim(q); return a.length === b.length && a.every((c, i) => c === b[i]); };
  /** The nonzero terms, highest power first: [{ c, d }]. */
  const termsOf = p => p.map((c, d) => ({ c, d })).filter(t => t.c !== 0).reverse();
  const fromTerms = terms => { const p = new Array(Math.max(...terms.map(t => t.d)) + 1).fill(0); terms.forEach(t => { p[t.d] += t.c; }); return p; };

  /* ---------- text ---------- */
  const power = (v, d) => (d === 0 ? '' : d === 1 ? v : `${v}${SUP[d] || `^${d}`}`);
  /** One term's size without its sign: 5x, x, x\u00b2, 15. */
  const mag = (c, d, v) => { const m = Math.abs(c); return d === 0 ? String(m) : `${m === 1 ? '' : m}${power(v, d)}`; };
  /** A term with its sign: "5x", "\u22123x\u00b2". */
  const termText = (c, d, v) => `${c < 0 ? MINUS : ''}${mag(c, d, v)}`;
  /** x\u00b2 + 8x + 15, with a real minus sign and no zero terms. */
  function fmt(p, v) {
    const ts = termsOf(p); if (!ts.length) return '0';
    return ts.map((t, i) => (i === 0 ? termText(t.c, t.d, v) : `${t.c < 0 ? MINUS : '+'} ${mag(t.c, t.d, v)}`)).join(' ');
  }
  const paren = (p, v) => `(${fmt(p, v)})`;
  /** A term in brackets if it is negative, for the little captions: x \u00b7 (\u22123). */
  const capTerm = (t, v) => (t.c < 0 ? `(${termText(t.c, t.d, v)})` : termText(t.c, t.d, v));

  /* ---------- the random bits ---------- */
  const pick = (rng, list) => list[Math.floor(rng() * list.length)];
  const between = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const nonzero = (rng, lo, hi) => { let n = 0; while (n === 0) n = between(rng, lo, hi); return n; };
  const sameProblem = (a, b) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
  const BINOMIAL_SHAPES = [[1, 0], [2, 0], [2, 1]];

  /* ======================================================================= MULTIPLICATION ======================================================================= */
  const MUL_LEVELS = [
    { level: 1, name: 'Easy', desc: 'A binomial times a binomial, like (x + 3)(x + 5). Perfect squares too: (x \u2212 4)\u00b2', sample: '(x + 3)(x \u2212 5)', products: 4 },
    { level: 2, name: 'Medium', desc: 'A binomial and a trinomial, like (x + 2)(x\u00b2 \u2212 x + 4)', sample: '(x + 2)(x\u00b2 \u2212 x + 4)', products: 6 },
    { level: 3, name: 'Hard', desc: 'A cubed binomial like (x + 2)\u00b3, or a squared trinomial like (x\u00b2 + x \u2212 3)\u00b2', sample: '(x + 2)\u00b3', products: 8 },
  ];
  const mulLevelOf = l => MUL_LEVELS[Math.max(1, Math.min(MUL_LEVELS.length, Math.floor(Number(l)) || 1)) - 1];

  /** A multiplication problem: { kind: 'mul', level, v, factors: [poly, ...] }. A cube or a square has the same factor repeated. */
  function mulProblem(level, rng = Math.random, last = null) {
    const L = mulLevelOf(level).level;
    for (let tries = 0; tries < 60; tries++) {
      const v = pick(rng, VARS);
      let factors;
      if (L === 1) {
        const a = pick(rng, [1, 1, 1, 2, 3]), r = rng();
        const P = fromTerms([{ c: a, d: 1 }, { c: nonzero(rng, -8, 8), d: 0 }]);
        if (r < 0.3) factors = [P, P];                                                                                          // a perfect square
        else if (r < 0.4) factors = [P, fromTerms([{ c: a, d: 1 }, { c: -P[0], d: 0 }])];                                       // (ax + b)(ax - b)
        else factors = [P, fromTerms([{ c: pick(rng, [1, 1, 2, 3]), d: 1 }, { c: nonzero(rng, -8, 8), d: 0 }])];
      } else if (L === 2) {
        const shape = pick(rng, BINOMIAL_SHAPES);
        const bin = fromTerms(shape.map((d, i) => ({ c: nonzero(rng, i === 0 ? -3 : -6, i === 0 ? 3 : 6), d })));
        const tri = fromTerms([2, 1, 0].map((d, i) => ({ c: nonzero(rng, i === 0 ? -2 : -5, i === 0 ? 2 : 5), d })));
        factors = rng() < 0.5 ? [bin, tri] : [tri, bin];
      } else if (rng() < 0.5) {
        const P = fromTerms([{ c: pick(rng, [1, 1, 2]), d: 1 }, { c: nonzero(rng, -4, 4), d: 0 }]); factors = [P, P, P];          // a cubed binomial
      } else {
        const T = fromTerms([2, 1, 0].map((d, i) => ({ c: nonzero(rng, i === 0 ? -2 : -3, i === 0 ? 2 : 3), d }))); factors = [T, T];   // a squared trinomial
      }
      const p = { kind: 'mul', level: L, v, factors };
      if (!sameProblem(p, last)) return p;
    }
    return { kind: 'mul', level: L, v: VARS[0], factors: [[1, 1], [2, 1]] };
  }

  /** The problem as written: (x + 3)(x + 5), or (x + 3)\u00b2 and (x + 2)\u00b3 when one factor is repeated. */
  function mulText(p) {
    const f = p.factors, same = f.every(q => equal(q, f[0]));
    return same && f.length > 1 ? `${paren(f[0], p.v)}${SUP[f.length]}` : f.map(q => paren(q, p.v)).join('');
  }

  /** A multiplication, one distribution at a time. Two factors are one stage; a cube is two: the first two factors, then that answer times the last.
      A stage is { left, right, leftTerms, rightTerms, products, degrees, result }:
        products  one for each arch: the term i of the left polynomial times the term j of the right one, { i, j, c, d, caption } in the order i, then j
        degrees   the powers of the answer, highest first (one combine box each, zeros included)
        result    the answer to this stage, which is the left polynomial of the next */
  function mulStages(p) {
    const out = []; let left = p.factors[0];
    for (let k = 1; k < p.factors.length; k++) {
      const right = p.factors[k], lt = termsOf(left), rt = termsOf(right), products = [];
      lt.forEach((a, i) => rt.forEach((b, j) => products.push({ i, j, c: a.c * b.c, d: a.d + b.d, caption: `${capTerm(a, p.v)} \u00b7 ${capTerm(b, p.v)}` })));
      const result = mul(left, right), n = degree(left) + degree(right);
      out.push({ left, right, leftTerms: lt, rightTerms: rt, products, degrees: Array.from({ length: n + 1 }, (_, i) => n - i), result });
      left = result;
    }
    return out;
  }
  /** The product the whole problem must reach, as a polynomial. */
  const mulResult = p => p.factors.reduce((acc, q) => mul(acc, q), [1]);
  /** The correct answer to one stage, box by box. */
  const stageAnswer = st => ({ products: st.products.map(x => x.c), combined: st.degrees.map(d => st.result[d] || 0) });

  /* ======================================================================= ADD AND SUBTRACT ======================================================================= */
  const ADD_LEVELS = [
    { level: 1, name: 'Easy', desc: 'Add two polynomials, each a binomial or a trinomial. Combine like terms', sample: '(2x\u00b2 + 3x) + (x\u00b2 \u2212 5x + 4)', op: 1 },
    { level: 2, name: 'Medium', desc: 'Subtract them. Distribute the minus sign first, then combine like terms', sample: '(3x\u00b2 + 2x) \u2212 (x\u00b2 \u2212 5x + 4)', op: -1 },
  ];
  const addLevelOf = l => ADD_LEVELS[Math.max(1, Math.min(ADD_LEVELS.length, Math.floor(Number(l)) || 1)) - 1];

  /** A polynomial of up to degree 2 with 2 or 3 terms (a binomial or a trinomial), for adding and subtracting. */
  function randomPoly(rng) {
    const powers = rng() < 0.5 ? [2, 1, 0] : pick(rng, BINOMIAL_SHAPES);
    return fromTerms(powers.map(d => ({ c: nonzero(rng, -9, 9), d })));
  }
  /** An add/subtract problem: { kind: 'add', level, v, op: +1 or -1, P, Q }. At least one power appears in both, so there is always something to combine. */
  function addProblem(level, rng = Math.random, last = null) {
    const L = addLevelOf(level);
    for (let tries = 0; tries < 80; tries++) {
      const P = randomPoly(rng), Q = randomPoly(rng), shared = termsOf(P).some(t => Q[t.d]);
      if (!shared) continue;
      const p = { kind: 'add', level: L.level, v: pick(rng, VARS), op: L.op, P, Q };
      if (!sameProblem(p, last)) return p;
    }
    return { kind: 'add', level: L.level, v: VARS[0], op: L.op, P: [1, 1], Q: [2, 1] };
  }
  const addText = p => `${paren(p.P, p.v)} ${p.op > 0 ? '+' : MINUS} ${paren(p.Q, p.v)}`;
  const addResult = p => (p.op > 0 ? add(p.P, p.Q) : sub(p.P, p.Q));
  /** Step 1 (subtraction only): the terms of the second polynomial with their signs changed, highest power first. */
  const addDistributed = p => (p.op < 0 ? termsOf(p.Q).map(t => ({ c: -t.c, d: t.d })) : []);
  /** Step 2's boxes: every power from the highest in either polynomial down to the constant. */
  const addDegrees = p => { const n = Math.max(degree(p.P), degree(p.Q)); return Array.from({ length: n + 1 }, (_, i) => n - i); };
  function addAnswer(p) { const res = addResult(p); return { distributed: addDistributed(p).map(t => t.c), combined: addDegrees(p).map(d => res[d] || 0) }; }

  /* ======================================================================= CHECKING ======================================================================= */
  const whole = n => typeof n === 'number' && Number.isInteger(n);
  /** Compare a list of typed numbers with the right list: which are right. Anything that is not a whole number, or a list of the wrong length, is wrong. */
  const markList = (want, got) => want.map((w, i) => Array.isArray(got) && whole(got[i]) && got[i] === w);
  /** Check one stage: which product boxes and which combine boxes are right. */
  function checkStage(st, ans) { const w = stageAnswer(st), a = ans || {}, products = markList(w.products, a.products), combined = markList(w.combined, a.combined); return { ok: products.every(Boolean) && combined.every(Boolean), products, combined }; }
  function checkAdd(p, ans) {
    const w = addAnswer(p), a = ans || {}, distributed = markList(w.distributed, a.distributed), combined = markList(w.combined, a.combined);
    return { ok: distributed.every(Boolean) && combined.every(Boolean), distributed, combined };
  }

  /* ======================================================================= WORKED SOLUTIONS ======================================================================= */
  /** "x\u00b2 + 8x + 15" from a list of coefficients over the given powers. */
  const fromList = (coefs, degs, v) => fmt(fromTerms(degs.map((d, i) => ({ c: coefs[i], d }))), v);
  function mulSteps(p) {
    const v = p.v, out = [], stages = mulStages(p), two = stages.length > 1;
    stages.forEach((st, k) => {
      const lead = two ? (k === 0 ? 'First, multiply the first two factors' : `Now multiply that answer by the last factor, ${paren(p.factors[p.factors.length - 1], v)}`) : 'Multiply every term of the first polynomial by every term of the second';
      const what = two ? `${paren(st.left, v)}${paren(st.right, v)}` : '';
      out.push(`${lead}${what ? `: ${what}` : ''} (${st.products.length} products): ${st.products.map(x => `${x.caption} = ${termText(x.c, x.d, v)}`).join(', ')}.`);
      const like = st.degrees.map(d => ({ d, items: st.products.filter(x => x.d === d) })).filter(g => g.items.length > 1)
        .map(g => `${power(v, g.d) || 'the numbers'}: ${g.items.map(x => (x.c < 0 ? `(${MINUS}${Math.abs(x.c)})` : x.c)).join(' + ')} = ${st.result[g.d] < 0 ? MINUS + Math.abs(st.result[g.d]) : st.result[g.d]}`);
      out.push(`Combine like terms (terms with the same power of ${v}): ${like.length ? like.join('; ') : 'there are none to combine'}${two ? `, so ${fmt(st.result, v)}` : ''}.`);
    });
    out.push(`So ${mulText(p)} = ${fmt(mulResult(p), v)}.`);
    return out;
  }
  function addSteps(p) {
    const v = p.v, out = [], res = addResult(p), degs = addDegrees(p), dist = addDistributed(p);
    if (p.op < 0) out.push(`Distribute the minus sign: change the sign of every term in ${paren(p.Q, v)}, so ${MINUS}${paren(p.Q, v)} = ${fmt(fromTerms(dist), v)}.`);
    const parts = degs.map(d => {
      const shown = (p.op < 0 ? [p.P[d] || 0, -(p.Q[d] || 0)] : [p.P[d] || 0, p.Q[d] || 0]).filter(c => c !== 0);
      return `${power(v, d) || 'numbers'}: ${shown.length ? shown.map(c => (c < 0 ? `(${MINUS}${Math.abs(c)})` : c)).join(' + ') : '0'} = ${res[d] < 0 ? MINUS + Math.abs(res[d] || 0) : (res[d] || 0)}`;
    });
    out.push(`Combine like terms: ${parts.join('; ')}.`);
    out.push(`So ${addText(p)} = ${fmt(res, v)}.`);
    return out;
  }

  return {
    BUILD, VARS, MINUS, MUL_LEVELS, ADD_LEVELS, mulLevelOf, addLevelOf,
    trim, degree, add, sub, neg, mul, equal, termsOf, fromTerms, fmt, paren, termText, power,
    mulProblem, mulText, mulResult, mulStages, stageAnswer, checkStage, mulSteps,
    addProblem, addText, addResult, addDistributed, addDegrees, addAnswer, checkAdd, addSteps,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Polys;
