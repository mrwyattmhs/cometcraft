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

// the seven tables: three in Factoring (practice nearest the hall) and three in Graphing (lines nearest, then parabola, then vertex) in a row, and the coaster in a second row
const inWing = (t, w) => t.x - TABLE.w / 2 > w.minX && t.x + TABLE.w / 2 < w.maxX && t.z - TABLE.d / 2 > w.minZ && t.z + TABLE.d / 2 < w.maxZ;
['practice', 'radical', 'trinomial'].forEach(k => assert.ok(inWing(TABLES[k], WINGS.factoring), `${k} fits in the Factoring wing`));
['lines', 'parabola', 'vertex'].forEach(k => assert.ok(inWing(TABLES[k], WINGS.graphing), `${k} fits in the Graphing wing`));
assert.ok(TABLES.practice.x > TABLES.radical.x && TABLES.radical.x > TABLES.trinomial.x);
assert.ok(TABLES.lines.x < TABLES.parabola.x && TABLES.parabola.x < TABLES.vertex.x, 'lines nearest the hall, then parabola, then vertex');
const ROW = ['practice', 'radical', 'trinomial', 'lines', 'parabola', 'vertex'];
assert.deepStrictEqual(new Set(ROW.map(k => TABLES[k].z)).size, 1, 'the first six stand in a row');
const row = ks => ks.map(k => TABLES[k].x).sort((a, b) => a - b);
[row(['practice', 'radical', 'trinomial']), row(['lines', 'parabola', 'vertex'])].forEach(xs => xs.forEach((x, i) => { if (i) assert.ok(x - xs[i - 1] - TABLE.w >= 2 * PLAYER + 0.7, 'room to walk between neighbouring tables'); }));
ROW.map(k => TABLES[k]).forEach(t => assert.ok(t.z + TABLE.d / 2 + 2.8 < WING.depth / 2, 'and room in front of each (the seat is 2.8 south of the middle)'));
assert.strictEqual(Object.keys(TABLES).length, 7);
assert.deepStrictEqual(ROW.map(k => TABLES[k].x), [-24, -31.5, -39, 24, 31.5, 39], 'the Graphing wing is laid out like the Factoring wing, mirrored');

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

/* ---------- the wedding chapel on the Graphing wing's south wall ---------- */
const K = C.CHAPEL, G = WINGS.graphing;
assert.strictEqual(K.wallZ, G.maxZ, 'on the south wall of the east wing');
assert.ok(Math.abs(K.x - (G.minX + G.maxX) / 2) <= 0.5, 'in the middle of that wall');
const frameHalf = K.doorW / 2 + 0.3;
assert.ok(K.x - frameHalf > G.minX && K.x + frameHalf < G.maxX, 'the doors and their frame fit on the wall');
const archTop = K.doorH + K.doorW / 2 + 0.15 + 0.3, signTop = K.doorH + 3.2 + 0.95 / 2;
assert.ok(archTop < signTop - 0.2, 'the arch is under its sign'); assert.ok(signTop < WING.height - 0.5, `the sign (top at ${signTop.toFixed(2)}) is below the crown molding and beams`);
assert.ok(K.doorW >= 3.5 && K.doorH >= 5, 'proper double doors');
// the rope hangs in front of the doors, wider than they are, and the space behind it is closed off
assert.ok(K.wallZ - K.ropeZ >= 1.5 && K.wallZ - K.ropeZ <= 3, 'the rope is a couple of steps in front of the doors');
assert.ok(K.ropeHalf > K.doorW / 2, 'and spans the doors');
const roped = { minX: K.x - K.ropeHalf - 0.25, maxX: K.x + K.ropeHalf + 0.25, minZ: K.ropeZ - 0.15, maxZ: K.wallZ };
// the sign on its stand is to the left of the rope; the other furniture on that wall is the two sofas either side
const SOFA = { w: 3.6, d: 1.5, z: 9.8 }, sofaX = [-1, 1].map(k => 30.75 + k * 8.5);
const stand = { minX: K.stand.x - 0.55, maxX: K.stand.x + 0.55, minZ: K.stand.z - 0.3, maxZ: K.stand.z + 0.3 };
const sofas = sofaX.map(x => ({ minX: x - SOFA.w / 2, maxX: x + SOFA.w / 2, minZ: SOFA.z - SOFA.d / 2, maxZ: SOFA.z + SOFA.d / 2 }));
assert.ok(stand.maxX < roped.minX, 'the stand is beside the rope, not in it'); assert.ok(stand.minX > G.minX && stand.maxZ < K.wallZ - 1);
sofas.forEach(sf => { assert.ok(!overlaps(stand, sf) && !overlaps(roped, sf), 'the sofas do not touch the stand or the roped-off space'); assert.ok(sf.maxX < G.maxX && sf.minX > G.minX); });
assert.ok(stand.minX - sofas[0].maxX >= 0.7 + 0.3 && sofas[1].minX - roped.maxX >= 1.0, 'and you can walk between them');
assert.ok(K.stand.x < K.x && K.stand.z < K.wallZ, 'the stand is in front of the wall, to the left of the doors as you face them');
// the sofa that used to stand where the doors are (30.75) is gone, and the plan keeps the middle of that wall for the chapel
assert.ok(30.75 - 8.5 * 0 > roped.minX && 30.75 < roped.maxX, 'the middle sofa position is inside the chapel space (that sofa is not built in this wing)');


/* ---------- the Polynomial Coaster table: a second row on the south side of the Graphing wing, facing north ---------- */
const CT = TABLES.coaster, ctBox = { minX: CT.x - TABLE.w / 2, maxX: CT.x + TABLE.w / 2, minZ: CT.z - TABLE.d / 2, maxZ: CT.z + TABLE.d / 2 };
assert.ok(inWing(CT, WINGS.graphing), 'the coaster table fits in the Graphing wing'); assert.ok(CT.z > 0 && CT.x > K.x + K.ropeHalf + 3, 'on the south side, east of the chapel');
const SEAT = { x: CT.x, z: CT.z - 2.8 };                                   // it faces north, so you sit on its north side
const vertexSeat = { x: TABLES.vertex.x, z: TABLES.vertex.z + 2.8 };
assert.ok(Math.hypot(SEAT.x - vertexSeat.x, SEAT.z - vertexSeat.z) >= 2.2 + 2.2, 'its prompt does not overlap the Vertex table\'s prompt (the two are never both in reach)');
assert.ok(SEAT.z - 0.35 > TABLES.vertex.z + TABLE.d / 2 + 0.7 && SEAT.z + 0.35 < ctBox.minZ - 0.35, 'there is floor to stand on at the seat, between the two rows');
assert.ok(ctBox.minZ - (TABLES.vertex.z + TABLE.d / 2) >= 2 * PLAYER + 3, 'a wide walkway between the two rows');
[...sofas, stand, roped].forEach(r => assert.ok(!overlaps(ctBox, r), 'the coaster table touches no sofa, stand or the roped-off chapel space'));
assert.ok(sofas[1].minZ - ctBox.maxZ >= 2 * PLAYER + 0.7, 'and you can walk behind it, between it and the east sofa');
assert.ok(CT.x + TABLE.w / 2 < WINGS.graphing.maxX - 2.5, 'clear of the topiary and the end wall');

console.log('casino plan tests passed');
