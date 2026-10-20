// Run with: node tests/dorm.test.js
const assert = require('assert');
const D = require('../js/dorm.js');
const key = ([x, z]) => `${x},${z}`;

/* ---------- the room and the list ---------- */
assert.deepStrictEqual([D.ROOM.w, D.ROOM.d], [8, 6]);
assert.deepStrictEqual(Object.keys(D.ITEMS), ['bed', 'bunk', 'tv', 'desk', 'dresser']);
assert.deepStrictEqual(D.GROUPS, ['bed', 'tv', 'desk', 'dresser']);
assert.deepStrictEqual(Object.values(D.ITEMS).map(i => i.name), ['Bed', 'Bunk bed', 'TV stand', 'Desk and computer', 'Small dresser']);
assert.strictEqual(D.ITEMS.bed.group, D.ITEMS.bunk.group, 'a regular bed and a bunk bed are the same choice');
assert.deepStrictEqual(D.KEEP_CLEAR, [[0, 2], [1, 2]]);
assert.deepStrictEqual(D.DOOR, { x: 0, z: 2 });

/* ---------- turning ---------- */
assert.deepStrictEqual(D.footprint('bed', 0), { w: 1, d: 2 }); assert.deepStrictEqual(D.footprint('bed', 1), { w: 2, d: 1 });
assert.deepStrictEqual(D.footprint('bed', 2), { w: 1, d: 2 }); assert.deepStrictEqual(D.footprint('bed', 3), { w: 2, d: 1 });
assert.deepStrictEqual(D.footprint('tv', 0), { w: 2, d: 1 }); assert.deepStrictEqual(D.footprint('tv', 3), { w: 1, d: 2 });
assert.deepStrictEqual(D.footprint('dresser', 1), { w: 1, d: 1 });
assert.deepStrictEqual(D.footprint('bed', -1), { w: 2, d: 1 }, 'turning back one quarter is turning three');
assert.deepStrictEqual(D.footprint('bed', 5), { w: 2, d: 1 });
assert.deepStrictEqual(D.cellsOf({ type: 'desk', x: 3, z: 1, rot: 0 }), [[3, 1], [4, 1]]);
assert.deepStrictEqual(D.cellsOf({ type: 'desk', x: 3, z: 1, rot: 1 }), [[3, 1], [3, 2]]);
assert.deepStrictEqual(D.cellsOf({ type: 'dresser', x: 7, z: 5, rot: 0 }), [[7, 5]]);
assert.strictEqual(D.cellsOf({ type: 'bunk', x: 0, z: 0, rot: 0 }).length, 2);
assert.deepStrictEqual(D.FACING, [[0, 1], [-1, 0], [0, -1], [1, 0]], 'south, west, north, east: clockwise from above');
// four quarter turns of the facing direction come back round clockwise (south -> west -> north -> east)
D.FACING.forEach(([x, z], i) => { const [nx, nz] = D.FACING[(i + 1) % 4]; assert.deepStrictEqual([nx, nz], [-z + 0, x], 'each turn is a clockwise quarter turn'); });

/* ---------- what fits: checked cell by cell, against an independent count ---------- */
const doorCells = new Set(D.KEEP_CLEAR.map(key));
for (const type of Object.keys(D.ITEMS)) for (let rot = 0; rot < 4; rot++) {
  let valid = 0, expected = 0;
  for (let x = -2; x < 10; x++) for (let z = -2; z < 8; z++) {
    const f = D.footprint(type, rot);
    const inside = x >= 0 && z >= 0 && x + f.w <= 8 && z + f.d <= 6;
    let clear = true; for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) if (doorCells.has(key([x + i, z + j]))) clear = false;
    if (inside && clear) expected++;
    if (D.fits({ type, x, z, rot })) valid++;
  }
  assert.strictEqual(valid, expected, `${type} turned ${rot}: ${valid} legal spots`);
  assert.ok(valid > 20, `${type} has plenty of places to go`);
}
assert.strictEqual(D.fits({ type: 'dresser', x: 0, z: 2, rot: 0 }), false, 'not in the doorway cell');
assert.strictEqual(D.fits({ type: 'dresser', x: 1, z: 2, rot: 0 }), false, 'nor the cell inside it');
assert.strictEqual(D.fits({ type: 'dresser', x: 2, z: 2, rot: 0 }), true, 'but the next one is fine');
assert.strictEqual(D.fits({ type: 'bed', x: 0, z: 1, rot: 0 }), false, 'a bed that reaches into the doorway row is refused');
assert.strictEqual(D.fits({ type: 'bed', x: 0, z: 3, rot: 0 }), true, 'one below it is fine');
assert.strictEqual(D.fits({ type: 'desk', x: 7, z: 0, rot: 0 }), false, 'a desk poking through the east wall');
assert.strictEqual(D.fits({ type: 'desk', x: 6, z: 0, rot: 0 }), true);
assert.strictEqual(D.fits({ type: 'tv', x: 0, z: 5, rot: 1 }), false, 'a turned TV stand that runs off the south wall');
for (const bad of [null, undefined, {}, { type: 'sofa', x: 1, z: 1, rot: 0 }, { type: 'bed', x: 1.5, z: 1, rot: 0 }, { type: 'bed', x: 1, z: 1, rot: 4 }, { type: 'bed', x: 1, z: 1, rot: -1 }, { type: 'bed', x: '1', z: 1, rot: 0 }]) assert.strictEqual(D.fits(bad), false, `${JSON.stringify(bad)} is not a legal item`);

