// Run with: node tests/elements.test.js
const assert = require('assert');
const E = require('../js/elements.js');
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ---------- the 118 elements ---------- */
assert.strictEqual(E.ALL.length, 118); E.ALL.forEach((e, i) => assert.strictEqual(e.z, i + 1));
assert.strictEqual(new Set(E.ALL.map(e => e.symbol)).size, 118, 'no two symbols the same'); assert.strictEqual(new Set(E.ALL.map(e => e.name)).size, 118, 'no two names the same');
E.ALL.forEach(e => { assert.ok(/^[A-Z][a-z]{0,2}$/.test(e.symbol), `${e.symbol} is a symbol`); assert.ok(/^[A-Z][a-z]+$/.test(e.name), `${e.name} is a name`); });
const S = { 1: 'H', 2: 'He', 6: 'C', 7: 'N', 8: 'O', 11: 'Na', 13: 'Al', 16: 'S', 19: 'K', 20: 'Ca', 26: 'Fe', 29: 'Cu', 47: 'Ag', 50: 'Sn', 53: 'I', 74: 'W', 79: 'Au', 80: 'Hg', 82: 'Pb', 92: 'U', 118: 'Og' };
for (const [z, sym] of Object.entries(S)) assert.strictEqual(E.byZ(Number(z)).symbol, sym, `element ${z} is ${sym}`);
assert.deepStrictEqual(['Iron', 'Gold', 'Silver', 'Lead', 'Sodium', 'Potassium', 'Tin', 'Mercury', 'Tungsten'].map(n => E.ALL.find(e => e.name === n).symbol), ['Fe', 'Au', 'Ag', 'Pb', 'Na', 'K', 'Sn', 'Hg', 'W'], 'the symbols that do not match their English names');
assert.strictEqual(E.bySymbol.Fe.name, 'Iron'); assert.strictEqual(E.bySymbol.Og.z, 118);

/* ---------- where each sits: group, period and drawn position ---------- */
const P = (z, g, p) => assert.deepStrictEqual([E.byZ(z).group, E.byZ(z).period], [g, p], `${E.byZ(z).name}: group ${g}, period ${p}`);
P(1, 1, 1); P(2, 18, 1); P(3, 1, 2); P(4, 2, 2); P(5, 13, 2); P(10, 18, 2); P(11, 1, 3); P(13, 13, 3); P(18, 18, 3); P(19, 1, 4); P(21, 3, 4); P(26, 8, 4); P(30, 12, 4); P(31, 13, 4); P(36, 18, 4);
P(37, 1, 5); P(47, 11, 5); P(54, 18, 5); P(55, 1, 6); P(56, 2, 6); P(72, 4, 6); P(79, 11, 6); P(86, 18, 6); P(87, 1, 7); P(88, 2, 7); P(104, 4, 7); P(118, 18, 7);
assert.deepStrictEqual([57, 58, 71, 89, 90, 103].map(z => E.byZ(z).group), [null, null, null, null, null, null], 'the lanthanides and actinides have no group');
const grid = new Map(); E.ALL.forEach(e => { const k = `${e.row},${e.col}`; assert.ok(!grid.has(k), `${e.name} and ${grid.get(k)} share a tile`); grid.set(k, e.name); });
assert.strictEqual(grid.size, 118, '118 different tiles'); assert.deepStrictEqual([Math.max(...E.ALL.map(e => e.row)), Math.max(...E.ALL.map(e => e.col)), Math.min(...E.ALL.map(e => e.col))], [10, 18, 1]);
const row = r => E.ALL.filter(e => e.row === r).length; assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7, 9, 10].map(row), [2, 8, 8, 18, 18, 17, 17, 15, 15], 'the rows of the table: 2, 8, 8, 18, 18, then 17 and 17 (the lanthanides and actinides are in their own rows of 15 underneath, leaving a placeholder in group 3)');
assert.deepStrictEqual(E.GAPS, [{ row: 6, col: 3, label: '57\u201371' }, { row: 7, col: 3, label: '89\u2013103' }], 'the placeholder tiles that point down to the two rows');
E.GAPS.forEach(g => assert.ok(!grid.has(`${g.row},${g.col}`), 'a placeholder sits where no element does'));
assert.deepStrictEqual(E.ALL.filter(e => e.row === 9).map(e => e.z), Array.from({ length: 15 }, (_, i) => 57 + i), 'the lanthanide row is 57 to 71 in order'); assert.deepStrictEqual(E.ALL.filter(e => e.row === 10).map(e => e.z), Array.from({ length: 15 }, (_, i) => 89 + i));
E.ALL.filter(e => e.group).forEach(e => assert.strictEqual(e.col, e.group, `${e.name}: its column is its group`)); E.ALL.filter(e => e.row === 9 || e.row === 10).forEach(e => assert.ok(e.col >= 3 && e.col <= 17));
for (let c = 1; c <= 18; c++) { const zs = E.ALL.filter(e => e.col === c && e.row <= 7).map(e => e.z); assert.deepStrictEqual(zs, [...zs].sort((a, b) => a - b), `column ${c} reads downward in order`); }
assert.strictEqual(E.ALL.filter(e => e.group === 1 && e.row === 1).length, 1, 'only hydrogen is alone in its period 1 group 1 corner');

