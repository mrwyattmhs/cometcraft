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
  const interact = (zone, x, z, r, label, action, extra) => zone.interactables.push({ x, z, r, label, action, ...extra });   // extra: e.g. { lesson: 'vertex' }

  const Collide = {
    /** y is how high your feet are (0 on the ground). A collider with a hits(bottom, top) function, like a column of
        sandbox blocks, only stops you if something in it is at your body's height; everything else is always solid. */
    blocked(zone, x, z, r, y = 0) {
      const b = zone.bounds;
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return true;
      for (const c of zone.colliders) {
        if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) {
          if (c.hits && !c.hits(y, y + 1.8)) continue;
          return true;
        }
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

  /* ---------- shop storefronts: each one shows what it sells ---------- */
  /** The look of each shop: its colors, the picture in its windows, and a tagline under its name. */
  const SHOP_LOOKS = {
    accessories: { wall: 0xf4e4a1, trim: 0x27386b, door: 0x27386b, awning: [0xf2c230, 0x27386b], roof: 0x27386b, roofTrim: 0xf2c230,
      sign: { bg: '#27386b', fg: '#fff3c4', border: '#f2c230', subColor: '#f2c230' }, tag: 'pencils & calculators' },
    style: { wall: 0xf6cfe0, trim: 0xffffff, door: 0x8a2f6a, awning: [0xff7fb0, 0xffffff], roof: 0x6a2f6a, roofTrim: 0xff7fb0,
      sign: { bg: '#6a2f6a', fg: '#ffffff', border: '#ff9fc4', subColor: '#ffc2dc' }, tag: 'shirts, pants & hats' },
    pets: { wall: 0xc8e8b6, trim: 0x6b4423, door: 0x6b4423, awning: [0x4fae5a, 0xffffff], roof: 0x8a5a30, roofTrim: 0x4fae5a,
      sign: { bg: '#2f6b3a', fg: '#fff6d8', border: '#8fd49a', subColor: '#bfe8c6' }, tag: 'dogs, cats & rabbits' },
    hints: { wall: 0x463c8a, trim: 0xe8c35a, door: 0x2b2358, awning: [0x7d5fd0, 0xe8c35a], roof: 0x2b2358, roofTrim: 0xe8c35a,
      sign: { bg: '#1f1a4a', fg: '#ffe69a', border: '#e8c35a', subColor: '#cbbcff' }, tag: 'scrolls & tricks' },
  };

  /** The picture in a shop window (shapes only, so it reads from across the road). */
  const SHOP_WINDOWS = {
    accessories: (c, W, H) => {
      c.fillStyle = '#f3e7c4'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#8a5a30'; c.fillRect(0, H * 0.66, W, H * 0.07); c.fillRect(0, H * 0.96, W, H * 0.04);
      // a cup of pencils
      c.fillStyle = '#2f5fa8'; c.fillRect(W * 0.07, H * 0.46, W * 0.22, H * 0.2);
      ['#f2c230', '#e04b4b', '#3fa86a', '#7d5fd0', '#f08a30'].forEach((col, i) => {
        const x = W * (0.085 + i * 0.04), top = H * (0.18 + (i % 3) * 0.05);
        c.fillStyle = col; c.fillRect(x, top, W * 0.032, H * 0.3);
        c.fillStyle = '#e8c79a'; c.beginPath(); c.moveTo(x, top); c.lineTo(x + W * 0.032, top); c.lineTo(x + W * 0.016, top - H * 0.07); c.closePath(); c.fill();
      });
      // a graphing calculator, with a curve on its screen
      c.fillStyle = '#3a3d45'; c.fillRect(W * 0.38, H * 0.22, W * 0.27, H * 0.44);
      c.fillStyle = '#9be59b'; c.fillRect(W * 0.405, H * 0.26, W * 0.22, H * 0.14);
      c.strokeStyle = '#1d5a2c'; c.lineWidth = 3; c.beginPath(); c.moveTo(W * 0.42, H * 0.38); c.quadraticCurveTo(W * 0.515, H * 0.2, W * 0.61, H * 0.38); c.stroke();
      for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) { c.fillStyle = r === 0 && q === 3 ? '#f08a30' : '#c9ccd4'; c.fillRect(W * (0.41 + q * 0.055), H * (0.45 + r * 0.063), W * 0.04, H * 0.045); }
      // a second, smaller calculator and a ruler
      c.fillStyle = '#2f5fa8'; c.fillRect(W * 0.72, H * 0.4, W * 0.2, H * 0.26);
      c.fillStyle = '#9be59b'; c.fillRect(W * 0.74, H * 0.43, W * 0.16, H * 0.09);
      c.fillStyle = '#f2c230'; c.fillRect(W * 0.06, H * 0.8, W * 0.55, H * 0.1);
      c.fillStyle = '#6b4a14'; for (let i = 0; i < 9; i++) c.fillRect(W * (0.09 + i * 0.06), H * 0.8, 2, H * (i % 2 ? 0.04 : 0.065));
    },
    style: (c, W, H) => {
      c.fillStyle = '#fbe6ef'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#8a5a30'; c.fillRect(W * 0.04, H * 0.14, W * 0.92, H * 0.045);        // the clothes rail
      [['#3f8de0', 0.1], ['#4fb86a', 0.36], ['#e04b4b', 0.62]].forEach(([col, x]) => {
        const sx = W * x, sw = W * 0.26, sy = H * 0.2;
        c.fillStyle = '#6b6b72'; c.fillRect(sx + sw / 2 - 2, H * 0.13, 4, H * 0.07);          // hanger
        c.fillStyle = col; c.fillRect(sx + sw * 0.18, sy, sw * 0.64, H * 0.34);               // body
        c.fillRect(sx, sy, sw * 0.24, H * 0.14); c.fillRect(sx + sw * 0.76, sy, sw * 0.24, H * 0.14);   // sleeves
        c.fillStyle = '#fbe6ef'; c.fillRect(sx + sw * 0.4, sy, sw * 0.2, H * 0.06);           // neckline
      });
      c.fillStyle = '#2b3a67'; c.fillRect(W * 0.1, H * 0.62, W * 0.2, H * 0.28); c.fillRect(W * 0.34, H * 0.62, W * 0.2, H * 0.28);   // pants
      c.fillStyle = '#e04b4b'; c.fillRect(W * 0.62, H * 0.68, W * 0.26, H * 0.12);          // a cap
      c.beginPath(); c.arc(W * 0.75, H * 0.68, W * 0.11, Math.PI, 0); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(W * 0.62, H * 0.86, W * 0.12, H * 0.07); c.fillRect(W * 0.78, H * 0.86, W * 0.12, H * 0.07);   // sneakers
    },
    pets: (c, W, H) => {
      c.fillStyle = '#e6f5d8'; c.fillRect(0, 0, W, H);
      const eyes = (x, y, r) => { c.fillStyle = '#2b2b2b'; c.beginPath(); c.arc(x - r * 0.4, y, r * 0.14, 0, Math.PI * 2); c.arc(x + r * 0.4, y, r * 0.14, 0, Math.PI * 2); c.fill(); };
      // a dog
      c.fillStyle = '#8a5a30'; c.fillRect(W * 0.04, H * 0.18, W * 0.09, H * 0.3); c.fillRect(W * 0.3, H * 0.18, W * 0.09, H * 0.3);
      c.fillStyle = '#d9a566'; c.beginPath(); c.arc(W * 0.215, H * 0.42, W * 0.14, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f3dcb4'; c.beginPath(); c.arc(W * 0.215, H * 0.5, W * 0.07, 0, Math.PI * 2); c.fill();
      eyes(W * 0.215, H * 0.38, W * 0.2); c.fillStyle = '#2b2b2b'; c.fillRect(W * 0.2, H * 0.46, W * 0.03, H * 0.04);
      // a cat
      c.fillStyle = '#f0a050';
      [[0.43, 0.2, 0.5, 0.2, 0.46, 0.34, 0.52], [0.63, 0.2, 0.57, 0.2, 0.6, 0.34, 0.54]].length;
      c.beginPath(); c.moveTo(W * 0.4, H * 0.14); c.lineTo(W * 0.5, H * 0.3); c.lineTo(W * 0.4, H * 0.34); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(W * 0.66, H * 0.14); c.lineTo(W * 0.56, H * 0.3); c.lineTo(W * 0.66, H * 0.34); c.closePath(); c.fill();
      c.beginPath(); c.arc(W * 0.53, H * 0.45, W * 0.13, 0, Math.PI * 2); c.fill();
      eyes(W * 0.53, H * 0.42, W * 0.2); c.fillStyle = '#e8708a'; c.fillRect(W * 0.52, H * 0.47, W * 0.03, H * 0.03);
      c.strokeStyle = '#2b2b2b'; c.lineWidth = 2; c.beginPath(); c.moveTo(W * 0.4, H * 0.5); c.lineTo(W * 0.3, H * 0.48); c.moveTo(W * 0.66, H * 0.5); c.lineTo(W * 0.76, H * 0.48); c.stroke();
      // a rabbit
      c.fillStyle = '#f4f4f4'; c.fillRect(W * 0.78, H * 0.1, W * 0.05, H * 0.28); c.fillRect(W * 0.88, H * 0.1, W * 0.05, H * 0.28);
      c.beginPath(); c.arc(W * 0.855, H * 0.5, W * 0.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f4a8b8'; c.fillRect(W * 0.79, H * 0.14, W * 0.025, H * 0.2); c.fillRect(W * 0.895, H * 0.14, W * 0.025, H * 0.2);
      eyes(W * 0.855, H * 0.48, W * 0.14);
      // a food bowl and a ball on the floor
      c.fillStyle = '#c0392b'; c.fillRect(W * 0.1, H * 0.82, W * 0.24, H * 0.1);
      c.fillStyle = '#4aa3ff'; c.beginPath(); c.arc(W * 0.62, H * 0.86, W * 0.07, 0, Math.PI * 2); c.fill();
    },
    hints: (c, W, H) => {
      c.fillStyle = '#1f1a4a'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#ffe69a'; [[0.08, 0.12], [0.3, 0.08], [0.52, 0.16], [0.9, 0.1], [0.72, 0.06], [0.16, 0.34], [0.94, 0.4]].forEach(([x, y]) => c.fillRect(W * x, H * y, 5, 5));
      // an unrolled scroll with a few lines of writing
      c.fillStyle = '#f2e4be'; c.fillRect(W * 0.12, H * 0.26, W * 0.5, H * 0.36);
      c.fillStyle = '#d9c48c'; c.fillRect(W * 0.08, H * 0.24, W * 0.06, H * 0.4); c.fillRect(W * 0.6, H * 0.24, W * 0.06, H * 0.4);
      c.fillStyle = '#6b4a14'; [0.34, 0.42, 0.5].forEach((y, i) => c.fillRect(W * 0.18, H * y, W * (0.34 - i * 0.06), 3));
      // a compass
      c.fillStyle = '#e8c35a'; c.beginPath(); c.arc(W * 0.8, H * 0.5, W * 0.14, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1f1a4a'; c.beginPath(); c.arc(W * 0.8, H * 0.5, W * 0.115, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e04b4b'; c.beginPath(); c.moveTo(W * 0.8, H * 0.3); c.lineTo(W * 0.77, H * 0.5); c.lineTo(W * 0.83, H * 0.5); c.closePath(); c.fill();
      c.fillStyle = '#f4f1e6'; c.beginPath(); c.moveTo(W * 0.8, H * 0.7); c.lineTo(W * 0.77, H * 0.5); c.lineTo(W * 0.83, H * 0.5); c.closePath(); c.fill();
      // a glowing light bulb
      c.fillStyle = 'rgba(255,230,120,.35)'; c.beginPath(); c.arc(W * 0.38, H * 0.82, W * 0.14, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffe66a'; c.beginPath(); c.arc(W * 0.38, H * 0.78, W * 0.085, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#b8b8c4'; c.fillRect(W * 0.34, H * 0.86, W * 0.08, H * 0.07);
    },
  };

  /** A striped awning that slopes down away from the wall: one stripe per box, like everything else here. */
  function awning(g, wallX, y, z, width, colors, f) {
    const group = new T.Group();
    const n = 11, w = width / n;
    for (let i = 0; i < n; i++) {
      const col = colors[i % 2];
      const top = new T.Mesh(new T.BoxGeometry(1.15, 0.1, w), lambert(col)); top.position.set(f * 0.575, 0, -width / 2 + w * (i + 0.5));
      const valance = new T.Mesh(new T.BoxGeometry(0.1, 0.22, w), lambert(col)); valance.position.set(f * 1.15, -0.1, -width / 2 + w * (i + 0.5));
      group.add(top, valance);
    }
    group.rotation.z = -0.2 * f;                      // the outer edge dips
    group.position.set(wallX, y, z);
    g.add(group);
  }

  /** A giant pencil standing on its eraser, tip up. */
  function bigPencil(g, x, y, z, body) {
    const stack = [[0.64, 0.4, 0xf08aa0], [0.66, 0.28, 0xc9ccd4], [0.64, 1.5, body], [0.64, 0.3, 0xe8c79a], [0.44, 0.3, 0xe8c79a], [0.24, 0.3, 0xe8c79a], [0.1, 0.2, 0x2b2b2b]];
    let top = y;
    stack.forEach(([w, h, col]) => { box(g, lambert(col), w, h, w, x, top + h / 2, z); top += h; });
  }

  /** The big thing on each shop's roof (and anything out front), so you can tell what it sells from across the road. */
  const SHOP_PROPS = {
    accessories(zone, s, f, xf) {
      const g = zone.group, roof = 4.8, cx = xf - f * 0.45;          // at the roof's front edge, so the roof does not hide them from the road
      bigPencil(g, cx, roof, s.z - 2.8, 0xf2c230);
      bigPencil(g, cx, roof, s.z + 2.8, 0xe04b4b);
      // a giant graphing calculator between them, leaning back a little, with a parabola on its screen
      const calc = new T.Group();
      calc.add(new T.Mesh(new T.BoxGeometry(0.4, 2.3, 1.7), lambert(0x3a3d45)));
      const screen = textPlane(1.4, 0.8, (c, cv) => {
        c.fillStyle = '#9be59b'; c.fillRect(0, 0, cv.width, cv.height);
        c.strokeStyle = '#2f7a43'; c.lineWidth = 2; c.beginPath(); c.moveTo(cv.width / 2, 4); c.lineTo(cv.width / 2, cv.height - 4); c.moveTo(4, cv.height * 0.7); c.lineTo(cv.width - 4, cv.height * 0.7); c.stroke();
        c.strokeStyle = '#1d5a2c'; c.lineWidth = 5; c.beginPath(); c.moveTo(cv.width * 0.12, cv.height * 0.12); c.quadraticCurveTo(cv.width * 0.5, cv.height * 1.3, cv.width * 0.88, cv.height * 0.12); c.stroke();
      }, 64);
      screen.rotation.y = f * Math.PI / 2; screen.position.set(f * 0.21, 0.65, 0); calc.add(screen);
      const keyCols = [0xc9ccd4, 0xc9ccd4, 0xc9ccd4, 0xf08a30];
      for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
        const k = new T.Mesh(new T.BoxGeometry(0.08, 0.22, 0.28), lambert(r === 0 ? keyCols[q] : q === 3 ? 0x4aa3ff : 0xe8e8ee));
        k.position.set(f * 0.22, -0.05 - r * 0.32, -0.54 + q * 0.36); calc.add(k);
      }
      calc.rotation.z = 0.18 * f; calc.position.set(cx, roof + 1.15, s.z);
      g.add(calc);
    },
    style(zone, s, f, xf) {
      const g = zone.group, roof = 4.8, cx = xf - f * 0.4;
      // a giant T-shirt on a hanger
      const shirt = new T.Group();
      const add = (w, h, d, x, y, z, col, rx = 0) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), lambert(col)); m.position.set(x, y, z); m.rotation.x = rx; shirt.add(m); return m; };
      add(0.32, 1.55, 1.5, 0, 0.78, 0, 0x4aa3ff);
      add(0.32, 0.6, 0.75, 0, 1.4, -1.0, 0x4aa3ff, 0.5); add(0.32, 0.6, 0.75, 0, 1.4, 1.0, 0x4aa3ff, -0.5);
      add(0.34, 0.22, 1.5, 0, 0.72, 0, 0xffffff);
      add(0.34, 0.24, 0.56, 0, 1.56, 0, 0x2a6ab8);
      add(0.1, 0.42, 0.1, 0, 1.96, 0, 0x6b6b72); add(0.1, 0.1, 0.55, 0, 2.2, 0, 0x6b6b72);
      shirt.scale.setScalar(1.2); shirt.position.set(cx, roof, s.z); g.add(shirt);
      // a cap on one side
      [[1.2, 0.3], [1.0, 0.3], [0.7, 0.25]].reduce((y, [w, h]) => { box(g, lambert(0xe04b4b), w, h, w, cx, y + h / 2, s.z + 2.8); return y + h; }, roof);
      box(g, lambert(0xb23a3a), 0.85, 0.1, 1.0, cx + f * 0.7, roof + 0.1, s.z + 2.8);
      // and a sneaker on the other
      box(g, lambert(0xffffff), 0.6, 0.25, 1.5, cx, roof + 0.125, s.z - 2.8);
      box(g, lambert(0x4aa3ff), 0.55, 0.55, 0.9, cx, roof + 0.52, s.z - 3.05);
      box(g, lambert(0xffffff), 0.55, 0.35, 0.55, cx, roof + 0.42, s.z - 2.4);
      box(g, lambert(0xe04b4b), 0.58, 0.1, 0.3, cx, roof + 0.74, s.z - 2.65);
      // two mannequins in front, either side of the door
      [[-1.55, 0xff7fb0], [1.55, 0x4aa3ff]].forEach(([dz, shirtCol]) => {
        const mx = xf + f * 0.5, mz = s.z + dz;
        box(g, lambert(0x3a3a42), 0.55, 0.08, 0.55, mx, 0.04, mz);
        box(g, lambert(0x2b3a67), 0.2, 0.75, 0.16, mx, 0.45, mz - 0.1); box(g, lambert(0x2b3a67), 0.2, 0.75, 0.16, mx, 0.45, mz + 0.1);
        box(g, lambert(shirtCol), 0.3, 0.7, 0.48, mx, 1.2, mz);
        box(g, lambert(0xe8c9a0), 0.3, 0.3, 0.3, mx, 1.7, mz);
        box(g, lambert(0x3a3a42), 0.34, 0.1, 0.34, mx, 1.9, mz);
        solid(zone, mx, mz, 0.6, 0.6);
      });
    },
    pets(zone, s, f, xf) {
      const g = zone.group, roof = 4.8, cx = xf - f * 0.4, brown = lambert(0x7b4a26);
      // a giant paw print
      const paw = new T.Group();
      const part = (w, h, d, x, y, z, col) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), col); m.position.set(x, y, z); paw.add(m); };
      part(0.32, 0.95, 1.5, 0, 0.55, 0, brown); part(0.32, 0.6, 2.0, 0, 0.5, 0, brown); part(0.34, 0.12, 1.1, 0, 0.9, 0, lambert(0x9a6a3a));
      [[-1.0, 1.35], [-0.38, 1.75], [0.38, 1.75], [1.0, 1.35]].forEach(([dz, y]) => part(0.32, 0.6, 0.5, 0, y, dz, brown));
      paw.scale.setScalar(1.3); paw.position.set(cx, roof, s.z); g.add(paw);
      // two bones standing on the roof
      [-2.8, 2.8].forEach(dz => {
        const bone = new T.Group();
        const white = lambert(0xf6f1e2);
        const b = (w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), white); m.position.set(x, y, z); bone.add(m); };
        b(0.28, 0.3, 1.7, 0, 0, 0);
        [-0.85, 0.85].forEach(z => { b(0.28, 0.3, 0.34, 0, 0.2, z); b(0.28, 0.3, 0.34, 0, -0.2, z); });
        bone.position.set(cx, roof + 0.55, s.z + dz); g.add(bone);
      });
      // a doghouse and a bowl out front
      const hx = xf + f * 0.55, hz = s.z - 2.4;
      box(g, 'planks', 1.0, 0.95, 1.2, hx, 0.48, hz);
      [[1.5, 0.2], [1.1, 0.2], [0.7, 0.2]].forEach(([w, h], i) => box(g, lambert(0xc0392b), 1.15, h, w, hx, 1.05 + i * h, hz));
      box(g, lambert(0x2b2b2b), 0.05, 0.55, 0.5, hx + f * 0.51, 0.3, hz);
      box(g, lambert(0xc0392b), 0.35, 0.1, 0.35, hx + f * 0.1, 0.05, hz + 1.0);
      solid(zone, hx, hz, 1.1, 1.4);
    },
    hints(zone, s, f, xf) {
      const g = zone.group, cx = xf - f * 0.6;
      // a glowing question mark that floats above the roof and slowly turns; a dark outline keeps it readable against the sky
      const q = buildSymbol('question', 0xffc83a, { emissive: 0.45, outline: 0x1f1a4a, outlineWidth: 0.05 });
      q.position.set(cx, 7.6, s.z); g.add(q);
      zone.animated.push((dt, t) => { q.rotation.y += dt * 0.9; q.position.y = 7.6 + Math.sin(t * 1.6 + s.z) * 0.1; });
      // lanterns beside the door, and gold stars on the wall
      [-1.45, 1.45].forEach(dz => {
        box(g, lambert(0x2b2358), 0.12, 0.12, 0.12, xf + f * 0.14, 3.05, s.z + dz);
        box(g, glow(0xffd36a), 0.22, 0.4, 0.22, xf + f * 0.26, 2.8, s.z + dz);
      });
      [[-2.9, 3.7], [-0.9, 3.9], [1.1, 3.75], [2.9, 3.9], [-3.0, 0.8], [3.0, 0.7]].forEach(([dz, y]) => box(g, glow(0xffe69a), 0.05, 0.2, 0.2, xf + f * 0.16, y, s.z + dz));
    },
  };

  function buildShop(zone, s, def, onUse) {
    const g = zone.group, look = SHOP_LOOKS[s.id], f = s.facing;
    const xf = s.x + f * 3;                                   // the wall that faces the road
    box(g, 'planks', 6, 4.2, 7, s.x, 2.1, s.z);

    if (!look) {                                              // a shop without a look gets the plain front
      box(g, def.roof, 6.8, 0.6, 7.8, s.x, 4.5, s.z);
      box(g, lambert(0x3a2412), 0.12, 3, 1.8, xf + f * 0.06, 1.5, s.z);
      [-2.4, 2.4].forEach(dz => box(g, glow(0xbfe6ff), 0.1, 1.2, 1.2, xf + f * 0.05, 2.4, s.z + dz));
      const plain = makeSign({ w: 4.4, h: 1.0, title: def.sign, fg: '#fff3c4', bg: '#3a2412', border: '#c89a54' });
      plain.position.set(xf + f * 0.08, 3.65, s.z); plain.rotation.y = f * Math.PI / 2; g.add(plain);
    } else {
      // painted front, a baseboard, corner posts and a cornice
      box(g, lambert(look.wall), 0.14, 4.2, 7.02, xf + f * 0.07, 2.1, s.z);
      box(g, lambert(look.trim), 0.2, 0.35, 7.1, xf + f * 0.1, 0.18, s.z);
      box(g, lambert(look.trim), 0.22, 0.3, 7.1, xf + f * 0.11, 4.05, s.z);
      [-1, 1].forEach(sd => box(g, lambert(look.trim), 0.24, 4.2, 0.3, xf + f * 0.12, 2.1, s.z + sd * 3.4));

      // a framed door with a window, a knob, and an OPEN sign
      box(g, lambert(look.trim), 0.2, 3.25, 2.25, xf + f * 0.1, 1.62, s.z);
      box(g, lambert(look.door), 0.12, 3.0, 1.8, xf + f * 0.2, 1.5, s.z);
      box(g, glow(0xbfe6ff), 0.05, 0.9, 0.9, xf + f * 0.27, 2.15, s.z);
      box(g, lambert(0xe8c35a), 0.1, 0.12, 0.12, xf + f * 0.27, 1.3, s.z + 0.68);
      const open = makeSign({ w: 0.8, h: 0.3, title: 'OPEN', fg: '#52f08f', bg: '#0c2a18', border: '#52f08f' });
      open.position.set(xf + f * 0.34, 1.75, s.z - 0.42); open.rotation.y = f * Math.PI / 2; g.add(open);

      // two display windows showing what is for sale
      [-1, 1].forEach(sd => {
        const wz = s.z + sd * 2.45;
        box(g, lambert(look.trim), 0.16, 1.8, 1.9, xf + f * 0.15, 2.0, wz);
        const art = textPlane(1.6, 1.5, (c, cv) => {
          SHOP_WINDOWS[s.id](c, cv.width, cv.height);
          c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(cv.width * 0.55, 0); c.lineTo(cv.width * 0.8, 0); c.lineTo(cv.width * 0.3, cv.height); c.lineTo(cv.width * 0.05, cv.height); c.closePath(); c.fill();   // a glint on the glass
        }, 80);
        art.rotation.y = f * Math.PI / 2; art.position.set(xf + f * 0.285, 2.0, wz); g.add(art);
        box(g, lambert(look.trim), 0.4, 0.12, 1.95, xf + f * 0.28, 1.06, wz);          // sill
      });

      awning(g, xf + f * 0.22, 2.9, s.z, 6.6, look.awning, f);

      // the sign, with a line under the name saying what is sold
      const sign = makeSign({ w: 4.6, h: 1.15, title: def.sign, sub: look.tag, fg: look.sign.fg, bg: look.sign.bg, border: look.sign.border, subColor: look.sign.subColor });
      sign.position.set(xf + f * 0.27, 3.55, s.z); sign.rotation.y = f * Math.PI / 2; g.add(sign);   // top edge just under the roof; clear of the door frame behind it

      // the roof, with a bright trim along the front edge, and the big thing on top
      box(g, lambert(look.roof), 6.8, 0.6, 7.8, s.x, 4.5, s.z);
      box(g, lambert(look.roofTrim), 0.3, 0.3, 7.9, xf + f * 0.5, 4.55, s.z);    // along the roof's front edge, clear of the sign
      SHOP_PROPS[s.id](zone, s, f, xf);
    }

    solid(zone, s.x, s.z, 6.2, 7.2);
    interact(zone, s.x + f * 4.6, s.z, 2.4, `Browse the ${def.title}`, onUse);
  }

  /* ---------- village pieces ---------- */
  function addLamp(zone, x, z) {
    const g = zone.group, dark = lambert(0x2b2b30);
    box(g, dark, 0.2, 3.4, 0.2, x, 1.7, z);
    box(g, dark, 0.7, 0.12, 0.7, x, 3.9, z);
    box(g, glow(0xfff2b0), 0.5, 0.5, 0.5, x, 3.6, z);
    solid(zone, x, z, 0.5, 0.5);
  }

  /** A park bench that faces any of the four ways ('N', 'E', 'S' or 'W'); the back is on the opposite side. Solid, like the others. */
  function addBenchFacing(zone, x, z, way) {
    const T_ = THREE, grp = new T_.Group();
    box(grp, 'planks', 2.2, 0.18, 0.7, 0, 0.55, 0);
    box(grp, 'planks', 2.2, 0.6, 0.12, 0, 0.95, 0.32);
    [-0.9, 0.9].forEach(dx => box(grp, 'log', 0.15, 0.5, 0.6, dx, 0.25, 0));
    const turn = { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 }[way];      // the bench is built facing north
    grp.rotation.y = turn; grp.position.set(x, 0, z);
    zone.group.add(grp);
    const sideways = way === 'E' || way === 'W';
    solid(zone, x, z, sideways ? 0.9 : 2.4, sideways ? 2.4 : 0.9);
    return grp;
  }

  /** A park bench facing north (toward the lake): the back is on the south side. */
  function addBench(zone, x, z) {
    const g = zone.group;
    box(g, 'planks', 2.2, 0.18, 0.7, x, 0.55, z);
    box(g, 'planks', 2.2, 0.6, 0.12, x, 0.95, z + 0.32);
    [-0.9, 0.9].forEach(dx => box(g, 'log', 0.15, 0.5, 0.6, x + dx, 0.25, z));
    solid(zone, x, z, 2.4, 0.9);
  }

  /** The road down the middle: asphalt with a yellow center line, curbs, sidewalks, a crosswalk,
      and a paved forecourt where it ends at the casino. */
  function buildRoad(zone) {
    const g = zone.group;
    const z0 = -14, z1 = 48, len = z1 - z0, mid = (z0 + z1) / 2;
    flat(g, 'asphalt', 8, len, 0, 0.03, mid);
    [-5.2, 5.2].forEach(x => flat(g, 'paving', 2.4, len, x, 0.02, mid));            // sidewalks
    [-4.15, 4.15].forEach(x => box(g, 'stone', 0.3, 0.18, len, x, 0.09, mid));      // curbs
    flat(g, 'paving', 16, 6, 0, 0.02, -17);                                         // forecourt
    for (let z = 46; z >= -12; z -= 4) {
      if (Math.abs(z - 10) < 2.5) continue;                                         // not through the crosswalk
      box(g, glow(0xf2c230), 0.22, 0.02, 2, 0, 0.05, z);                            // dashed center line
    }
    for (let i = 0; i < 6; i++) box(g, glow(0xf4f4f4), 0.7, 0.02, 3, -3.25 + i * 1.3, 0.05, 10); // crosswalk
    // street lamps every 10 blocks, alternating sides of the road, so it is lit evenly without a pair at every spot
    [42, 32, 22, 12, 2, -8].forEach((z, i) => addLamp(zone, i % 2 ? -5.2 : 5.2, z));
  }

  /** A wall block with a textured side (the hotel's windowed sandstone by default) and a plain stone roof (or opts.top), optionally turned (opts.rotY). */
  function hotelBox(g, w, h, d, x, y, z, name = 'hotel', opts = {}) {
    const top = opts.top || 'stone';
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), [
      Tex.mat(name, d, h), Tex.mat(name, d, h),
      Tex.mat(top, w, d), Tex.mat(top, w, d),
      Tex.mat(name, w, h), Tex.mat(name, w, h),
    ]);
    m.position.set(x, y, z);
    if (opts.rotY) m.rotation.y = opts.rotY;
    g.add(m);
    return m;
  }

  /** The casino's outside, after the Bellagio: ONE long, gently curved crescent tower, the same height from end to end, in warm cream with bronze windows;
      a low arcade of arched windows with a terracotta roof along its foot; and a taller entrance pavilion in the middle with a gold-edged roof, a gold
      canopy on two columns, and the sign above. The front of the tower is an arc of radius R, hollow toward the road (the way the Bellagio wraps its lake),
      built from flat panels turned to follow it. The door, its prompt, the canopy columns and the drop-off point are where they always were. */
  const CASINO_FRONT = {
    H: 14,                                   // the one height of the whole tower
    R: 130, T: 4.5,                          // the front is an arc of radius R, and the tower is T deep behind it
    zFront: -29.7,                           // where the tower's front is at the middle (x = 0); set well back so the ends of the arcade keep 2 blocks clear of the park's pool (solid from z = -22.2)
    half: 28,                                // how far the crescent reaches each way (x)
    segs: 8,                                 // flat panels the curve is built from
    podiumH: 4.4, podiumD: 2.3,              // the low arcade along the front: its height, and how far it stands out from the tower
    pavilion: { w: 16, h: 6.4, front: -20 }, // the entrance, standing out in front of the tower (16 wide: the park's pool starts at x = 8.8); its front face is where the old door always was
  };
  CASINO_FRONT.zC = CASINO_FRONT.zFront + CASINO_FRONT.R;                                // the centre of the curve, out on the road side
  const casinoArcZ = (x, r) => CASINO_FRONT.zC - Math.sqrt(r * r - x * x);                // z of the circle of radius r, at x
  /** The z of the front of whatever stands furthest out at x: the pavilion in the middle, the arcade either side. */
  const casinoFrontZ = x => {
    const F = CASINO_FRONT, ax = Math.abs(x);
    return ax < F.pavilion.w / 2 ? F.pavilion.front : casinoArcZ(ax, F.R - F.podiumD);
  };

  function buildCasinoFront(zone, actions) {
    const g = zone.group, F = CASINO_FRONT;
    const gold = lambert(0xc9a24a), goldGlow = glow(0xffd36b), cream = lambert(0xefe4c4), roof = lambert(0xc7b996);      // (the roof is a tan concrete: pale cream turns to glare in the sun)
    const turn = (m, phi) => { m.rotation.y = -phi; return m; };

    // the crescent tower: a ring of panels turned to follow the curve, all F.H high, each with a cream cornice
    const alpha = Math.asin(F.half / F.R), step = 2 * alpha / F.segs, rMid = F.R + F.T / 2;
    for (let i = 0; i < F.segs; i++) {
      const phi = -alpha + (i + 0.5) * step, cx = rMid * Math.sin(phi), cz = F.zC - rMid * Math.cos(phi);
      const w = 2 * F.R * Math.tan(step / 2) + 0.6;                                      // the fronts meet; the extra makes the back edges overlap
      hotelBox(g, w, F.H, F.T, cx, F.H / 2, cz, 'bellagio', { rotY: -phi });
      turn(box(g, roof, w + 0.5, 0.5, F.T + 0.6, cx, F.H + 0.25, cz), phi);
    }

    // the low arcade along the foot of the tower, either side of the entrance: arched windows, a terracotta roof, a thin gold edge
    const rp = F.R - F.podiumD, dP = F.podiumD + 0.5, nP = 4;
    [-1, 1].forEach(sd => {
      const a0 = Math.asin((F.pavilion.w / 2) / rp), a1 = Math.asin(F.half / rp), stepP = (a1 - a0) / nP, rc = rp + dP / 2;
      for (let j = 0; j < nP; j++) {
        const phi = sd * (a0 + (j + 0.5) * stepP), cx = rc * Math.sin(phi), cz = F.zC - rc * Math.cos(phi), w = 2 * rp * Math.tan(stepP / 2) + 0.5;
        hotelBox(g, w, F.podiumH, dP, cx, F.podiumH / 2, cz, 'bellagioBase', { rotY: -phi, top: 'terracotta' });
        const re = rp + 0.12; turn(box(g, gold, w + 0.1, 0.2, 0.25, re * Math.sin(phi), F.podiumH + 0.1, F.zC - re * Math.cos(phi)), phi);
      }
    });

    // the entrance pavilion, standing out in front of the middle of the tower: taller than the arcade, a terracotta roof with a gold edge, cream pilasters round the door
    const pv = F.pavilion, pd = pv.front - F.zFront;
    hotelBox(g, pv.w, pv.h, pd, 0, pv.h / 2, pv.front - pd / 2, 'bellagioBase', { top: 'terracotta' });
    box(g, gold, pv.w + 0.4, 0.4, 0.4, 0, pv.h + 0.2, pv.front + 0.1);
    [-1, 1].forEach(sd => box(g, cream, 0.7, pv.h, 0.4, sd * 3.2, pv.h / 2, pv.front + 0.2));

    // the grand entrance: a glowing gold frame, the door, and the sign above it, on the tower over the pavilion's roof
    box(g, goldGlow, 4.2, 5.0, 0.1, 0, 2.5, -19.95);
    box(g, glow(0x1b1208), 3.6, 4.6, 0.2, 0, 2.3, -19.85);
    const sign = makeSign({
      w: 14, h: 2.4, title: 'PRIME TIME CASINO', sub: 'factor it. solve it. win it.',
      fg: '#ffd36b', bg: '#10162b', border: '#ffd36b', subColor: '#8fd8ff',
    });
    sign.position.set(0, 9.6, casinoArcZ(7, F.R) + 0.09);                                  // a hair in front of the curve even at the sign's two ends
    g.add(sign);

    // porte-cochere: a gold canopy on two columns, with warm lights underneath
    box(g, gold, 13, 0.4, 4.4, 0, 5.4, -17.8);
    box(g, goldGlow, 13, 0.12, 0.14, 0, 5.2, -15.62);
    [-4, -1.3, 1.3, 4].forEach(x => box(g, glow(0xfff2b0), 0.5, 0.05, 0.5, x, 5.17, -17.8));
    [-5.5, 5.5].forEach(x => {
      box(g, lambert(0xe3cfa0), 0.9, 5.2, 0.9, x, 2.6, -16);
      box(g, gold, 1.3, 0.3, 1.3, x, 0.15, -16);
      box(g, gold, 1.3, 0.3, 1.3, x, 5.1, -16);
      solid(zone, x, -16, 1.1, 1.1);
    });
    interact(zone, 0, -18.2, 2.2, 'Enter the Casino', actions.enterCasino);

    // you cannot walk into the building: thin strips of solid that follow the curve (and the pavilion) from the front back to the edge of the village
    for (let x0 = -F.half; x0 < F.half - 1e-9; x0 += 1) {
      const x1 = x0 + 1, front = Math.abs((x0 + x1) / 2) < F.pavilion.w / 2 ? F.pavilion.front : casinoFrontZ(Math.max(Math.abs(x0), Math.abs(x1)));
      solid(zone, (x0 + x1) / 2, (front + 0.1 - 34) / 2, 1.02, front + 0.1 + 34);                  // from z = -34 forward to 10 cm in front of the wall
    }
  }

  /** A real double door in a white frame: two wooden leaves with a raised lower panel, a window above a push bar,
      a steel kick plate, and hinges, and optionally a glass transom. Built facing +z, then turned (rotY) and placed
      at (x, 0, z). */
  function buildDoor(g, { x, z, rotY = 0, w = 2.6, h = 4.2, transom = false }) {
    const d = new T.Group();
    d.position.set(x, 0, z);
    d.rotation.y = rotY;
    d.userData.door = { w, h, transom };
    const part = (bw, bh, bd, mat, px, py, pz) => {
      const m = new T.Mesh(new T.BoxGeometry(bw, bh, bd), mat);
      m.position.set(px, py, pz);
      d.add(m);
      return m;
    };
    const trim = lambert(0xf2eee4), wood = lambert(0x6a4426), raised = lambert(0x82552f), dark = lambert(0x2b1a0e);
    const steel = lambert(0xb8bcc4), glass = glow(0xbfe6ff);

    // frame, threshold, and a dark gap behind the leaves (it shows as the seam down the middle)
    part(w + 0.5, 0.25, 0.24, trim, 0, h + 0.125, 0);
    [-1, 1].forEach(sd => part(0.25, h + 0.25, 0.24, trim, sd * (w / 2 + 0.125), (h + 0.25) / 2, 0));
    part(w, 0.06, 0.3, lambert(0xcfc9bb), 0, 0.03, 0.02);
    part(w, h, 0.1, dark, 0, h / 2, -0.02);

    // where things sit on a leaf, scaled to the door's height
    const barY = h * 0.46;
    const panelTop = barY - 0.25, panelBot = 0.45;
    const winH = h * 0.34, winTop = h - 0.45, winY = winTop - winH / 2;
    const lw = w / 2 - 0.03;
    [-1, 1].forEach(sd => {
      const cx = sd * (w / 4);
      part(lw, h - 0.05, 0.12, wood, cx, h / 2 + 0.02, 0);                                             // the leaf
      part(lw - 0.5, panelTop - panelBot, 0.05, raised, cx, (panelTop + panelBot) / 2, 0.075);          // raised lower panel
      part(lw - 0.4, winH + 0.14, 0.05, dark, cx, winY, 0.07);                                         // window frame
      part(lw - 0.55, winH, 0.03, glass, cx, winY, 0.095);                                             // window glass
      part(lw - 0.6, 0.08, 0.1, steel, cx, barY, 0.14);                                                // push bar
      [-1, 1].forEach(b => part(0.08, 0.14, 0.1, steel, cx + b * (lw / 2 - 0.35), barY, 0.1));         // its brackets
      part(lw - 0.2, 0.32, 0.04, steel, cx, 0.2, 0.08);                                                // kick plate
      [0.45, h / 2, h - 0.45].forEach(hy => part(0.1, 0.22, 0.14, dark, sd * (w / 2 - 0.02), hy, 0.02)); // hinges on the outer edges
    });
    if (transom) part(w, 0.5, 0.05, glass, 0, h + 0.5, 0);
    g.add(d);
    return d;
  }

  /* ---------- the arithmetic academy: outside ---------- */
  // where you stand when you walk out the front door, facing back toward the road
  const SCHOOL_EXIT = { x: 7.5, z: 10, yaw: Math.PI / 2 };

  /** A little pixel flag: stripes, with a blue corner of stars. */
  function flagTexture() {
    const c = document.createElement('canvas');
    c.width = 40; c.height = 26;
    const g = c.getContext('2d');
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f4f1e8' : '#c0352f'; g.fillRect(0, i * 2, 40, 2); }
    g.fillStyle = '#243f8f';
    g.fillRect(0, 0, 16, 14);
    g.fillStyle = '#f4f1e8';
    for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) g.fillRect(2 + q * 3 - (r % 2), 2 + r * 3, 1, 1);
    const tex = new T.CanvasTexture(c);
    tex.magFilter = T.NearestFilter;
    tex.minFilter = T.NearestFilter;
    return tex;
  }

  /** A red-brick school across the road from the shops: two stories of windows, a flat roof, and a
      projecting center entrance with columns, steps, and a stepped gable. It sits back behind a lawn,
      with a little hedged walkway (lined up with the crosswalk), flowers, and a flagpole. */
  function buildSchoolFront(zone, actions) {
    const g = zone.group;
    const tan = lambert(0xd8c8a0), white = lambert(0xf2eee4), hedge = lambert(0x2f6d34);

    // the main block
    hotelBox(g, 12, 8, 20, 20, 4, 10, 'schoolBrick');
    box(g, tan, 12.5, 0.5, 20.5, 20, 8.25, 10);                              // flat roof with a tan cap
    [5, 15].forEach(z => box(g, lambert(0x55555c), 1.6, 0.8, 1.6, 22, 8.9, z));   // rooftop vents
    solid(zone, 20, 10, 12.2, 20.2);

    // the entrance pavilion, with a stepped gable on top
    hotelBox(g, 2, 8.4, 8, 13, 4.2, 10, 'brick');
    [[8.6, 8.7], [6.6, 9.3], [4.6, 9.9], [2.6, 10.5]].forEach(([w, y]) => box(g, 'brick', 2.4, 0.6, w, 13, y, 10));
    box(g, tan, 2.6, 0.3, 2.8, 13, 10.95, 10);
    solid(zone, 13, 10, 2.2, 8.2);

    // double doors under a glass transom, a name sign above, a porch roof on two columns, and three steps
    buildDoor(g, { x: 11.9, z: 10, rotY: -Math.PI / 2, w: 2.6, h: 3.2, transom: true });   // faces the road
    const sign = makeSign({ w: 6.4, h: 1.3, title: 'ARITHMETIC ACADEMY', sub: 'practice makes perfect', fg: '#f2efe0', bg: '#244a35', border: '#c9a24a', subColor: '#c9a24a' });
    sign.position.set(11.95, 6.6, 10);
    sign.rotation.y = -Math.PI / 2;                                           // faces the road
    g.add(sign);
    box(g, tan, 3.4, 0.4, 7.4, 12.3, 4.3, 10);                                // porch roof
    [7.4, 12.6].forEach(z => {
      box(g, white, 0.5, 4.1, 0.5, 11.0, 2.05, z);
      box(g, tan, 0.8, 0.2, 0.8, 11.0, 0.1, z);
      box(g, tan, 0.8, 0.2, 0.8, 11.0, 4.1, z);
      solid(zone, 11.0, z, 0.8, 0.8);
    });
    [[11.7, 0.6], [11.1, 0.4], [10.5, 0.2]].forEach(([x, h]) => box(g, 'stone', 0.6, h, 3.4, x, h / 2, 10));
    interact(zone, 10.0, 10, 2.2, 'Enter the Arithmetic Academy', actions.enterSchool);

    // the walkway from the sidewalk, in line with the crosswalk, with low hedges and lamps along it
    flat(g, 'paving', 4.1, 2, 8.45, 0.02, 10);
    [8.5, 11.5].forEach(z => { box(g, hedge, 2.6, 0.55, 0.6, 8.7, 0.28, z); solid(zone, 8.7, z, 2.6, 0.6); });
    [8.0, 12.0].forEach(z => addLamp(zone, 7.2, z));
    [3.5, 16.5].forEach(z => { box(g, hedge, 0.9, 0.8, 4.4, 13.45, 0.4, z); solid(zone, 13.45, z, 1.0, 4.6); });   // hedges along the wings

    // flowers dotted around the lawn
    [[9.3, 7.4, 0xd94a4a], [9.9, 12.6, 0xf2c230], [8.3, 7.7, 0xf06fb0], [8.1, 12.4, 0xffffff], [12.6, 3.2, 0xf2c230],
     [12.4, 16.8, 0xd94a4a], [11.4, 2.3, 0xf06fb0], [11.7, 17.7, 0xffffff], [9.6, 15.0, 0xf2c230], [10.2, 4.0, 0xd94a4a]]
      .forEach(([x, z, c]) => { box(g, lambert(0x3f8f3a), 0.08, 0.3, 0.08, x, 0.15, z); box(g, lambert(c), 0.3, 0.3, 0.3, x, 0.42, z); });

    // the flagpole, with a flag that ripples in the breeze
    const fx = 9.5, fz = 5.0;
    box(g, 'stone', 0.9, 0.4, 0.9, fx, 0.2, fz);
    box(g, lambert(0xd8d8dc), 0.2, 9, 0.2, fx, 4.9, fz);
    box(g, lambert(0xc9a24a), 0.4, 0.4, 0.4, fx, 9.6, fz);
    solid(zone, fx, fz, 0.9, 0.9);
    const flagGeo = new T.PlaneGeometry(2.6, 1.6, 12, 1);
    flagGeo.translate(1.3, 0, 0);                                             // hoisted at the pole
    const flag = new T.Mesh(flagGeo, new T.MeshBasicMaterial({ map: flagTexture(), side: T.DoubleSide }));
    flag.position.set(fx + 0.1, 8.5, fz);
    flag.rotation.y = -Math.PI / 2;                                           // flies toward +z, face toward the road
    g.add(flag);
    const pos = flagGeo.attributes.position;
    const hoistX = Array.from({ length: pos.count }, (_, i) => pos.getX(i));
    const ripple = t => {
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(t * 3.2 + hoistX[i] * 2.4) * 0.2 * (hoistX[i] / 2.6));
      pos.needsUpdate = true;
    };
    ripple(0);
    zone.animated.push((dt, t) => ripple(t));
    zone.flag = { mesh: flag, geometry: flagGeo };
    zone.school = { x0: 11.9, x1: 26.1, z0: -0.1, z1: 20.1, door: { x: 10.0, z: 10 } };
  }

  /** A water surface that slowly drifts. */
  function waterSurface(w, d) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d');
    g.fillStyle = '#2b9be0';
    g.fillRect(0, 0, 16, 16);
    [[2, 3], [9, 1], [5, 9], [12, 12], [14, 6], [1, 13]].forEach(([x, y]) => { g.fillStyle = '#6cc3f2'; g.fillRect(x, y, 3, 1); });
    [[6, 5], [11, 9], [3, 14]].forEach(([x, y]) => { g.fillStyle = '#1f82c4'; g.fillRect(x, y, 2, 1); });
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.magFilter = T.NearestFilter;
    tex.minFilter = T.NearestFilter;
    tex.repeat.set(w / 2, d / 2);
    const mesh = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: tex }));
    mesh.rotation.x = -Math.PI / 2;
    return { mesh, tex };
  }

  /** A big stone-rimmed lake with dancing jets, on the east side in front of the right wing, the way a
      grand hotel has its fountains out front. It is solid, so it is something to look at, not walk in. */
  function buildFountain(zone) {
    const g = zone.group;
    const x0 = 9, x1 = 32, z0 = -22, z1 = -5, rimT = 0.8;
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const gold = lambert(0xc9a24a);

    // stone rim with a gold edge, and a deep blue basin floor
    box(g, 'stone', w, 0.7, rimT, cx, 0.35, z0 + rimT / 2);
    box(g, 'stone', w, 0.7, rimT, cx, 0.35, z1 - rimT / 2);
    box(g, 'stone', rimT, 0.7, d - 2 * rimT, x0 + rimT / 2, 0.35, cz);
    box(g, 'stone', rimT, 0.7, d - 2 * rimT, x1 - rimT / 2, 0.35, cz);
    box(g, gold, w + 0.1, 0.08, 0.16, cx, 0.74, z1 - 0.1);                  // gold lip along the front edge
    box(g, lambert(0x1c5f8a), w - 2 * rimT, 0.1, d - 2 * rimT, cx, 0.05, cz);
    const water = waterSurface(w - 2 * rimT, d - 2 * rimT);
    water.mesh.position.set(cx, 0.42, cz);
    g.add(water.mesh);

    // the dancing jets: a wave sweeps across three rows, and a tall jet rises in the middle
    const jets = [];
    const colGeo = new T.BoxGeometry(1, 1, 1);
    colGeo.translate(0, 0.5, 0);                                            // grows up from its base
    const colMat = new T.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.78 });
    const puffMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const addJet = (x, z, { width = 0.3, base = 1, amp = 4, speed = 2, phase = 0, lean = 0 }) => {
      const pivot = new T.Group();
      pivot.position.set(x, 0.42, z);
      pivot.rotation.z = lean;                                              // leaning toward the middle makes arches
      const col = new T.Mesh(colGeo, colMat);
      col.scale.set(width, 1, width);
      const puff = new T.Mesh(new T.BoxGeometry(width * 2.4, width * 1.7, width * 2.4), puffMat);
      pivot.add(col, puff);
      g.add(pivot);
      jets.push({ x, z, pivot, col, puff, base, amp, speed, phase, height: base });
    };
    const rows = [-8.5, -13.5, -18.5];
    rows.forEach((jz, r) => {
      for (let i = 0; i < 8; i++) {
        const jx = 12.4 + i * 2.5;
        if (r === 1 && (i === 3 || i === 4)) continue;                      // room for the big one
        addJet(jx, jz, {
          base: 1 + r * 0.6, amp: 2.5 + r * 1.6, speed: 2, phase: -i * 0.6 + r * 1.4,
          lean: ((jx - cx) / 12) * 0.28,
        });
      }
    });
    addJet(cx, rows[1], { width: 0.7, base: 3, amp: 7, speed: 1.1, phase: 0 });

    const place = t => jets.forEach(j => {
      j.height = j.base + j.amp * (0.5 + 0.5 * Math.sin(t * j.speed + j.phase));
      j.col.scale.y = j.height;
      j.puff.position.y = j.height;
      j.puff.rotation.y = t * 2 + j.phase;
    });
    place(0);
    zone.animated.push((dt, t) => {
      place(t);
      water.tex.offset.set(t * 0.03, t * 0.015);
    });

    solid(zone, cx, cz, w + 0.4, d + 0.4);
    zone.fountain = { x0, x1, z0, z1, jets };

    // a paved walk along the south edge, with benches facing the water
    flat(g, 'paving', w + 2, 3, cx, 0.02, z1 + 1.5);
    [14, 20.5, 27].forEach(bx => addBench(zone, bx, z1 + 2));
  }

  /* ---------- the sandbox behind the school ---------- */
  /** The sand, its wooden frame, the FRONT and SIDE mats you stand on to look in, and the blueprint board on its
      posts. The building itself (blocks, aiming, the challenge) is Sandbox.create. */
  function buildSandboxArea(zone) {
    const g = zone.group, C = Sandbox.CONFIG, b = C.board;
    const cx = C.x0 + C.w / 2, cz = C.z0 + C.d / 2;

    flat(g, 'sand', C.w, C.d, cx, 0.03, cz);
    const t = 0.5, fh = 0.45;
    box(g, 'log', t, fh, C.d + 2 * t, C.x0 - t / 2, fh / 2, cz);
    box(g, 'log', t, fh, C.d + 2 * t, C.x0 + C.w + t / 2, fh / 2, cz);
    box(g, 'log', C.w, fh, t, cx, fh / 2, C.z0 - t / 2);
    box(g, 'log', C.w, fh, t, cx, fh / 2, C.z0 + C.d + t / 2);
    [[C.x0 - t / 2, C.z0 - t / 2], [C.x0 + C.w + t / 2, C.z0 - t / 2], [C.x0 - t / 2, C.z0 + C.d + t / 2], [C.x0 + C.w + t / 2, C.z0 + C.d + t / 2]]
      .forEach(([x, z]) => box(g, 'planks', 0.6, 0.9, 0.6, x, 0.45, z));

    // two mats outside the frame say where to stand to look at the build from the FRONT and from the SIDE.
    // The arrow sits in the top half and the word in the bottom half, so they never overlap.
    const MAT_W = 3.0, MAT_H = 2.0;
    const mat = label => textPlane(MAT_W, MAT_H, (c, cv) => {
      const mid = cv.width / 2;
      c.fillStyle = '#8a6234'; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = '#d9b97e'; c.lineWidth = 6; c.strokeRect(5, 5, cv.width - 10, cv.height - 10);
      c.fillStyle = '#f4f1e6';
      c.beginPath();                                                   // an arrow pointing toward the sand
      c.moveTo(mid, 16); c.lineTo(mid + 30, 50); c.lineTo(mid + 11, 50); c.lineTo(mid + 11, 66);
      c.lineTo(mid - 11, 66); c.lineTo(mid - 11, 50); c.lineTo(mid - 30, 50); c.closePath(); c.fill();
      c.font = PX_FONT(26); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, mid, cv.height - 32);
    }, 64);
    const front = mat('FRONT');
    front.rotation.order = 'YXZ'; front.rotation.set(-Math.PI / 2, -Math.PI / 2, 0);   // reads left to right as you face east
    front.position.set(C.x0 - 0.5 - 0.5 - MAT_H / 2, 0.045, cz);
    const side = mat('SIDE');
    side.rotation.x = -Math.PI / 2;                                                     // reads left to right as you face north
    side.position.set(cx, 0.045, C.z0 + C.d + 0.5 + 0.5 + MAT_H / 2);
    g.add(front, side);
    zone.sandboxMats = { front, side, w: MAT_W, h: MAT_H };

    // the board stands on two posts beyond the sand, facing the plot
    box(g, 'wood', 0.2, b.h + 0.6, b.w + 0.6, b.x + 0.12, b.y, b.z);
    [-1, 1].forEach(sd => {
      const pz = b.z + sd * (b.w / 2 + 0.5), ph = b.y + b.h / 2 + 0.3;
      box(g, 'log', 0.4, ph, 0.4, b.x + 0.12, ph / 2, pz);
      solid(zone, b.x + 0.12, pz, 0.6, 0.6);
    });
    box(g, 'wood', 0.35, 0.12, b.w, b.x - 0.1, b.y - b.h / 2 - 0.05, b.z);              // chalk tray
    [-3, 0.5, 2.5].forEach(dz => box(g, lambert(0xf4f1e6), 0.1, 0.06, 0.3, b.x - 0.1, b.y - b.h / 2 + 0.04, b.z + dz));

    zone.sandbox = Sandbox.create(zone);
    interact(zone, b.x - 1.6, b.z, 2.4, 'Choose a blueprint level', () => zone.sandbox.openMenu());
  }

  /** The paved path around the school: from the road's sidewalk, along the school's south side, then up to the SIDE mat
      by the sandbox. Lamps light it and a signpost at the start points the way. */
  function buildSandboxPath(zone) {
    const g = zone.group, C = Sandbox.CONFIG;
    const cx = C.x0 + C.w / 2, W = 2.4;
    const startX = 6.4, z = 22.5, mat = C.z0 + C.d + 0.5 + 0.5 + 2;           // where the path meets the SIDE mat
    zone.sandboxPath = [
      flat(g, 'flagstone', cx - startX, W, (startX + cx) / 2, 0.02, z),          // east along the school's south lawn
      flat(g, 'flagstone', W, z - mat + W / 2, cx, 0.04, (z + W / 2 + mat) / 2),   // then north to the mat (2 cm higher where the two slabs overlap)
    ];
    [[22, z + 1.9], [cx + 1.9, 19.5]].forEach(([lx, lz]) => addLamp(zone, lx, lz));      // one halfway along the lawn, one at the corner
    // a signpost where the path leaves the sidewalk, facing the road
    const sx = 8.6, sz = z - 2.1;
    box(g, 'log', 0.3, 2.6, 0.3, sx, 1.3, sz);
    const sign = makeSign({ w: 3.4, h: 0.95, title: 'SANDBOX >>', sub: 'follow the path', fg: '#fff3c4', bg: '#3a2412', border: '#c89a54', subColor: '#c89a54' });
    sign.position.set(sx - 0.17, 2.2, sz); sign.rotation.y = -Math.PI / 2;
    g.add(sign);
    solid(zone, sx, sz, 0.5, 0.5);
  }

  /* ---------- the minefield, behind the dorm ---------- */
  /** A low log frame round the 18 x 18 plot (you step over it, as with the sandbox), a signpost on the west side with a flag over it, and the game itself (Minefield.create).
      Walking over the field is allowed; digging and flagging only work while you stand on it. Villagers' wandering area stops short of it (see `wander` in buildHub). */
  function buildMinefield(zone, actions) {
    const g = zone.group, P = Minesweeper.PLOT, { x0, z0 } = Minesweeper.PLOT_AT;
    const cx = x0 + P / 2, cz = z0 + P / 2, t = 0.5, fh = 0.45;
    box(g, 'log', t, fh, P + 2 * t, x0 - t / 2, fh / 2, cz);
    box(g, 'log', t, fh, P + 2 * t, x0 + P + t / 2, fh / 2, cz);
    box(g, 'log', P, fh, t, cx, fh / 2, z0 - t / 2);
    box(g, 'log', P, fh, t, cx, fh / 2, z0 + P + t / 2);
    [[x0 - t / 2, z0 - t / 2], [x0 + P + t / 2, z0 - t / 2], [x0 - t / 2, z0 + P + t / 2], [x0 + P + t / 2, z0 + P + t / 2]]
      .forEach(([x, z]) => box(g, 'planks', 0.6, 0.9, 0.6, x, 0.45, z));

    zone.mines = Minefield.create(zone);

    // the signpost, facing west (the way you come from), with the flag turning up above it
    const sx = x0 - 1.3, sz = z0 + 3.0;                              // on the strip between the dorm's back wall and the field
    box(g, 'log', 0.3, 2.6, 0.3, sx, 1.3, sz);
    const sign = makeSign({ w: 3.6, h: 1.0, title: 'MINESWEEPER', sub: "dig it. flag it. don't boom.", fg: '#ffffff', bg: '#16401a', border: '#6cc84a', subColor: '#e6f4de' });
    sign.position.set(sx - 0.17, 2.2, sz); sign.rotation.y = -Math.PI / 2;
    g.add(sign);
    const flag = buildSymbol('flag', 0xff6b5a, { emissive: 0.5, outline: 0x3a0d06, outlineWidth: 0.05 });
    flag.position.set(sx - 0.1, 4.0, sz); flag.rotation.y = -Math.PI / 2;
    g.add(flag);
    solid(zone, sx, sz, 0.5, 0.5);
    interact(zone, sx - 0.5, sz, 2.4, 'Play Minesweeper', actions.openMines);
  }

  /* ---------- Wilson Hall, the dorm ---------- */
  /** The dorm stands on the east side of the road, directly to the right of where you start. It is built to the documented look
      of Wilson Hall at Miami University (Oxford, Ohio), which was Georgian in style, with native blue limestone walls and a red tile
      roof: a long symmetrical front with a projecting center bay, a white columned portico with a pediment, shuttered windows in
      three floors, dormers and chimneys. Its front faces west, toward the road. */
  const DORM = { fx: 12, d: 9, w: 16, zc: 33.5, floors: 3, floorH: 3.3 };
  const DORM_EXIT = { x: 8.2, z: DORM.zc, yaw: Math.PI / 2 };

  function buildDormFront(zone, actions) {
    const g = zone.group, { fx, d, w, zc, floors, floorH } = DORM;
    const H = floors * floorH, cx = fx + d / 2;
    const white = lambert(0xf1ede2), trimStone = lambert(0xd6d2c6), shutter = lambert(0x2d4a3a);

    // the walls: blue limestone, on a stone foundation, with a projecting center bay
    box(g, 'stone', d + 0.4, 0.6, w + 0.4, cx, 0.3, zc);
    box(g, 'limestone', d, H, w, cx, H / 2, zc);
    box(g, 'stone', 1.2, 0.6, 7.2, fx - 0.6, 0.3, zc);
    box(g, 'limestone', 0.8, H, 6.8, fx - 0.4, H / 2, zc);
    // white string courses between the floors, and a cornice under the roof
    [floorH, 2 * floorH].forEach(y => { box(g, white, d + 0.3, 0.22, w + 0.3, cx, y, zc); box(g, white, 1.05, 0.22, 7.1, fx - 0.45, y, zc); });
    box(g, white, d + 0.8, 0.45, w + 0.8, cx, H + 0.2, zc);
    box(g, white, 1.4, 0.45, 7.4, fx - 0.55, H + 0.2, zc);

    // windows: white frames with glass and mullions, a stone lintel and sill, and green shutters
    const windowAt = (faceX, y, z, dir, wide = 1.15) => {
      box(g, white, 0.2, 1.9, wide, faceX + dir * 0.1, y, z);
      box(g, glow(0xbfdcf0), 0.05, 1.62, wide - 0.3, faceX + dir * 0.22, y, z);
      box(g, white, 0.08, 1.62, 0.06, faceX + dir * 0.25, y, z); box(g, white, 0.08, 0.06, wide - 0.3, faceX + dir * 0.25, y, z);
      box(g, trimStone, 0.26, 0.26, wide + 0.4, faceX + dir * 0.13, y + 1.08, z);
      box(g, trimStone, 0.1, 0.1, 0.22, faceX + dir * 0.28, y + 1.12, z);                   // keystone
      box(g, white, 0.32, 0.12, wide + 0.25, faceX + dir * 0.16, y - 1.0, z);
      [-1, 1].forEach(sd => box(g, shutter, 0.1, 1.9, 0.42, faceX + dir * 0.06, y, z + sd * (wide / 2 + 0.3)));
    };
    for (let f = 0; f < floors; f++) {
      const y = 1.95 + f * floorH;
      [-6.7, -4.6, 4.6, 6.7].forEach(o => windowAt(fx, y, zc + o, -1));                      // the two wings
      if (f > 0) [-2.0, 0, 2.0].forEach(o => windowAt(fx - 0.8, y, zc + o, -1, 1.05));     // the center bay, above the door
    }

    // the entrance: three steps, a framed double door, four white columns, an entablature and a pediment
    [0, 1, 2].forEach(i => box(g, 'stone', 0.6, 0.2 * (i + 1), 4.2 - i * 0.2, fx - 0.8 - 0.4 - (2 - i) * 0.6 + 0.0, 0.1 * (i + 1), zc));
    buildDoor(g, { x: fx - 0.78, z: zc, rotY: -Math.PI / 2, w: 2.4, h: 3.5, transom: true });
    [-3.0, -1.9, 1.9, 3.0].forEach(o => {
      box(g, white, 0.74, 0.3, 0.74, fx - 2.1, 0.75, zc + o);                                // base
      box(g, white, 0.5, 3.3, 0.5, fx - 2.1, 2.5, zc + o);                                   // shaft
      box(g, white, 0.8, 0.3, 0.8, fx - 2.1, 4.3, zc + o);                                   // capital
      solid(zone, fx - 2.1, zc + o, 0.7, 0.7);
    });
    box(g, white, 2.0, 0.5, 7.4, fx - 1.4, 4.65, zc);                                        // entablature
    [[7.6, 0.4], [6.0, 0.4], [4.4, 0.4], [2.8, 0.4], [1.2, 0.4]].forEach(([ww, hh], i) => box(g, white, 1.7, hh, ww, fx - 1.35, 5.1 + i * hh, zc));   // pediment, stepped
    const name = makeSign({ w: 4.2, h: 0.5, title: 'WILSON HALL', fg: '#2c2c2c', bg: '#e9e5d8', border: '#8a8576' });
    name.position.set(fx - 2.47, 4.65, zc); name.rotation.y = -Math.PI / 2; g.add(name);

    // the roof: red tile in four stepped layers, with dormers on the front and a chimney at each end
    const roofBase = H + 0.45;
    for (let i = 0; i < 4; i++) box(g, 'redTile', d + 1.4 - 2.2 * i, 1.0, w + 1.4 - 2.2 * i, cx, roofBase + 0.5 + i * 1.0, zc);
    box(g, lambert(0x8e3a2a), d - 6.6, 0.3, w - 6.6, cx, roofBase + 4.15, zc);                // the ridge cap
    [-4.8, 0, 4.8].forEach(o => {
      box(g, white, 1.2, 1.3, 1.5, fx + 0.9, roofBase + 1.15, zc + o);
      box(g, glow(0xbfdcf0), 0.05, 0.85, 0.9, fx + 0.28, roofBase + 1.15, zc + o);
      box(g, 'redTile', 1.7, 0.35, 2.0, fx + 1.0, roofBase + 1.95, zc + o);
    });
    [-1, 1].forEach(sd => { box(g, 'limestone', 1.0, 3.4, 1.0, fx + 5.0, roofBase + 1.7, zc + sd * 6.0); box(g, white, 1.3, 0.25, 1.3, fx + 5.0, roofBase + 3.5, zc + sd * 6.0); });

    // the building is solid; the bay and the columns have their own colliders
    solid(zone, cx, zc, d + 0.6, w + 0.6);
    solid(zone, fx - 0.4, zc, 1.0, 7.2);

    // a paved walk from the sidewalk to the steps, low hedges, and lamps
    flat(g, 'paving', fx - 3.6 - 6.4, 2.6, (6.4 + fx - 3.6) / 2, 0.02, zc);
    [-1, 1].forEach(sd => { for (let i = 0; i < 3; i++) box(g, 'leaves', 1.0, 0.9, 2.2, fx - 0.9, 0.45, zc + sd * (4.5 + i * 2.4)); });
    [-1, 1].forEach(sd => addLamp(zone, fx - 4.2, zc + sd * 2.6));
    interact(zone, fx - 4.4, zc, 2.4, 'Enter Wilson Hall', actions.enterDorm);
  }

  /** The great tree: a very thick flared base, a trunk that tapers, and a tall crown of leaf blocks. Solid at the base. */
  function addGreatTree(zone, tx, tz) {
    const g = zone.group;
    box(g, 'log', 4.6, 0.8, 4.6, tx, 0.4, tz);                                               // the flared roots
    [[-2.4, 0], [2.4, 0], [0, -2.4], [0, 2.4]].forEach(([ox, oz]) => box(g, 'log', ox ? 1.4 : 1.6, 0.7, oz ? 1.4 : 1.6, tx + ox, 0.35, tz + oz));      // roots reaching out
    [[3.9, 3.0, 0.8], [3.3, 3.0, 3.8], [2.7, 3.0, 6.8], [2.1, 2.8, 9.8]].forEach(([wd, hh, y0]) => box(g, 'log', wd, hh, wd, tx, y0 + hh / 2, tz));
    [[7.4, 4, 0, 0, 12.5 + 2], [5.6, 3, 0, 0, 16.0 + 1], [3.6, 2.4, 0, 0, 18.7 + 1]].forEach(([wd, hh, ox, oz, y]) => box(g, 'leaves', wd, hh, wd, tx + ox, y, tz + oz));
    [[3.4, 0], [-3.4, 0], [0, 3.4], [0, -3.4]].forEach(([ox, oz]) => box(g, 'leaves', 4.4, 3.4, 4.4, tx + ox, 11.4, tz + oz));
    solid(zone, tx, tz, 4.4, 4.4);
  }

  /** A trimmed round shrub on a ring of mulch: two stacked blocks of leaves. Solid. */
  function addShrub(zone, x, z, size = 1.4) {
    const g = zone.group;
    box(g, lambert(0x5a3c24), size + 0.4, 0.06, size + 0.4, x, 0.03, z);
    box(g, 'leaves', size, 0.6, size, x, 0.36, z);
    box(g, 'leaves', size * 0.72, 0.5, size * 0.72, x, 0.86, z);
    solid(zone, x, z, size, size);
  }

  /** A small fountain: a stone basin with a gold rim, drifting water, a tall jet in the middle and four arching in from the sides. */
  function addMiniFountain(zone, x, z) {
    const g = zone.group, outer = 4.4, rim = 0.5, inner = outer - 2 * rim, gold = lambert(0xc9a24a);
    [[outer, rim, 0, -(outer - rim) / 2], [outer, rim, 0, (outer - rim) / 2], [rim, inner, -(outer - rim) / 2, 0], [rim, inner, (outer - rim) / 2, 0]].forEach(([w, d, ox, oz]) => {
      box(g, 'stone', w, 0.6, d, x + ox, 0.3, z + oz);
      box(g, gold, w, 0.07, d, x + ox, 0.635, z + oz);
    });
    box(g, lambert(0x1c5f8a), inner, 0.08, inner, x, 0.04, z);
    const water = waterSurface(inner, inner);
    water.mesh.position.set(x, 0.38, z);
    g.add(water.mesh);
    box(g, 'stone', 0.7, 0.5, 0.7, x, 0.25, z);                                              // a stone block for the middle jet to rise from
    const colGeo = new T.BoxGeometry(1, 1, 1); colGeo.translate(0, 0.5, 0);
    const colMat = new T.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.78 });
    const puffMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const jets = [];
    const addJet = (jx, jz, y, o) => {
      const pivot = new T.Group(); pivot.position.set(jx, y, jz); pivot.rotation.set(o.rx || 0, 0, o.rz || 0);
      const col = new T.Mesh(colGeo, colMat); col.scale.set(o.width, 1, o.width);
      const puff = new T.Mesh(new T.BoxGeometry(o.width * 2.4, o.width * 1.7, o.width * 2.4), puffMat);
      pivot.add(col, puff); g.add(pivot);
      jets.push({ col, puff, base: o.base, amp: o.amp, speed: o.speed, phase: o.phase });
    };
    addJet(x, z, 0.5, { width: 0.3, base: 1.0, amp: 1.8, speed: 1.5, phase: 0 });
    const lean = 0.42, r = 1.1;                                                              // the four short jets lean in toward the middle
    addJet(x + r, z, 0.42, { width: 0.2, base: 0.4, amp: 0.9, speed: 2.1, phase: 0.0, rz: lean });
    addJet(x - r, z, 0.42, { width: 0.2, base: 0.4, amp: 0.9, speed: 2.1, phase: 1.6, rz: -lean });
    addJet(x, z - r, 0.42, { width: 0.2, base: 0.4, amp: 0.9, speed: 2.1, phase: 3.2, rx: lean });
    addJet(x, z + r, 0.42, { width: 0.2, base: 0.4, amp: 0.9, speed: 2.1, phase: 4.8, rx: -lean });
    const place = t => jets.forEach(j => { const h = j.base + j.amp * (0.5 + 0.5 * Math.sin(t * j.speed + j.phase)); j.col.scale.y = h; j.puff.position.y = h; j.puff.rotation.y = t * 2 + j.phase; });
    place(0);
    zone.animated.push((dt, t) => { place(t); water.tex.offset.set(t * 0.03, t * 0.015); });
    solid(zone, x, z, outer + 0.2, outer + 0.2);
    return { x, z, outer, water, jets };
  }

  /* ---------- the little park across the road from the dorm ---------- */
  /** The great tree stands in the middle of a small park on the west side of the road, level with the dorm. A square paved walkway
      goes all the way round it, benches sit just outside the walkway facing the tree, and a walk leads in from the sidewalk. To the south
      (to the left as you face the park from the road) a short walk leads to a small plaza with a fountain and two benches. */
  const PARK = { cx: -15.5, cz: DORM.zc, inner: 4, outer: 6 };

  /** A little free library like the ones in parks: a big blue mailbox on a post with a glass door and books inside. It stands by the
      fountain, facing it. Press E to open it. The three real books (Flatland, Alice, A Tangled Tale) are among the spines you can see. */
  function addLittleLibrary(zone, actions, bx, bz) {
    const g = zone.group, T_ = T, wood = lambert(0x6b4a2b), blue = lambert(0x3a6ea5), cream = lambert(0xf3e8c9), gold = lambert(0xc9a24a);
    box(g, wood, 0.18, 1.25, 0.18, bx, 0.625, bz);                                           // the post
    // the body is hollow and open on the east side (the side you face), so the shelves show through the glass door
    box(g, blue, 0.06, 0.8, 1.1, bx - 0.32, 1.6, bz);                                        // back
    box(g, blue, 0.7, 0.8, 0.06, bx, 1.6, bz - 0.52); box(g, blue, 0.7, 0.8, 0.06, bx, 1.6, bz + 0.52);   // the two ends
    box(g, blue, 0.7, 0.06, 1.1, bx, 1.23, bz); box(g, blue, 0.7, 0.06, 1.1, bx, 1.97, bz);               // floor and ceiling
    box(g, blue, 0.62, 0.1, 1.0, bx, 2.05, bz); box(g, blue, 0.48, 0.1, 0.86, bx, 2.15, bz); box(g, blue, 0.32, 0.08, 0.7, bx, 2.24, bz);   // a rounded roof, in steps
    box(g, lambert(0x2f5885), 0.62, 0.04, 1.0, bx - 0.01, 1.6, bz);                           // the middle shelf
    // a frame round the opening, and the glass
    const fx = bx + 0.35;
    box(g, cream, 0.05, 0.06, 1.12, fx, 1.94, bz); box(g, cream, 0.05, 0.06, 1.12, fx, 1.27, bz);
    box(g, cream, 0.05, 0.68, 0.06, fx, 1.6, bz - 0.52); box(g, cream, 0.05, 0.68, 0.06, fx, 1.6, bz + 0.52);
    const glass = new T_.Mesh(new T_.PlaneGeometry(0.96, 0.64), new T_.MeshBasicMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.2, side: T_.DoubleSide, depthWrite: false }));
    glass.rotation.y = Math.PI / 2; glass.position.set(bx + 0.352, 1.6, bz); g.add(glass);
    box(g, gold, 0.04, 0.12, 0.05, bx + 0.40, 1.6, bz + 0.4);                                // a knob
    // the books: spines face you. Two rows; the three real ones are the wide, tall ones in the top row.
    const real = typeof Library !== 'undefined' ? Library.BOOKS.map(b => parseInt(b.color.slice(1), 16)) : [0x2f6f8f, 0x3f93c9, 0x8e3b46];
    const filler = [0xc0392b, 0xe0a030, 0x3fae5a, 0x8a4fd0, 0xe8742a, 0x2b2b30, 0xf06fb0, 0x2fb5b0];
    const row = (y0, specs) => { let z = bz - 0.46; specs.forEach(([t, h, color]) => { box(g, lambert(color), 0.46, h, t, bx - 0.05, y0 + h / 2, z + t / 2); z += t + 0.012; }); };
    row(1.26, [[0.09, 0.3, filler[0]], [0.11, 0.26, filler[1]], [0.08, 0.32, filler[2]], [0.1, 0.28, filler[3]], [0.12, 0.3, filler[4]], [0.09, 0.25, filler[5]], [0.1, 0.31, filler[6]], [0.08, 0.27, filler[7]], [0.1, 0.3, filler[0]]]);
    row(1.62, [[0.1, 0.27, filler[3]], [0.13, 0.31, real[0]], [0.13, 0.3, real[1]], [0.13, 0.31, real[2]], [0.09, 0.26, filler[1]], [0.11, 0.29, filler[6]], [0.08, 0.3, filler[2]], [0.1, 0.25, filler[7]], [0.09, 0.28, filler[4]]]);
    // the flag, up
    box(g, lambert(0x888c92), 0.04, 0.5, 0.04, bx - 0.1, 1.75, bz - 0.6); box(g, lambert(0xd94a4a), 0.04, 0.18, 0.3, bx - 0.1, 1.96, bz - 0.77);
    // a board on the post with the name
    box(g, wood, 0.05, 0.5, 1.1, bx + 0.12, 0.8, bz);
    const sign = makeSign({ w: 1.04, h: 0.44, title: 'LITTLE LIBRARY', sub: 'take one, read one', fg: '#fff3c4', bg: '#2f5885', border: '#f3e8c9' });
    sign.rotation.y = Math.PI / 2; sign.position.set(bx + 0.175, 0.8, bz); g.add(sign);       // 3 cm in front of the board
    solid(zone, bx + 0.03, bz, 0.85, 1.2);
    interact(zone, bx + 1.1, bz, 1.7, 'Open the Little Library', () => actions.openLibrary());
    return { x: bx, z: bz };
  }

  function buildPark(zone, actions) {
    const g = zone.group, { cx, cz, inner, outer } = PARK, wide = outer - inner, mid = (outer + inner) / 2;
    box(g, lambert(0x5a3c24), 7.4, 0.06, 7.4, cx, 0.03, cz);                                 // the planting bed under the tree
    addGreatTree(zone, cx, cz);
    const paths = [
      flat(g, 'paving', 2 * outer, wide, cx, 0.02, cz - mid),                                // the walkway all the way round: north,
      flat(g, 'paving', 2 * outer, wide, cx, 0.02, cz + mid),                                // south,
      flat(g, 'paving', wide, 2 * inner, cx - mid, 0.02, cz),                                // west,
      flat(g, 'paving', wide, 2 * inner, cx + mid, 0.02, cz),                                // and east sides
      flat(g, 'paving', (-6.4) - (cx + outer), 2.4, (cx + outer - 6.4) / 2, 0.02, cz),       // and the walk in from the sidewalk
    ];
    // benches just outside the walkway, facing the tree: one on the north and west sides, and two on the east either side of the way in.
    // (The south side is open: a short walk leads on to the fountain.)
    const benchSpots = [[cx, cz - outer - 0.9, 'S'], [cx - outer - 0.9, cz, 'E'], [cx + outer + 0.9, cz - 3.8, 'W'], [cx + outer + 0.9, cz + 3.8, 'W']];
    const benches = benchSpots.map(([x, z, way]) => { addBenchFacing(zone, x, z, way); return { x, z, way }; });
    [-1, 1].forEach(sz => addLamp(zone, cx - (outer + 0.8), cz + sz * (outer + 0.8)));     // a lamp at each far corner (the road's lamps light the near side)
    // trimmed shrubs in the four corners between the walkway and the tree
    const shrubs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => { addShrub(zone, cx + sx * 3.0, cz + sz * 3.0, 1.5); return { x: cx + sx * 3.0, z: cz + sz * 3.0 }; });

    // to the left of the tree (south, as you face the park from the road): a short walk to a small paved plaza with a fountain and two benches
    const plazaZ = cz + outer + 1.5 + 4;                                                      // the plaza is 8 across, 1.5 beyond the walkway
    paths.push(flat(g, 'paving', 2.4, 1.5, cx, 0.02, cz + outer + 0.75));
    paths.push(flat(g, 'paving', 8, 8, cx, 0.02, plazaZ));
    const fountain = addMiniFountain(zone, cx, plazaZ);
    const fountainBenches = [[cx - 3.5, plazaZ, 'E'], [cx + 3.5, plazaZ, 'W']].map(([x, z, way]) => { addBenchFacing(zone, x, z, way); return { x, z, way }; });
    [-1, 1].forEach(sx => { addShrub(zone, cx + sx * 3.1, plazaZ + 3.1, 1.3); shrubs.push({ x: cx + sx * 3.1, z: plazaZ + 3.1 }); });
    // a little free library on the lawn just west of the plaza's north-west corner, its glass door facing the fountain
    const library = addLittleLibrary(zone, actions, cx - 5.2, plazaZ - 2.7);
    zone.park = { cx, cz, inner, outer, paths, benches, shrubs, plaza: { x: cx, z: plazaZ, size: 8 }, fountain: { ...fountain, benches: fountainBenches }, library };
  }

  /* ---------- inside Wilson Hall: one hallway, one open room, everything else locked ---------- */
  /** Coordinates here: x runs west to east, z north to south. The front door is at the south end of a long hallway. The first door on
      the right (the east wall) after you walk in is your room; every other door is locked. The room is an 8 x 6 grid starting at
      (3, 2); its furniture is built by DormRoom (dormroom.js) from the list saved in Store. */
  function buildDorm(actions) {
    const zone = createZone('Wilson Hall', {
      spawn: { x: 0, z: 7.0, yaw: 0 },
      bounds: { minX: -2.3, maxX: 10.8, minZ: -15.9, maxZ: 8.6 },
      sky: 0x2a2622, fog: [0x2a2622, 40, 90], wander: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
    });
    const g = zone.group, CH = 3.6;
    g.add(new T.HemisphereLight(0xffffff, 0xb8aa88, 0.78));
    g.add(new T.AmbientLight(0xfff0d8, 0.38));

    // floors, ceilings and ceiling lights
    flat(g, 'hallTile', 5, 25, 0, 0.01, -3.5);
    flat(g, 'planks', 8, 6, 7, 0.01, 5);
    box(g, 'schoolCeiling', 5.6, 0.2, 25.6, 0, CH + 0.1, -3.5);
    box(g, 'schoolCeiling', 8.6, 0.2, 7.0, 7, CH + 0.1, 5);
    [6, 0.5, -5, -10.5].forEach(z => box(g, glow(0xfffbe8), 1.6, 0.05, 0.8, 0, CH - 0.02, z));
    box(g, glow(0xfffbe8), 2.4, 0.05, 1.2, 7, CH - 0.02, 5);
    box(g, lambert(0x8a2f3a), 1.6, 0.03, 22, 0, 0.03, -4.0);                                   // a red runner down the hall

    // walls (each is solid): the hall's two long walls, its two ends, and the room's three outer walls
    const wall = (x, z, w, d, name = 'schoolWall') => { box(g, name, w, CH, d, x, CH / 2, z); solid(zone, x, z, w, d); };
    wall(-2.75, -3.5, 0.5, 25.5);                      // west wall
    wall(2.75, -6.375, 0.5, 19.75);                    // east wall, north of the room door
    wall(2.75, 7.375, 0.5, 3.75);                      // east wall, south of the room door
    wall(0, -16.0, 5.5, 0.5);                          // north end
    wall(0, 9.0, 5.5, 0.5);                            // south end, with the front door
    wall(7, 1.75, 8.6, 0.5);                           // the room's north wall
    wall(7, 8.25, 8.6, 0.5);                           // its south wall
    wall(11.25, 5, 0.5, 7.0);                          // its east wall
    // wood paneling along the hall, and the room's walls in a soft color with a baseboard
    box(g, 'wood', 0.06, 1.0, 25.0, -2.47, 0.5, -3.5);
    box(g, 'wood', 0.06, 1.0, 19.5, 2.47, 0.5, -6.25); box(g, 'wood', 0.06, 1.0, 3.5, 2.47, 0.5, 7.25);
    [[7, 2.02, 8, 0.04], [7, 7.98, 8, 0.04]].forEach(([x, z, w, d]) => { box(g, lambert(0xdde7ee), w, CH, d, x, CH / 2, z); box(g, 'wood', w, 0.2, d + 0.03, x, 0.1, z); });
    box(g, lambert(0xdde7ee), 0.04, CH, 6, 10.98, CH / 2, 5); box(g, 'wood', 0.07, 0.2, 6, 10.97, 0.1, 5);
    // the doorway into your room: a frame, a header, and a plate
    [3.45, 5.55].forEach(z => box(g, 'wood', 0.6, 2.9, 0.12, 2.75, 1.45, z));
    box(g, 'wood', 0.6, 0.7, 2.3, 2.75, 3.25, 4.5);
    const mine = makeSign({ w: 1.5, h: 0.5, title: '101', sub: 'YOUR ROOM', fg: '#fff3c4', bg: '#27386b', border: '#f2c230', subColor: '#f2c230' });
    mine.position.set(2.4, 3.2, 4.5); mine.rotation.y = -Math.PI / 2; g.add(mine);

    // the locked doors, each with a room number; the front door; the stairs at the end
    const locked = (x, z, rotY, num) => {
      buildDoor(g, { x: x + (rotY > 0 ? 0.1 : -0.1), z, rotY, w: 1.7, h: 2.8 });
      const plate = makeSign({ w: 0.7, h: 0.3, title: num, fg: '#fff3c4', bg: '#3a2412', border: '#c89a54' });
      plate.position.set(x + (rotY > 0 ? 0.08 : -0.08), 2.3, z + 1.25); plate.rotation.y = rotY; g.add(plate);
      interact(zone, rotY > 0 ? -1.3 : 1.3, z, 1.3, 'Locked door', () => UI.toast('This door is locked.'));
    };
    [[-2.5, 6, '103'], [-2.5, 1.5, '105'], [-2.5, -3, '107'], [-2.5, -7.5, '109'], [-2.5, -12, '111']].forEach(([x, z, n]) => locked(x, z, Math.PI / 2, n));
    [[2.5, -2, '102'], [2.5, -6.5, '104'], [2.5, -11, '106']].forEach(([x, z, n]) => locked(x, z, -Math.PI / 2, n));
    buildDoor(g, { x: 0, z: 8.65, rotY: Math.PI, w: 2.2, h: 3.0 });
    buildDoor(g, { x: 0, z: -15.65, rotY: 0, w: 2.0, h: 2.9 });
    const stairs = makeSign({ w: 1.4, h: 0.4, title: 'STAIRS', fg: '#fff3c4', bg: '#3a2412', border: '#c89a54' });
    stairs.position.set(0, 3.25, -15.7); g.add(stairs);
    interact(zone, 0, -14.4, 1.8, 'Stairs (locked)', () => UI.toast('The stairs are locked.'));
    const exit = makeSign({ w: 1.8, h: 0.4, title: 'EXIT', fg: '#52f08f', bg: '#0c2a18', border: '#52f08f' });
    exit.position.set(0, 3.3, 8.7); exit.rotation.y = Math.PI; g.add(exit);
    interact(zone, 0, 7.5, 2.0, 'Leave Wilson Hall', actions.leaveDorm);

    // your room: a window with curtains, an empty trophy shelf, and the prompt that opens the room planner
    box(g, 'wood', 0.12, 1.8, 2.4, 10.93, 1.95, 5); box(g, glow(0xcfe8ff), 0.06, 1.5, 2.0, 10.88, 1.95, 5);
    box(g, 'wood', 0.1, 1.5, 0.07, 10.84, 1.95, 5); box(g, 'wood', 0.1, 0.07, 2.0, 10.84, 1.95, 5);
    box(g, 'wood', 0.4, 0.1, 2.7, 10.8, 1.0, 5);
    [3.55, 6.45].forEach(z => box(g, lambert(0xc84a4a), 0.14, 2.0, 0.55, 10.82, 2.0, z));
    // the trophy shelves themselves (one shelf, and a second below it once the first is full) are built by DormRoom
    const shelf = makeSign({ w: 1.3, h: 0.34, title: 'TROPHIES', fg: '#fff3c4', bg: '#6b4a26', border: '#c89a54' });
    shelf.position.set(3.95, 3.2, 2.08); g.add(shelf);      // 4 cm in front of the painted wall layer (at exactly 2.04 it flickered)
    interact(zone, 7.6, 3.2, 2.2, 'Look at the trophy shelf', () => TrophyCase.open());      // zooms in on every trophy there is, earned or not (js/trophy-case.js)
    interact(zone, 7, 5.2, 3.3, 'Arrange your room', actions.openPlanner);

    zone.dormRoom = DormRoom.attach(zone);
    return zone;
  }

  function buildHub(actions) {
    const zone = createZone('Prime Time Village', {
      spawn: { x: 0, z: DORM.zc, yaw: 0 },                              // the dorm is directly on your right
      bounds: { minX: -34, maxX: 58, minZ: -33, maxZ: 52 },                // (the east edge is 6 blocks further out than it was, to give the sandbox and the minefield room)
      sky: 0x8fc8f0, fog: [0x8fc8f0, 45, 120],
      wander: { minX: -30, maxX: 22.5, minZ: -17, maxZ: 44 },                // (stops well short of the minefield behind the dorm, which starts at x 30.3)
    });
    const g = zone.group;

    g.add(new T.HemisphereLight(0xffffff, 0x6a7a55, 0.8));
    const sun = new T.DirectionalLight(0xfff2d0, 0.65);
    sun.position.set(30, 60, 20);
    g.add(sun);

    flat(g, 'grass', 160, 160, 0, 0, 0);
    buildRoad(zone);

    // all four shops are on the west side, set well back from the road behind a wide paved plaza, and face it
    flat(g, 'paving', 9.6, 41, -11.2, 0.04, 3.5);                 // 2 cm above the casino apron it overlaps at the north end (the depth buffer cannot tell closer surfaces apart at a distance)
    const spots = [
      { id: 'style', x: -19, z: 16, facing: 1 },
      { id: 'accessories', x: -19, z: 7, facing: 1 },
      { id: 'pets', x: -19, z: -2, facing: 1 },
      { id: 'hints', x: -19, z: -11, facing: 1 },
    ];
    spots.forEach(s => buildShop(zone, s, CONTENT.shops[s.id], () => actions.openShop(s.id)));

    buildCasinoFront(zone, actions);   // straight ahead at the end of the road
    buildFountain(zone);               // off to the right
    buildSchoolFront(zone, actions);   // across the road from the shops
    buildSandboxArea(zone);            // behind the school
    buildSandboxPath(zone);            // and a paved way round to it
    buildMinefield(zone, actions);     // and Minesweeper, on the lawn behind the dorm
    buildDormFront(zone, actions);     // Wilson Hall, directly on your right at the start
    buildPark(zone, actions);          // and a little park with the great tree, across the road from it

    // notice board on the left-hand sidewalk near the spawn, facing the starting point
    const nz = DORM.zc - 7.5;
    box(g, 'log', 0.3, 2.2, 0.3, -8.8, 1.1, nz);
    box(g, 'log', 0.3, 2.2, 0.3, -6.2, 1.1, nz);
    box(g, 'planks', 2.9, 1.4, 0.2, -7.5, 1.7, nz);
    const board = makeSign({ w: 2.5, h: 1.0, title: 'HOW TO PLAY', fg: '#3a2412', bg: '#e8d7a8', border: '#8a6a34' });
    board.position.set(-7.5, 1.7, nz + 0.12);
    g.add(board);
    solid(zone, -7.5, nz, 3.2, 0.6);
    interact(zone, -7.5, nz + 1.6, 2.0, 'Read the notice board', actions.readBoard);

    // trees on either side, then the fence and the clouds
    [[-27, -14], [-27, -3], [-27, 10], [-27, 21], [-26, 25], [-30, -12],
     [31, 2], [47, 20], [54, 28], [53, 38], [54, 46], [30, 48]]
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

  // a line with two dots on a pair of axes, floating over the lines table
  const lineGraphCells = () => ({
    cells: [
      ...strokeCells([[2, 0.8], [2, 13.2]], 15, 14, 0.55), ...strokeCells([[2, 2], [14.2, 2]], 15, 14, 0.55),      // the axes
      ...strokeCells([[3.2, 3.4], [13.4, 12.4]], 15, 14, 0.8),                                                      // the line
      ...strokeCells([[5.2, 5.2], [5.3, 5.3]], 15, 14, 1.25), ...strokeCells([[11.2, 10.6], [11.3, 10.7]], 15, 14, 1.25),   // the two points
    ].filter(([c, r], i, a) => a.findIndex(([c2, r2]) => c2 === c && r2 === r) === i),
    w: 15, h: 14,
  });

  // a coaster track: a hill and a valley across the axis, with a dot where it crosses
  const coasterCells = () => ({
    cells: [
      ...strokeCells([[0.6, 6.5], [16.4, 6.5]], 17, 14, 0.4),                                                                                           // the axis
      ...strokeCells([[1, 2.5], [2.6, 5], [4.2, 8.6], [5.8, 11.4], [7.2, 12], [8.6, 10.4], [10, 6.5], [11.4, 2.6], [13, 1.4], [14.6, 3.6], [16, 8]], 17, 14, 0.8),   // the track
      ...strokeCells([[4.3, 6.6], [4.4, 6.7]], 17, 14, 1.25), ...strokeCells([[10, 6.5], [10.1, 6.6]], 17, 14, 1.25),                                    // two zeros
    ].filter(([c, r], i, a) => a.findIndex(([c2, r2]) => c2 === c && r2 === r) === i),
    w: 17, h: 14,
  });

  const parabolaCells = () => {
    const pts = [];
    for (let t = -1; t <= 1.0001; t += 0.05) pts.push([7.5 + 7 * t, 0.7 + 12.6 * t * t]);
    return { cells: strokeCells(pts, 15, 14, 0.8), w: 15, h: 14 };
  };

  // the three operation signs floating over the arithmetic tables (strokes sit between cells so they are 2 thick)
  const plusCells = () => ({ cells: strokeCells([[1, 6], [11, 6], [6, 6], [6, 1], [6, 11]], 12, 12, 0.7), w: 12, h: 12 });
  const minusCells = () => ({ cells: strokeCells([[1, 6], [11, 6]], 12, 12, 0.7), w: 12, h: 12 });
  const timesCells = () => ({ cells: strokeCells([[1.5, 1.5], [10.5, 10.5], [6, 6], [1.5, 10.5], [10.5, 1.5]], 12, 12, 0.85), w: 12, h: 12 });
  // the division sign: a bar with a 2 x 2 dot above and below it
  const divideCells = () => ({
    cells: [...strokeCells([[1, 6], [11, 6]], 12, 12, 0.7), ...strokeCells([[5.6, 9.6], [6.4, 9.6]], 12, 12, 0.95), ...strokeCells([[5.6, 2.4], [6.4, 2.4]], 12, 12, 0.95)],
    w: 12, h: 12,
  });

  // a question mark, drawn pixel by pixel: a curve is too small to come out cleanly from strokes
  const questionCells = () => {
    const rows = ['..######..', '.########.', '###....###', '###....###', '.......###', '......###.', '.....###..', '....###...', '....##....', '....##....', '..........', '....##....', '....##....'];   // top row first
    const cells = [];
    rows.forEach((line, i) => [...line].forEach((ch, c) => { if (ch === '#') cells.push([c, rows.length - 1 - i]); }));
    return { cells, w: 10, h: rows.length };
  };

  // a cube with three faces showing (front, top, right), a one-block gap between the faces so the edges show, for the Cubes Table
  const cubeCells = () => {
    const on = new Set(), add = (c, r) => on.add(`${c},${r}`);                       // r counts down from the top
    for (let r = 5; r <= 11; r++) for (let c = 0; c <= 7; c++) add(c, r);              // the front face
    for (let r = 0; r <= 3; r++) for (let c = 4 - r; c <= 11 - r; c++) add(c, r);      // the top face, leaning back to the right
    for (let c = 9; c <= 11; c++) for (let r = 12 - c; r <= 19 - c; r++) add(c, r);    // the right face
    const cells = []; on.forEach(k => { const [c, r] = k.split(',').map(Number); cells.push([c, 11 - r]); });
    return { cells, w: 12, h: 12 };
  };

  // a flag on a pole with a little base, for the Minesweeper trophy and the sign over the minefield
  const flagCells = () => {
    const rows = ['..#.........', '..####......', '..#######...', '..##########', '..#######...', '..####......', '..#.........', '..#.........', '..#.........', '..#.........', '..#.........', '.####.......', '#########...'];
    const cells = [];
    rows.forEach((line, i) => [...line].forEach((ch, c) => { if (ch === '#') cells.push([c, rows.length - 1 - i]); }));
    return { cells, w: 12, h: rows.length };
  };

  const SYMBOLS = {
    question: { shape: questionCells, u: 0.19, mirrorBack: false },
    sqrt:      { shape: radicalCells,   u: 0.1,   mirrorBack: false },
    quadratic: { shape: quadraticCells, u: 0.08,  mirrorBack: false },
    parabola:  { shape: parabolaCells,  u: 0.1,   mirrorBack: false },
    linegraph: { shape: lineGraphCells, u: 0.1,   mirrorBack: false },
    coaster:   { shape: coasterCells,   u: 0.1,   mirrorBack: false },
    vertexform: { shape: vertexFormCells, u: 0.08, mirrorBack: false },
    flag:      { shape: flagCells,     u: 0.1,   mirrorBack: false },
    cube:      { shape: cubeCells,     u: 0.1,   mirrorBack: false },
    plus:  { shape: plusCells,  u: 0.11, mirrorBack: false },
    minus: { shape: minusCells, u: 0.11, mirrorBack: false },
    times: { shape: timesCells, u: 0.11, mirrorBack: false },
    divide: { shape: divideCells, u: 0.11, mirrorBack: false },
  };

  /** The size of a symbol in world units, so something else (a trophy) can scale it to fit. */
  const symbolSize = kind => { const d = SYMBOLS[kind], s = d.shape(); return { w: s.w * d.u, h: s.h * d.u }; };
  /** The blocks a symbol is made of, for drawing it flat: { cells: [[column, row]...], w, h } with row 0 at the bottom. */
  const symbolCells = kind => SYMBOLS[kind].shape();

  /** Two layers thick so it never vanishes edge-on. (mirrorBack flips the rear layer, but a flipped
      copy shows through the gaps between letters, so the text uses a plain solid slab instead.) */
  /** opts: outline (a color for a dark edge around the whole shape, so it stands out against light walls),
      outlineWidth (blocks), emissive (glow, 0 for none), tone (scales the fill color down, for bright rooms
      where pale colors would otherwise clip to white). */
  function buildSymbol(kind, color, opts = {}) {
    const { outline = null, outlineWidth = 0.035, emissive = 0.6, tone = 1 } = opts;
    const def = SYMBOLS[kind];
    const { cells, w, h } = def.shape();
    const u = def.u;
    const fill = tone === 1 ? color : (((((color >> 16) & 255) * tone) << 16) | ((((color >> 8) & 255) * tone) << 8) | ((color & 255) * tone)) >>> 0;
    const mat = new T.MeshLambertMaterial({ color: fill, emissive: color, emissiveIntensity: emissive });
    const mesh = new T.InstancedMesh(new T.BoxGeometry(u, u, u), mat, cells.length * 2);
    mesh.frustumCulled = false; // instances sit around the origin, which the default bounds ignore
    // the outline is a slightly bigger copy of every block, drawn inside-out behind it: only a thin dark edge shows
    const hull = outline === null ? null : new T.InstancedMesh(new T.BoxGeometry(u + 2 * outlineWidth, u + 2 * outlineWidth, u + 2 * outlineWidth),
      new T.MeshBasicMaterial({ color: outline, side: T.BackSide }), cells.length * 2);
    if (hull) hull.frustumCulled = false;
    const m = new T.Matrix4();
    let n = 0;
    [0, 1].forEach(layer => {
      cells.forEach(([c, r]) => {
        const col = layer === 1 && def.mirrorBack ? w - 1 - c : c;
        m.makeTranslation((col + 0.5 - w / 2) * u, (r + 0.5 - h / 2) * u, layer === 0 ? u / 2 : -u / 2);
        mesh.setMatrixAt(n, m);
        if (hull) hull.setMatrixAt(n, m);
        n++;
      });
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (hull) hull.instanceMatrix.needsUpdate = true;
    const group = new T.Group();
    group.add(mesh);                     // children[0] is always the colored blocks
    if (hull) group.add(hull);
    group.userData.size = { w: w * u, h: h * u, cells: cells.length };
    group.userData.accent = color;
    group.userData.outline = outline;
    return group;
  }

  function buildTable(zone, x, z, felt, title, sub, color, onUse, opts = {}) {
    const { prop = 'dice', facing = 1, accent = 0xffffff, lesson } = opts;
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
      const sym = buildSymbol(prop, accent, { outline: opts.symbolOutline ?? null, emissive: opts.symbolEmissive ?? 0.6, tone: opts.symbolTone ?? 1 });
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

    const sign = makeSign({ w: 4.6, h: 1.3, title, sub, fg: color, bg: opts.signBg || '#12081e', border: color, subColor: opts.signSub || '#e8e0f5' });
    sign.position.set(x, 3.6, z);
    // the sign faces the player: south (+z) for the north-wall tables, north (-z) for the ones behind you
    sign.rotation.y = facing < 0 ? Math.PI : 0;
    g.add(sign);

    solid(zone, x, z, 5.9, 3.5);
    interact(zone, x, z + 2.8 * facing, 2.2, `Sit at the ${title.toLowerCase()}`, onUse, lesson ? { lesson } : undefined);   // a table with a mini lesson also offers it (L)
  }

  /** The casino inside is built by casino-interior.js (a grand hall and two wings). The outside, buildCasinoFront, is above. */
  function buildCasino(actions) {
    return CasinoInterior.build(actions, { box, flat, lambert, glow, textPlane, makeSign, solid, interact, createZone, buildTable, spawnNPCs, waterSurface, PX_FONT });
  }

  /* ---------- the arithmetic academy: inside ---------- */
  /** A flat picture made from a canvas drawing (chalkboards, posters, the clock). */
  function textPlane(w, h, draw, ppu = 64) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * ppu);
    c.height = Math.round(h * ppu);
    draw(c.getContext('2d'), c);
    const tex = new T.CanvasTexture(c);
    tex.anisotropy = 4;
    return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex }));
  }
  const PX_FONT = px => `${px}px Silkscreen, "Courier New", monospace`;

  /** A student desk with a chair behind it (the student sits on the south side, facing the board). */
  function addDesk(zone, x, z) {
    const g = zone.group, light = lambert(0xd9b97e), metal = lambert(0x6b6f78), seat = lambert(0x2f6fdb);
    box(g, light, 0.95, 0.07, 0.7, x, 0.78, z);                              // top
    [[-0.4, -0.28], [0.4, -0.28], [-0.4, 0.28], [0.4, 0.28]].forEach(([dx, dz]) => box(g, metal, 0.06, 0.75, 0.06, x + dx, 0.38, z + dz));
    box(g, seat, 0.5, 0.06, 0.5, x, 0.46, z + 0.8);                          // chair seat
    box(g, seat, 0.5, 0.5, 0.06, x, 0.78, z + 1.05);                         // chair back
    [[-0.2, 0.6], [0.2, 0.6], [-0.2, 1.0], [0.2, 1.0]].forEach(([dx, dz]) => box(g, metal, 0.05, 0.43, 0.05, x + dx, 0.22, z + dz));
    solid(zone, x, z + 0.4, 1.0, 1.7);
  }

  /* ---------- the wall map and the flag, on the back wall left of the exit ---------- */
  /** A pull-down classroom map of the United States (press E to play "find the state") and the flag beside it.
      The flag is drawn to the official proportions and hung the way the US Flag Code says for a wall (4 U.S.C. 7(i)):
      the blue union uppermost and to the observer's left. The picture is turned to face the room without mirroring it. */
  function buildMapAndFlag(zone, actions) {
    const g = zone.group, wallZ = 11.96;

    // the map: a paper map between two wooden rods, with a pull cord
    const mw = 6.2, mh = mw * USMap.HEIGHT / USMap.WIDTH, mx = -9.5, my = 3.55;     // clear of the wood paneling (1.3 high) and the ceiling
    const map = textPlane(mw, mh + 0.5, (c, cv) => {
      c.fillStyle = '#d9ecf5'; c.fillRect(0, 0, cv.width, cv.height);
      c.fillStyle = '#7a2e2e'; c.fillRect(0, 0, cv.width, 58);                                          // the title band
      c.fillStyle = '#fff3d8'; c.font = PX_FONT(30); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('UNITED STATES', cv.width / 2, 31);
      const pad = 12, k = Math.min((cv.width - 2 * pad) / USMap.WIDTH, (cv.height - 58 - 2 * pad) / USMap.HEIGHT);
      USMap.draw(c, { scale: k, dx: (cv.width - USMap.WIDTH * k) / 2, dy: 58 + (cv.height - 58 - USMap.HEIGHT * k) / 2, lineWidth: 1.2 });
      c.strokeStyle = '#5a4a3a'; c.lineWidth = 6; c.strokeRect(3, 3, cv.width - 6, cv.height - 6);
    }, 160);
    map.position.set(mx, my, wallZ); map.rotation.y = Math.PI;                                         // faces into the room
    g.add(map);
    const top = my + (mh + 0.5) / 2, bottom = my - (mh + 0.5) / 2;
    box(g, 'wood', mw + 0.5, 0.16, 0.16, mx, top + 0.08, wallZ - 0.08);
    box(g, 'wood', mw + 0.3, 0.12, 0.12, mx, bottom - 0.06, wallZ - 0.06);
    [-1, 1].forEach(sd => box(g, lambert(0xe8c35a), 0.22, 0.22, 0.22, mx + sd * (mw / 2 + 0.28), top + 0.08, wallZ - 0.08));      // rod ends
    box(g, lambert(0xf2eee4), 0.03, 0.8, 0.03, mx + 1.2, bottom - 0.5, wallZ - 0.06);                                         // the pull cord
    box(g, lambert(0xe8c35a), 0.12, 0.12, 0.12, mx + 1.2, bottom - 0.95, wallZ - 0.06);
    interact(zone, mx, 9.9, 2.6, 'Look at the map', actions.openMap);

    // the flag: 1.9 as long as it is tall, flat against the wall, hanging from a rod
    const fw = 3.8, fh = 2.0, fx = -3.7, fy = 3.4;
    const flag = textPlane(fw, fh, (c, cv) => Flag.draw(c, cv.width, cv.height), 160);
    flag.position.set(fx, fy, wallZ); flag.rotation.y = Math.PI;      // faces the room, not mirrored: its upper left is the observer's upper left
    g.add(flag);
    box(g, 'wood', fw + 0.3, 0.1, 0.1, fx, fy + fh / 2 + 0.07, wallZ - 0.06);
    [-1, 1].forEach(sd => {
      box(g, lambert(0xe8c35a), 0.16, 0.16, 0.16, fx + sd * (fw / 2 + 0.17), fy + fh / 2 + 0.07, wallZ - 0.06);
      box(g, lambert(0xb8892f), 0.06, 0.06, 0.1, fx + sd * (fw / 2 - 0.25), fy + fh / 2 + 0.07, wallZ - 0.02);                  // brackets to the wall
    });
    zone.flag = { mesh: flag, x: fx, y: fy, z: wallZ, w: fw, h: fh };
    zone.wallMap = { mesh: map, x: mx, y: my, z: wallZ, w: mw, h: mh + 0.5 };
    interact(zone, fx, 10.4, 2.2, 'Read about the flag', () => UI.dialog({
      title: 'The flag of the United States',
      html: `<p>It has <b>13 stripes</b>, 7 red and 6 white, for the 13 original colonies, and <b>50 stars</b> for the 50 states, in 9 rows that alternate 6 and 5.</p>
             <p>The Flag Code (4 U.S.C. 7) says that on a wall, the blue field (the <b>union</b>) goes <b>uppermost and to the observer's left</b>. Look at this one: the stars are at the top left. A flag hung sideways keeps the blue field in the upper left, too.</p>
             <p>It should hang flat and free, never touching anything below it, and never with the blue field down except to signal real danger.</p>`,
      buttons: [{ label: 'Close' }],
    }));
  }

  function buildSchool(actions) {
    const zone = createZone('Arithmetic Academy', {
      spawn: { x: 0, z: 3, yaw: 0 },
      bounds: { minX: -14.4, maxX: 14.4, minZ: -11.4, maxZ: 11.4 },   // the same size as the casino
      sky: 0xd8d2c0, fog: [0xd8d2c0, 40, 90],
      wander: { minX: -9, maxX: 9, minZ: 0, maxZ: 9 },
    });
    const g = zone.group;

    g.add(new T.HemisphereLight(0xffffff, 0xb8aa88, 0.95));
    g.add(new T.AmbientLight(0xfff0d8, 0.55));

    flat(g, 'planks', 30, 24, 0, 0, 0);
    box(g, 'schoolWall', 30, 6, 0.5, 0, 3, -12.25);
    box(g, 'schoolWall', 30, 6, 0.5, 0, 3, 12.25);
    box(g, 'schoolWall', 0.5, 6, 24, -15.25, 3, 0);
    box(g, 'schoolWall', 0.5, 6, 24, 15.25, 3, 0);
    box(g, 'schoolCeiling', 30.6, 0.3, 24.6, 0, 6.15, 0);
    [[30, 0.08, 0, 1.3, -11.96], [30, 0.08, 0, 1.3, 11.96]].forEach(([w, d, x, h, z]) => box(g, 'wood', w, h, d, x, h / 2, z));   // wood paneling
    [-14.96, 14.96].forEach(x => box(g, 'wood', 0.08, 1.3, 24, x, 0.65, 0));
    [-9, 0, 9].forEach(x => [-6, 3].forEach(z => box(g, glow(0xfffbe8), 3, 0.05, 1.2, x, 5.98, z)));   // ceiling lights

    // the green chalkboard on the north wall, with chalk writing, a tray, and a number strip above
    box(g, 'wood', 17.2, 4.0, 0.16, 0, 3.2, -11.92);
    const board = textPlane(16.2, 3.4, (c, cv) => {
      c.fillStyle = '#2c5b40'; c.fillRect(0, 0, cv.width, cv.height);
      c.fillStyle = 'rgba(255,255,255,.05)';
      [[40, 30, 300, 40], [600, 90, 280, 50], [200, 150, 380, 30]].forEach(([x, y, ww, hh]) => c.fillRect(x, y, ww, hh));   // chalk dust
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#f4f1e6'; c.font = PX_FONT(cv.height * 0.2);
      c.fillText('ARITHMETIC PRACTICE', cv.width / 2, cv.height * 0.26);
      [['7 + 5 = 12', '#f7e98e'], ['9 x 6 = 54', '#f6b0c8'], ['20 / 4 = 5', '#a8d8f0'], ['15 - 8 = 7', '#b9f0b0']].forEach(([t, col], i) => {
        c.fillStyle = col; c.font = PX_FONT(cv.height * 0.11);
        c.fillText(t, cv.width * (0.125 + i * 0.25), cv.height * 0.62);
      });
      c.fillStyle = '#f4f1e6'; c.fillRect(cv.width * 0.08, cv.height * 0.4, cv.width * 0.84, 3);
    });
    board.position.set(0, 3.2, -11.8);
    g.add(board);
    box(g, 'wood', 16.4, 0.12, 0.35, 0, 1.4, -11.72);                       // chalk tray
    [-5, 2.5, 6].forEach(x => box(g, lambert(0xf4f1e6), 0.3, 0.06, 0.08, x, 1.49, -11.7));
    box(g, lambert(0x3a3a3a), 0.5, 0.1, 0.2, 7.5, 1.51, -11.7);              // eraser
    const strip = textPlane(16.2, 0.9, (c, cv) => {
      const cols = ['#d94a4a', '#e8742a', '#e0a030', '#3fae5a', '#2fb5b0', '#2f6fdb', '#8a4fd0', '#f06fb0', '#d94a4a', '#e0a030'];
      cols.forEach((col, i) => {
        c.fillStyle = col; c.fillRect(i * cv.width / 10 + 6, 6, cv.width / 10 - 12, cv.height - 12);
        c.fillStyle = '#ffffff'; c.font = PX_FONT(cv.height * 0.5); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(i + 1), (i + 0.5) * cv.width / 10, cv.height / 2 + 2);
      });
    });
    strip.position.set(0, 5.5, -11.97);
    g.add(strip);

    // the teacher's desk, with an apple and a stack of books, and a chair behind it
    box(g, 'wood', 3.4, 0.9, 1.4, 0, 0.45, -9.4);
    box(g, 'planks', 3.6, 0.1, 1.6, 0, 0.95, -9.4);
    box(g, lambert(0xd94a4a), 0.28, 0.28, 0.28, -1.2, 1.14, -9.4);
    [[0xd94a4a, 0.7], [0x2f6fdb, 0.62], [0x3fae5a, 0.55]].forEach(([c, w], i) => box(g, lambert(c), w, 0.1, 0.45, 1.1, 1.05 + i * 0.1, -9.4));
    box(g, lambert(0x6b3a22), 0.9, 0.1, 0.9, 0, 0.55, -10.9);
    box(g, lambert(0x6b3a22), 0.9, 0.9, 0.1, 0, 1.0, -11.35);
    solid(zone, 0, -9.4, 3.6, 1.6);
    solid(zone, 0, -10.9, 1.0, 1.0);

    // student desks in two blocks along the side walls: the middle of the room stays open
    [[-13.5, -12.3], [12.3, 13.5]].forEach(cols => cols.forEach(x => [0.5, 2.4, 4.3, 6.2].forEach(z => addDesk(zone, x, z))));

    // a bookshelf, a globe, a clock, a times-table poster, and a cork board
    box(g, 'wood', 3.6, 2.6, 0.6, -12.5, 1.3, -11.7);
    const bookColors = [0xd94a4a, 0x2f6fdb, 0x3fae5a, 0xe0a030, 0x8a4fd0, 0xf06fb0, 0x2fb5b0];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
      box(g, lambert(bookColors[(i * 3 + row * 5) % bookColors.length]), 0.22, 0.62, 0.3, -13.95 + i * 0.26, 0.5 + row * 0.8, -11.4);
    }
    solid(zone, -12.5, -11.7, 3.8, 0.8);
    box(g, lambert(0x6b3a22), 0.55, 0.08, 0.55, 12.5, 0.04, -10.2);
    box(g, lambert(0x6b3a22), 0.1, 0.9, 0.1, 12.5, 0.5, -10.2);
    const globe = new T.Mesh(new T.SphereGeometry(0.5, 14, 10), lambert(0x2f78c8));
    globe.position.set(12.5, 1.4, -10.2);
    g.add(globe);
    [[0.2, 0.3, 0.1], [-0.25, 0.05, 0.3], [0.1, -0.3, 0.3]].forEach(([dx, dy, dz]) => {
      const land = new T.Mesh(new T.SphereGeometry(0.2, 8, 6), lambert(0x3f9f4a));
      land.position.set(dx, dy, dz).normalize().multiplyScalar(0.5);
      globe.add(land);
    });
    zone.animated.push(dt => { globe.rotation.y += dt * 0.5; });
    solid(zone, 12.5, -10.2, 0.9, 0.9);

    const clock = textPlane(1.3, 1.3, (c, cv) => {
      const r = cv.width / 2;
      c.fillStyle = '#f4f1e6'; c.beginPath(); c.arc(r, r, r - 2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2a2a2a'; c.lineWidth = 6; c.stroke();
      c.lineWidth = 4;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(r + Math.sin(a) * r * 0.78, r - Math.cos(a) * r * 0.78); c.lineTo(r + Math.sin(a) * r * 0.9, r - Math.cos(a) * r * 0.9); c.stroke(); }
      c.lineWidth = 6; c.beginPath(); c.moveTo(r, r); c.lineTo(r + Math.sin(Math.PI * 0.6) * r * 0.45, r - Math.cos(Math.PI * 0.6) * r * 0.45); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(r, r); c.lineTo(r + Math.sin(Math.PI * 0.05) * r * 0.7, r - Math.cos(Math.PI * 0.05) * r * 0.7); c.stroke();
    });
    clock.position.set(6, 4.6, 11.97);
    clock.rotation.y = Math.PI;
    g.add(clock);

    const poster = textPlane(3, 3.2, (c, cv) => {
      c.fillStyle = '#f7f1d8'; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = '#8a4fd0'; c.lineWidth = 6; c.strokeRect(3, 3, cv.width - 6, cv.height - 6);
      c.fillStyle = '#8a4fd0'; c.font = PX_FONT(cv.height * 0.08); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('TIMES TABLE', cv.width / 2, cv.height * 0.1);
      c.font = PX_FONT(cv.height * 0.07);
      for (let r = 1; r <= 5; r++) for (let q = 1; q <= 5; q++) {
        c.fillStyle = (r + q) % 2 ? '#2f6fdb' : '#d94a4a';
        c.fillText(String(r * q), (q + 0.5) * cv.width / 6.6, cv.height * (0.18 + r * 0.14));
      }
    });
    poster.position.set(-14.97, 3.4, -6);
    poster.rotation.y = Math.PI / 2;
    g.add(poster);

    const cork = textPlane(4, 2.6, (c, cv) => {
      c.fillStyle = '#c89a5c'; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = '#8a6a34'; c.lineWidth = 8; c.strokeRect(4, 4, cv.width - 8, cv.height - 8);
      [['#ffffff', 20, 20], ['#f6b0c8', 110, 30], ['#a8d8f0', 180, 22], ['#f7e98e', 40, 90], ['#b9f0b0', 130, 100], ['#ffffff', 200, 92]].forEach(([col, x, y]) => {
        c.fillStyle = col; c.fillRect(x, y, 56, 56);
        c.fillStyle = '#d94a4a'; c.fillRect(x + 26, y + 3, 5, 5);
      });
    });
    cork.position.set(14.97, 3.4, -6);
    cork.rotation.y = -Math.PI / 2;
    g.add(cork);

    // tall windows along both side walls, above the desks
    [0.8, 4.8, 8.8].forEach(z => {
      [[-14.94, -14.78], [14.94, 14.78]].forEach(([fx, sx]) => {
        box(g, lambert(0xf2eee4), 0.12, 2.6, 3.4, fx, 3.3, z);
        box(g, glow(0xbfe6ff), 0.14, 2.2, 3.0, fx * 0.9993, 3.3, z);
        box(g, lambert(0xf2eee4), 0.16, 2.2, 0.1, fx * 0.999, 3.3, z);
        box(g, lambert(0xf2eee4), 0.3, 0.1, 3.6, sx, 2.0, z);
      });
    });

    // the way out
    buildDoor(g, { x: 0, z: 11.88, rotY: Math.PI, w: 2.6, h: 4.2 });                     // faces into the room
    const exit = makeSign({ w: 2.4, h: 0.7, title: 'EXIT', fg: '#52f08f', bg: '#0c2a18', border: '#52f08f' });
    exit.position.set(0, 4.95, 11.95);
    exit.rotation.y = Math.PI;
    g.add(exit);
    interact(zone, 0, 10.6, 2.0, 'Leave the Academy', actions.leaveSchool);
    buildMapAndFlag(zone, actions);                                                      // the map and the flag, beside the exit

    // three timed-practice tables on the north row, each with its chalk-colored sign floating above it
    // bright room: a dark chalkboard-green outline and a toned-down fill keep the floating signs from washing out
    const chalk = { signBg: '#244a35', signSub: '#f2efe0', symbolOutline: 0x1d4a30, symbolEmissive: 0, symbolTone: 0.68 };
    buildTable(zone, -9, -4, 'chalkTop', 'ADDITION TABLE', '60 seconds. 2 chips each.', '#f7e98e', () => actions.openArithmetic('add'),
      { ...chalk, prop: 'plus', accent: 0xf7e98e });
    buildTable(zone, 0, -4, 'chalkTop', 'SUBTRACTION TABLE', '60 seconds. 2 chips each.', '#f6b0c8', () => actions.openArithmetic('sub'),
      { ...chalk, prop: 'minus', accent: 0xf6b0c8 });
    buildTable(zone, 9, -4, 'chalkTop', 'MULTIPLICATION TABLE', '60 seconds. 4 chips each.', '#a8d8f0', () => actions.openArithmetic('mul'),
      { ...chalk, prop: 'times', accent: 0xa8d8f0 });

    // the fourth operation takes the right-hand south table spot; its sign faces the room. (The left spot is kept clear on
    // purpose: a table there would hang its sign in front of the wall map and the flag.)
    buildTable(zone, 5, 8, 'chalkTop', 'DIVISION TABLE', '60 seconds. 5 chips each.', '#cdb8f0', () => actions.openArithmetic('div'),
      { ...chalk, prop: 'divide', accent: 0xcdb8f0, facing: -1 });

    // room for more games: the casino's last table spot, kept clear on purpose
    zone.tableSlots = [{ x: -5, z: 8, facing: -1 }];

    spawnNPCs(zone, 2);
    return zone;
  }

  return { buildHub, buildCasino, buildSchool, buildDorm, SCHOOL_EXIT, DORM_EXIT, DORM, PARK, CASINO_FRONT, casinoFrontZ, helpers: { box, flat, lambert, glow, textPlane, makeSign, solid, interact, buildDoor, PX_FONT, createZone, buildSymbol, symbolSize, symbolCells, buildTable, spawnNPCs, waterSurface }, updateNPCs, Collide, symbolCells: { sqrt: radicalCells, quadratic: quadraticCells, parabola: parabolaCells, vertexform: vertexFormCells, plus: plusCells, minus: minusCells, times: timesCells, divide: divideCells, question: questionCells } };
})();
