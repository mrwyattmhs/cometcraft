// Run with: node tests/trophies.test.js
const assert = require('assert');
const T = require('../js/trophies.js');

/* ---------- one trophy for each game ---------- */
assert.deepStrictEqual(T.IDS, ['add', 'sub', 'mul', 'div', 'practice', 'radical', 'trinomial', 'cubes', 'polymul', 'polyadd', 'lines', 'parabola', 'vertex', 'coaster', 'map', 'blueprint', 'mines']);
assert.strictEqual(T.GAMES.length, 17); assert.strictEqual(new Set(T.IDS).size, 17);
T.GAMES.forEach(g => { assert.ok(g.name && g.noun && Number.isInteger(g.goal) && g.goal > 0 && Number.isInteger(g.color)); assert.strictEqual(T.byId[g.id], g); });
assert.strictEqual(T.byId.lines.goal, 100, 'the lines trophy takes 100 lines, in any of the three forms'); assert.strictEqual(T.byId.lines.symbol, 'linegraph');
assert.deepStrictEqual([T.byId.coaster.goal, T.byId.coaster.symbol, T.byId.coaster.noun], [100, 'coaster', 'rides cleared'], 'the coaster trophy takes 100 cleared rides');
assert.deepStrictEqual(T.GAMES.filter(g => g.goal !== 100).map(g => [g.id, g.goal]), [['blueprint', 25], ['mines', 25]], '100 right everywhere, except 25 blueprints in the sandbox and 25 Minesweeper wins');
// each trophy carries its table's symbol
assert.deepStrictEqual(T.GAMES.map(g => typeof g.symbol === 'string' ? g.symbol : g.symbol.words.join(' ')),
  ['plus', 'minus', 'times', 'divide', 'd20', 'sqrt', 'STANDARD FORM', 'cube', 'MULTIPLY POLY', 'ADD/SUB POLY', 'linegraph', 'parabola', 'VERTEX FORM', 'coaster', 'map', 'blocks', 'flag']);
assert.deepStrictEqual(T.GAMES.filter(g => g.symbol.words).map(g => [g.id, g.symbol.words.join(' ')]), [['trinomial', 'STANDARD FORM'], ['polymul', 'MULTIPLY POLY'], ['polyadd', 'ADD/SUB POLY'], ['vertex', 'VERTEX FORM']], 'four trophies are plates with words: the two formula tables (Standard Form and Vertex Form) and the two Polynomials tables');
// the colors are the table colors
assert.deepStrictEqual(['add', 'sub', 'mul', 'div'].map(id => T.byId[id].color), [0xf7e98e, 0xf6b0c8, 0xa8d8f0, 0xcdb8f0]);
assert.strictEqual(T.SHELF_CAPACITY, 9, 'nine to a shelf, so two shelves hold eighteen (there are seventeen trophies: room for one more)'); assert.ok(2 * T.SHELF_CAPACITY >= T.GAMES.length, 'every trophy has a place on the shelves');

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
const eight = T.IDS.slice(0, 9), nine = T.IDS.slice(0, 10), all = T.IDS;
assert.strictEqual(T.shelves(eight).length, 1, 'nine fit on the first shelf');
assert.deepStrictEqual(T.shelves(nine).map(row => row.length), [9, 1], 'the tenth starts a second shelf below');
assert.deepStrictEqual(T.shelves(all).map(row => row.length), [9, 8], 'all seventeen: nine, then eight (two shelves hold eighteen)');
assert.deepStrictEqual(T.shelves(all).flat(), all, 'nothing lost and nothing reordered');
assert.deepStrictEqual(T.shelves(['add', 'add', 'sub', 'nope']), [['add', 'sub']], 'duplicates and unknown ids are dropped');
assert.ok(T.shelves(all.concat(all)).length <= 2, 'never more than two shelves');

/* ---------- the progress line ---------- */
assert.strictEqual(T.progressText({ add: 37 }, [], 'add'), 'Trophy: 37 of 100');
assert.strictEqual(T.progressText({}, [], 'add'), 'Trophy: 0 of 100'); assert.strictEqual(T.progressText({ blueprint: 3 }, [], 'blueprint'), 'Trophy: 3 of 25');
assert.strictEqual(T.progressText({ add: 140 }, [], 'add'), 'Trophy: 100 of 100', 'never shows more than the goal');
assert.strictEqual(T.progressText({ add: 140 }, ['add'], 'add'), 'Trophy earned!'); assert.strictEqual(T.progressText({}, [], 'nope'), '');

