// Run with: node tests/minesweeper.test.js
const assert = require('assert');
const M = require('../js/minesweeper.js');

const seeded = s => M.rngFrom(s);
const sum = a => a.reduce((x, y) => x + y, 0);

/* ---------- the three levels: 10 x 10 first, then bigger, in a plot that never changes size ---------- */
assert.deepStrictEqual(M.LEVELS.map(l => [l.level, l.name, l.size, l.mines]), [[1, 'Easy', 10, 10], [2, 'Medium', 15, 35], [3, 'Hard', 18, 65]]);
assert.strictEqual(M.LEVELS[0].size, 10, 'the first level is the 10 x 10 grid that was asked for');
assert.ok(M.LEVELS.every((l, k, a) => !k || (l.size > a[k - 1].size && l.mines > a[k - 1].mines)), 'each level is bigger and has more bombs');
assert.ok(M.LEVELS.every((l, k, a) => !k || l.mines / (l.size * l.size) > a[k - 1].mines / (a[k - 1].size * a[k - 1].size)), 'and a denser field, so it really is harder');
M.LEVELS.forEach(l => { assert.ok(Math.abs(l.tile * l.size - M.PLOT) < 1e-9, `${l.name}: the squares fill the 18 x 18 plot exactly`); assert.ok(l.mines <= l.size * l.size - 9, `${l.name}: room for the safe first dig`); });
assert.strictEqual(M.levelOf(99).level, 3); assert.strictEqual(M.levelOf(0).level, 1); assert.strictEqual(M.levelOf('x').level, 1); assert.strictEqual(M.levelOf(M.LEVELS[1]).level, 2);

/* ---------- a fresh game: nothing dug, no bombs laid yet ---------- */
for (const L of M.LEVELS) {
  const g = M.newGame(L.level, seeded(1));
  assert.strictEqual(g.state, 'ready'); assert.strictEqual(g.cells, L.size * L.size); assert.strictEqual(g.mine, null, 'bombs are only laid at the first dig');
  assert.deepStrictEqual(M.status(g), { state: 'ready', bombsLeft: L.mines, safeLeft: L.size * L.size - L.mines, hint: '' });
  assert.strictEqual(g.revealed.length, g.cells); assert.strictEqual(sum([...g.flag]), 0);
}

/* ---------- the first dig: never a bomb, no bomb touching it, so it always opens a patch ---------- */
for (const L of M.LEVELS) {
  const trials = 4000;
  for (let s = 0; s < trials; s++) {
    const g = M.newGame(L.level, seeded(s * 7 + L.level));
    const first = Math.floor(seeded(s + 99)() * g.cells);
    const r = M.dig(g, first);
    assert.ok(r.ok && r.first && !r.exploded, 'the first dig works');
    assert.strictEqual(g.mine[first], 0, 'the first dig is not a bomb');
    assert.ok(M.neighbors(g, first).every(j => g.mine[j] === 0), 'no bomb touches the first dig');
    assert.strictEqual(g.count[first], 0, 'so the first square is a blank');
    assert.ok(r.revealed.length >= 1 + M.neighbors(g, first).length, 'and it opens its neighbours too');
    assert.strictEqual(g.state, 'playing');
    assert.strictEqual(sum([...g.mine]), L.mines, 'exactly the right number of bombs');
  }
}
console.log('ok  levels, fresh games and the first dig');

/* ---------- the numbers are right (checked by counting the long way) ---------- */
for (const L of M.LEVELS) for (let s = 0; s < 150; s++) {
  const g = M.newGame(L.level, seeded(1000 + s)); M.dig(g, (s * 37) % g.cells);
  for (let i = 0; i < g.cells; i++) {
    let c = 0; const x = M.xOf(g, i), z = M.zOf(g, i);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { if ((dx || dz) && x + dx >= 0 && x + dx < g.n && z + dz >= 0 && z + dz < g.n && g.mine[(z + dz) * g.n + x + dx]) c++; }
    assert.strictEqual(g.count[i], c, `number at ${x},${z}`);
    assert.ok(g.count[i] <= 8);
  }
}
// corners and edges have 3 and 5 neighbours, the middle has 8
{ const g = M.newGame(1); assert.strictEqual(M.neighbors(g, 0).length, 3); assert.strictEqual(M.neighbors(g, 9).length, 3); assert.strictEqual(M.neighbors(g, 5).length, 5); assert.strictEqual(M.neighbors(g, 55).length, 8);
  assert.strictEqual(M.indexOf(g, -1, 0), -1); assert.strictEqual(M.indexOf(g, 10, 0), -1); assert.strictEqual(M.indexOf(g, 3, 4), 43); assert.strictEqual(M.xOf(g, 43), 3); assert.strictEqual(M.zOf(g, 43), 4); }
