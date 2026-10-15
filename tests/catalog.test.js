// Run with: node tests/catalog.test.js
const assert = require('assert');
const path = require('path');
const C = require('../js/catalog.js');

/* ---------- the catalog itself ---------- */
const ids = C.ITEMS.map(i => i.id);
assert.strictEqual(new Set(ids).size, ids.length, 'item ids are unique');
C.ITEMS.forEach(i => {
  assert.ok(C.SLOTS.includes(i.slot), `${i.id} has a valid slot`);
  assert.ok(i.name && Number.isInteger(i.price) && i.price >= 0, `${i.id} has a name and a whole-number price`);
  assert.ok(i.id.startsWith(i.slot + '-'), `${i.id} id starts with its slot`);
  if (!i.none) assert.ok(Number.isInteger(i.color), `${i.id} has a color`);
});

// free starters: one per slot, price 0, exist
assert.deepStrictEqual(Object.keys(C.FREE).sort(), [...C.SLOTS].sort());
Object.entries(C.FREE).forEach(([slot, id]) => {
  assert.ok(C.find(id), `free ${slot} exists`);
  assert.strictEqual(C.find(id).slot, slot);
  assert.strictEqual(C.find(id).price, 0, `free ${slot} costs nothing`);
});
assert.ok(C.find('hat-none').none && C.find('pet-none').none, 'you can wear no hat and have no pet');

// prices: everything basic is 400, the M tee is 1000, only free starters are 0
C.ITEMS.forEach(i => {
  const free = Object.values(C.FREE).includes(i.id);
  if (free) assert.strictEqual(i.price, 0);
  else if (i.id === 'shirt-kelly-m') assert.strictEqual(i.price, 1000);
  else assert.strictEqual(i.price, 400, `${i.id} is a basic item`);
});
assert.strictEqual(C.BASIC, 400);
assert.strictEqual(C.SPECIAL, 1000);

// the Kelly green M shirt
const m = C.find('shirt-kelly-m');
assert.ok(m, 'the M shirt exists');
assert.strictEqual(m.emblem, 'M');
const [r, g, b] = [(m.color >> 16) & 255, (m.color >> 8) & 255, m.color & 255];
assert.ok(g > 150 && r < 110 && b < 60, `kelly green, not just any green (r${r} g${g} b${b})`);
assert.strictEqual(C.ITEMS.filter(i => i.emblem).length, 1, 'only one shirt carries an emblem');

// the basics from the plan are all there
const count = slot => C.forSlot(slot).length;
assert.ok(count('shirt') >= 10 && count('pants') >= 8 && count('hat') >= 7 && count('shoes') >= 7 && count('pencil') >= 7);
assert.strictEqual(count('pet'), 10, 'three dogs, four cats, three rabbits');
assert.strictEqual(C.forSlot('pet').filter(p => p.kind === 'dog').length, 3);
assert.strictEqual(C.forSlot('pet').filter(p => p.kind === 'cat').length, 4);
assert.strictEqual(C.forSlot('pet').filter(p => p.kind === 'rabbit').length, 3);
C.forSlot('pet').forEach(p => {
  assert.ok(C.PET_KINDS[p.kind].includes(p.variant), `${p.id} is a known variant`);
  assert.ok(!/calico/.test(p.variant), 'Remy is not for sale');
});
C.forSlot('hat').forEach(h => assert.ok(['cap', 'beanie'].includes(h.type), `${h.id} has a model`));
// no two items in a slot look the same
['shirt', 'pants', 'hat', 'shoes', 'pencil'].forEach(slot => {
  const keys = C.forSlot(slot, { includeNone: false }).map(i => `${i.type || ''}${i.color}`);
  assert.strictEqual(new Set(keys).size, keys.length, `no duplicate looks among ${slot}`);
});
C.forSlot('pet').forEach((p, i, all) => assert.ok(all.filter(q => q.kind === p.kind && q.color === p.color).length === 1));
assert.ok(!C.forSlot('hat').some(h => h.none) && C.forSlot('hat', { includeNone: true }).some(h => h.none), 'None only shows in the closet');

/* ---------- outfits ---------- */
const starter = C.outfitFor({ ...C.FREE });
assert.deepStrictEqual(starter, {
  shirt: { color: 0x2f6fdb, emblem: null }, pants: { color: 0x2b3a67 }, shoes: { color: 0x2a2a2a },
  hat: null, pencil: { color: 0xf2c230 }, pet: null,
}, 'the starter outfit matches the original avatar');
const fancy = C.outfitFor({ ...C.FREE, shirt: 'shirt-kelly-m', hat: 'hat-cap-red', pet: 'pet-cat-orange', pencil: 'pencil-pink' });
assert.deepStrictEqual(fancy.shirt, { color: 0x4cbb17, emblem: 'M' });
assert.deepStrictEqual(fancy.hat, { type: 'cap', color: 0xd94a4a });
assert.deepStrictEqual(fancy.pet, { kind: 'cat', variant: 'orange' });
assert.strictEqual(fancy.pencil.color, 0xf06fb0);
// bad ids and wrong-slot ids fall back to the starter
const bad = C.outfitFor({ shirt: 'nope', pants: 'shirt-red', hat: undefined, shoes: null, pencil: 'pet-dog-black', pet: 'x' });
assert.deepStrictEqual(bad, starter);
assert.ok(C.canAfford(400, C.find('hat-cap-red')) && !C.canAfford(399, C.find('hat-cap-red')));
assert.ok(C.canAfford(1000, m) && !C.canAfford(999, m));

