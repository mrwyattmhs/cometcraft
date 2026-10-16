// Run with: node tests/blueprint.test.js
const assert = require('assert');
const B = require('../js/blueprint.js');

const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const sorted = a => [...a].sort();
const sameSet = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

/* ---------- the independent check: how many shapes fit these three silhouettes? ---------- */
// Everything that could appear is inside the hull. Try every subset of it and count the ones whose
// silhouettes match. A fair puzzle has exactly one: the shape itself.
function countShapesMatching(cells) {
  const want = B.silhouettes(cells);
  const h = B.hull(want);
  assert.ok(h.length <= 16, 'brute force stays small');
  let matches = 0;
  for (let mask = 1; mask < (1 << h.length); mask++) {
    const sub = h.filter((_, i) => mask & (1 << i));
    const s = B.silhouettes(sub);
    // compare in absolute coordinates: a subset slid to its own corner would differ from the hull's frame
    const abs = (list, f) => list.map(c => f(...c)).sort().join('|');
    const shapeKey = c => c.map(p => p.join(',')).sort().join('|');
    const front = abs(sub, (x, y, z) => `${z},${y}`), side = abs(sub, (x, y, z) => `${x},${y}`), top = abs(sub, (x, y, z) => `${z},${x}`);
    const uniq = a => [...new Set(a.split('|'))].sort().join('|');
    if (uniq(front) === sorted(want.front).join('|') && uniq(side) === sorted(want.side).join('|') && uniq(top) === sorted(want.top).join('|')) matches++;
  }
  return matches;
}

/* ---------- the views, and which way is which ---------- */
// a small shape with all three views different: a 2-wide base along z, with a tower of 2 at the east end
//   cells (x east, y up, z south): base (0,0,0)(0,0,1) at the front, plus (1,0,1) behind it, plus (1,1,1) on top of that
const L = [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1]];
const s = B.silhouettes(L);
assert.deepStrictEqual(s.dims, { x: 2, y: 2, z: 2 });
assert.deepStrictEqual(sorted(s.front), ['0,0', '1,0', '1,1'], 'front: columns are z, up from the floor');
assert.deepStrictEqual(sorted(s.side), ['0,0', '1,0', '1,1'], 'side: columns are x');
assert.deepStrictEqual(sorted(s.top), ['0,0', '1,0', '1,1'], 'top: (z, x)');
const grids = B.viewGrids({ cells: L, dims: s.dims });
assert.deepStrictEqual([grids.front.rows, grids.front.cols], [2, 2]);
// FRONT view as it is drawn (row 0 = top). The tower is at z = 1 (the right-hand column, south), 2 tall.
assert.deepStrictEqual(sorted(grids.front.filled.map(p => p.join(','))), ['0,1', '1,0', '1,1']);
// SIDE view: the tower is at x = 1 (the east, the right-hand column when you stand at the south looking north)
assert.deepStrictEqual(sorted(grids.side.filled.map(p => p.join(','))), ['0,1', '1,0', '1,1']);
// TOP view: the FRONT (west, x = 0) is the bottom row, east (x = 1) the top row; columns run north -> south
assert.deepStrictEqual(sorted(grids.top.filled.map(p => p.join(','))), ['0,1', '1,0', '1,1']);
// a one-block-wide check of the top view's orientation: a block only at the west-front corner shows at the bottom-left
const corner = B.viewGrids({ cells: [[0, 0, 0], [1, 0, 0], [1, 0, 1]], dims: { x: 2, y: 1, z: 2 } });
assert.ok(corner.top.filled.some(([r, c]) => r === 1 && c === 0), 'the west-north block (x=0, z=0) is bottom-left on the top view');
assert.ok(corner.top.filled.some(([r, c]) => r === 0 && c === 1), 'the east-south block (x=1, z=1) is top-right');
// position does not matter, only the shape
assert.deepStrictEqual(sorted(B.silhouettes(L.map(([x, y, z]) => [x + 5, y, z + 3])).front), sorted(s.front));
assert.deepStrictEqual(B.normalize([[5, 2, 7], [6, 2, 7]]), [[0, 0, 0], [1, 0, 0]]);
assert.deepStrictEqual(B.normalize([]), []);

