// The Kelly Green set with gold outlines in the REAL render (real Chromium): what the simulated browser cannot see. Buy the four pieces through the shop's real buttons, press V for third person
// like a player, and count the gold and green pixels on the avatar: the plain starter outfit, then the set (thousands more gold, hundreds more green), then back to the starter (the same as
// before). Villagers are hidden so nobody walks into the picture.
const assert = require('assert');
module.exports = { name: 'browser:wardrobe', tier: 'browser', covers: ['js/catalog.js', 'js/avatar.js', 'js/shop.js', 'js/store.js', 'js/main.js', 'js/player.js', 'css/style.css', 'index.html'], timeout: 600000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  await page.setViewport({ width: 960, height: 640 });
  await page.evaluate(() => { __primeTime.hub.npcs.forEach(n => { const o = n.avatar || n.mesh || n.group; if (o) o.visible = false; }); });
  await g.at(0, 30, 0, 0.12); let toggled = false; if (!(await page.evaluate(() => Player.third))) { await page.keyboard.press('KeyV'); toggled = true; } await g.sleep(1500);
  const sample = async () => { const b64 = await page.screenshot({ encoding: 'base64', clip: { x: 330, y: 200, width: 300, height: 400 } });
    return page.evaluate(async b => { const img = new Image(); img.src = 'data:image/png;base64,' + b; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const px = x.getImageData(0, 0, c.width, c.height).data; let gold = 0, green = 0; for (let i = 0; i < px.length; i += 4) { const r = px[i], gg = px[i + 1], bb = px[i + 2]; if (r > 225 && gg > 170 && gg < 220 && bb < 100) gold++; if (gg > 150 && r < 120 && bb < 80) green++; } return { gold, green }; }, b64); };
  const tab = async t => { await page.evaluate(label => { [...document.querySelectorAll('#shop button')].find(b => b.textContent.trim() === label).click(); }, t); await g.sleep(200); };
  const clickItem = async (re, sel) => page.evaluate((r, s) => { const li = [...document.querySelectorAll('#shop .item')].find(i => new RegExp(r).test(i.querySelector('.item-name').textContent)); if (!li) throw new Error('no item ' + r); li.querySelector(s).click(); }, re.source, sel);

  const base = await sample();
  await page.evaluate(() => { Store.set({ chips: 25000 }); Shop.open('style'); }); await g.sleep(400);
  for (const t of ['Shirts', 'Pants', 'Hats', 'Shoes']) { await tab(t); for (let k = 0; k < 2; k++) { await clickItem(/gold outline/, '.btn.primary'); await g.sleep(200); } }       // Buy, then Confirm
  assert.strictEqual(await page.evaluate(() => Store.get().chips), 5000, 'four pieces at 5,000 each came out of 25,000');
  await g.closeAll(); await g.sleep(1500); const kelly = await sample();
  assert.ok(kelly.gold - base.gold > 1500, `the set adds thousands of gold pixels on the avatar (${base.gold} -> ${kelly.gold})`); assert.ok(kelly.green - base.green > 300, `and hundreds of green ones (${base.green} -> ${kelly.green})`);
  await page.evaluate(() => Shop.openCloset()); await g.sleep(300);
  for (const [t, name] of [['Shirts', 'Blue Tee'], ['Pants', 'Navy Pants'], ['Shoes', 'Dark Sneakers'], ['Hats', 'No hat']]) { await tab(t); await clickItem(new RegExp('^' + name), '.btn'); await g.sleep(200); }
  await g.closeAll(); await g.sleep(1500); const back = await sample();
  assert.ok(Math.abs(back.gold - base.gold) < 400 && Math.abs(back.green - base.green) < 150, `back in the starter outfit it looks like it did before (gold ${base.gold} -> ${back.gold}, green ${base.green} -> ${back.green})`);
  if (toggled) await page.keyboard.press('KeyV'); await page.evaluate(() => { __primeTime.hub.npcs.forEach(n => { const o = n.avatar || n.mesh || n.group; if (o) o.visible = true; }); });
  await page.setViewport({ width: 1280, height: 800 });
  ctx.log(`gold pixels on the avatar: starter ${base.gold}, Kelly Green set ${kelly.gold}, starter again ${back.gold}`);
} };
