/* The Lines table's logic: make a line to graph, say it in one of three forms, and check what the student clicks. No DOM, so it is
   unit tested in Node (tests/lines.test.js). The screen is lines-game.js.

   Three forms, and what each one asks for (always two points, so the line is determined):
     slope-intercept   y = mx + b             click the y-intercept (0, b), then count the slope to plot one more point
     point-slope       y - y1 = m(x - x1)     click (x1, y1), then count the slope to plot one more point
     standard form     Ax + By = C            divide C by A for the x-intercept, then C by B for the y-intercept, and click each
   The plane runs from -10 to 10 each way, and every point is a whole-number point. Counting the slope m = p/q means going q across
   and p up (or the opposite way: q back and p down). Any other point on the line is accepted too. */
const Lines = (() => {
  const BUILD = 36; // bump together with the ?v= numbers in index.html
  const E = typeof Economy !== 'undefined' ? Economy : require('./economy.js');
  const GRID = 10;
  const PAY = E.PAY.lines;                   // chips for every line, whatever the form
  const MISTAKES_ALLOWED = 1;                // a second wrong click on a step shows the answer (and that line does not pay)
  const MINUS = '\u2212';
  const FORMS = [
    { id: 'slope', name: 'Slope-intercept', form: 'y = mx + b', blurb: 'Click the y-intercept, then count the slope.' },
    { id: 'point', name: 'Point-slope', form: 'y \u2212 y\u2081 = m(x \u2212 x\u2081)', blurb: 'Click the point, then count the slope.' },
    { id: 'standard', name: 'Standard form', form: 'Ax + By = C', blurb: 'Divide to find both intercepts, then click them.' },
  ];
  const formById = id => FORMS.find(f => f.id === id) || null;

  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
  const inGrid = (x, y) => Number.isInteger(x) && Number.isInteger(y) && Math.abs(x) <= GRID && Math.abs(y) <= GRID;
  const num = n => (n < 0 ? MINUS + -n : String(n));            // -3 with a real minus sign
  const pt = (x, y) => `(${num(x)}, ${num(y)})`;

  /* ---------- saying a line ---------- */
  /** m as it appears in front of x or of a bracket: 2, -3, (2/3), -(3/2); a slope of 1 or -1 is just "" or "-". */
  function slopeCoef({ p, q }) {
    const neg = p < 0 ? MINUS : '', a = Math.abs(p);
    return q === 1 ? (a === 1 ? neg : neg + a) : `${neg}(${a}/${q})`;
  }
  /** m as a number: 2, -3, 2/3, -3/2. */
  const slopeValue = ({ p, q }) => (q === 1 ? num(p) : `${p < 0 ? MINUS : ''}${Math.abs(p)}/${q}`);
  /** "up 2 and right 3", "down 3 and right 2". */
  const countText = ({ p, q }) => `${p > 0 ? 'up' : 'down'} ${Math.abs(p)} and right ${q}`;

  function equation(pr) {
    if (pr.form === 'slope') return `y = ${slopeCoef(pr.m)}x ${pr.b < 0 ? MINUS : '+'} ${Math.abs(pr.b)}`;
    if (pr.form === 'point') return `y ${pr.y1 < 0 ? '+' : MINUS} ${Math.abs(pr.y1)} = ${slopeCoef(pr.m)}(x ${pr.x1 < 0 ? '+' : MINUS} ${Math.abs(pr.x1)})`;
    const A = pr.A === 1 ? '' : pr.A, B = Math.abs(pr.B) === 1 ? '' : Math.abs(pr.B);
    return `${A}x ${pr.B < 0 ? MINUS : '+'} ${B}y = ${num(pr.C)}`;
  }

  /* ---------- the problems ---------- */
  const SLOPES = [];
  for (let q = 1; q <= 4; q++) for (const p of [-4, -3, -2, -1, 1, 2, 3, 4]) if (gcd(p, q) === 1) SLOPES.push({ p, q });
  /** The whole-number points one count of the slope away from (x, y), in either direction, that are on the plane. */
  const neighbours = (x, y, m) => [[x + m.q, y + m.p], [x - m.q, y - m.p]].filter(([a, b]) => inGrid(a, b));
  const NONZERO = n => n !== 0;
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  const cache = {};
  /** Every problem there is for a form (so the tests can go through all of them, and the game picks one at random). */
  function candidates(form) {
    if (cache[form]) return cache[form];
    const out = [];
    if (form === 'slope') {
      SLOPES.forEach(m => range(-8, 8).filter(NONZERO).forEach(b => { if (neighbours(0, b, m).length) out.push({ form, m, b }); }));
    } else if (form === 'point') {
      SLOPES.forEach(m => range(-7, 7).filter(NONZERO).forEach(x1 => range(-7, 7).filter(NONZERO).forEach(y1 => { if (neighbours(x1, y1, m).length) out.push({ form, m, x1, y1 }); })));
    } else if (form === 'standard') {
      for (let A = 1; A <= 6; A++) for (const B of [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]) for (const k of [-3, -2, -1, 1, 2, 3]) {
        const C = lcm(A, Math.abs(B)) * k;                                   // C divides evenly by A and by B: both intercepts are whole numbers
        if (gcd(gcd(A, Math.abs(B)), Math.abs(C)) !== 1) continue;           // and the equation is in lowest terms
        if (Math.abs(C / A) <= GRID && Math.abs(C / B) <= GRID) out.push({ form, A, B, C });
      }
    }
    return (cache[form] = out.map(build));
  }

  /** Fill in a problem: its equation, the steps the student does, and the two points that make its line. */
  function build(pr) {
    const f = { ...pr };
    f.eq = equation(f);
    if (f.form === 'slope') {
      const ans = neighbours(0, f.b, f.m)[0];
      f.points = [[0, f.b], ans];
      f.steps = [
        { kind: 'point', title: 'Plot the y-intercept', target: [0, f.b],
          prompt: 'In y = mx + b, the b is where the line crosses the y-axis. Click that point.',
          hint: 'The y-intercept is on the y-axis, where x = 0. It is the b in y = mx + b.',
          done: `Yes! The y-intercept is ${pt(0, f.b)}.` },
      ];
    } else if (f.form === 'point') {
      const ans = neighbours(f.x1, f.y1, f.m)[0];
      f.points = [[f.x1, f.y1], ans];
      f.steps = [
        { kind: 'point', title: 'Plot (x\u2081, y\u2081)', target: [f.x1, f.y1],
          prompt: 'Read the point from y \u2212 y\u2081 = m(x \u2212 x\u2081). Click (x\u2081, y\u2081).',
          hint: 'Careful with the signs: (x + 3) means x\u2081 is \u22123, and y + 2 means y\u2081 is \u22122.',
          done: `Yes! The point is ${pt(f.x1, f.y1)}.` },
      ];
    } else {
      f.points = [[f.C / f.A, 0], [0, f.C / f.B]];
      f.steps = [
        { kind: 'point', title: 'Find the x-intercept', target: [f.C / f.A, 0],
          prompt: `Set y = 0, so ${f.A === 1 ? '' : f.A}x = ${num(f.C)}. Divide C by A: ${num(f.C)} \u00f7 ${f.A}. Click that point on the x-axis.`,
          hint: `The x-intercept is on the x-axis (y = 0). Divide C by A: ${num(f.C)} \u00f7 ${f.A}.`,
          done: `${num(f.C)} \u00f7 ${f.A} = ${num(f.C / f.A)}, so the x-intercept is ${pt(f.C / f.A, 0)}.` },
        { kind: 'point', title: 'Find the y-intercept', target: [0, f.C / f.B],
          prompt: `Set x = 0, so ${Math.abs(f.B) === 1 ? (f.B < 0 ? MINUS : '') : num(f.B)}y = ${num(f.C)}. Divide C by B: ${num(f.C)} \u00f7 ${num(f.B)}. Click that point on the y-axis.`,
          hint: `The y-intercept is on the y-axis (x = 0). Divide C by B: ${num(f.C)} \u00f7 ${num(f.B)}.`,
          done: `${num(f.C)} \u00f7 ${num(f.B)} = ${num(f.C / f.B)}, so the y-intercept is ${pt(0, f.C / f.B)}.` },
      ];
    }
    if (f.form !== 'standard') {
      f.steps.push({
        kind: 'slope', from: 0, title: 'Count the slope', p: f.m.p, q: f.m.q, target: f.points[1],
        prompt: `The slope is m = ${slopeValue(f.m)}: rise ${num(f.m.p)}, run ${f.m.q}. From your first point count ${countText(f.m)}, and click there.`,
        hint: `Slope ${slopeValue(f.m)} means rise ${num(f.m.p)} over run ${f.m.q}: from your first point, go ${countText(f.m)}.`,
      });
    }
    return f;
  }

  /** A problem for a form, at random. rng returns 0 up to 1. */
  function generate(form, rng = Math.random) {
    const list = candidates(form);
    return list.length ? list[Math.floor(rng() * list.length)] : null;
  }

  /* ---------- checking a click ---------- */
  /** Is a click right for step i? placed holds the points plotted so far ({x, y} each). Returns { ok, say } when right and { ok, hint } when not. */
  function check(pr, i, placed, x, y) {
    const st = pr.steps[i];
    if (!inGrid(x, y)) return { ok: false, hint: 'Click a point on the grid.' };
    if (st.kind === 'point') {
      return x === st.target[0] && y === st.target[1] ? { ok: true, say: st.done } : { ok: false, hint: st.hint };
    }
    const from = placed[st.from];
    if (x === from.x && y === from.y) return { ok: false, hint: `That is the point you already plotted. Count the slope from it: ${countText(pr.m)}.` };
    if ((y - from.y) * st.q !== st.p * (x - from.x)) return { ok: false, hint: st.hint };
    const one = (x === from.x + st.q && y === from.y + st.p) || (x === from.x - st.q && y === from.y - st.p);
    return { ok: true, count: one, say: one ? `Yes! Counting ${countText(pr.m)} lands on ${pt(x, y)}.` : `Yes! ${pt(x, y)} is on the line too.` };
  }

  /** The answer to show for step i, if the student is stuck. */
  function answer(pr, i, placed) {
    const st = pr.steps[i];
    if (st.kind === 'point') return st.target;
    const from = placed[st.from];
    return neighbours(from.x, from.y, pr.m)[0];
  }

  /** What was done, in words, for the end of the problem. */
  function explain(pr) {
    if (pr.form === 'slope') return [`The y-intercept is b = ${num(pr.b)}, so the line crosses the y-axis at ${pt(0, pr.b)}.`, `The slope is ${slopeValue(pr.m)}: from there, ${countText(pr.m)}.`];
    if (pr.form === 'point') return [`The point is ${pt(pr.x1, pr.y1)}.`, `The slope is ${slopeValue(pr.m)}: from there, ${countText(pr.m)}.`];
    return [`x-intercept: ${num(pr.C)} \u00f7 ${pr.A} = ${num(pr.C / pr.A)}, the point ${pt(pr.C / pr.A, 0)}.`, `y-intercept: ${num(pr.C)} \u00f7 ${num(pr.B)} = ${num(pr.C / pr.B)}, the point ${pt(0, pr.C / pr.B)}.`];
  }

  /** The two ends of the line through two points, where it meets the edge of the plane (to draw it all the way across). */
  function lineEnds([x1, y1], [x2, y2]) {
    const dx = x2 - x1, dy = y2 - y1;
    let t0 = -Infinity, t1 = Infinity;
    const clip = (p, q) => { if (p === 0) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; t0 = Math.max(t0, r); } else { if (r < t0) return false; t1 = Math.min(t1, r); } return true; };
    if (!(clip(-dx, x1 + GRID) && clip(dx, GRID - x1) && clip(-dy, y1 + GRID) && clip(dy, GRID - y1))) return null;
    return [[x1 + t0 * dx, y1 + t0 * dy], [x1 + t1 * dx, y1 + t1 * dy]];
  }

  return { BUILD, GRID, PAY, MISTAKES_ALLOWED, FORMS, formById, SLOPES, candidates, generate, equation, slopeValue, slopeCoef, countText, check, answer, explain, lineEnds, neighbours };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Lines;
