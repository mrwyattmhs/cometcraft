/* Pure logic for the blueprint challenge (no DOM, no THREE, unit tested in Node).

   A blueprint is a block shape drawn as three silhouettes: TOP, FRONT, and SIDE. The student builds the
   shape in the sandbox. Shapes are small and made of one kind of block.

   Axes (the same ones the sandbox uses): x runs west -> east (front to back), y runs up, z runs
   north -> south. The FRONT of a build is its west side and the SIDE is its south side, so:
     FRONT view  what you see standing at the west edge, looking east    (columns = z, rows = y)
     SIDE view   what you see standing at the south edge, looking north  (columns = x, rows = y)
     TOP view    what you see from above, with the front at the bottom   (columns = z, rows = x, east at the top)

   FAIR PUZZLES, NO HIDDEN BLOCKS. Silhouettes can hide things: a block buried in the middle changes none of
   them. So a shape is only used if its three silhouettes pin it down exactly:
     1. every block is NECESSARY: it is the only block on at least one of the three lines through it
        (take it away and a silhouette changes), so nothing is hidden, and
     2. the silhouettes allow no extra "ghost" blocks: the only shape that fits inside all three is the shape itself.
   Together these mean exactly one shape matches the blueprint, so a build that matches all three views IS the
   answer, however the student reached it. */
