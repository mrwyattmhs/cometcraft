// Run with: node tests/lines.test.js
const assert = require('assert');
const L = require('../js/lines.js');
const E = require('../js/economy.js');
const M = '\u2212';
const same = (a, b, msg) => assert.ok(a === b, `${msg} (${a} vs ${b})`);   // === treats -0 and 0 as equal, as the game does; assert.strictEqual does not

/* ---------- the three forms, and what they pay ---------- */
assert.deepStrictEqual(L.FORMS.map(f => f.id), ['slope', 'point', 'standard']);
assert.deepStrictEqual(L.FORMS.map(f => f.name), ['Slope-intercept', 'Point-slope', 'Standard form']);
assert.strictEqual(L.formById('point').name, 'Point-slope'); assert.strictEqual(L.formById('nope'), null);
assert.strictEqual(L.PAY, 25, 'every line pays 25 chips'); assert.strictEqual(E.PAY.lines, 25);
assert.strictEqual(L.GRID, 10); assert.strictEqual(L.MISTAKES_ALLOWED, 1);

/* ---------- saying a line ---------- */
const eq = (form, o) => L.equation({ form, ...o });
[[{ p: 1, q: 1 }, 2, 'y = x + 2'], [{ p: -1, q: 1 }, -3, `y = ${M}x ${M} 3`], [{ p: 3, q: 1 }, 1, 'y = 3x + 1'], [{ p: -4, q: 1 }, 5, `y = ${M}4x + 5`],
  [{ p: 2, q: 3 }, -5, `y = (2/3)x ${M} 5`], [{ p: -3, q: 2 }, 4, `y = ${M}(3/2)x + 4`], [{ p: 1, q: 4 }, -1, `y = (1/4)x ${M} 1`]]
  .forEach(([m, b, want]) => assert.strictEqual(eq('slope', { m, b }), want));
[[{ p: 1, q: 1 }, 2, 3, `y ${M} 3 = (x ${M} 2)`], [{ p: -2, q: 1 }, -1, -4, `y + 4 = ${M}2(x + 1)`], [{ p: 3, q: 4 }, 5, -2, `y + 2 = (3/4)(x ${M} 5)`],
  [{ p: -1, q: 1 }, 3, 6, `y ${M} 6 = ${M}(x ${M} 3)`], [{ p: -2, q: 3 }, -7, 7, `y ${M} 7 = ${M}(2/3)(x + 7)`]]
  .forEach(([m, x1, y1, want]) => assert.strictEqual(eq('point', { m, x1, y1 }), want));
[[1, 1, 5, 'x + y = 5'], [3, -4, 12, `3x ${M} 4y = 12`], [2, -1, -6, `2x ${M} y = ${M}6`], [1, -6, 6, `x ${M} 6y = 6`], [6, 5, -30, `6x + 5y = ${M}30`]]
  .forEach(([A, B, C, want]) => assert.strictEqual(eq('standard', { A, B, C }), want));
assert.deepStrictEqual([{ p: 2, q: 1 }, { p: -3, q: 2 }, { p: 1, q: 4 }].map(L.slopeValue), ['2', `${M}3/2`, '1/4']);
assert.deepStrictEqual([{ p: 2, q: 3 }, { p: -3, q: 1 }, { p: -1, q: 4 }].map(L.countText), ['up 2 and right 3', 'down 3 and right 1', 'down 1 and right 4']);

/* ---------- the problems there are ---------- */
assert.strictEqual(L.SLOPES.length, 22, 'slopes p/q in lowest terms: p from -4 to 4 (not 0), q from 1 to 4');
assert.ok(L.SLOPES.every(({ p, q }) => p !== 0 && q >= 1 && q <= 4 && Math.abs(p) <= 4 && (q === 1 || [2, 3, 4].every(d => !(Math.abs(p) % d === 0 && q % d === 0)))), 'all in lowest terms');
assert.deepStrictEqual(['slope', 'point', 'standard'].map(f => L.candidates(f).length), [352, 4312, 196], 'how many problems in each form');
assert.strictEqual(new Set(L.candidates('slope').map(p => p.eq)).size, 352, 'no two slope-intercept problems are the same');
assert.strictEqual(new Set(L.candidates('standard').map(p => p.eq)).size, 196);
assert.deepStrictEqual(L.candidates('nope'), []); assert.strictEqual(L.generate('nope'), null);
const seeded = seed => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
assert.deepStrictEqual(L.generate('point', seeded(5)), L.generate('point', seeded(5))); assert.ok(L.candidates('point').includes(L.generate('point')));
const seen = new Set(); const rg = seeded(9); for (let i = 0; i < 300; i++) seen.add(L.generate('slope', rg).eq); assert.ok(seen.size > 120, 'a wide variety turns up');

