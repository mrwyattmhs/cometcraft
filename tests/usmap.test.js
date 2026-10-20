// Run with: node tests/usmap.test.js
const assert = require('assert');
const M = require('../js/usmap.js');
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

/* ---------- the right fifty states ---------- */
const NAMES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
const CODES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
assert.strictEqual(M.STATES.length, 50);
assert.deepStrictEqual(M.STATES.map(s => s.name), NAMES, 'all fifty, alphabetical');
assert.deepStrictEqual(M.STATES.map(s => s.code), CODES, 'with the right two-letter codes');
assert.strictEqual(M.states.length, 51);
const dc = M.byCode.DC; assert.ok(dc && dc.name === 'District of Columbia' && dc.isState === false, 'D.C. is on the map but is not a state');
assert.ok(!M.STATES.includes(dc), 'so the game never asks for it');
assert.strictEqual(new Set(M.states.map(s => s.code)).size, 51, 'no duplicate codes');
assert.strictEqual(M.REWARD, 5, 'finding a state pays 5 chips');
assert.ok(M.WIDTH > 1000 && M.WIDTH < 1060 && M.HEIGHT > 580 && M.HEIGHT < 640, `a frame of ${M.WIDTH} x ${M.HEIGHT}`);

/* ---------- the outlines are sane ---------- */
M.states.forEach(s => {
  assert.ok(s.rings.length >= 1);
  s.rings.forEach(r => {
    assert.ok(r.length >= 6 && r.length % 2 === 0, `${s.name}: a ring has at least 3 points`);
    r.forEach(v => assert.ok(Number.isFinite(v), `${s.name}: no NaN`));
    for (let i = 0; i < r.length; i += 2) assert.ok(r[i] >= 0 && r[i] <= M.WIDTH && r[i + 1] >= 0 && r[i + 1] <= M.HEIGHT, `${s.name} is entirely on the map, nothing cut off`);
  });
  assert.ok(s.box[0] < s.box[2] && s.box[1] < s.box[3]);
});
const w = s => s.box[2] - s.box[0];
assert.ok(w(M.byCode.TX) > 150 && w(M.byCode.RI) < 20 && w(M.byCode.TX) > 10 * w(M.byCode.RI), 'Texas is big and Rhode Island is small (its box includes Block Island)');
assert.ok(M.byCode.AK.box[0] < 10, "the Aleutian Islands reach the left edge instead of being cut off");
assert.ok(M.byCode.AK.box[2] < 0.3 * M.WIDTH && M.byCode.AK.box[1] > 0.7 * M.HEIGHT, 'Alaska is in the lower-left inset');
assert.ok(M.byCode.HI.box[2] < 0.45 * M.WIDTH && M.byCode.HI.box[1] > 0.9 * M.HEIGHT * 0.95 && M.byCode.HI.box[0] > M.byCode.AK.box[2] * 0.6, 'and Hawaii beside it');
assert.ok(M.byCode.WA.box[0] < M.byCode.ME.box[0] && M.byCode.WA.cy < M.byCode.FL.cy, 'Washington is west of Maine and north of Florida');
assert.ok(M.byCode.CA.cx < M.byCode.NY.cx && M.byCode.FL.cy > M.byCode.MN.cy);
const total = M.states.reduce((n, s) => n + s.rings.reduce((m, r) => m + r.length / 2, 0), 0);
assert.ok(total > 4000 && total < 9000, `${total} points: detailed enough and light enough`);

