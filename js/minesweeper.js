/* Minesweeper: the rules, and the geometry of the minefield behind the school. No DOM and no 3D here, so all of it is unit tested in Node (tests/minesweeper.test.js).
   The field in the village (js/minefield.js) draws a game; this decides what happens in it.

   The rules, as the game states them:
   - Every square starts as green grass. Digging grass shows dirt. A dirt square shows a number: how many bombs touch it (the eight around it, corners too).
     A square with no bombs around it shows no number and opens its neighbours too, and so on.
   - Digging a bomb ends the game. The first dig is never a bomb, and no bomb touches it, so it always opens up a patch to start from.
   - A flag marks a square you think is a bomb. You win when EVERY safe square has been dug AND EVERY bomb has a flag (and no flag sits on a safe square).
     Digging a flagged square does nothing: take the flag off first. */
const Minesweeper = (() => {
  /** The plot is always 18 x 18 blocks, whatever the level. The bigger the grid, the smaller its squares, so the fence and the sign never move. */
  const PLOT = 18;
  /** The north-west corner of the plot: just north of the sandbox, east of the park pool (x 33.2 to 51.2, z -14.6 to 3.4). Its south log frame ends at z 3.9, clear of the
      blueprint board's north post (z 4.2 to 4.8) and of the sandbox's own frame (from z 5.4). */
  const PLOT_AT = { x0: 33.2, z0: -14.6 };
  const REACH = 8;           // how far you can dig or flag, along your line of sight
  const GRASS_TOP = 0.34, DIRT_TOP = 0.14;   // the height of an undug and a dug square

  const LEVELS = [
    { level: 1, id: 'easy',   name: 'Easy',   size: 10, mines: 10 },
    { level: 2, id: 'medium', name: 'Medium', size: 15, mines: 35 },
    { level: 3, id: 'hard',   name: 'Hard',   size: 18, mines: 65 },
  ].map(l => ({ ...l, tile: PLOT / l.size }));

  const levelOf = l => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(Number(typeof l === 'object' && l ? l.level : l)) || 1)) - 1];

  /** A small seeded random number generator, so tests can replay a game. */
  function rngFrom(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- the game ---------- */
  function newGame(level, rng = Math.random) {
    const L = levelOf(level), n = L.size, cells = n * n;
    return {
      level: L.level, n, cells, mines: L.mines, rng,
      state: 'ready',                       // ready (nothing dug yet), playing, won, lost
      mine: null, count: null,              // filled in by the first dig
      revealed: new Uint8Array(cells), flag: new Uint8Array(cells),
      revealedCount: 0, flagCount: 0, exploded: -1,
    };
  }

  const xOf = (g, i) => i % g.n, zOf = (g, i) => Math.floor(i / g.n);
  const indexOf = (g, x, z) => (x < 0 || z < 0 || x >= g.n || z >= g.n ? -1 : z * g.n + x);
  function neighbors(g, i) {
    const x = xOf(g, i), z = zOf(g, i), out = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const j = indexOf(g, x + dx, z + dz);
      if (j >= 0) out.push(j);
    }
    return out;
  }

  /** Lay the bombs, keeping the first dig and the squares around it clear. */
  function placeMines(g, first) {
    const clear = new Set([first, ...neighbors(g, first)]);
    let pool = [];
    for (let i = 0; i < g.cells; i++) if (!clear.has(i)) pool.push(i);
    if (pool.length < g.mines) { pool = []; for (let i = 0; i < g.cells; i++) if (i !== first) pool.push(i); }   // (cannot happen on the three levels)
    g.mine = new Uint8Array(g.cells); g.count = new Uint8Array(g.cells);
    for (let k = 0; k < g.mines; k++) {
      const j = k + Math.floor(g.rng() * (pool.length - k));
      [pool[k], pool[j]] = [pool[j], pool[k]];
      g.mine[pool[k]] = 1;
    }
    for (let i = 0; i < g.cells; i++) g.count[i] = neighbors(g, i).reduce((s, j) => s + g.mine[j], 0);
  }

  /** How many bombs have a flag on them. */
  function flaggedBombs(g) { let s = 0; if (g.mine) for (let i = 0; i < g.cells; i++) if (g.flag[i] && g.mine[i]) s++; return s; }

  /** The win rule: every safe square dug, every bomb flagged, and no flag anywhere else. */
  function checkWin(g) {
    if (g.state !== 'playing') return false;
    if (g.revealedCount !== g.cells - g.mines) return false;
    if (g.flagCount !== g.mines || flaggedBombs(g) !== g.mines) return false;
    g.state = 'won';
    return true;
  }

  /** Dig square i. Returns { ok, reason?, revealed: [{ i, depth }], exploded, won, first }. `revealed` is in the order the patch opens (depth 0 is the square you dug),
      so the field can ripple outward. */
  function dig(g, i) {
    if (!Number.isInteger(i) || i < 0 || i >= g.cells) return { ok: false, reason: 'outside', revealed: [], exploded: false, won: false };
    if (g.state === 'won' || g.state === 'lost') return { ok: false, reason: 'over', revealed: [], exploded: false, won: false };
    if (g.flag[i]) return { ok: false, reason: 'flagged', revealed: [], exploded: false, won: false };
    if (g.revealed[i]) return { ok: false, reason: 'open', revealed: [], exploded: false, won: false };
    const first = g.state === 'ready';
    if (first) { placeMines(g, i); g.state = 'playing'; }
    if (g.mine[i]) { g.state = 'lost'; g.exploded = i; return { ok: true, revealed: [], exploded: true, won: false, first }; }
    const out = [{ i, depth: 0 }], depth = [0];
    g.revealed[i] = 1; g.revealedCount++;
    for (let head = 0; head < out.length; head++) {
      const c = out[head].i, d = out[head].depth;
      if (g.count[c] !== 0) continue;
      for (const nb of neighbors(g, c)) {
        if (g.revealed[nb] || g.flag[nb] || g.mine[nb]) continue;       // a flag stays put; a bomb is never opened
        g.revealed[nb] = 1; g.revealedCount++;
        out.push({ i: nb, depth: d + 1 });
      }
    }
    return { ok: true, revealed: out, exploded: false, won: checkWin(g), first };
  }

  /** Put a flag on square i, or take it off. Only grass can have one. Returns { ok, reason?, flagged, won }. */
  function flag(g, i) {
    if (!Number.isInteger(i) || i < 0 || i >= g.cells) return { ok: false, reason: 'outside', flagged: false, won: false };
    if (g.state === 'won' || g.state === 'lost') return { ok: false, reason: 'over', flagged: !!g.flag[i], won: false };
    if (g.revealed[i]) return { ok: false, reason: 'open', flagged: false, won: false };
    g.flag[i] = g.flag[i] ? 0 : 1;
    g.flagCount += g.flag[i] ? 1 : -1;
    return { ok: true, flagged: !!g.flag[i], won: checkWin(g) };
  }

  /** What the on-screen panel needs. bombsLeft can go below zero if you flag too many (as in the classic game). */
  function status(g) {
    const safeLeft = g.cells - g.mines - g.revealedCount;
    return {
      state: g.state, bombsLeft: g.mines - g.flagCount, safeLeft,
      hint: g.state === 'playing' && safeLeft === 0 ? (g.flagCount < g.mines ? `Every safe square is dug. Flag the last ${g.mines - flaggedBombs(g)} bomb${g.mines - flaggedBombs(g) === 1 ? '' : 's'} to win.` : 'Every safe square is dug, but a flag is on the wrong square. Take it off.') : '',
    };
  }

  /** After the game ends: where the bombs were, and which flags were right and wrong. */
  function report(g) {
    const r = { exploded: g.exploded, bombs: [], rightFlags: [], wrongFlags: [] };
    if (!g.mine) return r;
    for (let i = 0; i < g.cells; i++) {
      if (g.mine[i] && !g.flag[i]) r.bombs.push(i);
      else if (g.mine[i] && g.flag[i]) r.rightFlags.push(i);
      else if (!g.mine[i] && g.flag[i]) r.wrongFlags.push(i);
    }
    return r;
  }

  /* ---------- where things are in the village ---------- */
  /** The middle of square i, on the ground. */
  function tileCenter(level, i) {
    const L = levelOf(level), n = L.size;
    return { x: PLOT_AT.x0 + ((i % n) + 0.5) * L.tile, z: PLOT_AT.z0 + (Math.floor(i / n) + 0.5) * L.tile };
  }
  /** The square at a point on the ground, or -1 if the point is outside the plot. */
  function tileAt(level, x, z) {
    const L = levelOf(level);
    const u = Math.floor((x - PLOT_AT.x0) / L.tile), v = Math.floor((z - PLOT_AT.z0) / L.tile);
    return u < 0 || v < 0 || u >= L.size || v >= L.size ? -1 : v * L.size + u;
  }
  /** Is a point over the plot (margin: how far outside still counts)? */
  const insidePlot = (x, z, margin = 0) => x >= PLOT_AT.x0 - margin && x <= PLOT_AT.x0 + PLOT + margin && z >= PLOT_AT.z0 - margin && z <= PLOT_AT.z0 + PLOT + margin;
  /** The direction you are looking, from the player's yaw and pitch (the same maths as the camera). */
  const lookDir = (yaw, pitch) => { const cp = Math.cos(pitch); return { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp }; };
  /** Which square a line of sight from `origin` along `dir` meets: the square the crosshair is on, or -1. It follows the line a little at a time and stops at the real
      surface: the top of a grass square, the dirt of a dug one, or the side of a grass square next to a dug one. `revealed(i)` says whether square i is dug.
      Looking level or up, past `reach`, or off the plot finds nothing. */
  function aim(level, origin, dir, revealed = () => false, reach = REACH) {
    if (!(dir.y < -1e-6)) return -1;
    const STEP = 0.03;
    for (let t = STEP; t <= reach; t += STEP) {
      const y = origin.y + dir.y * t;
      if (y > GRASS_TOP) continue;                         // still above everything
      if (y <= 0) return -1;                               // into the ground without meeting a square
      const i = tileAt(level, origin.x + dir.x * t, origin.z + dir.z * t);
      if (i >= 0 && y <= (revealed(i) ? DIRT_TOP : GRASS_TOP)) return i;
    }
    return -1;
  }

  return { PLOT, PLOT_AT, REACH, GRASS_TOP, DIRT_TOP, LEVELS, levelOf, rngFrom, newGame, neighbors, indexOf, xOf, zOf, dig, flag, status, report, flaggedBombs, tileCenter, tileAt, insidePlot, lookDir, aim };
})();

if (typeof module !== 'undefined') module.exports = Minesweeper;
