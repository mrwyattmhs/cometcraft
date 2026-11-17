// Run with: node tests/daily.test.js
const assert = require('assert');
const D = require('../js/daily.js'), T = require('../js/trophies.js');

/* ---------- the topics ---------- */
assert.strictEqual(D.REWARD, 200); assert.strictEqual(D.TOPICS.length, 24);
assert.deepStrictEqual(D.TOPICS.map(x => x.id).sort(), T.IDS.slice().sort(), 'a topic for every game that has a trophy, and no others (a new game must be added here, or left out on purpose)');
assert.strictEqual(new Set(D.TOPICS.map(x => x.id)).size, 24);
const NEED = { coaster: 3, blueprint: 3, mines: 3, practice: 5 };
for (const x of D.TOPICS) { assert.strictEqual(x.need, NEED[x.id] || 10, `${x.id}: ${NEED[x.id] || 10} right answers`); assert.ok(x.need >= 1 && x.need <= 10); assert.ok(typeof x.task === 'function' && x.task(x.need).includes(String(x.need)) && x.task(7).includes('7'), `${x.id}: the task says how many`); assert.ok(x.where.length > 20 && !/undefined/.test(x.where)); assert.strictEqual(D.byId[x.id], x); assert.ok(/^[A-Z]/.test(x.task(x.need)) && !x.task(x.need).endsWith('.')); }
assert.strictEqual(new Set(D.TOPICS.map(x => x.task(10))).size, 24, 'every task reads differently');
assert.strictEqual(D.byId.mines.task(3), 'Win 3 games of Minesweeper'); assert.strictEqual(D.byId.blueprint.task(3), 'Solve 3 blueprints in the Sandbox'); assert.strictEqual(D.byId.polymul.task(10), 'Get 10 Multiply Table problems right'); assert.strictEqual(D.byId.clock.task(10), 'Read 10 clocks correctly'); assert.strictEqual(D.byId.coaster.task(3), 'Build 3 Polynomial Coaster tracks that work');
for (const id of ['add', 'sub', 'mul', 'div', 'map']) assert.ok(/Arithmetic Academy/.test(D.byId[id].where), `${id} is in the Academy`); for (const id of ['practice', 'radical', 'trinomial', 'cubes']) assert.ok(/Factoring wing/.test(D.byId[id].where)); for (const id of ['lines', 'parabola', 'vertex']) assert.ok(/Graphing wing/.test(D.byId[id].where)); for (const id of ['polymul', 'polyadd', 'coaster']) assert.ok(/Polynomials wing/.test(D.byId[id].where));
for (const id of ['missing', 'muldiv', 'numbers']) assert.ok(/House of Algebra/.test(D.byId[id].where)); for (const id of ['elements', 'cells', 'atoms']) assert.ok(/Science Lab/.test(D.byId[id].where)); assert.ok(/Sandbox/.test(D.byId.blueprint.where) && /minefield/.test(D.byId.mines.where));

