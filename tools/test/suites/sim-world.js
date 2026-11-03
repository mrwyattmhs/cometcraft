// The world's layout, measured from the game's own plan and colliders (no walking): the casino's three wings, its archway, its ten tables; the village's minefield behind the dorm,
// its sign, the trees, the path and the edge. A flood fill from where you start proves everything can be reached and that you cannot leave the building.
const assert = require('assert');
const { plain } = require('../lib/util');

module.exports = { name: 'sim:world', tier: 'sim', covers: ['js/world.js', 'js/house.js', 'js/casino-interior.js', 'js/minesweeper.js', 'js/minefield.js', 'js/sandbox.js', 'js/player.js', 'js/collide.js', 'js/economy.js', 'js/content.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, G } = s, W = T.World, CI = T.CasinoInterior, M = T.Minesweeper;
  const blocked = (zone, x, z, r = 0.35) => W.Collide.blocked(zone, x, z, r);

  /* ---------- the casino ---------- */
  const casino = G.casino, labels = casino.interactables.map(i => i.label);
  assert.strictEqual(labels.length, 11, 'ten tables and the way out'); assert.strictEqual(labels.filter(l => /table/.test(l)).length, 10);
  assert.ok(!labels.some(l => /north doors/i.test(l)), 'no closed north doors any more');
  const tables = Object.entries(CI.TABLES), seatOf = ([k, t]) => ({ x: t.x, z: t.z + (t.z > 0 ? -2.8 : 2.8) });
  for (const [k, t] of tables) { const seat = seatOf([k, t]); assert.ok(!blocked(casino, seat.x, seat.z), `${k}: there is floor to stand on at its seat`); assert.ok(blocked(casino, t.x, t.z, 0.1), `${k}: the table itself is solid`); }
  assert.ok(!blocked(casino, 0, -14.25) && !blocked(casino, 3.5, -14.25) && !blocked(casino, -3.5, -14.25), 'the north archway can be walked through (9 wide)');
  assert.ok(blocked(casino, 6, -14.25, 0.1) && blocked(casino, -6, -14.25, 0.1), 'and the wall either side of it cannot');
  assert.ok(blocked(casino, 0, 13.0) && !blocked(casino, 0, 12.6), 'you stop well short of the way out\'s door frame');
  assert.ok(!blocked(casino, 39, 5.2, 0.1), 'nothing stands where the coaster table used to be (the Graphing wing\'s south side)');
  // everything can be reached from where you start, and the building has no way out but the door
  const seen = new Set([`${casino.spawn.x},${casino.spawn.z}`]), st = [[casino.spawn.x, casino.spawn.z]];
  while (st.length) { const [x, z] = st.pop(); for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) { const nx = x + dx, nz = z + dz, k = `${nx},${nz}`; if (!seen.has(k) && nx > -47 && nx < 47 && nz > -40 && nz < 17 && !blocked(casino, nx, nz)) { seen.add(k); st.push([nx, nz]); } } }
  const pts = [...seen].map(k => k.split(',').map(Number));
  assert.ok(pts.length > 3500, `a big walkable building (${pts.length} spots)`);
  assert.ok(pts.every(([x, z]) => z >= -36.5 && z <= 14 && x >= -44.5 && x <= 44.5), 'you can never get outside the building');
  assert.ok(pts.every(([x, z]) => (z >= -14 ? (Math.abs(x) <= 16 ? true : Math.abs(z) <= 11) : Math.abs(x) <= 14)), 'every wing is only as wide as it is drawn');
  casino.interactables.forEach(i => assert.ok(pts.some(p => Math.hypot(p[0] - i.x, p[1] - i.z) < i.r), `from the door you can reach "${i.label}"`));
  const NW = CI.NORTH_WING; assert.ok(pts.some(([x, z]) => z < -30) && pts.every(([x, z]) => z >= -14 || (Math.abs(x) <= 14 && z >= -36.5)), 'the archway leads into the Polynomials wing and nowhere else');
  assert.ok(casino.bounds.minZ > NW.minZ && casino.bounds.minZ < NW.minZ + 1, 'the walkable bounds stop just inside the end wall');
  ctx.log(`casino: ${tables.length} tables, ${pts.length} walkable spots, all prompts reachable`);

  /* ---------- the village: Minesweeper behind the dorm ---------- */
  const hub = G.hub, { x0, z0 } = M.PLOT_AT, P = M.PLOT, pad = 0.6;
  assert.strictEqual(hub.interactables.length, 13, 'the village\'s walk-up prompts: four shops, the casino, the Academy, the blueprint board, Minesweeper, Wilson Hall, the House of Algebra, the library, the notice board and Remy');
  const hits = hub.colliders.filter(c => c.maxX > x0 - pad && c.minX < x0 + P + pad && c.maxZ > z0 - pad && c.minZ < z0 + P + pad); assert.deepStrictEqual(plain(hits), [], 'nothing solid stands on the field');
  const dorm = hub.colliders.find(c => c.minX > 10 && c.maxX < 23 && c.minZ > 24 && c.maxZ < 43 && c.maxX - c.minX > 8 && c.maxZ - c.minZ > 14); assert.ok(dorm, 'the dorm is there');
  assert.ok(x0 - pad - dorm.maxX >= 8, `a wide lawn between the dorm and the field (${(x0 - pad - dorm.maxX).toFixed(1)} blocks)`);
  assert.ok(z0 >= dorm.minZ - 1 && z0 + P <= dorm.maxZ + 2, 'the field is level with the dorm');
  assert.ok(hub.bounds.maxX - (x0 + P) >= 8, `room east of the field before the edge of the village (${(hub.bounds.maxX - (x0 + P)).toFixed(1)})`);
  hub.sandboxPath.forEach(m => { const bb = new s.w.THREE.Box3().setFromObject(m); assert.ok(!(bb.max.x > x0 - pad && bb.min.x < x0 + P + pad && bb.max.z > z0 - pad && bb.min.z < z0 + P + pad), 'the field does not cover the sandbox path'); });
  const post = hub.colliders.find(c => Math.abs((c.minX + c.maxX) / 2 - (x0 - 1.3)) < 0.01 && Math.abs((c.minZ + c.maxZ) / 2 - (z0 + 3)) < 0.01); assert.ok(post, 'the signpost is solid');
  assert.deepStrictEqual(plain(hub.colliders.filter(c => c !== post && Math.hypot((c.minX + c.maxX) / 2 - (x0 - 1.3), (c.minZ + c.maxZ) / 2 - (z0 + 3)) < 7)), [], 'nothing else solid within 7 blocks of the sign: no street lamp beside it');
  const trees = hub.colliders.filter(c => Math.abs(c.maxX - c.minX - 1.2) < 0.01 && Math.abs(c.maxZ - c.minZ - 1.2) < 0.01); assert.strictEqual(trees.length, 12, 'the village has 12 trees');
  trees.forEach(t => { const tx = (t.minX + t.maxX) / 2, tz = (t.minZ + t.maxZ) / 2; assert.ok(!(tx > x0 - 2.1 && tx < x0 + P + 2.1 && tz > z0 - 2.1 && tz < z0 + P + 2.1), `the tree at ${tx}, ${tz} would hang over the field`); });
  assert.ok(hub.wander.maxX < x0 - 2, 'villagers do not wander onto the field');
  const spot = hub.interactables.find(i => i.label === 'Play Minesweeper'); assert.ok(spot && spot.x < x0 && spot.x > dorm.maxX && spot.z > z0 && spot.z < z0 + P, 'the sign is on the strip between the dorm and the field');
  ctx.log('village: the field is clear, level with the dorm, with the sign uncrowded');

  /* ---------- the village: the street of shops (east to west, a path down the middle) and the House of Algebra at its north end ---------- */
  const ST = W.STREET, SP = W.SHOP_SPOTS, HF = T.House.FRONT, EXIT = T.House.EXIT;
  assert.ok(ST.z - 3 <= 11.5 && ST.z - 3 >= 10, 'the crosswalk (z 8.5 to 11.5) comes out at the corner of the street\'s path'); assert.ok(ST.x1 <= -6.4 && ST.x0 < -30, 'it runs from the road\'s west sidewalk to the far west'); assert.ok(ST.z > 10, 'and the street is set south of the crosswalk\'s middle, toward the park\'s tree');
  for (let x = -7; x >= -31; x -= 0.5) for (const z of [ST.z - 2, ST.z, ST.z + 2]) assert.ok(!blocked(hub, x, z, 0.35), `the street is open from the sidewalk to the bench at its end (x ${x}, z ${z})`);
  assert.deepStrictEqual(plain(SP.map(p => p.id)).sort(), ['accessories', 'hints', 'pets', 'style'], 'the four shops');
  assert.deepStrictEqual(plain(SP.map(p => [p.face, p.z])).sort().map(a => a.join()), [`N,${ST.z + 6.5}`, `N,${ST.z + 6.5}`, `S,${ST.z - 6.5}`, `S,${ST.z - 6.5}`], 'two on each side, the north side facing south and the south side facing north');
  SP.forEach(p => { const front = p.z + (p.face === 'S' ? 3 : -3), edge = ST.z + (p.face === 'S' ? -3 : 3); assert.ok(Math.abs(front - edge) <= 0.6, `${p.id}: its front is on the path\'s edge`); assert.ok(blocked(hub, p.x, p.z, 0.1), `${p.id}: the shop is solid`);
    const pr = hub.interactables.find(i => i.label.toLowerCase().includes(p.id === 'pets' ? 'pet corner' : p.id === 'hints' ? 'hint shop' : p.id === 'style' ? 'style shop' : 'accessories')); assert.ok(pr && pr.z > ST.z - 3 && pr.z < ST.z + 3, `${p.id}: its prompt is on the path (z ${pr && pr.z})`); });
  assert.ok(SP.filter(p => p.face === 'S').every(a => SP.filter(p => p.face === 'N').some(b => b.x === a.x)), 'each shop has one directly opposite it across the path');
  // nothing big and solid overlaps a shop (a shop pushed into the park, a bench or the House would show here)
  SP.forEach(p => { const mine = hub.colliders.filter(c => Math.abs((c.minX + c.maxX) / 2 - p.x) < 0.05 && Math.abs((c.minZ + c.maxZ) / 2 - p.z) < 0.05 && Math.abs(c.maxX - c.minX - 7.2) < 0.05 && Math.abs(c.maxZ - c.minZ - 6.2) < 0.05); assert.strictEqual(mine.length, 1, `${p.id}: has one solid footprint, 7.2 wide and 6.2 deep`); const m = mine[0];
    const hit = hub.colliders.filter(c => c !== m && c.maxX > m.minX - 0.3 && c.minX < m.maxX + 0.3 && c.maxZ > m.minZ - 0.3 && c.minZ < m.maxZ + 0.3 && Math.max(c.maxX - c.minX, c.maxZ - c.minZ) >= 2);        // (a shop's own props, like the Pet Corner's doghouse, are small and stand just in front of it)
    assert.deepStrictEqual(plain(hit), [], `${p.id}: no other building, bench or fence is on top of the shop`); });
  // the House: at the north end of the shops, clear of the casino, the shops and the road, with its door on the forecourt
  assert.ok(HF.z1 < Math.min(...SP.map(p => p.z - 3)) - 4, 'the House is north of the shops, with a wide lawn between them (4+ blocks)');
  { const casino = hub.colliders.filter(c => c.minZ < -20 && c.maxX - c.minX < 1.5 && c.minX > -30 && c.maxX < 0); assert.ok(casino.length > 5, 'the casino\'s west wing is there'); const nearest = Math.min(...casino.map(c => Math.hypot(Math.max(0, HF.x0 - c.maxX, c.minX - HF.x1), Math.max(0, c.minZ - HF.z0, HF.z0 - c.maxZ)))); assert.ok(nearest >= 7, `the House keeps its distance from the casino: it is ${nearest.toFixed(1)} blocks from the casino\'s nearest corner (7+; it used to be 4)`); const door = hub.interactables.find(i => /Casino/.test(i.label)), hd = hub.interactables.find(i => /House of Algebra/.test(i.label)); assert.ok(Math.hypot(door.x - hd.x, door.z - hd.z) >= 14, `and the two doors are 14+ blocks apart (${Math.hypot(door.x - hd.x, door.z - hd.z).toFixed(1)})`); } assert.ok(HF.x1 <= -12 && HF.x0 >= -34, 'on the west side, with its front to the road');
  const own = hub.colliders.filter(c => c.minX >= HF.x0 - 1 && c.maxX <= HF.x1 + 0.5 && c.minZ >= HF.z0 - 1 && c.maxZ <= HF.z1 + 1 && c.maxX - c.minX > 5); assert.ok(own.length >= 1, 'the House is solid');
  assert.deepStrictEqual(plain(hub.colliders.filter(c => !own.includes(c) && c.maxX > HF.x0 - 0.3 && c.minX < HF.x1 + 0.3 && c.maxZ > HF.z0 - 0.3 && c.minZ < HF.z1 + 0.3 && !(c.maxX - c.minX < 1.8 && c.maxZ - c.minZ < 2.4 && c.minX > HF.x1 - 0.1))), [], 'nothing else is built on the House\'s footprint');
  const door = hub.interactables.find(i => i.label === 'Enter the House of Algebra'); assert.ok(door && door.x > HF.x1 && door.x < -6.4 && Math.abs(door.z - HF.cz) < 0.1, 'its door prompt is on the forecourt in front of the doors');
  assert.ok(!blocked(hub, EXIT.x, EXIT.z, 0.35), 'you come out onto free ground'); assert.ok(Math.hypot(EXIT.x - door.x, EXIT.z - door.z) < 4, 'in front of the doors');
  // every walk-up prompt in the village can be reached from where you start, and you cannot leave the village
  { const seenV = new Set([`${hub.spawn.x},${hub.spawn.z}`]), stV = [[hub.spawn.x, hub.spawn.z]];
    while (stV.length) { const [x, z] = stV.pop(); for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) { const nx = x + dx, nz = z + dz, k = `${nx},${nz}`; if (!seenV.has(k) && !blocked(hub, nx, nz, 0.35)) { seenV.add(k); stV.push([nx, nz]); } } }
    const ptsV = [...seenV].map(k => k.split(',').map(Number)); assert.ok(ptsV.length > 15000, `a big walkable village (${ptsV.length} spots)`);
    hub.interactables.forEach(i => assert.ok(ptsV.some(p => Math.hypot(p[0] - i.x, p[1] - i.z) < i.r), `from the start you can reach "${i.label}"`));
    assert.ok(ptsV.every(([x, z]) => x >= hub.bounds.minX && x <= hub.bounds.maxX && z >= hub.bounds.minZ && z <= hub.bounds.maxZ), 'and you can never leave the village'); }
  trees.forEach(t => { const tx = (t.minX + t.maxX) / 2, tz = (t.minZ + t.maxZ) / 2; assert.ok(!(tx > HF.x0 - 1.7 && tx < HF.x1 + 1.7 && tz > HF.z0 - 1.7 && tz < HF.z1 + 1.7), `the tree at ${tx}, ${tz} is not on the House`); assert.ok(!(tz > ST.z - 3.7 && tz < ST.z + 3.7 && tx < -6 && tx > -33.5), `the tree at ${tx}, ${tz} is not on the street`); });
  ctx.log('village: the street runs east to west with a path down the middle, the House stands at its north end, and every prompt can be reached');
  assert.deepStrictEqual(s.errors, [], 'no errors');
} };
