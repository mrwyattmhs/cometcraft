// Run with: node tests/coaster.test.js
// Polynomial Coaster: the generators, the true track, the student's sketch, the checking, the hints and the stars. The checks are independent of the code's own
// bookkeeping: polynomials are re-expanded numerically, end behaviour and each zero's pass-or-bounce are found by evaluating the polynomial next to the zero, and
// the drawn tracks are checked to really cross or bounce where they should.
const assert = require('assert');
const C = require('../js/coaster.js');
const E = require('../js/economy.js');
const M = '\u2212';
const strip = s => s.replace(/<sup>(\d+)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '');
const seeded = seed => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const same = (a, b, msg) => assert.ok(a === b, `${msg} (${a} vs ${b})`);
const sign = v => Math.sign(v);

/* ---------- the rules of a run ---------- */
assert.strictEqual(C.RIDES, 8); assert.deepStrictEqual(C.MODES.map(m => [m.id, m.name, m.tag]), [['easy', 'Factored form', 'Easy'], ['factor', 'Factor first', 'Medium']]);
assert.strictEqual(C.modeById('factor').name, 'Factor first'); assert.strictEqual(C.modeById('expert'), null);
assert.deepStrictEqual(E.PAY.coaster, { easy: 10, factor: 20 }, 'chips per star');
// 3 stars, minus 1 for each derail and 1 for any hint, never fewer than 1
[[0, 0, 3], [1, 0, 2], [0, 1, 2], [0, 5, 2], [1, 1, 1], [2, 0, 1], [2, 1, 1], [5, 3, 1]].forEach(([w, h, want]) => assert.strictEqual(C.starsFor(w, h), want, `${w} derails, ${h} hints`));
assert.deepStrictEqual([C.payFor('easy', 3), C.payFor('easy', 2), C.payFor('easy', 1), C.payFor('easy', 0), C.payFor('factor', 3), C.payFor('factor', 1), C.payFor('nope', 3)], [30, 20, 10, 0, 60, 20, 0], 'chips for a ride');
assert.strictEqual(C.payFor('easy', -2), 0, 'never negative');

/* ---------- writing polynomials ---------- */
assert.deepStrictEqual(C.polyMul([1, 1], [-1, 1]), [-1, 0, 1]); assert.strictEqual(C.evalPoly([-1, 0, 1], 3), 8); assert.strictEqual(C.evalPoly([5], 100), 5);
[[[0, -12, -2, 2], '2x^3 \u2212 2x^2 \u2212 12x'], [[5, 1], 'x + 5'], [[-1, 0, 1], `x^2 ${M} 1`], [[0], '0'], [[1, -1, 1, -1], `${M}x^3 + x^2 ${M} x + 1`], [[0, 0, 1], 'x^2'], [[-7], `${M}7`], [[3, 0, -1], `${M}x^2 + 3`]]
  .forEach(([c, want]) => assert.strictEqual(strip(C.polyHTML(c)), want, `polyHTML ${c}`));
assert.strictEqual(strip(C.factoredHTML(C.makeProblem(-2, [-3, 1, 1, 4, 4, 4], [], {}))), `${M}2(x + 3)(x ${M} 1)^2(x ${M} 4)^3`, 'the example from the game');
assert.strictEqual(strip(C.factoredHTML(C.makeProblem(1, [2], [{ b: 0, c: 9 }], {}))), `(x ${M} 2)(x^2 + 9)`); assert.strictEqual(strip(C.factoredHTML(C.makeProblem(2, [0, 0, 5], [], {}))), `2x^2(x ${M} 5)`);
assert.strictEqual(strip(C.factoredHTML(C.makeProblem(-1, [0], [], {}))), `${M}x`); assert.strictEqual(strip(C.linHTML(0, 3)), 'x^3'); assert.strictEqual(strip(C.linHTML(-2, 1)), '(x + 2)');
assert.strictEqual(C.fmt(-4), `${M}4`); assert.strictEqual(C.fmt(3), '3'); assert.strictEqual(C.coefLead(1), ''); assert.strictEqual(C.coefLead(-1), M); assert.strictEqual(C.coefLead(-3), `${M}3`);

