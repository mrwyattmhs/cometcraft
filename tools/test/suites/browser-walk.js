// A real keyboard walk (real Chromium, slow motion: software rendering manages only a frame or two a second, so the legs are short): through the casino's north archway, stopped by the
// wall beside it, and up to each of the three Polynomials-wing tables, where E opens them. Everything else about the layout is measured in Node (sim:world), not walked.
const assert = require('assert');
module.exports = { name: 'browser:walk', tier: 'browser', covers: ['js/world.js', 'js/casino-interior.js', 'js/player.js', 'js/collide.js', 'js/main.js', 'js/poly-game.js', 'js/coaster-game.js', 'index.html'], timeout: 900000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const pos = () => page.evaluate(() => ({ x: Player.x, z: Player.z }));
  const walk = async (cond, maxMs) => { await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW'); const t0 = Date.now(); let p; do { await g.sleep(120); p = await pos(); } while (!cond(p) && Date.now() - t0 < maxMs); await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); await g.sleep(200); return pos(); };
  const prompt = re => page.waitForFunction(r => new RegExp(r).test(document.getElementById('prompt').innerText), { timeout: 12000 }, re.source).then(() => true, () => false);
  await page.evaluate(() => { const G = __primeTime; G.setZone(G.casino, G.casino.spawn); }); await g.sleep(600);
  await g.at(7.5, -13.2, 0, 0); let p = await walk(q => q.z < -14.5, 25000); assert.ok(p.z > -14.3, `the wall beside the archway stops you (z = ${p.z.toFixed(2)})`);
  await g.at(0, -13.2, 0, 0); p = await walk(q => q.z < -15.2, 40000); assert.ok(p.z < -14.9, `you walk through the archway (z = ${p.z.toFixed(2)})`);
  for (const [x, label, game] of [[-7.5, /Sit at the multiply table/, 'PolyMulGame'], [0, /Sit at the add\/sub table/, 'PolyAddGame'], [7.5, /Sit at the coaster table/, 'CoasterGame']]) {
    await g.at(x, -23.5, 0, 0); await walk(q => q.z < -26.3, 40000); assert.ok(await prompt(label), `the prompt "${label.source}" shows as you walk up`);
    await page.keyboard.press('KeyE'); await g.sleep(500); assert.strictEqual(await page.evaluate(n => (0, eval)(n).isOpen(), game), true, `E opens ${game}`); await page.keyboard.press('Escape'); await g.sleep(250);
    assert.strictEqual(await page.evaluate(n => (0, eval)(n).isOpen(), game), false, 'and Escape closes it');
  }
  ctx.log('through the archway, stopped beside it, three tables opened with E');
} };
