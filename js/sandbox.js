/* The sandbox behind the school, and the blueprint challenge that lives in it.

   You can only build while you are standing in the sandbox. There is one kind of block. Aim at the ground
   or at a block: right-click (or F) places a block against it, left-click (or X) breaks one.

   The big chalkboard shows a blueprint: TOP, FRONT and SIDE silhouettes of a hidden shape. Build the shape,
   press Enter to check it, H for a hint, N for a new blueprint. The math (fair shapes, checking, hints) is in
   blueprint.js; this file is the 3D build area, the board, and the controller that ties them together. */
const Sandbox = (() => {
  const T = THREE;

  /** Where everything is, in world blocks. The plot is w x d wide and h tall, starting at (x0, 0, z0). */
  const CONFIG = {
    x0: 32, z0: 6, w: 8, d: 8, h: 6,
    reach: 6,                         // how far you can place or break
    margin: 0.6,                      // the frame around the sand counts as "in the sandbox"
    board: { x: 43, y: 3.2, z: 10, w: 10, h: 4.4 },
  };
  const LOW = 2;                      // blocks in the bottom two layers stop you walking (you are 1.8 tall)
  const PX = 96;                      // chalkboard pixels per block

  /* ---------- aiming: which block, and which empty cell next to it, is under the crosshair ---------- */
  /** Walk a ray through the grid, one cell at a time. has(i, k, j) says whether a cell holds a block.
      Returns null if the ray misses the plot, otherwise { hit, place }:
        hit    the first block the ray touches (or null if it reaches the floor first)
        place  the empty cell just in front of it, where a new block would go (or null if there is none)
      Cells are [i, k, j] = [east, up, south] counted from the plot's corner. */
  function raycast(has, origin, dir, maxDist = CONFIG.reach, cfg = CONFIG) {
    const lo = [cfg.x0, 0, cfg.z0], size = [cfg.w, cfg.h, cfg.d];
    const hi = [lo[0] + size[0], size[1], lo[2] + size[2]];
    let t0 = 0, t1 = maxDist;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(dir[a]) < 1e-9) { if (origin[a] < lo[a] || origin[a] > hi[a]) return null; continue; }
      let ta = (lo[a] - origin[a]) / dir[a], tb = (hi[a] - origin[a]) / dir[a];
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return null;
    }
    const t = t0 + 1e-6;
    const cell = [0, 1, 2].map(a => Math.min(size[a] - 1, Math.max(0, Math.floor(origin[a] + dir[a] * t - lo[a]))));
    const step = dir.map(v => (v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0));
    const tDelta = dir.map((v, a) => (step[a] ? Math.abs(1 / v) : Infinity));
    const tMax = [0, 1, 2].map(a => (step[a] > 0 ? (lo[a] + cell[a] + 1 - origin[a]) / dir[a] : step[a] < 0 ? (lo[a] + cell[a] - origin[a]) / dir[a] : Infinity));
    let prev = null;
    for (let guard = 0; guard < 64; guard++) {
      if (has(cell[0], cell[1], cell[2])) return { hit: cell.slice(), place: prev };
      prev = cell.slice();
      const a = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : (tMax[1] < tMax[2] ? 1 : 2);
      if (tMax[a] > maxDist) return { hit: null, place: null };
      cell[a] += step[a]; tMax[a] += tDelta[a];
      if (cell[a] < 0 || cell[a] >= size[a]) {
        // leaving through the bottom means the ray reached the floor: a block can go on the ground there
        if (a === 1 && step[1] < 0) return { hit: null, place: prev };
        return { hit: null, place: null };
      }
    }
    return { hit: null, place: null };
  }

  /** The direction you are looking, from yaw and pitch (yaw 0 faces north, -z). */
  const lookDir = (yaw, pitch) => [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];

  const key = (i, k, j) => `${i},${k},${j}`;
  const wrap = (text, max) => {
    const out = []; let line = '';
    text.split(' ').forEach(w => { if ((line + ' ' + w).trim().length > max) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); });
    if (line) out.push(line);
    return out;
  };

  function create(zone, { rng = Math.random } = {}) {
    const C = CONFIG;
    const g = zone.group;
    const cells = new Map();              // "i,k,j" -> [i, k, j]
    const columns = new Map();            // "i,j" -> how many low blocks stand there
    const rects = new Map();              // "i,j" -> the walking collider for that column
    const listeners = [];

    /* ----- the blocks ----- */
    const capacity = C.w * C.d * C.h;
    const blockMesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), Tex.mat('buildBlock', 1, 1), capacity);
    blockMesh.frustumCulled = false;
    blockMesh.count = 0;
    g.add(blockMesh);
    const m4 = new T.Matrix4();
    const center = (i, k, j) => [C.x0 + i + 0.5, k + 0.5, C.z0 + j + 0.5];
    function rebuildBlocks() {
      let n = 0;
      cells.forEach(([i, k, j]) => { const [x, y, z] = center(i, k, j); m4.makeTranslation(x, y, z); blockMesh.setMatrixAt(n++, m4); });
      blockMesh.count = n;
      blockMesh.instanceMatrix.needsUpdate = true;
    }

    /* ----- outlines: the block you are aiming at, and where a new one would go ----- */
    const aimBox = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.03, 1.03, 1.03)), new T.LineBasicMaterial({ color: 0xfff2a0 }));
    const placeBox = new T.Mesh(new T.BoxGeometry(0.98, 0.98, 0.98), new T.MeshBasicMaterial({ color: 0x7fffa0, transparent: true, opacity: 0.35, depthWrite: false }));
    aimBox.visible = placeBox.visible = false;
    g.add(aimBox, placeBox);

    /* ----- hint outlines ----- */
    const ghostMesh = new T.InstancedMesh(new T.BoxGeometry(0.96, 0.96, 0.96), new T.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0.4, depthWrite: false }), 64);
    ghostMesh.frustumCulled = false;
    ghostMesh.count = 0;
    g.add(ghostMesh);

    /* ----- the chalkboard ----- */
    const bc = C.board;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bc.w * PX); canvas.height = Math.round(bc.h * PX);
    const boardTex = new T.CanvasTexture(canvas);
    boardTex.anisotropy = 4;
    const boardMesh = new T.Mesh(new T.PlaneGeometry(bc.w, bc.h), new T.MeshBasicMaterial({ map: boardTex }));
    boardMesh.position.set(bc.x, bc.y, bc.z);
    boardMesh.rotation.y = -Math.PI / 2;            // faces west, toward the sand
    g.add(boardMesh);

    /* ----- the challenge ----- */
    const state = { level: 1, puzzle: null, hints: 0, ghosts: [], anchor: null, marks: null, solved: false, stars: 0, checks: 0, message: [] };
    const FONT = px => `${px}px "Patrick Hand", "Chalkboard SE", "Comic Sans MS", cursive`;
    const CHALK = '#f4f1e6';

    function say(text) { state.message = wrap(text, 62).slice(0, 2); }

    function drawBoard() {
      const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
      c.fillStyle = '#2c5b40'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.05)';
      [[40, 20, 300, 40], [610, 70, 280, 50], [180, 250, 420, 36]].forEach(([x, y, w, h]) => c.fillRect(x, y, w, h));   // chalk dust
      const text = (str, x, y, size, color = CHALK, align = 'left') => { c.font = FONT(size); c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(str, x, y); };
      const level = Blueprint.LEVELS[state.level];

      text('BLUEPRINT', 24, 40, 42);
      text(`${level.name}: ${level.blocks[0]} to ${level.blocks[1]} blocks`, 270, 42, 28, '#f7e98e');
      if (state.solved) {
        for (let s = 0; s < 3; s++) {
          const cx = W - 150 + s * 52, cy = 40;
          c.beginPath();
          for (let p = 0; p < 10; p++) { const r = p % 2 ? 9 : 22, a = -Math.PI / 2 + p * Math.PI / 5; c[p ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
          c.closePath();
          if (s < state.stars) { c.fillStyle = '#f7e98e'; c.fill(); } else { c.strokeStyle = '#f7e98e'; c.lineWidth = 3; c.stroke(); }
        }
      }

      const grids = Blueprint.viewGrids(state.puzzle);
      const panels = [
        { name: 'TOP', sub: 'seen from above', grid: grids.top, view: 'top' },
        { name: 'FRONT', sub: 'stand at the FRONT mat', grid: grids.front, view: 'front' },
        { name: 'SIDE', sub: 'stand at the SIDE mat', grid: grids.side, view: 'side' },
      ];
      const dims = state.puzzle.dims;
      const toRC = { top: ([cc, x]) => [dims.x - 1 - x, cc], front: ([cc, y]) => [dims.y - 1 - y, cc], side: ([cc, y]) => [dims.y - 1 - y, cc] };
      panels.forEach((p, n) => {
        const px0 = 24 + n * 312, panelW = 288;
        text(p.name, px0 + panelW / 2, 92, 30, CHALK, 'center');
        text(p.sub, px0 + panelW / 2, 118, 19, '#bfd3c4', 'center');
        const cell = Math.min(Math.floor(190 / p.grid.rows), Math.floor(270 / p.grid.cols), 58);
        const gx = px0 + (panelW - cell * p.grid.cols) / 2, gy = 138 + (190 - cell * p.grid.rows) / 2;
        const filled = new Set(p.grid.filled.map(a => a.join(',')));
        for (let r = 0; r < p.grid.rows; r++) for (let q = 0; q < p.grid.cols; q++) {
          const x = gx + q * cell, y = gy + r * cell;
          if (filled.has(`${r},${q}`)) { c.fillStyle = CHALK; c.fillRect(x + 1, y + 1, cell - 2, cell - 2); c.strokeStyle = 'rgba(44,91,64,.55)'; c.lineWidth = 2; c.strokeRect(x + 4, y + 4, cell - 8, cell - 8); }
          else { c.strokeStyle = 'rgba(244,241,230,.28)'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, cell - 2, cell - 2); }
        }
        // what the last check found: yellow dashes where a square is missing, pink crosses where there is one too many
        if (state.marks && !state.solved) {
          const mv = state.marks.views[p.view];
          mv.missing.forEach(pr => {
            const [r, q] = toRC[p.view](pr.split(',').map(Number)); const x = gx + q * cell, y = gy + r * cell;
            c.setLineDash([7, 5]); c.strokeStyle = '#f7e98e'; c.lineWidth = 4; c.strokeRect(x + 5, y + 5, cell - 10, cell - 10); c.setLineDash([]);
          });
          mv.extra.forEach(pr => {
            const [r, q] = toRC[p.view](pr.split(',').map(Number));
            if (r < 0 || q < 0 || r >= p.grid.rows || q >= p.grid.cols) return;
            const x = gx + q * cell, y = gy + r * cell;
            c.strokeStyle = '#f6b0c8'; c.lineWidth = 5; c.beginPath(); c.moveTo(x + 8, y + 8); c.lineTo(x + cell - 8, y + cell - 8); c.moveTo(x + cell - 8, y + 8); c.lineTo(x + 8, y + cell - 8); c.stroke();
          });
          // a check mark or a cross next to the name
          const ok = mv.ok, mx = px0 + panelW - 26, my = 92;
          c.lineWidth = 5; c.strokeStyle = ok ? '#b9f0b0' : '#f6b0c8'; c.beginPath();
          if (ok) { c.moveTo(mx - 12, my); c.lineTo(mx - 3, my + 10); c.lineTo(mx + 13, my - 12); } else { c.moveTo(mx - 10, my - 10); c.lineTo(mx + 10, my + 10); c.moveTo(mx + 10, my - 10); c.lineTo(mx - 10, my + 10); }
          c.stroke();
        }
      });

      state.message.forEach((line, n) => text(line, W / 2, 358 + n * 32, 25, state.solved ? '#f7e98e' : CHALK, 'center'));
      text(state.solved ? 'N: a new blueprint' : 'Enter: check     H: hint     N: new blueprint', W / 2, 408, 20, '#bfd3c4', 'center');
      boardTex.needsUpdate = true;
    }

    function syncGhosts() {
      const live = state.ghosts.filter(([i, k, j]) => !cells.has(key(i, k, j)));
      let n = 0;
      live.forEach(([i, k, j]) => { const [x, y, z] = center(i, k, j); m4.makeTranslation(x, y, z); ghostMesh.setMatrixAt(n++, m4); });
      ghostMesh.count = n;
      ghostMesh.instanceMatrix.needsUpdate = true;
    }

    const emit = () => listeners.forEach(fn => fn(api));

    /* ----- building ----- */
    const cellList = () => [...cells.values()].map(c => c.slice());
    const inGrid = (i, k, j) => i >= 0 && j >= 0 && k >= 0 && i < C.w && j < C.d && k < C.h;
    const contains = (x, z) => x >= C.x0 - C.margin && x <= C.x0 + C.w + C.margin && z >= C.z0 - C.margin && z <= C.z0 + C.d + C.margin;

    function setColumn(i, j, delta) {
      const ck = `${i},${j}`;
      const n = (columns.get(ck) || 0) + delta;
      if (n > 0) {
        columns.set(ck, n);
        if (!rects.has(ck)) {
          const r = { minX: C.x0 + i, maxX: C.x0 + i + 1, minZ: C.z0 + j, maxZ: C.z0 + j + 1 };
          rects.set(ck, r); zone.colliders.push(r);
        }
      } else {
        columns.delete(ck);
        const r = rects.get(ck);
        if (r) { zone.colliders.splice(zone.colliders.indexOf(r), 1); rects.delete(ck); }
      }
    }

    /** You cannot put a block on top of yourself. */
    function overlapsPlayer(i, k, j, player) {
      if (k >= LOW) return false;
      const x0 = C.x0 + i, z0 = C.z0 + j;
      const dx = Math.max(x0 - player.x, 0, player.x - (x0 + 1)), dz = Math.max(z0 - player.z, 0, player.z - (z0 + 1));
      return Math.hypot(dx, dz) < (player.radius || 0.35) + 0.05;
    }

    function place(cell, player) {
      const [i, k, j] = cell;
      if (!inGrid(i, k, j)) return { ok: false, reason: 'That spot is outside the sandbox.' };
      if (cells.has(key(i, k, j))) return { ok: false, reason: 'There is already a block there.' };
      if (player && overlapsPlayer(i, k, j, player)) return { ok: false, reason: 'Step aside first: you are standing there.' };
      cells.set(key(i, k, j), [i, k, j]);
      if (k < LOW) setColumn(i, j, 1);
      rebuildBlocks(); syncGhosts(); emit();
      return { ok: true };
    }

    function remove(cell) {
      const [i, k, j] = cell;
      if (!cells.delete(key(i, k, j))) return { ok: false, reason: 'There is no block there.' };
      if (k < LOW) setColumn(i, j, -1);
      rebuildBlocks(); syncGhosts(); emit();
      return { ok: true };
    }

    function clear() {
      cells.clear(); columns.clear();
      rects.forEach(r => zone.colliders.splice(zone.colliders.indexOf(r), 1)); rects.clear();
      rebuildBlocks(); syncGhosts(); emit();
    }

    const has = (i, k, j) => cells.has(key(i, k, j));
    const target = player => raycast(has, [player.x, player.eye, player.z], lookDir(player.yaw, player.pitch));

    /** kind: 'place' or 'break'. Only works while you stand in the sandbox. */
    function act(kind, player) {
      if (!contains(player.x, player.z)) return { ok: false, reason: 'You can only build inside the sandbox.' };
      const t = target(player);
      if (kind === 'place') {
        if (!t || !t.place) return { ok: false, reason: 'Aim at the ground or a block inside the sandbox.' };
        return place(t.place, player);
      }
      if (!t || !t.hit) return { ok: false, reason: 'Aim at a block to break it.' };
      return remove(t.hit);
    }

    /** Show where you are aiming (call every frame while you are in the sandbox). */
    function showAim(player, visible) {
      const t = visible && contains(player.x, player.z) ? target(player) : null;
      aimBox.visible = !!(t && t.hit);
      placeBox.visible = !!(t && t.place);
      if (t && t.hit) aimBox.position.set(...center(...t.hit));
      if (t && t.place) placeBox.position.set(...center(...t.place));
    }

    /* ----- the challenge ----- */
    function newPuzzle(level = state.level) {
      state.level = level;
      let p = Blueprint.generate(level, rng);
      for (let tries = 0; tries < 8 && state.puzzle && p.id === state.puzzle.id; tries++) p = Blueprint.generate(level, rng);
      Object.assign(state, { puzzle: p, hints: 0, ghosts: [], anchor: null, marks: null, solved: false, stars: 0, checks: 0 });
      clear();
      say('Study the three views, then build the shape in the sandbox. Each view shows what you would see from that side.');
      drawBoard(); emit();
    }

    function check() {
      if (state.solved) { say('Already solved! Press N for a new blueprint.'); drawBoard(); return { solved: true, again: true }; }
      const result = Blueprint.compare(state.puzzle, cellList());
      state.checks++;
      if (result.empty) { state.marks = null; say('Build something first, then press Enter to check it.'); drawBoard(); emit(); return result; }
      if (result.solved) {
        state.solved = true; state.marks = null; state.stars = Blueprint.stars(state.hints);
        Store.earn(Blueprint.REWARD);
        Store.set({ blueprintsSolved: (Store.get().blueprintsSolved || 0) + 1 });
        say(`That's the shape! +${Blueprint.REWARD} chips.${state.hints ? ` (${state.hints} hint${state.hints > 1 ? 's' : ''} used)` : ' No hints!'}`);
      } else {
        state.marks = result;
        const bad = ['top', 'front', 'side'].filter(v => !result.views[v].ok);
        const off = bad.map(v => `${v} (${result.views[v].missing.length + result.views[v].extra.length})`).join(', ');
        say(`Not yet. These views don't match: ${off}. Yellow dashes mark squares you are missing; pink crosses mark extra ones.`);
      }
      drawBoard(); emit();
      return result;
    }

    function hint() {
      if (state.solved) { say('You already solved this one. Press N for a new blueprint.'); drawBoard(); return null; }
      state.hints++;
      if (state.hints >= 2 && !state.anchor) {
        const b = cellList();
        const d = state.puzzle.dims;
        const ax = b.length ? Math.min(...b.map(c => c[0])) : 2, az = b.length ? Math.min(...b.map(c => c[2])) : 2;
        state.anchor = { x: Math.min(ax, C.w - d.x), z: Math.min(az, C.d - d.z) };
      }
      const h = Blueprint.hint(state.puzzle, cellList(), state.hints, state.anchor || { x: 2, z: 2 }, state.ghosts);
      state.ghosts.push(...h.ghosts);
      say(h.text);
      syncGhosts(); drawBoard(); emit();
      return h;
    }

    function setLevel(n) { if (Blueprint.LEVELS[n]) newPuzzle(n); }

    function openMenu() {
      const desc = n => { const l = Blueprint.LEVELS[n]; return `${l.name}: ${l.blocks[0]} to ${l.blocks[1]} blocks${l.supported ? '' : ', with overhangs'}`; };
      UI.dialog({
        title: 'Blueprint board',
        html: `<p>Pick how hard the blueprint should be. Picking one clears the sandbox and gives you a new shape.</p>
               <p>${[1, 2, 3, 4].map(desc).join('<br>')}</p>
               <p>Solved so far: <b>${Store.get().blueprintsSolved || 0}</b>. Each one earns ${Blueprint.REWARD} chips.</p>`,
        buttons: [
          ...[1, 2, 3, 4].map(n => ({ label: Blueprint.LEVELS[n].name, primary: n === state.level, onClick: () => setLevel(n) })),
          { label: 'Clear the sandbox', onClick: () => { clear(); state.marks = null; say('The sandbox is clear.'); drawBoard(); } },
          { label: 'Close' },
        ],
      });
    }

    /** What the on-screen panel says while you are in the sandbox. */
    const hud = () => ({
      title: 'SANDBOX',
      lines: [
        'Right-click or F: place a block',
        'Left-click or X: break a block',
        'Enter: check   H: hint   N: new blueprint',
        `Level ${state.level} (${Blueprint.LEVELS[state.level].name})   Blocks: ${cells.size}   Hints: ${state.hints}${state.solved ? '   SOLVED' : ''}`,
      ],
    });

    const api = {
      config: C, state, cells: cellList, has, contains, target, act, place, remove, clear,
      showAim, newPuzzle, check, hint, setLevel, openMenu, hud, onChange: fn => listeners.push(fn),
      board: { mesh: boardMesh, canvas, redraw: drawBoard },
      meshes: { blocks: blockMesh, ghosts: ghostMesh, aim: aimBox, place: placeBox },
      columns, rects,
    };
    newPuzzle(1);
    return api;
  }

  return { CONFIG, LOW, raycast, lookDir, create };
})();
