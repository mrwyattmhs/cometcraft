/* Polynomial Coaster: the math and the logic, with no DOM, so it is unit tested in Node (tests/coaster.test.js). The screen is coaster-game.js.

   Ported from the Polynomial Coaster game at https://github.com/mrwyattmhs/polynomial-coaster (MIT). The problem generators, the track geometry, the
   student's live sketch, the checking, the hints and the explanations are the same; what is new here is that a ride is judged at once (derail() says where
   the cart would come off) instead of being animated, and what a ride pays.

   A student is given a polynomial and builds its track: they say where each END goes (up or down) and, for each ZERO, whether the track PASSES THROUGH the
   axis (odd multiplicity) or BOUNCES off it (even). Then the ride is checked, and the cart comes off at the FIRST mistake, left to right.
     Factored form (easy):   f(x) = -2(x + 3)(x - 1)^2(x - 4)^3       read the exponents and signs
     Factor first (medium):  f(x) = 2x^3 - 2x^2 - 12x                  factor to find the real zeros (some factors have none), mark them, then build
   A run is 8 rides that get harder. A ride is worth 3 stars, minus one for each derail and one for using a hint (never fewer than 1). */
const Coaster = (() => {
  const BUILD = 39; // bump together with the ?v= numbers in index.html
  const E = typeof Economy !== 'undefined' ? Economy : require('./economy.js');
  const MINUS = '\u2212';
  const W = 760, H = 420, CX = 380, CY = 210, SX = 52, HH = 150, LEFT = 34, RIGHT = 726;       // the stage, in its own units: x = -6..6 is 52 across, the ends are 150 up and down
  const RIDES = 8;
  const MODES = [
    { id: 'easy', name: 'Factored form', tag: 'Easy', blurb: 'The polynomial is already factored. Read the exponents and build the track.' },
    { id: 'factor', name: 'Factor first', tag: 'Medium', blurb: 'Factor the polynomial yourself to find the real zeros. Watch for factors that have none.' },
  ];
  const modeById = id => MODES.find(m => m.id === id) || null;
  /** Chips for a ride: so much per star, by mode. A ride given up on has 0 stars and pays nothing. */
  const payFor = (mode, stars) => (E.PAY.coaster[mode] || 0) * Math.max(0, stars);
  /** 3 stars, minus one for each derail and one for any hint, but a ride that is finished is always worth at least 1. */
  const starsFor = (wrong, hints) => Math.max(1, 3 - wrong - (hints > 0 ? 1 : 0));

  let rand = Math.random;
  const setRandom = fn => { rand = fn || Math.random; };         // so tests can use a seeded generator
  const px = x => CX + x * SX;
  const rnd = n => Math.floor(rand() * n);
  const pick = a => a[rnd(a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmt = x => (x < 0 ? MINUS + -x : String(x));
  const X_ = '<i>x</i>';
  const sup = m => (m > 1 ? '<sup>' + m + '</sup>' : '');
  const coefLead = a => (a === 1 ? '' : a === -1 ? MINUS : (a < 0 ? MINUS + -a : String(a)));

  /* ---------- writing polynomials ---------- */
  function polyMul(p, q) { const r = Array(p.length + q.length - 1).fill(0); p.forEach((a, i) => q.forEach((b, j) => { r[i + j] += a * b; })); return r; }
  function evalPoly(c, x) { let s = 0; for (let i = c.length - 1; i >= 0; i--) s = s * x + c[i]; return s; }
  function linHTML(r, m) { const base = r === 0 ? X_ : '(' + X_ + ' ' + (r > 0 ? MINUS : '+') + ' ' + Math.abs(r) + ')'; return base + sup(m); }
  function polyHTML(c) {
    let out = '', first = true;
    for (let i = c.length - 1; i >= 0; i--) {
      const a = c[i]; if (a === 0) continue;
      const abs = Math.abs(a), body = i === 0 ? String(abs) : (abs === 1 ? '' : String(abs)) + X_ + sup(i);
      if (first) { out += (a < 0 ? MINUS : '') + body; first = false; } else out += ' ' + (a < 0 ? MINUS : '+') + ' ' + body;
    }
    return out || '0';
  }
  function factoredHTML(p) {
    let s = coefLead(p.a);
    p.lin.forEach(z => { s += linHTML(z.r, z.m); });
    p.irr.forEach(q => { s += '(' + polyHTML([q.c, q.b, 1]) + ')'; });
    return s;
  }
  const fOf = '<i>f</i>(' + X_ + ') = ';

  /* ---------- the problems ---------- */
  /** a: the number out front; rootList: the real zeros, one entry per time a factor repeats; irr: quadratic factors with no real zeros ({b, c} for x^2 + bx + c). */
  function makeProblem(a, rootList, irr, extra) {
    const counts = {}; rootList.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
    const lin = Object.keys(counts).map(Number).sort((u, v) => u - v).map(r => ({ r, m: counts[r] }));
    let coeffs = [a];
    lin.forEach(z => { for (let k = 0; k < z.m; k++) coeffs = polyMul(coeffs, [-z.r, 1]); });
    irr.forEach(q => { coeffs = polyMul(coeffs, [q.c, q.b, 1]); });
    const degree = coeffs.length - 1, right = a > 0 ? 'up' : 'down', left = degree % 2 === 0 ? right : (right === 'up' ? 'down' : 'up');
    const truth = {}; lin.forEach(z => { truth[z.r] = z.m % 2 === 0 ? 'bounce' : 'cross'; });
    return Object.assign({ a, lin, irr, coeffs, degree, left, right, truth }, extra || {});
  }

  /** Easy mode: already factored. The level (0 to 3) goes up every 2 rides: more factors, higher powers, more kinds of leading number. */
  function genEasy(i) {
    const L = Math.min(3, Math.floor(i / 2));
    const maxDeg = [3, 4, 5, 6][L], maxM = [2, 2, 3, 4][L];
    const aPool = [[1, 2], [1, 2, -1, -2], [1, 2, -1, -2, 3, -3], [1, -1, 2, -2, 3, -3]][L];
    const nz = [2, 2 + rnd(2), 2 + rnd(3), 3 + rnd(2)][L];
    const ms = Array(nz).fill(1); let deg = nz, guard = 0;
    while (deg < maxDeg && guard++ < 30) { const k = rnd(nz); if (ms[k] < maxM && (rand() < 0.8 || ms.every(m => m === 1))) { ms[k]++; deg++; } }
    if (ms.every(m => m === 1)) ms[0]++;
    const roots = shuffle([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]).slice(0, nz);
    const list = []; roots.forEach((r, k) => { for (let j = 0; j < ms[k]; j++) list.push(r); });
    return makeProblem(pick(aPool), list, [], { tmpl: 'easy' });
  }

  /** Factor-first mode: given expanded, the student finds the real zeros. Each kind of problem has two hints (h1, h2). */
  const TEMPL = [
    { name: 'gcf', make() {
      const k = 1 + rnd(2), nz = [-4, -3, -2, -1, 1, 2, 3, 4];
      const p = pick(nz), q = rand() < 0.2 ? p : pick(nz.filter(v => v !== p)), a = pick([1, 1, 2, 3, -1, -2]);
      return makeProblem(a, [...Array(k).fill(0), p, q], [], {
        h1: 'Look for a common factor in every term first.',
        h2: 'Pull it out: ' + coefLead(a) + X_ + sup(k) + '(' + polyHTML([p * q, -(p + q), 1]) + ')',
      });
    } },
    { name: 'group', make() {
      const p = pick([-4, -3, -2, -1, 1, 2, 3, 4]), s = 1 + rnd(4), a = pick([1, 1, -1, 2]);
      return makeProblem(a, [p, s, -s], [], {
        h1: 'Four terms? Try factoring by grouping.',
        h2: 'Grouping gives ' + coefLead(a) + linHTML(p, 1) + '(' + X_ + '<sup>2</sup> ' + MINUS + ' ' + (s * s) + ')',
      });
    } },
    { name: 'quad', make() {
      const a = pick([1, -1, 2]);
      if (rand() < 0.6) {
        const s = 1 + rnd(4), t = 1 + rnd(4);
        return makeProblem(a, [s, -s, t, -t], [], {
          h1: 'Only even powers show up. Try letting u = ' + X_ + '<sup>2</sup>.',
          h2: 'That factors as ' + coefLead(a) + '(' + X_ + '<sup>2</sup> ' + MINUS + ' ' + (s * s) + ')(' + X_ + '<sup>2</sup> ' + MINUS + ' ' + (t * t) + ')',
        });
      }
      const s = 1 + rnd(4), t = 1 + rnd(3);
      return makeProblem(a, [s, -s], [{ b: 0, c: t * t }], {
        h1: 'Only even powers show up. Try letting u = ' + X_ + '<sup>2</sup>.',
        h2: 'That factors as ' + coefLead(a) + '(' + X_ + '<sup>2</sup> ' + MINUS + ' ' + (s * s) + ')(' + X_ + '<sup>2</sup> + ' + (t * t) + ')',
      });
    } },
    { name: 'cube', make() {
      const r = 1 + rnd(3), diff = rand() < 0.5, a = pick([1, -1, 2]);
      return makeProblem(a, [diff ? r : -r], [{ b: diff ? r : -r, c: r * r }], {
        h1: 'Cubes! Look for a sum or difference of cubes.',
        h2: 'Use a<sup>3</sup> ' + MINUS + ' b<sup>3</sup> = (a ' + MINUS + ' b)(a<sup>2</sup> + ab + b<sup>2</sup>) or a<sup>3</sup> + b<sup>3</sup> = (a + b)(a<sup>2</sup> ' + MINUS + ' ab + b<sup>2</sup>).',
      });
    } },
    { name: 'gcfirr', make() {
      const t = 1 + rnd(3), a = pick([1, 2, -1]);
      return makeProblem(a, [0], [{ b: 0, c: t * t }], {
        h1: 'Factor out the common factor, then look at what is left.',
        h2: 'Pull it out: ' + coefLead(a) + X_ + '(' + X_ + '<sup>2</sup> + ' + (t * t) + ')',
      });
    } },
  ];
  /** The kinds of problem open on ride i: two at first, one more every 2 rides. Never the same kind twice running. */
  function genFactor(i, last) {
    const pool = TEMPL.slice(0, Math.min(TEMPL.length, 2 + Math.floor(i / 2)));
    const cand = pool.filter(t => t.name !== last);
    const t = pick(cand.length ? cand : pool);
    const p = t.make(); p.tmpl = t.name; return p;
  }

  const ENDS_RULE = 'Ends rule: an odd degree sends the ends opposite ways, an even degree sends them the same way. A positive leading coefficient sends the right end up.';
  const ZERO_RULE = 'Zeros rule: an odd exponent passes through the axis, an even exponent bounces off it.';
  function hintsFor(p, mode) {
    if (mode === 'easy') return ['Add up the exponents to get the degree: <b>' + p.degree + '</b>. The number out front is the leading coefficient: <b>' + fmt(p.a) + '</b>.', ENDS_RULE, ZERO_RULE];
    return [p.h1, p.h2, 'The leading term is ' + coefLead(p.a) + X_ + sup(p.degree) + '. ' + ENDS_RULE, ZERO_RULE + ' A factor that shows up an odd number of times passes through; an even number of times bounces.'];
  }

  /* ---------- track geometry ---------- */
  // Monotone cubic (Fritsch-Carlson) through points; points flagged "flat" get a horizontal tangent
  function hermiteLine(pts) {
    const n = pts.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d[i] = (pts[i + 1].Y - pts[i].Y) / (pts[i + 1].X - pts[i].X);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    pts.forEach((q, i) => { if (q.flat) m[i] = 0; });
    const line = [];
    for (let i = 0; i < n - 1; i++) {
      const x0 = pts[i].X, x1 = pts[i + 1].X, h = x1 - x0, steps = Math.max(2, Math.ceil(h / 2));
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        const y = (2 * t3 - 3 * t2 + 1) * pts[i].Y + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * pts[i + 1].Y + (t3 - t2) * h * m[i + 1];
        line.push({ x: x0 + t * h, y });
      }
    }
    line.push({ x: pts[n - 1].X, y: pts[n - 1].Y });
    return line;
  }
  function pathFromLine(line) {
    const cum = [0];
    for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
    const total = cum[cum.length - 1];
    const d = 'M' + line.map(q => q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join(' L');
    function poseAt(s) {
      s = Math.max(0, Math.min(total, s));
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
      const f = cum[hi] === cum[lo] ? 0 : (s - cum[lo]) / (cum[hi] - cum[lo]);
      const X = line[lo].x + (line[hi].x - line[lo].x) * f, Y = line[lo].y + (line[hi].y - line[lo].y) * f;
      const j1 = Math.max(0, lo - 3), j2 = Math.min(line.length - 1, hi + 3);
      return { X, Y, a: Math.atan2(line[j2].y - line[j1].y, line[j2].x - line[j1].x) * 180 / Math.PI };
    }
    function sAtX(X) { for (let i = 0; i < line.length; i++) if (line[i].x >= X) return cum[i]; return total; }
    return { d, line, cum, total, poseAt, sAtX };
  }

  /** The true graph: shown after a clean ride, or when the student asks for the answer. */
  function buildTrack(p) {
    const sgnR = p.a > 0 ? 1 : -1, sgnL = p.degree % 2 === 0 ? sgnR : -sgnR;
    const pts = [{ X: LEFT, Y: CY - sgnL * HH }];
    p.lin.forEach(z => pts.push({ X: px(z.r), Y: CY, flat: z.m >= 2 }));
    const xs = [], ys = [];
    for (let x = -6.4; x <= 6.4001; x += 0.01) { xs.push(x); ys.push(evalPoly(p.coeffs, x)); }
    const ex = [];
    for (let i = 1; i < xs.length - 1; i++) {
      const y = ys[i], isMax = y > ys[i - 1] && y > ys[i + 1], isMin = y < ys[i - 1] && y < ys[i + 1];
      if (!(isMax || isMin)) continue;
      if (Math.abs(y) < 1e-6) continue;
      if (p.lin.some(z => Math.abs(z.r - xs[i]) < 0.06)) continue;
      ex.push({ x: xs[i], y });
    }
    const maxAbs = ex.reduce((m, e) => Math.max(m, Math.abs(e.y)), 0) || 1;
    ex.forEach(e => {
      const h = HH * (0.28 + 0.57 * Math.sqrt(Math.abs(e.y) / maxAbs)), X = px(e.x);
      if (pts.some(q => Math.abs(q.X - X) < 8)) return;
      pts.push({ X, Y: CY - Math.sign(e.y) * h });
    });
    pts.push({ X: RIGHT, Y: CY - sgnR * HH });
    pts.sort((u, v) => u.X - v.X);
    return pathFromLine(hermiteLine(pts));
  }

  /* ---------- the student's own track, built live from their clicks ---------- */
  // st: { mode, spotXs, sel: { left, right }, spots: { [x]: 'cross' | 'bounce' } }.
  // Signs flow left to right from the left end (and right to left from the right end): passing through flips the side of the axis, bouncing keeps it.
  function buildSketch(st) {
    const easy = st.mode === 'easy';
    const xs = (easy ? st.spotXs.slice() : st.spotXs.filter(x => st.spots[x])).sort((a, b) => a - b);
    const zs = xs.map(x => ({ x, st: st.spots[x] })), n = zs.length, sgn = d => (d === 'up' ? 1 : -1);
    const sg = Array(n + 1).fill(null), bs = Array(n + 1).fill(null);
    if (st.sel.left) { let cur = sgn(st.sel.left); sg[0] = cur; for (let i = 0; i < n; i++) { if (!zs[i].st) break; cur = zs[i].st === 'cross' ? -cur : cur; sg[i + 1] = cur; } }
    if (st.sel.right) { let cur = sgn(st.sel.right); bs[n] = cur; for (let i = n - 1; i >= 0; i--) { if (!zs[i].st) break; cur = zs[i].st === 'cross' ? -cur : cur; bs[i] = cur; } }
    let inconsistent = false;
    for (let k = 0; k <= n; k++) {
      if (sg[k] !== null && bs[k] !== null) { if (sg[k] !== bs[k]) inconsistent = true; } else if (sg[k] === null && bs[k] !== null) sg[k] = bs[k];
    }
    const runs = [];
    if (n === 0) {                     // no zeros yet: just short stubs coming in from each chosen end
      if (st.sel.left) { const s = sgn(st.sel.left); runs.push(pathFromLine(hermiteLine([{ X: LEFT, Y: CY - s * HH }, { X: LEFT + 120, Y: CY - s * HH * 0.55 }]))); }
      if (st.sel.right) { const s = sgn(st.sel.right); runs.push(pathFromLine(hermiteLine([{ X: RIGHT - 120, Y: CY - s * HH * 0.55 }, { X: RIGHT, Y: CY - s * HH }]))); }
      return { runs, full: null, inconsistent: false };
    }
    const zp = i => ({ X: px(zs[i].x), Y: CY, flat: zs[i].st === 'bounce' });
    let cur = null;
    const flush = () => { if (cur && cur.length > 1) runs.push(pathFromLine(hermiteLine(cur))); cur = null; };
    for (let k = 0; k <= n; k++) {
      const s = sg[k];
      if (s === null) { flush(); continue; }
      const A = k === 0 ? { X: LEFT, Y: CY - s * HH } : zp(k - 1), B = k === n ? { X: RIGHT, Y: CY - s * HH } : zp(k);
      if (!cur) cur = [A];
      if (k > 0 && k < n) { const h = Math.min(0.6 * HH, Math.max(0.3 * HH, (B.X - A.X) * 0.3)); cur.push({ X: (A.X + B.X) / 2, Y: CY - s * h }); }
      cur.push(B);
    }
    flush();
    const complete = sg.every(v => v !== null);
    return { runs, full: (runs.length === 1 && complete) ? runs[0] : null, inconsistent };
  }

  /* ---------- checking ---------- */
  /** Everything wrong with the student's answer, left to right: the left end, then each zero by its x, then the right end. */
  function mismatches(st) {
    const p = st.prob, out = [];
    if (st.sel.left !== p.left) out.push({ k: 'left', ord: -1e9, X: LEFT });
    st.spotXs.forEach(x => { const t = p.truth[x], s = st.spots[x]; if (t !== s) out.push({ k: 'zero', x, t, s, ord: x, X: px(x) }); });
    if (st.sel.right !== p.right) out.push({ k: 'right', ord: 1e9, X: RIGHT });
    return out.sort((a, b) => a.ord - b.ord);
  }
  /** What kind of mistake it was, for the tally at the end. */
  const classify = m => (m.k !== 'zero' ? 'ends' : (m.t && m.s ? 'behavior' : 'zeros'));
  function failMessage(m, st) {
    const p = st.prob, lw = st.sel.left !== p.left, rw = st.sel.right !== p.right;
    if (m.k === 'left' || m.k === 'right') {
      if (lw && rw) return 'The cart came off right at the start. Both ends are off. Start with the sign of the leading coefficient.';
      if (m.k === 'left') return 'The cart came off at the left end. Check the degree: do the two ends point the same way or opposite ways?';
      return 'The cart made it to the right end, then came off. Check the sign of the leading coefficient.';
    }
    const xs = 'x = ' + fmt(m.x);
    if (m.t && m.s) return 'The cart came off at ' + xs + '. Check how many times that factor repeats: odd passes through, even bounces.';
    if (m.t && !m.s) return 'The cart came off at ' + xs + '. There is a zero there that is not marked yet.';
    return 'The cart came off at ' + xs + '. That spot is not a zero. Re-check your factoring.';
  }
  /** Run the ride. null if the track is not finished yet; { ok: true } for a clean ride; otherwise where the cart comes off (the first mistake): the track pose there (pose), and where to draw the marker (mark). */
  function derail(st) {
    const sk = buildSketch(st);
    if (!sk.full) return null;
    const mm = mismatches(st);
    if (!mm.length) return { ok: true, mismatches: [] };
    const tr = sk.full, fail = mm[0];
    const stopS = fail.k === 'left' ? Math.min(24, tr.total * 0.04) : fail.k === 'right' ? tr.total - 18 : Math.max(10, tr.sAtX(fail.X));
    const nudge = fail.k === 'left' ? 32 : fail.k === 'right' ? -32 : 0;           // the marker for a cart that came off at an end sits a little way in, clear of the end block
    return { ok: false, fail, mismatches: mm, stopS, pose: tr.poseAt(stopS), mark: tr.poseAt(stopS + nudge), message: failMessage(fail, st), kind: classify(fail) };
  }
  function explainHTML(st) {
    const p = st.prob, parity = p.degree % 2 === 0 ? 'even' : 'odd', sign = p.a > 0 ? 'positive' : 'negative';
    let h = '';
    if (st.mode === 'factor') h += '<p class="math">' + fOf + factoredHTML(p) + '</p>';
    h += '<p><b>Ends:</b> degree ' + p.degree + ' is ' + parity + ' and the leading coefficient is ' + sign + ', so the ends point ' + (parity === 'odd' ? 'opposite ways' : 'the same way') + ': the left end goes ' + p.left + ' and the right end goes ' + p.right + '.</p><ul>';
    p.lin.forEach(z => {
      const odd = z.m % 2 === 1, how = odd ? (z.m >= 3 ? 'passes through with a flat spot' : 'passes straight through') : 'bounces off the axis';
      h += '<li><b>x = ' + fmt(z.r) + '</b> comes from ' + linHTML(z.r, z.m) + '. The exponent is ' + z.m + ' (' + (odd ? 'odd' : 'even') + '), so the track ' + how + '.</li>';
    });
    p.irr.forEach(q => { h += '<li>' + polyHTML([q.c, q.b, 1]) + ' has no real zeros, so the track never touches the axis because of it. It still counts toward the degree.</li>'; });
    return h + '</ul>';
  }

  /* ---------- where the student is ---------- */
  function statusText(st) {
    if (st.phase !== 'edit') return st.phase === 'riding' ? 'Here we go...' : '';
    const easy = st.mode === 'easy';
    if (!st.sel.left && !st.sel.right) return 'Click an end point on each side. The track starts to draw as you go.';
    if (!st.sel.left || !st.sel.right) return 'Now set the other end.';
    if (buildSketch(st).inconsistent) return 'The track you have drawn does not line up with both of your end points. Check the zeros and the ends.';
    if (easy) { const left = st.spotXs.length - Object.keys(st.spots).length; return left > 0 ? 'Click each zero to choose pass through or bounce (' + left + ' left).' : 'Ready to ride.'; }
    return Object.keys(st.spots).length === 0 ? 'Click the x-values where the track touches the axis. Click again to switch between pass through and bounce.' : 'Ready to ride. Check your zeros once more.';
  }
  function canRide(st) {
    if (st.phase !== 'edit' || !st.sel.left || !st.sel.right) return false;
    const n = Object.keys(st.spots).length;
    return st.mode === 'easy' ? n === st.spotXs.length : n >= 1;
  }
  /** What clicking a zero does: easy mode flips between pass through and bounce; factor mode goes unset, pass through, bounce, unset. */
  function nextSpot(mode, cur) {
    if (mode === 'easy') return cur === 'cross' ? 'bounce' : 'cross';
    return !cur ? 'cross' : cur === 'cross' ? 'bounce' : null;
  }
  /** Deal ride number `ride` (0 to 7) of a run: a new problem and an empty answer. st is changed in place. */
  function deal(st) {
    const p = st.mode === 'easy' ? genEasy(st.ride) : genFactor(st.ride, st.lastTmpl);
    st.lastTmpl = p.tmpl; st.prob = p; st.track = buildTrack(p);
    st.spotXs = st.mode === 'easy' ? p.lin.map(z => z.r) : [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    st.hintList = hintsFor(p, st.mode);
    st.sel = { left: null, right: null }; st.spots = {}; st.wrong = 0; st.hints = 0; st.phase = 'edit'; st.crash = null; st.flag = null; st.msg = '';
    return st;
  }
  const newRun = mode => ({ mode, ride: 0, total: 0, results: [], errors: { ends: 0, behavior: 0, zeros: 0 }, lastTmpl: null });

  return {
    BUILD, RIDES, MODES, modeById, payFor, starsFor, setRandom,
    W, H, CX, CY, SX, HH, LEFT, RIGHT, px, fmt, MINUS, TEMPL,
    polyMul, evalPoly, polyHTML, factoredHTML, linHTML, fOf, coefLead,
    makeProblem, genEasy, genFactor, hintsFor, hermiteLine, pathFromLine, buildTrack, buildSketch,
    mismatches, classify, failMessage, derail, explainHTML, statusText, canRide, nextSpot, deal, newRun,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Coaster;
