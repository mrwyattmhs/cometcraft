/* Pure logic for the parabola table (no DOM, no THREE, unit tested in Node).

   Given y = ax² + bx + c the student finds, in order:
     1. the axis of symmetry   x = -b / (2a)
     2. the vertex             (x, y)   with that x plugged back into the polynomial
     3. the y-intercept        (0, c)
   and the graph on the right is sketched from their answers as they go.

   Problems are built from vertex form, y = a(x - h)² + k, so the axis, vertex and
   intercept are always whole numbers:  b = -2ah,  c = ah² + k.

   The same problems are shown two ways: standard form (parabola table) and vertex form
   (vertex table). Only the display, the vertex check, and the worked steps differ. */
const Parabolas = (() => {
  const BUILD = 9; // bump together with parabola-game.js and the ?v= numbers in index.html
  const T = typeof Trinomials !== 'undefined' ? Trinomials : require('./trinomials.js');

  /* ---------- the one wager ---------- */
  const WAGER = 50;
  const MULT = 2;
  const payout = () => WAGER * MULT;

  /* ---------- problems ---------- */
  const A_VALUES = [-3, -2, -1, 1, 2, 3];
  const H_RANGE = 4;   // axis is -4..4, never 0 (so b is never 0)
  const K_RANGE = 9;   // vertex height is -9..9
  const C_MAX = 15;    // keeps the y-intercept inside the number palette

  const fOf = (p, x) => p.a * x * x + p.b * x + p.c;

  /** Every (a, h, k) the table can deal. */
  function candidates() {
    const out = [];
    A_VALUES.forEach(a => {
      for (let h = -H_RANGE; h <= H_RANGE; h++) {
        if (h === 0) continue;
        for (let k = -K_RANGE; k <= K_RANGE; k++) {
          const c = a * h * h + k;
          if (Math.abs(c) <= C_MAX) out.push({ a, h, k, b: -2 * a * h, c });
        }
      }
    });
    return out;
  }
  const ALL = candidates();

  function generate(rng = Math.random) {
    return { ...ALL[Math.floor(rng() * ALL.length)] };
  }

  /** Block palette for the number tiles: -15..15. */
  const PALETTE_MAX = 15;

  /* ---------- formatting ---------- */
  const par = n => (n < 0 ? `(${n})` : `${n}`);
  function fmtPoly(p) {
    const terms = [T.term(p.a, 2), T.term(p.b, 1), T.term(p.c, 0)].filter(t => t.k !== 0);
    return `y = ${T.fmtTerms(terms)}`;
  }

  /* ---------- checking ---------- */
  /** s = { axis, vy, yint }. Each check is judged on the student's own work:
        axis:   x = -b / 2a
        vertex: their y really is f(their axis)
        yint:   the y-intercept is c */
  function check(p, s) {
    const axis = s.axis === p.h;
    const vertex = s.vy === fOf(p, s.axis);
    const yint = s.yint === p.c;
    return { axis, vertex, yint, ok: axis && vertex && yint };
  }

  function solution(p) {
    return {
      axis: p.h, vertex: [p.h, p.k], yint: [0, p.c],
      lines: [
        `x = -b / (2a) = -${par(p.b)} / (2 · ${par(p.a)}) = ${p.h}`,
        `y = a·x² + b·x + c = ${par(p.a)}·${par(p.h)}² + ${par(p.b)}·${par(p.h)} + ${par(p.c)} = ${p.k}`,
        `At x = 0 the y-value is just c, so the y-intercept is (0, ${p.c}).`,
      ],
    };
  }

  /* ---------- vertex form ---------- */
  /** y = 2(x + 3)² - 1. Signs are written the way a student would read them: h = -3 shows as (x + 3). */
  function fmtVertexForm(p) {
    const coef = p.a === 1 ? '' : p.a === -1 ? '-' : String(p.a);
    const inside = p.h < 0 ? `x + ${-p.h}` : `x - ${p.h}`;
    const tail = p.k === 0 ? '' : p.k > 0 ? ` + ${p.k}` : ` - ${-p.k}`;
    return `y = ${coef}(${inside})²${tail}`;
  }

  /** In vertex form the vertex's y-value is read straight off as k, whatever axis the student chose.
      (The standard-form table instead checks y against the polynomial at their x.) */
  function checkVertexForm(p, s) {
    const axis = s.axis === p.h;
    const vertex = s.vy === p.k;
    const yint = s.yint === p.c;
    return { axis, vertex, yint, ok: axis && vertex && yint };
  }

  function solutionVertexForm(p) {
    const inside = p.h < 0 ? `x + ${-p.h}` : `x - ${p.h}`;
    return {
      axis: p.h, vertex: [p.h, p.k], yint: [0, p.c],
      lines: [
        `(${inside}) means h = ${p.h}, so the axis of symmetry is x = ${p.h}`,
        `The vertex is (h, k) = (${p.h}, ${p.k})`,
        `y = a(0 - h)² + k = ${par(p.a)}·(0 - ${par(p.h)})² + ${par(p.k)} = ${p.c}, so the y-intercept is (0, ${p.c})`,
      ],
    };
  }

  /* ---------- the graph ---------- */
  /** A window that always contains the vertex, the intercept, and the mirror point. */
  function view(p) {
    const xmin = -9, xmax = 9;
    let ymin = Math.floor(Math.min(p.k, p.c, 0)) - 2;
    let ymax = Math.ceil(Math.max(p.k, p.c, 0)) + 2;
    const span = ymax - ymin;
    if (span < 12) { const pad = (12 - span) / 2; ymin -= Math.floor(pad); ymax += Math.ceil(pad); }
    return { xmin, xmax, ymin, ymax };
  }

  /** y = a(x - h)² + k sampled across [xmin, xmax]. */
  function curve(a, h, k, xmin, xmax, step = 0.1) {
    const pts = [];
    for (let x = xmin; x <= xmax + 1e-9; x += step) pts.push([x, a * (x - h) * (x - h) + k]);
    return pts;
  }

  return {
    BUILD, WAGER, MULT, payout, PALETTE_MAX,
    candidates, generate, fOf, fmtPoly, check, solution, view, curve,
    fmtVertexForm, checkVertexForm, solutionVertexForm,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Parabolas;
