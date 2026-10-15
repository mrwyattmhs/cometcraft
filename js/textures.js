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
    const s = 16;
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
    t.repeat.set(rx, ry);
    const m = new THREE.MeshLambertMaterial({ map: t });
    mats.set(key, m);
    return m;
  }

  return { mat, has: name => name in DEFS };
})();
