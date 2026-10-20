// Run with: node tests/trophies.test.js
const assert = require('assert');
const T = require('../js/trophies.js');

/* ---------- one trophy for each game ---------- */
assert.deepStrictEqual(T.IDS, ['add', 'sub', 'mul', 'div', 'practice', 'radical', 'trinomial', 'parabola', 'vertex', 'map', 'blueprint']);
assert.strictEqual(T.GAMES.length, 11); assert.strictEqual(new Set(T.IDS).size, 11);
T.GAMES.forEach(g => { assert.ok(g.name && g.noun && Number.isInteger(g.goal) && g.goal > 0 && Number.isInteger(g.color)); assert.strictEqual(T.byId[g.id], g); });
assert.deepStrictEqual(T.GAMES.filter(g => g.goal !== 100).map(g => [g.id, g.goal]), [['blueprint', 25]], '100 right everywhere, except 25 blueprints in the sandbox');
// each trophy carries its table's symbol
assert.deepStrictEqual(T.GAMES.map(g => typeof g.symbol === 'string' ? g.symbol : g.symbol.words.join(' ')),
  ['plus', 'minus', 'times', 'divide', 'd20', 'sqrt', 'STANDARD FORM', 'parabola', 'VERTEX FORM', 'map', 'blocks']);
assert.deepStrictEqual(T.GAMES.filter(g => g.symbol.words).map(g => [g.id, g.symbol.words.join(' ')]), [['trinomial', 'STANDARD FORM'], ['vertex', 'VERTEX FORM']], 'the two formula tables say Standard Form and Vertex Form');
// the colors are the table colors
assert.deepStrictEqual(['add', 'sub', 'mul', 'div'].map(id => T.byId[id].color), [0xf7e98e, 0xf6b0c8, 0xa8d8f0, 0xcdb8f0]);
assert.strictEqual(T.SHELF_CAPACITY, 8);

/* ---------- counting up to a trophy ---------- */
assert.strictEqual(T.count({}, 'add'), 0); assert.strictEqual(T.count({ add: 7.9 }, 'add'), 7); assert.strictEqual(T.count({ add: -3 }, 'add'), 0); assert.strictEqual(T.count({ add: 'x' }, 'add'), 0); assert.strictEqual(T.count(null, 'add'), 0);
let solved = {}, trophies = [], r;
for (let i = 1; i <= 99; i++) { r = T.apply(solved, trophies, 'add'); solved = r.solved; trophies = r.trophies; assert.strictEqual(r.earned, null, `${i} is not enough`); }
assert.strictEqual(solved.add, 99); assert.deepStrictEqual(trophies, []);
r = T.apply(solved, trophies, 'add'); assert.strictEqual(r.earned, T.byId.add, 'the 100th earns it'); assert.deepStrictEqual(r.trophies, ['add']); assert.strictEqual(r.solved.add, 100);
solved = r.solved; trophies = r.trophies;
r = T.apply(solved, trophies, 'add'); assert.strictEqual(r.earned, null, 'you only earn it once'); assert.deepStrictEqual(r.trophies, ['add']); assert.strictEqual(r.solved.add, 101);
// immutability and isolation
const s0 = { add: 5 }, t0 = []; T.apply(s0, t0, 'add'); assert.deepStrictEqual(s0, { add: 5 }); assert.deepStrictEqual(t0, []);
r = T.apply({ add: 5 }, [], 'sub'); assert.deepStrictEqual(r.solved, { add: 5, sub: 1 }, 'each game counts on its own');
r = T.apply({ add: 5 }, ['add'], 'nonsense'); assert.deepStrictEqual([r.solved, r.trophies, r.earned], [{ add: 5 }, ['add'], null], 'an unknown game counts for nothing');
// the sandbox's trophy comes at 25
r = T.apply({ blueprint: 24 }, [], 'blueprint'); assert.strictEqual(r.earned, T.byId.blueprint); r = T.apply({ blueprint: 23 }, [], 'blueprint'); assert.strictEqual(r.earned, null);
// a made-up trophy id in the save is not kept
assert.deepStrictEqual(T.apply({ add: 99 }, ['bogus', 'sub'], 'add').trophies, ['sub', 'add'], 'unknown ids are dropped, real ones kept');
// EVERYONE STARTS AT ZERO: nothing from before counts, because the count lives only in "solved"
assert.deepStrictEqual(T.apply({}, [], 'radical').solved, { radical: 1 });

