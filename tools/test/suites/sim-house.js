// Inside the House of Algebra (simulated browser): the room's layout measured, not walked: the stage at the back with its guitars, drum kit, mic stand and amps; the aisle down the middle;
// the two booths facing each other across the aisle, next to the stage (the Missing Number and Multiply & Divide tables); every prompt reachable by flood fill from the door; and the doors in and out of the village.
const assert = require('assert');
const { plain } = require('../lib/util');

module.exports = { name: 'sim:house', tier: 'sim', covers: ['js/house.js', 'js/world.js', 'js/main.js', 'js/equations.js', 'js/equations-md.js', 'js/number-pairs.js', 'js/booth-game.js', 'js/trophies.js', 'js/ui.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, G } = s, W = T.World, Hs = T.House, house = G.house, hub = G.hub, R = Hs.ROOM; s.start(); await s.frames(2);
  const blocked = (x, z, r = 0.35) => W.Collide.blocked(house, x, z, r);

  /* ---------- the room ---------- */
  assert.strictEqual(house.name, 'House of Algebra'); assert.ok(!blocked(house.spawn.x, house.spawn.z), 'you start on free floor, just inside the door');
  assert.ok(house.bounds.minX > R.minX && house.bounds.maxX < R.maxX && house.bounds.minZ > R.minZ && house.bounds.maxZ < R.maxZ, 'the walkable bounds are inside the walls');
  for (let z = house.spawn.z; z >= R.stageFront + 2.4; z -= 0.5) for (const x of [-2.2, 0, 2.2]) assert.ok(!blocked(x, z), `the aisle down the middle is open from the door to the foot of the stage steps (x ${x}, z ${z})`);
  assert.ok(blocked(0, -10, 0.1) && blocked(-9, -11, 0.1) && blocked(9, -11, 0.1), 'the stage is solid: you cannot walk onto it'); assert.ok(blocked(0, R.stageFront + 0.7, 0.1), 'nor up its steps');

  /* ---------- the stage: guitars on stands, a drum kit, a mic stand, amps ---------- */
  const kinds = {}; house.group.traverse(o => { const k = o.userData && o.userData.kind; if (k) (kinds[k] = kinds[k] || []).push(o); });
  assert.deepStrictEqual([kinds.guitar.length, kinds.bass.length, kinds.drumkit.length, kinds.micstand.length, kinds.amp.length], [3, 1, 1, 1, 3], 'three guitars and a bass on stands, one drum kit, one mic stand, three amp stacks');
  const onStage = o => { const p = o.userData.at || o.position; return p.x > -11 && p.x < 11 && p.z > R.minZ && p.z < R.stageFront; };
  Object.values(kinds).flat().forEach(o => assert.ok(onStage(o), `a ${o.userData.kind} is on the stage`));
  [...kinds.guitar, ...kinds.bass, ...kinds.amp].forEach(o => assert.ok(Math.abs(o.position.y - 1.0) < 1e-9, `a ${o.userData.kind} stands on the stage floor (1 block up)`));
  assert.ok(kinds.drumkit[0].userData.at.z < -10 && Math.abs(kinds.drumkit[0].userData.at.x) < 1, 'the drum kit is at the back, in the middle'); assert.ok(Math.abs(kinds.micstand[0].userData.at.x) < 1, 'the mic stand is at centre stage');

  /* ---------- the booths ---------- */
  const B = plain(Hs.BOOTHS); assert.strictEqual(B.length, 3, 'three booths so far: a booth is only built when its table exists (there are no placeholder booths)'); assert.deepStrictEqual(B.map(b => b.unit), [1, 2, 3], 'one booth for each unit');
  assert.deepStrictEqual(B.map(b => b.id), ['missing', 'muldiv', 'numbers']); assert.ok(B.every(b => b.title && b.sub && b.label && b.symbols.length >= 1 && b.color), 'each has its own sign, prompt and floating symbols');
  const west = B.filter(b => b.face === 'E'), east = B.filter(b => b.face === 'W'); assert.deepStrictEqual([west.length, east.length], [2, 1], 'two on the west wall and one on the east');
  assert.ok(B[0].face === 'E' && B[1].face === 'W' && B[0].z === B[1].z && B[0].x === -B[1].x, 'facing each other across the aisle, next to the stage');
  assert.ok(B[2].face === 'E' && B[2].x === B[0].x && B[2].z - B[0].z >= 5, 'the third booth stands next to the first on the west wall (far enough along that they do not touch: a booth is 5 wide)');
  assert.ok(B.every(b => b.z <= R.maxZ - 4), 'and every booth is clear of the front wall');
  assert.ok(west.every(b => b.x < -10) && east.every(b => b.x > 10), 'west booth on the west wall, east booth on the east wall');
  B.forEach(b => assert.ok(blocked(b.x, b.z, 0.1), `unit ${b.unit}: the booth is solid`));
  B.forEach(b => assert.ok(b.z - 2.5 > R.stageFront, `unit ${b.unit}: clear of the stage`));
  assert.deepStrictEqual(plain(house.interactables.map(i => i.label)), ['Leave the House of Algebra', 'Visit the Missing Number booth', 'Visit the Multiply & Divide booth', 'Visit the Numbers Game booth'], 'no prompts for booths that do not exist');
  assert.ok(!/shutter/i.test(JSON.stringify(plain(house.interactables.map(i => i.label)))));

  /* ---------- everything can be reached from the door ---------- */
  const seen = new Set([`${house.spawn.x},${house.spawn.z}`]), st = [[house.spawn.x, house.spawn.z]];
  while (st.length) { const [x, z] = st.pop(); for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) { const nx = x + dx, nz = z + dz, k = `${nx},${nz}`; if (!seen.has(k) && !blocked(nx, nz)) { seen.add(k); st.push([nx, nz]); } } }
  const pts = [...seen].map(k => k.split(',').map(Number)); assert.ok(pts.length > 1000, `a roomy floor (${pts.length} spots)`);
  house.interactables.forEach(i => assert.ok(pts.some(p => Math.hypot(p[0] - i.x, p[1] - i.z) < i.r), `from the door you can reach "${i.label}"`));
  assert.ok(pts.filter(([x]) => Math.abs(x) < 11).every(([x, z]) => z > R.stageFront), 'and you can never end up on the stage itself (there is floor beside it, past the ends)');

  /* ---------- the doors in and out, and the booth opens the table ---------- */
  hub.interactables.find(i => i.label === 'Enter the House of Algebra').action(); assert.strictEqual(G.getZone().name, 'House of Algebra'); assert.ok(Math.hypot(T.Player.x - house.spawn.x, T.Player.z - house.spawn.z) < 0.01, 'you appear just inside the door');
  house.interactables.find(i => i.label === 'Visit the Missing Number booth').action(); assert.ok(T.EquationGame.isOpen() && !T.MulDivGame.isOpen(), 'the first booth opens the Missing Number table'); T.EquationGame.close();
  house.interactables.find(i => i.label === 'Visit the Multiply & Divide booth').action(); assert.ok(T.MulDivGame.isOpen() && !T.EquationGame.isOpen(), 'the second booth opens the Multiply and Divide table'); T.MulDivGame.close();
  house.interactables.find(i => i.label === 'Visit the Numbers Game booth').action(); assert.ok(T.NumbersGame.isOpen() && !T.EquationGame.isOpen() && !T.MulDivGame.isOpen(), 'the third booth opens the Numbers Game'); T.NumbersGame.close();
  house.interactables.find(i => i.label === 'Leave the House of Algebra').action(); assert.strictEqual(G.getZone().name, hub.name); assert.ok(Math.hypot(T.Player.x - Hs.EXIT.x, T.Player.z - Hs.EXIT.z) < 0.01, 'you come out in front of the doors');
  assert.ok(/House of Algebra/.test(T.Trophies.byId.missing.how) && /Missing Number booth/.test(T.Trophies.byId.missing.how), 'the trophy\'s sentence says where the booth is');
  assert.ok(/House of Algebra/.test(T.Trophies.byId.muldiv.how) && /Multiply & Divide booth/.test(T.Trophies.byId.muldiv.how), 'and so does the second one\'s');
  assert.ok(/House of Algebra/.test(T.Trophies.byId.numbers.how) && /Numbers Game booth/.test(T.Trophies.byId.numbers.how), 'and the third\'s');
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log(`the room: stage with ${Object.values(kinds).flat().length} props, an open aisle, 3 booths, every prompt reachable, doors in and out`);
} };
