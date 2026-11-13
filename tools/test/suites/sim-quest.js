// Remy's Eye, played from start to finish through the game's own actions (simulated browser): ten real pets (with the cooldown), the eye patch, the tracker, the reminders as you walk up to
// each place, a Minesweeper win, the fountain's prompt, the Pet Corner's E, five right answers at the real booths, "Remy is ok, she will get used to one eye.", the last pet and its reward,
// and Remy on your bed in the dorm (on the bottom bunk, or the floor if you have no bed) while she still wanders outside.
const assert = require('assert');
const { plain, text } = require('../lib/util');

module.exports = { name: 'sim:quest', tier: 'sim', covers: ['js/remy-quest.js', 'js/pets.js', 'js/store.js', 'js/main.js', 'js/world.js', 'js/dormroom.js', 'js/dorm.js', 'js/booth-game.js', 'js/shop.js', 'js/ui.js', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, G, $, click, w } = s, { Store, RemyQuest: Q, Player, UI } = T, quest = G.quest, hub = G.hub; s.start(); await s.frames(3);
  let clock = 1e6; w.Date.now = () => clock;                                 // the pet cooldown is two seconds of real time: this is the test's clock
  const remy = hub.npcs.find(n => n.name === 'Remy'), spot = label => hub.interactables.find(i => i.label === label), step = () => Store.get().remyQuest.step;
  const dlg = () => ($('dialog').classList.contains('hidden') ? null : { title: text($('dlg-title')), body: text($('dialog').querySelector('.dlg-body')) }), shut = () => UI.closeDialog();
  const toast = () => $('toast').textContent, tracker = () => ($('quest').classList.contains('hidden') ? null : text($('quest'))), patch = a => !!(a.userData.patch && a.userData.patch.visible);
  const pet = (wait = 2500) => { clock += wait; return spot('Pet Remy').action(); };
  const goTo = async (x, z) => { Player.teleport(x, z, 0); await s.frames(4); };

  /* ---------- before: nothing shows ---------- */
  assert.strictEqual(step(), 'none'); assert.strictEqual(tracker(), null); assert.ok(!patch(remy.avatar), 'Remy has both eyes'); assert.ok(!spot('Wash the eyeball')); assert.ok(spot('Browse the Pet Corner')); const base = hub.interactables.length; assert.strictEqual(base, 14);
  for (let n = 1; n <= 9; n++) { pet(); assert.strictEqual(Store.get().remyPets, n); assert.strictEqual(toast(), 'Remy purrs.'); assert.strictEqual(dlg(), null); assert.strictEqual(step(), 'none'); }
  pet(500); assert.strictEqual(Store.get().remyPets, 9, 'a pet inside the two-second cooldown is not counted'); assert.strictEqual(step(), 'none', 'and cannot start the quest');

  /* ---------- the tenth pet ---------- */
  pet(); assert.strictEqual(Store.get().remyPets, 10); assert.deepStrictEqual(dlg() && dlg().title, "Remy's eyeball fell out!"); assert.strictEqual(step(), 'find');
  assert.ok(patch(remy.avatar), 'she has an eye patch'); assert.match(tracker(), /^Remy's Eye\s*Find the eyeball: win a game of Minesweeper/); shut();
  pet(); assert.strictEqual(toast(), 'Remy purrs. Find the eyeball: win a game of Minesweeper, behind Wilson Hall.', 'petting her repeats the step'); assert.strictEqual(step(), 'find');

  /* ---------- reminders as you walk up to the places (and when you are early) ---------- */
  const field = spot('Play Minesweeper'), plaza = hub.park.plaza, shop = spot('Browse the Pet Corner'), door = spot('Enter the House of Algebra');
  await goTo(0, 44); const far = toast();
  await goTo(field.x - 1, field.z); assert.match(toast(), /somewhere in this field\. Win a game of Minesweeper to dig it up/, 'at the field');
  await goTo(0, 44); await goTo(plaza.x, plaza.z + 3.5); assert.match(toast(), /You need the eyeball first\. It is in the Minesweeper field behind Wilson Hall/, 'at the fountain, too early');
  await goTo(0, 44); await goTo(shop.x, shop.z + 1); assert.match(toast(), /You need the eyeball first/, 'at the Pet Corner, too early');
  shop.action(); assert.strictEqual(dlg(), null); assert.ok(!$('shop').classList.contains('hidden'), 'and the Pet Corner is still just a shop'); T.Shop.close(); assert.ok(far !== undefined);

  /* ---------- 1. find it: a Minesweeper win ---------- */
  Store.set({ minesWins: (Store.get().minesWins || 0) + 1 });
  assert.deepStrictEqual(dlg() && dlg().title, 'You dug up the eyeball!'); assert.strictEqual(step(), 'wash'); assert.match(tracker(), /Wash the eyeball in the fountain in the park/); shut();
  const wash = spot('Wash the eyeball'); assert.ok(wash && Math.hypot(wash.x - plaza.x, wash.z - plaza.z) < 0.01, 'the fountain has a prompt now'); assert.strictEqual(hub.interactables.length, base + 1);
  await goTo(0, 44); await goTo(shop.x, shop.z + 1); assert.match(toast(), /Wash the eyeball first, in the fountain in the park/); await goTo(0, 44); await goTo(plaza.x, plaza.z + 3.5); assert.match(toast(), /Press E to wash the eyeball/);
  /* ---------- 2. wash it ---------- */
  wash.action(); assert.deepStrictEqual(dlg() && dlg().title, 'The eyeball is clean.'); assert.strictEqual(step(), 'vet'); shut();
  assert.ok(!spot('Wash the eyeball'), 'the fountain\'s prompt is gone again'); assert.strictEqual(hub.interactables.length, base); assert.ok(spot('Ask the Pet Corner about Remy') === shop, 'the Pet Corner\'s prompt asks about Remy');
  await goTo(0, 44); await goTo(shop.x, shop.z + 1); assert.match(toast(), /Press E to ask the Pet Corner about Remy/);
  /* ---------- 3. the Pet Corner: five right answers, then back ---------- */
  shop.action(); assert.match(dlg().body, /Get 5 answers right at the booths in the House of Algebra, then come back/); assert.ok($('shop').classList.contains('hidden'), 'the shop does not open on top of it'); assert.strictEqual(step(), 'answers'); shut();
  shop.action(); assert.match(dlg().body, /Not yet\. 5 more right answers/); assert.strictEqual(step(), 'answers'); shut();
  await goTo(0, 44); await goTo(door.x + 1, door.z); assert.match(toast(), /Get 5 more right answers at any booth inside, for the Pet Corner/, 'at the House of Algebra\'s door');
  const answer = (game, pre, logic, right) => { game.open(); click($(`${pre}-levels`).querySelectorAll('.bet')[0]); const p = game.problem, a = [].concat(logic.answerOf(p)); game.boxes.forEach((b, i) => { b.value = String(right ? a[i] : a[i] + 1); }); click($(`${pre}-check`)); game.close(); };
  answer(T.EquationGame, 'eqn', T.Equations, false); assert.strictEqual(Store.get().remyQuest.answers, 0, 'a wrong answer does not count');
  answer(T.EquationGame, 'eqn', T.Equations, true); assert.strictEqual(Store.get().remyQuest.answers, 1); assert.strictEqual(toast(), '1 of 5 right answers for the Pet Corner.'); assert.match(tracker(), /Get 4 more right answers/);
  answer(T.MulDivGame, 'eqm', T.EquationsMD, true); answer(T.NumbersGame, 'nbg', T.NumberPairs, true); answer(T.EquationGame, 'eqn', T.Equations, true); assert.strictEqual(Store.get().remyQuest.answers, 4, 'any booth counts'); assert.match(tracker(), /Get 1 more right answer at/);
  answer(T.MulDivGame, 'eqm', T.EquationsMD, true); assert.strictEqual(step(), 'report'); assert.strictEqual(toast(), 'That is 5 right answers. Go back to the Pet Corner.'); assert.strictEqual(dlg(), null, 'no message box pops up in the middle of a booth');
  answer(T.EquationGame, 'eqn', T.Equations, true); assert.strictEqual(step(), 'report', 'more answers change nothing');
  shop.action(); assert.deepStrictEqual(dlg(), { title: 'The Pet Corner', body: 'Remy is ok, she will get used to one eye.' }, 'the exact words'); assert.strictEqual(step(), 'visit'); shut();
  assert.strictEqual(shop.label, 'Browse the Pet Corner', 'the Pet Corner is a shop again'); shop.action(); assert.strictEqual(dlg(), null); assert.ok(!$('shop').classList.contains('hidden')); T.Shop.close();
  assert.match(tracker(), /Go and pet Remy/); assert.ok(patch(remy.avatar), 'the eye does not come back: she still has her patch');
  /* ---------- not on the bed yet ---------- */
  spot('Enter Wilson Hall').action(); await s.frames(4); assert.strictEqual(G.getZone(), G.dorm); assert.strictEqual(quest.bed.visible, false, 'she is not on your bed until the quest is done'); G.setZone(hub, hub.spawn); await s.frames(2);
  /* ---------- 4. go and see her ---------- */
  const chips = Store.get().chips; pet(); assert.deepStrictEqual(dlg() && dlg().title, 'Remy purrs.'); assert.match(dlg().body, /250 chips/); assert.strictEqual(Store.get().chips - chips, 250, 'the reward'); assert.strictEqual(step(), 'done'); shut();
  assert.strictEqual(tracker(), null, 'the tracker is gone'); assert.ok(patch(remy.avatar), 'and she keeps her patch for good'); pet(); assert.strictEqual(toast(), 'Remy purrs.'); assert.strictEqual(Store.get().chips - chips, 250, 'the reward is paid once');
  Store.set({ minesWins: Store.get().minesWins + 1 }); assert.strictEqual(dlg(), null, 'a later Minesweeper win has nothing to do with it'); await goTo(0, 44); const quiet = toast(); await goTo(field.x - 1, field.z); assert.strictEqual(toast(), quiet, 'and there are no more reminders');

  /* ---------- afterwards: on your bed whenever you are in the dorm; still wandering outside ---------- */
  const room = G.dorm.dormRoom, o = room.origin, bed = quest.bed, at = () => plain({ x: +bed.position.x.toFixed(2), y: +bed.position.y.toFixed(2), z: +bed.position.z.toFixed(2) });
  room.set([]); spot('Enter Wilson Hall').action(); await s.frames(4);
  assert.ok(bed.visible && patch(bed), 'Remy is in your room, with her patch'); assert.ok(bed.userData.lying && bed.userData.parts.legs.every(l => !l.visible), 'lying down'); assert.strictEqual(at().y, 0, 'with no bed she lies on the floor');
  assert.ok(Math.abs(at().x - (o.x0 + 4)) <= 1 && Math.abs(at().z - (o.z0 + 3)) <= 1, 'in the middle of the room');
  room.set([{ type: 'bed', x: 3, z: 1, rot: 0 }]); await s.frames(4); assert.deepStrictEqual(at(), { x: o.x0 + 3.5, y: 0.82, z: o.z0 + 2.3 }, 'on the bed, a little toward its foot');
  room.set([{ type: 'bed', x: 6, z: 3, rot: 1 }]); await s.frames(4); { const f = T.Dorm.footprint('bed', 1); assert.ok(Math.abs(at().x - (o.x0 + 6 + f.w / 2)) <= 0.31 && Math.abs(at().z - (o.z0 + 3 + f.d / 2)) <= 0.31 && at().y === 0.82, 'move the bed and she moves with it'); }
  room.set([{ type: 'bunk', x: 0, z: 4, rot: 0 }]); await s.frames(4); assert.strictEqual(at().y, 0.7, 'on a bunk bed she takes the bottom bunk');
  room.set([{ type: 'desk', x: 3, z: 2, rot: 0 }, { type: 'tv', x: 3, z: 3, rot: 0 }, { type: 'dresser', x: 5, z: 2, rot: 0 }]); await s.frames(4);
  { const cells = new Set(); room.get().forEach(i => { const f = T.Dorm.footprint(i.type, i.rot); for (let x = 0; x < f.w; x++) for (let z = 0; z < f.d; z++) cells.add(`${i.x + x},${i.z + z}`); }); assert.strictEqual(at().y, 0); assert.ok(!cells.has(`${Math.floor(at().x - o.x0)},${Math.floor(at().z - o.z0)}`), 'with no bed and furniture in the middle, she lies on a free bit of floor, not inside the furniture'); }
  G.setZone(hub, hub.spawn); await s.frames(3); assert.ok(remy.avatar.visible !== false && patch(remy.avatar) && hub.npcs.includes(remy), 'outside, Remy still wanders the village');
  assert.deepStrictEqual(plain(Q.clean(Store.get().remyQuest)), { step: 'done', answers: 5 }, 'and it is all in the save'); assert.deepStrictEqual(s.errors, [], 'no errors');
  ctx.log('ten pets, the patch, reminders, the field, the fountain, the Pet Corner, five answers, the last pet (+250), and Remy on the bed');
} };
