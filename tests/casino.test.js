// Run with: node tests/casino.test.js
// The casino's plan: how big the hall and wings are, where the tables stand, and the space kept for the north wing.
// (The looks, the walls and the walking are checked in a browser; this is the arithmetic of the plan.)
const assert = require('assert');
const C = require('../js/casino-interior.js');
const { HALL, WING, ARCH, WINGS, NORTH_WING: N, FOUNTAIN: F, TABLES, SPAWN, WALL } = C;
const ACADEMY = { length: 30, depth: 24 };   // the Arithmetic Academy inside
const TABLE = { w: 5.9, d: 3.5 };             // what a table takes up (see buildTable in world.js)
const PLAYER = 0.35;

// the entrance hall is big and tall
assert.deepStrictEqual(HALL, { minX: -16, maxX: 16, minZ: -14, maxZ: 14, height: 16 });
const hallArea = (HALL.maxX - HALL.minX) * (HALL.maxZ - HALL.minZ);
assert.ok(hallArea > ACADEMY.length * ACADEMY.depth, 'the hall alone is bigger than the old casino and the academy');
assert.ok(HALL.height >= 14, 'a high ceiling');

// each wing is a little smaller than the arithmetic academy
assert.deepStrictEqual(WING, { length: 28, depth: 22, height: 10 });
assert.ok(WING.length < ACADEMY.length && WING.depth < ACADEMY.depth && WING.height < HALL.height);
const share = WING.length * WING.depth / (ACADEMY.length * ACADEMY.depth);
assert.ok(share > 0.8 && share < 0.95, `slightly smaller, not tiny (${(share * 100).toFixed(0)}%)`);
Object.values(WINGS).forEach(w => { assert.strictEqual(w.maxX - w.minX, WING.length); assert.strictEqual(w.maxZ - w.minZ, WING.depth); });

// Factoring on the left, Graphing on the right, mirror images, joined to the hall through its side walls
assert.deepStrictEqual([WINGS.factoring.side, WINGS.graphing.side], [-1, 1]);
assert.strictEqual(WINGS.factoring.name, 'FACTORING'); assert.strictEqual(WINGS.graphing.name, 'GRAPHING');
assert.strictEqual(WINGS.factoring.minX, -WINGS.graphing.maxX); assert.strictEqual(WINGS.factoring.maxX, -WINGS.graphing.minX);
assert.strictEqual(WINGS.graphing.minX, HALL.maxX + WALL, 'a wing starts one wall thickness past the hall');
assert.strictEqual(WINGS.factoring.maxX, HALL.minX - WALL);
Object.values(WINGS).forEach(w => {
  assert.ok(w.minZ >= HALL.minZ && w.maxZ <= HALL.maxZ, 'a wing lies within the hall\'s north-south length');
  assert.ok(ARCH.halfWidth < w.maxZ && ARCH.halfWidth < -w.minZ, 'the archway opens onto the wing');
  assert.ok(ARCH.height < WING.height - 1, 'and is lower than the wing ceiling');
});
assert.ok(2 * ARCH.halfWidth >= 8, 'a wide, grand archway');

// the five tables: three in Factoring (practice nearest the hall), two in Graphing (standard form nearest)
const inWing = (t, w) => t.x - TABLE.w / 2 > w.minX && t.x + TABLE.w / 2 < w.maxX && t.z - TABLE.d / 2 > w.minZ && t.z + TABLE.d / 2 < w.maxZ;
['practice', 'radical', 'trinomial'].forEach(k => assert.ok(inWing(TABLES[k], WINGS.factoring), `${k} fits in the Factoring wing`));
['parabola', 'vertex'].forEach(k => assert.ok(inWing(TABLES[k], WINGS.graphing), `${k} fits in the Graphing wing`));
assert.ok(TABLES.practice.x > TABLES.radical.x && TABLES.radical.x > TABLES.trinomial.x);
assert.ok(TABLES.parabola.x < TABLES.vertex.x);
assert.deepStrictEqual(new Set(Object.values(TABLES).map(t => t.z)).size, 1, 'all five stand in a row');
const row = ks => ks.map(k => TABLES[k].x).sort((a, b) => a - b);
[row(['practice', 'radical', 'trinomial']), row(['parabola', 'vertex'])].forEach(xs => xs.forEach((x, i) => { if (i) assert.ok(x - xs[i - 1] - TABLE.w >= 2 * PLAYER + 0.7, 'room to walk between neighbouring tables'); }));
Object.values(TABLES).forEach(t => assert.ok(t.z + TABLE.d / 2 + 2.8 < WING.depth / 2, 'and room in front of each (the seat is 2.8 south of the middle)'));
assert.strictEqual(Object.keys(TABLES).length, 5);

// the fountain sits in the middle of the hall with room to walk all round it
assert.deepStrictEqual([F.x, F.z, F.radius], [0, -1, 5.4]);
const fountainClear = Math.min(F.x - F.radius - HALL.minX, HALL.maxX - F.x - F.radius, F.z - F.radius - HALL.minZ, HALL.maxZ - F.z - F.radius);
assert.ok(fountainClear >= 7, `at least 7 blocks between the fountain and any wall, so there is room to walk round it and to stand at the north doors (${fountainClear.toFixed(1)})`);
assert.ok(12 - 1 - F.radius >= 4, 'and at least 4 between the fountain and the columns at x = 12');

// you arrive at the south door of the hall, south of the fountain, facing north
assert.deepStrictEqual(SPAWN, { x: 0, z: 10.5, yaw: 0 });
assert.ok(SPAWN.z > F.z + F.radius + 3 && SPAWN.z < HALL.maxZ - 2, 'near the door, well clear of the fountain');

// the north wing: the same size as the others, straight north of the hall, and nothing built in it
assert.strictEqual(N.maxX - N.minX, WING.length); assert.strictEqual(N.maxZ - N.minZ, WING.depth);
assert.strictEqual(N.maxZ, HALL.minZ - WALL, 'it starts one wall thickness north of the hall');
assert.strictEqual((N.minX + N.maxX) / 2, 0, 'centered on the hall');
assert.ok(N.door.x - N.door.width / 2 >= N.minX && N.door.x + N.door.width / 2 <= N.maxX, 'its doors open onto it');
assert.strictEqual(N.door.z, HALL.minZ);
assert.ok(N.maxZ < HALL.minZ, 'and it is entirely north of the hall');
const overlaps = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
[HALL, WINGS.factoring, WINGS.graphing].forEach(r => assert.ok(!overlaps(N, r), 'the reserved space overlaps nothing that is built'));
assert.ok(!overlaps(WINGS.factoring, WINGS.graphing) && !overlaps(HALL, WINGS.factoring) && !overlaps(HALL, WINGS.graphing), 'hall and wings do not overlap');
// nothing is placed in the reserved space: no table, and not the fountain
Object.values(TABLES).forEach(t => assert.ok(!overlaps(N, { minX: t.x - 3, maxX: t.x + 3, minZ: t.z - 2, maxZ: t.z + 2 })));
assert.ok(F.z - F.radius > N.maxZ);
console.log('casino plan tests passed');