/* ---------- a problem says what it is: its numbers, its ends and its zeros, checked against the polynomial itself ---------- */
const product = (p, x) => { let v = p.a; p.lin.forEach(z => { v *= Math.pow(x - z.r, z.m); }); p.irr.forEach(q => { v *= x * x + q.b * x + q.c; }); return v; };
function checkProblem(p, label) {
  for (let x = -7; x <= 7; x++) same(C.evalPoly(p.coeffs, x), product(p, x), `${label}: the expanded form equals the factored form at x = ${x}`);
  const degree = p.lin.reduce((s, z) => s + z.m, 0) + 2 * p.irr.length; assert.strictEqual(p.degree, degree, `${label}: degree`); assert.strictEqual(p.coeffs.length - 1, degree); same(p.coeffs[degree], p.a, `${label}: the leading coefficient`);
  const R = sign(C.evalPoly(p.coeffs, 1000)), Lf = sign(C.evalPoly(p.coeffs, -1000));
  assert.strictEqual(p.right, R > 0 ? 'up' : 'down', `${label}: right end`); assert.strictEqual(p.left, Lf > 0 ? 'up' : 'down', `${label}: left end`);
  p.lin.forEach(z => {
    assert.ok(Number.isInteger(z.r) && z.m >= 1);
    const l = sign(C.evalPoly(p.coeffs, z.r - 0.01)), r = sign(C.evalPoly(p.coeffs, z.r + 0.01)); assert.ok(l !== 0 && r !== 0);
    assert.strictEqual(p.truth[z.r], l !== r ? 'cross' : 'bounce', `${label}: x = ${z.r} (multiplicity ${z.m}) ${l !== r ? 'passes through' : 'bounces'}`);
    same(C.evalPoly(p.coeffs, z.r), 0, `${label}: ${z.r} is a zero`);
  });
  assert.deepStrictEqual(Object.keys(p.truth).map(Number).sort((a, b) => a - b), p.lin.map(z => z.r), `${label}: a verdict for every zero and nothing else`);
  p.irr.forEach(q => { assert.ok(q.b * q.b - 4 * q.c < 0, `${label}: x^2 + ${q.b}x + ${q.c} has no real zeros`); });
  assert.deepStrictEqual(p.lin.map(z => z.r), p.lin.map(z => z.r).slice().sort((a, b) => a - b)); assert.strictEqual(new Set(p.lin.map(z => z.r)).size, p.lin.length, `${label}: each zero listed once`);
}

/* easy mode: the ramp in difficulty, every two rides */
const EASY = [{ maxDeg: 3, maxM: 2, a: [1, 2], nz: [2, 2] }, { maxDeg: 4, maxM: 2, a: [1, 2, -1, -2], nz: [2, 3] }, { maxDeg: 5, maxM: 3, a: [1, 2, -1, -2, 3, -3], nz: [2, 4] }, { maxDeg: 6, maxM: 4, a: [1, -1, 2, -2, 3, -3], nz: [3, 4] }];
C.setRandom(seeded(2026));
const seenA = EASY.map(() => new Set()); let easyCount = 0;
for (let ride = 0; ride < 8; ride++) for (let n = 0; n < 250; n++) {
  const p = C.genEasy(ride), L = Math.min(3, Math.floor(ride / 2)), lv = EASY[L]; easyCount++;
  checkProblem(p, `easy ride ${ride + 1}`);
  assert.strictEqual(p.tmpl, 'easy'); assert.deepStrictEqual(p.irr, [], 'easy problems have only real factors');
  assert.ok(p.lin.every(z => z.r >= -5 && z.r <= 5), 'every zero is on the stage (-5 to 5)'); assert.ok(p.lin.length >= lv.nz[0] && p.lin.length <= lv.nz[1], `ride ${ride + 1}: ${p.lin.length} zeros`);
  assert.ok(p.degree <= lv.maxDeg && p.degree >= 3, `ride ${ride + 1}: degree ${p.degree} (up to ${lv.maxDeg})`); assert.ok(p.lin.every(z => z.m <= lv.maxM), `ride ${ride + 1}: powers up to ${lv.maxM}`);
  assert.ok(p.lin.some(z => z.m > 1), 'at least one repeated factor, so there is a bounce or a flat spot to find'); assert.ok(lv.a.includes(p.a), `ride ${ride + 1}: leading number ${p.a}`); seenA[L].add(p.a);
}
seenA.forEach((set, L) => assert.deepStrictEqual([...set].sort(), EASY[L].a.slice().sort(), `level ${L}: every leading number gets used`));
assert.strictEqual(easyCount, 2000);
// harder rides really are harder: the most degree seen grows with the level
const maxDegAt = L => { let m = 0; C.setRandom(seeded(77 + L)); for (let n = 0; n < 300; n++) m = Math.max(m, C.genEasy(L * 2).degree); return m; };
assert.deepStrictEqual([0, 1, 2, 3].map(maxDegAt), [3, 4, 5, 6], 'the top degree reached at each level');

