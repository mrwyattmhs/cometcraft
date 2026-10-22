/* The casino inside: a grand entrance hall, a Factoring wing on the left, a Graphing wing on the right, and room kept for a third
   wing to the north. (The building outside is in world.js and is not touched.)

   You come in through the south door facing north. The hall is a big tiled room with a ceiling 16 blocks up, a dancing fountain
   under a crystal chandelier, and a tall marble archway in each side wall. The tables are sorted by what kind of question they ask:

     Factoring wing (west, left):   Practice table, Radical table, Trinomial table
     Graphing wing  (east, right):  Parabola table (standard form), Vertex table (vertex form)
     North wing:                    not built yet. Its doors are in the north wall and its floor space is reserved.

   Each wing is 28 x 22, a little smaller than the 30 x 24 Arithmetic Academy. Coordinates: x grows east, z grows south, so you walk
   north (toward -z) from the door. The numbers that other code and the tests rely on are exported at the bottom. */
const CasinoInterior = (() => {
  const BUILD = 22; // bump together with the ?v= numbers in index.html

  /* ---------- the plan ---------- */
  const WALL = 0.5;                                                        // wall thickness
  const HALL = { minX: -16, maxX: 16, minZ: -14, maxZ: 14, height: 16 };    // the inside of the entrance hall
  const WING = { length: 28, depth: 22, height: 10 };                       // inside each wing
  const ARCH = { halfWidth: 4.5, height: 7.5 };                             // the opening between the hall and a wing
  const WINGS = {
    factoring: { side: -1, name: 'FACTORING', minX: -44.5, maxX: -16.5, minZ: -11, maxZ: 11 },
    graphing: { side: 1, name: 'GRAPHING', minX: 16.5, maxX: 44.5, minZ: -11, maxZ: 11 },
  };
  /** Room for a third wing, the same size as the others, straight north of the hall. Nothing is built there yet, and nothing else may be. */
  const NORTH_WING = { minX: -14, maxX: 14, minZ: -36.5, maxZ: -14.5, door: { x: 0, z: -14, width: 7, height: 9 } };
  const FOUNTAIN = { x: 0, z: -1, radius: 5.4 };
  const TABLES = {
    practice: { x: -24, z: -5 }, radical: { x: -31.5, z: -5 }, trinomial: { x: -39, z: -5 },
    parabola: { x: 25.5, z: -5 }, vertex: { x: 35.5, z: -5 },
  };
  const SPAWN = { x: 0, z: 10.5, yaw: 0 };
  const GOLD = 0xd4a843;

  // (made when first needed, so this file can be loaded in Node for the plan tests without THREE)
  let scratch = null;
  /** One draw call for many copies of a shape: list items are { x, y, z, sx, sy, sz, ry }. */
  function instanced(geo, mat, list) {
    scratch = scratch || { q: new THREE.Quaternion(), e: new THREE.Euler(), m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3() };
    const _q = scratch.q, _e = scratch.e, _m = scratch.m, _p = scratch.p, _s = scratch.s;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((o, i) => {
      _e.set(o.rx || 0, o.ry || 0, 0); _q.setFromEuler(_e); _p.set(o.x, o.y, o.z); _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
      _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  /* ---------- the pictures on the wing walls ---------- */
  function frame(c, cv, title) {
    c.fillStyle = '#10142a'; c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = '#d4a843'; c.lineWidth = 8; c.strokeRect(5, 5, cv.width - 10, cv.height - 10);
    c.strokeStyle = 'rgba(212,168,67,.45)'; c.lineWidth = 2; c.strokeRect(14, 14, cv.width - 28, cv.height - 28);
    c.fillStyle = '#f3d27a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${Math.round(cv.height * 0.08)}px Silkscreen, "Courier New", monospace`;
    c.fillText(title, cv.width / 2, cv.height * 0.12);
  }
  const serif = px => `700 ${Math.round(px)}px Georgia, "Times New Roman", serif`;

  function artFactorTree(c, cv) {
    frame(c, cv, 'FACTOR TREE');
    const W = cv.width, H = cv.height, r = H * 0.062;
    const line = (a, b) => { c.strokeStyle = '#8fa0d0'; c.lineWidth = 3; c.beginPath(); c.moveTo(a[0] * W, a[1] * H + r); c.lineTo(b[0] * W, b[1] * H - r); c.stroke(); };
    const node = (p, label, prime) => {
      c.beginPath(); c.arc(p[0] * W, p[1] * H, r, 0, Math.PI * 2); c.fillStyle = prime ? '#d4a843' : '#2c3a66'; c.fill();
      c.strokeStyle = '#f3e8c9'; c.lineWidth = 3; c.stroke();
      c.fillStyle = prime ? '#1a1020' : '#f3e8c9'; c.font = serif(r * 1.1); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, p[0] * W, p[1] * H + 2);
    };
    const n72 = [0.5, 0.3], n8 = [0.3, 0.47], n9 = [0.7, 0.47], n2a = [0.2, 0.64], n4 = [0.4, 0.64], n3a = [0.6, 0.64], n3b = [0.8, 0.64], n2b = [0.33, 0.8], n2c = [0.47, 0.8];
    [[n72, n8], [n72, n9], [n8, n2a], [n8, n4], [n9, n3a], [n9, n3b], [n4, n2b], [n4, n2c]].forEach(([a, b]) => line(a, b));
    node(n72, '72'); node(n8, '8'); node(n9, '9'); node(n2a, '2', true); node(n4, '4'); node(n3a, '3', true); node(n3b, '3', true); node(n2b, '2', true); node(n2c, '2', true);
    c.fillStyle = '#f3e8c9'; c.font = serif(H * 0.075); c.textAlign = 'center'; c.fillText('72 = 2 \u00d7 2 \u00d7 2 \u00d7 3 \u00d7 3', W * 0.5, H * 0.93);
  }
  function artRadical(c, cv) {
    frame(c, cv, 'SIMPLIFY');
    const W = cv.width, H = cv.height;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#f3e8c9'; c.font = serif(H * 0.19); c.fillText('\u221a72', W / 2, H * 0.33);
    c.fillStyle = '#8fd8ff'; c.font = serif(H * 0.14); c.fillText('= \u221a(36 \u00d7 2)', W / 2, H * 0.56);
    c.fillStyle = '#f3d27a'; c.font = serif(H * 0.2); c.fillText('= 6\u221a2', W / 2, H * 0.8);
  }
  function artTrinomial(c, cv) {
    frame(c, cv, 'SPLIT THE MIDDLE');
    const W = cv.width, H = cv.height;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#f3e8c9'; c.font = serif(H * 0.15); c.fillText('x\u00b2 + 5x + 6', W / 2, H * 0.33);
    c.fillStyle = '#ff9a9a'; c.font = serif(H * 0.1); c.fillText('2 \u00d7 3 = 6   and   2 + 3 = 5', W / 2, H * 0.55);
    c.fillStyle = '#f3d27a'; c.font = serif(H * 0.15); c.fillText('(x + 2)(x + 3)', W / 2, H * 0.78);
  }
  /** A graph on squared paper: f is the function, xr and yr the visible ranges, marks the dots to draw. */
  function artGraph(title, label, f, xr, yr, marks) {
    return (c, cv) => {
      frame(c, cv, title);
      const W = cv.width, H = cv.height, L = W * 0.12, R = W * 0.88, Tp = H * 0.22, B = H * 0.88;
      const px = x => L + (x - xr[0]) / (xr[1] - xr[0]) * (R - L), py = y => B - (y - yr[0]) / (yr[1] - yr[0]) * (B - Tp);
      c.strokeStyle = 'rgba(143,160,208,.28)'; c.lineWidth = 1;
      for (let x = Math.ceil(xr[0]); x <= xr[1]; x++) { c.beginPath(); c.moveTo(px(x), Tp); c.lineTo(px(x), B); c.stroke(); }
      for (let y = Math.ceil(yr[0]); y <= yr[1]; y++) { c.beginPath(); c.moveTo(L, py(y)); c.lineTo(R, py(y)); c.stroke(); }
      c.strokeStyle = '#8fa0d0'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(px(0), Tp); c.lineTo(px(0), B); c.moveTo(L, py(0)); c.lineTo(R, py(0)); c.stroke();
      c.strokeStyle = '#f3d27a'; c.lineWidth = 4; c.beginPath();
      let started = false;
      for (let i = 0; i <= 80; i++) {
        const x = xr[0] + (xr[1] - xr[0]) * i / 80, y = f(x);
        if (y < yr[0] || y > yr[1]) { started = false; continue; }
        if (!started) { c.moveTo(px(x), py(y)); started = true; } else c.lineTo(px(x), py(y));
      }
      c.stroke();
      marks.forEach(([x, y, hot]) => { c.beginPath(); c.arc(px(x), py(y), H * 0.022, 0, Math.PI * 2); c.fillStyle = hot ? '#ff8a8a' : '#f3e8c9'; c.fill(); });
      c.fillStyle = '#f3e8c9'; c.font = serif(H * 0.09); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, W / 2, H * 0.17);
    };
  }

  /* ---------- the build ---------- */
  function build(actions, H) {
    const { box, flat, lambert, glow, textPlane, makeSign, solid, interact, createZone, buildTable, spawnNPCs, waterSurface } = H;
    const zone = createZone('Prime Time Casino', {
      spawn: SPAWN,
      bounds: { minX: -45.4, maxX: 45.4, minZ: -14.9, maxZ: 14.9 },
      sky: 0x140e1c, fog: [0x140e1c, 60, 150],
      wander: { minX: -10, maxX: 10, minZ: 6, maxZ: 12 },
    });
    const g = zone.group;
    const gold = lambert(GOLD), goldDeep = lambert(0xa97f2a);

    g.add(new THREE.AmbientLight(0xffe6c4, 0.6));          // the walls are pale, so this is far lower than the old dark casino needed

    /** A wall: a dark marble or wood lower part and a gilded upper part, a gold rail between, and (usually) a collider. */
    const slab = (x, z, w, d, { h, lower, lowerH, collide = true }) => {
      box(g, lower, w, lowerH, d, x, lowerH / 2, z);
      box(g, 'wallGild', w, h - lowerH, d, x, lowerH + (h - lowerH) / 2, z);
      box(g, gold, w + (w > d ? 0 : 0.14), 0.16, d + (d > w ? 0 : 0.14), x, lowerH, z);
      if (collide) solid(zone, x, z, w, d);
    };
    /** A flat decal on the floor, lifted a little so it never fights with the floor under it. */
    const decal = (mat, w, d, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; };
    const ring = (mat, r0, r1, x, y, z) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 48), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; };
    const light = (color, intensity, dist, x, y, z) => { const p = new THREE.PointLight(color, intensity, dist); p.position.set(x, y, z); g.add(p); return p; };

    /* ===== the hall ===== */
    const HH = HALL.height, hw = HALL.maxX - HALL.minX, hd = HALL.maxZ - HALL.minZ;           // 32 x 28
    flat(g, 'marbleCheck', hw, hd, 0, 0, 0);
    box(g, 'ceilingCream', hw + 1, 0.3, hd + 1, 0, HH + 0.15, 0);
    slab(0, HALL.maxZ + WALL / 2, hw + 1, WALL, { h: HH, lower: 'marbleDark', lowerH: 3 });   // south wall (the door out)
    slab(0, HALL.minZ - WALL / 2, hw + 1, WALL, { h: HH, lower: 'marbleDark', lowerH: 3 });   // north wall (the doors to the wing to come)
    const armLen = HALL.maxZ + WALL - ARCH.halfWidth;                                          // the wall either side of an archway
    [-1, 1].forEach(side => {
      const wx = side * (HALL.maxX + WALL / 2);
      slab(wx, -(ARCH.halfWidth + armLen / 2), WALL, armLen, { h: HH, lower: 'marbleDark', lowerH: 3 });
      slab(wx, ARCH.halfWidth + armLen / 2, WALL, armLen, { h: HH, lower: 'marbleDark', lowerH: 3 });
      box(g, 'wallGild', WALL, HH - ARCH.height, 2 * ARCH.halfWidth, wx, ARCH.height + (HH - ARCH.height) / 2, 0);        // the wall above the archway
      // a gold frame round the archway
      [-1, 1].forEach(s => box(g, gold, 0.8, ARCH.height, 0.5, wx, ARCH.height / 2, s * (ARCH.halfWidth + 0.25)));
      box(g, gold, 0.8, 0.5, 2 * ARCH.halfWidth + 1, wx, ARCH.height + 0.25, 0);
      box(g, goldDeep, 0.9, 0.2, 2 * ARCH.halfWidth + 1.2, wx, ARCH.height + 0.62, 0);
      decal(lambert(0xe9e0cc), WALL, 2 * ARCH.halfWidth, wx, 0.012, 0);                                                  // a marble threshold in the doorway
    });

    // gold inlay round the floor (the south strip is split to leave room for the runner), and a red runner from the door to the fountain
    const inlay = lambert(GOLD);
    decal(inlay, hw - 2.4, 0.34, 0, 0.03, HALL.minZ + 0.9);
    [-1, 1].forEach(s => { decal(inlay, 0.34, hd - 2.0, s * (HALL.maxX - 0.9), 0.03, 0); decal(inlay, (hw / 2 - 1.2 - 2.9), 0.34, s * (2.9 + (hw / 2 - 1.2 - 2.9) / 2), 0.03, HALL.maxZ - 0.9); });
    flat(g, 'carpet', 4.6, 7.6, 0, 0.02, 10.0);                                  // starts clear of the rings round the fountain
    [-1, 1].forEach(s => decal(inlay, 0.2, 7.6, s * 2.4, 0.04, 10.0));

    // the fountain, and rings of gold and green marble round it in the floor
    ring(lambert(GOLD), FOUNTAIN.radius + 0.6, FOUNTAIN.radius + 0.95, FOUNTAIN.x, 0.03, FOUNTAIN.z);
    ring(lambert(0x233b34), FOUNTAIN.radius + 0.95, FOUNTAIN.radius + 1.6, FOUNTAIN.x, 0.03, FOUNTAIN.z);
    addGrandFountain(zone, H, FOUNTAIN.x, FOUNTAIN.z, FOUNTAIN.radius);

    // eight marble columns, four down each side, with gold bases and capitals
    const shaftMat = Tex.mat('marble', 5, 14);
    [-1, 1].forEach(side => [-10.5, -5.5, 5.5, 10.5].forEach(z => {
      const x = side * 12;
      box(g, 'marble', 2.0, 0.5, 2.0, x, 0.25, z); box(g, gold, 2.2, 0.16, 2.2, x, 0.58, z);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.8, 14.4, 16), shaftMat); shaft.position.set(x, 0.66 + 7.2, z); g.add(shaft);
      box(g, gold, 2.1, 0.5, 2.1, x, 15.2, z); box(g, 'marble', 2.4, 0.45, 2.4, x, 15.68, z);
      solid(zone, x, z, 1.8, 1.8);
    }));

    // the painted ceiling: a sunrise sky in a gold frame, with gold beams across
    const mural = textPlane(24, 20, (c, cv) => {
      // the sky: deep blue at the top, pale blue, then a sunrise glow, painted in thin bands
      const stops = [[0, [42, 79, 154]], [0.55, [143, 184, 232]], [1, [246, 217, 160]]];
      for (let y = 0; y < cv.height; y += 3) {
        const t = y / cv.height, k = t < stops[1][0] ? 0 : 1, a = stops[k], b = stops[k + 1], f = (t - a[0]) / (b[0] - a[0]);
        c.fillStyle = `rgb(${a[1].map((v, i) => Math.round(v + (b[1][i] - v) * f)).join(',')})`; c.fillRect(0, y, cv.width, 3);
      }
      c.fillStyle = 'rgba(255,255,255,.85)';
      [[0.2, 0.3, 90, 26], [0.34, 0.4, 70, 20], [0.7, 0.25, 100, 28], [0.82, 0.45, 80, 22], [0.5, 0.7, 110, 30], [0.12, 0.75, 70, 20], [0.9, 0.78, 90, 24]].forEach(([fx, fy, rx, ry]) => {
        [[0, 0], [rx * 0.6, 8], [-rx * 0.6, 8]].forEach(([dx, dy]) => { c.beginPath(); c.ellipse(fx * cv.width + dx, fy * cv.height + dy, rx, ry, 0, 0, Math.PI * 2); c.fill(); });
      });
      c.strokeStyle = '#d4a843'; c.lineWidth = 10; c.strokeRect(6, 6, cv.width - 12, cv.height - 12);
      c.fillStyle = 'rgba(255,236,170,.9)'; c.beginPath(); c.arc(cv.width / 2, cv.height / 2, 46, 0, Math.PI * 2); c.fill();
    }, 32);
    mural.rotation.x = Math.PI / 2; mural.position.set(0, HH - 0.02, 0); g.add(mural);
    [-12, 12].forEach(x => box(g, gold, 0.6, 0.5, hd, x, HH - 0.25, 0));
    [-10, 10].forEach(z => box(g, gold, hw, 0.5, 0.6, 0, HH - 0.25, z));

    // sconces on the long walls
    [-1, 1].forEach(side => [-12, -8, 8, 12].forEach(z => {
      box(g, gold, 0.16, 0.9, 0.5, side * (HALL.maxX - 0.08), 4.6, z);
      box(g, glow(0xfff0b8), 0.1, 0.55, 0.26, side * (HALL.maxX - 0.2), 4.7, z);
    }));
    [-8, 8].forEach(x => { box(g, gold, 0.5, 0.9, 0.16, x, 4.6, HALL.minZ + 0.08); box(g, glow(0xfff0b8), 0.26, 0.55, 0.1, x, 4.7, HALL.minZ + 0.2); });

    // wing signs over the archways, facing the hall
    [['factoring', '#2a0d14', 'practice. radicals. trinomials.'], ['graphing', '#0d1d3a', 'standard form. vertex form.']].forEach(([id, bg, sub]) => {
      const w = WINGS[id], sign = makeSign({ w: 9, h: 2.2, title: w.name, sub, fg: '#f3d27a', bg, border: '#d4a843', subColor: '#f3e8c9' });
      sign.rotation.y = -w.side * Math.PI / 2; sign.position.set(w.side * (HALL.maxX - 0.05), 9.9, 0); g.add(sign);
    });

    // the doors to the north wing: closed, with a rope across them
    const door = NORTH_WING.door;
    [-1, 1].forEach(s => box(g, 'wood', door.width / 2 - 0.1, door.height, 0.2, s * (door.width / 4), door.height / 2, HALL.minZ + 0.1));
    [-1, 1].forEach(s => box(g, gold, 0.5, door.height + 0.5, 0.4, s * (door.width / 2 + 0.25), (door.height + 0.5) / 2, HALL.minZ + 0.2));
    box(g, gold, door.width + 1, 0.5, 0.4, 0, door.height + 0.25, HALL.minZ + 0.2); box(g, goldDeep, door.width + 1.4, 0.2, 0.5, 0, door.height + 0.62, HALL.minZ + 0.2);
    box(g, gold, 0.18, 7, 0.1, 0, 4, HALL.minZ + 0.31);                                                                   // the seam between the two doors
    // gilded panels on each door, and a handle on each
    [-1, 1].forEach(s => {
      const px = s * (door.width / 4 + 0.05), pw = door.width / 2 - 0.9;
      [[2.3, 3.2], [6.1, 3.6]].forEach(([y, ph]) => {
        box(g, goldDeep, pw, 0.1, 0.08, px, y + ph / 2, HALL.minZ + 0.24); box(g, goldDeep, pw, 0.1, 0.08, px, y - ph / 2, HALL.minZ + 0.24);
        box(g, goldDeep, 0.1, ph, 0.08, px - pw / 2, y, HALL.minZ + 0.24); box(g, goldDeep, 0.1, ph, 0.08, px + pw / 2, y, HALL.minZ + 0.24);
      });
      box(g, gold, 0.16, 0.9, 0.2, s * 0.55, 4.3, HALL.minZ + 0.32);
    });
    const north = makeSign({ w: 8, h: 1.9, title: 'NORTH WING', sub: 'opening soon', fg: '#f3d27a', bg: '#1b1230', border: '#d4a843', subColor: '#f3e8c9' });
    north.position.set(0, 11.6, HALL.minZ + 0.06); g.add(north);
    solid(zone, 0, HALL.minZ + 0.5, door.width + 1.2, 0.8);                       // you stop in front of the doors, not inside their frame
    [-1, 1].forEach(s => box(g, gold, 0.14, 1.0, 0.14, s * 3.9, 0.5, HALL.minZ + 1.6));
    box(g, lambert(0x8a1530), 7.8, 0.1, 0.1, 0, 0.82, HALL.minZ + 1.6);

    // the way out
    [-1, 1].forEach(s => box(g, 'wood', 1.7, 6.4, 0.2, s * 0.9, 3.2, HALL.maxZ - 0.1));
    [-1, 1].forEach(s => box(g, gold, 0.4, 6.8, 0.4, s * 2.1, 3.4, HALL.maxZ - 0.2)); box(g, gold, 4.6, 0.4, 0.4, 0, 6.6, HALL.maxZ - 0.2);
    solid(zone, 0, HALL.maxZ - 0.5, 5.2, 0.8);                                    // the same at the way out
    const exit = makeSign({ w: 2.8, h: 0.8, title: 'EXIT', fg: '#7dffa8', bg: '#0c2a18', border: '#52f08f' });
    exit.rotation.y = Math.PI; exit.position.set(0, 7.5, HALL.maxZ - 0.06); g.add(exit);
    const title = makeSign({ w: 11, h: 2.0, title: 'PRIME TIME CASINO', sub: 'welcome. factor it. solve it. win it.', fg: '#f3d27a', bg: '#1b1230', border: '#d4a843', subColor: '#f3e8c9' });
    title.rotation.y = Math.PI; title.position.set(0, 10.4, HALL.maxZ - 0.06); g.add(title);

    // topiary in the corners of the hall
    [[-14, 12], [14, 12], [-14, -12], [14, -12]].forEach(([x, z]) => topiary(zone, H, x, z));

    // the chandelier, hung over the fountain
    addChandelier(zone, H, FOUNTAIN.x, FOUNTAIN.z, { ceilingY: HH, scale: 1, lights: true });

    /* ===== the wings ===== */
    const wingStyle = {
      factoring: { carpet: 'carpet', lightColor: 0xffd9a8, sofa: 0x7a1530, bg: '#2a0d14', sub: 'break numbers into pieces' },
      graphing: { carpet: 'carpetBlue', lightColor: 0xd7e4ff, sofa: 0x1f3f8a, bg: '#0d1d3a', sub: 'plot it. sketch it. see it.' },
    };
    Object.entries(WINGS).forEach(([id, wing]) => {
      const side = wing.side, st = wingStyle[id], cx = (wing.minX + wing.maxX) / 2, WH = WING.height;
      const wallCx = side * 30.5;                                                         // the long walls run from the hall wall to the end wall
      flat(g, st.carpet, WING.length, WING.depth, cx, 0, 0);
      box(g, 'ceilingCream', 29, 0.3, 23, wallCx, WH + 0.15, 0);
      slab(wallCx, -(wing.maxZ + WALL / 2), 29, WALL, { h: WH, lower: 'wood', lowerH: 1.4 });
      slab(wallCx, wing.maxZ + WALL / 2, 29, WALL, { h: WH, lower: 'wood', lowerH: 1.4 });
      slab(side * (Math.abs(side < 0 ? wing.minX : wing.maxX) + WALL / 2), 0, WALL, 23, { h: WH, lower: 'wood', lowerH: 1.4 });
      // gold crown molding, and beams with lights between them
      [-1, 1].forEach(s => box(g, gold, 28.6, 0.28, 0.14, wallCx + side * 0.2, WH - 0.4, s * (wing.maxZ - 0.07)));
      box(g, gold, 0.14, 0.28, 22, side * (Math.abs(side < 0 ? wing.minX : wing.maxX) - 0.07), WH - 0.4, 0);
      [24.5, 30.5, 36.5].forEach(ax => box(g, goldDeep, 0.5, 0.5, 22, side * ax, WH - 0.25, 0));
      [27.5, 33.5].forEach(ax => [-5.5, 5.5].forEach(z => box(g, glow(0xfff0c8), 3.4, 0.06, 3.0, side * ax, WH - 0.03, z)));
      light(st.lightColor, 0.5, 30, side * 24, 8, 0); light(st.lightColor, 0.5, 30, side * 37, 8, 0);
      addChandelier(zone, H, side * 30.5, 4, { ceilingY: WH, scale: 0.55, lights: false });
      // the wing's name on the end wall, facing the archway
      const nameSign = makeSign({ w: 12, h: 2.8, title: `${wing.name} WING`, sub: st.sub, fg: '#f3d27a', bg: st.bg, border: '#d4a843', subColor: '#f3e8c9' });
      nameSign.rotation.y = -side * Math.PI / 2; nameSign.position.set(side * (Math.abs(side < 0 ? wing.minX : wing.maxX) - 0.05), 7.0, 0); g.add(nameSign);
      // lounge seating along the south wall, and topiary in the far corners
      [-1, 0, 1].forEach(k => addSofa(zone, H, wallCx + k * 8.5, 9.8, st.sofa));
      [-1, 1].forEach(s => topiary(zone, H, side * 43.2, s * 9.8));
    });

    /* ===== the tables, sorted by the kind of question ===== */
    const T_ = TABLES;
    buildTable(zone, T_.practice.x, T_.practice.z, 'felt', 'PRACTICE TABLE', 'live product. 10 to 50 chips.', '#52f08f', () => actions.openTable('practice'));
    buildTable(zone, T_.radical.x, T_.radical.z, 'feltBlue', 'RADICAL TABLE', 'factor, pair up, simplify', '#38e8ff', () => actions.openTable('radical'), { prop: 'sqrt', accent: 0x38e8ff });
    buildTable(zone, T_.trinomial.x, T_.trinomial.z, 'feltRed', 'TRINOMIAL TABLE', 'split the middle. pick a level.', '#ff6a6a', () => actions.openTable('trinomial'), { prop: 'quadratic', accent: 0xff6a6a });
    buildTable(zone, T_.parabola.x, T_.parabola.z, 'feltPurple', 'PARABOLA TABLE', 'axis. vertex. sketch it.', '#d58bff', () => actions.openTable('parabola'), { prop: 'parabola', accent: 0xd58bff });
    buildTable(zone, T_.vertex.x, T_.vertex.z, 'feltGold', 'VERTEX TABLE', 'vertex form. sketch it.', '#ffb347', () => actions.openTable('vertex'), { prop: 'vertexform', accent: 0xffb347 });

    // a picture over each table that shows the kind of question it asks
    const art = [[T_.practice, artFactorTree], [T_.radical, artRadical], [T_.trinomial, artTrinomial],
      [T_.parabola, artGraph('STANDARD FORM', 'y = x\u00b2 \u2212 4x + 3', x => x * x - 4 * x + 3, [-1, 5], [-2, 5], [[2, -1, true], [1, 0], [3, 0], [0, 3]])],
      [T_.vertex, artGraph('VERTEX FORM', 'y = \u2212(x + 1)\u00b2 + 4', x => -((x + 1) ** 2) + 4, [-4, 2], [-3, 5], [[-1, 4, true], [-3, 0], [1, 0]])]];
    art.forEach(([pos, painter]) => { const p = textPlane(5.8, 3.6, painter, 72); p.position.set(pos.x, 6.4, -10.95); g.add(p); });

    // the prompts that are not tables come after the tables in the list: the way out, then the closed north doors
    interact(zone, 0, 12.4, 1.8, 'Leave the Casino', actions.leaveCasino);
    interact(zone, 0, HALL.minZ + 2.0, 2.4, 'Look at the north doors', () => UI.toast('The North Wing is still being built. Come back soon!'));

    spawnNPCs(zone, 3);

    // what the tests and the next wing need to know
    zone.casino = { HALL, WING, ARCH, WINGS, NORTH_WING, FOUNTAIN, TABLES };
    return zone;
  }

  /* ---------- pieces ---------- */
  /** A big round fountain: a marble rim, a tiered basin, and 37 jets that rise and fall in a slowly changing wave. */
  function addGrandFountain(zone, H, x, z, R) {
    const { box, lambert, waterSurface, solid } = H;
    const g = zone.group, gold = lambert(GOLD);
    const marble = Tex.mat('marble', 6, 2);
    // the rim: 28 marble blocks in a ring, capped in gold
    const n = 28, len = 2 * Math.PI * R / n + 0.08;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, px = x + R * Math.cos(a), pz = z + R * Math.sin(a);
      const m = box(g, 'marble', len, 0.9, 0.8, px, 0.45, pz); m.rotation.y = -a - Math.PI / 2;
      const cap = box(g, gold, len + 0.04, 0.08, 0.9, px, 0.94, pz); cap.rotation.y = m.rotation.y;
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R - 0.4, 40), lambert(0x1c5f8a)); floor.rotation.x = -Math.PI / 2; floor.position.set(x, 0.06, z); g.add(floor);
    const water = [];
    const pool = (radius, y) => {
      const ws = waterSurface(1, 1);
      ws.mesh.geometry = new THREE.CircleGeometry(radius, 40);
      ws.tex.repeat.set(radius, radius);
      ws.mesh.position.set(x, y, z); g.add(ws.mesh); water.push(ws);
    };
    pool(R - 0.75, 0.62);
    // the first tier, a wide marble drum with a gold ring and its own water
    const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.6, 1.5, 28), marble); tier1.position.set(x, 0.75, z); g.add(tier1);
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.3, 40), gold); ring1.rotation.x = -Math.PI / 2; ring1.position.set(x, 1.52, z); g.add(ring1);
    pool(3.0, 1.54);
    // the pedestal and the bowl on top
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.8, 20), marble); ped.position.set(x, 2.4, z); g.add(ped);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 0.9, 0.5, 24), marble); bowl.position.set(x, 3.55, z); g.add(bowl);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.95, 32), gold); ring2.rotation.x = -Math.PI / 2; ring2.position.set(x, 3.82, z); g.add(ring2);
    pool(1.7, 3.83);

    // the jets: one tall in the middle, rings of them on the bowl, the first tier and the pool
    const colGeo = new THREE.BoxGeometry(1, 1, 1); colGeo.translate(0, 0.5, 0);
    const colMat = new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.8 });
    const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
    const jets = [];
    const addJet = (jx, jy, jz, o) => {
      const pivot = new THREE.Group(); pivot.position.set(jx, jy, jz);
      if (o.lean) {                                              // tilt the top toward (or away from) the middle of the fountain
        const dx = x - jx, dz = z - jz, len = Math.hypot(dx, dz) || 1;
        pivot.quaternion.setFromAxisAngle(new THREE.Vector3(dz / len, 0, -dx / len), o.lean);
      }
      const col = new THREE.Mesh(colGeo, colMat); col.scale.set(o.w, 1, o.w);
      const puff = new THREE.Mesh(new THREE.BoxGeometry(o.w * 2.4, o.w * 1.7, o.w * 2.4), puffMat);
      pivot.add(col, puff); g.add(pivot);
      jets.push({ col, puff, base: o.base, amp: o.amp, speed: o.speed, ring: o.ring, i: o.i, n: o.n });
    };
    addJet(x, 3.83, z, { w: 0.4, base: 1.5, amp: 2.0, speed: 1.1, ring: 0, i: 0, n: 1 });     // tops out at 7.3 blocks, well under the chandelier
    const rings = [[8, 1.2, 3.83, 0.8, 1.0, -0.3, 1.7, 1], [12, 2.45, 1.54, 1.0, 1.4, -0.35, 1.5, 2], [16, 4.35, 0.62, 0.8, 1.3, 0.45, 1.3, 3]];
    rings.forEach(([cnt, r, y, base, amp, lean, speed, ringId]) => {
      for (let i = 0; i < cnt; i++) {
        const a = i / cnt * Math.PI * 2;
        addJet(x + r * Math.cos(a), y, z + r * Math.sin(a), { w: 0.2, base, amp, lean, speed, ring: ringId, i, n: cnt });
      }
    });
    const place = t => jets.forEach(j => {
      const phase = j.n > 1 ? j.i / j.n * Math.PI * 2 * (2 + Math.sin(t * 0.1)) + j.ring : 0;      // the wave round each ring slowly changes shape
      const h = j.base + j.amp * (0.5 + 0.5 * Math.sin(t * j.speed + phase));
      j.col.scale.y = h; j.puff.position.y = h; j.puff.rotation.y = t * 2 + j.i;
    });
    place(0);
    zone.animated.push((dt, t) => { place(t); water.forEach((ws, k) => ws.tex.offset.set(t * 0.03 * (k % 2 ? -1 : 1), t * 0.015)); });
    zone.fountainJets = jets;

    // a cool light on the water, and the solid part: thin slices that follow the circle
    const lt = new THREE.PointLight(0xbfe6ff, 0.5, 16); lt.position.set(x, 2.0, z); g.add(lt);
    const count = Math.ceil(2 * R / 0.6), slice = 2 * R / count;           // an exact number of slices, so none is left over at the edge
    for (let i = 0; i < count; i++) {
      const mid = -R + (i + 0.5) * slice, half = Math.sqrt(R * R - mid * mid);
      solid(zone, x + mid, z, slice, 2 * half);
    }
  }

  /** A crystal chandelier: gold rings and spokes, rings of little lamps, and glass drops that twinkle. */
  function addChandelier(zone, H, x, z, { ceilingY, scale: k = 1, lights = true }) {
    const { lambert } = H;
    const g = new THREE.Group(); g.position.set(x, 0, z); zone.group.add(g);
    const topY = ceilingY - 0.1;
    const tiers = [{ r: 4.2 * k, y: topY - 3.6 * k, n: 24 }, { r: 3.0 * k, y: topY - 4.5 * k, n: 20 }, { r: 1.8 * k, y: topY - 5.3 * k, n: 14 }];
    const goldMat = lambert(GOLD);
    const stemTop = topY - 3.4 * k, stemBot = topY - 6.0 * k;
    const parts = [{ x: 0, y: (topY + stemTop) / 2, z: 0, sx: 0.12 * k, sy: topY - stemTop, sz: 0.12 * k },                       // the chain
      { x: 0, y: (stemTop + stemBot) / 2, z: 0, sx: 0.35 * k, sy: stemTop - stemBot, sz: 0.35 * k }];                               // the stem
    const bulbs = [], drops = [[], []];
    tiers.forEach((t, ti) => {
      for (let i = 0; i < t.n; i++) {
        const a = i / t.n * Math.PI * 2, cxp = t.r * Math.cos(a), czp = t.r * Math.sin(a);
        parts.push({ x: cxp, y: t.y, z: czp, sx: 2 * Math.PI * t.r / t.n * 1.05, sy: 0.18 * k, sz: 0.2 * k, ry: -a - Math.PI / 2 });         // a piece of the ring
        bulbs.push({ x: cxp, y: t.y + 0.3 * k, z: czp, sx: 0.2 * k, sy: 0.36 * k, sz: 0.2 * k });
        const len = (i % 2 ? 0.55 : 0.9) * k * (1 + ti * 0.15);
        drops[i % 2].push({ x: cxp, y: t.y - 0.12 * k - len / 2, z: czp, sx: 0.22 * k, sy: len, sz: 0.22 * k });
      }
      for (let s = 0; s < 8; s++) {                                                                                            // spokes from the stem to the ring
        const a = s / 8 * Math.PI * 2;
        parts.push({ x: t.r / 2 * Math.cos(a), y: t.y, z: t.r / 2 * Math.sin(a), sx: t.r, sy: 0.14 * k, sz: 0.14 * k, ry: -a });
      }
    });
    drops[0].push({ x: 0, y: stemBot - 0.8 * k, z: 0, sx: 0.4 * k, sy: 1.8 * k, sz: 0.4 * k });                                     // the big drop at the bottom
    g.add(instanced(new THREE.BoxGeometry(1, 1, 1), goldMat, parts));
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * k, 0.8 * k, 0.5 * k, 14), goldMat); crown.position.y = stemTop; g.add(crown);
    g.add(instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xfff0b8 }), bulbs));
    const dropA = new THREE.MeshBasicMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.8 }), dropB = new THREE.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: 0.8 });
    const oct = new THREE.OctahedronGeometry(0.5);
    g.add(instanced(oct, dropA, drops[0]), instanced(oct, dropB, drops[1]));
    zone.animated.push((dt, t) => {
      g.rotation.y += dt * 0.12;
      dropA.opacity = 0.62 + 0.3 * Math.sin(t * 2.6); dropB.opacity = 0.62 + 0.3 * Math.sin(t * 2.6 + Math.PI);
    });
    if (lights) {
      const warm = new THREE.PointLight(0xfff0d0, 0.55, 70); warm.position.set(x, topY - 6.4 * k, z); zone.group.add(warm);
      const high = new THREE.PointLight(0xffe2b0, 0.3, 50); high.position.set(x, topY - 2.0 * k, z); zone.group.add(high);
    }
    zone.chandeliers = zone.chandeliers || [];
    zone.chandeliers.push({ x, z, ceilingY, scale: k, group: g });
  }

  /** A plush sofa against the south wall, facing north. It is solid. */
  function addSofa(zone, H, x, z, color) {
    const { box, lambert, solid } = H;
    const g = zone.group, velvet = lambert(color), wood = lambert(0x3a2418), gold = lambert(GOLD);
    box(g, wood, 3.4, 0.25, 1.4, x, 0.12, z);
    box(g, velvet, 3.2, 0.45, 1.2, x, 0.5, z - 0.05);
    box(g, velvet, 3.2, 1.0, 0.35, x, 1.2, z + 0.55);
    [-1, 1].forEach(s => box(g, velvet, 0.3, 0.85, 1.3, x + s * 1.65, 0.65, z));
    box(g, gold, 3.5, 0.08, 0.1, x, 1.72, z + 0.62);
    solid(zone, x, z, 3.6, 1.5);
  }

  /** A clipped round bush in a stone pot. It is solid. */
  function topiary(zone, H, x, z) {
    const { box, lambert, solid } = H;
    const g = zone.group;
    box(g, 'marble', 1.3, 0.7, 1.3, x, 0.35, z); box(g, lambert(GOLD), 1.4, 0.12, 1.4, x, 0.74, z);
    box(g, 'leaves', 1.15, 1.1, 1.15, x, 1.4, z); box(g, 'leaves', 0.85, 0.8, 0.85, x, 2.3, z); box(g, 'leaves', 0.45, 0.45, 0.45, x, 2.95, z);
    solid(zone, x, z, 1.3, 1.3);
  }

  return { BUILD, WALL, HALL, WING, ARCH, WINGS, NORTH_WING, FOUNTAIN, TABLES, SPAWN, build };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CasinoInterior;
