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

  /* ---------- village pieces ---------- */
  function addLamp(zone, x, z) {
    const g = zone.group, dark = lambert(0x2b2b30);
    box(g, dark, 0.2, 3.4, 0.2, x, 1.7, z);
    box(g, dark, 0.7, 0.12, 0.7, x, 3.9, z);
    box(g, glow(0xfff2b0), 0.5, 0.5, 0.5, x, 3.6, z);
    solid(zone, x, z, 0.5, 0.5);
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
    const z0 = -14, z1 = 32, len = z1 - z0, mid = (z0 + z1) / 2;
    flat(g, 'asphalt', 8, len, 0, 0.03, mid);
    [-5.2, 5.2].forEach(x => flat(g, 'paving', 2.4, len, x, 0.02, mid));            // sidewalks
    [-4.15, 4.15].forEach(x => box(g, 'stone', 0.3, 0.18, len, x, 0.09, mid));      // curbs
    flat(g, 'paving', 16, 6, 0, 0.02, -17);                                         // forecourt
    for (let z = 30; z >= -12; z -= 4) {
      if (Math.abs(z - 10) < 2.5) continue;                                         // not through the crosswalk
      box(g, glow(0xf2c230), 0.22, 0.02, 2, 0, 0.05, z);                            // dashed center line
    }
    for (let i = 0; i < 6; i++) box(g, glow(0xf4f4f4), 0.7, 0.02, 3, -3.25 + i * 1.3, 0.05, 10); // crosswalk
    [22, 12, 2, -8].forEach(z => [-5.2, 5.2].forEach(x => addLamp(zone, x, z)));
  }

  /** A wall block with a textured side (the hotel's windowed sandstone by default) and a plain stone roof. */
  function hotelBox(g, w, h, d, x, y, z, name = 'hotel') {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), [
      Tex.mat(name, d, h), Tex.mat(name, d, h),
      Tex.mat('stone', w, d), Tex.mat('stone', w, d),
      Tex.mat(name, w, h), Tex.mat(name, w, h),
    ]);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  /** The casino as a mini grand hotel: a stepped crescent of sandstone (tall center tower, two lower
      wings each side), gold trim, a window on every other block, and a columned porte-cochere over
      the entrance. The door, its interaction spot, and the drop-off point are where they always were. */
  function buildCasinoFront(zone, actions) {
    const g = zone.group;
    const gold = lambert(0xc9a24a), goldGlow = glow(0xffd36b);

    // front = the z of the face you see; every section ends at z = -32
    const sections = [
      { x: 0, w: 16, h: 14, front: -20 },                                   // center tower
      { x: -14, w: 12, h: 12, front: -23 }, { x: 14, w: 12, h: 12, front: -23 },   // inner wings
      { x: -25, w: 10, h: 8, front: -26 }, { x: 25, w: 10, h: 8, front: -26 },     // outer wings
    ];
    sections.forEach(sec => {
      const d = sec.front + 32;                               // depth from the front face back to z = -32
      const cz = sec.front - d / 2;
      hotelBox(g, sec.w, sec.h, d, sec.x, sec.h / 2, cz);
      box(g, gold, sec.w + 0.5, 0.5, d + 0.5, sec.x, sec.h + 0.25, cz);      // gold cornice
      solid(zone, sec.x, cz, sec.w + 0.2, d + 0.2);
    });
    [-8, 8].forEach(x => box(g, gold, 0.5, 14, 0.5, x, 7, -19.9));            // gold piers on the tower corners

    // the grand entrance: a glowing gold frame, the door, and a sign above it
    box(g, goldGlow, 4.2, 5.0, 0.1, 0, 2.5, -19.95);
    box(g, glow(0x1b1208), 3.6, 4.6, 0.2, 0, 2.3, -19.85);
    const sign = makeSign({
      w: 14, h: 2.4, title: 'PRIME TIME CASINO', sub: 'factor it. wager it. win it.',
      fg: '#ffd36b', bg: '#10162b', border: '#ffd36b', subColor: '#8fd8ff',
    });
    sign.position.set(0, 9.6, -19.95);
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
    buildRoad(zone);

    // all four shops are on the west side of the road, facing it
    const spots = [
      { id: 'style', x: -11, z: 16, facing: 1 },
      { id: 'accessories', x: -11, z: 7, facing: 1 },
      { id: 'pets', x: -11, z: -2, facing: 1 },
      { id: 'hints', x: -11, z: -11, facing: 1 },
    ];
    spots.forEach(s => buildShop(zone, s, CONTENT.shops[s.id], () => actions.openShop(s.id)));

    buildCasinoFront(zone, actions);   // straight ahead at the end of the road
    buildFountain(zone);               // off to the right
    buildSchoolFront(zone, actions);   // across the road from the shops

    // notice board on the right-hand sidewalk near the spawn, facing the starting point
    box(g, 'log', 0.3, 2.2, 0.3, 6.2, 1.1, 17);
    box(g, 'log', 0.3, 2.2, 0.3, 8.8, 1.1, 17);
    box(g, 'planks', 2.9, 1.4, 0.2, 7.5, 1.7, 17);
    const board = makeSign({ w: 2.5, h: 1.0, title: 'HOW TO PLAY', fg: '#3a2412', bg: '#e8d7a8', border: '#8a6a34' });
    board.position.set(7.5, 1.7, 17.12);
    g.add(board);
    solid(zone, 7.5, 17, 3.2, 0.6);
    interact(zone, 7.5, 18.6, 2.0, 'Read the notice board', actions.readBoard);

    // trees on either side, then the fence and the clouds
    [[-20, -14], [-25, -3], [-21, 10], [-27, 21], [-18, 27], [-30, -12],
     [31, 2], [29, 21], [19, 26], [12, 27], [30, 12], [9, 23]]
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

  // the three operation signs floating over the arithmetic tables (strokes sit between cells so they are 2 thick)
  const plusCells = () => ({ cells: strokeCells([[1, 6], [11, 6], [6, 6], [6, 1], [6, 11]], 12, 12, 0.7), w: 12, h: 12 });
  const minusCells = () => ({ cells: strokeCells([[1, 6], [11, 6]], 12, 12, 0.7), w: 12, h: 12 });
  const timesCells = () => ({ cells: strokeCells([[1.5, 1.5], [10.5, 10.5], [6, 6], [1.5, 10.5], [10.5, 1.5]], 12, 12, 0.85), w: 12, h: 12 });

  const SYMBOLS = {
    sqrt:      { shape: radicalCells,   u: 0.1,   mirrorBack: false },
    quadratic: { shape: quadraticCells, u: 0.08,  mirrorBack: false },
    parabola:  { shape: parabolaCells,  u: 0.1,   mirrorBack: false },
    vertexform: { shape: vertexFormCells, u: 0.08, mirrorBack: false },
    plus:  { shape: plusCells,  u: 0.11, mirrorBack: false },
    minus: { shape: minusCells, u: 0.11, mirrorBack: false },
    times: { shape: timesCells, u: 0.11, mirrorBack: false },
  };

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
    board.position.set(0, 3.2, -11.83);
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

    // three timed-practice tables on the north row, each with its chalk-colored sign floating above it
    // bright room: a dark chalkboard-green outline and a toned-down fill keep the floating signs from washing out
    const chalk = { signBg: '#244a35', signSub: '#f2efe0', symbolOutline: 0x1d4a30, symbolEmissive: 0, symbolTone: 0.68 };
    buildTable(zone, -9, -4, 'chalkTop', 'ADDITION TABLE', '60 seconds. 1 chip each.', '#f7e98e', () => actions.openArithmetic('add'),
      { ...chalk, prop: 'plus', accent: 0xf7e98e });
    buildTable(zone, 0, -4, 'chalkTop', 'SUBTRACTION TABLE', '60 seconds. 1 chip each.', '#f6b0c8', () => actions.openArithmetic('sub'),
      { ...chalk, prop: 'minus', accent: 0xf6b0c8 });
    buildTable(zone, 9, -4, 'chalkTop', 'MULTIPLICATION TABLE', '60 seconds. 1 chip each.', '#a8d8f0', () => actions.openArithmetic('mul'),
      { ...chalk, prop: 'times', accent: 0xa8d8f0 });

    // room for more games: the casino's other two table spots, kept clear on purpose
    zone.tableSlots = [{ x: -5, z: 8, facing: -1 }, { x: 5, z: 8, facing: -1 }];

    spawnNPCs(zone, 2);
    return zone;
  }

  return { buildHub, buildCasino, buildSchool, SCHOOL_EXIT, updateNPCs, Collide, symbolCells: { sqrt: radicalCells, quadratic: quadraticCells, parabola: parabolaCells, vertexform: vertexFormCells, plus: plusCells, minus: minusCells, times: timesCells } };
})();
