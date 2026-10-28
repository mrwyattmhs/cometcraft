/* The casino inside: a grand entrance hall, a Factoring wing on the left, a Graphing wing on the right, and a Polynomials wing to the north. (The building outside is in world.js and is not touched.)

   You come in through the south door facing north. The hall is a big tiled room with a ceiling 16 blocks up, a dancing fountain
   under a glass sculpture in the style of Chihuly's Fiori di Como, and a tall marble archway in each side wall. The tables are sorted by what kind of question they ask:

     Factoring wing (west, left):   Practice table, Radical table, Trinomial table, and in a second row the Cubes table (sums and differences of cubes)
     Graphing wing  (east, right):  Lines table, Parabola table (standard form), Vertex table (vertex form), and in a second row the Polynomial Coaster table
     Polynomials wing (north):      Multiply table and Add/Sub table, through an archway in the hall's north wall

   Each wing is 28 x 22, a little smaller than the 30 x 24 Arithmetic Academy. Coordinates: x grows east, z grows south, so you walk
   north (toward -z) from the door. The numbers that other code and the tests rely on are exported at the bottom. */
const CasinoInterior = (() => {
  const BUILD = 36; // bump together with the ?v= numbers in index.html

  /* ---------- the plan ---------- */
  const WALL = 0.5;                                                        // wall thickness
  const HALL = { minX: -16, maxX: 16, minZ: -14, maxZ: 14, height: 16 };    // the inside of the entrance hall
  const WING = { length: 28, depth: 22, height: 10 };                       // inside each wing
  const ARCH = { halfWidth: 4.5, height: 7.5 };                             // the opening between the hall and a wing
  const WINGS = {
    factoring: { side: -1, name: 'FACTORING', minX: -44.5, maxX: -16.5, minZ: -11, maxZ: 11 },
    graphing: { side: 1, name: 'GRAPHING', minX: 16.5, maxX: 44.5, minZ: -11, maxZ: 11 },
  };
  /** The third wing, the same size as the others, straight north of the hall: the Polynomials wing. You go in through an archway in the hall's north wall (the same size as the side arches). */
  const NORTH_WING = { name: 'POLYNOMIALS', minX: -14, maxX: 14, minZ: -36.5, maxZ: -14.5, door: { x: 0, z: -14, width: 2 * ARCH.halfWidth, height: ARCH.height } };
  const FOUNTAIN = { x: 0, z: -1, radius: 5.4 };
  const TABLES = {
    practice: { x: -24, z: -5 }, radical: { x: -31.5, z: -5 }, trinomial: { x: -39, z: -5 },
    lines: { x: 24, z: -5 }, parabola: { x: 31.5, z: -5 }, vertex: { x: 39, z: -5 },
    coaster: { x: 39, z: 5.2 },                       // the Polynomial Coaster table: a second row, on the south side of the Graphing wing, facing north
    cubes: { x: -39, z: 5.2 },                        // the Cubes table: a second row on the south side of the Factoring wing, facing north (the mirror of the coaster table)
    polymul: { x: -6, z: -30.5 }, polyadd: { x: 6, z: -30.5 },   // the Polynomials wing: a row of two along the north end wall, six blocks in front of it (as the other wings' first rows are)
  };
  const SPAWN = { x: 0, z: 10.5, yaw: 0 };
  /** A little wedding chapel in the middle of the Graphing wing's south wall: ivory doors under a gilded arch with a sign over them, a red rope hung
      across in front, and the ceremony sign on its stand to one side. (The sofa that stood there is gone.) */
  const CHAPEL = { x: 30.75, wallZ: 11, doorW: 4, doorH: 5.2, ropeZ: 9.0, ropeHalf: 2.5, stand: { x: 26.2, z: 9.5 } };
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
  /** The same line, y = 2x + 1, in all three forms, beside its graph. */
  function artLines(c, cv) {
    frame(c, cv, 'ONE LINE, THREE FORMS');
    const W = cv.width, H = cv.height, L = W * 0.07, R = W * 0.42, Tp = H * 0.24, B = H * 0.9, xr = [-3, 3], yr = [-3, 5];
    const px = x => L + (x - xr[0]) / (xr[1] - xr[0]) * (R - L), py = y => B - (y - yr[0]) / (yr[1] - yr[0]) * (B - Tp);
    c.strokeStyle = 'rgba(143,160,208,.28)'; c.lineWidth = 1;
    for (let x = xr[0]; x <= xr[1]; x++) { c.beginPath(); c.moveTo(px(x), Tp); c.lineTo(px(x), B); c.stroke(); }
    for (let y = yr[0]; y <= yr[1]; y++) { c.beginPath(); c.moveTo(L, py(y)); c.lineTo(R, py(y)); c.stroke(); }
    c.strokeStyle = '#8fa0d0'; c.lineWidth = 3; c.beginPath(); c.moveTo(px(0), Tp); c.lineTo(px(0), B); c.moveTo(L, py(0)); c.lineTo(R, py(0)); c.stroke();
    c.strokeStyle = '#f3d27a'; c.lineWidth = 4; c.beginPath(); c.moveTo(px(-2), py(-3)); c.lineTo(px(2), py(5)); c.stroke();
    [[0, 1], [1, 3]].forEach(([x, y]) => { c.beginPath(); c.arc(px(x), py(y), H * 0.024, 0, Math.PI * 2); c.fillStyle = '#52f08f'; c.fill(); });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    [['y = 2x + 1', '#f3e8c9', 0.34], ['y \u2212 3 = 2(x \u2212 1)', '#8fd8ff', 0.57], ['2x \u2212 y = \u22121', '#ff9a9a', 0.8]].forEach(([t, col, fy]) => { c.fillStyle = col; c.font = serif(H * 0.105); c.fillText(t, W * 0.72, H * fy); });
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
  function artPolyMul(c, cv) {
    frame(c, cv, 'MULTIPLY');
    const W = cv.width, H = cv.height;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#f3e8c9'; c.font = serif(H * 0.14); c.fillText('(x + 3)(x + 5)', W / 2, H * 0.3);
    c.fillStyle = '#d9b8ff'; c.font = serif(H * 0.1); c.fillText('x\u00b2 + 5x + 3x + 15', W / 2, H * 0.52);
    c.fillStyle = '#f3d27a'; c.font = serif(H * 0.14); c.fillText('x\u00b2 + 8x + 15', W / 2, H * 0.74);
    c.fillStyle = '#9fe6c9'; c.font = serif(H * 0.065); c.fillText('combine like terms', W / 2, H * 0.89);
  }
  function artPolyAdd(c, cv) {
    frame(c, cv, 'ADD AND SUBTRACT');
    const W = cv.width, H = cv.height;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#f3e8c9'; c.font = serif(H * 0.105); c.fillText('(3x\u00b2 + 2x) \u2212 (x\u00b2 \u2212 5x + 4)', W / 2, H * 0.3);
    c.fillStyle = '#9fe6c9'; c.font = serif(H * 0.1); c.fillText('3x\u00b2 + 2x \u2212 x\u00b2 + 5x \u2212 4', W / 2, H * 0.52);
    c.fillStyle = '#f3d27a'; c.font = serif(H * 0.14); c.fillText('2x\u00b2 + 7x \u2212 4', W / 2, H * 0.74);
    c.fillStyle = '#d9b8ff'; c.font = serif(H * 0.065); c.fillText('distribute the minus. combine like terms', W / 2, H * 0.89);
  }
  function artCubes(c, cv) {
    frame(c, cv, 'SUM OF CUBES');
    const W = cv.width, H = cv.height;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#f3e8c9'; c.font = serif(H * 0.15); c.fillText('x\u00b3 + 27', W / 2, H * 0.33);
    c.fillStyle = '#d9b8ff'; c.font = serif(H * 0.088); c.fillText('a\u00b3 + b\u00b3 = (a + b)(a\u00b2 \u2212 ab + b\u00b2)', W / 2, H * 0.55);
    c.fillStyle = '#f3d27a'; c.font = serif(H * 0.14); c.fillText('(x + 3)(x\u00b2 \u2212 3x + 9)', W / 2, H * 0.78);
  }
  /** The coaster table's picture: f(x) = (x + 2)(x - 1)^2 as a minecart track (iron rails on oak ties), passing through at x = -2 and bouncing at x = 1. */
  function artCoaster(c, cv) {
    frame(c, cv, 'POLYNOMIAL COASTER');
    const W = cv.width, H = cv.height, L = W * 0.12, R = W * 0.88, Tp = H * 0.24, B = H * 0.9, xr = [-3, 2.5], yr = [-6, 6];
    const px = x => L + (x - xr[0]) / (xr[1] - xr[0]) * (R - L), py = y => B - (y - yr[0]) / (yr[1] - yr[0]) * (B - Tp), f = x => (x + 2) * (x - 1) * (x - 1);
    c.strokeStyle = 'rgba(143,160,208,.22)'; c.lineWidth = 1;
    for (let x = -3; x <= 2; x++) { c.beginPath(); c.moveTo(px(x), Tp); c.lineTo(px(x), B); c.stroke(); }
    c.strokeStyle = '#8fa0d0'; c.lineWidth = 3; c.beginPath(); c.moveTo(L, py(0)); c.lineTo(R, py(0)); c.moveTo(px(0), Tp); c.lineTo(px(0), B); c.stroke();
    const track = () => { c.beginPath(); let go = false; for (let i = 0; i <= 90; i++) { const x = xr[0] + (xr[1] - xr[0]) * i / 90, y = f(x); if (y < yr[0] || y > yr[1]) { go = false; continue; } if (!go) { c.moveTo(px(x), py(y)); go = true; } else c.lineTo(px(x), py(y)); } c.stroke(); };
    c.setLineDash([H * 0.02, H * 0.028]); c.strokeStyle = '#8a5a2c'; c.lineWidth = H * 0.05; track();      // the ties
    c.setLineDash([]); c.strokeStyle = '#d3d6dc'; c.lineWidth = H * 0.016; track();                       // the rail
    [[-2, 'pass'], [1, 'bounce']].forEach(([x, w]) => {
      c.fillStyle = w === 'pass' ? '#35b46a' : '#d9a21b'; c.fillRect(px(x) - H * 0.026, py(0) - H * 0.026, H * 0.052, H * 0.052);
      c.fillStyle = '#f3e8c9'; c.font = `${Math.round(H * 0.055)}px Silkscreen, "Courier New", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(w, px(x), py(0) + H * 0.085);
    });
    c.fillStyle = '#f3e8c9'; c.font = serif(H * 0.085); c.textAlign = 'left'; c.fillText('f(x) = (x + 2)(x \u2212 1)\u00b2', W * 0.14, H * 0.2); c.textAlign = 'center';
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

  /** The font for script lettering at a size: the calligraphy font (Great Vibes) if it really loaded, otherwise an italic serif.
      (A font that failed to load quietly falls back to something plain, so it is detected by measuring: the two only differ in width if the font is there.) */
  function scriptFont(c, size) {
    c.font = '40px "Great Vibes", monospace'; const withScript = c.measureText('Winters & Wyatt Wedding').width;
    c.font = '40px monospace'; const without = c.measureText('Winters & Wyatt Wedding').width;
    return Math.abs(withScript - without) > 0.5 ? `${size}px "Great Vibes", cursive` : `italic ${size}px Georgia, "Times New Roman", serif`;
  }

  /** The ceremony card: flowers across the top, then the names in script. */
  function paintWeddingCard(c, cv) {
    const W = cv.width, H = cv.height, bh = H * 0.31;
    c.fillStyle = '#f7f5f2'; c.fillRect(0, 0, W, H);
    c.save(); c.beginPath(); c.rect(0, 0, W, bh); c.clip();
    c.fillStyle = '#3f5a2c'; c.fillRect(0, 0, W, bh);
    const blob = (x, y, rx, ry, col, rot = 0) => { c.save(); c.translate(x * W, y * bh); c.rotate(rot); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, rx * W, ry * bh, 0, 0, Math.PI * 2); c.fill(); c.restore(); };
    [[0.04, 0.5, 0.1, 0.45, '#6f8a37', 0.3], [0.12, 0.8, 0.09, 0.3, '#2c4520', -0.4], [0.2, 0.35, 0.07, 0.3, '#86a043', 0.8], [0.3, 0.7, 0.08, 0.35, '#34502a', 0.2], [0.93, 0.2, 0.09, 0.35, '#5a7a30', 0.5]].forEach(a => blob(...a));
    [[0.34, 0.55, 0.14, 0.6, '#7d1b57', -0.5], [0.46, 0.2, 0.1, 0.5, '#b4246f', 0.9], [0.76, 0.45, 0.12, 0.55, '#a02466', 0.6], [0.6, 0.9, 0.12, 0.4, '#8c1d52', 0]].forEach(a => blob(...a));    // the calla lilies
    const rose = (x, y, r, a, b, d) => [[r, a], [r * 0.72, b], [r * 0.46, d], [r * 0.22, a]].forEach(([rr, col]) => { c.fillStyle = col; c.beginPath(); c.arc(x * W, y * bh, rr, 0, Math.PI * 2); c.fill(); });
    rose(0.56, 0.45, bh * 0.52, '#7b0f1d', '#c4162a', '#8c1020');                                                   // red roses
    rose(0.68, 0.7, bh * 0.36, '#6a0a18', '#b01226', '#7b0f1d');
    rose(0.9, 0.5, bh * 0.5, '#aab446', '#cbd36a', '#b6c04f');                                                      // a lime-green rose
    c.restore();
    c.strokeStyle = '#c7c9d1'; c.lineWidth = 2;
    for (const off of [0, 3]) { c.beginPath(); for (let x = 0; x <= W; x += 4) c.lineTo(x, bh + H * 0.035 + off + Math.sin(x / 22 + off) * 2.5); c.stroke(); }          // the thin wavy line under the flowers
    c.fillStyle = '#1b2a3a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = scriptFont(c, Math.round(H * 0.19));
    c.fillText('Winters & Wyatt', W / 2, H * 0.57);
    c.fillText('Wedding Ceremony', W / 2, H * 0.8);
  }

  /* ---------- the build ---------- */
  function build(actions, H) {
    const { box, flat, lambert, glow, textPlane, makeSign, solid, interact, createZone, buildTable, spawnNPCs, waterSurface } = H;
    const zone = createZone('Prime Time Casino', {
      spawn: SPAWN,
      bounds: { minX: -45.4, maxX: 45.4, minZ: -36.0, maxZ: 14.9 },
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
    {                                                                                           // north wall: an archway to the Polynomials wing, framed like the side ones
      const nz = HALL.minZ - WALL / 2, arm = (hw + 1) / 2 - ARCH.halfWidth;
      [-1, 1].forEach(s => slab(s * (ARCH.halfWidth + arm / 2), nz, arm, WALL, { h: HH, lower: 'marbleDark', lowerH: 3 }));
      box(g, 'wallGild', 2 * ARCH.halfWidth, HH - ARCH.height, WALL, 0, ARCH.height + (HH - ARCH.height) / 2, nz);       // the wall above the archway
      [-1, 1].forEach(s => box(g, gold, 0.5, ARCH.height, 0.8, s * (ARCH.halfWidth + 0.25), ARCH.height / 2, nz));
      box(g, gold, 2 * ARCH.halfWidth + 1, 0.5, 0.8, 0, ARCH.height + 0.25, nz);
      box(g, goldDeep, 2 * ARCH.halfWidth + 1.2, 0.2, 0.9, 0, ARCH.height + 0.62, nz);
      decal(lambert(0xe9e0cc), 2 * ARCH.halfWidth, WALL, 0, 0.012, nz);                                                  // a marble threshold in the doorway
    }
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
    flat(g, 'carpet', 4.6, 7.6, 0, 0.04, 10.0);                                  // starts clear of the rings round the fountain (4 cm above the marble, and its gold edges 3 cm above it)
    [-1, 1].forEach(s => decal(inlay, 0.2, 7.6, s * 2.4, 0.07, 10.0));

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
    mural.rotation.x = Math.PI / 2; mural.position.set(0, HH - 0.06, 0); g.add(mural);          // 6 cm under the ceiling: far enough that even a low-precision depth buffer cannot mix them up
    [-12, 12].forEach(x => box(g, gold, 0.6, 0.5, hd, x, HH - 0.25, 0));
    [-10, 10].forEach(z => box(g, gold, hw, 0.5, 0.6, 0, HH - 0.25, z));

    // sconces on the long walls
    [-1, 1].forEach(side => [-12, -8, 8, 12].forEach(z => {
      box(g, gold, 0.16, 0.9, 0.5, side * (HALL.maxX - 0.08), 4.6, z);
      box(g, glow(0xfff0b8), 0.1, 0.55, 0.26, side * (HALL.maxX - 0.2), 4.7, z);
    }));
    [-8, 8].forEach(x => { box(g, gold, 0.5, 0.9, 0.16, x, 4.6, HALL.minZ + 0.08); box(g, glow(0xfff0b8), 0.26, 0.55, 0.1, x, 4.7, HALL.minZ + 0.2); });

    // wing signs over the archways, facing the hall
    [['factoring', '#2a0d14', 'practice. radicals. trinomials. cubes.'], ['graphing', '#0d1d3a', 'lines and parabolas.']].forEach(([id, bg, sub]) => {
      const w = WINGS[id], sign = makeSign({ w: 9, h: 2.2, title: w.name, sub, fg: '#f3d27a', bg, border: '#d4a843', subColor: '#f3e8c9' });
      sign.rotation.y = -w.side * Math.PI / 2; sign.position.set(w.side * (HALL.maxX - 0.05), 9.9, 0); g.add(sign);
    });

    // the wing's sign over the north archway, facing the hall (the side wings' signs are above)
    { const sign = makeSign({ w: 9, h: 2.2, title: NORTH_WING.name, sub: 'multiply. add. subtract.', fg: '#f3d27a', bg: '#0d2a1e', border: '#d4a843', subColor: '#f3e8c9' }); sign.position.set(0, 9.9, HALL.minZ + 0.05); g.add(sign); }

    // the way out
    [-1, 1].forEach(s => box(g, 'wood', 1.7, 6.4, 0.2, s * 0.9, 3.2, HALL.maxZ - 0.1));
    [-1, 1].forEach(s => box(g, gold, 0.4, 6.8, 0.4, s * 2.1, 3.4, HALL.maxZ - 0.2)); box(g, gold, 4.64, 0.44, 0.44, 0, 6.62, HALL.maxZ - 0.2);
    solid(zone, 0, HALL.maxZ - 0.5, 5.2, 0.8);                                    // the same at the way out
    const exit = makeSign({ w: 2.8, h: 0.8, title: 'EXIT', fg: '#7dffa8', bg: '#0c2a18', border: '#52f08f' });
    exit.rotation.y = Math.PI; exit.position.set(0, 7.5, HALL.maxZ - 0.06); g.add(exit);
    const title = makeSign({ w: 11, h: 2.0, title: 'PRIME TIME CASINO', sub: 'welcome. factor it. solve it. win it.', fg: '#f3d27a', bg: '#1b1230', border: '#d4a843', subColor: '#f3e8c9' });
    title.rotation.y = Math.PI; title.position.set(0, 10.4, HALL.maxZ - 0.06); g.add(title);

    // topiary in the corners of the hall
    [[-14, 12], [14, 12], [-14, -12], [14, -12]].forEach(([x, z]) => topiary(zone, H, x, z));

    // a glass sculpture in the style of Chihuly's Fiori di Como, over the fountain
    addGlassSculpture(zone, H, FOUNTAIN.x, FOUNTAIN.z, { ceilingY: HH });

    /* ===== the wings ===== */
    const wingStyle = {
      factoring: { carpet: 'carpet', lightColor: 0xffd9a8, sofa: 0x7a1530, bg: '#2a0d14', sub: 'break numbers into pieces' },
      graphing: { carpet: 'carpetBlue', lightColor: 0xd7e4ff, sofa: 0x1f3f8a, bg: '#0d1d3a', sub: 'plot it. sketch it. see it.' },
    };
    Object.entries(WINGS).forEach(([id, wing]) => {
      const side = wing.side, st = wingStyle[id], cx = (wing.minX + wing.maxX) / 2, WH = WING.height;
      const wallCx = side * 30.75, wallLen = 28.5;                                       // the long walls run from the OUTER face of the hall wall (16.5) to the end wall (45): they must not reach into the hall wall,
                                                                                         // or their ends would lie on the hall's wall and the two would flicker
      flat(g, st.carpet, WING.length, WING.depth, cx, 0, 0);
      box(g, 'ceilingCream', wallLen, 0.3, 23, wallCx, WH + 0.15, 0);
      slab(wallCx, -(wing.maxZ + WALL / 2), wallLen, WALL, { h: WH, lower: 'wood', lowerH: 1.4 });
      slab(wallCx, wing.maxZ + WALL / 2, wallLen, WALL, { h: WH, lower: 'wood', lowerH: 1.4 });
      slab(side * (Math.abs(side < 0 ? wing.minX : wing.maxX) + WALL / 2), 0, WALL, 23, { h: WH, lower: 'wood', lowerH: 1.4 });
      // gold crown molding, and beams with lights between them
      [-1, 1].forEach(s => box(g, gold, WING.length, 0.28, 0.14, side * 30.5, WH - 0.4, s * (wing.maxZ - 0.07)));
      box(g, gold, 0.14, 0.28, 22, side * (Math.abs(side < 0 ? wing.minX : wing.maxX) - 0.07), WH - 0.4, 0);
      [24.5, 30.5, 36.5].forEach(ax => box(g, goldDeep, 0.5, 0.5, 22, side * ax, WH - 0.25, 0));
      [27.5, 33.5].forEach(ax => [-5.5, 5.5].forEach(z => box(g, glow(0xfff0c8), 3.4, 0.06, 3.0, side * ax, WH - 0.03, z)));
      light(st.lightColor, 0.5, 30, side * 24, 8, 0); light(st.lightColor, 0.5, 30, side * 37, 8, 0);
      addChandelier(zone, H, side * 30.5, 4, { ceilingY: WH, scale: 0.55, lights: false });
      // the wing's name on the end wall, facing the archway
      const nameSign = makeSign({ w: 12, h: 2.8, title: `${wing.name} WING`, sub: st.sub, fg: '#f3d27a', bg: st.bg, border: '#d4a843', subColor: '#f3e8c9' });
      nameSign.rotation.y = -side * Math.PI / 2; nameSign.position.set(side * (Math.abs(side < 0 ? wing.minX : wing.maxX) - 0.05), 7.0, 0); g.add(nameSign);
      // lounge seating along the south wall, and topiary in the far corners
      [-1, 0, 1].forEach(k => { if (!(id === 'graphing' && k === 0)) addSofa(zone, H, wallCx + k * 8.5, 9.8, st.sofa); });      // (the middle one in the Graphing wing makes way for the chapel)
      if (id === 'graphing') addWeddingChapel(zone, H);
      [-1, 1].forEach(s => topiary(zone, H, side * 43.2, s * 9.8));
    });

    /* ===== the north wing: Polynomials (the same size as the others, 28 wide and 22 deep, laid out around the z axis) ===== */
    {
      const NW = NORTH_WING, WH = WING.height, ncz = (NW.minZ + NW.maxZ) / 2, wallZ0 = HALL.minZ - WALL, wallLen = wallZ0 - (NW.minZ - WALL);      // the side walls run from the OUTER face of the hall wall to the end wall
      const wallCz = (wallZ0 + (NW.minZ - WALL)) / 2, endZ = NW.minZ - WALL / 2, sideX = NW.maxX + WALL / 2;
      flat(g, 'carpetGreen', WING.length, WING.depth, 0, 0, ncz);
      box(g, 'ceilingCream', 29, 0.3, wallLen + 0.5, 0, WH + 0.15, wallCz);
      [-1, 1].forEach(s2 => slab(s2 * sideX, wallCz, WALL, wallLen, { h: WH, lower: 'wood', lowerH: 1.4 }));                    // the west and east walls
      slab(0, endZ, 2 * sideX + WALL, WALL, { h: WH, lower: 'wood', lowerH: 1.4 });                                             // the end wall
      // gold crown molding, and beams with lights between them
      [-1, 1].forEach(s2 => box(g, gold, 0.14, 0.28, 22, s2 * (NW.maxX - 0.07), WH - 0.4, ncz));
      box(g, gold, WING.length, 0.28, 0.14, 0, WH - 0.4, NW.minZ + 0.07);
      [-22.5, -28.5, -34.5].forEach(z => box(g, goldDeep, 28, 0.5, 0.5, 0, WH - 0.25, z));
      [-25.5, -31.5].forEach(z => [-5.5, 5.5].forEach(x => box(g, glow(0xfff0c8), 3.4, 0.06, 3.0, x, WH - 0.03, z)));
      light(0xd8ffe4, 0.5, 30, 0, 8, -22); light(0xd8ffe4, 0.5, 30, 0, 8, -32);
      addChandelier(zone, H, 0, -25.5, { ceilingY: WH, scale: 0.55, lights: false });
      // the wing's name, on both side walls, facing in (the end wall is for the tables' pictures)
      [-1, 1].forEach(s2 => {
        const nameSign = makeSign({ w: 9, h: 2.2, title: `${NW.name} WING`, sub: 'expand it. combine it.', fg: '#f3d27a', bg: '#0d2a1e', border: '#d4a843', subColor: '#f3e8c9' });
        nameSign.rotation.y = -s2 * Math.PI / 2; nameSign.position.set(s2 * (NW.maxX - 0.05), 6.6, -25.5); g.add(nameSign);
      });
      [-1, 1].forEach(s2 => { topiary(zone, H, s2 * 12.6, NW.minZ + 1.7); topiary(zone, H, s2 * 12.6, NW.maxZ - 1.7); });
    }

    /* ===== the tables, sorted by the kind of question ===== */
    const T_ = TABLES;
    buildTable(zone, T_.practice.x, T_.practice.z, 'felt', 'PRACTICE TABLE', 'live product. 10 to 50 chips.', '#52f08f', () => actions.openTable('practice'));
    buildTable(zone, T_.radical.x, T_.radical.z, 'feltBlue', 'RADICAL TABLE', 'factor, pair up, simplify', '#38e8ff', () => actions.openTable('radical'), { prop: 'sqrt', accent: 0x38e8ff });
    buildTable(zone, T_.trinomial.x, T_.trinomial.z, 'feltRed', 'TRINOMIAL TABLE', 'split the middle. pick a level.', '#ff6a6a', () => actions.openTable('trinomial'), { prop: 'quadratic', accent: 0xff6a6a });
    buildTable(zone, T_.lines.x, T_.lines.z, 'feltTeal', 'LINES TABLE', 'slope. points. intercepts.', '#4fe0c0', () => actions.openTable('lines'), { prop: 'linegraph', accent: 0x4fe0c0 });
    buildTable(zone, T_.parabola.x, T_.parabola.z, 'feltPurple', 'PARABOLA TABLE', 'axis. vertex. sketch it.', '#d58bff', () => actions.openTable('parabola'), { prop: 'parabola', accent: 0xd58bff });
    buildTable(zone, T_.vertex.x, T_.vertex.z, 'feltGold', 'VERTEX TABLE', 'vertex form. sketch it.', '#ffb347', () => actions.openTable('vertex'), { prop: 'vertexform', accent: 0xffb347, lesson: 'vertex' });

    buildTable(zone, T_.coaster.x, T_.coaster.z, 'feltIron', 'COASTER TABLE', 'ends. zeros. ride it.', '#ff9a3d', () => actions.openTable('coaster'), { prop: 'coaster', accent: 0xff8a3d, facing: -1 });
    buildTable(zone, T_.cubes.x, T_.cubes.z, 'feltPurple', 'CUBES TABLE', 'sum and difference of cubes', '#c78bff', () => actions.openTable('cubes'), { prop: 'cube', accent: 0xc78bff, facing: -1 });
    buildTable(zone, T_.polymul.x, T_.polymul.z, 'feltGold', 'MULTIPLY TABLE', 'expand it. combine like terms.', '#ffd166', () => actions.openTable('polymul'), { prop: 'times', accent: 0xffd166 });
    buildTable(zone, T_.polyadd.x, T_.polyadd.z, 'feltTeal', 'ADD/SUB TABLE', 'add. subtract. combine.', '#4fe0c0', () => actions.openTable('polyadd'), { prop: 'plus', accent: 0x4fe0c0 });

    // a picture over each table that shows the kind of question it asks
    const art = [[T_.practice, artFactorTree], [T_.radical, artRadical], [T_.trinomial, artTrinomial],
      [T_.lines, artLines], [T_.parabola, artGraph('STANDARD FORM', 'y = x\u00b2 \u2212 4x + 3', x => x * x - 4 * x + 3, [-1, 5], [-2, 5], [[2, -1, true], [1, 0], [3, 0], [0, 3]])],
      [T_.vertex, artGraph('VERTEX FORM', 'y = \u2212(x + 1)\u00b2 + 4', x => -((x + 1) ** 2) + 4, [-4, 2], [-3, 5], [[-1, 4, true], [-3, 0], [1, 0]])]];
    art.forEach(([pos, painter]) => { const p = textPlane(5.8, 3.6, painter, 72); p.position.set(pos.x, 6.4, -10.95); g.add(p); });
    // the coaster table is on the south side, so its picture hangs on the south wall behind it (over the sofa), facing north
    { const p = textPlane(5.8, 3.6, artCoaster, 72); p.rotation.y = Math.PI; p.position.set(T_.coaster.x + 0.25, 6.4, 10.95); g.add(p); }
    { const p = textPlane(5.8, 3.6, artCubes, 72); p.rotation.y = Math.PI; p.position.set(T_.cubes.x + 0.25, 6.4, 10.95); g.add(p); }
    // the Polynomials tables are along the north end wall of their wing, so their pictures hang on it, facing south
    [[T_.polymul, artPolyMul], [T_.polyadd, artPolyAdd]].forEach(([pos, painter]) => { const p = textPlane(5.8, 3.6, painter, 72); p.position.set(pos.x, 6.4, NORTH_WING.minZ + 0.05); g.add(p); });          // and the cubes table's, on the south wall of the Factoring wing

    // the prompts that are not tables come after the tables in the list: the way out
    interact(zone, 0, 12.4, 1.8, 'Leave the Casino', actions.leaveCasino);

    spawnNPCs(zone, 3);

    // what the tests and the next wing need to know
    zone.casino = { HALL, WING, ARCH, WINGS, NORTH_WING, FOUNTAIN, TABLES, CHAPEL };
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
    addJet(x, 3.83, z, { w: 0.4, base: 1.5, amp: 2.0, speed: 1.1, ring: 0, i: 0, n: 1 });     // tops out at 7.3 blocks, well under the glass sculpture
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

  /** A glass sculpture in the style of Chihuly's "Fiori di Como": a canopy of hundreds of blown-glass flowers in every colour growing from a bronze armature
      against the ceiling. Open blossoms, long trumpets, ruffled saucers, buds and curling tendrils (a few instanced shapes, each piece its own colour and angle),
      denser in the middle. It is still: nothing flickers. The layout is seeded, so it is the same every time. */
  function addGlassSculpture(zone, H, x, z, { ceilingY }) {
    const { lambert } = H;
    const g = new THREE.Group(); g.position.set(x, 0, z); zone.group.add(g);
    const y0 = ceilingY - 0.1, A = 10.2, B = 8.8, D = 2.4;                  // the armature: the lower half of an ellipsoid, hung against the ceiling
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7a5a26 }));      // (unlit warm bronze, so any gap between pieces is warm, never a black hole)
    bowl.scale.set(A, D, B); bowl.position.y = y0; g.add(bowl);

    // shapes that grow along +y from the point where they are attached; the colour of a vertex is darker at the attached end and lighter at the lip
    const shade = (geo, top) => {
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) { const f = Math.min(1, Math.max(0, pos.getY(i) / top)), v = 0.6 + 0.4 * f; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); geo.computeBoundingBox(); return geo;
    };
    const lathe = (profile, seg, ruffle) => {
      const geo = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg);
      const pos = geo.attributes.position, top = Math.max(...profile.map(q => q[1])), rim = Math.max(...profile.map(q => q[0]));
      if (ruffle) for (let i = 0; i < pos.count; i++) {                                                  // a wavy lip, like blown glass
        const px = pos.getX(i), pz = pos.getZ(i), r = Math.hypot(px, pz);
        if (r > rim * 0.55) pos.setY(i, pos.getY(i) + ruffle.amp * ((r - rim * 0.55) / (rim * 0.45)) * Math.sin(ruffle.lobes * Math.atan2(pz, px)));
      }
      return shade(geo, top);
    };
    const tendril = (turns, length) => {                                                                // a curling vine
      const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, a = t * turns * Math.PI * 2, rr = 0.42 * Math.sin(t * Math.PI * 0.9); pts.push(new THREE.Vector3(rr * Math.cos(a), t * length, rr * Math.sin(a))); }
      return shade(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 22, 0.04, 4), length);
    };
    const kinds = [
      { name: 'blossom', n: 180, size: [0.9, 1.7], geo: lathe([[0.04, 0], [0.1, 0.25], [0.26, 0.55], [0.5, 0.8], [0.66, 0.98], [0.7, 1.02]], 14, { amp: 0.08, lobes: 6 }) },
      { name: 'trumpet', n: 85, size: [0.55, 0.95], geo: lathe([[0.03, 0], [0.05, 0.6], [0.08, 1.3], [0.2, 1.9], [0.38, 2.3], [0.46, 2.4]], 12, { amp: 0.1, lobes: 5 }) },
      { name: 'saucer', n: 75, size: [0.7, 1.3], geo: lathe([[0.03, 0], [0.2, 0.1], [0.55, 0.22], [0.9, 0.4], [1.0, 0.52]], 16, { amp: 0.12, lobes: 8 }) },
      { name: 'bud', n: 95, size: [0.5, 1.0], geo: lathe([[0.001, 0], [0.18, 0.12], [0.22, 0.45], [0.14, 0.8], [0.001, 1.0]], 10, null) },
      { name: 'tendril', n: 40, size: [0.8, 1.3], geo: tendril(1.5, 2.2) }, { name: 'tendril', n: 40, size: [0.8, 1.3], geo: tendril(2.5, 2.8) }, { name: 'tendril', n: 40, size: [0.8, 1.3], geo: tendril(3.5, 1.7) },
    ];
    const palette = [0xe8202a, 0xff3b30, 0xc21e56, 0xff7a1a, 0xff9a2e, 0xffd21f, 0xffe55c, 0x6fd13a, 0x2fbf71, 0x16c9c7, 0x21b0e0, 0x2f6bff, 0x5b8cff, 0x8f45ff, 0xb35cf0, 0xff4fa5, 0xff7fbf, 0xd81b84, 0xfff3e0].map(c => new THREE.Color(c));
    const glass = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    let seed = 1941; const rng = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const q = new THREE.Quaternion(), qs = new THREE.Quaternion(), m = new THREE.Matrix4(), P = new THREE.Vector3(), S = new THREE.Vector3(), N = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), box = new THREE.Box3();
    const CEIL_CLEAR = ceilingY - 0.12, X_CLEAR = 10.6;                                  // 12 cm under the ceiling; and no further out than 10.6 where the beams and capitals are (x = +-12)
    let lowest = Infinity, pieces = 0; const used = new Set(), perKind = {};
    kinds.forEach(k => {
      const mesh = new THREE.InstancedMesh(k.geo, glass, k.n);
      for (let i = 0; i < k.n; i++) {
        // a piece is only kept if it stays clear of the ceiling and, up near the ceiling, of the beams and column capitals at x = +-12; otherwise it is tried again
        for (let attempt = 0; ; attempt++) {
          const u = Math.pow(rng(), 0.62), th = rng() * Math.PI * 2;                                     // denser towards the middle
          const px = A * u * Math.cos(th), pz = B * u * Math.sin(th), s2 = Math.sqrt(Math.max(0, 1 - u * u)), py = y0 - D * s2;
          N.set(px / (A * A), -s2 / D, pz / (B * B)).normalize();                                        // straight out from the armature...
          N.x += (rng() - 0.5) * 0.9; N.y += (rng() - 0.5) * 0.5; N.z += (rng() - 0.5) * 0.9;            // ...then every piece leans its own way
          if (N.y > -0.1) N.y = -0.1;                                                                     // (never up into the ceiling)
          N.normalize();
          q.setFromUnitVectors(UP, N); qs.setFromAxisAngle(UP, rng() * Math.PI * 2); q.multiply(qs);
          const sc = k.size[0] + (k.size[1] - k.size[0]) * rng(); S.set(sc, sc * (0.85 + rng() * 0.4), sc);
          P.set(px, py, pz).addScaledVector(N, 0.04);
          m.compose(P, q, S); box.copy(k.geo.boundingBox).applyMatrix4(m);
          if (box.max.y > CEIL_CLEAR) { P.y -= box.max.y - CEIL_CLEAR; m.compose(P, q, S); box.copy(k.geo.boundingBox).applyMatrix4(m); }   // too high: slide it down
          const reach = Math.max(Math.abs(box.min.x), Math.abs(box.max.x));
          if ((reach <= X_CLEAR || box.max.y < 14.8) || attempt > 40) break;
        }
        mesh.setMatrixAt(i, m);
        const c = palette[Math.floor(rng() * palette.length)]; mesh.setColorAt(i, c); used.add(c.getHex());
        lowest = Math.min(lowest, box.min.y);
        pieces++; perKind[k.name] = (perKind[k.name] || 0) + 1;
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false; g.add(mesh);
    });
    // the same two warm lights the chandelier gave the hall
    const warm = new THREE.PointLight(0xfff0d0, 0.55, 70); warm.position.set(x, y0 - 6.4, z); zone.group.add(warm);
    const high = new THREE.PointLight(0xffe2b0, 0.3, 50); high.position.set(x, y0 - 2.0, z); zone.group.add(high);
    zone.glassSculpture = { x, z, ceilingY, group: g, pieces, perKind, lowest, radiusX: A, radiusZ: B, colors: used.size, meshes: kinds.length };
  }

  /** A crystal chandelier: gold rings and spokes, rings of little lamps, and glass drops that twinkle. (Now only the small ones in the wings.) */
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

  /** Doors, a gilded arch, a sign, a red rope and the ceremony sign on a stand. See CHAPEL. */
  function addWeddingChapel(zone, H) {
    const { box, lambert, makeSign, textPlane, solid } = H;
    const g = zone.group, C = CHAPEL, cx = C.x, wz = C.wallZ, dh = C.doorH, hw = C.doorW / 2;
    const ivory = lambert(0xf1ebdd), gold = lambert(GOLD), goldDeep = lambert(0xa97f2a), silver = lambert(0xc3c7cc);
    // ivory double doors set back in a gold frame, with gilded panels, a seam and handles, and a marble step
    [-1, 1].forEach(sd => {
      const lx = cx + sd * (hw / 2 + 0.02);
      box(g, ivory, hw - 0.04, dh, 0.2, lx, dh / 2, wz - 0.1);
      [[1.3, 2.2], [3.6, 2.8]].forEach(([y, ph]) => {
        const pw = hw - 0.5;
        box(g, goldDeep, pw, 0.07, 0.05, lx, y + ph / 2, wz - 0.225); box(g, goldDeep, pw, 0.07, 0.05, lx, y - ph / 2, wz - 0.225);
        box(g, goldDeep, 0.07, ph, 0.05, lx - pw / 2, y, wz - 0.225); box(g, goldDeep, 0.07, ph, 0.05, lx + pw / 2, y, wz - 0.225);
      });
      box(g, gold, 0.1, 0.9, 0.12, cx + sd * 0.32, 2.4, wz - 0.28);
      box(g, gold, 0.3, dh, 0.4, cx + sd * (hw + 0.15), dh / 2, wz - 0.2);
    });
    box(g, gold, 0.08, dh, 0.1, cx, dh / 2, wz - 0.26);
    box(g, 'marble', C.doorW + 0.8, 0.1, 0.7, cx, 0.05, wz - 0.35);
    // the arch over them: a gold half-ring on the two posts, a pale fan window inside it with gold spokes, and a keystone
    const ring = new THREE.Mesh(new THREE.TorusGeometry(hw + 0.15, 0.15, 8, 30, Math.PI), gold); ring.position.set(cx, dh, wz - 0.2); g.add(ring);
    const lunette = new THREE.Mesh(new THREE.CircleGeometry(hw, 30, 0, Math.PI), lambert(0xe6dfcf)); lunette.rotation.y = Math.PI; lunette.position.set(cx, dh, wz - 0.12); g.add(lunette);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.12 + 0.76 * i / 6), spoke = box(g, goldDeep, 0.07, hw - 0.1, 0.05, cx + (hw / 2) * Math.cos(a), dh + (hw / 2) * Math.sin(a), wz - 0.17);
      spoke.rotation.z = a - Math.PI / 2;
    }
    box(g, gold, 0.5, 0.55, 0.36, cx, dh + hw + 0.17, wz - 0.2);
    const sign = makeSign({ w: 4.8, h: 0.95, title: 'WEDDING CHAPEL', fg: '#fff3d6', bg: '#2a1830', border: '#d4a843' });
    sign.rotation.y = Math.PI; sign.position.set(cx, dh + 3.2, wz - 0.06); g.add(sign);
    // the red rope: two brass posts with a rope hung between them, in front of the doors (and solid, so the doors stay shut)
    const rz = C.ropeZ, rope = lambert(0x9b1230);
    [-1, 1].forEach(sd => {
      const px = cx + sd * C.ropeHalf;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 14), gold); base.position.set(px, 0.04, rz); g.add(base);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.94, 10), gold); pole.position.set(px, 0.55, rz); g.add(pole);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), gold); ball.position.set(px, 1.08, rz); g.add(ball);
    });
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(cx - C.ropeHalf, 0.95, rz), new THREE.Vector3(cx, 0.35, rz), new THREE.Vector3(cx + C.ropeHalf, 0.95, rz));
    const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.05, 8), rope); g.add(cord);
    // the roped-off space between the rope and the doors is closed to walkers (otherwise you could step round a post and put the camera inside the door frame)
    solid(zone, cx, (rz - 0.15 + wz) / 2, 2 * C.ropeHalf + 0.5, wz - rz + 0.15);
    // the ceremony sign on its post, to the left: a silver frame round the card, on an ivory post with a stepped top and a monogram
    const sx = C.stand.x, sz = C.stand.z;
    box(g, 'marble', 0.9, 0.12, 0.6, sx, 0.06, sz); box(g, ivory, 0.26, 0.95, 0.26, sx, 0.6, sz); box(g, ivory, 1.1, 0.22, 0.34, sx, 1.18, sz);
    box(g, silver, 1.5, 1.0, 0.1, sx, 1.78, sz);
    const card = textPlane(1.32, 0.84, paintWeddingCard, 300); card.rotation.y = Math.PI; card.position.set(sx, 1.78, sz - 0.09); g.add(card);
    box(g, ivory, 0.9, 0.12, 0.3, sx, 2.34, sz); box(g, ivory, 0.6, 0.12, 0.28, sx, 2.46, sz); box(g, ivory, 0.3, 0.12, 0.26, sx, 2.58, sz);
    const mono = textPlane(0.5, 0.3, (c, cv) => { c.fillStyle = '#f1ebdd'; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = '#9aa0a8'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = scriptFont(c, Math.round(cv.height * 0.7)); c.fillText('W&W', cv.width / 2, cv.height * 0.52); }, 300);
    mono.rotation.y = Math.PI; mono.position.set(sx, 2.46, sz - 0.2); g.add(mono);          // 5 cm proud of the steps it is mounted on
    solid(zone, sx, sz, 1.1, 0.6);
  }

  /** A plush sofa against the south wall, facing north. It is solid. */
  function addSofa(zone, H, x, z, color) {
    const { box, lambert, solid } = H;
    const g = zone.group, velvet = lambert(color), wood = lambert(0x3a2418), gold = lambert(GOLD);
    box(g, wood, 3.4, 0.25, 1.4, x, 0.12, z);
    box(g, velvet, 3.2, 0.45, 1.2, x, 0.5, z - 0.05);
    box(g, velvet, 3.2, 1.0, 0.35, x, 1.2, z + 0.55);
    [-1, 1].forEach(s => box(g, velvet, 0.3, 0.85, 1.34, x + s * 1.65, 0.65, z));       // (a hair deeper than the seat, so no two faces are flush)
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

  return { BUILD, WALL, HALL, WING, ARCH, WINGS, NORTH_WING, FOUNTAIN, TABLES, SPAWN, CHAPEL, build };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CasinoInterior;