console.log('ok  the numbers');

/* ---------- opening a patch: exactly the blank squares that connect, and the numbers on their edge ---------- */
for (const L of M.LEVELS) for (let s = 0; s < 200; s++) {
  const g = M.newGame(L.level, seeded(5000 + s)); const first = (s * 53) % g.cells;
  const r = M.dig(g, first);
  // the long way: start at `first`, spread through blanks, and keep the squares touched
  const seen = new Set([first]), stack = [first];
  while (stack.length) { const c = stack.pop(); if (g.count[c] !== 0) continue; for (const nb of M.neighbors(g, c)) if (!seen.has(nb)) { seen.add(nb); stack.push(nb); } }
  assert.deepStrictEqual([...r.revealed.map(o => o.i)].sort((a, b) => a - b), [...seen].sort((a, b) => a - b), 'the opened patch is exactly what spreads from the dig');
  assert.ok(r.revealed.every(o => !g.mine[o.i]), 'a bomb is never opened by a patch');
  assert.strictEqual(g.revealedCount, r.revealed.length);
  assert.strictEqual(r.revealed[0].i, first); assert.strictEqual(r.revealed[0].depth, 0);
  assert.ok(r.revealed.every((o, k, a) => !k || o.depth >= a[k - 1].depth), 'listed in the order it ripples outward');
  assert.ok(r.revealed.every(o => o.depth === 0 || M.neighbors(g, o.i).some(j => r.revealed.some(p => p.i === j && p.depth === o.depth - 1))), 'each depth touches the one before');
}
console.log('ok  opening a patch');

/* ---------- digging a number opens only that square; digging twice or into the air does nothing ---------- */
{
  const g = M.newGame(1, seeded(11)); M.dig(g, 55);
  const numbered = [...Array(g.cells).keys()].find(i => !g.mine[i] && !g.revealed[i] && g.count[i] > 0);
  const before = g.revealedCount;
  const r = M.dig(g, numbered); assert.ok(r.ok && r.revealed.length === 1 && r.revealed[0].i === numbered && g.revealedCount === before + 1, 'a numbered square opens alone');
  assert.deepStrictEqual(M.dig(g, numbered), { ok: false, reason: 'open', revealed: [], exploded: false, won: false });
  [-1, g.cells, 1.5, NaN, undefined].forEach(i => assert.strictEqual(M.dig(g, i).ok, false, `dig ${i} is refused`));
}

/* ---------- flags ---------- */
{
  const g = M.newGame(1, seeded(21));
  assert.deepStrictEqual(M.flag(g, 5), { ok: true, flagged: true, won: false }); assert.strictEqual(g.flagCount, 1); assert.strictEqual(M.status(g).bombsLeft, 9);
  assert.deepStrictEqual(M.flag(g, 5), { ok: true, flagged: false, won: false }); assert.strictEqual(g.flagCount, 0, 'flagging again takes it off');
  M.flag(g, 7);
  // digging a flagged square does nothing, and does not even start the game
  assert.deepStrictEqual(M.dig(g, 7), { ok: false, reason: 'flagged', revealed: [], exploded: false, won: false }); assert.strictEqual(g.state, 'ready');
  M.dig(g, 55);
  const open = [...Array(g.cells).keys()].find(i => g.revealed[i]);
  assert.deepStrictEqual(M.flag(g, open), { ok: false, reason: 'open', flagged: false, won: false }, 'dirt cannot have a flag');
  [-1, g.cells, 2.5].forEach(i => assert.strictEqual(M.flag(g, i).ok, false));
  // you may flag more than there are bombs: the counter goes below zero, as in the classic game
  const g2 = M.newGame(1, seeded(22)); for (let i = 0; i < 12; i++) M.flag(g2, i);
  assert.strictEqual(M.status(g2).bombsLeft, -2);
}

