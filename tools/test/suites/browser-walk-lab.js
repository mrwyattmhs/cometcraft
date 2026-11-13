// A real keyboard walk (real Chromium, slow motion) along the new path to the Science Lab and in: down the path past the benches and lamps, E at the doors, then a real E at each of the three
// stations (each opens its game, Escape closes it), and out again. Everything else about the layout is measured in Node (sim:world, sim:lab).
const assert = require('assert');
module.exports = { name: 'browser:walk-lab', tier: 'browser', covers: ['js/lab.js', 'js/world.js', 'js/player.js', 'js/collide.js', 'js/main.js', 'js/pick-game.js', 'js/booth-game.js', 'index.html'], timeout: 900000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const pos = () => page.evaluate(() => ({ x: Player.x, z: Player.z, zone: __primeTime.getZone().name }));
  const walk = async (cond, maxMs) => { await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW'); const t0 = Date.now(); let p; do { await g.sleep(120); p = await pos(); } while (!cond(p) && Date.now() - t0 < maxMs); await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); await g.sleep(200); return pos(); };
  const prompt = re => page.waitForFunction(r => new RegExp(r).test(document.getElementById('prompt').innerText), { timeout: 15000 }, re.source).then(() => true, () => false);
  const F = await page.evaluate(() => ({ cz: Lab.FRONT.cz, x1: Lab.FRONT.x1, ex: Lab.EXIT.x, ez: Lab.EXIT.z, st: Lab.STATIONS.map(s => ({ id: s.id, label: s.label, x: s.x, z: s.z })) }));
  const isOpen = id => page.evaluate(n => ({ elements: ElementGame, cells: CellGame, atoms: AtomsGame })[n].isOpen(), id);

  /* ---------- along the path (past the benches and the lamps) to the doors ---------- */
  await g.at(-38.5, F.cz, Math.PI / 2, 0); let p = await walk(q => q.x < -41.5, 40000); assert.ok(p.x < -40.2, `walked along the path (x ${p.x.toFixed(2)})`);
  await g.at(F.x1 + 4.2, F.cz, Math.PI / 2, 0); p = await walk(q => q.x < F.x1 + 3.0, 40000); assert.ok(await prompt(/Enter the Science Lab/), 'the prompt shows in front of the doors'); await page.keyboard.press('KeyE'); await g.sleep(700);
  p = await pos(); assert.strictEqual(p.zone, 'Science Lab', 'E takes you in'); assert.ok(Math.abs(p.x) < 0.5 && p.z > 9, `just inside the door (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
  p = await walk(q => q.z < 7.5, 40000); assert.ok(p.z < 9.5 && Math.abs(p.x) < 1, `walked up the aisle (z ${p.z.toFixed(2)})`);
  /* ---------- each station, with a real E ---------- */
  for (const st of F.st) {
    const stand = { elements: [0, st.z + 1.0, 0], cells: [st.x + 1.2, 0, Math.PI / 2], atoms: [st.x - 1.2, 0, -Math.PI / 2] }[st.id]; const [x, z, yaw] = st.id === 'elements' ? [stand[0], stand[1], stand[2]] : [stand[0], st.z, stand[2]];
    await g.at(x, z, yaw, 0); assert.ok(await prompt(new RegExp(st.label)), `"${st.label}" shows at its station`); await page.keyboard.press('KeyE'); await g.sleep(500);
    assert.strictEqual(await isOpen(st.id), true, `E opens ${st.id}`); await page.keyboard.press('Escape'); await g.sleep(300); assert.strictEqual(await isOpen(st.id), false, 'and Escape closes it');
  }
  /* ---------- and out ---------- */
  await g.at(0, 9.0, Math.PI, 0); await walk(q => q.z > 10.3, 40000); assert.ok(await prompt(/Leave the Science Lab/), 'the way out shows its prompt'); await page.keyboard.press('KeyE'); await g.sleep(700);
  p = await pos(); assert.strictEqual(p.zone, 'Prime Time Village', 'E takes you back out'); assert.ok(Math.hypot(p.x - F.ex, p.z - F.ez) < 0.6, `in front of the doors (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
  ctx.log('along the path, in through the doors, up the aisle, E at all three stations, and out again');
} };