/* ---------- which state is at a point ---------- */
// the deepest spot inside each state: the point farthest from its border
function deepest(s) {
  let best = null, bestD = -1;
  for (let x = s.box[0]; x <= s.box[2]; x += 0.5) for (let y = s.box[1]; y <= s.box[3]; y += 0.5) {
    if (!M.contains(s, x, y)) continue;
    const d = M.distanceTo(s, x, y); if (d > bestD) { bestD = d; best = [x, y]; }
  }
  return { at: best, depth: bestD };
}
// every state carries a label spot that really is inside it, with room around it
M.states.forEach(s => { assert.ok(M.contains(s, s.ax, s.ay), `${s.name}: its label spot is inside it`); assert.strictEqual(M.pick(s.ax, s.ay).code, s.code); assert.ok(M.distanceTo(s, s.ax, s.ay) > 0.4, `${s.name}'s label spot is well inside, not on the edge`); });
// (for these outlines the average point happens to be inside every state too, but the deepest point is the safer spot for a label on any shape)
const inner = {};
M.states.forEach(s => {
  const d = deepest(s); assert.ok(d.at, `${s.name} has an inside`); inner[s.code] = d;
  const hit = M.pick(d.at[0], d.at[1]);
  assert.ok(hit && hit.code === s.code, `the middle of ${s.name} is ${s.name} (got ${hit && hit.name})`);
  M.states.forEach(o => { if (o !== s) assert.ok(!M.contains(o, d.at[0], d.at[1]), `${o.name} does not also contain the middle of ${s.name}`); });
});
// no point is ever inside two states: the borders are shared, so there are no overlaps
const rr = seeded(5); let overlap = 0, inside = 0;
for (let i = 0; i < 40000; i++) {
  const x = rr() * M.WIDTH, y = rr() * M.HEIGHT; let n = 0; M.states.forEach(s => { if (M.contains(s, x, y)) n++; });
  if (n > 1) overlap++; if (n === 1) inside++;
}
assert.strictEqual(overlap, 0, 'no overlaps between states');
assert.ok(inside > 40000 * 0.3, `most of the map is land (${inside} of 40000 samples)`);
assert.strictEqual(M.pick(5, 5), null, 'the ocean is nobody');
// forgiveness: a click that just misses the coast, or a tiny state, still counts
const ri = inner.RI;
assert.ok(ri.depth > 0.5, 'Rhode Island has an inside to click');
const coast = M.byCode.RI.box; const seaX = coast[2] + 2.5, seaY = (coast[1] + coast[3]) / 2;
assert.strictEqual(M.pick(seaX, seaY), null, 'just offshore is nobody if you are strict');
const forgiving = M.pick(seaX, seaY, 6); assert.ok(forgiving, 'but with a little forgiveness it counts for a nearby state'); assert.ok(['RI', 'MA', 'CT'].includes(forgiving.code), 'one of the three states there');
assert.strictEqual(M.pick(inner.DC.at[0], inner.DC.at[1]).code, 'DC');
// forgiveness never steals a click from the state you are inside
for (const code of ['RI', 'DE', 'CT', 'NJ', 'MD', 'NH', 'VT']) assert.strictEqual(M.pick(inner[code].at[0], inner[code].at[1], 8).code, code);

/* ---------- neighbors, read off the shared borders ---------- */
const edges = {};
M.states.forEach(s => s.rings.forEach(r => {
  const n = r.length / 2, key = i => `${Math.round(r[i * 2] * 10)},${Math.round(r[i * 2 + 1] * 10)}`;
  for (let i = 0; i < n; i++) { const a = key(i), b = key((i + 1) % n), e = a < b ? `${a}|${b}` : `${b}|${a}`; (edges[e] = edges[e] || new Set()).add(s.code); }
}));
const neighbors = {}; M.states.forEach(s => (neighbors[s.code] = new Set()));
Object.values(edges).forEach(set => { const l = [...set]; if (l.length === 2) { neighbors[l[0]].add(l[1]); neighbors[l[1]].add(l[0]); } });
const nb = c => [...neighbors[c]].sort().join(',');
assert.strictEqual(nb('OH'), 'IN,KY,MI,PA,WV', 'Ohio borders Indiana, Kentucky, Michigan, Pennsylvania and West Virginia');
assert.strictEqual(nb('TX'), 'AR,LA,NM,OK', 'Texas borders four states');
assert.strictEqual(nb('ME'), 'NH', 'Maine has one neighbor');
assert.strictEqual(nb('AK') + nb('HI'), '', 'Alaska and Hawaii touch no state');
assert.strictEqual(nb('MO'), 'AR,IA,IL,KS,KY,NE,OK,TN', 'Missouri touches eight');
assert.strictEqual(nb('TN'), 'AL,AR,GA,KY,MO,MS,NC,VA', 'so does Tennessee');
assert.strictEqual(nb('CO'), 'KS,NE,NM,OK,UT,WY', 'Colorado: six, and Arizona only meets it at a corner');
assert.strictEqual(nb('RI'), 'CT,MA', 'Rhode Island has two');
assert.strictEqual(nb('CA'), 'AZ,NV,OR', 'California has three');
assert.strictEqual(nb('DE'), 'MD,NJ,PA');
assert.ok(M.STATES.every(s => s.code === 'AK' || s.code === 'HI' || neighbors[s.code].size >= 1), 'every other state has a neighbor');
const borders = Object.values(neighbors).reduce((n, s) => n + s.size, 0) / 2;
assert.ok(borders > 100 && borders < 140, `${borders} borders between states and D.C.`);