/* ---------- families ---------- */
const fam = f => E.ALL.filter(e => e.family === f).map(e => e.symbol).join(' ');
assert.strictEqual(fam('noble'), 'He Ne Ar Kr Xe Rn Og'); assert.strictEqual(fam('halogen'), 'F Cl Br I At Ts'); assert.strictEqual(fam('alkali'), 'Li Na K Rb Cs Fr'); assert.strictEqual(fam('alkaline'), 'Be Mg Ca Sr Ba Ra');
assert.strictEqual(fam('metalloid'), 'B Si Ge As Sb Te'); assert.strictEqual(fam('nonmetal'), 'H C N O P S Se'); assert.strictEqual(fam('post'), 'Al Ga In Sn Tl Pb Bi Po Nh Fl Mc Lv');
assert.strictEqual(E.ALL.filter(e => e.family === 'lanthanide').length, 15); assert.strictEqual(E.ALL.filter(e => e.family === 'actinide').length, 15); assert.strictEqual(E.byZ(26).family, 'transition'); assert.strictEqual(E.byZ(79).family, 'transition'); assert.strictEqual(E.byZ(112).family, 'transition');
assert.strictEqual(Object.keys(E.FAMILIES).length, 10); E.ALL.forEach(e => assert.ok(E.FAMILIES[e.family], `${e.name} has a family`));

/* ---------- the levels ---------- */
assert.deepStrictEqual(E.LEVELS.map(l => [l.level, l.name, l.set.length]), [[1, 'Easy', 20], [2, 'Medium', 46], [3, 'Hard', 118]]);
assert.deepStrictEqual(E.levelOf(1).set, Array.from({ length: 20 }, (_, i) => i + 1)); assert.deepStrictEqual(E.levelOf(2).set.slice(-10), [47, 50, 53, 54, 56, 74, 78, 79, 80, 82]); assert.ok(E.levelOf(2).set.slice(0, 36).every((z, i) => z === i + 1));
assert.strictEqual(E.levelOf(9).level, 3); assert.strictEqual(E.levelOf(0).level, 1); assert.strictEqual(E.levelOf('x').level, 1); assert.ok(E.LEVELS.every(l => l.sample && l.desc));
assert.deepStrictEqual([1, 2, 3].map(l => new Set(E.tiles(l).map(e => e.row)).size), [4, 6, 9], 'Easy shows 4 rows of the table, Medium 6, Hard all 9 (seven periods and the two f-block rows)');
assert.deepStrictEqual([1, 2, 3].map(l => E.tiles(l).length), [36, 71, 118], 'and so 36, 71 and 118 tiles');
for (const L of E.LEVELS) { const rows = new Set(E.tiles(L.level).map(e => e.row)); L.set.forEach(z => assert.ok(E.tiles(L.level).some(e => e.z === z), `${L.name}: ${E.byZ(z).name} is on the table it shows`)); assert.ok(rows.size >= 4); }
assert.ok(E.tiles(1).every(e => e.row <= 4), 'Easy never shows the lower rows');
assert.ok(!E.tiles(2).some(e => e.row >= 9), 'Medium has no f-block rows'); assert.ok(E.tiles(3).some(e => e.row === 9) && E.tiles(3).some(e => e.row === 10));