/* factor-first mode: five kinds of problem, two at first and one more every 2 rides, never the same kind twice running */
const names = C.TEMPL.map(t => t.name); assert.deepStrictEqual(names, ['gcf', 'group', 'quad', 'cube', 'gcfirr']);
C.setRandom(seeded(4242));
const everSeen = {}; let factorCount = 0;
for (let ride = 0; ride < 8; ride++) {
  const open = names.slice(0, Math.min(5, 2 + Math.floor(ride / 2))); let last = null; const kinds = new Set();
  for (let n = 0; n < 250; n++) {
    const p = C.genFactor(ride, last); factorCount++; checkProblem(p, `factor ride ${ride + 1} (${p.tmpl})`);
    assert.ok(open.includes(p.tmpl), `ride ${ride + 1}: ${p.tmpl} is open`); assert.notStrictEqual(p.tmpl, last, 'not the same kind twice running'); last = p.tmpl; kinds.add(p.tmpl);
    assert.ok(p.h1.length > 10 && p.h2.length > 10, 'two hints from the kind of problem'); assert.ok(p.lin.every(z => z.r >= -4 && z.r <= 4), 'every zero is on the stage'); everSeen[p.tmpl] = (everSeen[p.tmpl] || 0) + 1;
    const c = p.coeffs;
    if (p.tmpl === 'gcf') { const z0 = p.lin.find(z => z.r === 0); assert.ok(z0 && z0.m <= 2 && p.irr.length === 0, 'gcf: x or x^2 comes out front'); for (let k = 0; k < z0.m; k++) assert.strictEqual(c[k], 0); assert.ok(c[z0.m] !== 0); }
    if (p.tmpl === 'quad') { assert.ok(c.every((v, i) => i % 2 === 0 || v === 0), 'quad: only even powers show up'); assert.ok(p.degree === 4); }
    if (p.tmpl === 'cube') { assert.strictEqual(p.irr.length, 1); assert.deepStrictEqual([c[1], c[2], c[3]], [0, 0, p.a]); assert.ok(p.lin.length === 1 && Math.abs(c[0]) === Math.abs(p.a) * Math.pow(Math.abs(p.lin[0].r), 3), 'cube: a(x^3 +- r^3)'); }
    if (p.tmpl === 'gcfirr') { assert.deepStrictEqual(p.lin, [{ r: 0, m: 1 }]); assert.strictEqual(p.irr.length, 1); assert.deepStrictEqual([c[0], c[2], c[3]], [0, 0, p.a]); }
    if (p.tmpl === 'group') { assert.strictEqual(p.degree, 3); assert.ok(p.irr.length === 0 && p.lin.length >= 2); }
  }
  if (ride >= 6) assert.strictEqual(kinds.size, 5, `by ride ${ride + 1} all five kinds turn up`); if (ride === 0) assert.deepStrictEqual([...kinds].sort(), ['gcf', 'group']);
}
names.forEach(n => assert.ok(everSeen[n] > 100, `${n} turns up often (${everSeen[n]})`)); assert.strictEqual(factorCount, 2000);
const cubes = []; C.setRandom(seeded(9)); for (let n = 0; n < 400; n++) { const p = C.TEMPL[3].make(); cubes.push(p.lin[0].r > 0 ? 'diff' : 'sum'); } assert.ok(cubes.includes('diff') && cubes.includes('sum'), 'sums and differences of cubes both appear');

