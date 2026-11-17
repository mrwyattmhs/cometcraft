// The daily quest in the REAL browser: the tracker and popups as they are laid out and drawn.
//   THE TRACKERS    Remy's and the daily one stack under the chips: no overlap with each other, the chips or the controls hint, inside the screen, text not cut off, at four screen sizes
//   THE POPUP       a real Q key opens it, Escape closes it, Q does nothing over another window; its progress bar really is as full as you are; it fits and every word is readable (contrast)
//   FINISHING       the last right answer pays 200 chips (the chip counter on screen shows it), and the completion popup fits and is readable; the tracker is then gone
//   A NEW DAY       the next day brings a new tracker, with nothing popping up by itself; a real Q shows the new quest, and the popup closes with a real click
const assert = require('assert');
const { FITS, assertReadable } = require('../lib/scan');
module.exports = { name: 'browser:daily', tier: 'browser', covers: ['js/daily.js', 'js/store.js', 'js/trophies.js', 'js/main.js', 'js/ui.js', 'js/clock.js', 'css/style.css', 'index.html', 'tools/test/lib/scan.js'], timeout: 600000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const SIZES = [['desktop 1280x720', 1280, 720], ['phone 390x760', 390, 760], ['small phone 375x667', 375, 667], ['tiny phone 360x640', 360, 640]];
  const q = fn => page.evaluate(fn);
  const dialogOpen = () => q(() => !document.getElementById('dialog').classList.contains('hidden'));
  const box = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e || e.classList.contains('hidden')) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, sw: e.scrollWidth, cw: e.clientWidth }; }, sel);
  const hit = (a, b) => a && b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;
  await q(() => { Clock.setNow(() => new Date(2026, 10, 16, 9)); Store.reset(); __primeTime.daily.resume(); }); await g.closeAll();
  const info = () => q(() => { const d = DailyQuest.byId[__primeTime.daily.current().id]; return { id: d.id, need: __primeTime.daily.current().need, task: d.task(__primeTime.daily.current().need), text: (document.querySelector('#daily span') || {}).textContent || '', chips: Number(document.getElementById('chips').textContent) }; });
  const award = n => page.evaluate(k => { const id = __primeTime.daily.current().id; for (let i = 0; i < k; i++) Trophies.award(id); }, n);
  let s = await info(); assert.strictEqual(s.text, `${s.task} (0/${s.need})`, 'the tracker shows today\'s quest');

  /* ---------- the trackers, measured, at four screen sizes ---------- */
  await q(() => { Store.set({ remyQuest: { step: 'find', answers: 0 } }); __primeTime.quest.refresh(); });
  for (const [label, w, h] of SIZES) {
    await page.setViewport({ width: w, height: h }); await g.sleep(150);
    const b = { wallet: await box('#wallet'), hint: await box('#controls-hint'), quest: await box('#quest'), daily: await box('#daily') };
    assert.ok(b.quest && b.daily, `${label}: both trackers are on screen`); assert.ok(!hit(b.quest, b.daily) && b.daily.y >= b.quest.b - 1, `${label}: the daily tracker is below Remy's, not on top of it`);
    for (const k of ['quest', 'daily']) { const t = b[k]; assert.ok(!hit(t, b.wallet), `${label}: the ${k} tracker is clear of the chips`); assert.ok(t.x >= 0 && t.r <= w && t.y >= 0 && t.b <= h, `${label}: the ${k} tracker is inside the screen`); assert.ok(t.sw <= t.cw + 1, `${label}: its text is not cut off`); assert.ok(t.w <= Math.min(340, w - 24) + 1, `${label}: no wider than it should be (${Math.round(t.w)})`); }
    if (b.hint) assert.ok(!hit(b.daily, b.hint) && !hit(b.quest, b.hint), `${label}: clear of the controls hint`);
  }
  await q(() => { Store.set({ remyQuest: { step: 'none', answers: 0 } }); __primeTime.quest.refresh(); }); await page.setViewport({ width: 1280, height: 800 });
  assert.ok(await box('#daily') && !(await box('#quest')), 'without Remy\'s quest the daily tracker is alone, in the same place'); ctx.log('trackers: stacked, clear of everything, inside the screen, not cut off, at 4 sizes');

  /* ---------- the title / pause screen: no tracker, no popup; the real Play button brings the tracker back, quietly ---------- */
  await q(() => { if (document.pointerLockElement) document.exitPointerLock(); else document.dispatchEvent(new Event('pointerlockchange')); }); await g.sleep(300);          // (let go of the mouse, as a player does: the browser tells the game, which shows its pause screen)
  assert.ok(await q(() => !document.getElementById('start-screen').classList.contains('hidden')), 'the pause screen is up'); assert.ok(!(await box('#daily')), 'the tracker is not shown behind it'); assert.ok(!(await dialogOpen()), 'and no quest popup');
  await page.click('#play'); await g.sleep(250); assert.ok(await box('#daily'), 'a real click on Play shows the tracker'); assert.ok(!(await dialogOpen()) && !(await q(() => UI.isOpen())), 'and nothing pops up'); ctx.log('the pause screen hides the tracker; Play brings it back with no popup');

  /* ---------- Q: a real key, a real popup ---------- */
  await page.keyboard.press('KeyQ'); await g.sleep(200); assert.ok(await dialogOpen(), 'a real Q key opens today\'s quest');
  assert.strictEqual(await q(() => document.querySelector('#dialog #dlg-title').textContent), 'Daily Quest'); assert.ok((await q(() => document.querySelector('#dialog .dq-card').textContent)).includes(s.task), 'it names the task'); await page.keyboard.press('Escape'); await g.sleep(150); assert.ok(!(await dialogOpen()), 'Escape closes it');
  await q(() => ElementGame.open()); await page.keyboard.press('KeyQ'); await g.sleep(150); assert.ok(!(await dialogOpen()), 'Q does nothing over another window'); await g.closeAll();
  /* the bar is as full as you are, and the popup fits and reads well at every size */
  await award(Math.ceil(s.need * 0.6)); const got = Math.ceil(s.need * 0.6);
  for (const [label, w, h] of SIZES) {
    await page.setViewport({ width: w, height: h }); await page.keyboard.press('KeyQ'); await g.sleep(250);
    const clipped = () => q(() => { const b = document.querySelector('#dialog .dlg-body'), btn = document.querySelector('#dialog .dlg-actions button').getBoundingClientRect(); return { inner: b.scrollHeight - b.clientHeight, buttonVisible: btn.bottom <= innerHeight && btn.top >= 0 }; });
    const m = await q(() => { const bar = document.querySelector('.dq-bar'), fill = bar.querySelector('i'), panel = document.querySelector('#dialog .dialog-panel'), o = document.getElementById('dialog'), pr = panel.getBoundingClientRect(); return { pct: fill.getBoundingClientRect().width / bar.getBoundingClientRect().width, panelBottom: pr.bottom, panelTop: pr.top, vh: innerHeight, over: o.scrollHeight - o.clientHeight, right: pr.right, vw: innerWidth }; });
    assert.ok(Math.abs(m.pct - got / s.need) < 0.04, `${label}: the bar is ${Math.round(100 * got / s.need)}% full (${Math.round(m.pct * 100)}%)`); assert.ok(m.panelTop >= 0 && m.panelBottom <= m.vh && m.right <= m.vw, `${label}: the popup is on the screen`); assert.ok(m.over <= 1, `${label}: it does not scroll`); { const c = await clipped(); assert.ok(c.inner <= 1, `${label}: none of the quest card is cut off inside the popup (${c.inner} px hidden)`); assert.ok(c.buttonVisible, `${label}: the Got it button is on the screen`); }
    assert.deepStrictEqual(await page.evaluate(FITS), [], `${label}: fits`); await assertReadable(page, `daily quest popup, ${label}`); await g.closeAll();
  }
  await page.setViewport({ width: 1280, height: 800 }); ctx.log('Q and Escape by real keys; the bar is as full as you are; the popup fits and is readable at 4 sizes');

  /* ---------- finishing: 200 chips, a popup, and the tracker goes away ---------- */
  const before = (await info()).chips; await award(s.need - got); await g.sleep(300);
  assert.ok(await dialogOpen(), 'the last answer opens the completion popup'); assert.strictEqual(await q(() => document.querySelector('#dialog #dlg-title').textContent), 'Quest complete!');
  assert.strictEqual((await info()).chips - before, 200, 'the chip counter on screen went up by 200'); assert.ok(!(await box('#daily')), 'the tracker is gone once the quest is finished (it is not on screen at all)');
  for (const [label, w, h] of SIZES) { await page.setViewport({ width: w, height: h }); await g.sleep(150); assert.deepStrictEqual(await page.evaluate(FITS), [], `${label}: the completion popup fits`); { const c = await q(() => { const b = document.querySelector('#dialog .dlg-body'); return b.scrollHeight - b.clientHeight; }); assert.ok(c <= 1, `${label}: none of the completion card is cut off (${c} px hidden)`); } await assertReadable(page, `quest complete popup, ${label}`); }
  await page.setViewport({ width: 1280, height: 800 }); await g.closeAll(); await award(5); assert.strictEqual((await info()).chips - before, 200, 'more answers pay nothing more'); ctx.log('finishing: +200 on the chip counter, the popup fits and reads, the tracker is gone, no second reward');

  /* ---------- a new day: the tracker comes back, nothing pops up, a real Q shows the quest ---------- */
  await q(() => { Clock.setNow(() => new Date(2026, 10, 17, 0, 10)); __primeTime.daily.check(); });
  s = await info(); assert.ok(s.text && !s.text.includes('complete'), 'a new day: a new quest'); assert.ok(await box('#daily'), 'and its tracker is back on screen'); assert.ok(!(await dialogOpen()), 'with no popup in the middle of play');
  await page.keyboard.press('KeyQ'); await g.sleep(250); assert.ok(await dialogOpen()); assert.ok((await q(() => document.querySelector('#dialog .dq-kicker').textContent)).includes('Your quest for today')); await assertReadable(page, 'the new quest for today');
  await page.click('#dialog .dlg-actions button'); await g.sleep(150); assert.ok(!(await dialogOpen()), 'a real click on Got it closes it'); assert.ok(!(await q(() => UI.isOpen())), 'and the game is free again');
  await q(() => Clock.setNow()); ctx.log('a new day: the tracker is back, no popup by itself, Q shows it, a click closes it');
} };