/* ---------- problems ---------- */
for (const L of E.LEVELS) {
  const rng = seeded(60 + L.level); let last = null; const seen = new Set();
  for (let i = 0; i < 20000; i++) { const p = E.problem(L.level, rng, last); last = p; seen.add(p.z); assert.ok(L.set.includes(p.z) && p.level === L.level); assert.ok(E.isCorrect(p, E.answerOf(p)) && E.isCorrect(p, p.z)); assert.ok(!E.isCorrect(p, p.z + 1) && !E.isCorrect(p, 'x')); assert.ok(E.tiles(L.level).some(e => e.z === p.z)); }
  assert.strictEqual(seen.size, L.set.length, `${L.name}: every element it covers is asked`); assert.strictEqual(E.count(L.level), L.set.length);
  const rng2 = seeded(5); let l2 = null; for (let i = 0; i < 3000; i++) { const p = E.problem(L.level, rng2, l2); assert.ok(!l2 || p.z !== l2.z, 'never the same twice in a row'); l2 = p; } assert.deepStrictEqual(E.problem(L.level, seeded(9)), E.problem(L.level, seeded(9)));
}
assert.strictEqual(E.prompt({ z: 11 }), 'Find sodium'); assert.strictEqual(E.prompt({ z: 79 }), 'Find gold'); assert.strictEqual(E.answerOf({ z: 26 }), '26');
assert.strictEqual(E.fact(11), 'Sodium (Na) is number 11: an alkali metal, in group 1 and period 3.'); assert.strictEqual(E.fact(26), 'Iron (Fe) is number 26: a transition metal, in group 8 and period 4.');
assert.strictEqual(E.fact(2), 'Helium (He) is number 2: a noble gas, in group 18 and period 1.'); assert.strictEqual(E.fact(60), 'Neodymium (Nd) is number 60: a lanthanide, in period 6.'); assert.strictEqual(E.fact(92), 'Uranium (U) is number 92: an actinide, in period 7.'); assert.strictEqual(E.fact(17), 'Chlorine (Cl) is number 17: a halogen, in group 17 and period 3.');
assert.strictEqual(E.done({ z: 79 }), E.fact(79)); E.ALL.forEach(e => assert.ok(E.fact(e.z).startsWith(`${e.name} (${e.symbol}) is number ${e.z}: `)));

/* ---------- the pictures: HTML text, one clickable tile for each element the level shows, in its place, never naming one ---------- */
for (const L of E.LEVELS) {
  const html = E.figure(L.level), tiles = E.tiles(L.level), keys = [...html.matchAll(/data-key="(\d+)"/g)].map(m => Number(m[1]));
  assert.ok(html.startsWith('<div class="pt"') && html.endsWith('</div>')); assert.deepStrictEqual(keys, tiles.map(e => e.z), `${L.name}: one tile for each element on its table, in order`); assert.strictEqual(new Set(keys).size, keys.length);
  tiles.forEach(e => assert.ok(html.includes(`data-key="${e.z}" style="grid-row:${e.row};grid-column:${e.col}"`), `${E.byZ(e.z).name}: in its place`)); assert.strictEqual((html.match(/<button /g) || []).length, tiles.length, 'every tile is a button (so the keyboard can reach it)');
  assert.ok(!E.ALL.some(e => html.includes(`>${e.name}<`) || html.toLowerCase().includes(`label="${e.name.toLowerCase()}`)), 'no tile names its element'); tiles.forEach(e => assert.ok(html.includes(`class="pt-tile fam-${e.family}"`)));
  const rows = Math.max(...tiles.map(e => e.row)); assert.ok(html.includes(rows <= 7 ? `grid-template-rows:repeat(${rows}, var(--tile))` : 'grid-template-rows:repeat(7, var(--tile)) 8px repeat(2, var(--tile))'), `${L.name}: the rows it needs`);
  assert.strictEqual((html.match(/class="pt-gap"/g) || []).length, E.GAPS.filter(g => g.row <= rows).length, 'the placeholder tiles only where their rows show');
}
assert.strictEqual((E.figure(1).match(/pt-gap/g) || []).length, 0); assert.strictEqual((E.figure(2).match(/pt-gap/g) || []).length, 1); assert.strictEqual((E.figure(3).match(/pt-gap/g) || []).length, 2); assert.ok(E.figure(3).includes('57\u201371') && E.figure(3).includes('89\u2013103'));
assert.ok(E.figure(1).includes('<span class="pt-sym">Na</span>') && E.figure(1).includes('aria-label="Na, number 11"') && E.figure(1).includes('data-key="26"') && !E.figure(1).includes('data-key="47"') && E.figure(2).includes('data-key="47"') && !E.figure(2).includes('data-key="118"') && E.figure(3).includes('data-key="118"'), 'Easy shows periods 1 to 4 (it only asks for the first 20), Medium 1 to 6, Hard everything');
assert.strictEqual(E.label(26), 'Fe'); assert.strictEqual(E.label('11'), 'Na'); assert.strictEqual(E.label(999), '');
console.log('elements tests passed');