/* ---------- a flag stays put when a patch opens next to it ---------- */
{
  let tested = 0;
  for (let s = 0; s < 300 && tested < 40; s++) {
    const g = M.newGame(2, seeded(7000 + s)); const first = (s * 29) % g.cells;
    // find out what the patch will be, on a copy, then flag a square inside it in the real game
    const probe = M.newGame(2, seeded(7000 + s)); const pr = M.dig(probe, first);
    const victim = pr.revealed.map(o => o.i).find(i => i !== first && probe.count[i] === 0);
    if (victim === undefined) continue;
    M.flag(g, victim); const r = M.dig(g, first);
    assert.ok(!g.revealed[victim] && g.flag[victim] === 1, 'the flagged square was not opened'); assert.ok(r.revealed.every(o => o.i !== victim));
    tested++;
  }
  assert.ok(tested >= 20, `enough boards had a flag inside a patch (${tested})`);
}

/* ---------- losing: dig a bomb ---------- */
for (const L of M.LEVELS) for (let s = 0; s < 100; s++) {
  const g = M.newGame(L.level, seeded(9000 + s)); M.dig(g, (s * 41) % g.cells);
  const bomb = [...Array(g.cells).keys()].find(i => g.mine[i]);
  const r = M.dig(g, bomb);
  assert.deepStrictEqual([r.ok, r.exploded, r.won, r.revealed.length], [true, true, false, 0]); assert.strictEqual(g.state, 'lost'); assert.strictEqual(g.exploded, bomb);
  // the game is over: nothing more happens
  const safe = [...Array(g.cells).keys()].find(i => !g.mine[i] && !g.revealed[i]);
  assert.strictEqual(M.dig(g, safe).reason, 'over'); assert.strictEqual(M.flag(g, safe).reason, 'over'); assert.strictEqual(g.revealed[safe], 0);
  const rep = M.report(g);
  assert.strictEqual(rep.exploded, bomb); assert.strictEqual(rep.bombs.length + rep.rightFlags.length, L.mines, 'every bomb is accounted for'); assert.ok(rep.bombs.includes(bomb));
}
console.log('ok  flags and losing');