const Blueprint = (() => {
  const BUILD = 32; // bump together with sandbox.js and the ?v= numbers in index.html
  const E = typeof Economy !== 'undefined' ? Economy : require('./economy.js');

  /** pay: chips for solving a blueprint at this level (economy.js).
      dims: the biggest box a shape can use (x front-to-back, z left-to-right, y tall).
      min: the smallest it may be in each direction, so every puzzle is a real 3D shape and not a flat one.
      blocks: how many blocks it has. supported: no overhangs (every block above the floor sits on another). */
  const LEVELS = {
    1: { name: 'Easy', pay: E.PAY.blueprint[0],   dims: { x: 3, z: 3, y: 2 }, min: { x: 2, z: 2, y: 2 }, blocks: [4, 5],   supported: true },
    2: { name: 'Medium', pay: E.PAY.blueprint[1], dims: { x: 3, z: 3, y: 3 }, min: { x: 3, z: 3, y: 2 }, blocks: [6, 8],   supported: true },
    3: { name: 'Hard', pay: E.PAY.blueprint[2],   dims: { x: 4, z: 4, y: 3 }, min: { x: 3, z: 3, y: 3 }, blocks: [9, 12],  supported: true },
    4: { name: 'Expert', pay: E.PAY.blueprint[3], dims: { x: 4, z: 4, y: 4 }, min: { x: 3, z: 3, y: 3 }, blocks: [10, 12], supported: false },
  };

  const key = (x, y, z) => `${x},${y},${z}`;
  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

  /** Slide a shape so its smallest x, y and z are all 0. */
  function normalize(cells) {
    if (!cells.length) return [];
    const mn = [0, 1, 2].map(i => Math.min(...cells.map(c => c[i])));
    return cells.map(c => [c[0] - mn[0], c[1] - mn[1], c[2] - mn[2]]);
  }

  /** The three silhouettes as sets of "a,b" pairs, plus the shape's size. Position does not matter. */
  function silhouettes(cells) {
    const n = normalize(cells);
    const front = new Set(), side = new Set(), top = new Set();
    let X = 0, Y = 0, Z = 0;
    n.forEach(([x, y, z]) => {
      front.add(`${z},${y}`);   // (column, row up from the floor)
      side.add(`${x},${y}`);
      top.add(`${z},${x}`);     // (column, x)
      X = Math.max(X, x + 1); Y = Math.max(Y, y + 1); Z = Math.max(Z, z + 1);
    });
    return { front, side, top, dims: { x: X, y: Y, z: Z } };
  }

  /** Everything that fits inside all three silhouettes at once. */
  function hull(sil) {
    const out = [];
    for (let x = 0; x < sil.dims.x; x++) for (let y = 0; y < sil.dims.y; y++) for (let z = 0; z < sil.dims.z; z++) {
      if (sil.top.has(`${z},${x}`) && sil.front.has(`${z},${y}`) && sil.side.has(`${x},${y}`)) out.push([x, y, z]);
    }
    return out;
  }

  function isConnected(cells) {
    if (!cells.length) return false;
    const set = new Set(cells.map(c => key(...c)));
    const seen = new Set([key(...cells[0])]);
    const stack = [cells[0]];
    while (stack.length) {
      const [x, y, z] = stack.pop();
      DIRS.forEach(([dx, dy, dz]) => {
        const k = key(x + dx, y + dy, z + dz);
        if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, y + dy, z + dz]); }
      });
    }
    return seen.size === set.size;
  }

  /** The hidden-block test: the silhouettes pin the shape down exactly (see the top of this file). */
  function isFair(cells) {
    const n = normalize(cells);
    const set = new Set(n.map(c => key(...c)));
    const h = hull(silhouettes(n));
    if (h.length !== n.length || !h.every(c => set.has(key(...c)))) return false;          // no ghost blocks
    return n.every(([x, y, z]) => {                                                       // every block necessary
      const alone = (dx, dy, dz) => {
        for (let t = -6; t <= 6; t++) if (t !== 0 && set.has(key(x + dx * t, y + dy * t, z + dz * t))) return false;
        return true;
      };
      return alone(1, 0, 0) || alone(0, 1, 0) || alone(0, 0, 1);
    });
  }

  /** Is the shape something you could build: connected, touching the floor, and (if asked) with no overhangs? */
  function isBuildable(cells, supported) {
    const n = normalize(cells);
    if (!isConnected(n)) return false;
    if (supported) {
      const set = new Set(n.map(c => key(...c)));
      if (!n.every(([x, y, z]) => y === 0 || set.has(key(x, y - 1, z)))) return false;
    }
    return true;
  }

  /** A random connected blob of `count` blocks inside the level's box. */
  function grow(level, count, rng) {
    const { x: X, y: Y, z: Z } = level.dims;
    const set = new Set();
    const cells = [];
    const add = (x, y, z) => { set.add(key(x, y, z)); cells.push([x, y, z]); };
    add(Math.floor(rng() * X), 0, Math.floor(rng() * Z));
    let guard = 0;
    while (cells.length < count && guard++ < 400) {
      const [bx, by, bz] = cells[Math.floor(rng() * cells.length)];
      const [dx, dy, dz] = DIRS[Math.floor(rng() * DIRS.length)];
      const x = bx + dx, y = by + dy, z = bz + dz;
      if (x < 0 || y < 0 || z < 0 || x >= X || y >= Y || z >= Z || set.has(key(x, y, z))) continue;
      if (level.supported && y > 0 && !set.has(key(x, y - 1, z))) continue;
      add(x, y, z);
    }
    return cells;
  }

  /** A fresh, fair puzzle for a level. Returns { level, cells (slid to the corner, sorted), dims, id }. */
  function generate(levelNum, rng = Math.random) {
    const level = LEVELS[levelNum];
    if (!level) throw new Error(`unknown level: ${levelNum}`);
    for (let attempt = 0; attempt < 30000; attempt++) {
      const count = level.blocks[0] + Math.floor(rng() * (level.blocks[1] - level.blocks[0] + 1));
      const cells = grow(level, count, rng);
      if (cells.length !== count) continue;
      const n = normalize(cells);
      const s = silhouettes(n);
      if (s.dims.x < level.min.x || s.dims.y < level.min.y || s.dims.z < level.min.z) continue;   // a real 3D shape
      if (!isBuildable(n, level.supported) || !isFair(n)) continue;
      n.sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2]);
      return { level: levelNum, cells: n, dims: s.dims, id: n.map(c => key(...c)).join('|') };
    }
    throw new Error(`could not make a fair level ${levelNum} puzzle`);
  }

  /** The three views laid out for drawing: { rows, cols, filled: [[row, col], ...] } with row 0 at the top. */
  function viewGrids(puzzle) {
    const { x: X, y: Y, z: Z } = puzzle.dims;
    const s = silhouettes(puzzle.cells);
    const grid = (rows, cols, set, toRC) => ({
      rows, cols, filled: [...set].map(p => { const [a, b] = p.split(',').map(Number); return toRC(a, b); }),
    });
    return {
      top: grid(X, Z, s.top, (c, x) => [X - 1 - x, c]),       // front (west) at the bottom, east at the top
      front: grid(Y, Z, s.front, (c, y) => [Y - 1 - y, c]),
      side: grid(Y, X, s.side, (c, y) => [Y - 1 - y, c]),
    };
  }

  /** Compare a build with the puzzle. Slid to the corner, so it does not matter where in the sandbox it stands. */
  function compare(puzzle, buildCells) {
    const want = silhouettes(puzzle.cells), mine = silhouettes(buildCells);
    const per = {};
    ['top', 'front', 'side'].forEach(v => {
      const missing = [...want[v]].filter(p => !mine[v].has(p));
      const extra = [...mine[v]].filter(p => !want[v].has(p));
      per[v] = { ok: !missing.length && !extra.length, missing, extra };
    });
    return { empty: buildCells.length === 0, views: per, solved: buildCells.length > 0 && ['top', 'front', 'side'].every(v => per[v].ok) };
  }

  /** The stars for a solve: 3 with no hints, 2 with one or two, 1 with more. */
  const stars = hintsUsed => Math.max(1, 3 - Math.min(2, hintsUsed));

  /** The next blocks to show as ghost outlines, in the sandbox's cell coordinates. anchor is where the shape's
      west-north corner goes. */
  function missingCells(puzzle, buildCells, anchor) {
    const have = new Set(buildCells.map(c => key(...c)));
    return puzzle.cells
      .map(([x, y, z]) => [x + anchor.x, y, z + anchor.z])
      .filter(c => !have.has(key(...c)))
      .sort((a, b) => a[1] - b[1] || (Math.abs(a[0] - anchor.x) + Math.abs(a[2] - anchor.z)) - (Math.abs(b[0] - anchor.x) + Math.abs(b[2] - anchor.z)));
  }

  /** Hint number n (1, 2, 3, ...). Returns { text, ghosts } where ghosts are the cells to outline, or none. */
  function hint(puzzle, buildCells, n, anchor, shown = []) {
    const total = puzzle.cells.length;
    const { x: X, y: Y, z: Z } = puzzle.dims;
    if (n === 1) {
      return { text: `It has ${total} blocks. It is ${X} deep (front to back), ${Z} wide, and ${Y} tall.`, ghosts: [] };
    }
    if (n === 2) {
      const layer = puzzle.cells.filter(c => c[1] === 0).map(([x, y, z]) => [x + anchor.x, y, z + anchor.z]);
      return { text: `Start with the bottom layer. The blue outlines show where its ${layer.length} blocks go.`, ghosts: layer };
    }
    const todo = missingCells(puzzle, buildCells, anchor).filter(c => !shown.some(s => key(...s) === key(...c)));
    if (!todo.length) {
      return { text: 'Every outline is filled in. Check the views again: something extra may be in the way.', ghosts: [] };
    }
    return { text: 'Here is one more block, shown as a blue outline.', ghosts: [todo[0]] };
  }

  return { BUILD, LEVELS, grow, key, normalize, silhouettes, hull, isConnected, isFair, isBuildable, generate, viewGrids, compare, stars, missingCells, hint };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Blueprint;
