// A real keyboard walk (real Chromium, slow motion) into the House of Algebra and out again, and along the new street of shops: up to the doors and E to go in, the aisle, both booths and
// E to open them, back to the door and E to leave; then along the street from the sidewalk, and into the front of a shop (it is solid). Everything else about the layout is measured in Node.
const assert = require('assert');
module.exports = { name: 'browser:walk-house', tier: 'browser', covers: ['js/house.js', 'js/world.js', 'js/player.js', 'js/collide.js', 'js/main.js', 'js/equation-game.js', 'index.html'], timeout: 900000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const pos = () => page.evaluate(() => ({ x: Player.x, z: Player.z, zone: __primeTime.getZone().name }));
  const walk = async (cond, maxMs) => { await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW'); const t0 = Date.now(); let p; do { await g.sleep(120); p = await pos(); } while (!cond(p) && Date.now() - t0 < maxMs); await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); await g.sleep(200); return pos(); };
  const F = await page.evaluate(() => ({ cz: House.FRONT.cz, ex: House.EXIT.x, ez: House.EXIT.z, sz: World.STREET.z }));        // where the House's doors and the street are: read from the game, never hard-coded
  const prompt = re => page.waitForFunction(r => new RegExp(r).test(document.getElementById('prompt').innerText), { timeout: 15000 }, re.source).then(() => true, () => false);

  /* ---------- the doors: walk up, E, in ---------- */
  await g.at(-6.9, F.cz, Math.PI / 2, 0); let p = await walk(q => q.x < -7.7, 40000); assert.ok(p.x < -7.3, `walked toward the doors (x ${p.x.toFixed(2)})`);
  assert.ok(await prompt(/Enter the House of Algebra/), 'the prompt shows in front of the doors'); await page.keyboard.press('KeyE'); await g.sleep(700);
  p = await pos(); assert.strictEqual(p.zone, 'House of Algebra', 'E takes you in'); assert.ok(Math.abs(p.x) < 0.5 && p.z > 10, `just inside the door (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
  /* ---------- inside: up the aisle, then to the first booth ---------- */
  p = await walk(q => q.z < 7.5, 40000); assert.ok(p.z < 9.5 && Math.abs(p.x) < 1, `walked up the aisle (z ${p.z.toFixed(2)})`);
  await g.at(-8.0, -2.5, Math.PI / 2, 0.02); assert.ok(await prompt(/Visit the Missing Number booth/), 'the first booth shows its prompt'); await page.keyboard.press('KeyE'); await g.sleep(500);
  assert.strictEqual(await page.evaluate(() => EquationGame.isOpen()), true, 'E opens the Missing Number table'); await page.keyboard.press('Escape'); await g.sleep(300); assert.strictEqual(await page.evaluate(() => EquationGame.isOpen()), false);
  await g.at(8.0, -2.5, -Math.PI / 2, 0.02); assert.ok(await prompt(/Visit the Multiply & Divide booth/), 'the booth across the aisle shows its prompt'); await page.keyboard.press('KeyE'); await g.sleep(500);
  assert.strictEqual(await page.evaluate(() => MulDivGame.isOpen() && !EquationGame.isOpen()), true, 'E opens the Multiply and Divide table'); await page.keyboard.press('Escape'); await g.sleep(300); assert.strictEqual(await page.evaluate(() => MulDivGame.isOpen()), false);
  /* ---------- and out ---------- */
  await g.at(0, 9.0, Math.PI, 0); await walk(q => q.z > 10.3, 40000); assert.ok(await prompt(/Leave the House of Algebra/), 'the way out shows its prompt'); await page.keyboard.press('KeyE'); await g.sleep(700);
  p = await pos(); assert.strictEqual(p.zone, 'Prime Time Village', 'E takes you back out'); assert.ok(Math.hypot(p.x - F.ex, p.z - F.ez) < 0.6, `in front of the doors (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
  /* ---------- the street of shops ---------- */
  await g.at(-7.5, F.sz, Math.PI / 2, 0); p = await walk(q => q.x < -10.5, 40000); assert.ok(p.x < -9, `walked along the street, away from the road (x ${p.x.toFixed(2)})`);
  const stopZ = F.sz - 6.5 + 3.1 + 0.35;                                                                                                  // the north-side shop's front wall, plus your own width
  await g.at(-14, F.sz, 0, 0); p = await walk(q => q.z < stopZ - 1, 40000); assert.ok(Math.abs(p.z - stopZ) < 0.6, `the front of the shop on the north side is solid: you stop at it (z ${p.z.toFixed(2)}, expected about ${stopZ.toFixed(2)})`);
  ctx.log('in through the doors, up the aisle, both booths open, out again; along the street and stopped by a shop front');
} };
