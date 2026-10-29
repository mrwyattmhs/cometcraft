// Minesweeper with REAL keys (real Chromium): walk to the sign, press E, pick Easy, stand on the field and dig with X (the first dig is safe), flag a bomb with F, then dig a bomb and lose.
// The rules themselves (every level, the exact pay, the trophy) are checked in Node by tests/minesweeper.test.js; this is for the input: the sign, the menu, the aim from your feet, the keys.
const assert = require('assert');
module.exports = { name: 'browser:play-mines', tier: 'browser', covers: ['js/minesweeper.js', 'js/minefield.js', 'js/mines-menu.js', 'js/world.js', 'js/main.js', 'js/economy.js', 'js/store.js', 'css/style.css', 'index.html'], timeout: 600000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const st = () => page.evaluate(() => ({ ...__primeTime.mines.status(), flags: __primeTime.mines.stats().flags, chips: Store.get().chips, losses: Store.get().minesLosses }));
  const geo = await page.evaluate(() => { const M = Minesweeper; return { x0: M.PLOT_AT.x0, z0: M.PLOT_AT.z0 }; });
  await g.at(geo.x0 - 2.3, geo.z0 + 3.0, -Math.PI / 2, 0.06);                                     // on the strip between the dorm and the field, one block west of the sign, facing east
  await page.waitForFunction(() => /Play Minesweeper/.test(document.getElementById('prompt').innerText), { timeout: 15000 });
  await page.keyboard.press('KeyE'); await page.waitForFunction(() => !document.getElementById('mines').classList.contains('hidden'), { timeout: 10000 });
  await page.click('#mines-levels .bet:nth-child(1)'); await g.sleep(500);
  let s = await st(); assert.deepStrictEqual([s.state, s.name, s.size, s.mines, s.pay], ['ready', 'Easy', 10, 10, 100]); assert.ok(await page.evaluate(() => document.getElementById('mines').classList.contains('hidden')), 'the menu closes');
  const stand = async i => { const c = await page.evaluate(i => Minesweeper.tileCenter(1, i), i); await g.at(c.x, c.z, 0, -1.45); };            // stand over a square, looking straight down
  await stand(4 * 10 + 4); await page.keyboard.press('KeyX'); await g.sleep(500);
  s = await st(); assert.strictEqual(s.state, 'playing', 'the first dig starts the game'); assert.ok(s.safeLeft < 90, `squares were dug (${90 - s.safeLeft})`);
  const bombs = await page.evaluate(() => [...__primeTime.mines.game.mine].map((m, i) => m ? i : -1).filter(i => i >= 0)); assert.strictEqual(bombs.length, 10);
  await stand(bombs[0]); await page.keyboard.press('KeyF'); await g.sleep(500); s = await st(); assert.deepStrictEqual([s.bombsLeft, s.flags], [9, 1], 'F plants a flag on a bomb');
  const lost0 = s.losses, chips0 = s.chips; await stand(bombs[1]); await page.keyboard.press('KeyX'); await g.sleep(700); s = await st();
  assert.strictEqual(s.state, 'lost', 'digging a bomb loses'); assert.strictEqual(s.losses, lost0 + 1, 'and is counted'); assert.strictEqual(s.chips, chips0, 'a loss costs nothing');
  ctx.log('the sign, E, Easy, X (first dig safe), F, and a bomb');
} };
