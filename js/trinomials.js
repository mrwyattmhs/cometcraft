/* Pure logic for the trinomial table (no DOM, no THREE, unit tested in Node).

   Method: "split the middle" (the AC method)
     ax² + bx + c
     1. find m, n with m·n = a·c and m + n = b
     2. rewrite as ax² + mx + nx + c
     3. pull the GCF out of each pair:   g1(inside) + g2(inside)
     4. the two insides match, so the answer is (g1 + g2)(inside)

   Terms are {k, e}: coefficient k, power of x e (0, 1 or 2).
   Polynomials are coefficient arrays [c0, c1, c2, c3]. */
const Trinomials = (() => {
  const BUILD = 16; // bump together with trinomial-game.js and the ?v= numbers in index.html
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const term = (k, e) => ({ k, e });

  /* ---------- wager tiers: a bigger bet deals a bigger a·c ---------- */
  // aMin..aMax: allowed leading coefficient.  pMax: largest p or r in (px + q)(rx + s).
  // qMax: largest |q| or |s|.  R: largest |m| or |n| (the split numbers), which is also
  // how far the number palette has to reach.  acMin..acMax: band for |a·c|.
  const TIERS = [
    { bet: 10,  mult: 1,   desc: 'x² + bx + c',                   aMin: 1, aMax: 1,  pMax: 1, qMax: 6,  R: 6,  acMin: 4,   acMax: 36 },
    { bet: 25,  mult: 1.5, desc: 'x² + bx + c, bigger numbers',   aMin: 1, aMax: 1,  pMax: 1, qMax: 12, R: 12, acMin: 40,  acMax: 120 },
    { bet: 50,  mult: 2,   desc: 'ax² + bx + c',                  aMin: 2, aMax: 16, pMax: 4, qMax: 8,  R: 16, acMin: 60,  acMax: 200 },
    { bet: 100, mult: 3,   desc: 'ax² + bx + c, bigger numbers',  aMin: 4, aMax: 16, pMax: 4, qMax: 9,  R: 24, acMin: 150, acMax: 400 },
  ];
  const tierFor = bet => TIERS.find(t => t.bet === bet) || TIERS[0];

  // Built from (px + q)(rx + s) with primitive binomials, so every problem has a clean
  // answer and the trinomial itself has no common factor.
  function generate(bet, rng = Math.random) {
    const t = tierFor(bet);
    const pick = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    const nonzero = lim => { let v = 0; while (v === 0) v = pick(-lim, lim); return v; };
    for (let attempt = 0; attempt < 50000; attempt++) {
      const p = pick(1, t.pMax), r = pick(1, t.pMax);
      const a = p * r;
      if (a < t.aMin || a > t.aMax) continue;
      const q = nonzero(t.qMax), s = nonzero(t.qMax);
      if (gcd(p, q) !== 1 || gcd(r, s) !== 1) continue;
      if (Math.abs(p * s) > t.R || Math.abs(q * r) > t.R) continue;
      const b = p * s + q * r, c = q * s;
      if (b === 0) continue;
      const ac = Math.abs(a * c);
      if (ac < t.acMin || ac > t.acMax) continue;
      return { bet: t.bet, p, q, r, s, a, b, c };
    }
    throw new Error(`could not generate a trinomial for a ${bet} chip wager`);
  }

  /** Largest block magnitudes the palette must offer for a wager. */
  const palette = bet => ({ xMax: 4, constMax: tierFor(bet).R });

  /** Harder wagers also pay a better multiplier. */
  const multiplier = bet => tierFor(bet).mult;
  const payout = bet => Math.round(bet * multiplier(bet));

  /* ---------- formatting ---------- */
  const SUP = { 0: '', 1: 'x', 2: 'x²' };
  const body = (k, e) => (e === 0 ? String(Math.abs(k)) : (Math.abs(k) === 1 ? '' : String(Math.abs(k))) + SUP[e]);

  /** Each term as text with its joining sign: [6x², -3x, 2] -> ["6x²", " - 3x", " + 2"]. {ph:'?x'} is a placeholder. */
  function termParts(terms) {
    return terms.map((t, i) => {
      const neg = !t.ph && t.k < 0;
      const text = t.ph || body(t.k, t.e);
      return i === 0 ? (neg ? '-' : '') + text : (neg ? ' - ' : ' + ') + text;
    });
  }
  /** Join terms with proper signs: [6x², -3x, 2] -> "6x² - 3x + 2" */
  const fmtTerms = terms => termParts(terms).join('');
  const fmtBlock = t => (t.k < 0 ? '-' : '') + body(t.k, t.e);
  const fmtTrinomial = p => fmtTerms([term(p.a, 2), term(p.b, 1), term(p.c, 0)]);

  /** g(inside) with a leading sign when it is not the first group. */
  function fmtGroup(g, inside, first) {
    const lead = first ? (g.k < 0 ? '-' : '') : (g.k < 0 ? ' - ' : ' + ');
    return `${lead}${body(g.k, g.e)}(${fmtTerms(inside)})`;
  }

  /* ---------- algebra ---------- */
  const poly = terms => {
    const c = [0, 0, 0, 0];
    terms.forEach(t => { if (t) c[t.e] += t.k; });
    return c;
  };
  const mul = (a, b) => {
    const out = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if (!a[i] || !b[j]) continue;
      if (i + j > 3) return null;
      out[i + j] += a[i] * b[j];
    }
    return out;
  };
  const same = (a, b) => !!a && !!b && a.every((v, i) => v === b[i]);

  /** The three checks, in the student's own terms.
      slots = [m1, m2, g1, in1a, in1b, g2, in2a, in2b] (all {k,e}). */
  function check(pr, slots) {
    const [m1, m2, g1, i1a, i1b, g2, i2a, i2b] = slots;
    const { a, b, c } = pr;
    const split = m1.e === 0 && m2.e === 0 && m1.k * m2.k === a * c && m1.k + m2.k === b;
    const group1 = [0, m1.k, a, 0];            // ax² + m1·x
    const group2 = [c, m2.k, 0, 0];            // m2·x + c
    const in1 = poly([i1a, i1b]), in2 = poly([i2a, i2b]);
    const pull = same(mul(poly([g1]), in1), group1) && same(mul(poly([g2]), in2), group2);
    const match = same(in1, in2);
    return { split, pull, match, ok: split && pull && match };
  }

  /** Worked solution for the student's order of the split (m1k). */
  function solution(pr, m1k) {
    const { p, q, r, s, a, c } = pr;
    let m1, m2, g1, g2, inside;
    if (m1k === q * r && m1k !== p * s) {
      m1 = q * r; m2 = p * s; g1 = term(r, 1); g2 = term(s, 0); inside = [term(p, 1), term(q, 0)];
    } else {
      m1 = p * s; m2 = q * r; g1 = term(p, 1); g2 = term(q, 0); inside = [term(r, 1), term(s, 0)];
    }
    const final = `(${fmtTerms([g1, g2])})(${fmtTerms(inside)})`;
    return {
      m1, m2, g1, g2, inside, final,
      slots: [term(m1, 0), term(m2, 0), g1, ...inside, g2, ...inside],
      lines: [
        fmtTrinomial(pr),
        fmtTerms([term(a, 2), term(m1, 1), term(m2, 1), term(c, 0)]),
        fmtGroup(g1, inside, true) + fmtGroup(g2, inside, false),
        final,
      ],
    };
  }

  return {
    BUILD, gcd, term, TIERS, tierFor, generate, palette, multiplier, payout,
    termParts, fmtTerms, fmtBlock, fmtTrinomial, poly, mul, check, solution,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Trinomials;