/* ---------- fairness: hidden blocks and ghost blocks ---------- */
const solid3 = []; for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) solid3.push([x, y, z]);
assert.strictEqual(B.isFair(solid3), false, 'a solid cube hides its middle');
const noCenter = solid3.filter(([x, y, z]) => !(x === 1 && y === 1 && z === 1));
assert.strictEqual(B.isFair(noCenter), false, 'a cube with a hollow middle: its silhouettes are the same as the solid cube, so anything inside could be filled');
const diagonal = [[0, 0, 0], [1, 0, 1]];
assert.strictEqual(B.isFair(diagonal), true, 'two blocks on a diagonal show only two squares on top, so no other block fits');
assert.strictEqual(countShapesMatching(diagonal), 1);
// four blocks, none touching a face: every view is a full 2x2 square, so all eight corners of the box fit the views
const checker = [[0, 0, 0], [1, 1, 0], [0, 1, 1], [1, 0, 1]];
assert.strictEqual(B.hull(B.silhouettes(checker)).length, 8, 'the views allow a full 2x2x2 cube');
assert.strictEqual(B.isFair(checker), false, 'so the other four corners are ghost blocks: you could not tell');
assert.ok(countShapesMatching(checker) > 1, 'brute force agrees: many different shapes fit these views');
assert.strictEqual(B.isFair(L), true);
assert.strictEqual(countShapesMatching(L), 1, 'exactly one shape fits the L');
const flatL = [[0, 0, 0], [1, 0, 0], [1, 0, 1]];
assert.strictEqual(B.isFair(flatL), true);
// a hidden block: a column of three with a fourth block tucked beside the middle of it
const hidden = [[0, 0, 0], [0, 1, 0], [0, 2, 0], [1, 1, 0]];
assert.strictEqual(B.isFair(hidden), true, 'a tower with a side block: every block shows in a view');
const buried = [[0, 0, 0], [0, 1, 0], [0, 2, 0], [1, 0, 0], [1, 1, 0], [1, 2, 0], [0, 0, 1], [0, 1, 1], [0, 2, 1], [1, 0, 1], [1, 1, 1], [1, 2, 1]];
assert.strictEqual(B.isFair(buried), false, 'a 2x2x3 slab: no block is needed to show anything the others do not');

// isFair agrees with brute force on lots of random shapes, fair and unfair alike
const rng = seeded(2024);
let fairSeen = 0, unfairSeen = 0;
for (let i = 0; i < 700; i++) {
  const level = { dims: { x: 3, z: 3, y: 3 }, supported: false };
  const cells = B.grow(level, 3 + Math.floor(rng() * 5), rng);
  if (cells.length < 3) continue;
  const n = B.normalize(cells);
  if (B.hull(B.silhouettes(n)).length > 12) continue;
  const unique = countShapesMatching(n) === 1;
  assert.strictEqual(B.isFair(n), unique, `isFair disagrees with brute force on ${JSON.stringify(n)}`);
  unique ? fairSeen++ : unfairSeen++;
}
assert.ok(fairSeen > 60 && unfairSeen > 60, `both kinds were tested (${fairSeen} fair, ${unfairSeen} unfair)`);
console.log(`ok  isFair matches a brute-force search on ${fairSeen + unfairSeen} random shapes (${fairSeen} fair, ${unfairSeen} not)`);