/* ---------- the true track ---------- */
const yAt = (line, X) => { for (let i = 1; i < line.length; i++) if (line[i].x >= X) { const a = line[i - 1], b = line[i], f = b.x === a.x ? 0 : (X - a.x) / (b.x - a.x); return a.y + (b.y - a.y) * f; } return line[line.length - 1].y; };
C.setRandom(seeded(31415));
let tracks = 0;
for (let n = 0; n < 160; n++) for (const mode of ['easy', 'factor']) {
  const p = mode === 'easy' ? C.genEasy(n % 8) : C.genFactor(n % 8, null), tr = C.buildTrack(p); tracks++;
  assert.ok(!/NaN|Infinity|undefined/.test(tr.d), 'a clean path'); assert.ok(tr.total > 400, 'a long track'); assert.ok(tr.line.every(q => Number.isFinite(q.x) && Number.isFinite(q.y)));
  assert.ok(tr.line.every((q, i) => i === 0 || q.x >= tr.line[i - 1].x), 'left to right'); assert.strictEqual(tr.line[0].x, C.LEFT); assert.strictEqual(tr.line[tr.line.length - 1].x, C.RIGHT);
  assert.ok(tr.line.every(q => q.y >= C.CY - C.HH - 1 && q.y <= C.CY + C.HH + 1), 'the track stays on the stage');
  assert.ok((tr.line[0].y < C.CY) === (p.left === 'up') && (tr.line[tr.line.length - 1].y < C.CY) === (p.right === 'up'), 'the ends go the way the polynomial says');
  p.lin.forEach(z => {
    const X = C.px(z.r), at = tr.line.find(q => Math.abs(q.x - X) < 1e-6); assert.ok(at && Math.abs(at.y - C.CY) < 1e-6, `the track touches the axis at x = ${z.r}`);
    const l = yAt(tr.line, X - 20) - C.CY, r = yAt(tr.line, X + 20) - C.CY; assert.ok(Math.abs(l) > 0.05 && Math.abs(r) > 0.05, `x = ${z.r}: ${l} ${r}`);
    assert.strictEqual(l * r < 0 ? 'cross' : 'bounce', p.truth[z.r], `the track ${p.truth[z.r]}s at x = ${z.r}`);
    assert.ok(Math.abs(tr.poseAt(tr.sAtX(X)).X - X) < 1.5, 'and a cart at that point is at that x');
  });
  assert.deepStrictEqual([tr.poseAt(-5).X, tr.poseAt(1e9).X], [C.LEFT, C.RIGHT], 'poses are clamped to the two ends');
}
assert.strictEqual(tracks, 320);

