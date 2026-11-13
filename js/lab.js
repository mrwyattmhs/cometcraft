/* The SCIENCE LAB: across the end of the street of shops, where the path runs on west past the last shops to its door. Inside is one bright room with three stations, one for each game:
     ELEMENT MATCH   the back wall is a giant periodic table, and the console under it is the station
     CELL LAB        a bench along the west wall with a big microscope
     ATOM BUILDER    a bench along the east wall, with a model atom hovering over it (electrons circling a nucleus)
   plus lab benches with glassware, shelves of bottles, a fume hood, a safety poster and a clock. A station is walked up to and opened with E, like a booth in the House of Algebra.

   Built with the same helpers as the House and the casino (World.helpers). Two pieces:
     Lab.buildFront(zone, actions)  the lab's front, added to the village (world.js calls it)
     Lab.build(actions)             the room inside, a zone of its own */
const Lab = (() => {
  const H = World.helpers, T = THREE;
  const { box, flat, lambert, glow, textPlane, makeSign, solid, interact, buildDoor, PX_FONT, createZone, buildSymbol } = H;

  /** Where the front stands in the village (its east face at x -53, the door in the middle of it, level with the street's path) and where you appear when you come out. */
  const FRONT = { x0: -70, x1: -53, z0: 5.5, z1: 21.5, cz: 13.5, height: 7 };
  const EXIT = { x: -50.2, z: 13.5, yaw: -Math.PI / 2 };
  /** The room inside, and the three stations (x, z is where the prompt is: stand there and press E). */
  const ROOM = { minX: -15, maxX: 15, minZ: -12, maxZ: 12 };
  const STATIONS = [
    { id: 'elements', label: 'Use the Element Match station', x: 0, z: -8.4, color: 0x4ad8c8 },
    { id: 'cells', label: 'Use the Cell Lab microscope', x: -10.4, z: 0, color: 0x7ee06a },
    { id: 'atoms', label: 'Use the Atom Builder', x: 10.4, z: 0, color: 0xff6ad5 },
  ];
  const cyl = (g, mat, rt, rb, h, x, y, z, seg = 14) => { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); g.add(m); return m; };
  const glass = (c, o = 0.55) => new T.MeshLambertMaterial({ color: c, transparent: true, opacity: o });

  /* ====================================================================== the front, across the end of the path ====================================================================== */
  function buildFront(zone, actions) {
    const g = zone.group, { x0, x1, z0, z1, cz, height } = FRONT, cx = (x0 + x1) / 2, w = x1 - x0, d = z1 - z0, fx = x1 + 0.08;
    box(g, lambert(0xeef3f4), w, height, d, cx, height / 2, cz);                                              // pale walls
    box(g, lambert(0x1a8f8a), w + 0.2, 1.1, d + 0.2, cx, 0.55, cz);                                           // a teal plinth
    box(g, lambert(0x1a8f8a), w + 0.5, 0.45, d + 0.5, cx, height + 0.2, cz);                                  // and a teal roof edge
    // two tall windows either side of the door, and a window band across the top, with frames
    [[-5.4, 4.2], [5.4, 4.2]].forEach(([dz, wd]) => { box(g, lambert(0x2a3438), 0.14, 3.4, wd + 0.3, fx, 3.2, cz + dz); box(g, glass(0x8fd4ee, 0.7), 0.1, 3.1, wd, fx + 0.07, 3.2, cz + dz); box(g, lambert(0x2a3438), 0.16, 3.1, 0.12, fx + 0.1, 3.2, cz + dz); });
    box(g, lambert(0x2a3438), 0.14, 0.12, d * 0.94, fx, 5.0, cz); [-1, 1].forEach(s => box(g, glass(0x8fd4ee, 0.55), 0.1, 0.7, d * 0.4, fx + 0.07, 5.4, cz + s * d * 0.22));
    const name = makeSign({ w: 8.6, h: 1.6, title: 'SCIENCE LAB', sub: 'ELEMENTS  CELLS  ATOMS', fg: '#aaf2e6', bg: '#0b2b2b', border: '#4ad8c8', subColor: '#ffe29a' });
    name.position.set(fx + 0.12, 6.2, cz); name.rotation.y = Math.PI / 2; g.add(name);
    // a giant flask on the roof, glowing teal, with a few bubbles
    const flask = buildSymbol('flask', 0x4ad8c8, { emissive: 0.7 }); flask.scale.set(2.4, 2.4, 2.4); flask.position.set(x1 - 3.2, height + 2.9, cz); flask.rotation.y = Math.PI / 2; g.add(flask);
    // the doors, an awning, planters and a notice
    buildDoor(g, { x: x1 + 0.02, z: cz, rotY: Math.PI / 2, w: 3.2, h: 3.8, transom: true });
    box(g, lambert(0x1a8f8a), 1.6, 0.2, 5.4, x1 + 0.9, 4.3, cz); for (let z = cz - 2.4; z <= cz + 2.5; z += 0.8) box(g, glow(0xffffff), 0.1, 0.1, 0.1, x1 + 1.7, 4.15, z);
    [-3.6, 3.6].forEach(dz => { box(g, lambert(0x8a6a4a), 0.8, 0.5, 1.4, x1 + 0.6, 0.25, cz + dz); box(g, lambert(0x3f9a3a), 0.6, 0.5, 1.1, x1 + 0.6, 0.72, cz + dz); });
    const note = textPlane(1.5, 1.0, (c, cv) => { c.fillStyle = '#0b2b2b'; c.fillRect(0, 0, cv.width, cv.height); c.strokeStyle = '#4ad8c8'; c.lineWidth = 4; c.strokeRect(2, 2, cv.width - 4, cv.height - 4); c.fillStyle = '#e8fffb'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = PX_FONT(cv.height * 0.15); ['OPEN TO', 'ALL STUDENTS', 'Na  Fe  Au  Ag'].forEach((t, i) => c.fillText(t, cv.width / 2, cv.height * (0.28 + i * 0.22))); }, 70);
    note.position.set(fx + 0.04, 2.2, cz + 4.8); note.rotation.y = Math.PI / 2; g.add(note);
    flat(g, 'paving', 5, d - 1, x1 + 2.5, 0.04, cz);                                                         // a paved forecourt where the path meets the doors
    solid(zone, cx, cz, w, d);
    interact(zone, x1 + 2.6, cz, 2.4, 'Enter the Science Lab', actions.enterLab);
  }

  /* ====================================================================== pieces for the room ====================================================================== */
  const BENCH = lambert(0xdfe6e8), TOP = lambert(0x2f3a3e), STEEL = lambert(0xaab4b8);
  /** A lab bench, w along x and d along z: a steel frame and a dark worktop, solid. */
  function bench(zone, g, x, z, w, d, h = 1.0) {
    box(g, BENCH, w, h - 0.08, d - 0.1, x, (h - 0.08) / 2, z); box(g, TOP, w + 0.1, 0.1, d + 0.1, x, h, z); solid(zone, x, z, w + 0.1, d + 0.1);
  }
  /** A beaker, flask or bottle on a surface at (x, y, z): glass with coloured liquid in it. */
  function flaskAt(g, x, y, z, color, kind = 0) {
    if (kind === 0) { cyl(g, glass(0xd8f2ff, 0.45), 0.13, 0.13, 0.3, x, y + 0.15, z, 12); cyl(g, lambert(color), 0.11, 0.11, 0.17, x, y + 0.1, z, 12); }                                           // a beaker
    else if (kind === 1) { cyl(g, glass(0xd8f2ff, 0.45), 0.04, 0.17, 0.3, x, y + 0.15, z, 12); cyl(g, lambert(color), 0.03, 0.14, 0.14, x, y + 0.08, z, 12); cyl(g, glass(0xd8f2ff, 0.45), 0.04, 0.04, 0.12, x, y + 0.36, z, 10); }  // a flask
    else { cyl(g, glass(0x9fd8ee, 0.55), 0.07, 0.07, 0.28, x, y + 0.14, z, 10); cyl(g, lambert(color), 0.055, 0.055, 0.18, x, y + 0.1, z, 10); cyl(g, lambert(0x2a3438), 0.05, 0.05, 0.05, x, y + 0.3, z, 8); }                  // a bottle
  }
  /** A microscope on a bench top at (x, y, z), its eyepiece toward +z... turned by yaw. */
  function microscope(g, x, y, z, yaw) {
    const m = new T.Group(), ink = lambert(0x24282c), white = lambert(0xe8eef0);
    box(m, ink, 0.7, 0.1, 0.9, 0, 0.05, 0); box(m, white, 0.14, 1.15, 0.14, 0, 0.62, -0.28);                       // base and the upright arm
    box(m, white, 0.14, 0.14, 0.56, 0, 1.22, -0.02); const tube = box(m, white, 0.2, 0.7, 0.2, 0, 0.98, 0.2); tube.rotation.x = -0.45;      // the arm over to the tube, and the tube
    const eye = box(m, ink, 0.12, 0.18, 0.12, 0, 1.38, 0.4); eye.rotation.x = -0.45; box(m, ink, 0.1, 0.22, 0.1, 0, 0.7, 0.1);               // eyepiece and the objective lens
    box(m, STEEL, 0.5, 0.05, 0.4, 0, 0.5, 0.12); box(m, glow(0xfff2c0), 0.2, 0.02, 0.2, 0, 0.14, 0.1); box(m, lambert(0x2a6ac8), 0.08, 0.1, 0.18, 0.2, 0.48, -0.1);   // the stage, its lamp, a focus knob
    m.position.set(x, y, z); m.rotation.y = yaw; m.userData.kind = 'microscope'; g.add(m);
  }

  /* ====================================================================== the room inside ====================================================================== */
  function build(actions) {
    const zone = createZone('Science Lab', {
      spawn: { x: 0, z: 10.6, yaw: 0 },
      bounds: { minX: ROOM.minX + 0.6, maxX: ROOM.maxX - 0.6, minZ: ROOM.minZ + 0.6, maxZ: ROOM.maxZ - 0.6 },
      sky: 0xb9d6da, fog: [0xb9d6da, 40, 90], wander: { minX: -4, maxX: 4, minZ: -4, maxZ: 8 },
    });
    const g = zone.group, W = ROOM.maxX - ROOM.minX, D = ROOM.maxZ - ROOM.minZ, wall = lambert(0xbfdfe3), dado = lambert(0x1a8f8a);

    g.add(new T.HemisphereLight(0xf2fbff, 0x7f9aa0, 0.72)); g.add(new T.AmbientLight(0xffffff, 0.22));
    box(g, lambert(0xcfd9dc), W, 0.02, D, 0, 0.01, 0);                                                        // a pale grey tile floor: the tiles are a grid of thin lines
    for (let x = -W / 2 + 2; x < W / 2; x += 2) box(g, lambert(0xaab8bc), 0.04, 0.025, D, x, 0.012, 0);
    for (let z = -D / 2 + 2; z < D / 2; z += 2) box(g, lambert(0xaab8bc), W, 0.025, 0.04, 0, 0.012, z);
    box(g, wall, W, 6, 0.5, 0, 3, ROOM.minZ - 0.25); [-1, 1].forEach(s => box(g, wall, 0.5, 6, D + 1, s * (W / 2 + 0.25), 3, 0));
    [-1, 1].forEach(s => box(g, wall, (W - 3.6) / 2, 6, 0.5, s * ((W - 3.6) / 4 + 1.8), 3, ROOM.maxZ + 0.25)); box(g, wall, 3.7, 2.2, 0.5, 0, 4.9, ROOM.maxZ + 0.25);
    box(g, dado, W, 1.1, 0.12, 0, 0.55, ROOM.minZ + 0.06); [-1, 1].forEach(s => box(g, dado, 0.12, 1.1, D, s * (W / 2 - 0.06), 0.55, 0)); [-1, 1].forEach(s => box(g, dado, (W - 3.6) / 2, 1.1, 0.12, s * ((W - 3.6) / 4 + 1.8), 0.55, ROOM.maxZ - 0.06));
    box(g, lambert(0xf4f8f8), W + 1.2, 0.3, D + 1.2, 0, 6.15, 0); [[-9, -6], [0, -6], [9, -6], [-9, 4], [0, 4], [9, 4]].forEach(([x, z]) => box(g, glow(0xfffff0), 3.6, 0.06, 1.0, x, 5.98, z));
    buildDoor(g, { x: 0, z: ROOM.maxZ - 0.12, rotY: Math.PI, w: 3.2, h: 3.8, transom: true });
    interact(zone, 0, ROOM.maxZ - 2.0, 2.2, 'Leave the Science Lab', actions.leaveLab);

    /* ----- ELEMENT MATCH: the back wall is the periodic table, with a console under it ----- */
    const poster = textPlane(17.4, 4.8, (c, cv) => {
      const E = Elements, cols = 18, cw = cv.width / (cols + 0.6), rows = 10, ch = cv.height / (rows + 0.8), COLORS = { alkali: '#ff9a8a', alkaline: '#ffc98a', transition: '#ffe58a', post: '#c7e8a0', metalloid: '#8fe0c4', nonmetal: '#9ad4ff', halogen: '#c2b4ff', noble: '#f0a8e8', lanthanide: '#ffd0e8', actinide: '#e8c0a8' };
      c.fillStyle = '#0b2b2b'; c.fillRect(0, 0, cv.width, cv.height); c.textAlign = 'center'; c.textBaseline = 'middle';
      E.ALL.forEach(e => { const x = cw * 0.3 + (e.col - 1) * cw, y = ch * 0.4 + (e.row - 1) * ch; c.fillStyle = COLORS[e.family]; c.fillRect(x + 1, y + 1, cw - 2, ch - 2); c.fillStyle = '#10200c'; c.font = `bold ${Math.round(ch * 0.46)}px sans-serif`; c.fillText(e.symbol, x + cw / 2, y + ch * 0.58); c.font = `${Math.round(ch * 0.24)}px sans-serif`; c.fillText(String(e.z), x + cw * 0.3, y + ch * 0.22); });
      E.GAPS.forEach(gp => { const x = cw * 0.3 + (gp.col - 1) * cw, y = ch * 0.4 + (gp.row - 1) * ch; c.strokeStyle = '#fff'; c.setLineDash([4, 4]); c.strokeRect(x + 2, y + 2, cw - 4, ch - 4); c.setLineDash([]); c.fillStyle = '#fff'; c.font = `${Math.round(ch * 0.24)}px sans-serif`; c.fillText(gp.label, x + cw / 2, y + ch / 2); });
    }, 90);
    poster.position.set(0, 3.5, ROOM.minZ + 0.03); poster.userData.kind = 'periodic-table'; g.add(poster);
    bench(zone, g, 0, -9.7, 6.4, 1.2); box(g, lambert(0x24282c), 2.2, 1.3, 0.12, 0, 1.75, -10.0); box(g, glow(0x4ad8c8), 1.9, 1.0, 0.04, 0, 1.75, -9.93);   // a console with a screen
    box(g, lambert(0x24282c), 1.4, 0.05, 0.5, 0, 1.05, -9.3); [-1, 1].forEach(s => box(g, glow(0x7fe8d8), 0.2, 0.04, 0.2, s * 0.9, 1.07, -9.3));
    flaskAt(g, -2.4, 1.05, -9.8, 0xff9a62, 0); flaskAt(g, 2.5, 1.05, -9.8, 0x7ee06a, 1);

    /* ----- CELL LAB: a long bench along the west wall, with a big microscope and a poster of cells ----- */
    bench(zone, g, -13.4, 0, 1.6, 7.0); microscope(g, -13.3, 1.05, 0.2, Math.PI / 2); flaskAt(g, -13.4, 1.05, -2.4, 0xc260c9, 2); flaskAt(g, -13.4, 1.05, 2.6, 0xffe27a, 0);
    box(g, lambert(0xe8eef0), 0.5, 0.06, 0.4, -13.2, 1.08, -1.4); cyl(g, glass(0xd8f2ff, 0.5), 0.2, 0.2, 0.04, -13.2, 1.13, -1.4, 16);                                  // a petri dish
    const cellPoster = textPlane(5.0, 3.0, (c, cv) => { c.fillStyle = '#0f3a0b'; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = '#e0709b'; c.beginPath(); c.ellipse(cv.width * 0.5, cv.height * 0.56, cv.width * 0.42, cv.height * 0.36, 0, 0, 7); c.fill(); c.fillStyle = '#bfe8c9'; c.beginPath(); c.ellipse(cv.width * 0.5, cv.height * 0.56, cv.width * 0.39, cv.height * 0.33, 0, 0, 7); c.fill(); c.fillStyle = '#9b7bd6'; c.beginPath(); c.ellipse(cv.width * 0.5, cv.height * 0.56, cv.width * 0.13, cv.height * 0.12, 0, 0, 7); c.fill(); c.fillStyle = '#ff9a62'; [[0.25, 0.45], [0.74, 0.65]].forEach(([x, y]) => { c.beginPath(); c.ellipse(cv.width * x, cv.height * y, cv.width * 0.07, cv.height * 0.045, 0.4, 0, 7); c.fill(); }); c.fillStyle = '#e8fffb'; c.textAlign = 'center'; c.font = PX_FONT(cv.height * 0.12); c.fillText('THE CELL', cv.width / 2, cv.height * 0.13); }, 70);
    cellPoster.position.set(ROOM.minX + 0.04, 3.6, 0); cellPoster.rotation.y = Math.PI / 2; g.add(cellPoster);

    /* ----- ATOM BUILDER: a bench along the east wall, with a model atom hovering over it ----- */
    bench(zone, g, 13.4, 0, 1.6, 7.0);
    const atom = new T.Group(); atom.position.set(12.9, 2.9, 0); atom.userData.kind = 'atom'; g.add(atom);
    [[0, 0, 0, 0xe0453a], [0.13, 0.05, 0.05, 0x4a7bff], [-0.1, 0.1, -0.05, 0xe0453a], [0.03, -0.12, 0.1, 0x4a7bff], [-0.05, -0.04, -0.14, 0xe0453a], [0.1, -0.05, -0.1, 0x4a7bff]].forEach(([x, y, z, col]) => box(atom, glow(col), 0.2, 0.2, 0.2, x, y, z));
    const electrons = [];
    [[0.85, 0.0, 0.0], [1.25, 1.05, 0.5], [1.65, -1.0, 1.1]].forEach(([r, tx, tz], i) => {
      const ring = new T.Group(), torus = new T.Mesh(new T.TorusGeometry(r, 0.018, 6, 48), new T.MeshBasicMaterial({ color: 0xbfe8ff })); ring.add(torus); ring.rotation.set(Math.PI / 2 + tx * 0.35, 0, tz * 0.35); atom.add(ring);
      const e = new T.Mesh(new T.BoxGeometry(0.16, 0.16, 0.16), new T.MeshBasicMaterial({ color: 0xffd34a })); ring.add(e); electrons.push({ e, r, speed: 1.4 - i * 0.35, phase: i * 2.1 });
    });
    zone.animated.push((dt, t) => { electrons.forEach(o => { const a = t * o.speed + o.phase; o.e.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r, 0); }); atom.rotation.y += dt * 0.25; });
    box(g, lambert(0x24282c), 0.8, 0.5, 0.8, 13.0, 1.3, 0); box(g, glow(0xff6ad5), 0.5, 0.05, 0.5, 13.0, 1.57, 0);                                                             // its stand
    flaskAt(g, 13.4, 1.05, -2.8, 0x4a7bff, 1); flaskAt(g, 13.4, 1.05, 2.8, 0xff9a62, 0);
    const atomPoster = textPlane(4.4, 2.6, (c, cv) => { c.fillStyle = '#0b1a2b'; c.fillRect(0, 0, cv.width, cv.height); c.textAlign = 'center'; c.fillStyle = '#ffd34a'; c.font = PX_FONT(cv.height * 0.12); c.fillText('PROTON  NEUTRON  ELECTRON', cv.width / 2, cv.height * 0.14); c.fillStyle = '#e0453a'; c.beginPath(); c.arc(cv.width * 0.22, cv.height * 0.58, cv.height * 0.13, 0, 7); c.fill(); c.fillStyle = '#4a7bff'; c.beginPath(); c.arc(cv.width * 0.5, cv.height * 0.58, cv.height * 0.13, 0, 7); c.fill(); c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(cv.width * 0.78, cv.height * 0.58, cv.height * 0.07, 0, 7); c.fill(); c.fillStyle = '#e8fffb'; c.font = PX_FONT(cv.height * 0.1); ['+', '0', '\u2212'].forEach((t, i) => c.fillText(t, cv.width * [0.22, 0.5, 0.78][i], cv.height * 0.88)); }, 70);
    atomPoster.position.set(ROOM.maxX - 0.04, 3.7, 0); atomPoster.rotation.y = -Math.PI / 2; g.add(atomPoster);

    /* ----- the rest of the room: two lab tables with glassware, shelves of bottles, a fume hood, a clock, a safety poster ----- */
    [[-5, 4], [5, 4]].forEach(([x, z], k) => { bench(zone, g, x, z, 5.0, 1.6); for (let i = 0; i < 5; i++) flaskAt(g, x - 1.9 + i * 0.95, 1.05, z + (i % 2 ? 0.25 : -0.25), [0xff9a62, 0x7ee06a, 0x4a7bff, 0xc260c9, 0xffe27a][(i + k) % 5], (i + k) % 3); });
    box(g, STEEL, 3.2, 0.08, 0.5, -10.6, 2.6, ROOM.minZ + 0.35); box(g, STEEL, 3.2, 0.08, 0.5, -10.6, 3.5, ROOM.minZ + 0.35); box(g, STEEL, 3.2, 0.08, 0.5, 10.6, 2.6, ROOM.minZ + 0.35); box(g, STEEL, 3.2, 0.08, 0.5, 10.6, 3.5, ROOM.minZ + 0.35);
    [-10.6, 10.6].forEach(x => [2.62, 3.52].forEach((y, r) => { for (let i = 0; i < 6; i++) flaskAt(g, x - 1.3 + i * 0.52, y, ROOM.minZ + 0.35, [0xff9a62, 0x7ee06a, 0x4a7bff, 0xc260c9, 0xffe27a, 0xff6ad5][(i + r) % 6], 2); }));
    box(g, STEEL, 2.6, 2.8, 1.2, 6.8, 1.4, ROOM.minZ + 0.7); box(g, glass(0x9fd8ee, 0.5), 2.2, 1.4, 0.06, 6.8, 1.6, ROOM.minZ + 1.32); solid(zone, 6.8, ROOM.minZ + 0.7, 2.6, 1.2);       // a fume hood
    Clock.live(zone, { x: 12.4, y: 4.9, z: ROOM.minZ + 0.04, size: 1.6 });                                           // the lab's clock shows the real time too, with every hour labelled
    interact(zone, 12.4, ROOM.minZ + 1.6, 2.2, 'Read the lab clock', () => actions.openTable('clock'));
    const safety = textPlane(1.6, 2.1, (c, cv) => { c.fillStyle = '#ffd34a'; c.fillRect(0, 0, cv.width, cv.height); c.fillStyle = '#10200c'; c.textAlign = 'center'; c.font = PX_FONT(cv.height * 0.13); ['SAFETY', 'FIRST', '', 'GOGGLES', 'ON'].forEach((t, i) => c.fillText(t, cv.width / 2, cv.height * (0.2 + i * 0.16))); }, 60);
    safety.position.set(ROOM.minX + 0.04, 3.7, 7.4); safety.rotation.y = Math.PI / 2; g.add(safety);

    STATIONS.forEach(s => interact(zone, s.x, s.z, 2.4, s.label, () => actions.openTable(s.id)));
    return zone;
  }

  return { buildFront, build, FRONT, EXIT, ROOM, STATIONS };
})();