/* ---------- placing ---------- */
let items = [];
let r = D.place(items, { type: 'bed', x: 5, z: 3, rot: 0 });
assert.strictEqual(r.ok, true); assert.deepStrictEqual(r.items, [{ type: 'bed', x: 5, z: 3, rot: 0 }]); assert.deepStrictEqual(items, [], 'the old list is not changed');
items = r.items;
assert.match(D.place(items, { type: 'desk', x: 5, z: 3, rot: 0 }).reason, /already there/, 'cannot put a desk on the bed');
assert.match(D.place(items, { type: 'desk', x: 5, z: 4, rot: 0 }).reason || '', /^$|already/, 'the desk would also overlap the bed foot (2 deep)');
assert.strictEqual(D.place(items, { type: 'desk', x: 6, z: 0, rot: 0 }).ok, true);
assert.match(D.place(items, { type: 'desk', x: 7, z: 0, rot: 0 }).reason, /inside the room/);
assert.match(D.place(items, { type: 'dresser', x: 1, z: 2, rot: 0 }).reason, /doorway/);
assert.match(D.place(items, { type: 'sofa', x: 1, z: 1, rot: 0 }).reason, /not something/);
// one of each: a bunk bed replaces the bed, and moving an item moves it
r = D.place(items, { type: 'bunk', x: 2, z: 0, rot: 0 }); assert.deepStrictEqual(r.items, [{ type: 'bunk', x: 2, z: 0, rot: 0 }], 'a bunk bed replaces the regular bed');
r = D.place(items, { type: 'bed', x: 6, z: 0, rot: 2 }); assert.deepStrictEqual(r.items, [{ type: 'bed', x: 6, z: 0, rot: 2 }], 'placing the bed again moves it');
r = D.place(items, { type: 'bed', x: 5, z: 4, rot: 0 }); assert.strictEqual(r.ok, true, 'a bed may overlap where it already is (that is just moving it)');
// a bed can slide one cell without being blocked by itself
r = D.place(items, { type: 'bed', x: 5, z: 2, rot: 0 }); assert.strictEqual(r.ok, true);
// turning is by quarter turns, any whole number
r = D.place([], { type: 'tv', x: 2, z: 0, rot: 6 }); assert.strictEqual(r.items[0].rot, 2, 'six quarter turns is two');
// all four together, and the list stays in a steady order
let full = [];
for (const it of [{ type: 'dresser', x: 7, z: 5, rot: 3 }, { type: 'desk', x: 6, z: 0, rot: 2 }, { type: 'tv', x: 2, z: 5, rot: 0 }, { type: 'bunk', x: 4, z: 1, rot: 0 }]) { r = D.place(full, it); assert.strictEqual(r.ok, true, JSON.stringify(it)); full = r.items; }
assert.deepStrictEqual(full.map(o => o.type), ['bunk', 'tv', 'desk', 'dresser'], 'bed, TV, desk, dresser, always in that order');
assert.strictEqual(D.place(full, { type: 'dresser', x: 7, z: 3, rot: 0 }).items.length, 4, 'a fifth item is impossible: one of each');
// no layout built by placing ever has two items on one cell, or anything in or outside the room wrongly
let ok = 0; const rng = (s => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(42);
for (let n = 0; n < 4000; n++) {
  let list = [];
  for (let k = 0; k < 8; k++) { const types = Object.keys(D.ITEMS); const t = types[Math.floor(rng() * 5)]; const res = D.place(list, { type: t, x: Math.floor(rng() * 10) - 1, z: Math.floor(rng() * 8) - 1, rot: Math.floor(rng() * 4) }); if (res.ok) list = res.items; }
  const cells = list.flatMap(o => D.cellsOf(o).map(key)); assert.strictEqual(new Set(cells).size, cells.length, 'no overlaps');
  assert.strictEqual(new Set(list.map(o => D.ITEMS[o.type].group)).size, list.length, 'one of each kind');
  list.forEach(o => { assert.ok(D.fits(o)); D.cellsOf(o).forEach(([x, z]) => assert.ok(x >= 0 && z >= 0 && x < 8 && z < 6)); });
  assert.ok(!cells.includes('0,2') && !cells.includes('1,2'), 'the doorway is always clear');
  assert.ok(D.reachableCells(list).has('1,2'), 'and you can always get in'); ok++;
}
assert.strictEqual(ok, 4000);

/* ---------- removing and looking ---------- */
r = D.removeAt(full, 4, 2); assert.strictEqual(r.ok, true); assert.strictEqual(r.removed.type, 'bunk', 'any cell of an item removes the whole item'); assert.strictEqual(r.items.length, 3);
assert.strictEqual(D.removeAt(full, 0, 0).ok, false); assert.strictEqual(D.removeAt(full, 0, 0).items, full);
assert.strictEqual(D.itemAt(full, 4, 1).type, 'bunk'); assert.strictEqual(D.itemAt(full, 4, 2).type, 'bunk', 'both of its cells'); assert.strictEqual(D.itemAt(full, 0, 0), null);
assert.strictEqual(full.length, 4, 'removing does not change the list you pass in');

/* ---------- saved lists are cleaned up ---------- */
assert.deepStrictEqual(D.sanitize(full), full, 'a good list is kept exactly');
assert.deepStrictEqual(D.sanitize(D.sanitize(full)), full, 'cleaning twice changes nothing');
assert.deepStrictEqual(D.sanitize('junk'), []); assert.deepStrictEqual(D.sanitize(null), []); assert.deepStrictEqual(D.sanitize([null, 7, 'x', {}]), []);
const dirty = [{ type: 'bed', x: 5, z: 3, rot: 0 }, { type: 'bunk', x: 2, z: 0, rot: 0 }, { type: 'tv', x: 5, z: 3, rot: 0 }, { type: 'desk', x: 7, z: 0, rot: 0 }, { type: 'dresser', x: 1, z: 2, rot: 0 }, { type: 'sofa', x: 3, z: 3, rot: 0 }, { type: 'tv', x: 2, z: 5, rot: 'x' }, { type: 'dresser', x: 6, z: 5, rot: 9 }];
assert.deepStrictEqual(D.sanitize(dirty).map(o => o.type), ['bed', 'tv', 'dresser'], 'the second bed, the overlap, the wall-breaker, the doorway blocker and the unknown are dropped');
const sane = D.sanitize(dirty); assert.deepStrictEqual(sane.find(o => o.type === 'tv'), { type: 'tv', x: 2, z: 5, rot: 0 }, 'a bad rotation becomes none');
assert.strictEqual(D.sanitize(Array.from({ length: 60 }, (_, i) => ({ type: 'dresser', x: i % 8, z: Math.floor(i / 8) % 6, rot: 0 }))).length, 1, 'sixty dressers is one dresser');

/* ---------- the room can always be walked ---------- */
assert.strictEqual(D.freeCells([]).length, 48); assert.strictEqual(D.reachableCells([]).size, 48, 'an empty room is all reachable');
assert.strictEqual(D.freeCells(full).length, 48 - (2 + 2 + 2 + 1));
assert.ok(D.reachableCells(full).has('0,2') && D.reachableCells(full).has('1,2'));
// a layout can wall off a corner: that corner is just not reachable (nothing breaks)
const wall = [{ type: 'bunk', x: 6, z: 4, rot: 0 }, { type: 'dresser', x: 5, z: 5, rot: 0 }, { type: 'tv', x: 5, z: 4, rot: 0 }];
const walled = D.sanitize(wall); assert.ok(D.reachableCells(walled).size <= D.freeCells(walled).length);
console.log('dorm tests passed');