/* ---------- earning all seventeen, in any order ---------- */
let sv = {}, tr = [], order = [...T.IDS].sort((a, b) => (a.charCodeAt(1) * 7 + a.length) - (b.charCodeAt(1) * 7 + b.length)), earnedLog = [];
for (const id of order) for (let i = 0; i < T.byId[id].goal; i++) { const x = T.apply(sv, tr, id); sv = x.solved; tr = x.trophies; if (x.earned) earnedLog.push(x.earned.id); }
assert.deepStrictEqual(earnedLog, order, 'each is earned exactly once, as its count reaches the goal'); assert.deepStrictEqual(tr, order);
assert.deepStrictEqual(T.shelves(tr).map(row => row.length), [9, 8]);
/* ---------- every trophy can be DRAWN: in the trophy case and on the dorm shelf (each keeps its own list of the voxel symbols it can draw, and a trophy left off one list shows an empty base) ---------- */
{
  const fs = require('fs'), path = require('path');
  const listIn = (file, re) => { const m = fs.readFileSync(path.join(__dirname, '../js', file), 'utf8').match(re); assert.ok(m, `${file}: found the list of symbols it can draw`); return [...m[1].matchAll(/'([a-z0-9]+)'/g)].map(x => x[1]); };
  const caseList = listIn('trophy-case.js', /const BLOCK_SYMBOLS = \[([^\]]*)\]/), shelfList = listIn('dormroom.js', /symbolSize && \[([^\]]*)\]\.includes\(sym\)/);
  const special = new Set(['d20', 'map', 'blocks']);                       // drawn by their own code in both places
  T.GAMES.forEach(g => {
    if (typeof g.symbol !== 'string' || special.has(g.symbol)) return;
    assert.ok(caseList.includes(g.symbol), `the trophy case can draw the "${g.symbol}" symbol of the ${g.name} trophy`);
    assert.ok(shelfList.includes(g.symbol), `the dorm shelf can draw the "${g.symbol}" symbol of the ${g.name} trophy`);
  });
  assert.ok(caseList.includes('flag') && caseList.includes('cube') && shelfList.includes('flag') && shelfList.includes('cube'), 'Minesweeper (flag) and the Cubes Table (cube) are on both lists');
  assert.deepStrictEqual(caseList.slice().sort(), shelfList.slice().sort(), 'the two lists agree');
}

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
  