/* ---------- each problem: the equation says what the problem holds, the points are on the line, the steps are right ---------- */
const parseSlope = (sign, paren, num, den, plain) => (paren ? { p: (sign ? -1 : 1) * +num, q: +den } : { p: (sign ? -1 : 1) * (plain === '' ? 1 : +plain), q: 1 });
const unminus = s => s.replace(new RegExp(M, 'g'), '-');
let steps = 0;
for (const form of ['slope', 'point', 'standard']) {
  for (const pr of L.candidates(form)) {
    assert.strictEqual(pr.form, form); assert.strictEqual(pr.eq, L.equation(pr));
    let m;
    if (form === 'slope') {
      const r = new RegExp(`^y = (${M}?)(?:\\((\\d+)/(\\d+)\\)|(\\d*))x (\\+|${M}) (\\d+)$`).exec(pr.eq); assert.ok(r, pr.eq);
      m = parseSlope(r[1], r[2], r[2], r[3], r[4]); assert.deepStrictEqual(m, pr.m, pr.eq); assert.strictEqual((r[5] === '+' ? 1 : -1) * +r[6], pr.b, pr.eq);
      assert.ok(pr.b !== 0 && Math.abs(pr.b) <= 8);
    } else if (form === 'point') {
      const r = new RegExp(`^y (\\+|${M}) (\\d+) = (${M}?)(?:\\((\\d+)/(\\d+)\\)|(\\d*))\\(x (\\+|${M}) (\\d+)\\)$`).exec(pr.eq); assert.ok(r, pr.eq);
      m = parseSlope(r[3], r[4], r[4], r[5], r[6]); assert.deepStrictEqual(m, pr.m, pr.eq);
      assert.strictEqual((r[1] === '+' ? -1 : 1) * +r[2], pr.y1, `${pr.eq}: y ${r[1]} ${r[2]} means y1 = ${pr.y1}`); assert.strictEqual((r[7] === '+' ? -1 : 1) * +r[8], pr.x1, `${pr.eq}: x1`);
    } else {
      const r = new RegExp(`^(\\d*)x (\\+|${M}) (\\d*)y = (${M}?\\d+)$`).exec(pr.eq); assert.ok(r, pr.eq);
      assert.strictEqual(r[1] === '' ? 1 : +r[1], pr.A); assert.strictEqual((r[2] === '+' ? 1 : -1) * (r[3] === '' ? 1 : +r[3]), pr.B); assert.strictEqual(+unminus(r[4]), pr.C);
      assert.ok(pr.A >= 1 && pr.B !== 0 && pr.C !== 0, 'A is positive, and C is not zero (or both intercepts would be the origin)');
    }
    // the two points: in the grid, different, and on the line the equation describes
    const [a, b] = pr.points;
    assert.ok(a[0] !== b[0] || a[1] !== b[1]); [a, b].forEach(([x, y]) => assert.ok(Math.abs(x) <= 10 && Math.abs(y) <= 10 && Number.isInteger(x) && Number.isInteger(y), `${pr.eq}: ${a} ${b} on the plane`));
    if (form === 'slope') { [a, b].forEach(([x, y]) => same((y - pr.b) * pr.m.q, pr.m.p * x, `${pr.eq}: ${x},${y} is on the line`)); assert.deepStrictEqual(a, [0, pr.b]); }
    if (form === 'point') { [a, b].forEach(([x, y]) => same((y - pr.y1) * pr.m.q, pr.m.p * (x - pr.x1), `${pr.eq}: ${x},${y} is on the line`)); assert.deepStrictEqual(a, [pr.x1, pr.y1]); }
    if (form === 'standard') {
      [a, b].forEach(([x, y]) => same(pr.A * x + pr.B * y, pr.C, `${pr.eq}: ${x},${y} is on the line`));
      assert.ok(a[1] === 0 && b[0] === 0 && a[0] !== 0 && b[1] !== 0, 'the x-intercept, then the y-intercept'); assert.strictEqual(a[0], pr.C / pr.A); assert.strictEqual(b[1], pr.C / pr.B);
      assert.ok(Number.isInteger(pr.C / pr.A) && Number.isInteger(pr.C / pr.B), 'the divisions come out even');
    }
    // the steps
    assert.strictEqual(pr.steps.length, 2);
    pr.steps.forEach(st => { steps++; assert.ok(st.title && st.prompt && st.hint, 'every step has a title, a prompt and a hint'); assert.ok(!/NaN|undefined|null/.test(st.prompt + st.hint + (st.done || '')), `${pr.eq}: no junk in the words`); });
    assert.deepStrictEqual(pr.steps.map(s => s.kind), form === 'standard' ? ['point', 'point'] : ['point', 'slope'], 'what each form asks for');
    if (form === 'standard') assert.ok(pr.steps[0].prompt.includes(`${unminus(String(pr.C)).replace(/^/, pr.C < 0 ? M : '').replace('-', '')} \u00f7 ${pr.A}`) || pr.steps[0].prompt.includes(`${pr.C < 0 ? M + -pr.C : pr.C} \u00f7 ${pr.A}`), `${pr.eq}: the first step says to divide C by A`);
    if (form !== 'standard') assert.ok(pr.steps[1].prompt.includes(`rise ${pr.m.p < 0 ? M + -pr.m.p : pr.m.p}, run ${pr.m.q}`) && pr.steps[1].prompt.includes(L.countText(pr.m)), `${pr.eq}: the slope step says rise, run and how to count`);
  }
}