/* ---------- winning: dig every safe square AND flag every bomb ---------- */
for (const L of M.LEVELS) {
  const g = M.newGame(L.level, seeded(31337 + L.level)); M.dig(g, Math.floor(g.cells / 2));
  const safe = [...Array(g.cells).keys()].filter(i => !g.mine[i]), bombs = [...Array(g.cells).keys()].filter(i => g.mine[i]);
  // dig everything safe: NOT a win yet, because the bombs are not flagged
  for (const i of safe) { const r = M.dig(g, i); assert.ok(!r.exploded); assert.ok(!r.won, 'digging every safe square is not enough'); }
  assert.strictEqual(g.state, 'playing'); assert.strictEqual(g.revealedCount, g.cells - g.mines); assert.strictEqual(M.status(g).safeLeft, 0);
  assert.match(M.status(g).hint, new RegExp(`Flag the last ${L.mines} bombs to win`));
  // flag all but one: still not a win
  for (const i of bombs.slice(0, -1)) assert.ok(!M.flag(g, i).won);
  assert.strictEqual(g.state, 'playing'); assert.match(M.status(g).hint, /Flag the last 1 bomb to win/);
  // a flag on a SAFE square next to the last bomb does not count
  const wrong = safe[0]; assert.ok(M.flag(g, wrong).ok === false, 'a dug square cannot be flagged');
  // the last flag wins it
  const last = M.flag(g, bombs[bombs.length - 1]);
  assert.ok(last.ok && last.won, 'the last flag wins the game'); assert.strictEqual(g.state, 'won');
  assert.strictEqual(M.dig(g, bombs[0]).reason, 'over'); assert.strictEqual(M.flag(g, bombs[0]).reason, 'over'); assert.strictEqual(g.flagCount, L.mines, 'nothing changes after the win');
  assert.deepStrictEqual(M.report(g).wrongFlags, []);
}
// the other order: flag every bomb you can, dig the last safe square: that dig wins
{
  const g = M.newGame(1, seeded(4242)); M.dig(g, 55);
  const safe = [...Array(g.cells).keys()].filter(i => !g.mine[i] && !g.revealed[i]), bombs = [...Array(g.cells).keys()].filter(i => g.mine[i]);
  bombs.forEach(i => assert.ok(!M.flag(g, i).won, 'flags alone cannot win while squares are undug'));
  let winningDigs = 0;
  for (const i of safe) {
    const r = M.dig(g, i); if (!r.ok) continue;                        // (already opened by a patch)
    assert.strictEqual(r.won, !safe.some(j => !g.revealed[j]), 'a dig wins exactly when no safe square is left undug');
    if (r.won) winningDigs++;
  }
  assert.strictEqual(winningDigs, 1, 'the win happens once');
  assert.strictEqual(g.state, 'won');
}
// an extra flag on a safe square blocks the win, even with every bomb flagged and every safe square dug; taking it off wins
{
  const g = M.newGame(1, seeded(555)); M.dig(g, 55);
  const bombs = [...Array(g.cells).keys()].filter(i => g.mine[i]);
  const safeAll = [...Array(g.cells).keys()].filter(i => !g.mine[i]);
  const stray = safeAll.find(i => !g.revealed[i] && M.neighbors(g, i).every(j => !g.mine[j]) === false);   // a safe square we will leave undug, with a flag on it
  assert.ok(stray !== undefined);
  M.flag(g, stray);
  safeAll.filter(i => i !== stray).forEach(i => M.dig(g, i));
  bombs.forEach(i => M.flag(g, i));
  assert.strictEqual(g.state, 'playing', 'a wrong flag and an undug safe square: not won');
  M.flag(g, stray); assert.strictEqual(g.flagCount, bombs.length);
  const r = M.dig(g, stray); assert.ok(r.ok && r.won, 'take the flag off, dig it: that wins');
}
// a flag on a safe square while every safe square IS dug cannot happen (dirt takes no flags), and one too many flags on bombs+grass blocks the win
{
  const g = M.newGame(1, seeded(556)); M.dig(g, 55);
  const bombs = [...Array(g.cells).keys()].filter(i => g.mine[i]), safe = [...Array(g.cells).keys()].filter(i => !g.mine[i]);
  safe.forEach(i => M.dig(g, i)); bombs.slice(0, -1).forEach(i => M.flag(g, i));
  assert.strictEqual(g.state, 'playing');
  M.flag(g, bombs[bombs.length - 1]); assert.strictEqual(g.state, 'won');
}
console.log('ok  winning');

/* ---------- a perfect player always wins, and only on the last move; a random player always ends, and the books always balance ---------- */
for (const L of M.LEVELS) for (let s = 0; s < 60; s++) {
  const rng = seeded(60000 + s * 13 + L.level), g = M.newGame(L.level, rng);
  M.dig(g, Math.floor(rng() * g.cells));
  const todo = [];
  for (let i = 0; i < g.cells; i++) { if (g.mine[i]) todo.push(['flag', i]); else if (!g.revealed[i]) todo.push(['dig', i]); }
  for (let k = todo.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [todo[k], todo[j]] = [todo[j], todo[k]]; }
  let wonAt = -1, acts = 0;
  for (const [kind, i] of todo) {
    if (kind === 'dig' && g.revealed[i]) continue;                    // opened by an earlier patch
    const r = kind === 'dig' ? M.dig(g, i) : M.flag(g, i); acts++;
    assert.ok(r.ok && !r.exploded);
    if (r.won) { wonAt = acts; assert.strictEqual(g.state, 'won'); break; } else assert.strictEqual(g.state, 'playing', 'not won early');
  }
  assert.strictEqual(g.state, 'won', `${L.name} game ${s}: a player who knows where the bombs are always wins`);
}
for (const L of M.LEVELS) for (let s = 0; s < 120; s++) {
  const rng = seeded(80000 + s * 17 + L.level), g = M.newGame(L.level, rng);
  for (let step = 0; step < 5000 && (g.state === 'ready' || g.state === 'playing'); step++) {
    const i = Math.floor(rng() * g.cells); if (rng() < 0.3) M.flag(g, i); else M.dig(g, i);
    assert.strictEqual(g.revealedCount, sum([...g.revealed]), 'revealed count matches'); assert.strictEqual(g.flagCount, sum([...g.flag]), 'flag count matches');
    for (let c = 0; c < g.cells; c++) { assert.ok(!(g.revealed[c] && g.flag[c]), 'dirt never carries a flag'); if (g.mine && g.revealed[c]) assert.strictEqual(g.mine[c], 0, 'a dug square is never a bomb'); }
    if (g.state === 'lost') assert.strictEqual(g.mine[g.exploded], 1);
  }
  assert.ok(['won', 'lost', 'playing', 'ready'].includes(g.state));
}
console.log('ok  perfect and random players');