/* ---------- the shelves ---------- */
assert.deepStrictEqual(T.shelves([]), [[]], 'one empty shelf to start with');
assert.deepStrictEqual(T.shelves(['mul', 'add']), [['mul', 'add']], 'in the order earned');
const eight = T.IDS.slice(0, 8), nine = T.IDS.slice(0, 9), all = T.IDS;
assert.strictEqual(T.shelves(eight).length, 1, 'eight fit on the first shelf');
assert.deepStrictEqual(T.shelves(nine).map(row => row.length), [8, 1], 'the ninth starts a second shelf below');
assert.deepStrictEqual(T.shelves(all).map(row => row.length), [8, 3], 'all eleven: eight, then three');
assert.deepStrictEqual(T.shelves(all).flat(), all, 'nothing lost and nothing reordered');
assert.deepStrictEqual(T.shelves(['add', 'add', 'sub', 'nope']), [['add', 'sub']], 'duplicates and unknown ids are dropped');
assert.ok(T.shelves(all.concat(all)).length <= 2, 'never more than two shelves');

/* ---------- the progress line ---------- */
assert.strictEqual(T.progressText({ add: 37 }, [], 'add'), 'Trophy: 37 of 100');
assert.strictEqual(T.progressText({}, [], 'add'), 'Trophy: 0 of 100'); assert.strictEqual(T.progressText({ blueprint: 3 }, [], 'blueprint'), 'Trophy: 3 of 25');
assert.strictEqual(T.progressText({ add: 140 }, [], 'add'), 'Trophy: 100 of 100', 'never shows more than the goal');
assert.strictEqual(T.progressText({ add: 140 }, ['add'], 'add'), 'Trophy earned!'); assert.strictEqual(T.progressText({}, [], 'nope'), '');

/* ---------- earning all eleven, in any order ---------- */
let sv = {}, tr = [], order = [...T.IDS].sort((a, b) => (a.charCodeAt(1) * 7 + a.length) - (b.charCodeAt(1) * 7 + b.length)), earnedLog = [];
for (const id of order) for (let i = 0; i < T.byId[id].goal; i++) { const x = T.apply(sv, tr, id); sv = x.solved; tr = x.trophies; if (x.earned) earnedLog.push(x.earned.id); }
assert.deepStrictEqual(earnedLog, order, 'each is earned exactly once, as its count reaches the goal'); assert.deepStrictEqual(tr, order);
assert.deepStrictEqual(T.shelves(tr).map(row => row.length), [8, 3]);
console.log('trophy tests passed');

/* ---------- the progress label (needs a little fake page) ---------- */
{
  const made = [];
  const mkEl = () => { const e = { textContent: '', isConnected: false, classList: { on: false, toggle(c, v) { this.on = v; } }, className: '' }; made.push(e); return e; };
  global.document = { createElement: mkEl };
  let listener = null, state = { solved: {}, trophies: [] };
  global.Store = { get: () => state, onChange: fn => { listener = fn; fn(state); } };
  delete require.cache[require.resolve('../js/trophies.js')];
  const T2 = require('../js/trophies.js');
  const first = T2.chip('add');                                  // created before it is put on the page, like every game does
  assert.strictEqual(first.textContent, 'Trophy: 0 of 100');
  first.isConnected = true;                                      // now the game inserts it
  state = { solved: { add: 37 }, trophies: [] }; listener(state);
  assert.strictEqual(first.textContent, 'Trophy: 37 of 100', 'the very first label created keeps up to date (it was once dropped before it reached the page)');
  const second = T2.chip('sub'); second.isConnected = true;
  state = { solved: { add: 38, sub: 2 }, trophies: [] }; listener(state);
  assert.deepStrictEqual([first.textContent, second.textContent], ['Trophy: 38 of 100', 'Trophy: 2 of 100'], 'several labels share one listener');
  state = { solved: { add: 100 }, trophies: ['add'] }; listener(state);
  assert.strictEqual(first.textContent, 'Trophy earned!'); assert.strictEqual(first.classList.on, true, 'and turns gold when earned');
  first.isConnected = false;                                     // the screen is rebuilt: the old label leaves the page
  state = { solved: { add: 101 }, trophies: ['add'] }; listener(state); first.textContent = 'untouched';
  state = { solved: { add: 102 }, trophies: ['add'] }; listener(state);
  assert.strictEqual(first.textContent, 'untouched', 'a label that has left the page is dropped, not updated forever');
  delete global.document; delete global.Store;
  console.log('trophy label tests passed');
}