/* ---------- the levels ---------- */
assert.deepStrictEqual(Object.keys(B.LEVELS), ['1', '2', '3', '4']);
assert.deepStrictEqual(Object.values(B.LEVELS).map(l => l.name), ['Easy', 'Medium', 'Hard', 'Expert']);
for (const lv of [1, 2, 3, 4]) {
  const level = B.LEVELS[lv];
  const sizes = new Set(); const counts = new Set(); let overhangs = 0; let unique = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const p = B.generate(lv, seeded(lv * 1000 + i));
    assert.strictEqual(p.level, lv);
    const n = p.cells;
    assert.ok(n.length >= level.blocks[0] && n.length <= level.blocks[1], `${n.length} blocks is in range for level ${lv}`);
    assert.deepStrictEqual(B.normalize(n), n, 'slid to the corner');
    assert.strictEqual(Math.min(...n.map(c => c[0])), 0); assert.strictEqual(Math.min(...n.map(c => c[1])), 0); assert.strictEqual(Math.min(...n.map(c => c[2])), 0);
    assert.ok(p.dims.x <= level.dims.x && p.dims.y <= level.dims.y && p.dims.z <= level.dims.z, 'fits in the box');
    assert.ok(p.dims.x >= level.min.x && p.dims.y >= level.min.y && p.dims.z >= level.min.z, 'a real 3D shape, not a flat one');
    assert.strictEqual(new Set(n.map(c => c.join(','))).size, n.length, 'no duplicate blocks');
    assert.ok(B.isConnected(n), 'one connected piece');
    assert.ok(n.some(c => c[1] === 0), 'touches the floor');
    const set = new Set(n.map(c => B.key(...c)));
    const over = n.some(([x, y, z]) => y > 0 && !set.has(B.key(x, y - 1, z)));
    if (level.supported) assert.ok(!over, 'no overhangs on the easier levels');
    if (over) overhangs++;
    // NO HIDDEN BLOCKS: every block is needed and the views allow no ghosts
    assert.ok(B.isFair(n), 'fair');
    assert.strictEqual(B.hull(B.silhouettes(n)).length, n.length, 'the three views allow no extra blocks');
    // every block is the only one on at least one of its lines of sight, so each one shows in some view
    n.forEach(([x, y, z]) => {
      const alone = (dx, dy, dz) => !n.some(([a, b, c]) => (a !== x || b !== y || c !== z) && ((dx && b === y && c === z) || (dy && a === x && c === z) || (dz && a === x && b === y)));
      assert.ok(alone(1, 0, 0) || alone(0, 1, 0) || alone(0, 0, 1), `block ${x},${y},${z} is needed by some view`);
    });
    sizes.add(`${p.dims.x}x${p.dims.z}x${p.dims.y}`); counts.add(n.length);
    if (i < 80) { assert.strictEqual(countShapesMatching(n), 1, `level ${lv}: exactly one shape fits these views`); unique++; }
    assert.strictEqual(p.id, n.map(c => B.key(...c)).join('|'));
  }
  assert.ok(sizes.size >= 2 && counts.size >= 2, `level ${lv} has variety (sizes ${[...sizes].join(' ')}; counts ${[...counts].join(' ')})`);
  if (lv === 4) assert.ok(overhangs > 100, `Expert has overhangs (${overhangs} of ${N})`);
  if (lv < 4) assert.strictEqual(overhangs, 0);
  console.log(`ok  level ${lv} (${level.name}): ${N} puzzles, all fair and buildable; ${unique} checked by brute force to have exactly one answer; blocks ${[...counts].sort().join(',')}; sizes ${[...sizes].length}`);
}
// levels get harder: more blocks and bigger shapes on average
const avg = lv => { let t = 0; for (let i = 0; i < 100; i++) t += B.generate(lv, seeded(i + lv * 77)).cells.length; return t / 100; };
assert.ok(avg(1) < avg(2) && avg(2) < avg(3) && avg(3) < avg(4) + 0.5, 'harder levels have more blocks');
// seeded generation is reproducible, and different seeds differ
assert.strictEqual(B.generate(3, seeded(5)).id, B.generate(3, seeded(5)).id);
assert.notStrictEqual(B.generate(3, seeded(5)).id, B.generate(3, seeded(6)).id);
assert.throws(() => B.generate(9), /unknown level/);

