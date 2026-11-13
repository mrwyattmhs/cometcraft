// Run with: node tests/atoms.test.js
const assert = require('assert');
const A = require('../js/atoms.js'), E = require('../js/elements.js');
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = A.MINUS;

/* ---------- the mass numbers ---------- */
const KNOWN = { 1: 1, 2: 4, 6: 12, 7: 14, 8: 16, 11: 23, 12: 24, 13: 27, 17: 35, 20: 40, 26: 56, 29: 64, 47: 108, 79: 197, 82: 207 };
for (const [z, a] of Object.entries(KNOWN)) assert.strictEqual(A.MASS[z], a, `${E.byZ(Number(z)).name} has mass number ${a}`);
for (const [z, a] of Object.entries(A.MASS)) { assert.ok(E.byZ(Number(z)), `${z} is an element`); assert.ok(a >= Number(z) && a <= Number(z) * 2.9, `${E.byZ(Number(z)).name}: ${a} is a sensible mass number for number ${z}`); }
assert.strictEqual(A.MASS[1] - 1, 0, 'hydrogen has no neutrons'); assert.ok(Object.keys(A.MASS).length >= 46, 'every element a level can ask about has one');
const need = new Set([...E.ALL.filter(e => e.z <= 20).map(e => e.z), ...E.levelOf(2).set]); need.forEach(z => assert.ok(A.MASS[z], `${E.byZ(z).name} has a mass number`));
A.IONS.forEach(([z, c]) => { const e = E.byZ(z); assert.ok(A.MASS[z] && [1, 2, 3, -1, -2, -3].includes(c)); const g = e.group; if (c > 0) assert.strictEqual(c, g === 1 ? 1 : g === 2 ? 2 : g === 13 ? 3 : null, `${e.name}: a + ion of ${c} comes from group ${g}`); else assert.strictEqual(c, g === 15 ? -3 : g === 16 ? -2 : g === 17 ? -1 : null, `${e.name}: a ${c} ion comes from group ${g}`); });
A.ISOTOPES.forEach(([z, a]) => { assert.ok(a !== A.MASS[z], `${E.byZ(z).name}-${a} is NOT the common one`); assert.ok(a > z - 1 && a >= z); assert.ok(Math.abs(a - A.MASS[z]) <= 6); });
assert.strictEqual(new Set(A.ISOTOPES.map(i => i.join())).size, A.ISOTOPES.length); assert.ok(A.ISOTOPES.some(([z, a]) => z === 6 && a === 14) && A.ISOTOPES.some(([z, a]) => z === 1 && a === 2));

/* ---------- the examples ---------- */
const nn = { level: 1, kind: 'neutral', z: 6, a: 12, charge: 0 }, na = { level: 2, kind: 'neutral', z: 11, a: 23, charge: 0 }, ion = { level: 3, kind: 'ion', z: 11, a: 23, charge: 1 }, ox = { level: 3, kind: 'ion', z: 8, a: 16, charge: -2 }, iso = { level: 3, kind: 'isotope', z: 6, a: 14, charge: 0 };
assert.deepStrictEqual(A.answerOf(nn), [6, 6, 6]); assert.deepStrictEqual(A.answerOf(na), [11, 12, 11]); assert.deepStrictEqual(A.answerOf(ion), [11, 12, 10], 'Na+ has lost an electron'); assert.deepStrictEqual(A.answerOf(ox), [8, 8, 10], 'O2- has gained two'); assert.deepStrictEqual(A.answerOf(iso), [6, 8, 6], 'carbon-14 has 8 neutrons');
assert.ok(A.isCorrect(na, 11, 12, 11) && !A.isCorrect(na, 12, 11, 11) && !A.isCorrect(na, 11, 11, 11) && !A.isCorrect(na, 11, 12, 12) && !A.isCorrect(na, 23, 12, 11), 'order and values both matter'); assert.ok(!A.isCorrect(ion, 11, 12, 11), 'a neutral count is wrong for an ion'); assert.ok(A.isCorrect(ion, 11, 12, 10));
assert.ok(!A.isCorrect(na, 11, 12) && !A.isCorrect(na, '11', 12, 11) && !A.isCorrect(na, NaN, 12, 11) && !A.isCorrect(na, 11.5, 12, 11) && !A.isCorrect(na, null, null, null));
assert.deepStrictEqual(A.view(nn), { kind: 'row', head: 'Build a neutral atom of carbon', sub: 'atomic number 6 \u00b7 mass number 12', labels: ['protons', 'neutrons', 'electrons'] });
assert.deepStrictEqual(A.view(na), { kind: 'row', head: 'Build sodium-23', sub: 'a neutral atom', labels: ['protons', 'neutrons', 'electrons'] }); assert.strictEqual(A.view(ion).head, 'Build the ion Na\u207a'); assert.strictEqual(A.view(ion).sub, 'mass number 23'); assert.strictEqual(A.view(ox).head, 'Build the ion O\u00b2\u207b');
assert.deepStrictEqual([A.view(iso).head, A.view(iso).sub], ['Build carbon-14', 'an isotope: a neutral atom']); assert.strictEqual(A.text(na), 'Build sodium-23, a neutral atom');
assert.strictEqual(A.done(nn), 'Carbon-12: 6 protons, 6 neutrons, 6 electrons.'); assert.strictEqual(A.done(ion), 'Sodium-23, the ion Na\u207a: 11 protons, 12 neutrons, 10 electrons.'); assert.strictEqual(A.done(iso), 'Carbon-14: 6 protons, 8 neutrons, 6 electrons.');
assert.deepStrictEqual(A.steps(na), ['Protons are the atomic number. Sodium is number 11, so 11 protons.', `Neutrons are the mass number take away the protons: 23 ${M} 11 = 12.`, 'A neutral atom has as many electrons as protons: 11.']);
assert.strictEqual(A.steps(ion)[2], `Na\u207a has lost 1 electron: 11 ${M} 1 = 10.`); assert.strictEqual(A.steps(ox)[2], 'O\u00b2\u207b has gained 2 electrons: 8 + 2 = 10.'); assert.strictEqual(A.ionText(13, 3), 'Al\u00b3\u207a'); assert.strictEqual(A.ionText(17, -1), 'Cl\u207b');

