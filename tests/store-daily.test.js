// Run with: node tests/store-daily.test.js
// The save's daily-quest field is cleaned when a save is LOADED (store.js loads from localStorage): a save from an older version has none, and a damaged one is made safe. store.js is a browser
// script, so it is run here with a small stand-in for localStorage and the other scripts it uses.
const assert = require('assert'), fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../js/store.js'), 'utf8');
function load(saved) {
  const mem = saved === undefined ? {} : { 'primetime.save.v1': JSON.stringify(saved) };
  const localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
  const Store = new Function('Catalog', 'Economy', 'Dorm', 'localStorage', 'window', `${src}; return Store;`)(require('../js/catalog.js'), require('../js/economy.js'), require('../js/dorm.js'), localStorage, {});
  return { daily: Store.get().daily, Store, mem };
}
const BLANK = { day: '', id: '', need: 0, base: 0, done: false };
assert.deepStrictEqual(load().daily, BLANK, 'a new save has no quest yet (the quest starts one)'); assert.deepStrictEqual(load({ chips: 500 }).daily, BLANK, 'an older save, from before the daily quest, has none');
const good = { day: '2026-11-16', id: 'polymul', need: 10, base: 7, done: true }; assert.deepStrictEqual(load({ daily: good }).daily, good, 'a good one is kept as it is');
assert.deepStrictEqual(load({ daily: { day: 'tuesday', id: 'NOPE', need: -4, base: 'x', done: 'yes' } }).daily, BLANK, 'rubbish is made safe');
assert.deepStrictEqual(load({ daily: { ...good, day: '2026-1-5' } }).daily, { ...good, day: '' }, 'a date must be YYYY-MM-DD'); assert.deepStrictEqual(load({ daily: { ...good, id: 'a' } }).daily, { ...good, id: '' }, 'a game id is 2 to 12 lower-case letters'); assert.strictEqual(load({ daily: { ...good, need: 5000 } }).daily.need, 99, 'it cannot ask for thousands');
assert.strictEqual(load({ daily: { ...good, base: -9 } }).daily.base, 0); assert.strictEqual(load({ daily: { ...good, base: 3.9 } }).daily.base, 3); assert.deepStrictEqual([load({ daily: { ...good, done: 1 } }).daily.done, load({ daily: { ...good, done: 'true' } }).daily.done], [false, false], 'done is true only when it is true');
assert.deepStrictEqual(load({ daily: { ...good, id: 12345 } }).daily, { ...good, id: '' }, 'a number is not a game id'); for (const bad of [null, 5, 'x', [], [1, 2]]) assert.deepStrictEqual(load({ daily: bad }).daily, BLANK, `a ${JSON.stringify(bad)} is not a quest`);
{ const { Store, mem } = load({ daily: good }); Store.set({ chips: 123 }); assert.deepStrictEqual(JSON.parse(mem['primetime.save.v1']).daily, good, 'and it is saved again with the rest'); assert.deepStrictEqual(Store.get().daily, good, 'and it is still there'); }
console.log('store daily tests passed');
