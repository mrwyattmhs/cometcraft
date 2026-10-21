/* The map of the United States: outlines, "which state is under this point?", the question deck for the click-the-state
   game, and one drawing routine shared by the wall map in the classroom and the game board. No DOM here, so it is
   tested in Node (tests/usmap.test.js). The outlines come from usmap-data.js (made by tools/build-usmap.js).

   Coordinates are map units on a frame sized to fit every outline (WIDTH x HEIGHT), with Alaska and Hawaii in their inset boxes. */
const USMap = (() => {
  const BUILD = 20; // bump together with the ?v= numbers in index.html
  const E = typeof Economy !== 'undefined' ? Economy : require('./economy.js');
  const REWARD = E.PAY.map; // chips for finding a state on the first try (economy.js)
  const Data = typeof USMapData !== 'undefined' ? USMapData : require('./usmap-data.js');
  const WIDTH = Data.width, HEIGHT = Data.height;

  /** Pastel classroom-map colors. Bordering states never match (the data guarantees it). */
  const PALETTE = ['#f6b0c8', '#a8d8f0', '#cdb8f0', '#f9c48a', '#e8dcc0'];

  /** Unpack the data: absolute map coordinates, plus a bounding box for quick rejection. */
  const states = Data.states.map(s => {
    const rings = s.rings.map(r => {
      const pts = [r[0] / 10, r[1] / 10];
      for (let i = 2; i < r.length; i += 2) pts.push(pts[i - 2] + r[i] / 10, pts[i - 1] + r[i + 1] / 10);
      return pts;
    });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    rings.forEach(r => { for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); } });
    return { code: s.code, name: s.name, isState: s.state, color: s.color, cx: s.cx, cy: s.cy, ax: s.ax, ay: s.ay, rings, box: [x0, y0, x1, y1] };   // (ax, ay) is the deepest spot inside: where a label goes
  });
  const byCode = Object.fromEntries(states.map(s => [s.code, s]));
  /** The fifty states (the list the game asks about); D.C. is on the map but is not a state. */
  const STATES = states.filter(s => s.isState);

  /** Is this point inside the state? A point is inside if a ray from it crosses its outlines an odd number of times. */
  function contains(state, x, y) {
    const b = state.box;
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
    let inside = false;
    state.rings.forEach(r => {
      for (let i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) {
        const xi = r[i * 2], yi = r[i * 2 + 1], xj = r[j * 2], yj = r[j * 2 + 1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      }
    });
    return inside;
  }

  /** How far the point is from the state's outline. */
  function distanceTo(state, x, y) {
    let best = Infinity;
    state.rings.forEach(r => {
      for (let i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) {
        const ax = r[j * 2], ay = r[j * 2 + 1], bx = r[i * 2], by = r[i * 2 + 1];
        const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
        const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
        best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
      }
    });
    return best;
  }

  /** The state at a point. With tol > 0, a click that just misses (a coastline, a tiny state like Rhode Island) still
      counts for the nearest state within tol map units. */
  function pick(x, y, tol = 0) {
    for (const s of states) if (contains(s, x, y)) return s;
    if (tol <= 0) return null;
    let best = null, bestD = tol;
    states.forEach(s => {
      const b = s.box;
      if (x < b[0] - tol || x > b[2] + tol || y < b[1] - tol || y > b[3] + tol) return;
      const d = distanceTo(s, x, y);
      if (d < bestD) { bestD = d; best = s; }
    });
    return best;
  }

  /** The questions. Every state comes up once before any repeats; a state you missed comes back after a few more. */
  function createDeck(rng = Math.random) {
    const all = STATES.map(s => s.code);
    let pile = [], last = null;
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return {
      /** The next state's code. */
      next() {
        if (!pile.length) {
          pile = shuffle(all.slice());
          if (pile[pile.length - 1] === last) [pile[0], pile[pile.length - 1]] = [pile[pile.length - 1], pile[0]];   // never the same twice in a row
        }
        last = pile.pop();
        return last;
      },
      /** Ask this one again soon. */
      missed(code) {
        const at = pile.indexOf(code);
        if (at >= 0) pile.splice(at, 1);
        pile.splice(Math.max(0, pile.length - 4), 0, code);
      },
      remaining: () => pile.length,
    };
  }

  /** Draw the map. opts: scale and (dx, dy) to place it; fill(state) gives a color; stroke and lineWidth for borders;
      outline: { code: color } to draw extra-thick outlines on chosen states (drawn last, on top). */
  function draw(ctx, opts = {}) {
    const { scale = 1, dx = 0, dy = 0, fill = s => PALETTE[s.color], stroke = '#5a4a3a', lineWidth = 1, outline = null } = opts;
    const trace = s => {
      ctx.beginPath();
      s.rings.forEach(r => { ctx.moveTo(dx + r[0] * scale, dy + r[1] * scale); for (let i = 2; i < r.length; i += 2) ctx.lineTo(dx + r[i] * scale, dy + r[i + 1] * scale); ctx.closePath(); });
    };
    ctx.lineJoin = 'round';
    states.forEach(s => { trace(s); ctx.fillStyle = fill(s); ctx.fill('evenodd'); ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); });
    if (outline) Object.entries(outline).forEach(([code, color]) => { const s = byCode[code]; if (!s) return; trace(s); ctx.strokeStyle = color; ctx.lineWidth = lineWidth * 3; ctx.stroke(); });
  }

  return { BUILD, REWARD, WIDTH, HEIGHT, PALETTE, states, STATES, byCode, contains, distanceTo, pick, createDeck, draw };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = USMap;
