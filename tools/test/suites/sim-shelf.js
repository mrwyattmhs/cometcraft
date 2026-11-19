// The dorm's trophy shelf with three boards (simulated browser, measured, not looked at): 23 trophies in rows of 10, 10 and 3, every trophy standing on its board and clear of the board above it
// (and of the ceiling), no two trophies in a row overlapping, and, the one that matters for players: NO piece of furniture, in any spot and any turn the room allows, pokes through a board or
// its brackets. (The bunk bed is the tallest thing against that wall, 2.3 high, which is why the lowest board is at 2.35.)
const assert = require('assert');
const { plain } = require('../lib/util');

module.exports = { name: 'sim:shelf', tier: 'sim', covers: ['js/dormroom.js', 'js/dorm.js', 'js/trophies.js', 'js/store.js', 'js/world.js', 'js/main.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, G } = s, { Store, Trophies, Dorm } = T, room = G.dorm.dormRoom, THREE = s.w.THREE; s.start(); await s.frames(2);
  const box = o => { o.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(o); }, boards = () => room.shelf.root.children.filter(o => o.geometry && o.geometry.parameters && Math.abs(o.geometry.parameters.width - 6.0) < 1e-6), rowsOf = () => Trophies.shelves(Store.get().trophies);
  Store.set({ trophies: Trophies.IDS.slice() }); await s.frames(2);
  assert.deepStrictEqual(plain(rowsOf().map(r => r.length)), [10, 10, 5], '25 trophies: ten, ten and five'); assert.strictEqual(boards().length, 3, 'three boards, drawn'); assert.strictEqual(room.shelf.boards(), 3, 'and the room says so');
  const ys = Array.from(boards().map(b => +b.position.y.toFixed(3))).sort((a, b) => b - a); assert.deepStrictEqual(ys, [3.15, 2.75, 2.35], 'the boards are 0.4 apart, top to bottom'); assert.ok(ys[0] + 0.04 + 0.4 < 3.6, 'the top board and its trophies fit under the 3.6 ceiling');
  /* ----- every trophy is on its board, under the board above, and clear of its neighbours ----- */
  const trophies = [...room.shelf.trophies.children]; assert.strictEqual(trophies.length, 25);
  rowsOf().forEach((row, r) => {
    const y = ys[r], mine = trophies.filter(t => row.includes(t.userData.trophy)).map(t => ({ t, b: box(t) })).sort((p, q) => p.b.min.x - q.b.min.x);
    assert.strictEqual(mine.length, row.length, `row ${r + 1}: all its trophies are drawn`);
    mine.forEach(({ t, b }, i) => {
      assert.ok(Math.abs(b.min.y - (y + 0.04)) < 0.03, `${t.userData.trophy}: stands on its board (base at ${b.min.y.toFixed(3)}, the board top is ${(y + 0.04).toFixed(3)})`);
      const roof = r === 0 ? 3.6 : ys[r - 1] - 0.04; assert.ok(b.max.y < roof - 0.005, `${t.userData.trophy}: its top (${b.max.y.toFixed(3)}) is clear of what is above it (${roof.toFixed(2)})`);
      assert.ok(b.min.x > 4.6 && b.max.x < 10.6, `${t.userData.trophy}: on the board's length`); if (i) assert.ok(b.min.x >= mine[i - 1].b.max.x - 1e-6, `${t.userData.trophy} does not overlap the trophy beside it`);
    });
  });
  /* ----- furniture: every piece, every spot, every turn ----- */
  const shelfBoxes = () => boards().concat(room.shelf.root.children.filter(c => !boards().includes(c))).map(box); let tried = 0, fitted = 0;
  const parts = shelfBoxes(); assert.ok(parts.length > 6, 'boards and brackets');
  for (const type of Object.keys(Dorm.ITEMS)) for (let rot = 0; rot < 4; rot++) for (let x = 0; x < Dorm.ROOM.w; x++) for (let z = 0; z < Dorm.ROOM.d; z++) {
    const it = { type, x, z, rot }; if (!Dorm.fits(it)) continue; tried++; room.set([it]); const f = []; room.root.traverse(o => { if (o.isMesh) f.push(box(o)); }); if (!f.length) continue; fitted++;                     // every box the piece is made of (not its overall outline, which includes the gaps between its legs)
    f.forEach(b => parts.forEach(p => assert.ok(!b.intersectsBox(p), `a ${type} turned ${rot} at ${x},${z} pokes through the trophy shelf`)));
  }
  room.set([]); assert.ok(tried > 150 && fitted === tried, `${tried} placements tried across the five kinds of furniture`);
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log(`25 trophies in three rows (10, 10, 5), each on its board and clear of the one above; ${tried} furniture placements, none touching the shelf`);
} };
