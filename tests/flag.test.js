// Run with: node tests/flag.test.js
const assert = require('assert');
const Flag = require('../js/flag.js');
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

/* ---------- the specification (Executive Order 10834) ---------- */
const S = Flag.SPEC;
assert.strictEqual(S.fly / S.hoist, 1.9, 'the flag is 1.9 times as long as it is tall');
assert.strictEqual(S.stripes, 13);
assert.ok(near(S.union.hoist, 7 / 13) && near(S.union.hoist, 0.5385, 1e-4), 'the union is seven stripes tall (0.5385)');
assert.strictEqual(S.union.fly, 0.76, 'and 0.76 of the hoist wide');
assert.strictEqual(S.starDiameter, 0.0616);
assert.deepStrictEqual(Flag.COLORS, { red: '#B22234', white: '#FFFFFF', blue: '#3C3B6E' });
assert.deepStrictEqual(S.starRowCounts, [6, 5, 6, 5, 6, 5, 6, 5, 6]);
assert.strictEqual(S.starRowCounts.reduce((a, b) => a + b, 0), 50, 'fifty stars');
assert.strictEqual(S.starRows, 9);

/* ---------- the stars ---------- */
const stars = Flag.stars();
assert.strictEqual(stars.length, 50);
const rows = {}; stars.forEach(s => (rows[s.row] = rows[s.row] || []).push(s));
assert.deepStrictEqual(Object.keys(rows).map(r => rows[r].length), [6, 5, 6, 5, 6, 5, 6, 5, 6], 'nine rows, alternating six and five');
const C = S.union.hoist, D = S.union.fly;
Object.entries(rows).forEach(([r, list]) => {
  const y = (Number(r) + 1) * C / 10;
  list.forEach(s => assert.ok(near(s.y, y), `row ${r} is at ${y.toFixed(4)}`));
  const six = list.length === 6;
  list.forEach((s, k) => assert.ok(near(s.x, (six ? 2 * k + 1 : 2 * k + 2) * D / 12), 'columns are 1/12 of the union wide'));
  // the five-star rows sit exactly between the stars of the six-star rows
  if (!six) list.forEach((s, k) => assert.ok(near(s.x, (rows[Number(r) - 1][k].x + rows[Number(r) - 1][k + 1].x) / 2), 'a five-star row is staggered'));
});
assert.ok(near(stars[0].x, D / 12) && near(stars[0].y, C / 10), 'the first star is D/12 in and C/10 down (0.0633 and 0.0538)');
assert.ok(near(D / 12, 0.0633, 1e-4) && near(C / 10, 0.0538, 1e-4));
stars.forEach(s => { assert.ok(s.x > 0 && s.x < D && s.y > 0 && s.y < C, 'every star is inside the union'); });
const R = S.starDiameter / 2;
assert.ok(stars[0].x - R > 0 && stars[0].y - R > 0 && stars[49].x + R < D && stars[49].y + R < C, 'with room around them');
const dist = Math.hypot(stars[0].x - stars[1].x, 0), gap = stars[1].x - stars[0].x;
assert.ok(near(gap, D / 6), 'stars in a row are 1/6 of the union apart');
assert.ok(gap > S.starDiameter * 1.5, 'and never touch');

/* ---------- the drawing: what goes where ---------- */
function draw(w, h) {
  const rects = [], stars = []; let fill = null, path = [];
  const ctx = new Proxy({}, {
    get: (t, k) => k === 'fillStyle' ? fill : k === 'fillRect' ? (x, y, ww, hh) => rects.push({ x, y, w: ww, h: hh, color: fill })
      : k === 'beginPath' ? () => { path = []; } : k === 'moveTo' || k === 'lineTo' ? (x, y) => path.push([x, y])
      : k === 'fill' ? () => stars.push({ pts: path.slice(), color: fill }) : () => {},
    set: (t, k, v) => { if (k === 'fillStyle') fill = v; return true; },
  });
  Flag.draw(ctx, w, h);
  return { rects, stars };
}
const W = 608, H = 320;                                   // 1.9 : 1, like the flag on the classroom wall
const { rects, stars: drawn } = draw(W, H);
const bands = rects.slice(0, 13);
assert.strictEqual(bands.length, 13, 'thirteen stripes');
bands.forEach((b, i) => {
  assert.strictEqual(b.color, i % 2 === 0 ? '#B22234' : '#FFFFFF', `stripe ${i + 1} is ${i % 2 === 0 ? 'red' : 'white'}`);
  assert.ok(near(b.y, i * H / 13) && b.w === W, 'full width, each 1/13 of the height');
});
assert.strictEqual(bands.filter(b => b.color === '#B22234').length, 7, 'seven red stripes');
assert.strictEqual(bands.filter(b => b.color === '#FFFFFF').length, 6, 'six white stripes');
assert.strictEqual(bands[0].color, bands[12].color, 'red at the top and red at the bottom');
const union = rects[13];
assert.strictEqual(union.color, '#3C3B6E');
assert.deepStrictEqual([union.x, union.y], [0, 0], 'the blue union is in the TOP LEFT corner of the picture');
assert.ok(near(union.w, 0.76 * H) && near(union.h, 7 * H / 13), 'seven stripes tall, 0.76 of the height wide');
assert.ok(near(union.y + union.h, bands[6].y + H / 13), 'it ends exactly at the bottom edge of the seventh stripe (a red one)');
assert.strictEqual(bands[6].color, '#B22234');
assert.ok(union.w < W / 2, 'and covers well under half the width');
assert.strictEqual(drawn.length, 50, 'fifty stars drawn');
drawn.forEach(s => { assert.strictEqual(s.color, '#FFFFFF'); assert.strictEqual(s.pts.length, 10, 'a five-pointed star has ten corners'); });
// every star has one point straight up, and is a regular pentagram
drawn.forEach((s, i) => {
  const cx = stars[i].x * H, cy = stars[i].y * H;
  const top = s.pts[0]; assert.ok(near(top[0], cx, 1e-6) && top[1] < cy, 'the first point is straight up from the center');
  const outer = s.pts.filter((p, k) => k % 2 === 0).map(p => Math.hypot(p[0] - cx, p[1] - cy));
  outer.forEach(d => assert.ok(near(d, R * H, 1e-6), 'five points at the same distance'));
  const inner = s.pts.filter((p, k) => k % 2 === 1).map(p => Math.hypot(p[0] - cx, p[1] - cy));
  inner.forEach(d => assert.ok(near(d / (R * H), 0.381966, 1e-5), 'and five notches at 0.382 of that'));
  const low = s.pts.filter((p, k) => k % 2 === 0 && p[1] > cy); assert.strictEqual(low.length, 2, 'two points point down-left and down-right: it is not upside down');
});
// the stars lie inside the blue and nowhere else
drawn.forEach(s => s.pts.forEach(([x, y]) => assert.ok(x > 0 && x < union.w && y > 0 && y < union.h, 'every star corner is inside the union')));
// the same picture at other sizes scales exactly
const small = draw(190, 100);
assert.ok(near(small.rects[13].w / 100, 0.76) && near(small.rects[13].h / 100, 7 / 13));
console.log('flag tests passed');