/* ---------- the student's answer ---------- */
const newState = (mode, p) => ({ mode, prob: p, phase: 'edit', spotXs: mode === 'easy' ? p.lin.map(z => z.r) : [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], sel: { left: null, right: null }, spots: {}, wrong: 0, hints: 0 });
const answer = (st, over = {}) => { st.sel = { left: st.prob.left, right: st.prob.right }; st.spots = {}; st.prob.lin.forEach(z => { st.spots[z.r] = st.prob.truth[z.r]; }); Object.assign(st.sel, over.sel || {}); Object.entries(over.spots || {}).forEach(([x, v]) => { if (v === null) delete st.spots[x]; else st.spots[x] = v; }); return st; };
const flip = d => (d === 'up' ? 'down' : 'up'), flipSpot = s => (s === 'cross' ? 'bounce' : 'cross');
C.setRandom(seeded(27182));
let rides = 0, clean = 0;
for (let n = 0; n < 200; n++) for (const mode of ['easy', 'factor']) {
  const p = mode === 'easy' ? C.genEasy(n % 8) : C.genFactor(n % 8, null);
  // a right answer: a complete, consistent sketch that crosses and bounces where the true track does, and a clean ride
  let st = answer(newState(mode, p)); const sk = C.buildSketch(st); rides++;
  assert.ok(sk.full && sk.runs.length === 1 && !sk.inconsistent, 'a right answer draws one complete, consistent track'); assert.deepStrictEqual(C.mismatches(st), []); assert.ok(C.canRide(st));
  const d = C.derail(st); assert.deepStrictEqual([d.ok, d.mismatches.length], [true, 0]); clean++;
  const tr = st.track = C.buildTrack(p);
  assert.ok(Math.abs(sk.full.line[0].y - tr.line[0].y) < 1e-6 && Math.abs(sk.full.line[sk.full.line.length - 1].y - tr.line[tr.line.length - 1].y) < 1e-6, 'her track starts and ends where the true one does');
  p.lin.forEach(z => { const X = C.px(z.r), l = yAt(sk.full.line, X - 20) - C.CY, r = yAt(sk.full.line, X + 20) - C.CY; assert.strictEqual(l * r < 0 ? 'cross' : 'bounce', p.truth[z.r], 'and crosses or bounces at each zero as the true one does'); });
  // the left end wrong: the cart comes off at the start
  st = answer(newState(mode, p), { sel: { left: flip(p.left) } }); let r = C.derail(st); assert.ok(r && !r.ok); assert.strictEqual(r.fail.k, 'left'); assert.strictEqual(r.kind, 'ends'); assert.ok(/left end/.test(r.message) && !/Both/.test(r.message));
  assert.ok(r.pose.X >= C.LEFT - 1e-9 && r.pose.X < C.LEFT + 30, 'it comes off right at the left end');
  { const ln = C.buildSketch(st).full.line[0], d = Math.hypot(r.mark.X - ln.x, r.mark.Y - ln.y); assert.ok(d >= 40 && d <= 70 && r.mark.X > r.pose.X, `the marker is drawn a little way in from the left end block (${d.toFixed(1)} away), so it is not hidden under it`); } assert.strictEqual(r.stopS <= Math.min(24, sk.full.total * 0.04) + 1e-9, true);
  // the right end wrong: it gets all the way along and comes off at the end
  st = answer(newState(mode, p), { sel: { right: flip(p.right) } }); r = C.derail(st); assert.ok(!r.ok && r.fail.k === 'right' && r.kind === 'ends' && /right end/.test(r.message) && /sign of the leading coefficient/.test(r.message));
  assert.ok(r.pose.X > C.RIGHT - 40, 'it comes off at the right end');
  { const sl = C.buildSketch(st).full.line, ln = sl[sl.length - 1], d = Math.hypot(r.mark.X - ln.x, r.mark.Y - ln.y); assert.ok(d >= 40 && d <= 70 && r.mark.X < r.pose.X, `and a little way in from the right end block (${d.toFixed(1)} away)`); }
  // both ends wrong: a consistent track, but the cart still comes off at the very start
  st = answer(newState(mode, p), { sel: { left: flip(p.left), right: flip(p.right) } }); r = C.derail(st); const skB = C.buildSketch(st);
  assert.ok(skB.full && !skB.inconsistent, 'a track with both ends upside down is perfectly consistent'); assert.ok(!r.ok && r.fail.k === 'left' && /Both ends are off/.test(r.message) && r.mismatches.length === 2, 'only the ride shows it is wrong');
  // pass or bounce wrong at one or more zeros (easy mode): it comes off at the left-most wrong one
  if (mode === 'easy') {
    const wrong = p.lin.filter((z, i) => (n + i) % 3 === 0 || i === 0 && p.lin.length === 1).map(z => z.r); if (!wrong.length) wrong.push(p.lin[0].r);
    const over = {}; wrong.forEach(x => { over[x] = flipSpot(p.truth[x]); }); st = answer(newState(mode, p), { spots: over }); r = C.derail(st); const first = Math.min(...wrong);
    assert.ok(r && !r.ok && r.fail.k === 'zero' && r.fail.x === first && r.kind === 'behavior', `comes off at the left-most wrong zero, x = ${first}`);
    assert.ok(r.message.includes('x = ' + C.fmt(first)) && /odd passes through, even bounces/.test(r.message)); assert.deepStrictEqual(r.mismatches.map(m => m.x), wrong.slice().sort((a, b) => a - b));
    assert.ok(Math.abs(r.pose.X - C.px(first)) < 2, 'at that zero');
    assert.deepStrictEqual(r.mark, r.pose, 'a zero is marked right where it is');
  }
  // factor mode: a zero left out, and a zero that is not there
  if (mode === 'factor' && p.lin.length >= 2) {
    const miss = p.lin[0].r; st = answer(newState(mode, p), { spots: { [miss]: null } }); r = C.derail(st); assert.ok(r && !r.ok && r.fail.k === 'zero' && r.fail.x === miss && r.kind === 'zeros' && /not marked yet/.test(r.message), 'a zero that is not marked');
    const decoy = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].find(x => p.truth[x] === undefined); st = answer(newState(mode, p), { spots: { [decoy]: 'cross' } }); r = C.derail(st);
    assert.ok(!r.ok && r.fail.x === decoy && r.kind === 'zeros' && /That spot is not a zero/.test(r.message) && r.fail.t === undefined, 'a spot that is not a zero');
  }
}
assert.ok(rides === 400 && clean === 400);
// before the track is finished there is nothing to ride
{ const p = C.genEasy(0), st = newState('easy', p); assert.strictEqual(C.derail(st), null); assert.strictEqual(C.canRide(st), false); st.sel.left = p.left; assert.strictEqual(C.canRide(st), false, 'one end is not enough');
  st.sel.right = p.right; assert.strictEqual(C.canRide(st), false, 'ends but no zeros (easy mode wants every one)'); assert.strictEqual(C.derail(st), null); assert.deepStrictEqual(C.buildSketch(st).full, null, 'just stubs at the ends'); assert.strictEqual(C.buildSketch(st).runs.length, 2);
  p.lin.slice(0, -1).forEach(z => { st.spots[z.r] = 'cross'; }); assert.strictEqual(C.canRide(st), false, 'one zero still unset'); st.spots[p.lin[p.lin.length - 1].r] = 'bounce'; assert.strictEqual(C.canRide(st), true);
  st.phase = 'riding'; assert.strictEqual(C.canRide(st), false, 'not while a ride is on');
  const f = newState('factor', C.genFactor(0, null)); f.sel = { left: 'up', right: 'up' }; assert.strictEqual(C.canRide(f), false, 'factor mode needs at least one zero marked'); f.spots[2] = 'cross'; assert.strictEqual(C.canRide(f), true); assert.ok(C.derail(f)); }
