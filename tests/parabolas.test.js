// Run with: node tests/parabolas.test.js
const assert = require('assert');
const P = require('../js/parabolas.js');

// a hand-checked example: y = 2x² + 8x + 5 has axis x = -2, vertex (-2, -3), y-intercept (0, 5)
const ex = { a: 2, b: 8, c: 5, h: -2, k: -3 };
assert.strictEqual(P.fmtPoly(ex), 'y = 2x² + 8x + 5');
assert.strictEqual(P.fOf(ex, -2), -3);
assert.strictEqual(P.fOf(ex, 0), 5);
const sol = P.solution(ex);
assert.strictEqual(sol.axis, -2);
assert.deepStrictEqual(sol.vertex, [-2, -3]);
assert.deepStrictEqual(sol.yint, [0, 5]);
assert.strictEqual(sol.lines[0], 'x = -b / (2a) = -8 / (2 · 2) = -2');
assert.strictEqual(sol.lines[1], 'y = a·x² + b·x + c = 2·(-2)² + 8·(-2) + 5 = -3');

// formatting with negatives and a missing constant
assert.strictEqual(P.fmtPoly({ a: -1, b: 4, c: -7 }), 'y = -x² + 4x - 7');
assert.strictEqual(P.fmtPoly({ a: 1, b: -6, c: 0 }), 'y = x² - 6x');

// checks are judged on the student's own work
let r = P.check(ex, { axis: -2, vy: -3, yint: 5 });
assert.deepStrictEqual(r, { axis: true, vertex: true, yint: true, ok: true });
// the classic sign slip: axis +2 instead of -2. The vertex is still "right" for x = 2 (y = 29)...
r = P.check(ex, { axis: 2, vy: P.fOf(ex, 2), yint: 5 });
assert.deepStrictEqual([r.axis, r.vertex, r.yint, r.ok], [false, true, true, false]);
// right axis, wrong vertex height
r = P.check(ex, { axis: -2, vy: 3, yint: 5 });
assert.deepStrictEqual([r.axis, r.vertex, r.yint, r.ok], [true, false, true, false]);
// wrong y-intercept (used b instead of c)
r = P.check(ex, { axis: -2, vy: -3, yint: 8 });
assert.deepStrictEqual([r.axis, r.vertex, r.yint, r.ok], [true, true, false, false]);

// every problem the table can deal
const all = P.candidates();
assert.ok(all.length > 300, `plenty of variety (${all.length})`);
const seenA = new Set();
all.forEach(p => {
  seenA.add(p.a);
  // built from vertex form: expands back to the polynomial
  assert.strictEqual(P.fOf(p, p.h), p.k, 'vertex height');
  assert.strictEqual(p.b, -2 * p.a * p.h);
  assert.strictEqual(-p.b / (2 * p.a), p.h, 'axis is a whole number');
  assert.strictEqual(P.fOf(p, 0), p.c);
  assert.notStrictEqual(p.a, 0);
  assert.notStrictEqual(p.b, 0, 'b is never 0');
  assert.ok(Math.abs(p.h) <= 4 && Math.abs(p.k) <= 9 && Math.abs(p.c) <= 15);
  // every answer fits the -15..15 palette
  [p.h, p.k, p.c].forEach(v => assert.ok(Math.abs(v) <= P.PALETTE_MAX));
  // a symmetric point: f(2h - x) = f(x), so the mirror of the y-intercept is (2h, c)
  assert.strictEqual(P.fOf(p, 2 * p.h), p.c);
  assert.ok(P.check(p, { axis: p.h, vy: p.k, yint: p.c }).ok);
  // the window contains everything we plot
  const v = P.view(p);
  [[p.h, p.k], [0, p.c], [2 * p.h, p.c]].forEach(([x, y]) => {
    assert.ok(x >= v.xmin && x <= v.xmax && y >= v.ymin && y <= v.ymax, `(${x}, ${y}) in view`);
  });
  assert.ok(v.ymax - v.ymin >= 12);
});
assert.deepStrictEqual([...seenA].sort((x, y) => x - y), [-3, -2, -1, 1, 2, 3], 'opens up and down, narrow and wide');

// generation draws from that list and is reproducible
for (let i = 0; i < 500; i++) {
  const p = P.generate();
  assert.ok(all.some(q => q.a === p.a && q.h === p.h && q.k === p.k));
}
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
assert.deepStrictEqual(P.generate(3, seeded(9)), P.generate(3, seeded(9)));

// the curve passes through the vertex and the mirror points
const pts = P.curve(2, -2, -3, -9, 9, 1);
assert.strictEqual(pts.length, 19);
assert.deepStrictEqual(pts.find(([x]) => x === -2), [-2, -3]);
assert.deepStrictEqual(pts.find(([x]) => x === 0), [0, 5]);
assert.deepStrictEqual(pts.find(([x]) => x === -4), [-4, 5], 'mirror of the y-intercept');

