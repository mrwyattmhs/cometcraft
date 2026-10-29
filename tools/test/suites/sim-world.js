// The world's layout, measured from the game's own plan and colliders (no walking): the casino's three wings, its archway, its ten tables; the village's minefield behind the dorm,
// its sign, the trees, the path and the edge. A flood fill from where you start proves everything can be reached and that you cannot leave the building.
const assert = require('assert');
const { plain } = require('../lib/util');

module.exports = { name: 'sim:world', tier: 'sim', covers: ['js/world.js', 'js/casino-interior.js', 'js/minesweeper.js', 'js/minefield.js', 'js/sandbox.js', 'js/player.js', 'js/collide.js', 'js/economy.js', 'js/content.js', 'index.html'], run: async ctx => {
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
  assert.strictEqual(hub.interactables.length, 12, 'the village\'s walk-up prompts');
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
  assert.deepStrictEqual(s.errors, [], 'no errors');
} };
