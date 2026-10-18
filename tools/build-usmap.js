/* Builds js/usmap-data.js: the 50 states (plus D.C.) as simplified outlines for the map on the Academy wall and the
   "click the state" game.

   Run it from the project folder:
     npm install us-atlas topojson-client topojson-simplify     (somewhere outside the game: these are build tools only)
     NODE_PATH=<that folder>/node_modules node tools/build-usmap.js

   Source: us-atlas "states-albers-10m" (ISC license), made from US Census Bureau boundaries and already projected with
   Alaska and Hawaii in their usual inset boxes on a map sized to fit them. Neighbouring states share their borders, so the
   outlines are thinned out together and never leave gaps or overlap. Each state also gets a color (0 to 4) chosen so no
   two bordering states match, and a spot for its label. */
const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');
const simplify = require('topojson-simplify');
const topo = require('us-atlas/states-albers-10m.json');

const MIN_WEIGHT = Number(process.env.MIN_WEIGHT || 0.6);   // 0.6 keeps the small states crisp when you zoom in   // bigger = fewer points
const CODES = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY',
  Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
};

const thin = simplify.simplify(simplify.presimplify(topo), MIN_WEIGHT);
const feats = topojson.feature(thin, thin.objects.states).features;
const nbrs = topojson.neighbors(thin.objects.states.geometries);

// colors: DSATUR order, and each state takes the allowed color that has been used least, so all five show up evenly
const n = feats.length, color = Array(n).fill(-1), used = Array(5).fill(0);
for (let step = 0; step < n; step++) {
  let best = -1, bestSat = -1, bestDeg = -1;
  for (let i = 0; i < n; i++) {
    if (color[i] >= 0) continue;
    const sat = new Set(nbrs[i].map(j => color[j]).filter(c => c >= 0)).size;
    if (sat > bestSat || (sat === bestSat && nbrs[i].length > bestDeg)) { best = i; bestSat = sat; bestDeg = nbrs[i].length; }
  }
  const taken = new Set(nbrs[best].map(j => color[j]));
  let pick = -1;
  for (let c = 0; c < 5; c++) if (!taken.has(c) && (pick < 0 || used[c] < used[pick])) pick = c;
  if (pick < 0) throw new Error('needed more than 5 colors');
  color[best] = pick; used[pick]++;
}
const colorsUsed = Math.max(...color) + 1;
if (colorsUsed > 5) throw new Error(`needed ${colorsUsed} colors`);

const area = r => { let a = 0; for (let i = 0, m = r.length; i < m; i++) { const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % m]; a += x0 * y1 - x1 * y0; } return a / 2; };
const centroid = r => { let a = 0, cx = 0, cy = 0; for (let i = 0, m = r.length; i < m; i++) { const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % m]; const f = x0 * y1 - x1 * y0; a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f; } a /= 2; return [cx / (6 * a), cy / (6 * a)]; };

// size the frame to everything on it: Alaska's Aleutian Islands reach past the left edge of the source map
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
feats.forEach(f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).forEach(poly => poly.forEach(ring => ring.forEach(([x, y]) => {
  minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}))));
const PAD = 6, ox = PAD - minX, oy = PAD - minY;
const WIDTH = Math.ceil(maxX - minX + 2 * PAD), HEIGHT = Math.ceil(maxY - minY + 2 * PAD);

// the deepest spot inside a state (the point farthest from every border): guaranteed inside with room around it, which an average point is not for a concave shape
const inside = (rings, x, y) => { let c = false; rings.forEach(r => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } }); return c; };
const edgeDist = (rings, x, y) => { let best = Infinity; rings.forEach(r => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, ay] = r[j], [bx, by] = r[i]; const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } }); return best; };
function deepest(rings) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  rings.forEach(r => r.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  const step = Math.max(0.25, Math.min(1, Math.max(x1 - x0, y1 - y0) / 120));
  let best = null, bestD = -1;
  for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) { if (!inside(rings, x, y)) continue; const d = edgeDist(rings, x, y); if (d > bestD) { bestD = d; best = [x, y]; } }
  return best;
}

let points = 0;
const states = feats.map((f, i) => {
  const name = f.properties.name, code = CODES[name];
  if (!code) throw new Error(`no code for ${name}`);
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  // each ring is [x0, y0, dx, dy, dx, dy, ...] in tenths of a map unit: small numbers, small file
  const rings = [];
  let biggest = null;
  polys.forEach(poly => poly.forEach((ring, k) => {
    const pts = ring.slice(0, -1);            // the last point repeats the first
    if (pts.length < 3) return;
    if (k === 0 && (!biggest || Math.abs(area(pts)) > Math.abs(area(biggest)))) biggest = pts;
    const q = pts.map(([x, y]) => [Math.round((x + ox) * 10), Math.round((y + oy) * 10)]);
    const out = [q[0][0], q[0][1]];
    for (let j = 1; j < q.length; j++) out.push(q[j][0] - q[j - 1][0], q[j][1] - q[j - 1][1]);
    rings.push(out); points += q.length;
  }));
  const [cx0, cy0] = centroid(biggest), cx = cx0 + ox, cy = cy0 + oy;
  const [ax, ay] = deepest(polys.flatMap(poly => poly.map(ring => ring.slice(0, -1).map(([x, y]) => [x + ox, y + oy]))));
  return { code, name, state: code !== 'DC', color: color[i], cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10, ax: Math.round(ax * 10) / 10, ay: Math.round(ay * 10) / 10, rings };
}).sort((a, b) => a.name.localeCompare(b.name));

const body = `/* GENERATED by tools/build-usmap.js: do not edit by hand.
   State outlines from us-atlas (ISC license), made from US Census Bureau boundaries, on a map sized to fit them.
   Each ring is [x0, y0, dx, dy, dx, dy, ...] in tenths of a map unit; color 0-4 is chosen so no two bordering states match. */
const USMapData = ${JSON.stringify({ width: WIDTH, height: HEIGHT, states }).replace(/\{"code"/g, '\n{"code"')};
`;
const out = path.join(__dirname, '..', 'js', 'usmap-data.js');
fs.writeFileSync(out, body + "if (typeof module !== 'undefined' && module.exports) module.exports = USMapData;\n");
console.log(`${WIDTH} x ${HEIGHT} frame, ${states.length} shapes, ${points} points (min weight ${MIN_WEIGHT}), ${colorsUsed} colors, ${(body.length / 1024).toFixed(1)} KB -> ${path.relative(process.cwd(), out)}`);
