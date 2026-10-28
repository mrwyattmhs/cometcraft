/* Procedural 16x16 pixel textures. All art is generated in code, so there are
   no image files to license and nothing from any other game. */
const Tex = (() => {
  const clamp = v => Math.max(0, Math.min(255, v | 0));

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const px = (g, color, list) => { g.fillStyle = color; list.forEach(([x, y, w = 1, h = 1]) => g.fillRect(x, y, w, h)); };

  const DEFS = {
    grass: { base: [98, 164, 62], v: 16 },
    dirt: { base: [120, 86, 56], v: 14 },
    stone: { base: [128, 128, 132], v: 12 },
    path: { base: [178, 166, 130], v: 14 },
    leaves: { base: [50, 126, 46], v: 36 },
    felt: { base: [22, 112, 64], v: 5 },
    feltRed: { base: [150, 28, 42], v: 5 },
    feltBlue: { base: [28, 70, 150], v: 5 },
    feltPurple: { base: [96, 46, 150], v: 5 },
    feltTeal: { base: [18, 98, 104], v: 5 },
    feltIron: { base: [74, 80, 90], v: 5 },
    feltGold: { base: [160, 108, 24], v: 5 },
    ceiling: { base: [26, 18, 40], v: 4 },
    wood: { base: [86, 54, 34], v: 8 },
    planks: {
      base: [178, 136, 84], v: 8,
      draw: g => {
        px(g, 'rgba(50,30,10,.5)', [[0, 0, 16, 1], [0, 4, 16, 1], [0, 8, 16, 1], [0, 12, 16, 1]]);
        px(g, 'rgba(50,30,10,.35)', [[5, 1, 1, 3], [11, 5, 1, 3], [3, 9, 1, 3], [9, 13, 1, 3]]);
      },
    },
    brick: {
      base: [160, 74, 62], v: 10,
      draw: g => {
        g.fillStyle = 'rgba(215,205,190,.85)';
        for (let row = 0; row < 4; row++) {
          g.fillRect(0, row * 4, 16, 1);
          const off = (row % 2) * 4;
          g.fillRect(off % 16, row * 4, 1, 4);
          g.fillRect((off + 8) % 16, row * 4, 1, 4);
        }
      },
    },
    log: {
      base: [104, 78, 48], v: 10,
      draw: g => px(g, 'rgba(40,25,10,.35)', [[2, 0, 1, 16], [6, 0, 1, 16], [7, 0, 1, 16], [11, 0, 1, 16], [14, 0, 1, 16]]),
    },
    carpet: {
      base: [118, 18, 46], v: 6,
      draw: g => {
        const pts = [[0, -3], [-1, -2], [1, -2], [-2, -1], [2, -1], [-3, 0], [3, 0], [-2, 1], [2, 1], [-1, 2], [1, 2], [0, 3]];
        px(g, 'rgba(236,192,72,.85)', pts.map(([dx, dy]) => [8 + dx, 8 + dy]));
      },
    },
    asphalt: { base: [58, 60, 66], v: 7 },
    // the casino's grand hall: cream and green-black marble in a checkerboard (a 32 px tile spans 2 blocks, so each square is one block)
    marbleCheck: {
      size: 32, span: 2, base: [238, 231, 216], v: 4,
      draw: g => {
        g.fillStyle = 'rgb(36,48,44)'; g.fillRect(16, 0, 16, 16); g.fillRect(0, 16, 16, 16);
        px(g, 'rgba(255,255,255,.10)', [[18, 3, 3, 1], [25, 9, 2, 1], [3, 20, 4, 1], [10, 27, 2, 1], [22, 5, 1, 4], [5, 24, 1, 3]]);   // pale flecks in the dark squares
        px(g, 'rgba(176,150,112,.40)', [[2, 3, 6, 1], [6, 4, 1, 5], [3, 11, 7, 1], [20, 19, 6, 1], [24, 20, 1, 6], [19, 28, 7, 1]]);      // veins in the cream ones
        px(g, 'rgba(110,92,60,.55)', [[0, 0, 32, 1], [0, 16, 32, 1], [0, 0, 1, 32], [16, 0, 1, 32]]);                                       // grout
      },
    },
    // veined cream marble for columns and the fountain
    marble: {
      base: [238, 234, 226], v: 3,
      draw: g => px(g, 'rgba(150,140,128,.32)', [[2, 0, 1, 7], [3, 7, 1, 5], [4, 12, 1, 4], [11, 0, 1, 4], [12, 4, 1, 8], [13, 12, 1, 4]]),
    },
    // dark green marble with gold veins, in panels, for the lower walls
    marbleDark: {
      base: [30, 52, 46], v: 5,
      draw: g => {
        px(g, 'rgba(214,184,104,.30)', [[3, 0, 1, 5], [4, 5, 1, 4], [5, 9, 1, 3], [11, 6, 1, 4], [12, 10, 1, 5]]);
        px(g, 'rgba(0,0,0,.40)', [[0, 0, 16, 1], [0, 0, 1, 16]]);
      },
    },
    // cream walls in gilded panels
    wallGild: {
      base: [226, 208, 172], v: 4,
      draw: g => { px(g, 'rgba(168,128,52,.55)', [[0, 0, 1, 16], [15, 0, 1, 16]]); px(g, 'rgba(168,128,52,.45)', [[6, 7, 4, 2]]); },
    },
    // a cream coffered ceiling
    ceilingCream: { base: [238, 228, 206], v: 3, draw: g => px(g, 'rgba(170,140,90,.35)', [[0, 0, 16, 1], [0, 0, 1, 16]]) },
    // royal blue carpet with a gold diamond, for the graphing wing (the factoring wing keeps the red one)
    carpetBlue: {
      base: [20, 38, 104], v: 6,
      draw: g => {
        const pts = [[0, -3], [-1, -2], [1, -2], [-2, -1], [2, -1], [-3, 0], [3, 0], [-2, 1], [2, 1], [-1, 2], [1, 2], [0, 3]];
        px(g, 'rgba(226,200,120,.85)', pts.map(([dx, dy]) => [8 + dx, 8 + dy]));
      },
    },
    // deep green carpet with a gold diamond, for the Polynomials wing (north)
    carpetGreen: {
      base: [16, 72, 50], v: 6,
      draw: g => {
        const pts = [[0, -3], [-1, -2], [1, -2], [-2, -1], [2, -1], [-3, 0], [3, 0], [-2, 1], [2, 1], [-1, 2], [1, 2], [0, 3]];
        px(g, 'rgba(226,200,120,.85)', pts.map(([dx, dy]) => [8 + dx, 8 + dy]));
      },
    },
    // native blue limestone laid in courses, with the joints staggered row to row (Wilson Hall's walls)
    limestone: {
      base: [116, 132, 150], v: 7,
      draw: g => px(g, 'rgba(66,80,96,.7)', [[0, 0, 16, 1], [0, 4, 16, 1], [0, 8, 16, 1], [0, 12, 16, 1], [0, 1, 1, 3], [8, 1, 1, 3], [4, 5, 1, 3], [12, 5, 1, 3], [0, 9, 1, 3], [8, 9, 1, 3], [4, 13, 1, 3], [12, 13, 1, 3]]),
    },
    // red clay roof tile: rows of overlapping tiles
    redTile: {
      base: [170, 68, 50], v: 8,
      draw: g => { px(g, 'rgba(255,170,140,.2)', [[0, 0, 16, 1], [0, 4, 16, 1], [0, 8, 16, 1], [0, 12, 16, 1]]); px(g, 'rgba(84,26,20,.6)', [[0, 3, 16, 1], [0, 7, 16, 1], [0, 11, 16, 1], [0, 15, 16, 1], [4, 0, 1, 3], [12, 0, 1, 3], [0, 4, 1, 3], [8, 4, 1, 3], [4, 8, 1, 3], [12, 8, 1, 3], [0, 12, 1, 3], [8, 12, 1, 3]]); },
    },
    // the checkered hallway floor
    hallTile: { base: [228, 216, 190], v: 3, draw: g => px(g, 'rgba(140,108,76,.38)', [[0, 0, 8, 8], [8, 8, 8, 8]]) },
    // grey flagstones laid in a brick pattern, for the path around the school
    flagstone: {
      base: [164, 160, 152], v: 9,
      draw: g => px(g, 'rgba(78,74,68,.6)', [[0, 0, 16, 1], [0, 8, 16, 1], [0, 0, 1, 8], [8, 8, 1, 8]]),
    },
    paving: {
      base: [206, 196, 176], v: 6,
      draw: g => px(g, 'rgba(120,108,90,.35)', [[0, 0, 16, 1], [0, 8, 16, 1], [0, 0, 1, 16], [8, 0, 1, 16]]),
    },
    // sandstone hotel wall: one window per 2 x 2 blocks (a 32 px tile that spans 2 blocks)
    hotel: {
      size: 32, span: 2, base: [214, 192, 152], v: 5,
      draw: g => {
        px(g, 'rgba(120,98,64,.30)', [[0, 31, 32, 1], [0, 0, 32, 1]]);                 // floor lines
        px(g, '#efe3c4', [[7, 4, 18, 24]]);                                            // cream frame
        px(g, '#27406a', [[8, 5, 16, 22]]);                                            // glass
        px(g, '#4d78ad', [[9, 6, 3, 6], [12, 6, 2, 3]]);                               // reflection
        px(g, '#efe3c4', [[15, 5, 2, 22], [8, 15, 16, 2]]);                            // mullions
        px(g, '#a8946a', [[6, 28, 20, 2]]);                                            // sill
      },
    },
    // the casino tower after the Bellagio: warm cream stucco with pairs of tall bronze-glass windows in pale frames, one floor per 2 x 2 blocks
    bellagio: {
      size: 32, span: 2, base: [246, 236, 208], v: 4,
      draw: g => {
        px(g, '#dccfa6', [[0, 28, 32, 3]]);                                            // a tan band between floors
        px(g, 'rgba(150,128,92,.4)', [[0, 31, 32, 1], [0, 0, 32, 1]]);                 // the floor lines
        [4, 18].forEach(x => {
          px(g, '#fdf7e4', [[x - 1, 4, 12, 24]]);                                      // a pale frame
          px(g, '#3d2f26', [[x, 5, 10, 22]]);                                          // bronze glass
          px(g, '#6a543f', [[x + 1, 6, 3, 8]]);                                        // a glint of sky
          px(g, '#b8a47a', [[x - 1, 27, 12, 1]]);                                      // the sill
        });
      },
    },
    // the low arcade at the foot of the tower: arched bronze windows between cream piers, on a tan plinth
    bellagioBase: {
      size: 32, span: 2, base: [240, 224, 188], v: 4,
      draw: g => {
        px(g, '#d4c093', [[0, 28, 32, 4]]);                                            // the plinth
        px(g, '#fbf2d8', [[6, 7, 20, 22]]);                                            // the frame
        px(g, '#3d2f26', [[8, 12, 16, 16], [10, 10, 12, 2], [12, 9, 8, 1]]);           // the arched glass
        px(g, '#6a543f', [[9, 13, 4, 7]]);                                             // a glint
        px(g, '#fbf2d8', [[15, 12, 2, 16]]);                                           // the mullion
        px(g, '#c9a24a', [[14, 6, 4, 2]]);                                             // a gold keystone
      },
    },
    // terracotta roof tile, a little more orange than the clay of the old buildings: rows of overlapping tiles
    terracotta: {
      base: [190, 106, 64], v: 8,
      draw: g => { px(g, 'rgba(255,196,150,.22)', [[0, 0, 16, 1], [0, 4, 16, 1], [0, 8, 16, 1], [0, 12, 16, 1]]); px(g, 'rgba(96,46,22,.55)', [[0, 3, 16, 1], [0, 7, 16, 1], [0, 11, 16, 1], [0, 15, 16, 1], [4, 0, 1, 3], [12, 0, 1, 3], [0, 4, 1, 3], [8, 4, 1, 3], [4, 8, 1, 3], [12, 8, 1, 3], [0, 12, 1, 3], [8, 12, 1, 3]]); },
    },
    // red-brick school wall: 64 px = 4 x 4 blocks = one story, with two tall windows per story
    schoolBrick: {
      size: 64, span: 4, base: [158, 72, 60], v: 9,
      draw: g => {
        g.fillStyle = 'rgba(222,210,192,.8)';
        for (let row = 0; row < 16; row++) {
          g.fillRect(0, row * 4, 64, 1);
          for (let x = (row % 2) * 8; x < 64; x += 16) g.fillRect(x, row * 4, 1, 4);
        }
        [6, 38].forEach(x0 => {
          px(g, '#f1efe8', [[x0, 17, 20, 30]]);                                   // white frame
          px(g, '#9cc6e8', [[x0 + 2, 19, 16, 26]]);                               // glass
          px(g, '#c9e4f6', [[x0 + 3, 20, 3, 8], [x0 + 6, 20, 2, 3]]);            // glint
          px(g, '#f1efe8', [[x0 + 9, 19, 2, 26], [x0 + 2, 31, 16, 2]]);          // mullions
          px(g, '#cfc9bb', [[x0 - 1, 47, 22, 2]]);                                // sill
        });
      },
    },
    schoolWall: {
      base: [236, 228, 204], v: 3,
      draw: g => px(g, 'rgba(150,138,110,.12)', [[4, 0, 1, 16], [12, 0, 1, 16]]),
    },
    schoolCeiling: { base: [238, 236, 228], v: 2 },
    // the one building block: warm wood with a darker edge, so stacked blocks read as separate cubes
    buildBlock: {
      base: [232, 184, 104], v: 5,
      draw: g => {
        px(g, 'rgba(110,70,25,.7)', [[0, 0, 16, 1], [0, 15, 16, 1], [0, 0, 1, 16], [15, 0, 1, 16]]);
        px(g, 'rgba(255,240,200,.35)', [[1, 1, 14, 1], [1, 1, 1, 14]]);
        px(g, 'rgba(120,80,30,.25)', [[2, 14, 13, 1], [14, 2, 1, 13]]);
      },
    },
    // sand with a faint line at every block edge, so you can see the grid you are building on
    sand: { base: [232, 214, 160], v: 7, draw: g => px(g, 'rgba(150,125,70,.5)', [[0, 0, 16, 1], [0, 0, 1, 16]]) },
    chalkTop: {
      base: [40, 88, 62], v: 5,
      draw: g => px(g, 'rgba(255,255,255,.11)', [[2, 3, 6, 1], [9, 9, 5, 1], [4, 12, 7, 1], [11, 2, 3, 1]]),   // faint chalk scribbles
    },
    wallDark: {
      base: [50, 33, 74], v: 6,
      draw: g => {
        g.fillStyle = 'rgba(255,255,255,.07)';
        for (let x = 0; x < 16; x += 4) g.fillRect(x, 0, 1, 16);
        px(g, 'rgba(0,0,0,.25)', [[0, 15, 16, 1]]);
      },
    },
  };

  const canvases = {};
  const mats = new Map();

  function paint(name) {
    if (canvases[name]) return canvases[name];
    const def = DEFS[name];
    const s = def.size || 16;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const r = rng([...name].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const v = (r() - 0.5) * 2 * def.v;
        g.fillStyle = `rgb(${clamp(def.base[0] + v)},${clamp(def.base[1] + v)},${clamp(def.base[2] + v)})`;
        g.fillRect(x, y, 1, 1);
      }
    }
    if (def.draw) def.draw(g, s);
    return (canvases[name] = c);
  }

  /** Lit material whose texture repeats rx by ry times (keeps pixel density equal across box sizes). */
  function mat(name, rx = 1, ry = 1) {
    const key = `${name}|${rx}|${ry}`;
    if (mats.has(key)) return mats.get(key);
    const t = new THREE.CanvasTexture(paint(name));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    const span = DEFS[name].span || 1;   // a tile that covers several blocks repeats less often
    t.repeat.set(rx / span, ry / span);
    const m = new THREE.MeshLambertMaterial({ map: t });
    mats.set(key, m);
    return m;
  }

  return { mat, has: name => name in DEFS };
})();