// a bad sketch is noticed as it is drawn, but can still be ridden
{ const p = C.makeProblem(1, [-1, 2], [], { tmpl: 'easy' }), st = newState('easy', p); st.sel = { left: 'up', right: 'down' }; st.spots = { '-1': 'cross', 2: 'cross' }; assert.ok(C.buildSketch(st).inconsistent, 'ends that do not fit the zeros'); assert.ok(C.canRide(st)); assert.ok(C.derail(st)); }

/* ---------- what clicking a zero does ---------- */
assert.deepStrictEqual(['easy'].map(m => [C.nextSpot(m, undefined), C.nextSpot(m, 'cross'), C.nextSpot(m, 'bounce')]), [['cross', 'bounce', 'cross']], 'easy: flip between pass through and bounce');
assert.deepStrictEqual([C.nextSpot('factor', undefined), C.nextSpot('factor', 'cross'), C.nextSpot('factor', 'bounce')], ['cross', 'bounce', null], 'factor: unset, pass through, bounce, unset');

/* ---------- the failure messages, all six ---------- */
{ const p = C.makeProblem(1, [-2, 3], [], { tmpl: 'easy' }), st = newState('easy', p), msg = st2 => C.derail(st2).message;
  const base = () => answer(newState('easy', p));
  assert.strictEqual(msg(answer(newState('easy', p), { sel: { left: 'down', right: 'down' } })), 'The cart came off right at the start. Both ends are off. Start with the sign of the leading coefficient.');
  assert.strictEqual(msg(answer(newState('easy', p), { sel: { left: 'down' } })), 'The cart came off at the left end. Check the degree: do the two ends point the same way or opposite ways?');
  assert.strictEqual(msg(answer(newState('easy', p), { sel: { right: 'down' } })), 'The cart made it to the right end, then came off. Check the sign of the leading coefficient.');
  assert.strictEqual(msg(base().spots && answer(newState('easy', p), { spots: { 3: 'bounce' } })), `The cart came off at x = 3. Check how many times that factor repeats: odd passes through, even bounces.`);
  const fp = C.makeProblem(1, [0, 2, -3], [], { tmpl: 'gcf', h1: 'a', h2: 'b' });
  assert.strictEqual(msg(answer(newState('factor', fp), { spots: { '-3': null } })), `The cart came off at x = ${M}3. There is a zero there that is not marked yet.`);
  assert.strictEqual(msg(answer(newState('factor', fp), { spots: { 1: 'bounce' } })), 'The cart came off at x = 1. That spot is not a zero. Re-check your factoring.'); }

