// The Kelly Green set with gold outlines, through the real shop buttons (simulated browser): what it costs and says, the confirm-click purchase, trying on, and the gold bars on the avatar
// (36 for the shirt and its two sleeves, 24 for the pants, 24 for the shoes, 24 for the cap: 108 for the whole set), that they come off again, that re-dressing never doubles them, and that
// they hang on the limbs' own boxes so they swing with you.
const assert = require('assert');
const { plain, text } = require('../lib/util');
const GOLD = 0xffc933;

module.exports = { name: 'sim:wardrobe', tier: 'sim', covers: ['js/catalog.js', 'js/avatar.js', 'js/shop.js', 'js/store.js', 'js/main.js', 'js/ui.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, G, doc, w } = s, { Catalog: C, Avatar, Store, Shop } = T; s.start(); await s.frames(2);
  const bars = root => { let n = 0; root.traverse(o => { if (o.isMesh && o.material && o.material.type === 'MeshBasicMaterial' && o.material.color.getHex() === GOLD) n++; }); return n; };
  const me = G.me, P = me.userData.parts;
  const clickTab = label => { const b = [...doc.querySelectorAll('#shop button')].find(x => x.textContent.trim() === label); assert.ok(b, `a ${label} tab`); b.click(); };
  const card = id => [...doc.querySelectorAll('#shop .item')].find(li => text(li.querySelector('.item-name')).startsWith(C.find(id).name));
  const set = [['shirt-kelly-gold', 'Shirts', 36], ['pants-kelly-gold', 'Pants', 24], ['hat-kelly-gold', 'Hats', 24], ['shoes-kelly-gold', 'Shoes', 24]];
  assert.strictEqual(Avatar.GOLD, GOLD); assert.strictEqual(bars(me), 0, 'the starter outfit has no gold bars');

  /* ---------- the price, and what the shop says ---------- */
  Store.set({ chips: 0 }); Shop.open('style');
  for (const [id, tab] of set) {
    clickTab(tab); const li = card(id); assert.ok(li, `${id} is in the ${tab} tab`);
    assert.match(text(li.querySelector('.item-name small')), /^Need 5,000 more chips$/, `${id}: with no chips it says what is missing`); assert.ok(li.querySelector('.swatch').classList.contains('outlined'), `${id}: its swatch has the gold edge`);
    assert.strictEqual(li.querySelector('.btn.primary').disabled, true, 'and you cannot buy it'); assert.strictEqual(text(li.querySelector('.btn.primary')), 'Buy 5,000', 'the price reads 5,000');
  }
  clickTab('Shirts'); assert.ok(!card('shirt-red').querySelector('.swatch').classList.contains('outlined'), 'ordinary shirts have no gold edge'); assert.strictEqual(text(card('shirt-kelly-m').querySelector('.btn.primary')), 'Buy 1,000', 'the M tee reads 1,000'); assert.strictEqual(text(card('shirt-red').querySelector('.btn.primary')), 'Buy 400');
  Store.set({ chips: 4999 }); clickTab('Shirts'); assert.match(text(card('shirt-kelly-gold').querySelector('.item-name small')), /^Need 1 more chips$/, 'one chip short'); assert.strictEqual(card('shirt-kelly-gold').querySelector('.btn.primary').disabled, true);

  /* ---------- trying on does not cost anything, and shows the gold ---------- */
  Store.set({ chips: 100 }); clickTab('Pants'); const tryBtn = card('pants-kelly-gold').querySelectorAll('.btn')[0]; assert.strictEqual(text(tryBtn), 'Try on'); tryBtn.click();
  assert.strictEqual(bars(me), 24, 'trying the pants on shows 24 gold bars (two legs, twelve edges each)'); assert.strictEqual(Store.get().chips, 100, 'and costs nothing');
  clickTab('Pants'); card('pants-kelly-gold').querySelectorAll('.btn')[0].click(); assert.strictEqual(bars(me), 0, 'stopping puts the bars away');

  /* ---------- buying, through the real buttons: a confirm click, then it is yours and worn ---------- */
  Store.set({ chips: 5000 }); clickTab('Shirts'); let buy = card('shirt-kelly-gold').querySelector('.btn.primary'); assert.strictEqual(buy.disabled, false, 'with exactly 5,000 you can buy it'); buy.click();
  buy = card('shirt-kelly-gold').querySelector('.btn.primary'); assert.strictEqual(text(buy), 'Confirm 5,000', 'the first click asks you to confirm'); assert.strictEqual(Store.get().chips, 5000); buy.click();
  assert.strictEqual(Store.get().chips, 0, 'the second click spends exactly 5,000'); assert.ok(Store.owns('shirt-kelly-gold') && Store.get().equipped.shirt === 'shirt-kelly-gold', 'owned and worn');
  assert.match(text(doc.getElementById('shop-msg')), /Bought the Kelly Green Tee, gold outline for 5,000 chips\. It's equipped\./);
  assert.strictEqual(bars(me), 36, 'the shirt puts gold on the torso and both sleeves (3 boxes, 12 edges each)');
  assert.ok(P.torso.children.some(o => o.userData.outline), 'a frame hangs on the torso'); [P.armL, P.armR].forEach(a => assert.ok(a.children[0].children.some(o => o.userData.outline), 'and on each sleeve\'s own box, so it swings with the arm'));

  /* ---------- the whole set ---------- */
  Store.set({ chips: 15000 });
  for (const [id, tab] of set.slice(1)) { clickTab(tab); const b0 = card(id).querySelector('.btn.primary'); b0.click(); card(id).querySelector('.btn.primary').click(); assert.ok(Store.owns(id) && Store.get().equipped[C.find(id).slot] === id, `${id} bought and worn`); }
  assert.strictEqual(Store.get().chips, 0, 'three more pieces, 15,000 in all'); assert.strictEqual(bars(me), 108, 'the whole set: 36 + 24 + 24 + 24 gold bars');
  assert.deepStrictEqual(plain([P.legL, P.legR].map(l => l.children[0].children.some(o => o.userData.outline) && l.children[1].children.some(o => o.userData.outline))), [true, true], 'each leg has a frame on its pants and one on its shoe');
  assert.ok(me.userData.hat && me.userData.hat.children.filter(o => o.userData.outline).length === 2, 'the cap has a frame round each of its two pieces (crown and brim)');
  Avatar.dress(me, C.outfitFor(Store.get().equipped)); Avatar.dress(me, C.outfitFor(Store.get().equipped)); assert.strictEqual(bars(me), 108, 're-dressing never doubles the outlines');
  Avatar.animate(me, 1, 0.4); assert.ok(Math.abs(P.armL.rotation.x) > 0.01, 'the arms swing'); assert.ok(P.armL.children[0].children.some(o => o.userData.outline), 'and the frame is still on the arm that swings');
  const beforeLeg = P.legL.rotation.x; Avatar.animate(me, 1, 0.9); assert.notStrictEqual(P.legL.rotation.x, beforeLeg);

  /* ---------- taking it off: the closet, and nothing is left behind ---------- */
  Shop.openCloset(); clickTab('Shirts'); const owned = [...doc.querySelectorAll('#shop .item')].map(li => text(li.querySelector('.item-name'))); assert.ok(owned.some(t => t.startsWith('Kelly Green Tee, gold outline')), 'the closet lists it');
  assert.ok([...doc.querySelectorAll('#shop .item')].find(li => /gold outline/.test(li.textContent)).querySelector('.swatch').classList.contains('outlined'), 'with its gold swatch');
  const starter = [...doc.querySelectorAll('#shop .item')].find(li => text(li.querySelector('.item-name')).startsWith('Blue Tee')); starter.querySelector('.btn').click(); assert.strictEqual(bars(me), 72, 'taking the shirt off removes its 36 bars and leaves the other 72');
  clickTab('Pants'); [...doc.querySelectorAll('#shop .item')].find(li => text(li.querySelector('.item-name')).startsWith('Navy Pants')).querySelector('.btn').click(); clickTab('Shoes'); [...doc.querySelectorAll('#shop .item')].find(li => text(li.querySelector('.item-name')).startsWith('Dark Sneakers')).querySelector('.btn').click();
  clickTab('Hats'); [...doc.querySelectorAll('#shop .item')].find(li => text(li.querySelector('.item-name')).startsWith('No hat')).querySelector('.btn').click();
  assert.strictEqual(bars(me), 0, 'with everything off there is no gold left anywhere on the avatar'); assert.strictEqual(me.userData.hat, null);
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log('prices and wording, try on, buy with a confirm, 108 gold bars for the whole set, they swing, and they come off cleanly');
} };