/* ---------- every problem on every level ---------- */
assert.deepStrictEqual(A.LEVELS.map(l => [l.level, l.name, l.signed]), [[1, 'Easy', false], [2, 'Medium', false], [3, 'Hard', false]], 'no negative numbers anywhere: counts of particles cannot be negative'); assert.ok(A.LEVELS.every(l => l.sample && l.desc) && A.ordered === true);
assert.deepStrictEqual([1, 2, 3].map(A.count), [20, 46, 25]); assert.strictEqual(A.levelOf(9).level, 3); assert.strictEqual(A.levelOf(0).level, 1);
for (const L of A.LEVELS) {
  const rng = seeded(100 + L.level); let last = null; const keys = new Set(), kinds = new Set();
  for (let i = 0; i < 20000; i++) {
    const p = A.problem(L.level, rng, last); last = p; keys.add(`${p.z}/${p.a}/${p.charge}`); kinds.add(p.kind);
    const [pr, ne, el] = A.answerOf(p); assert.ok([pr, ne, el].every(n => Number.isInteger(n) && n >= 0), `${A.text(p)}: whole numbers, none negative`); assert.strictEqual(pr + ne, p.a, 'protons and neutrons make the mass number'); assert.strictEqual(pr, p.z); assert.strictEqual(el, pr - p.charge);
    assert.ok(A.isCorrect(p, pr, ne, el)); assert.ok(!A.isCorrect(p, ne, pr, el) || ne === pr, 'swapping the first two is wrong unless they are equal'); assert.ok(el >= 0 && Math.abs(p.charge) <= 3);
    if (L.level < 3) assert.ok(p.kind === 'neutral' && p.charge === 0 && p.a === A.MASS[p.z]); if (L.level === 1) assert.ok(p.z <= 20);
    if (p.kind === 'isotope') assert.ok(p.a !== A.MASS[p.z]); if (p.kind === 'ion') { assert.ok(p.a === A.MASS[p.z] && p.charge !== 0); } assert.strictEqual(A.steps(p).length, 3); assert.ok(A.done(p).includes(`${pr} protons, ${ne} neutrons, ${el} electrons.`));
    assert.ok(A.steps(p).every(t => t.length <= 100), `each step fits a narrow column: ${A.steps(p).find(t => t.length > 100)}`); assert.ok(A.text(p).length > 10);
  }
  assert.strictEqual(keys.size, A.count(L.level), `${L.name}: every atom it can ask turns up`); assert.deepStrictEqual([...kinds].sort(), L.level < 3 ? ['neutral'] : ['ion', 'isotope']);
  const r2 = seeded(5); let l2 = null; for (let i = 0; i < 3000; i++) { const p = A.problem(L.level, r2, l2); assert.ok(!l2 || p.z !== l2.z || p.a !== l2.a || p.charge !== l2.charge, 'never the same twice in a row'); l2 = p; } assert.deepStrictEqual(A.problem(L.level, seeded(9)), A.problem(L.level, seeded(9)));
}
console.log('atoms tests passed');