/* ---------- the explanation after a ride ---------- */
{ const p = C.makeProblem(-2, [-3, 1, 1, 4, 4, 4], [], { tmpl: 'easy' }), st = newState('easy', p), t = strip(C.explainHTML(st));
  assert.ok(!/f\(x\)/.test(t), 'easy mode already showed the factored form'); assert.ok(t.includes('degree 6 is even and the leading coefficient is negative, so the ends point the same way: the left end goes down and the right end goes down.'));
  assert.ok(t.includes(`x = ${M}3 comes from (x + 3). The exponent is 1 (odd), so the track passes straight through.`)); assert.ok(t.includes(`x = 1 comes from (x ${M} 1)^2. The exponent is 2 (even), so the track bounces off the axis.`));
  assert.ok(t.includes(`x = 4 comes from (x ${M} 4)^3. The exponent is 3 (odd), so the track passes through with a flat spot.`));
  const q = C.makeProblem(1, [2], [{ b: 0, c: 9 }], { tmpl: 'cube' }), fs = newState('factor', q), t2 = strip(C.explainHTML(fs));
  assert.ok(t2.startsWith(`f(x) = (x ${M} 2)(x^2 + 9)`), 'factor mode shows the factoring'); assert.ok(t2.includes('x^2 + 9 has no real zeros, so the track never touches the axis because of it. It still counts toward the degree.')); assert.ok(t2.includes('degree 3 is odd and the leading coefficient is positive, so the ends point opposite ways: the left end goes down and the right end goes up.')); }

/* ---------- hints ---------- */
{ const p = C.genEasy(3), h = C.hintsFor(p, 'easy'); assert.strictEqual(h.length, 3); assert.ok(h[0].includes(`<b>${p.degree}</b>`) && h[0].includes(`<b>${C.fmt(p.a)}</b>`), 'degree and leading coefficient'); assert.ok(/Ends rule/.test(h[1]) && /Zeros rule/.test(h[2]));
  const f = C.genFactor(2, null), g = C.hintsFor(f, 'factor'); assert.strictEqual(g.length, 4); assert.strictEqual(g[0], f.h1); assert.strictEqual(g[1], f.h2); assert.ok(g[2].includes('The leading term is') && /Ends rule/.test(g[2])); assert.ok(/odd number of times passes through/.test(g[3])); }

/* ---------- dealing a ride ---------- */
{ C.setRandom(seeded(5)); const run = C.newRun('factor'); assert.deepStrictEqual([run.ride, run.total, run.results, run.errors], [0, 0, [], { ends: 0, behavior: 0, zeros: 0 }]);
  for (let i = 0; i < 8; i++) { run.ride = i; C.deal(run); assert.ok(run.prob && run.track && run.hintList.length === 4 && run.phase === 'edit' && run.wrong === 0 && run.hints === 0); assert.deepStrictEqual([run.sel, run.spots], [{ left: null, right: null }, {}]); assert.strictEqual(run.spotXs.length, 13); }
  const e = C.newRun('easy'); C.deal(e); assert.deepStrictEqual(e.spotXs, e.prob.lin.map(z => z.r), 'easy mode: a spot for each zero, and nothing to find'); assert.strictEqual(e.hintList.length, 3); }
{ // the same sequence from the same seed; different when the generator is the real one
  const seq = seed => { C.setRandom(seeded(seed)); const out = []; for (const mode of ['easy', 'factor']) { const r = C.newRun(mode); for (let i = 0; i < 8; i++) { r.ride = i; C.deal(r); out.push(JSON.stringify(r.prob.coeffs)); } } return out.join('|'); };
  assert.strictEqual(seq(11), seq(11)); assert.notStrictEqual(seq(11), seq(12)); C.setRandom(null); const free = C.genEasy(0); assert.ok(free.degree >= 3, 'the real generator works again'); }

/* ---------- a whole run: what it earns ---------- */
{ C.setRandom(seeded(99)); const earn = (mode, wrongPer, hintPer) => { const run = C.newRun(mode); let chips = 0, stars = 0; for (let i = 0; i < C.RIDES; i++) { run.ride = i; C.deal(run); const s = C.starsFor(wrongPer, hintPer); stars += s; chips += C.payFor(mode, s); } return { stars, chips }; };
  assert.deepStrictEqual(earn('easy', 0, 0), { stars: 24, chips: 240 }, 'a perfect run of Factored form'); assert.deepStrictEqual(earn('factor', 0, 0), { stars: 24, chips: 480 }, 'a perfect run of Factor first');
  assert.deepStrictEqual(earn('factor', 1, 1), { stars: 8, chips: 160 }, 'a derail and a hint on every ride: a star each'); assert.deepStrictEqual(earn('easy', 3, 0), { stars: 8, chips: 80 }, 'it always pays something once a ride is finished'); }
console.log(`coaster tests passed (${easyCount + factorCount} problems, ${tracks} tracks, ${rides} answers each tried right and several ways wrong)`);