/* ---------- colors: nobody matches a neighbor ---------- */
M.states.forEach(s => neighbors[s.code].forEach(o => assert.notStrictEqual(s.color, M.byCode[o].color, `${s.name} and ${M.byCode[o].name} border each other but share a color`)));
assert.strictEqual(M.PALETTE.length, 5);
const counts = [0, 0, 0, 0, 0]; M.states.forEach(s => { assert.ok(s.color >= 0 && s.color <= 4); counts[s.color]++; });
counts.forEach(n => assert.ok(n >= 8, `every color is used about equally (${counts})`));

/* ---------- the deck ---------- */
const deck = M.createDeck(seeded(11));
const drawn = []; for (let i = 0; i < 250; i++) drawn.push(deck.next());
for (let cycle = 0; cycle < 5; cycle++) assert.strictEqual(new Set(drawn.slice(cycle * 50, cycle * 50 + 50)).size, 50, `cycle ${cycle + 1}: all fifty states come up once before any repeats`);
drawn.forEach(c => assert.ok(M.byCode[c] && M.byCode[c].isState, 'only real states, never D.C.'));
drawn.forEach((c, i) => { if (i) assert.notStrictEqual(c, drawn[i - 1], 'never the same state twice in a row, even across a reshuffle'); });
assert.notDeepStrictEqual(drawn.slice(0, 50), drawn.slice(50, 100), 'each pass is shuffled differently');
assert.notDeepStrictEqual(drawn.slice(0, 50), [...drawn.slice(0, 50)].sort(), 'and not alphabetical');
assert.deepStrictEqual(drawn, (() => { const d = M.createDeck(seeded(11)); return Array.from({ length: 250 }, () => d.next()); })(), 'the same seed deals the same cards');
// a missed state comes back soon, but not right away, and only once
const d2 = M.createDeck(seeded(3)); const first = d2.next(); d2.missed(first);
const after = []; for (let i = 0; i < 8; i++) after.push(d2.next());
const back = after.indexOf(first);
assert.ok(back >= 1 && back <= 5, `a missed state returns after a few others (it came back at ${back + 1})`);
assert.strictEqual(after.filter(c => c === first).length, 1, 'once');
const d3 = M.createDeck(seeded(4)); const seen = new Set(); let n = 0;
while (n < 50) { const c = d3.next(); if (n === 10) d3.missed(c); seen.add(c); n++; }
assert.ok(d3.remaining() >= 0);
for (let i = 0; i < 400; i++) { const c = d3.next(); if (i % 7 === 0) d3.missed(c); assert.ok(M.byCode[c].isState); }
const d4 = M.createDeck(seeded(8)); let r0 = 51; for (let i = 0; i < 20; i++) { d4.next(); assert.ok(d4.remaining() < r0); r0 = d4.remaining(); }

/* ---------- drawing ---------- */
const ops = []; let fillStyle = null, strokeStyle = null;
const ctx = new Proxy({}, { get: (t, k) => k === 'fill' ? mode => ops.push({ type: 'fill', mode, color: fillStyle }) : k === 'stroke' ? () => ops.push({ type: 'stroke', color: strokeStyle })
  : k === 'fillStyle' ? fillStyle : (() => {}), set: (t, k, v) => { if (k === 'fillStyle') fillStyle = v; if (k === 'strokeStyle') strokeStyle = v; return true; } });
M.draw(ctx, { scale: 1.3 });
assert.strictEqual(ops.filter(o => o.type === 'fill').length, 51, 'every state is filled');
assert.ok(ops.filter(o => o.type === 'fill').every(o => o.mode === 'evenodd'), 'with the even-odd rule, so holes stay holes');
assert.strictEqual(new Set(ops.filter(o => o.type === 'fill').map(o => o.color)).size, 5, 'in five colors');
ops.length = 0; M.draw(ctx, { outline: { OH: '#00ff00', ZZ: '#000' } });
assert.strictEqual(ops.filter(o => o.type === 'stroke').length, 52, 'one extra outline for Ohio; an unknown code is ignored');
assert.strictEqual(ops[ops.length - 1].color, '#00ff00', 'drawn last, on top');
ops.length = 0; M.draw(ctx, { fill: s => (s.code === 'OH' ? 'gold' : 'gray') });
assert.deepStrictEqual(ops.filter(o => o.type === 'fill' && o.color === 'gold').length, 1, 'a custom fill can pick out one state');
console.log('us map tests passed');
