/* Zones are self-contained: a THREE.Group, colliders, interactables, NPCs, and
   per-frame animators. main.js swaps which zone is visible. Add a new zone by
   writing another build function that returns createZone(...). */
const World = (() => {
  const T = THREE;

  /* ---------- helpers ---------- */
  function blockMats(name, w, h, d) {
    // +x, -x, +y, -y, +z, -z: repeat counts keep texel density constant
    return [
      Tex.mat(name, d, h), Tex.mat(name, d, h),
      Tex.mat(name, w, d), Tex.mat(name, w, d),
      Tex.mat(name, w, h), Tex.mat(name, w, h),
    ];
  }

  function box(g, mat, w, h, d, x, y, z) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof mat === 'string' ? blockMats(mat, w, h, d) : mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  const lambert = c => new T.MeshLambertMaterial({ color: c });
  const glow = c => new T.MeshBasicMaterial({ color: c });

  function flat(g, name, w, d, x, y, z, facingDown = false) {
    const m = new T.Mesh(new T.PlaneGeometry(w, d), Tex.mat(name, w, d));
    m.rotation.x = facingDown ? Math.PI / 2 : -Math.PI / 2;
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  function makeSign({ w, h, title, sub, fg = '#ffffff', bg = '#222222', border = '#888888', subColor }) {
    const ppu = 128;
    const c = document.createElement('canvas');
    c.width = Math.round(w * ppu);
    c.height = Math.round(h * ppu);
    const g = c.getContext('2d');
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = border;
    g.lineWidth = 10;
    g.strokeRect(5, 5, c.width - 10, c.height - 10);
    const font = px => `${px}px Silkscreen, "Courier New", monospace`;
    let size = c.height * (sub ? 0.42 : 0.5);
    g.font = font(size);
    while (g.measureText(title).width > c.width * 0.88 && size > 10) { size -= 2; g.font = font(size); }
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(title, c.width / 2, sub ? c.height * 0.4 : c.height / 2);
    if (sub) {
      g.font = font(c.height * 0.17);
      g.fillStyle = subColor || fg;
      g.fillText(sub, c.width / 2, c.height * 0.76);
    }
    const tex = new T.CanvasTexture(c);
    tex.anisotropy = 4;
    return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex }));
  }

  function createZone(name, o) {
    return {
      name, group: new T.Group(), colliders: [], interactables: [], npcs: [], animated: [],
      spawn: o.spawn, bounds: o.bounds, sky: o.sky, fog: o.fog, wander: o.wander,
    };
  }
  const solid = (zone, x, z, w, d) =>
    zone.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  const interact = (zone, x, z, r, label, action) => zone.interactables.push({ x, z, r, label, action });

  const Collide = {
    blocked(zone, x, z, r) {
      const b = zone.bounds;
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return true;
      for (const c of zone.colliders) {
        if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
      }
      return false;
    },
  };

  /* ---------- NPC students ---------- */
  function pickTarget(zone, n) {
    const w = zone.wander;
    for (let i = 0; i < 12; i++) {
      const x = w.minX + Math.random() * (w.maxX - w.minX);
      const z = w.minZ + Math.random() * (w.maxZ - w.minZ);
      if (!Collide.blocked(zone, x, z, 0.6)) { n.tx = x; n.tz = z; return; }
    }
    n.tx = n.x; n.tz = n.z;
  }

  function spawnNPCs(zone, count) {
    for (let i = 0; i < count; i++) {
      const avatar = Avatar.make(Avatar.randomLook());
      const n = { avatar, x: 0, z: 0, tx: 0, tz: 0, wait: Math.random() * 2 };
      for (let k = 0; k < 20; k++) {
        const w = zone.wander;
        n.x = w.minX + Math.random() * (w.maxX - w.minX);
        n.z = w.minZ + Math.random() * (w.maxZ - w.minZ);
        if (!Collide.blocked(zone, n.x, n.z, 0.6)) break;
      }
      avatar.position.set(n.x, 0, n.z);
      pickTarget(zone, n);
      zone.group.add(avatar);
      zone.npcs.push(n);
    }
  }

  function updateNPCs(zone, dt, t) {
    for (const n of zone.npcs) {
      const anim = n.anim || Avatar.animate;
      if (n.wait > 0) { n.wait -= dt; anim(n.avatar, 0, t); continue; }
      const dx = n.tx - n.x, dz = n.tz - n.z;
      const dist = Math.hypot(dx, dz);
      const [lo, hi] = n.pause || [1, 4];
      if (dist < 0.3) { n.wait = lo + Math.random() * (hi - lo); pickTarget(zone, n); continue; }
      const step = (n.speed || 1.6) * dt;
      const nx = n.x + (dx / dist) * step, nz = n.z + (dz / dist) * step;
      if (Collide.blocked(zone, nx, nz, n.radius || 0.4)) { pickTarget(zone, n); n.wait = 0.2; continue; }
      n.x = nx; n.z = nz;
      n.avatar.position.set(nx, 0, nz);
      n.avatar.rotation.y = Math.atan2(dx, dz);
      anim(n.avatar, 1, t);
    }
  }

  /** A floating name above a creature (always faces the camera). */
  function nameTag(text) {
    const c = document.createElement('canvas');
    c.width = 192; c.height = 56;
    const g = c.getContext('2d');
    g.font = '28px Silkscreen, "Courier New", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = '#000000';
    g.strokeText(text, 96, 28);
    g.fillStyle = '#ffffff';
    g.fillText(text, 96, 28);
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    sprite.scale.set(0.9, 0.26, 1);
    sprite.name = `${text} label`;
    return sprite;
  }

  /** Remy, the light brown and white calico who wanders the village. Not for sale. */
  function spawnRemy(zone, actions) {
    const cat = Pets.make('cat', 'calico');
    const tag = nameTag('Remy');
    tag.position.set(0, 0.78, 0);
    cat.add(tag);
    const n = {
      avatar: cat, anim: Pets.animate, name: 'Remy', speed: 1.15, radius: 0.3, pause: [2, 7],
      x: 5, z: 15, tx: 5, tz: 15, wait: 1,
    };
    cat.position.set(n.x, 0, n.z);
    pickTarget(zone, n);
    zone.group.add(cat);
    zone.npcs.push(n);
    // you can say hi: the "Pet Remy" spot follows her around
    const spot = { x: n.x, z: n.z, r: 1.8, label: 'Pet Remy', action: () => actions.petRemy && actions.petRemy() };
    zone.interactables.push(spot);
    zone.animated.push(() => { spot.x = n.x; spot.z = n.z; });
    return n;
  }

  /* ---------- hub: the village ---------- */
  function addTree(zone, x, z) {
    const g = zone.group;
    box(g, 'log', 1, 3, 1, x, 1.5, z);
    box(g, 'leaves', 3, 3, 3, x, 4, z);
    box(g, 'leaves', 1.8, 1, 1.8, x, 6, z);
    solid(zone, x, z, 1.2, 1.2);
  }

  function buildShop(zone, s, def, onUse) {
    const g = zone.group;
    box(g, 'planks', 6, 4.2, 7, s.x, 2.1, s.z);
    box(g, def.roof, 6.8, 0.6, 7.8, s.x, 4.5, s.z);
    const face = s.x + s.facing * 3;
    box(g, lambert(0x3a2412), 0.12, 3, 1.8, face + s.facing * 0.06, 1.5, s.z);
    [-2.4, 2.4].forEach(dz => box(g, glow(0xbfe6ff), 0.1, 1.2, 1.2, face + s.facing * 0.05, 2.4, s.z + dz));
    const sign = makeSign({ w: 4.4, h: 1.0, title: def.sign, fg: '#fff3c4', bg: '#3a2412', border: '#c89a54' });
    sign.position.set(face + s.facing * 0.08, 3.65, s.z);
    sign.rotation.y = s.facing * Math.PI / 2;
    g.add(sign);
    solid(zone, s.x, s.z, 6.2, 7.2);
    interact(zone, s.x + s.facing * 4.6, s.z, 2.4, `Browse the ${def.title}`, onUse);
  }

  function buildHub(actions) {
    const zone = createZone('Prime Time Village', {
      spawn: { x: 0, z: 20, yaw: 0 },
      bounds: { minX: -34, maxX: 34, minZ: -33, maxZ: 32 },
      sky: 0x8fc8f0, fog: [0x8fc8f0, 45, 120],
      wander: { minX: -30, maxX: 30, minZ: -17, maxZ: 28 },
    });
    const g = zone.group;

    g.add(new T.HemisphereLight(0xffffff, 0x6a7a55, 0.8));
    const sun = new T.DirectionalLight(0xfff2d0, 0.65);
    sun.position.set(30, 60, 20);
    g.add(sun);

    flat(g, 'grass', 160, 160, 0, 0, 0);
    flat(g, 'path', 6, 44, 0, 0.03, 2);

    // shops face the main path
    const spots = [
      { id: 'pencils', x: -9, z: 6, facing: 1 },
      { id: 'style', x: -9, z: -6, facing: 1 },
      { id: 'hints', x: 9, z: 6, facing: -1 },
      { id: 'pets', x: 9, z: -6, facing: -1 },
    ];
    spots.forEach(s => buildShop(zone, s, CONTENT.shops[s.id], () => actions.openShop(s.id)));

    // casino front
    box(g, 'brick', 20, 9, 12, 0, 4.5, -26);
    box(g, 'wallDark', 21, 0.8, 13, 0, 9.4, -26);
    box(g, glow(0xff4fd8), 4.0, 4.8, 0.1, 0, 2.4, -19.95);
    box(g, glow(0x120a1c), 3.4, 4.4, 0.2, 0, 2.2, -19.85);
    const casinoSign = makeSign({
      w: 14, h: 2.2, title: 'PRIME TIME CASINO', sub: 'factor it. wager it. win it.',
      fg: '#ff4fd8', bg: '#12081e', border: '#38e8ff', subColor: '#38e8ff',
    });
    casinoSign.position.set(0, 7.0, -19.95);
    g.add(casinoSign);
    [-10.3, 10.3].forEach(x => box(g, glow(0x38e8ff), 0.4, 9, 0.4, x, 4.5, -19.9));
    solid(zone, 0, -26, 20.2, 12.2);
    interact(zone, 0, -18.2, 2.2, 'Enter the Casino', actions.enterCasino);

    // notice board near the spawn
    box(g, 'log', 0.3, 2.2, 0.3, -5.2, 1.1, 16);
    box(g, 'log', 0.3, 2.2, 0.3, -2.8, 1.1, 16);
    box(g, 'planks', 2.9, 1.4, 0.2, -4, 1.7, 16);
    const board = makeSign({ w: 2.5, h: 1.0, title: 'HOW TO PLAY', fg: '#3a2412', bg: '#e8d7a8', border: '#8a6a34' });
    board.position.set(-4, 1.7, 16.12);
    g.add(board);
    solid(zone, -4, 16, 3.2, 0.6);
    interact(zone, -4, 17.6, 2.0, 'Read the notice board', actions.readBoard);

    // trees, fence, clouds
    [[-22, -12], [-26, 2], [-22, 14], [-29, 24], [-30, -20], [22, -14], [27, 4], [21, 16], [29, 26], [31, -18], [-14, 26], [14, 28], [-16, -25]]
      .forEach(([x, z]) => addTree(zone, x, z));

    const b = zone.bounds;
    const lenX = b.maxX - b.minX + 2, lenZ = b.maxZ - b.minZ + 2;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    [[b.minX - 1, cz, 0.3, lenZ], [b.maxX + 1, cz, 0.3, lenZ]].forEach(([x, z, w, d]) => box(g, 'planks', w, 1.2, d, x, 0.6, z));
    [[cx, b.minZ - 1, lenX, 0.3], [cx, b.maxZ + 1, lenX, 0.3]].forEach(([x, z, w, d]) => box(g, 'planks', w, 1.2, d, x, 0.6, z));

    const cloudMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const clouds = [];
    for (let i = 0; i < 9; i++) {
      const c = box(g, cloudMat, 8 + Math.random() * 10, 1.5, 5 + Math.random() * 6, (Math.random() - 0.5) * 150, 38 + Math.random() * 6, (Math.random() - 0.5) * 150);
      clouds.push(c);
    }
    zone.animated.push(dt => clouds.forEach(c => { c.position.x += dt * 0.7; if (c.position.x > 85) c.position.x = -85; }));

    spawnNPCs(zone, 5);
    spawnRemy(zone, actions);
    return zone;
  }

  /* ---------- casino interior ---------- */
  /* ---------- floating voxel symbols over the tables ---------- */
  // Cells are [col, row] with row 0 at the bottom. Shapes are rasterized from strokes or
  // from a tiny bitmap font, then built as one instanced mesh each (one draw call).

  /** Cells whose centers are within r of the polyline. Points are in cell space (0..w, 0..h). */
  function strokeCells(points, w, h, r) {
    const cells = [];
    for (let c = 0; c < w; c++) {
      for (let row = 0; row < h; row++) {
        const px = c + 0.5, py = row + 0.5;
        let best = Infinity;
        for (let i = 0; i < points.length - 1; i++) {
          const [x1, y1] = points[i], [x2, y2] = points[i + 1];
          const dx = x2 - x1, dy = y2 - y1;
          const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
          best = Math.min(best, Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)));
        }
        if (best <= r) cells.push([c, row]);
      }
    }
    return cells;
  }

  const GLYPHS = {
    a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
    x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
    c: ['.....', '.....', '.###.', '#....', '#....', '#...#', '.###.'],
    '+': ['.....', '.....', '..#..', '..#..', '#####', '..#..', '..#..'],
    sq: ['###', '..#', '###', '#..', '###'], // the little ² (top aligned)
    '(': ['..#', '.#.', '#..', '#..', '#..', '.#.', '..#'],
    ')': ['#..', '.#.', '..#', '..#', '..#', '.#.', '#..'],
    '-': ['.....', '.....', '.....', '.....', '#####', '.....', '.....'],
    h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
    k: ['#....', '#....', '#...#', '#..#.', '###..', '#..#.', '#...#'],
  };

  const WIDE = 4; // empty columns on each side of a + or - sign

  /** Lay glyphs out left to right. gapFor(key, nextKey) is the number of empty columns between them. */
  function textCells(seq, gapFor) {
    const cells = [];
    let cursor = 0;
    seq.forEach((key, i) => {
      const rows = GLYPHS[key];
      rows.forEach((line, ri) => {
        [...line].forEach((ch, ci) => { if (ch === '#') cells.push([cursor + ci, 6 - ri]); });
      });
      cursor += rows[0].length + (i < seq.length - 1 ? gapFor(key, seq[i + 1]) : 0);
    });
    return { cells, w: cursor, h: 7 };
  }
  const isOp = k => k === '+' || k === '-';

  /** "ax² + bx + c": wide gaps around both plus signs, tight inside ax² and bx. */
  const quadraticCells = () => textCells(['a', 'x', 'sq', '+', 'b', 'x', '+', 'c'],
    (k, n) => (isOp(k) || isOp(n) ? WIDE : 1));

  /** "a(x - h)² + k": wide gaps around + and -, parentheses hug what is inside them,
      and the little ² sits close to its closing parenthesis. */
  const vertexFormCells = () => textCells(['a', '(', 'x', '-', 'h', ')', 'sq', '+', 'k'],
    (k, n) => (isOp(k) || isOp(n) ? WIDE : k === 'a' ? 2 : 1));

  const radicalCells = () => ({
    cells: strokeCells([[0.5, 5.2], [2.2, 6.8], [4.6, 0.7], [9, 13.3], [14, 13.3]], 14, 14, 0.66),
    w: 14, h: 14,
  });

  const parabolaCells = () => {
    const pts = [];
    for (let t = -1; t <= 1.0001; t += 0.05) pts.push([7.5 + 7 * t, 0.7 + 12.6 * t * t]);
    return { cells: strokeCells(pts, 15, 14, 0.8), w: 15, h: 14 };
  };

  const SYMBOLS = {
    sqrt:      { shape: radicalCells,   u: 0.1,   mirrorBack: false },
    quadratic: { shape: quadraticCells, u: 0.08,  mirrorBack: false },
    parabola:  { shape: parabolaCells,  u: 0.1,   mirrorBack: false },
    vertexform: { shape: vertexFormCells, u: 0.08, mirrorBack: false },
  };

  /** Two layers thick so it never vanishes edge-on. (mirrorBack flips the rear layer, but a flipped
      copy shows through the gaps between letters, so the text uses a plain solid slab instead.) */
  function buildSymbol(kind, color) {
    const def = SYMBOLS[kind];
    const { cells, w, h } = def.shape();
    const u = def.u;
    const mat = new T.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.6 });
    const mesh = new T.InstancedMesh(new T.BoxGeometry(u, u, u), mat, cells.length * 2);
    mesh.frustumCulled = false; // instances sit around the origin, which the default bounds ignore
    const m = new T.Matrix4();
    let n = 0;
    [0, 1].forEach(layer => {
      cells.forEach(([c, r]) => {
        const col = layer === 1 && def.mirrorBack ? w - 1 - c : c;
        m.makeTranslation((col + 0.5 - w / 2) * u, (r + 0.5 - h / 2) * u, layer === 0 ? u / 2 : -u / 2);
        mesh.setMatrixAt(n++, m);
      });
    });
    mesh.instanceMatrix.needsUpdate = true;
    const group = new T.Group();
    group.add(mesh);
    group.userData.size = { w: w * u, h: h * u, cells: cells.length };
    return group;
  }

  function buildTable(zone, x, z, felt, title, sub, color, onUse, opts = {}) {
    const { prop = 'dice', facing = 1, accent = 0xffffff } = opts;
    const g = zone.group;
    box(g, 'wood', 5.2, 0.9, 2.6, x, 0.45, z);
    box(g, 'wood', 5.8, 0.15, 3.4, x, 0.92, z);
    box(g, felt, 5.4, 0.2, 3.0, x, 1.05, z);

    if (prop === 'dice') {
      const dice = [];
      [[-1.2, -0.4], [0.1, 0.5], [1.3, -0.2]].forEach(([dx, dz], i) => {
        const d = new T.Mesh(new T.IcosahedronGeometry(0.24, 0), new T.MeshPhongMaterial({ color: 0xf4f1e8, flatShading: true, shininess: 40 }));
        d.position.set(x + dx, 1.35, z + dz);
        d.rotation.set(i, i * 2, 0);
        g.add(d);
        dice.push(d);
      });
      zone.animated.push(dt => dice.forEach((d, i) => { d.rotation.y += dt * (0.5 + i * 0.15); }));
    } else {
      // a symbol that floats above the table, bobbing gently and turning in place
      const sym = buildSymbol(prop, accent);
      const baseY = 2.15;
      sym.position.set(x, baseY, z);
      g.add(sym);
      zone.symbols = zone.symbols || [];
      zone.symbols.push({ kind: prop, group: sym, x, z });
      zone.animated.push((dt, t) => {
        sym.rotation.y += dt * 0.9;
        sym.position.y = baseY + Math.sin(t * 1.6 + x) * 0.07;
      });
    }

    const sign = makeSign({ w: 4.6, h: 1.3, title, sub, fg: color, bg: '#12081e', border: color, subColor: '#e8e0f5' });
    sign.position.set(x, 3.6, z);
    // the sign faces the player: south (+z) for the north-wall tables, north (-z) for the ones behind you
    sign.rotation.y = facing < 0 ? Math.PI : 0;
    g.add(sign);

    solid(zone, x, z, 5.9, 3.5);
    interact(zone, x, z + 2.8 * facing, 2.2, `Sit at the ${title.toLowerCase()}`, onUse);
  }

  function buildCasino(actions) {
    const zone = createZone('Prime Time Casino', {
      spawn: { x: 0, z: 3, yaw: 0 },
      bounds: { minX: -14.4, maxX: 14.4, minZ: -11.4, maxZ: 11.4 },
      sky: 0x0b0614, fog: [0x0b0614, 14, 40],
      wander: { minX: -12, maxX: 12, minZ: 2, maxZ: 9 },
    });
    const g = zone.group;

    g.add(new T.AmbientLight(0x6a5a88, 0.9));
    [[-10, 6.5, -7, 0xff4fd8], [10, 6.5, -7, 0x38e8ff], [-10, 6.5, 6, 0x38e8ff], [10, 6.5, 6, 0xff4fd8]].forEach(([x, y, z, c]) => {
      const p = new T.PointLight(c, 0.9, 22);
      p.position.set(x, y, z);
      g.add(p);
    });

    flat(g, 'carpet', 30, 24, 0, 0, 0);
    box(g, 'ceiling', 30, 0.3, 24, 0, 8.15, 0);
    box(g, 'wallDark', 30, 8, 0.5, 0, 4, -12.25);
    box(g, 'wallDark', 30, 8, 0.5, 0, 4, 12.25);
    box(g, 'wallDark', 0.5, 8, 24, -15.25, 4, 0);
    box(g, 'wallDark', 0.5, 8, 24, 15.25, 4, 0);

    // neon trim
    box(g, glow(0xff4fd8), 29.6, 0.15, 0.1, 0, 6.5, -11.95);
    box(g, glow(0x38e8ff), 0.1, 0.15, 23.6, -14.95, 6.5, 0);
    box(g, glow(0x38e8ff), 0.1, 0.15, 23.6, 14.95, 6.5, 0);
    box(g, glow(0xff4fd8), 29.6, 0.15, 0.1, 0, 6.5, 11.95);

    // pillars
    [[-10, -7], [10, -7], [-10, 6], [10, 6]].forEach(([x, z]) => {
      box(g, 'stone', 1, 7.6, 1, x, 3.8, z);
      box(g, glow(0xffd36b), 1.2, 0.3, 1.2, x, 7.7, z);
      solid(zone, x, z, 1, 1);
    });

    // three tables on the north wall, in front of you as you walk in...
    buildTable(zone, -9, -4, 'felt', 'PRACTICE TABLE', 'live product. no risk.', '#52f08f', () => actions.openTable('practice'));
    buildTable(zone, 0, -4, 'feltBlue', 'RADICAL TABLE', 'factor, pair up, simplify', '#38e8ff', () => actions.openTable('radical'),
      { prop: 'sqrt', accent: 0x38e8ff });
    buildTable(zone, 9, -4, 'feltRed', 'TRINOMIAL TABLE', 'split the middle. bet chips.', '#ff6a6a', () => actions.openTable('trinomial'),
      { prop: 'quadratic', accent: 0xff6a6a });
    // ...and one behind you on the south side, off to one side of the exit door
    buildTable(zone, 5, 8, 'feltPurple', 'PARABOLA TABLE', 'axis. vertex. sketch it.', '#d58bff', () => actions.openTable('parabola'),
      { prop: 'parabola', accent: 0xd58bff, facing: -1 });

    // ...and a matching one behind you on the other side of the exit door, a mirror image of the parabola table
    buildTable(zone, -5, 8, 'feltGold', 'VERTEX TABLE', 'vertex form. sketch it.', '#ffb347', () => actions.openTable('vertex'),
      { prop: 'vertexform', accent: 0xffb347, facing: -1 });

    // exit door on the south wall
    box(g, glow(0x52f08f), 3.8, 4.8, 0.1, 0, 2.4, 11.9);
    box(g, glow(0x0c2a18), 3.4, 4.4, 0.2, 0, 2.2, 11.8);
    const exit = makeSign({ w: 2.4, h: 0.7, title: 'EXIT', fg: '#52f08f', bg: '#0c2a18', border: '#52f08f' });
    exit.position.set(0, 5.4, 11.9);
    exit.rotation.y = Math.PI;
    g.add(exit);
    interact(zone, 0, 10.6, 2.0, 'Leave the Casino', actions.leaveCasino);

    spawnNPCs(zone, 2);
    return zone;
  }

  return { buildHub, buildCasino, updateNPCs, Collide, symbolCells: { sqrt: radicalCells, quadratic: quadraticCells, parabola: parabolaCells, vertexform: vertexFormCells } };
})();
