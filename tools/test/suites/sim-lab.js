// Inside the Science Lab (simulated browser): the room's layout measured, not walked: three stations (the periodic-table wall with its console, the microscope bench, the atom model), their
// benches solid, the aisle open, every prompt reachable by flood fill from the door, the atom model's electrons circling, and the doors in and out of the village.
const assert = require('assert');
const { plain } = require('../lib/util');

module.exports = { name: 'sim:lab', tier: 'sim', covers: ['js/lab.js', 'js/world.js', 'js/main.js', 'js/elements.js', 'js/pick-game.js', 'js/booth-game.js', 'js/trophies.js', 'js/ui.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, G } = s, W = T.World, Lb = T.Lab, lab = G.lab, hub = G.hub, R = Lb.ROOM; s.start(); await s.frames(2);
  const blocked = (x, z, r = 0.35) => W.Collide.blocked(lab, x, z, r);

  /* ---------- the room and its three stations ---------- */
  assert.strictEqual(lab.name, 'Science Lab'); assert.ok(!blocked(lab.spawn.x, lab.spawn.z), 'you start on free floor, just inside the door'); assert.ok(lab.bounds.minX > R.minX && lab.bounds.maxX < R.maxX && lab.bounds.minZ > R.minZ && lab.bounds.maxZ < R.maxZ, 'the walkable bounds are inside the walls');
  const S = plain(Lb.STATIONS); assert.deepStrictEqual(S.map(x => x.id), ['elements', 'cells', 'atoms'], 'one station for each game');
  assert.deepStrictEqual(plain(lab.interactables.map(i => i.label)), ['Leave the Science Lab', 'Read the lab clock', ...S.map(x => x.label)], 'the way out, the clock, then the three stations');
  assert.ok(S[0].z < -7 && Math.abs(S[0].x) < 1, 'Element Match is at the back wall, under the periodic table'); assert.ok(S[1].x < -8 && Math.abs(S[1].z) < 1, 'Cell Lab is on the west wall'); assert.ok(S[2].x > 8 && Math.abs(S[2].z) < 1, 'Atom Builder is on the east wall');
  S.forEach(st => { assert.ok(!blocked(st.x, st.z), `${st.id}: there is floor to stand on at its prompt`); });
  assert.ok(blocked(0, -9.7, 0.1) && blocked(-13.4, 0, 0.1) && blocked(13.4, 0, 0.1) && blocked(-5, 4, 0.1) && blocked(5, 4, 0.1) && blocked(6.8, R.minZ + 0.7, 0.1), 'the console, the two wall benches, the two lab tables and the fume hood are solid');
  for (let z = lab.spawn.z; z >= -8.0; z -= 0.5) for (const x of [-1.8, 0, 1.8]) assert.ok(!blocked(x, z), `the aisle down the middle is open (x ${x}, z ${z})`);
  const kinds = {}; lab.group.traverse(o => { const k = o.userData && o.userData.kind; if (k) (kinds[k] = kinds[k] || []).push(o); });
  assert.deepStrictEqual([kinds['periodic-table'].length, kinds.microscope.length, kinds.atom.length], [1, 1, 1], 'a periodic table on the wall, a microscope on its bench, an atom model over the other');

  /* ---------- everything can be reached from the door ---------- */
  const seen = new Set([`${lab.spawn.x},${lab.spawn.z}`]), st = [[lab.spawn.x, lab.spawn.z]];
  while (st.length) { const [x, z] = st.pop(); for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) { const nx = x + dx, nz = z + dz, k = `${nx},${nz}`; if (!seen.has(k) && !blocked(nx, nz)) { seen.add(k); st.push([nx, nz]); } } }
  const pts = [...seen].map(k => k.split(',').map(Number)); assert.ok(pts.length > 1000, `a roomy floor (${pts.length} spots)`);
  lab.interactables.forEach(i => assert.ok(pts.some(p => Math.hypot(p[0] - i.x, p[1] - i.z) < i.r), `from the door you can reach "${i.label}"`));
  assert.ok(pts.every(([x, z]) => x > R.minX && x < R.maxX && z > R.minZ && z < R.maxZ + 0.01), 'and you cannot get out of the room');

  /* ---------- the atom model moves ---------- */
  const atom = kinds.atom[0], rings = atom.children.filter(o => o.children && o.children.length === 2), electron = r => r.children[1].position.clone();
  assert.strictEqual(rings.length, 3, 'three orbits, one electron on each'); lab.animated.forEach(fn => fn(0.1, 1.0)); const before = rings.map(electron); lab.animated.forEach(fn => fn(0.1, 2.0)); const after = rings.map(electron);
  rings.forEach((r, i) => assert.ok(before[i].distanceTo(after[i]) > 0.05, `electron ${i + 1} has moved round its orbit`)); assert.ok(rings.every((r, i) => Math.abs(Math.hypot(after[i].x, after[i].y) - [0.85, 1.25, 1.65][i]) < 1e-6), 'and stays on its orbit');

  /* ---------- the doors in and out, and the stations open their games ---------- */
  hub.interactables.find(i => i.label === 'Enter the Science Lab').action(); assert.strictEqual(G.getZone().name, 'Science Lab'); assert.ok(Math.hypot(T.Player.x - lab.spawn.x, T.Player.z - lab.spawn.z) < 0.01, 'you appear just inside the door');
  [['Use the Element Match station', 'ElementGame'], ['Use the Cell Lab microscope', 'CellGame'], ['Use the Atom Builder', 'AtomsGame']].forEach(([label, game]) => {
    lab.interactables.find(i => i.label === label).action(); assert.ok(T[game].isOpen(), `${label} opens ${game}`); assert.ok(['ElementGame', 'CellGame', 'AtomsGame'].filter(g => T[g].isOpen()).length === 1, 'and only that one'); T[game].close(); });
  lab.interactables.find(i => i.label === 'Leave the Science Lab').action(); assert.strictEqual(G.getZone().name, hub.name); assert.ok(Math.hypot(T.Player.x - Lb.EXIT.x, T.Player.z - Lb.EXIT.z) < 0.01, 'you come out in front of the lab\'s doors');
  [['elements', 'Element Match'], ['cells', 'Cell Lab'], ['atoms', 'Atom Builder']].forEach(([id, name]) => assert.ok(new RegExp(`${name} station in the Science Lab`).test(T.Trophies.byId[id].how), `the ${id} trophy's sentence says where the station is`));
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log(`the room: three stations, a solid set of benches, an open aisle, ${pts.length} walkable spots, the atom's electrons circling, doors in and out`);
} };
