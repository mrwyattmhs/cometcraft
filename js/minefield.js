/* The minefield next to the sandbox: a game of Minesweeper you play by walking onto it, digging and flagging in first person.
   The rules live in js/minesweeper.js (pure, tested). This file draws a game in 3D, works out which square the crosshair is on, and pays out when you win.

   Everything is made of voxel blocks: green grass squares you dig to find dirt, numbers lying on the dirt, a flag on a pole, black bombs, and an explosion of flying cubes.
   The plot is always 18 x 18 blocks; a bigger grid just has smaller squares (Easy: 10 x 10 big ones, Hard: 18 x 18 one-block ones). */
const Minefield = (() => {
  const M = Minesweeper;
  const GRASS_H = 0.34, DIRT_H = 0.14;            // heights of an undug and a dug square
  /** Every flat thing that lies on another keeps clear of it by a margin far bigger than the depth buffer can confuse (so nothing can flicker): the numbers float 0.025 above
      the dirt, the crater 0.008, the aim marker 0.03 above whatever it is on; a grass block is a little wider than the dirt block under it, so their sides never share a plane. */
  const LAYERS = { grass: GRASS_H, dirt: DIRT_H, digit: DIRT_H + 0.025, crater: DIRT_H + 0.008, aim: 0.03, tileGrass: 0.96, tileDirt: 0.94 };
  const CAP = M.PLOT * M.PLOT;                    // the most squares there ever are (the Hard level)
  const SHRINK = 0.16;                            // seconds for a square of grass to sink when it is dug
  const RIPPLE = 0.045;                           // seconds between one ring of a patch opening and the next
  const WAIT = { toast: 0 };
  const DIGIT_COLORS = ['#5ab0ff', '#62e06f', '#ff6b6b', '#b98cff', '#ffb347', '#40e0d0', '#ffffff', '#ff8fd1'];   // bright, so they read on dirt

  function create(zone) {
    const group = new THREE.Group();
    zone.group.add(group);
    const dummy = new THREE.Object3D();
    const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
    const listeners = [];
    const emit = ev => listeners.forEach(fn => fn(ev));
    const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let game = null, level = 1;
    const anim = new Map();                        // squares whose grass is sinking: i -> { delay, t, depth }
    const numberAt = new Map();                    // squares showing a number (so far): i -> n
    let wrongFlags = [], bombsShown = [];
    let endAt = -1, shake = 0;

    /* ----- the meshes, made once for the biggest grid and re-laid out for each level ----- */
    const mats = {
      grassTop: Tex.mat('grass'), dirtSide: Tex.mat('dirt'),
      dirt: new THREE.MeshLambertMaterial({ map: Tex.mat('dirt').map, color: 0xd9cdb8 }),
    };
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const instanced = (geo, mat, n = CAP) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; group.add(m); return m; };
    const grass = instanced(unit, [mats.dirtSide, mats.dirtSide, mats.grassTop, mats.dirtSide, mats.dirtSide, mats.dirtSide]);
    const dirt = instanced(unit, mats.dirt);
    const pole = instanced(unit, new THREE.MeshLambertMaterial({ color: 0xf4f1e6 }));
    const cloth = instanced(unit, new THREE.MeshLambertMaterial({ color: 0xe53935 }));
    const clothBad = instanced(unit, new THREE.MeshLambertMaterial({ color: 0x777777 }));
    const bomb = instanced(unit, new THREE.MeshLambertMaterial({ color: 0x1b1b1f }));
    const spark = instanced(unit, new THREE.MeshBasicMaterial({ color: 0xff7a1a }));

    // numbers: one flat plane per digit, with a cut-out texture
    const plane = new THREE.PlaneGeometry(1, 1); plane.rotateX(-Math.PI / 2);
    const digitTex = [], digitMesh = [];
    function drawDigit(n, cv) {
      const c = cv.getContext('2d');
      c.clearRect(0, 0, cv.width, cv.height);
      c.font = '400 54px Silkscreen, "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round'; c.lineWidth = 9; c.strokeStyle = '#1b1208'; c.strokeText(String(n), 32, 35);
      c.fillStyle = DIGIT_COLORS[n - 1]; c.fillText(String(n), 32, 35);
    }
    for (let n = 1; n <= 8; n++) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      drawDigit(n, cv);
      const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter;
      digitTex.push({ cv, tex });
      digitMesh.push(instanced(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    }
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(() => digitTex.forEach((d, k) => { drawDigit(k + 1, d.cv); d.tex.needsUpdate = true; }));

    // where you are aiming: a soft square on the square, with a bright edge
    const aimGroup = new THREE.Group(); aimGroup.visible = false; group.add(aimGroup);
    const aimFill = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.38, depthWrite: false })); aimGroup.add(aimFill);
    const aimEdge = [0, 1, 2, 3].map(() => { const b = new THREE.Mesh(unit, new THREE.MeshBasicMaterial({ color: 0xffe066 })); aimGroup.add(b); return b; });

    // the crater where the bomb went off
    const crater = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: 0x3a0d06, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); crater.visible = false; group.add(crater);

    // bits flying about: fire, sparks, smoke, dirt and (for a win) confetti
    const KINDS = { fire: 0xff8a1f, spark: 0xffe36b, smoke: 0x3a3a3a, dirt: 0x7a5638, gold: 0xffc45c, green: 0x62e06f };
    const PN = 36, bits = {};
    Object.entries(KINDS).forEach(([k, color]) => {
      const mesh = instanced(unit, k === 'dirt' || k === 'smoke' ? new THREE.MeshLambertMaterial({ color }) : new THREE.MeshBasicMaterial({ color }), PN);
      mesh.count = PN; for (let n = 0; n < PN; n++) mesh.setMatrixAt(n, HIDDEN);
      bits[k] = { mesh, life: new Float32Array(PN), px: new Float32Array(PN), py: new Float32Array(PN), pz: new Float32Array(PN), vx: new Float32Array(PN), vy: new Float32Array(PN), vz: new Float32Array(PN), size: new Float32Array(PN), next: 0 };
    });
    function burst(kind, x, y, z, n, speed, up, size = 0.16, life = 1) {
      const b = bits[kind]; if (!b) return;
      for (let k = 0; k < n; k++) {
        const s = b.next; b.next = (b.next + 1) % PN;
        const a = Math.random() * Math.PI * 2, r = Math.random() * speed;
        b.px[s] = x + (Math.random() - 0.5) * 0.3; b.py[s] = y; b.pz[s] = z + (Math.random() - 0.5) * 0.3;
        b.vx[s] = Math.cos(a) * r; b.vz[s] = Math.sin(a) * r; b.vy[s] = up * (0.5 + Math.random() * 0.7);
        b.size[s] = size * (0.6 + Math.random() * 0.8); b.life[s] = life * (0.7 + Math.random() * 0.6);
      }
    }

    /* ----- laying the squares out ----- */
    const Lv = () => M.levelOf(level);
    function placeBox(mesh, slot, x, y, z, sx, sy, sz, ry = 0) {
      dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(0, ry, 0); dummy.updateMatrix(); mesh.setMatrixAt(slot, dummy.matrix);
    }
    function setGrass(i, k) {
      const L = Lv(), c = M.tileCenter(level, i);
      if (k <= 0.001) { grass.setMatrixAt(i, HIDDEN); return; }
      const h = GRASS_H * k;
      placeBox(grass, i, c.x, h / 2, c.z, L.tile * LAYERS.tileGrass, h, L.tile * LAYERS.tileGrass);
    }
    function setDirt(i) { const L = Lv(), c = M.tileCenter(level, i); placeBox(dirt, i, c.x, DIRT_H / 2, c.z, L.tile * LAYERS.tileDirt, DIRT_H, L.tile * LAYERS.tileDirt); }

    function layout() {
      const L = Lv(), n = L.size * L.size;
      grass.count = dirt.count = n;
      for (let i = 0; i < n; i++) { setGrass(i, 1); setDirt(i); }
      grass.instanceMatrix.needsUpdate = dirt.instanceMatrix.needsUpdate = true;
    }
    function rebuildNumbers() {
      const L = Lv(), lists = Array.from({ length: 8 }, () => []);
      numberAt.forEach((n, i) => lists[n - 1].push(i));
      lists.forEach((list, k) => {
        const m = digitMesh[k]; m.count = list.length;
        list.forEach((i, s) => { const c = M.tileCenter(level, i); placeBox(m, s, c.x, LAYERS.digit, c.z, L.tile * 0.8, 1, L.tile * 0.8); });
        m.instanceMatrix.needsUpdate = true;
      });
    }
    /** A flag is a white pole with a cloth on it: red, or grey if the square turned out to be safe (shown when a game is lost). */
    function rebuildFlags() {
      const L = Lv(), fs = 0.6 + 0.4 * L.tile, bad = new Set(wrongFlags);
      let a = 0, r = 0, w = 0;
      if (game) for (let i = 0; i < game.cells; i++) {
        if (!game.flag[i]) continue;
        const c = M.tileCenter(level, i);
        placeBox(pole, a++, c.x, GRASS_H + 0.5 * fs, c.z, 0.09 * fs, 1.0 * fs, 0.09 * fs);
        if (bad.has(i)) placeBox(clothBad, w++, c.x + 0.3 * fs, GRASS_H + 0.84 * fs, c.z, 0.55 * fs, 0.34 * fs, 0.05 * fs);
        else placeBox(cloth, r++, c.x + 0.3 * fs, GRASS_H + 0.84 * fs, c.z, 0.55 * fs, 0.34 * fs, 0.05 * fs);
      }
      pole.count = a; cloth.count = r; clothBad.count = w;
      pole.instanceMatrix.needsUpdate = cloth.instanceMatrix.needsUpdate = clothBad.instanceMatrix.needsUpdate = true;
    }
    function showBombs(list, exploded) {
      const L = Lv(), bs = 0.35 + 0.25 * L.tile;
      bomb.count = spark.count = list.length;
      list.forEach((i, s) => {
        const c = M.tileCenter(level, i), big = i === exploded ? 1.35 : 1;
        placeBox(bomb, s, c.x, DIRT_H + bs * big * 0.5, c.z, bs * big, bs * big, bs * big, Math.PI / 4);
        placeBox(spark, s, c.x, DIRT_H + bs * big + 0.07, c.z, 0.13, 0.13, 0.13, Math.PI / 4);
      });
      bomb.instanceMatrix.needsUpdate = spark.instanceMatrix.needsUpdate = true;
      if (exploded >= 0) {
        const c = M.tileCenter(level, exploded);
        crater.position.set(c.x, LAYERS.crater, c.z); crater.scale.set(L.tile * 0.92, 1, L.tile * 0.92); crater.visible = true;
      }
    }

    function resetVisuals() {
      anim.clear(); numberAt.clear(); wrongFlags = []; bombsShown = []; endAt = -1;
      bomb.count = spark.count = 0; crater.visible = false;
      layout(); rebuildNumbers(); rebuildFlags();
    }

    /* ----- starting a game ----- */
    function start(lv, rng) {
      level = M.levelOf(lv).level;
      game = M.newGame(level, rng);
      resetVisuals();
      emit({ type: 'start', level });
    }
    /** No game: a plain 10 x 10 patch of grass waits for you to pick a level. */
    function idle() { game = null; level = 1; resetVisuals(); }

    /* ----- aiming ----- */
    const contains = (x, z, margin = 0.6) => M.insidePlot(x, z, margin);
    const eye = p => ({ x: p.x, y: p.eye + (p.lift || 0), z: p.z });
    const aimIndex = p => (game ? M.aim(level, eye(p), M.lookDir(p.yaw, p.pitch), i => game.revealed[i] === 1) : -1);

    /* ----- acting ----- */
    function beginDig(res) {
      res.revealed.forEach(({ i, depth }) => anim.set(i, { delay: reduced() ? 0 : depth * RIPPLE, t: reduced() ? 1 : 0, depth }));
    }
    function explode(i) {
      const c = M.tileCenter(level, i), rep = M.report(game);
      wrongFlags = rep.wrongFlags;
      showBombs([i, ...rep.bombs.filter(b => b !== i)], i);
      bombsShown = [i, ...rep.bombs];
      // the bombs you did not flag come up out of the grass, starting nearest the one that went off
      rep.bombs.forEach(b => { const d = M.tileCenter(level, b); anim.set(b, { delay: 0.25 + Math.hypot(d.x - c.x, d.z - c.z) * 0.06, t: 0, depth: 0, bomb: true }); });
      setGrass(i, 0); grass.instanceMatrix.needsUpdate = true;
      rebuildFlags();
      if (!reduced()) {
        burst('fire', c.x, 0.4, c.z, 18, 3.2, 6.5, 0.28, 0.9); burst('spark', c.x, 0.5, c.z, 14, 4.5, 8, 0.12, 0.8);
        burst('smoke', c.x, 0.5, c.z, 14, 1.8, 3.2, 0.34, 1.5); burst('dirt', c.x, 0.3, c.z, 18, 3.5, 5.5, 0.2, 1.1);
      }
      shake = reduced() ? 0 : 0.5;
      Store.set({ minesLosses: (Store.get().minesLosses || 0) + 1 });
      endAt = 0;
      emit({ type: 'boom', index: i });
      emit({ type: 'lose', level });
    }
    function celebrate() {
      const pay = Economy.PAY.mines[level - 1];
      Store.earn(pay);
      Trophies.award('mines');
      Store.set({ minesWins: (Store.get().minesWins || 0) + 1 });
      if (!reduced()) {
        const L = Lv();
        for (let k = 0; k < 6; k++) {
          const x = M.PLOT_AT.x0 + Math.random() * M.PLOT, z = M.PLOT_AT.z0 + Math.random() * M.PLOT;
          burst(k % 2 ? 'gold' : 'green', x, 0.8, z, 6, 1.2, 6.5, 0.15, 1.6);
        }
      }
      endAt = 0;
      emit({ type: 'win', level, pay });
    }

    /** Dig the square under the crosshair. Returns { ok, reason?, event? } (event is 'win' or 'lose' when that ended the game). */
    function dig(p) {
      if (!game) return { ok: false, reason: 'nogame' };
      if (game.state === 'won' || game.state === 'lost') return { ok: false, reason: 'over' };
      const i = aimIndex(p); if (i < 0) return { ok: false, reason: 'noaim' };
      const r = M.dig(game, i);
      if (!r.ok) return { ok: false, reason: r.reason };
      if (r.exploded) { explode(i); return { ok: true, event: 'lose' }; }
      beginDig(r);
      if (r.won) { celebrate(); return { ok: true, event: 'win' }; }
      return { ok: true };
    }
    /** Flag, or unflag, the square under the crosshair. */
    function flag(p) {
      if (!game) return { ok: false, reason: 'nogame' };
      if (game.state === 'won' || game.state === 'lost') return { ok: false, reason: 'over' };
      const i = aimIndex(p); if (i < 0) return { ok: false, reason: 'noaim' };
      const r = M.flag(game, i);
      if (!r.ok) return { ok: false, reason: r.reason };
      rebuildFlags();
      if (r.won) { celebrate(); return { ok: true, event: 'win' }; }
      return { ok: true };
    }

    /* ----- every frame ----- */
    function update(dt, t, p, visible) {
      // squares sinking
      let numbersChanged = false, grassChanged = false;
      anim.forEach((a, i) => {
        if (a.delay > 0) { a.delay -= dt; return; }
        if (a.t === 0 && !a.bomb && !reduced() && a.depth < 7 && Math.random() < 0.5) { const c = M.tileCenter(level, i); burst('dirt', c.x, 0.3, c.z, 2, 1.2, 2.2, 0.1, 0.6); }
        a.t += dt / SHRINK;
        const k = Math.max(0, 1 - a.t);
        setGrass(i, k); grassChanged = true;
        if (a.t >= 1) {
          anim.delete(i);
          if (!a.bomb && game && game.count && game.count[i] > 0) { numberAt.set(i, game.count[i]); numbersChanged = true; }
        }
      });
      if (grassChanged) grass.instanceMatrix.needsUpdate = true;
      if (numbersChanged) rebuildNumbers();

      // flying bits
      Object.values(bits).forEach(b => {
        let any = false;
        for (let s = 0; s < PN; s++) {
          if (b.life[s] <= 0) continue;
          any = true; b.life[s] -= dt;
          b.vy[s] -= 14 * dt; b.px[s] += b.vx[s] * dt; b.py[s] += b.vy[s] * dt; b.pz[s] += b.vz[s] * dt;
          if (b.py[s] < 0.1) { b.py[s] = 0.1; b.vy[s] *= -0.3; b.vx[s] *= 0.7; b.vz[s] *= 0.7; }
          const k = b.life[s] > 0 ? Math.min(1, b.life[s] * 2.5) * b.size[s] : 0;
          dummy.position.set(b.px[s], b.py[s], b.pz[s]); dummy.scale.set(k, k, k); dummy.rotation.set(b.px[s], b.py[s], 0); dummy.updateMatrix();
          b.mesh.setMatrixAt(s, k > 0 ? dummy.matrix : HIDDEN);
        }
        if (any) b.mesh.instanceMatrix.needsUpdate = true;
      });
      if (shake > 0) shake = Math.max(0, shake - dt);
      if (endAt >= 0) endAt += dt;

      // the aim marker
      const i = visible && game && (game.state === 'ready' || game.state === 'playing') && contains(p.x, p.z, 0.6) ? aimIndex(p) : -1;
      aimGroup.visible = i >= 0;
      if (i >= 0) {
        const L = Lv(), c = M.tileCenter(level, i), top = game.revealed[i] ? DIRT_H : GRASS_H, s = L.tile * 0.96, e = 0.06;
        aimGroup.position.set(c.x, top + LAYERS.aim, c.z);
        aimFill.scale.set(s, 1, s);
        [[0, -s / 2 + e / 2, s, e], [0, s / 2 - e / 2, s, e], [-s / 2 + e / 2, 0, e, s], [s / 2 - e / 2, 0, e, s]].forEach(([x, z, w, d], k) => { aimEdge[k].position.set(x, 0.012, z); aimEdge[k].scale.set(w, 0.025, d); });
      }
    }

    idle();
    return {
      start, idle, dig, flag, update, contains, aimIndex, on: fn => listeners.push(fn),
      get game() { return game; }, get level() { return level; }, get shaking() { return shake; },
      status: () => (game ? { ...M.status(game), level, name: Lv().name, size: Lv().size, mines: Lv().mines, pay: Economy.PAY.mines[level - 1] } : null),
      // for tests: how much of each thing is on screen
      stats: () => ({ grass: grass.count, flags: cloth.count, wrongFlags: clothBad.count, bombs: bomb.count, numbers: [...numberAt.values()].length, sinking: anim.size, crater: crater.visible }),
      numberAt: () => new Map(numberAt),
      group,
    };
  }

  return { create, GRASS_H, DIRT_H, LAYERS, DIGIT_COLORS };
})();
