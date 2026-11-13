// Run with: node tests/cells.test.js
const assert = require('assert');
const C = require('../js/cells.js');
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ---------- the parts ---------- */
assert.deepStrictEqual(Object.keys(C.PARTS).sort(), ['chloroplast', 'cytoplasm', 'er', 'golgi', 'lysosome', 'membrane', 'mitochondrion', 'nucleolus', 'nucleus', 'ribosome', 'vacuole', 'wall'], 'twelve parts');
for (const [k, p] of Object.entries(C.PARTS)) { assert.ok(p.name && p.job && p.clue, `${k} has a name, a job and a clue`); assert.ok(!/^[A-Z]/.test(p.job) && !p.job.endsWith('.'), `${k}: the job is a phrase that starts with a verb`); assert.ok(/^[a-z]+s\b|^is\b|^breaks\b/.test(p.job), `${k}: ${p.job}`); }
assert.strictEqual(new Set(Object.values(C.PARTS).map(p => p.name)).size, 12, 'no two names alike'); assert.strictEqual(new Set(Object.values(C.PARTS).map(p => p.clue)).size, 12, 'no two clues alike (a clue fits one part)');
for (const [k, p] of Object.entries(C.PARTS)) assert.ok(!new RegExp(`\\b${p.name.split(' ').pop()}\\b`, 'i').test(p.clue) || k === 'nucleolus' || k === 'wall', `${k}: its clue must not just say its name (${p.clue})`);
assert.deepStrictEqual(C.ORDER.slice().sort(), Object.keys(C.PARTS).sort(), 'every part has a place in the drawing order');

/* ---------- the levels ---------- */
assert.deepStrictEqual(C.LEVELS.map(l => [l.level, l.name, l.cell, l.byJob, l.parts.length]), [[1, 'Easy', 'animal', false, 6], [2, 'Medium', 'plant', false, 7], [3, 'Hard', 'plant', true, 11]]);
for (const L of C.LEVELS) { assert.ok(L.sample && L.desc); L.parts.forEach(k => assert.ok(C.PARTS[k], `${L.name}: ${k} is a part`)); assert.strictEqual(new Set(L.parts).size, L.parts.length); assert.strictEqual(C.count(L.level), L.parts.length); }
assert.ok(C.LEVELS[0].parts.every(k => !['wall', 'chloroplast'].includes(k)), 'an animal cell has no wall or chloroplasts'); assert.ok(['wall', 'chloroplast', 'vacuole'].every(k => C.LEVELS[1].parts.includes(k)), 'a plant cell has them');
assert.ok(C.LEVELS[2].parts.includes('nucleolus') && C.LEVELS[2].parts.includes('golgi') && C.LEVELS[2].parts.includes('er')); assert.ok(C.LEVELS[1].parts.every(k => C.LEVELS[2].parts.includes(k)), 'Hard has every part Medium has');
assert.strictEqual(C.levelOf(9).level, 3); assert.strictEqual(C.levelOf(0).level, 1); assert.strictEqual(C.levelOf('x').level, 1);

/* ---------- the questions ---------- */
for (const L of C.LEVELS) {
  const rng = seeded(80 + L.level); let last = null; const seen = new Set();
  for (let i = 0; i < 10000; i++) { const p = C.problem(L.level, rng, last); last = p; seen.add(p.part); assert.ok(L.parts.includes(p.part) && p.level === L.level); assert.ok(C.isCorrect(p, C.answerOf(p)) && !C.isCorrect(p, 'nonsense') && L.parts.filter(k => C.isCorrect(p, k)).length === 1, 'exactly one part is right'); assert.ok(C.prompt(p).startsWith('Click the ')); }
  assert.strictEqual(seen.size, L.parts.length, `${L.name}: every part is asked`);
  const r2 = seeded(5); let l2 = null; for (let i = 0; i < 3000; i++) { const p = C.problem(L.level, r2, l2); assert.ok(!l2 || p.part !== l2.part, 'never the same twice in a row'); l2 = p; } assert.deepStrictEqual(C.problem(L.level, seeded(9)), C.problem(L.level, seeded(9)));
}
assert.strictEqual(C.prompt({ level: 1, part: 'nucleus' }), 'Click the nucleus'); assert.strictEqual(C.prompt({ level: 2, part: 'chloroplast' }), 'Click the chloroplast'); assert.strictEqual(C.prompt({ level: 2, part: 'wall' }), 'Click the cell wall');
assert.strictEqual(C.prompt({ level: 3, part: 'mitochondrion' }), 'Click the part that turns food into energy'); assert.strictEqual(C.prompt({ level: 3, part: 'nucleus' }), 'Click the part that holds the DNA and controls the cell'); assert.strictEqual(C.prompt({ level: 3, part: 'golgi' }), 'Click the part that packages proteins and sends them out');
assert.strictEqual(C.done({ level: 1, part: 'nucleus' }), 'The nucleus holds the cell\u2019s DNA and controls what the cell does.'); assert.strictEqual(C.done({ level: 2, part: 'wall' }), 'The cell wall is the stiff outer layer that holds a plant cell in shape.'); assert.strictEqual(C.done({ level: 3, part: 'er' }), 'The endoplasmic reticulum is a folded network of tubes that helps make and move proteins.');
Object.keys(C.PARTS).forEach(k => assert.ok(/^The .+ [a-z]+ .+\.$/.test(C.done({ level: 3, part: k })), `${k}: a whole sentence`));

/* ---------- the pictures: SVG text, every part of the level drawn and clickable, and nothing labelled ---------- */
for (const L of C.LEVELS) {
  const svg = C.figure(L.level), keys = [...svg.matchAll(/data-key="([a-z]+)"/g)].map(m => m[1]);
  assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>') && svg.includes('viewBox="0 0 480 340"'), `${L.name}: one SVG`); assert.deepStrictEqual([...new Set(keys)].sort(), [...L.parts].sort(), `${L.name}: exactly the level's parts are drawn`); assert.strictEqual(keys.length, L.parts.length, 'each part is one group');
  assert.ok(!/<text/i.test(svg), 'no labels in the picture'); const visible = svg.replace(/data-key="[a-z]+"/g, '').replace(/class="[^"]*"/g, ''); for (const k of L.parts) assert.ok(!visible.toLowerCase().includes(C.PARTS[k].name.toLowerCase()), `nothing in the picture names the ${k}`); assert.ok(/aria-label="A picture of (an animal|a plant) cell"/.test(svg));
  assert.ok((svg.match(/tabindex="0"/g) || []).length === L.parts.length, 'every part can be reached with the keyboard'); assert.strictEqual((svg.match(/<svg/g) || []).length, 1); assert.strictEqual((svg.match(/<g /g) || []).length >= L.parts.length, true);
  const body = svg.replace(/<svg[^>]*>/, '').replace('</svg>', ''); let depth = 0; for (const m of body.matchAll(/<(\/?)(g|svg)\b[^>]*?(\/?)>/g)) { depth += m[1] ? -1 : m[3] ? 0 : 1; assert.ok(depth >= 0); } assert.strictEqual(depth, 0, 'the groups are balanced');
  const order = keys.map(k => C.ORDER.indexOf(k)); assert.deepStrictEqual(order, [...order].sort((a, b) => a - b), 'the body is drawn first and the outlines last, so a click on a part inside the cell reaches the part');
}
assert.ok(C.figure(1).includes('data-key="lysosome"') && !C.figure(1).includes('data-key="wall"') && C.figure(2).includes('data-key="wall"') && C.figure(3).includes('data-key="golgi"'));
console.log('cells tests passed');
