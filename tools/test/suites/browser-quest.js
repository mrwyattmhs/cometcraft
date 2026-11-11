// Remy's Eye with REAL key presses in the real game loop (real Chromium): walk up to Remy and press E for the tenth pet, the reminder pop-ups as you arrive at each place, E at the fountain
// and at the Pet Corner, Escape to close each message, the last pet, and Remy on the bed in the dorm. Also that the tracker never covers the chip counter, on a desktop or a phone.
// (The story's logic is unit tested, and sim:quest plays it through the booths; winning a real game of Minesweeper is browser:play-mines's job, so here the win is recorded directly.)
const assert = require('assert');
module.exports = { name: 'browser:quest', tier: 'browser', covers: ['js/remy-quest.js', 'js/pets.js', 'js/store.js', 'js/main.js', 'js/world.js', 'js/dormroom.js', 'js/ui.js', 'css/style.css', 'index.html'], timeout: 600000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const st = () => page.evaluate(() => ({ step: Store.get().remyQuest.step, chips: Store.get().chips, pets: Store.get().remyPets, dialog: document.getElementById('dialog').classList.contains('hidden') ? null : [document.getElementById('dlg-title').textContent, document.querySelector('#dialog .dlg-body').innerText.trim()], toast: document.getElementById('toast').textContent, tracker: document.getElementById('quest').classList.contains('hidden') ? null : document.getElementById('quest').innerText.replace(/\s+/g, ' ').trim() }));
  const prompt = re => page.waitForFunction(r => new RegExp(r).test(document.getElementById('prompt').innerText), { timeout: 15000 }, re.source).then(() => true, () => false);
  const toastIs = re => page.waitForFunction(r => new RegExp(r).test(document.getElementById('toast').textContent), { timeout: 15000 }, re.source).then(() => true, () => false);
  const pressE = async () => { await page.keyboard.press('KeyE'); await g.sleep(350); }, esc = async () => { await page.keyboard.press('Escape'); await g.sleep(300); };
  const spots = await page.evaluate(() => { const hub = __primeTime.hub, f = l => { const i = hub.interactables.find(x => x.label === l); return { x: i.x, z: i.z }; }; return { field: f('Play Minesweeper'), shop: f('Browse the Pet Corner'), plaza: hub.park.plaza }; });
  // Remy stays put for the test, with nobody else around her
  const R = await page.evaluate(() => { const hub = __primeTime.hub; hub.npcs.forEach(n => { if (n.name !== 'Remy') { n.avatar.visible = false; n.x = n.tx = 50; n.z = n.tz = 50; n.wait = 9999; } }); const n = hub.npcs.find(x => x.name === 'Remy'); n.x = n.tx = -2; n.z = n.tz = 36; n.wait = 9999; n.avatar.position.set(-2, 0, 36); Store.set({ remyPets: 9 }); return { x: n.x, z: n.z }; });
  const toRemy = async () => { await g.at(R.x, R.z + 1.1, 0, -0.3); assert.ok(await prompt(/Pet Remy/), 'the prompt to pet Remy shows'); };

  /* ---------- the tenth pet ---------- */
  await toRemy(); await pressE(); let s = await st();
  assert.deepStrictEqual([s.pets, s.step, s.dialog && s.dialog[0]], [10, 'find', "Remy's eyeball fell out!"], 'E on the tenth pet'); assert.ok(await page.evaluate(() => { const p = __primeTime.hub.npcs.find(n => n.name === 'Remy').avatar.userData.patch; return !!p && p.visible; }), 'she has her eye patch');
  await esc(); s = await st(); assert.strictEqual(s.dialog, null, 'Escape closes the message'); assert.match(s.tracker, /Remy's Eye Find the eyeball/i);
  /* ---------- the tracker: on screen, readable, and not on top of the chips (desktop and phone) ---------- */
  for (const [label, w, h] of [['desktop', 1280, 800], ['phone', 390, 800]]) {
    await page.setViewport({ width: w, height: h }); await g.sleep(200);
    const box = await page.evaluate(() => { const r = e => { const b = document.getElementById(e).getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; }, q = r('quest'), wl = r('wallet'), cs = getComputedStyle(document.getElementById('quest')); return { q, wl, vw: innerWidth, size: parseFloat(cs.fontSize) }; });
    assert.ok(box.q.l >= 0 && box.q.r <= box.vw + 0.5 && box.q.t >= 0, `${label}: the tracker is on screen`); assert.ok(box.q.t >= box.wl.b - 0.5 || box.q.l >= box.wl.r, `${label}: and it does not cover the chip counter`); assert.ok(box.size >= 13, `${label}: at a readable size (${box.size}px)`);
  }
  await page.setViewport({ width: 1280, height: 800 });
  /* ---------- reminders as you arrive ---------- */
  await g.at(0, 46, 0, 0); await g.at(spots.field.x - 1, spots.field.z, -Math.PI / 2, 0); assert.ok(await toastIs(/somewhere in this field\. Win a game of Minesweeper/), 'arriving at the field says what to do');
  await g.at(0, 46, 0, 0); await g.at(spots.plaza.x, spots.plaza.z + 3.4, 0, 0); assert.ok(await toastIs(/You need the eyeball first/), 'arriving at the fountain early says what to do first');
  /* ---------- 1 and 2: the eyeball is dug up (a win is recorded), then washed with a real E at the fountain ---------- */
  await page.evaluate(() => Store.set({ minesWins: (Store.get().minesWins || 0) + 1 })); await g.sleep(300); s = await st(); assert.deepStrictEqual([s.step, s.dialog && s.dialog[0]], ['wash', 'You dug up the eyeball!']); await esc();
  await g.at(0, 46, 0, 0); await g.at(spots.plaza.x, spots.plaza.z + 3.0, 0, 0); assert.ok(await prompt(/Wash the eyeball/), 'the fountain has its prompt'); await pressE(); s = await st(); assert.deepStrictEqual([s.step, s.dialog && s.dialog[0]], ['vet', 'The eyeball is clean.']); await esc();
  /* ---------- 3: the Pet Corner, five right answers, and back ---------- */
  await g.at(spots.shop.x, spots.shop.z + 0.6, 0, 0); assert.ok(await prompt(/Ask the Pet Corner about Remy/), 'the Pet Corner asks about Remy'); await pressE(); s = await st();
  assert.strictEqual(s.step, 'answers'); assert.match(s.dialog[1], /Get 5 answers right/); assert.ok(await page.evaluate(() => document.getElementById('shop').classList.contains('hidden')), 'and the shop does not open over it'); await esc();
  for (let i = 0; i < 5; i++) await page.evaluate(() => { EquationGame.open(); document.querySelector('#eqn-levels .bet').click(); EquationGame.box.value = String(EquationGame.problem.x); document.getElementById('eqn-check').click(); EquationGame.close(); });
  s = await st(); assert.strictEqual(s.step, 'report'); assert.match(s.toast, /That is 5 right answers/); assert.strictEqual(s.dialog, null);
  await g.at(spots.shop.x, spots.shop.z + 0.6, 0, 0); assert.ok(await prompt(/Ask the Pet Corner about Remy/)); await pressE(); s = await st(); assert.deepStrictEqual([s.step, s.dialog], ['visit', ['The Pet Corner', 'Remy is ok, she will get used to one eye.']], 'the exact words'); await esc();
  /* ---------- 4: the last pet ---------- */
  const chips = (await st()).chips; await g.sleep(2100); await toRemy(); await pressE(); s = await st(); assert.deepStrictEqual([s.step, s.dialog && s.dialog[0], s.chips - chips], ['done', 'Remy purrs.', 250]); await esc(); s = await st(); assert.strictEqual(s.tracker, null, 'the tracker goes away');
  /* ---------- afterwards: she is on your bed in the dorm, and still out in the village ---------- */
  await page.evaluate(() => { const G = __primeTime; G.dorm.dormRoom.set([{ type: 'bed', x: 3, z: 1, rot: 0 }]); G.setZone(G.dorm, { x: 6.5, z: 6.4, yaw: 0 }); }); await g.at(8.0, 6.4, 0.55, -0.42);
  const bed = await page.evaluate(() => { const b = __primeTime.quest.bed, o = __primeTime.dorm.dormRoom.origin; return { visible: b.visible, x: b.position.x - o.x0, y: b.position.y, z: b.position.z - o.z0, patch: b.userData.patch.visible, inScene: __primeTime.dorm.group.children.includes(b) }; });
  assert.deepStrictEqual(bed, { visible: true, x: 3.5, y: 0.82, z: 2.3, patch: true, inScene: true }, 'Remy is lying on the bed, with her patch'); await g.shot('/tmp/quest_bed.png');
  await page.evaluate(() => { const G = __primeTime; G.setZone(G.hub, G.hub.spawn); }); await g.sleep(400);
  assert.ok(await page.evaluate(() => { const n = __primeTime.hub.npcs.find(x => x.name === 'Remy'); return n.avatar.userData.patch.visible && __primeTime.hub.group.children.includes(n.avatar); }), 'and outside she is still in the village');
  await page.evaluate(() => { __primeTime.hub.npcs.forEach(n => { n.avatar.visible = true; n.wait = 1; }); __primeTime.dorm.dormRoom.set([]); });
  ctx.log('E at Remy, reminders on arrival, E at the fountain and the Pet Corner, the exact words, +250, and Remy on the bed');
} };