/* ---------- the calendar ---------- */
assert.strictEqual(D.dayKey(new Date(2026, 10, 16, 13, 5)), '2026-11-16'); assert.strictEqual(D.dayKey(new Date(2026, 0, 5)), '2026-01-05', 'padded'); assert.strictEqual(D.dayKey(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31'); assert.strictEqual(D.dayKey(new Date(2027, 0, 1, 0, 0, 0)), '2027-01-01', 'the day turns over at midnight');
assert.strictEqual(D.dayKey(new Date(2028, 1, 29, 12)), '2028-02-29'); assert.match(D.dayKey(), /^\d{4}-\d{2}-\d{2}$/);
assert.strictEqual(D.dayNumber('1970-01-01'), 0); assert.strictEqual(D.dayNumber('1970-01-02'), 1); assert.strictEqual(D.dayNumber('2026-11-17') - D.dayNumber('2026-11-16'), 1); assert.strictEqual(D.dayNumber('2027-01-01') - D.dayNumber('2026-12-31'), 1, 'across a new year'); assert.strictEqual(D.dayNumber('2028-03-01') - D.dayNumber('2028-02-28'), 2, 'a leap year has a 29th');
assert.strictEqual(D.dayNumber('2026-03-09') - D.dayNumber('2026-03-08'), 1, 'daylight saving does not matter: days are counted by the calendar');

/* ---------- the order of the days ---------- */
const ids = D.TOPICS.map(x => x.id).slice().sort();
for (let c = 0; c < 400; c++) { const o = D.orderOf(c); assert.deepStrictEqual(o.slice().sort(), ids, `cycle ${c} has every game once`); assert.deepStrictEqual(D.orderOf(c), o, 'the same every time'); if (c > 0) assert.notStrictEqual(o[0], D.orderOf(c - 1)[23], `cycle ${c} does not start with the game the last one ended on`); }
assert.notDeepStrictEqual(D.orderOf(0), D.orderOf(1)); assert.notDeepStrictEqual(D.orderOf(0), D.TOPICS.map(x => x.id), 'not simply the list in order'); assert.ok(new Set(Array.from({ length: 60 }, (_, c) => D.orderOf(c).join())).size === 60, 'every cycle is shuffled differently');
{ let day = D.dayNumber('2026-01-01'), prev = null; const perCycle = {}; const counts = {};
  for (let i = 0; i < 24 * 80; i++, day++) { const key = new Date(Date.UTC(1970, 0, 1 + day)).toISOString().slice(0, 10), top = D.topicFor(key); assert.ok(top && D.byId[top.id] === top); if (prev) assert.notStrictEqual(top.id, prev, `${key}: the same game two days running`); prev = top.id; const c = Math.floor(day / 24); (perCycle[c] = perCycle[c] || []).push(top.id); counts[top.id] = (counts[top.id] || 0) + 1; assert.strictEqual(D.topicFor(key), top, 'the same every time'); }
  for (const [c, list] of Object.entries(perCycle)) if (list.length === 24) assert.deepStrictEqual(list.slice().sort(), ids, `a whole cycle (${c}) plays every game once`);
  assert.ok(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <= 2, 'over 80 cycles every game came up about as often as every other'); }
assert.strictEqual(D.topicFor('1970-01-01'), D.byId[D.orderOf(0)[0]], 'the first day there was'); assert.strictEqual(D.topicFor('2026-11-16').id, D.orderOf(Math.floor(D.dayNumber('2026-11-16') / 24))[D.dayNumber('2026-11-16') % 24]);

/* ---------- the save ---------- */
const solved = { polymul: 7, add: 3 }, day = '2026-11-16', top = D.topicFor(day);
assert.deepStrictEqual(D.clean(null), { day: '', id: '', need: 0, base: 0, done: false }); assert.deepStrictEqual(D.clean({ day: 'tuesday', id: 'nope', need: -4, base: 'x', done: 'yes' }), { day: '', id: '', need: 0, base: 0, done: false }, 'rubbish is made safe');
assert.deepStrictEqual(D.clean({ day, id: 'polymul', need: 10, base: 5, done: true }), { day, id: 'polymul', need: 10, base: 5, done: true });
{ const f = D.fresh(day, { [top.id]: 42 }); assert.deepStrictEqual(f, { day, id: top.id, need: top.need, base: 42, done: false }, 'a new quest starts from your count today'); assert.strictEqual(D.fresh(day, {}).base, 0); assert.strictEqual(D.fresh(day, null).base, 0); }
{ const f = D.fresh(day, { [top.id]: 5 });
  assert.deepStrictEqual(D.sync(f, day, { [top.id]: 9 }), f, 'the same day: nothing changes while you play'); assert.deepStrictEqual(D.sync({ ...f, done: true }, day, { [top.id]: 20 }), { ...f, done: true }, 'done is kept');
  assert.strictEqual(D.sync(f, day, { [top.id]: 2 }).base, 2, 'a count that went down (a reset) is the new start'); assert.strictEqual(D.sync(f, day, {}).base, 0);
  const next = D.dayKey(new Date(Date.UTC(2026, 10, 17, 12))), n = D.sync({ ...f, done: true }, next, { [D.topicFor(next).id]: 4 }); assert.deepStrictEqual(n, D.fresh(next, { [D.topicFor(next).id]: 4 }), 'a new day is a new quest, not done');
  { let later = null; for (let k = 2; k < 200 && !later; k++) { const key = D.dayKey(new Date(Date.UTC(2026, 10, 16 + k, 12))); if (D.topicFor(key).id === top.id) later = key; }
    assert.ok(later, 'the same game comes round again within 200 days'); assert.deepStrictEqual(D.sync({ ...f, done: true }, later, { [top.id]: 30 }), D.fresh(later, { [top.id]: 30 }), 'back after a break, on a day with the same game: the old finished quest does not carry over'); }
  assert.deepStrictEqual(D.sync(null, day, {}), D.fresh(day, {})); assert.deepStrictEqual(D.sync({ ...f, id: top.id === 'add' ? 'sub' : 'add' }, day, {}), D.fresh(day, {}), 'a save for the wrong game is replaced');
  assert.strictEqual(D.sync({ ...f, need: 99 }, day, {}).need, top.need, 'how many it asks comes from the topic'); }

/* ---------- progress and finishing ---------- */
{ const d = { day, id: 'polymul', need: 10, base: 7, done: false };
  assert.strictEqual(D.progress(d, { polymul: 7 }), 0); assert.strictEqual(D.progress(d, { polymul: 12 }), 5); assert.strictEqual(D.progress(d, { polymul: 17 }), 10); assert.strictEqual(D.progress(d, { polymul: 40 }), 10, 'never more than it asks'); assert.strictEqual(D.progress(d, { polymul: 3 }), 0, 'never below nothing'); assert.strictEqual(D.progress(d, { add: 99, polymul: 9 }), 2, 'only that game counts'); assert.strictEqual(D.progress(d, null), 0);
  let s = D.status(d, { polymul: 12 }); assert.deepStrictEqual([s.got, s.need, s.left, s.complete, s.done], [5, 10, 5, false, false]); assert.strictEqual(s.topic, D.byId.polymul); assert.strictEqual(s.task, 'Get 10 Multiply Table problems right'); assert.ok(/Polynomials wing/.test(s.where));
  s = D.status(d, { polymul: 17 }); assert.deepStrictEqual([s.got, s.left, s.complete], [10, 0, true]); assert.deepStrictEqual(D.status({ ...d, id: '' }, {}), { topic: undefined, task: '', where: '', got: 0, need: 10, left: 10, complete: false, done: false }, 'no quest: nothing complete'); assert.strictEqual(D.status({ ...d, need: 0 }, { polymul: 99 }).complete, false, 'a quest that asks for nothing is not complete');
  let r = D.step(d, { polymul: 16 }); assert.deepStrictEqual([r.event, r.d.done], [null, false]); r = D.step(d, { polymul: 17 }); assert.deepStrictEqual([r.event, r.d.done], ['complete', true], 'the tenth answer finishes it'); assert.deepStrictEqual(r.d, { ...d, done: true });
  r = D.step({ ...d, done: true }, { polymul: 30 }); assert.deepStrictEqual([r.event, r.d.done], [null, true], 'and it finishes only once: no second reward'); }

/* ---------- the words ---------- */
{ const d = { day, id: 'mines', need: 3, base: 0, done: false }, st = n => D.status(d, { mines: n });
  assert.strictEqual(D.trackerText(st(0)), 'Win 3 games of Minesweeper (0/3)'); assert.strictEqual(D.trackerText(st(2)), 'Win 3 games of Minesweeper (2/3)');
  const c0 = D.cardHtml(st(0), 'A new quest for today!'), c1 = D.cardHtml(st(1), 'Your quest for today'), c2 = D.cardHtml(st(2), 'Your quest for today'), done = D.cardHtml(D.status({ ...d, done: true }, { mines: 3 }), 'Today\u2019s quest');
  assert.ok(c0.includes('A new quest for today!') && c0.includes('Win 3 games of Minesweeper') && c0.includes('the minefield behind Wilson Hall') && c0.includes('200 chips') && c0.includes('<p class="dq-count">0 of 3</p>')); assert.ok(c0.includes('style="width:0%"') && c1.includes('style="width:33%"') && c2.includes('style="width:67%"'));
  assert.ok(c2.includes('2 of 3: one to go!') && !c1.includes('one to go') && !c0.includes('one to go')); assert.ok(c1.includes('aria-valuenow="1"') && c1.includes('aria-valuemax="3"') && c1.includes('role="progressbar"'));
  assert.ok(done.includes('dq-done') && done.includes('Complete!') && done.includes('style="width:100%"') && !c0.includes('dq-done')); for (const h of [c0, c1, c2, done]) { assert.ok(!/undefined|NaN|null/.test(h)); assert.strictEqual((h.match(/<div/g) || []).length, (h.match(/<\/div>/g) || []).length, 'balanced'); assert.strictEqual((h.match(/<p/g) || []).length, (h.match(/<\/p>/g) || []).length); }
  const f = D.finishHtml(st(3)); assert.ok(f.includes('Quest complete') && f.includes('You earned 200 chips!') && f.includes('Win 3 games of Minesweeper') && f.includes('A new quest comes tomorrow')); }
for (const x of D.TOPICS) { const d = { day, id: x.id, need: x.need, base: 0, done: false }, s = D.status(d, { [x.id]: x.need }); assert.ok(s.complete && D.cardHtml(s, 'k').includes(x.where) && D.trackerText(s).includes(x.task(x.need))); }
console.log('daily tests passed');