/* ---------- the save state ---------- */
function freshStore(saved) {
  const storage = {};
  if (saved !== undefined) storage['primetime.save.v1'] = typeof saved === 'string' ? saved : JSON.stringify(saved);
  global.localStorage = { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); } };
  delete require.cache[require.resolve('../js/store.js')];
  const S = require('../js/store.js');
  return { S, storage };
}

let { S, storage } = freshStore();
assert.strictEqual(S.get().chips, 100);
assert.deepStrictEqual(S.get().owned.sort(), Object.values(C.FREE).sort(), 'starters are owned');
assert.deepStrictEqual(S.get().equipped, C.FREE);

// buying: not owned -> can't equip; spend, own, then equip
assert.strictEqual(S.equip('hat', 'hat-cap-red'), false, 'cannot wear what you do not own');
assert.strictEqual(S.spend(101), false, 'cannot spend more than you have');
assert.strictEqual(S.get().chips, 100);
assert.strictEqual(S.spend(60), true);
assert.strictEqual(S.get().chips, 40);
assert.strictEqual(S.own('hat-cap-red'), true);
assert.strictEqual(S.own('hat-cap-red'), false, 'owning twice does nothing');
assert.strictEqual(S.get().owned.filter(i => i === 'hat-cap-red').length, 1);
assert.strictEqual(S.equip('hat', 'hat-cap-red'), true);
assert.strictEqual(S.equip('shirt', 'hat-cap-red'), false, 'wrong slot');
assert.strictEqual(S.own('not-an-item'), false);
// spending is a choice: it can empty the wallet, and it never refunds the floor
assert.strictEqual(S.spend(40), true);
assert.strictEqual(S.get().chips, 0, 'spending all your chips leaves 0, not the 10-chip floor');
assert.strictEqual(S.spend(1), false);
assert.strictEqual(S.spend(-5), false);
assert.strictEqual(S.spend(2.5), false);
// ...but winning or losing a wager still floors, so a student with 0 chips can earn their way back
assert.strictEqual(S.addChips(5), true, 'the floor kicks in');
assert.strictEqual(S.get().chips, S.MIN_CHIPS);

// it saves, and a reload brings back everything
const saved = JSON.parse(storage['primetime.save.v1']);
assert.ok(saved.owned.includes('hat-cap-red') && saved.equipped.hat === 'hat-cap-red');
({ S } = freshStore(saved));
assert.ok(S.owns('hat-cap-red') && S.get().equipped.hat === 'hat-cap-red');
assert.strictEqual(S.get().chips, S.MIN_CHIPS);

// an old save from before the shop existed keeps its chips and gets the starter items
({ S } = freshStore({ chips: 750, practiceWins: 12 }));
assert.strictEqual(S.get().chips, 750);
assert.strictEqual(S.get().practiceWins, 12);
assert.deepStrictEqual(S.get().equipped, C.FREE);
assert.ok(S.owns('shirt-blue') && S.owns('pet-none'));

// a damaged save is repaired, never trusted
({ S } = freshStore({ chips: 300, owned: ['hat-cap-red', 'ghost-item', 42], equipped: { shirt: 'shirt-kelly-m', hat: 'hat-cap-red', pants: 'shirt-red', pet: 'pet-dog-golden' } }));
assert.ok(S.owns('hat-cap-red') && !S.owns('ghost-item'));
assert.strictEqual(S.get().equipped.hat, 'hat-cap-red', 'owned item stays equipped');
assert.strictEqual(S.get().equipped.shirt, C.FREE.shirt, 'equipped but not owned: back to the starter');
assert.strictEqual(S.get().equipped.pants, C.FREE.pants, 'wrong slot: back to the starter');
assert.strictEqual(S.get().equipped.pet, C.FREE.pet);
({ S } = freshStore('{ this is not json'));
assert.strictEqual(S.get().chips, 100);
({ S } = freshStore({ chips: 'lots', owned: 'nope', equipped: 5 }));
assert.strictEqual(S.get().chips, 100);
assert.deepStrictEqual(S.get().equipped, C.FREE);

// listeners fire on every change
({ S } = freshStore());
let calls = 0;
S.onChange(() => { calls++; });
const base = calls;
S.spend(10); S.own('pencil-red'); S.equip('pencil', 'pencil-red');
assert.strictEqual(calls - base, 3);
S.reset();
assert.strictEqual(S.get().chips, 100);
assert.deepStrictEqual(S.get().equipped, C.FREE);

console.log(`catalog tests passed (${C.ITEMS.length} items)`);
