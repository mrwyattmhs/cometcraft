/* The HOUSE OF ALGEBRA: a blues-rock venue at the north end of the village's street of shops. You go in through the big double doors on its east face and find a room with a stage at the
   back (guitars on stands, a drum kit, amps, a mic stand, stage lights), a red-carpet aisle down the middle from the door to the stage, and booths along the side walls that look like the
   merch stalls at a gig. Each booth is a table of algebra problems, one unit each, and a booth is only built once its table exists: so far two, facing each other across the aisle next to the
   stage: Unit 1, the Missing Number (one-step equations with adding and taking away) on the west wall, and Unit 2, Multiply and Divide, on the east wall. The rest of the wall space is
   left open for the next units: add a booth to BOOTHS, with its table.

   Built with the same helpers as the casino's interior (World.helpers). It is two pieces:
     House.buildFront(zone, actions)  the venue's front, added to the village (world.js calls it)
     House.build(actions)             the room inside, a zone of its own */
const House = (() => {
  const H = World.helpers, T = THREE;
  const { box, flat, lambert, glow, textPlane, makeSign, solid, interact, buildDoor, PX_FONT, createZone, buildSymbol } = H;

  /** Where the front stands in the village (its east face is at x -12, the door in the middle of it) and where you appear when you come out. */
  const FRONT = { x0: -31, x1: -12, z0: -13.5, z1: -0.5, cz: -7, height: 8 };     // (set well back from the casino's front: about 7.5 blocks from the corner of the casino, nearly double what it was)
  const EXIT = { x: -9.2, z: -7, yaw: -Math.PI / 2 };
  /** The room inside (the walls are at the bounds, plus half a block) and the booths along its side walls. A booth faces the aisle: the west booths face east ('E'), the east ones west ('W'). */
  const ROOM = { minX: -15, maxX: 15, minZ: -14, maxZ: 13, stageFront: -7 };
  const BOOTHS = [
    { id: 'missing', unit: 1, x: -13.3, z: -2.5, face: 'E', title: 'MISSING NUMBER', sub: 'UNIT 1: ONE-STEP EQUATIONS', label: 'Visit the Missing Number booth', symbols: ['box'], color: 0x4aa3ff, fg: '#7fd7ff' },
    { id: 'muldiv', unit: 2, x: 13.3, z: -2.5, face: 'W', title: 'MULTIPLY & DIVIDE', sub: 'UNIT 2: ONE-STEP EQUATIONS', label: 'Visit the Multiply & Divide booth', symbols: ['times', 'divide'], color: 0xff9f4a, fg: '#ffc47a' },
  ];

  const cyl = (g, mat, rt, rb, h, x, y, z, seg = 14) => { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); g.add(m); return m; };
  const poster = (c, cv, bg, big, small, fg, accent) => {
    c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = accent; c.fillRect(0, 0, cv.width, cv.height * 0.07); c.fillRect(0, cv.height * 0.93, cv.width, cv.height * 0.07);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg; c.font = PX_FONT(cv.height * 0.15);
    big.forEach((line, i) => c.fillText(line, cv.width / 2, cv.height * (0.3 + i * 0.17)));
    c.fillStyle = accent; c.font = PX_FONT(cv.height * 0.07); small.forEach((line, i) => c.fillText(line, cv.width / 2, cv.height * (0.7 + i * 0.09)));
  };
  const POSTERS = [
    (c, cv) => poster(c, cv, '#1b2a4a', ['ALGEBRA', 'LIVE!'], ['ONE NIGHT ONLY', 'SOLVE FOR X'], '#ffe29a', '#7fd7ff'),
    (c, cv) => poster(c, cv, '#3a1414', ['THE LINEAR', 'EQUATIONS'], ['SLOPE AND', 'INTERCEPT TOUR'], '#ffd6c9', '#ffb347'),
    (c, cv) => poster(c, cv, '#10302a', ['x\u00b2', 'TOUR'], ['THE PARABOLAS', 'LIVE IN CONCERT'], '#c9ffe9', '#ffd166'),
    (c, cv) => poster(c, cv, '#2c1740', ['BLUES IN', 'B = 7'], ['SOLVE FOR', 'THE BLUES'], '#f3d9ff', '#ff8fc4'),
  ];

  /* ====================================================================== the front, on the village street ====================================================================== */
  function buildFront(zone, actions) {
    const g = zone.group, { x0, x1, z0, z1, cz, height } = FRONT, cx = (x0 + x1) / 2, w = x1 - x0, d = z1 - z0, fx = x1 + 0.1;
    box(g, 'brick', w, 3.4, d, cx, 1.7, cz);                                           // brick below
    box(g, lambert(0x262b33), w + 0.2, height - 3.4, d + 0.2, cx, 3.4 + (height - 3.4) / 2, cz);        // dark corrugated steel above, with ribs
    for (let z = z0 + 0.6; z <= z1 - 0.5; z += 1.1) box(g, lambert(0x1c2026), 0.14, height - 3.4, 0.14, x1 + 0.17, 3.4 + (height - 3.4) / 2, z);
    box(g, lambert(0x14171c), w + 0.7, 0.5, d + 0.7, cx, height + 0.2, cz);                           // the parapet cap
    box(g, lambert(0x14171c), 0.4, 0.5, d + 0.7, x1 + 0.45, height - 0.3, cz);
    box(g, lambert(0x6e3b24), w + 0.3, 0.3, d + 0.3, cx, 3.5, cz).scale.y = 0.4;                      // a rusty band where the brick meets the steel

    // the marquee: the name, lit, with bulbs round its edge
    const name = makeSign({ w: 9.4, h: 2.3, title: 'HOUSE OF ALGEBRA', sub: 'LIVE BLUES  FRESH MATH', fg: '#7fd7ff', bg: '#0b1424', border: '#ffc45c', subColor: '#ffd166' });
    name.position.set(fx + 0.1, 6.0, cz); name.rotation.y = Math.PI / 2; g.add(name);
    for (let z = cz - 4.9; z <= cz + 4.95; z += 0.7) { const col = Math.round((z - cz) / 0.7) % 2 ? 0xffd166 : 0xff7a59; box(g, glow(col), 0.14, 0.14, 0.14, fx + 0.14, 7.28, z); box(g, glow(col), 0.14, 0.14, 0.14, fx + 0.14, 4.72, z); }

    // a giant guitar standing on the roof, lit blue
    const guitar = buildSymbol('guitar', 0x4aa3ff, { emissive: 0.7 }); guitar.scale.set(2.2, 2.2, 2.2); guitar.position.set(x1 - 0.6, height + 3.7, cz); guitar.rotation.y = Math.PI / 2; g.add(guitar);

    // the doors, an awning with string lights, an OPEN sign, an A-frame board and gig posters
    buildDoor(g, { x: x1 + 0.02, z: cz, rotY: Math.PI / 2, w: 3.4, h: 4.0, transom: true });
    box(g, lambert(0x14171c), 1.7, 0.22, 6.2, x1 + 0.95, 4.55, cz);
    for (let i = 0; i < 9; i++) box(g, lambert(i % 2 ? 0xf2c230 : 0x14171c), 0.12, 0.3, 0.69, x1 + 1.8, 4.35, cz - 2.75 + i * 0.69);
    for (let z = cz - 2.9; z <= cz + 2.95; z += 0.725) box(g, glow(0xfff0b0), 0.12, 0.12, 0.12, x1 + 1.85, 4.15, z);
    const open = makeSign({ w: 1.1, h: 0.4, title: 'OPEN', fg: '#ff5a4a', bg: '#2a0c0c', border: '#ff5a4a' }); open.position.set(fx + 0.15, 3.0, cz + 2.6); open.rotation.y = Math.PI / 2; g.add(open);
    [[cz - 4.8, 0], [cz - 3.1, 1]].forEach(([z, i]) => { const p = textPlane(1.5, 2.2, POSTERS[i], 60); p.position.set(fx + 0.04, 2.1, z); p.rotation.y = Math.PI / 2; g.add(p); });
    [[cz + 3.1, 2], [cz + 4.8, 3]].forEach(([z, i]) => { const p = textPlane(1.5, 2.2, POSTERS[i], 60); p.position.set(fx + 0.04, 2.1, z); p.rotation.y = Math.PI / 2; g.add(p); });
    const aSign = textPlane(1.3, 1.7, (c, cv) => { c.fillStyle = '#23211f'; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = '#f3e8c9'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = PX_FONT(cv.height * 0.1); ['TONIGHT:', 'ONE-STEP', 'EQUATIONS', '', '[ ] + 5 = 7'].forEach((t, i) => c.fillText(t, cv.width / 2, cv.height * (0.18 + i * 0.16))); }, 60);
    box(g, 'planks', 0.12, 1.9, 1.5, x1 + 3.2, 0.95, cz + 4.2); aSign.position.set(x1 + 3.28, 1.1, cz + 4.2); aSign.rotation.y = Math.PI / 2; g.add(aSign);

    flat(g, 'paving', 5.6, d - 1, -9.2, 0.04, cz);                                               // a paved forecourt from the venue's front to the road's sidewalk
    solid(zone, cx, cz, w, d); solid(zone, x1 + 3.2, cz + 4.2, 0.4, 1.7);
    interact(zone, x1 + 2.6, cz, 2.4, 'Enter the House of Algebra', actions.enterHouse);
  }

  /* ====================================================================== the pieces on the stage ====================================================================== */
  /** A guitar on a stand, standing on the stage floor at (x, y, z): a tripod stand, and the guitar leaning on it (a bass has a longer neck). */
  function guitarOnStand(g, x, y, z, { body, trim, bass = false, turn = 0 }) {
    const grp = new T.Group(), steel = lambert(0x9aa0aa), dark = lambert(0x16181c);
    box(grp, steel, 0.04, 1.0, 0.04, 0, 0.5, 0);                                      // the stand's pole, three legs and the cradle arms
    [[0.35, 0], [-0.2, 0.3], [-0.2, -0.3]].forEach(([lx, lz]) => { const leg = box(grp, steel, 0.04, 0.04, 0.5, lx / 2, 0.04, lz / 2); leg.rotation.y = Math.atan2(lx, lz) + Math.PI / 2; });
    box(grp, dark, 0.3, 0.05, 0.05, 0.06, 0.95, 0);
    const gt = new T.Group(); gt.position.set(0.12, 0.62, 0); gt.rotation.z = -0.1;      // the guitar: a lower and an upper curve of the body, a pickguard, the neck and the headstock
    box(gt, lambert(body), 0.14, 0.52, 0.5, 0, 0, 0); box(gt, lambert(body), 0.14, 0.34, 0.38, 0, 0.4, 0);
    box(gt, lambert(trim), 0.16, 0.2, 0.3, 0.01, -0.06, 0.05); box(gt, dark, 0.18, 0.04, 0.2, 0.01, 0.1, -0.05);
    const neck = bass ? 1.25 : 0.95; box(gt, lambert(0x6a4426), 0.07, neck, 0.1, 0, 0.6 + neck / 2, 0); box(gt, dark, 0.05, neck, 0.07, 0.03, 0.6 + neck / 2, 0);
    box(gt, lambert(0x2b1a0e), 0.08, 0.28, 0.16, 0, 0.6 + neck + 0.12, 0);
    [-0.05, 0.05].forEach(pz => box(gt, steel, 0.03, 0.04, 0.03, 0.05, 0.6 + neck + 0.12, pz * 1.5));
    grp.add(gt); grp.position.set(x, y, z); grp.rotation.y = turn; grp.userData.kind = bass ? 'bass' : 'guitar'; g.add(grp); return grp;
  }
  /** A drum kit centred on (x, z), the drummer's throne behind it, facing the audience (south, +z). */
  function drumKit(parent, x, y, z) {
    const g = new T.Group(); g.userData.kind = 'drumkit'; g.userData.at = { x, y, z };
    const shell = lambert(0x8b1e24), white = lambert(0xece7da), chrome = lambert(0xbfc5ce), gold = lambert(0xd8b445), dark = lambert(0x16181c);
    const drum = (r, h, px, py, pz, tilt = 0) => { const grp = new T.Group(); cyl(grp, shell, r, r, h, 0, 0, 0, 16); cyl(grp, white, r * 0.98, r * 0.98, h * 0.08, 0, h / 2 + 0.005, 0, 16); cyl(grp, chrome, r * 1.02, r * 1.02, h * 0.06, 0, h / 2, 0, 16); cyl(grp, chrome, r * 1.02, r * 1.02, h * 0.06, 0, -h / 2, 0, 16); grp.position.set(px, py, pz); grp.rotation.x = tilt; g.add(grp); return grp; };
    const bass = drum(0.62, 0.72, x, y + 0.68, z + 0.1); bass.rotation.x = Math.PI / 2;                                       // the bass drum faces the audience
    cyl(g, white, 0.58, 0.58, 0.02, x, y + 0.68, z + 0.47, 16).rotation.x = Math.PI / 2;
    drum(0.3, 0.24, x - 0.38, y + 1.5, z + 0.05, -0.25); drum(0.3, 0.24, x + 0.38, y + 1.5, z + 0.05, -0.25);              // two rack toms
    drum(0.42, 0.55, x + 1.05, y + 0.62, z + 0.35);                                                                         // the floor tom, on legs
    [[0.28, 0.2], [-0.28, 0.2], [0, -0.3]].forEach(([lx, lz]) => box(g, chrome, 0.04, 0.4, 0.04, x + 1.05 + lx, y + 0.2, z + 0.35 + lz));
    drum(0.3, 0.16, x - 0.9, y + 0.85, z + 0.55, -0.15); box(g, chrome, 0.04, 0.7, 0.04, x - 0.9, y + 0.4, z + 0.55);       // the snare on its stand
    box(g, chrome, 0.04, 1.0, 0.04, x - 1.6, y + 0.5, z + 0.5); cyl(g, gold, 0.3, 0.3, 0.025, x - 1.6, y + 1.0, z + 0.5, 18); cyl(g, gold, 0.3, 0.3, 0.025, x - 1.6, y + 1.06, z + 0.5, 18);   // the hi-hat
    [[-0.95, 2.3, -0.5, 0.36], [1.55, 2.2, -0.2, 0.42]].forEach(([dx, dy, dz, r]) => { box(g, chrome, 0.04, dy - 0.15, 0.04, x + dx, y + (dy - 0.15) / 2, z + dz); cyl(g, gold, r, r, 0.025, x + dx, y + dy, z + dz, 18).rotation.z = 0.08; });   // a crash and a ride
    cyl(g, dark, 0.32, 0.32, 0.08, x, y + 0.7, z - 1.15, 12); box(g, chrome, 0.05, 0.6, 0.05, x, y + 0.35, z - 1.15);        // the throne
    box(g, lambert(0x3a2a22), 3.6, 0.04, 2.6, x, y + 0.02, z - 0.1);                                                          // a rug under it all
    parent.add(g);
  }
  /** A mic stand: a round heavy base, the pole, a boom arm, a clip and the mic. */
  function micStand(parent, x, y, z) {
    const g = new T.Group(); g.userData.kind = 'micstand'; g.userData.at = { x, y, z };
    const steel = lambert(0x9aa0aa), dark = lambert(0x16181c);
    cyl(g, dark, 0.32, 0.36, 0.06, x, y + 0.03, z, 14); box(g, steel, 0.04, 1.5, 0.04, x, y + 0.8, z);
    const arm = box(g, steel, 0.04, 0.5, 0.04, x, y + 1.62, z + 0.12); arm.rotation.x = 0.9;
    box(g, dark, 0.09, 0.2, 0.09, x, y + 1.78, z + 0.4); cyl(g, lambert(0xd0d4da), 0.07, 0.06, 0.12, x, y + 1.9, z + 0.42, 10);
    parent.add(g);
  }
  /** An amp stack: two cabinets with speaker grilles and a head with knobs on top. */
  function ampStack(g, x, y, z, turn = 0) {
    const grp = new T.Group(), black = lambert(0x15171b), grille = lambert(0x3a3d44), cream = lambert(0xe6dcc0);
    [0, 1].forEach(i => { box(grp, black, 1.3, 0.95, 0.7, 0, 0.475 + i * 0.95, 0); box(grp, grille, 1.1, 0.75, 0.05, 0, 0.475 + i * 0.95, 0.37); for (let k = -2; k <= 2; k++) box(grp, lambert(0x4b4f58), 0.04, 0.75, 0.06, k * 0.24, 0.475 + i * 0.95, 0.375); });
    box(grp, black, 1.25, 0.4, 0.6, 0, 2.1, 0); box(grp, cream, 1.15, 0.12, 0.05, 0, 2.18, 0.31);
    for (let k = -3; k <= 3; k++) box(grp, lambert(0xc9a24a), 0.06, 0.06, 0.06, k * 0.15, 2.05, 0.34);
    grp.position.set(x, y, z); grp.rotation.y = turn; grp.userData.kind = 'amp'; g.add(grp);
  }

  /* ====================================================================== a booth ====================================================================== */
  /** A booth drawn facing +x in a frame of its own, then turned to face the aisle; its solid footprint and prompt are turned with it. Each booth is one unit's table: it has its own sign colour and
      its own floating symbols over the counter (the box for [ ] + 5 = 7; a times and a divide for the second). A unit's booth is added to BOOTHS when its table exists. */
  function buildBooth(zone, b, actions) {
    const turn = b.face === 'E' ? 0 : Math.PI, pivot = new T.Group(), dark = lambert(0x1a1d22), wood = lambert(0x5a3b24), top = lambert(0x8a5e38);
    pivot.position.set(b.x, 0, b.z); pivot.rotation.y = turn;
    const L = pivot;
    box(L, wood, 1.1, 1.05, 4.6, 1.0, 0.525, 0); box(L, top, 1.3, 0.1, 4.8, 1.0, 1.1, 0);                                  // the counter and its top
    box(L, dark, 0.2, 3.6, 4.8, -1.6, 1.8, 0);                                                                              // the back panel and two shelves of merch
    [1.4, 2.2].forEach(y => box(L, wood, 0.6, 0.08, 4.4, -1.3, y, 0));
    const colors = [0xd9483b, 0x2f6fd0, 0xf2c230, 0x2fb37a, 0xe8e0d0, 0xc260c9];
    for (let i = 0; i < 7; i++) { box(L, lambert(colors[(i + b.unit) % colors.length]), 0.4, 0.3, 0.45, -1.3, 1.59, -2.0 + i * 0.66); if (i % 2 === 0) box(L, lambert(colors[(i + 2 + b.unit) % colors.length]), 0.4, 0.3, 0.45, -1.3, 2.39, -2.0 + i * 0.66); }
    [[-1.5, -2.3], [-1.5, 2.3], [1.6, -2.3], [1.6, 2.3]].forEach(([px, pz]) => box(L, dark, 0.14, 3.5, 0.14, px, 1.75, pz));   // the posts
    for (let i = 0; i < 7; i++) { const c = i % 2 ? 0x17191d : 0xf2c230; box(L, lambert(c), 3.7, 0.14, 0.7, 0.05, 3.52, -2.1 + i * 0.7); box(L, lambert(c), 0.1, 0.34, 0.7, 1.95, 3.3, -2.1 + i * 0.7); }   // the striped canopy and its valance
    const sign = makeSign({ w: 4.4, h: 0.95, title: b.title, sub: b.sub, fg: b.fg, bg: '#0b1424', border: '#ffc45c', subColor: '#ffd166' });
    sign.position.set(2.0, 4.15, 0); sign.rotation.y = Math.PI / 2; L.add(sign);
    const n = b.symbols.length, k = n === 1 ? 0.9 : 0.55;                                                                   // the floating symbols: one big, or two side by side
    b.symbols.forEach((kind, i) => {
      const sym = buildSymbol(kind, b.color, { emissive: 0.7 }), zOff = n === 1 ? 0 : (i - (n - 1) / 2) * 1.1; sym.scale.set(k, k, k); sym.position.set(1.0, 2.3, zOff); L.add(sym);
      zone.animated.push((dt, t) => { sym.rotation.y += dt * 0.9; sym.position.y = 2.3 + Math.sin(t * 1.6 + b.z + i) * 0.08; });
    });
    zone.group.add(pivot);
    const c = Math.cos(turn), at = (x, z) => ({ x: b.x + x * c, z: b.z + z * c }), foot = at(0, 0);
    solid(zone, foot.x, foot.z, 3.4, 5.0);
    const prompt = at(3.9, 0);
    interact(zone, prompt.x, prompt.z, 2.4, b.label, () => actions.openTable(b.id));
  }

  /* ====================================================================== the room inside ====================================================================== */
  function build(actions) {
    const zone = createZone('House of Algebra', {
      spawn: { x: 0, z: 11.0, yaw: 0 },
      bounds: { minX: ROOM.minX + 0.6, maxX: ROOM.maxX - 0.6, minZ: ROOM.minZ + 0.6, maxZ: ROOM.maxZ - 0.6 },
      sky: 0x150f12, fog: [0x150f12, 26, 60], wander: { minX: -4, maxX: 4, minZ: -4, maxZ: 10 },
    });
    const g = zone.group, W = ROOM.maxX - ROOM.minX, D = ROOM.maxZ - ROOM.minZ, cz = (ROOM.minZ + ROOM.maxZ) / 2, y0 = 1.0;

    // warm, dim light for the room, with coloured light from the stage
    g.add(new T.HemisphereLight(0x9a8aa8, 0x2a1a14, 0.62)); g.add(new T.AmbientLight(0xffe2b8, 0.38));
    const lamp = (col, k, dist, x, y, z) => { const l = new T.PointLight(col, k, dist); l.position.set(x, y, z); g.add(l); };
    lamp(0xffc880, 0.7, 30, 0, 5.5, 4); lamp(0x4a7bff, 1.0, 22, -7, 5, -9); lamp(0xff4a4a, 1.0, 22, 7, 5, -9); lamp(0xffb347, 0.8, 20, 0, 5.5, -5);

    // floor, an aisle of red carpet from the door to the stage, walls, ceiling and beams
    flat(g, 'planks', W, D, 0, 0, cz); flat(g, 'carpet', 5, ROOM.maxZ - ROOM.stageFront - 0.2, 0, 0.03, (ROOM.maxZ + ROOM.stageFront) / 2);
    box(g, 'brick', W, 7.2, 0.5, 0, 3.6, ROOM.minZ - 0.25);                                                                   // back wall
    [-1, 1].forEach(s => box(g, 'brick', 0.5, 7.2, D + 1, s * (W / 2 + 0.25), 3.6, cz));                                      // side walls
    [-1, 1].forEach(s => box(g, 'brick', (W - 3.6) / 2, 7.2, 0.5, s * ((W - 3.6) / 4 + 1.8), 3.6, ROOM.maxZ + 0.25));           // the front wall, either side of the door
    box(g, 'brick', 3.7, 3.0, 0.5, 0, 5.7, ROOM.maxZ + 0.25);                                                                 // and over it
    box(g, lambert(0x1a1416), W + 1.2, 0.3, D + 1.2, 0, 7.35, cz);
    for (let x = -12; x <= 12; x += 4) box(g, lambert(0x2b2018), 0.4, 0.5, D, x, 7.0, cz);
    buildDoor(g, { x: 0, z: ROOM.maxZ - 0.12, rotY: Math.PI, w: 3.4, h: 4.0, transom: true });                                  // faces into the room
    interact(zone, 0, ROOM.maxZ - 2.0, 2.2, 'Leave the House of Algebra', actions.leaveHouse);

    // string lights looping across the room
    [-1.5, 5, 10.5].forEach(z => { for (let x = -14.4; x <= 14.4; x += 1.2) { const sag = 0.55 * (1 - (x / 14.4) ** 2), col = Math.round(x / 1.2 + z) % 3 === 0 ? 0xff7a59 : Math.round(x / 1.2 + z) % 3 === 1 ? 0xffd166 : 0x7fd7ff; box(g, glow(col), 0.14, 0.14, 0.14, x, 6.2 - sag, z); } });

    // gig posters on the side walls above the booths
    [-1, 1].forEach((side, k) => [-2.5, 3, 8.5].forEach((z, i) => { const p = textPlane(1.8, 2.5, POSTERS[(i + k * 2) % 4], 60); p.position.set(side < 0 ? ROOM.minX + 0.04 : ROOM.maxX - 0.04, 5.2, z); p.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(p); }));

    // the stage, at the back: a platform with a glowing edge and steps, a curtain, the sign, amps, instruments, lights
    const stageD = ROOM.stageFront - ROOM.minZ, sc = (ROOM.stageFront + ROOM.minZ) / 2;
    box(g, 'planks', 22, y0, stageD, 0, y0 / 2, sc); box(g, glow(0xffc45c), 22, 0.07, 0.12, 0, y0 + 0.01, ROOM.stageFront + 0.04); box(g, lambert(0x14161a), 22.2, 0.35, 0.2, 0, 0.18, ROOM.stageFront + 0.08);
    box(g, 'planks', 3.2, 0.66, 0.7, 0, 0.33, ROOM.stageFront + 0.35); box(g, 'planks', 3.2, 0.33, 0.7, 0, 0.165, ROOM.stageFront + 1.05);
    solid(zone, 0, sc, 22, stageD); solid(zone, 0, ROOM.stageFront + 0.7, 3.2, 1.5);
    const curtain = lambert(0x4a0f18), fold = lambert(0x62151f);
    box(g, curtain, 22, 6.2, 0.3, 0, 3.1, ROOM.minZ + 0.2); for (let x = -10.5; x <= 10.5; x += 1.5) box(g, fold, 0.7, 6.2, 0.4, x, 3.1, ROOM.minZ + 0.38);
    const neon = textPlane(11, 2.2, (c, cv) => { c.fillStyle = 'rgba(8,10,20,.0)'; c.clearRect(0, 0, cv.width, cv.height); c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#4aa3ff'; c.shadowBlur = 24; c.fillStyle = '#7fd7ff'; c.font = PX_FONT(cv.height * 0.36); c.fillText('HOUSE OF ALGEBRA', cv.width / 2, cv.height * 0.38); c.shadowColor = '#ff6aa8'; c.fillStyle = '#ffb3d1'; c.font = PX_FONT(cv.height * 0.17); c.fillText('LIVE  BLUES  FRESH MATH', cv.width / 2, cv.height * 0.8); }, 70);
    neon.position.set(0, 5.1, ROOM.minZ + 0.62); g.add(neon);
    ampStack(g, -8.6, y0, ROOM.minZ + 1.1, 0.12); ampStack(g, 8.6, y0, ROOM.minZ + 1.1, -0.12); ampStack(g, -6.8, y0, ROOM.minZ + 1.0, 0.05);
    drumKit(g, 0, y0, -11.4);
    guitarOnStand(g, -5.2, y0, -8.8, { body: 0xc9501e, trim: 0xf0e6d0, turn: 0.35 }); guitarOnStand(g, -4.2, y0, -9.6, { body: 0x2563c9, trim: 0xf0e6d0, turn: 0.2 });
    guitarOnStand(g, 4.2, y0, -9.6, { body: 0x16181c, trim: 0xe8c35a, turn: -0.2 }); guitarOnStand(g, 5.4, y0, -8.8, { body: 0x2f9e6a, trim: 0xf0e6d0, bass: true, turn: -0.35 });
    micStand(g, 0, y0, -8.6);
    for (let i = 0; i < 2; i++) { const mon = box(g, lambert(0x15171b), 0.9, 0.4, 0.6, i ? 2.8 : -2.8, y0 + 0.2, -7.6); mon.rotation.y = i ? -0.3 : 0.3; box(g, lambert(0x3a3d44), 0.7, 0.2, 0.05, i ? 2.65 : -2.65, y0 + 0.25, -7.33).rotation.y = i ? -0.3 : 0.3; }
    // a truss over the front of the stage with five stage lights and their beams
    box(g, lambert(0x2a2d33), 21, 0.18, 0.18, 0, 5.7, ROOM.stageFront - 0.4);
    [[-8, 0x4a7bff], [-4, 0xff4a4a], [0, 0xffb347], [4, 0xff6aa8], [8, 0x4a7bff]].forEach(([x, col]) => {
      box(g, lambert(0x14161a), 0.5, 0.5, 0.5, x, 5.4, ROOM.stageFront - 0.4); box(g, glow(col), 0.36, 0.06, 0.36, x, 5.12, ROOM.stageFront - 0.4);
      const cone = new T.Mesh(new T.ConeGeometry(1.5, 4.0, 12, 1, true), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, depthWrite: false, side: T.DoubleSide }));
      cone.position.set(x * 0.8, 3.1, -9.2); cone.rotation.x = Math.PI; g.add(cone);
    });

    // the booths along the side walls, nearest the stage first (each one is a real table)
    BOOTHS.forEach(b => buildBooth(zone, b, actions));
    return zone;
  }

  return { buildFront, build, FRONT, EXIT, ROOM, BOOTHS };
})();