/* ---------- the game is deterministic for a seed, and different seeds give different fields ---------- */
{
  const a = M.newGame(2, seeded(77)), b = M.newGame(2, seeded(77)), c = M.newGame(2, seeded(78));
  M.dig(a, 100); M.dig(b, 100); M.dig(c, 100);
  assert.deepStrictEqual([...a.mine], [...b.mine]); assert.notDeepStrictEqual([...a.mine], [...c.mine]);
  // over many seeds every square is a bomb sometimes, except the safe zone of the first dig
  const seen = new Uint8Array(100);
  for (let s = 0; s < 400; s++) { const g = M.newGame(1, seeded(s)); M.dig(g, 0); g.mine.forEach((m, i) => { if (m) seen[i] = 1; }); }
  assert.ok([...seen].every((v, i) => v === 1 || i === 0 || i === 1 || i === 10 || i === 11), 'bombs can land anywhere outside the safe zone');
}

/* ---------- where things are: squares, the plot, and aiming ---------- */
assert.deepStrictEqual(M.PLOT_AT, { x0: 30.8, z0: 25.0 }); assert.strictEqual(M.PLOT, 18);        // behind the dorm, with a wide lawn between: x 30.8 to 48.8, z 25.0 to 43.0
assert.ok(M.insidePlot(40, 34) && !M.insidePlot(28, 34) && M.insidePlot(30.3, 34, 0.6) && !M.insidePlot(30.1, 34, 0.6) && M.insidePlot(48.79, 42.99) && !M.insidePlot(48.81, 42.99) && !M.insidePlot(48.79, 43.01));
for (const L of M.LEVELS) {
  for (let i = 0; i < L.size * L.size; i++) {
    const c = M.tileCenter(L.level, i);
    assert.strictEqual(M.tileAt(L.level, c.x, c.z), i, `${L.name}: the middle of square ${i} is square ${i}`);
    assert.ok(Math.abs(c.x - (M.PLOT_AT.x0 + ((i % L.size) + 0.5) * L.tile)) < 1e-9);
  }
  assert.strictEqual(M.tileAt(L.level, M.PLOT_AT.x0 - 0.01, M.PLOT_AT.z0 + 1), -1); assert.strictEqual(M.tileAt(L.level, M.PLOT_AT.x0 + 18.01, M.PLOT_AT.z0 + 1), -1);
  assert.strictEqual(M.tileAt(L.level, M.PLOT_AT.x0 + 1, M.PLOT_AT.z0 - 0.01), -1); assert.strictEqual(M.tileAt(L.level, M.PLOT_AT.x0 + 1, M.PLOT_AT.z0 + 18.01), -1);
  assert.strictEqual(M.tileAt(L.level, M.PLOT_AT.x0 + 0.001, M.PLOT_AT.z0 + 0.001), 0); assert.strictEqual(M.tileAt(L.level, M.PLOT_AT.x0 + 17.999, M.PLOT_AT.z0 + 17.999), L.size * L.size - 1);
}
// standing near a square and looking at the middle of its top: the crosshair is on that square (every square, every level, from several spots)
for (const L of M.LEVELS) for (let i = 0; i < L.size * L.size; i++) {
  const c = M.tileCenter(L.level, i);
  for (const [dx, dz] of [[0, 0.9], [0.9, 0], [-0.7, -0.7]]) {
    const o = { x: c.x + dx, y: 1.62, z: c.z + dz }, d = { x: c.x - o.x, y: M.GRASS_TOP - o.y, z: c.z - o.z }, len = Math.hypot(d.x, d.y, d.z);
    const dir = { x: d.x / len, y: d.y / len, z: d.z / len };
    assert.strictEqual(M.aim(L.level, o, dir), i, `${L.name}: aiming at the grass on square ${i} from ${dx},${dz}`);
  }
}
// the same with a mix of dug and undug squares: you aim at what you can see, the dirt of a dug square or the grass of an undug one
for (const L of M.LEVELS) {
  const rng = M.rngFrom(L.level * 31), dug = new Uint8Array(L.size * L.size).map(() => (rng() < 0.5 ? 1 : 0)), isDug = i => dug[i] === 1;
  for (let i = 0; i < dug.length; i++) {
    const c = M.tileCenter(L.level, i), top = dug[i] ? M.DIRT_TOP : M.GRASS_TOP;
    for (const [dx, dz] of [[0, 0.9], [0.9, 0], [-0.7, -0.7]]) {
      const o = { x: c.x + dx, y: 1.62, z: c.z + dz }, d = { x: c.x - o.x, y: top - o.y, z: c.z - o.z }, len = Math.hypot(d.x, d.y, d.z);
      assert.strictEqual(M.aim(L.level, o, { x: d.x / len, y: d.y / len, z: d.z / len }, isDug), i, `${L.name}: square ${i} (${dug[i] ? 'dug' : 'grass'}) from ${dx},${dz}`);
    }
  }
}
// the case that a flat-plane aim got wrong: a shallow look across a dug square at the grass beyond it hits the SIDE of that grass, and says so
{
  const L = M.LEVELS[2], n = L.size, rowStart = 5 * n;                       // Hard, 1-block squares: square (4,5) is dug, (5,5) is grass, looking east along row 5
  const dug = i => i === rowStart + 4, cz = M.tileCenter(3, rowStart + 4).z, x45 = M.tileCenter(3, rowStart + 4).x;
  // from the west, 3.2 blocks out and 1.62 up, looking at the point where square (5,5)'s west face meets the height of the dirt
  const o = { x: x45 - 3.2, y: 1.62, z: cz }, target = { x: x45 + 0.5, y: 0.25, z: cz }, d = { x: target.x - o.x, y: target.y - o.y, z: 0 }, len = Math.hypot(d.x, d.y);
  assert.strictEqual(M.aim(3, o, { x: d.x / len, y: d.y / len, z: 0 }, dug), rowStart + 5, 'the side of the grass next to a dug square');
  assert.strictEqual(M.aim(3, o, { x: d.x / len, y: d.y / len, z: 0 }), rowStart + 4, 'with nothing dug, the same line lands on the top of the grass square in front');
}
// aiming with the player's own yaw and pitch
{
  const c = M.tileCenter(1, 44), o = { x: c.x, y: 1.62, z: c.z + 3 };            // 3 blocks south of square 44, looking north (yaw 0)
  const pitch = -Math.atan2(1.62 - M.GRASS_TOP, 3), dir = M.lookDir(0, pitch);
  assert.ok(Math.abs(dir.x) < 1e-9 && dir.z < 0 && dir.y < 0, 'looking north and down');
  assert.strictEqual(M.aim(1, o, dir), 44);
  assert.strictEqual(M.aim(1, o, M.lookDir(0, 0)), -1, 'looking straight ahead finds nothing'); assert.strictEqual(M.aim(1, o, M.lookDir(0, 0.5)), -1, 'looking up finds nothing');
  assert.strictEqual(M.aim(1, { x: c.x, y: 1.62, z: c.z + 12 }, M.lookDir(0, -Math.atan2(1.62 - M.GRASS_TOP, 12))), -1, 'too far to reach');
  assert.strictEqual(M.aim(1, { x: 20, y: 1.62, z: 0 }, M.lookDir(0, -0.6)), -1, 'looking at the ground outside the plot finds nothing');
  const yawEast = -Math.PI / 2; assert.ok(M.lookDir(yawEast, 0).x > 0.99, 'yaw -90 degrees looks east, as in the game');
}
console.log('ok  squares and aiming');

console.log('minesweeper tests passed');