/* ---------- checking clicks: exactly the right points are accepted ---------- */
const all = []; for (let x = -10; x <= 10; x++) for (let y = -10; y <= 10; y++) all.push([x, y]);
for (const form of ['slope', 'point', 'standard']) {
  L.candidates(form).forEach((pr, idx) => {
    if (form === 'point' && idx % 7) return;                              // (a seventh of the point-slope problems is plenty of coverage; all of the others are checked)
    // step 0: exactly one point is right
    const hits0 = all.filter(([x, y]) => L.check(pr, 0, [], x, y).ok); assert.deepStrictEqual(hits0, [pr.steps[0].target], `${pr.eq}: only ${pr.steps[0].target} is right for step 1`);
    const first = pr.steps[0].target, placed = [{ x: first[0], y: first[1] }];
    const r0 = L.check(pr, 0, [], first[0], first[1]); assert.ok(r0.ok && r0.say.length > 5);
    const wrong = L.check(pr, 0, [], first[0] + 1 > 10 ? first[0] - 1 : first[0] + 1, first[1]); assert.ok(!wrong.ok && wrong.hint.length > 10, 'a wrong click gets a hint');
    if (form === 'standard') {
      const t1 = pr.steps[1].target; assert.deepStrictEqual(all.filter(([x, y]) => L.check(pr, 1, placed, x, y).ok), [t1], `${pr.eq}: only ${t1} is right for step 2`);
      assert.ok(!L.check(pr, 1, placed, first[0], first[1]).ok, 'the first intercept is not the second one'); return;
    }
    // step 1: any other whole-number point on the line is right; the points one count away say so
    const on = all.filter(([x, y]) => L.check(pr, 1, placed, x, y).ok);
    const expect = all.filter(([x, y]) => (x !== first[0] || y !== first[1]) && (y - first[1]) * pr.m.q === pr.m.p * (x - first[0]));
    assert.deepStrictEqual(on, expect, `${pr.eq}: every other point on the line is accepted, and nothing else`); assert.ok(on.length >= 1);
    const count = on.filter(([x, y]) => L.check(pr, 1, placed, x, y).count); assert.deepStrictEqual(count, L.neighbours(first[0], first[1], pr.m).sort((a, b) => a[0] - b[0]), `${pr.eq}: the points one count away are counted as such`);
    assert.ok(L.check(pr, 1, placed, pr.steps[1].target[0], pr.steps[1].target[1]).count);
    const same = L.check(pr, 1, placed, first[0], first[1]); assert.ok(!same.ok && /already plotted/.test(same.hint), 'clicking the first point again is not the second point');
    const near = L.neighbours(first[0], first[1], pr.m)[0], offs = [[near[0], near[1] + 1], [near[0], near[1] - 1]].filter(([x, y]) => Math.abs(y) <= 10)[0];
    const off = L.check(pr, 1, placed, offs[0], offs[1]); assert.ok(!off.ok && /rise/.test(off.hint), 'a point just off the line is wrong, and the hint says rise and run');
  });
}
assert.ok(!L.check(L.generate('slope', () => 0), 0, [], 11, 0).ok && /on the grid/.test(L.check(L.generate('slope', () => 0), 0, [], 11, 0).hint), 'off the grid');
assert.ok(!L.check(L.generate('slope', () => 0), 0, [], 0.5, 1).ok, 'only whole-number points count');