// ---- vertex form ----
assert.strictEqual(P.fmtVertexForm({ a: 2, h: -3, k: -1 }), 'y = 2(x + 3)² - 1');
assert.strictEqual(P.fmtVertexForm({ a: 1, h: 2, k: 5 }), 'y = (x - 2)² + 5');
assert.strictEqual(P.fmtVertexForm({ a: -1, h: 4, k: 0 }), 'y = -(x - 4)²');
assert.strictEqual(P.fmtVertexForm({ a: -3, h: -1, k: 7 }), 'y = -3(x + 1)² + 7');
const vex = { a: 2, h: -3, k: -1, b: 12, c: 17 };
const vs = P.solutionVertexForm(vex);
assert.deepStrictEqual([vs.axis, vs.vertex, vs.yint], [-3, [-3, -1], [0, 17]]);
assert.strictEqual(vs.lines[0], '(x + 3) means h = -3, so the axis of symmetry is x = -3');
assert.strictEqual(vs.lines[2], 'y = a(0 - h)² + k = 2·(0 - (-3))² + (-1) = 17, so the y-intercept is (0, 17)');
// the classic sign slip: reading (x + 3) as x = 3. The vertex height k is still read correctly.
r = P.checkVertexForm(vex, { axis: 3, vy: -1, yint: 17 });
assert.deepStrictEqual([r.axis, r.vertex, r.yint, r.ok], [false, true, true, false]);
r = P.checkVertexForm(vex, { axis: -3, vy: -1, yint: 17 });
assert.strictEqual(r.ok, true);
r = P.checkVertexForm(vex, { axis: -3, vy: -1, yint: -1 });   // forgot to plug in x = 0 (just copied k)
assert.deepStrictEqual([r.axis, r.vertex, r.yint], [true, true, false]);
r = P.checkVertexForm(vex, { axis: -3, vy: 17, yint: 17 });
assert.strictEqual(r.vertex, false);
// every problem: the displayed vertex form really is the same parabola as the standard form,
// and the worked steps land on the same answers
all.forEach(p => {
  const text = P.fmtVertexForm(p);
  const m = text.match(/^y = (-?\d*)\(x ([+-]) (\d+)\)²(?: ([+-]) (\d+))?$/);
  assert.ok(m, `parses: ${text}`);
  const a = m[1] === '' ? 1 : m[1] === '-' ? -1 : +m[1];
  const h = m[2] === '+' ? -m[3] : +m[3];
  const k = m[4] === undefined ? 0 : (m[4] === '-' ? -m[5] : +m[5]);
  assert.deepStrictEqual([a, h, k], [p.a, p.h, p.k], `round-trips: ${text}`);
  assert.ok(P.checkVertexForm(p, { axis: p.h, vy: p.k, yint: p.c }).ok);
  const sol = P.solutionVertexForm(p);
  assert.deepStrictEqual([sol.axis, sol.vertex, sol.yint], [p.h, [p.h, p.k], [0, p.c]]);
  assert.strictEqual(p.a * (0 - p.h) ** 2 + p.k, p.c, 'plugging in x = 0 gives c');
});

// three difficulty levels, each inside the next; Hard is everything the table can deal
assert.deepStrictEqual(P.TIERS.map(t => t.name), ['Easy', 'Medium', 'Hard']);
const lv = [1, 2, 3].map(l => P.candidates(l)), key = q => `${q.a},${q.h},${q.k}`;
assert.deepStrictEqual(lv.map(l => l.length), [88, 316, 552], 'how many problems at each level');
assert.deepStrictEqual(P.candidates().map(key), lv[2].map(key), 'with no level, everything (Hard)');
[0, 1].forEach(i => { const bigger = new Set(lv[i + 1].map(key)); assert.ok(lv[i].every(q => bigger.has(key(q))), `every ${P.TIERS[i].name} problem is also a ${P.TIERS[i + 1].name} one`); });
P.TIERS.forEach((t, i) => lv[i].forEach(q => {
  assert.ok(t.a.includes(q.a) && Math.abs(q.h) >= 1 && Math.abs(q.h) <= t.hMax && Math.abs(q.k) <= t.kMax, `${key(q)} belongs to ${t.name}`);
  assert.ok(Math.abs(q.c) <= 15 && q.b === -2 * q.a * q.h && q.c === q.a * q.h * q.h + q.k, `${key(q)} is a valid, whole-number problem`);
}));
assert.deepStrictEqual([...new Set(lv[0].map(q => q.a))].sort(), [-1, 1], 'Easy keeps a to 1 or -1');
assert.ok(Math.max(...lv[0].map(q => Math.abs(q.h))) <= 2 && Math.max(...lv[1].map(q => Math.abs(q.a))) === 2);
for (let level = 1; level <= 3; level++) for (let i = 0; i < 300; i++) { const p = P.generate(level); assert.strictEqual(p.level, level); assert.ok(lv[level - 1].some(q => key(q) === key(p)), `a level ${level} problem comes from level ${level}`); }
assert.deepStrictEqual(P.generate(1, seeded(4)), P.generate(1, seeded(4)));
// economy: a correct sketch pays by level at both graph tables, and a wrong one costs nothing
assert.deepStrictEqual([1, 2, 3].map(l => P.payout(l)), [25, 50, 100]);
assert.deepStrictEqual([1, 2, 3].map(l => P.payout(l, 'vertex')), [25, 50, 100]);
assert.strictEqual(P.WAGER, undefined); assert.strictEqual(P.MULT, undefined);

console.log(`parabola tests passed (${all.length} problems)`);