/* ---------- the trophy case: every trophy, earned or not, and how each is earned ---------- */
{
  const empty = T.entries({}, []);
  assert.deepStrictEqual(empty.map(e => e.id), T.IDS, 'every trophy there is, in table order');
  assert.strictEqual(empty.length, 17);
  assert.ok(empty.every(e => !e.earned && e.count === 0 && e.percent === 0), 'none earned and no progress at the start');
  assert.ok(empty.every((e, i) => e.name === T.GAMES[i].name && e.goal === T.GAMES[i].goal && e.symbol === T.GAMES[i].symbol && e.color === T.GAMES[i].color && e.noun === T.GAMES[i].noun), 'each carries its own name, goal, symbol and colour');
  // progress, and what counts as earned
  const some = T.entries({ add: 37, sub: 100, blueprint: 10, coaster: 250, lines: 3.9, radical: -4, mul: 'x' }, ['coaster', 'lines', 'nope', 'lines']);
  const by = id => some.find(e => e.id === id);
  assert.deepStrictEqual([by('add').count, by('add').percent, by('add').earned], [37, 37, false]);
  assert.deepStrictEqual([by('blueprint').count, by('blueprint').percent], [10, 40], 'the blueprint trophy takes 25, so 10 is 40%');
  assert.deepStrictEqual([by('sub').count, by('sub').earned], [100, false], 'reaching the goal in the count is not the same as having the trophy: the trophy is earned when award() says so');
  assert.deepStrictEqual([by('coaster').count, by('coaster').earned, by('coaster').percent], [100, true, 100], 'a trophy you have is always full, and a count past the goal is clamped');
  assert.deepStrictEqual([by('lines').earned, by('lines').count, by('lines').percent], [true, 100, 100], 'a trophy you have stays full even if the count is lower');
  assert.deepStrictEqual([by('radical').count, by('mul').count], [0, 0], 'junk in the save counts as nothing');
  assert.strictEqual(some.filter(e => e.earned).length, 2, 'unknown and repeated ids are ignored');
  assert.strictEqual(T.entries(undefined, undefined).length, 17, 'an empty save is fine');
  assert.strictEqual(T.entries({}, T.IDS).every(e => e.earned && e.percent === 100), true, 'all of them earned');
  assert.deepStrictEqual([T.earnedCount([]), T.earnedCount(['add', 'add']), T.earnedCount(['add', 'sub', 'nope']), T.earnedCount(T.IDS), T.earnedCount(undefined)], [0, 1, 2, 17, 0]);
  // the input is not touched
  const solved = { add: 5 }, tr = ['add']; T.entries(solved, tr); assert.deepStrictEqual([solved, tr], [{ add: 5 }, ['add']]);
  // the earned trophies and the entries agree with progressText
  T.GAMES.forEach(g => { const e = T.entries({ [g.id]: 7 }, []).find(x => x.id === g.id); assert.strictEqual(T.progressText({ [g.id]: 7 }, [], g.id), `Trophy: ${e.count} of ${e.goal}`); });

  // how each is earned: a real sentence, with the real goal, and the right place
  const hows = T.GAMES.map(g => g.how);
  assert.ok(hows.every(h => typeof h === 'string' && h.length > 30 && /\.$/.test(h)), 'a full sentence for each');
  assert.strictEqual(new Set(hows).size, 17, 'no two the same');
  T.GAMES.forEach(g => assert.ok(g.how.includes(String(g.goal)), `${g.id}: the sentence says the goal (${g.goal})`));
  T.GAMES.forEach(g => { assert.ok(!/\bbet|wager|gambl/i.test(g.how), `${g.id}: no talk of betting`); });
  const C = require('../js/casino-interior.js');
  Object.entries(C.TABLES).forEach(([id, t]) => {
    const N = C.NORTH_WING, north = t.x > N.minX && t.x < N.maxX && t.z > N.minZ && t.z < N.maxZ;       // the wing comes from the plan: the north wing, else west (left) is Factoring and east (right) is Graphing
    const wing = north ? 'Polynomials wing' : t.x < 0 ? 'Factoring wing' : 'Graphing wing';
    assert.ok(T.byId[id].how.includes(`casino's ${wing}`), `${id}: its table is in the ${wing} (x = ${t.x}), and the sentence says so`);
    assert.ok(T.byId[id].how.includes(T.byId[id].name) || T.byId[id].how.includes(T.byId[id].name.replace(' Table', ' table')), `${id}: and names the table`);
  });
  assert.deepStrictEqual(Object.keys(C.TABLES).sort(), ['coaster', 'cubes', 'lines', 'parabola', 'polyadd', 'polymul', 'practice', 'radical', 'trinomial', 'vertex'], 'every casino table has a trophy');
  ['add', 'sub', 'mul', 'div'].forEach(id => assert.ok(T.byId[id].how.includes('Arithmetic Academy') && T.byId[id].how.includes(T.byId[id].name), `${id}: at its table in the Arithmetic Academy`));
  assert.ok(/wall map/.test(T.byId.map.how) && /Arithmetic Academy/.test(T.byId.map.how), 'the map game is on the wall map in the Arithmetic Academy');
  assert.ok(/Sandbox behind the school/.test(T.byId.blueprint.how) && /25 blueprints/.test(T.byId.blueprint.how));
  assert.ok(/Cubes Table in the casino's Factoring wing/.test(T.byId.cubes.how) && /100 correct answers/.test(T.byId.cubes.how), 'Cubes: where it is and how many');
  assert.deepStrictEqual([T.byId.cubes.goal, T.byId.cubes.symbol, T.byId.cubes.noun], [100, 'cube', 'solved'], 'a 100-answer trophy, like the other tables');
  assert.ok(/minefield next to the Sandbox behind the school/.test(T.byId.mines.how) && /25 games/.test(T.byId.mines.how) && /dig every safe square and flag every bomb/.test(T.byId.mines.how), 'Minesweeper: where it is, how many wins, and the rule for a win');
  assert.deepStrictEqual([T.byId.mines.goal, T.byId.mines.symbol, T.byId.mines.noun], [25, 'flag', 'games won'], 'a 25-win trophy, like the sandbox');
  assert.ok(/doesn't count/.test(T.byId.lines.how) && /doesn't count/.test(T.byId.coaster.how), 'the two trophies that skip help-assisted rounds say so');
}

console.log('trophy label tests passed');
}