/* ---------- checking a build ---------- */
const puzzle = { level: 2, cells: L, dims: s.dims };
let r = B.compare(puzzle, L);
assert.strictEqual(r.solved, true); assert.ok(r.views.top.ok && r.views.front.ok && r.views.side.ok);
r = B.compare(puzzle, L.map(([x, y, z]) => [x + 4, y, z + 2]));
assert.strictEqual(r.solved, true, 'it does not matter where in the sandbox you build it');
r = B.compare(puzzle, []);
assert.deepStrictEqual([r.empty, r.solved], [true, false]);
// forgot the top block
r = B.compare(puzzle, [[0, 0, 0], [0, 0, 1], [1, 0, 1]]);
assert.strictEqual(r.solved, false);
assert.deepStrictEqual([r.views.front.ok, r.views.side.ok, r.views.top.ok], [false, false, true], 'the top view is fine, front and side show the missing height');
assert.deepStrictEqual(r.views.front.missing, ['1,1']); assert.deepStrictEqual(r.views.front.extra, []);
// one block too many, in the wrong place
r = B.compare(puzzle, [...L, [0, 0, 2]]);
assert.strictEqual(r.solved, false);
assert.ok(r.views.top.extra.length > 0 || r.views.front.extra.length > 0, 'extra squares are reported');
// a mirror image is a different build
const mirror = L.map(([x, y, z]) => [x, y, 1 - z]);
assert.strictEqual(B.compare(puzzle, mirror).solved, false, 'a mirrored copy is not the same blueprint');
// ANY build with matching views is a solve, and for a fair puzzle that can only be the shape itself
for (let i = 0; i < 40; i++) {
  const p = B.generate(2, seeded(900 + i));
  assert.strictEqual(B.compare(p, p.cells).solved, true);
  const wrongOne = p.cells.slice(1);
  assert.strictEqual(B.compare(p, wrongOne).solved, false, 'removing any block breaks a view (so none is hidden)');
  p.cells.forEach((c, k) => assert.strictEqual(B.compare(p, p.cells.filter((_, j) => j !== k)).solved, false, 'every block is needed'));
}

/* ---------- stars and hints ---------- */
assert.deepStrictEqual([0, 1, 2, 3, 9].map(B.stars), [3, 2, 1, 1, 1]);
assert.strictEqual(B.REWARD, 30);
const pz = B.generate(2, seeded(31));
const anchor = { x: 2, z: 2 };
const h1 = B.hint(pz, [], 1, anchor);
assert.ok(new RegExp(`${pz.cells.length} blocks`).test(h1.text) && h1.ghosts.length === 0, 'hint 1 tells how many blocks and how big');
assert.ok(new RegExp(`${pz.dims.x} deep`).test(h1.text) && new RegExp(`${pz.dims.z} wide`).test(h1.text) && new RegExp(`${pz.dims.y} tall`).test(h1.text));
const h2 = B.hint(pz, [], 2, anchor);
const bottom = pz.cells.filter(c => c[1] === 0);
assert.strictEqual(h2.ghosts.length, bottom.length, 'hint 2 outlines the whole bottom layer');
assert.ok(h2.ghosts.every(([x, y, z]) => y === 0 && x >= 2 && z >= 2), 'placed at the anchor');
assert.ok(sameSet(h2.ghosts.map(c => c.join(',')), bottom.map(([x, y, z]) => [x + 2, y, z + 2].join(','))));
// later hints add one block at a time, lowest first, and skip ones already shown or built
let build = [], shown = [...h2.ghosts], steps = 0;
build = shown.map(c => c.slice());                        // the student builds the bottom layer
while (true) {
  const h = B.hint(pz, build, 3 + steps, anchor, shown);
  if (!h.ghosts.length) break;
  assert.strictEqual(h.ghosts.length, 1);
  const c = h.ghosts[0];
  assert.ok(!build.some(b => b.join(',') === c.join(',')), 'never hints a block you already have');
  shown.push(c); build.push(c); steps++;
  assert.ok(steps < 40);
}
assert.strictEqual(steps, pz.cells.length - bottom.length, 'one hint per remaining block');
assert.strictEqual(B.compare(pz, build).solved, true, 'following every hint solves it');
assert.ok(/Every outline is filled/.test(B.hint(pz, build, 99, anchor, shown).text));
const lowest = B.missingCells(pz, [], anchor);
assert.ok(lowest[0][1] === 0 && lowest.every((c, i) => i === 0 || c[1] >= lowest[i - 1][1]), 'missing blocks come lowest first');

console.log('blueprint tests passed');