/* ---------- the answer shown when a student is stuck ---------- */
for (const form of ['slope', 'point', 'standard']) L.candidates(form).forEach((pr, idx) => {
  if (idx % 5) return;
  const a0 = L.answer(pr, 0, []); assert.deepStrictEqual(a0, pr.steps[0].target);
  const placed = [{ x: a0[0], y: a0[1] }], a1 = L.answer(pr, 1, placed);
  assert.ok(L.check(pr, 1, placed, a1[0], a1[1]).ok, `${pr.eq}: the answer it shows is right`);
  if (form !== 'standard') assert.ok(L.check(pr, 1, placed, a1[0], a1[1]).count, 'and it is one count of the slope away'); assert.ok(Math.abs(a1[0]) <= 10 && Math.abs(a1[1]) <= 10);
});

/* ---------- drawing the line all the way across ---------- */
assert.deepStrictEqual(L.lineEnds([0, 0], [1, 1]), [[-10, -10], [10, 10]]); assert.deepStrictEqual(L.lineEnds([3, 4], [5, 4]), [[-10, 4], [10, 4]], 'a flat line'); assert.deepStrictEqual(L.lineEnds([2, -3], [2, 5]), [[2, -10], [2, 10]], 'a straight-up line');
const half = L.lineEnds([0, 0], [4, 2]); assert.deepStrictEqual(half, [[-10, -5], [10, 5]]);
const steep = L.lineEnds([0, 0], [1, 5]); assert.deepStrictEqual(steep.map(p => p.map(v => +v.toFixed(9))), [[-2, -10], [2, 10]], 'a steep line leaves through the top and bottom');
for (const form of ['slope', 'point', 'standard']) L.candidates(form).forEach((pr, idx) => {
  if (idx % 9) return;
  const [p, q] = L.lineEnds(pr.points[0], pr.points[1]); assert.ok(p && q);
  [p, q].forEach(([x, y]) => { assert.ok(Math.abs(x) <= 10 + 1e-9 && Math.abs(y) <= 10 + 1e-9, 'inside the plane'); assert.ok(Math.abs(Math.abs(x) - 10) < 1e-9 || Math.abs(Math.abs(y) - 10) < 1e-9, 'and touching its edge'); });
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  assert.ok(Math.abs(cross(pr.points[0], pr.points[1], p)) < 1e-6 && Math.abs(cross(pr.points[0], pr.points[1], q)) < 1e-6, `${pr.eq}: the ends are on the line`);
});

/* ---------- the words at the end ---------- */
assert.deepStrictEqual(L.explain({ form: 'slope', m: { p: 2, q: 3 }, b: -5 }), [`The y-intercept is b = ${M}5, so the line crosses the y-axis at (0, ${M}5).`, 'The slope is 2/3: from there, up 2 and right 3.']);
assert.deepStrictEqual(L.explain({ form: 'point', m: { p: -3, q: 1 }, x1: 2, y1: 4 }), ['The point is (2, 4).', `The slope is ${M}3: from there, down 3 and right 1.`]);
assert.deepStrictEqual(L.explain({ form: 'standard', A: 3, B: -4, C: 12 }), ['x-intercept: 12 \u00f7 3 = 4, the point (4, 0).', `y-intercept: 12 \u00f7 ${M}4 = ${M}3, the point (0, ${M}3).`]);
console.log(`lines tests passed (${L.candidates('slope').length + L.candidates('point').length + L.candidates('standard').length} problems, ${steps} steps)`);
