// The clock game with REAL input (real Chromium):
//   Easy by a real click on a number, Medium by a real mouse DRAG of the long hand round the face, Hard by real typing; the arrow keys; every numeral can be hit by a real click
//   the wall clocks: their actual pixels are read back from the canvas (cream face, numerals, the hands at the right angles) for a time the test sets, in the classroom and the lab
//   all states of the window: no scrolling at four screen sizes, with the clock face, pad keys and boxes big enough to use
const assert = require('assert');
const { FITS } = require('../lib/scan');
module.exports = { name: 'browser:play-clock', tier: 'browser', covers: ['js/clock.js', 'js/clock-game.js', 'js/numpad.js', 'js/world.js', 'js/lab.js', 'css/style.css', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'index.html'], timeout: 900000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const state = st => page.waitForFunction(s => ClockGame.state() === s, { timeout: 20000 }, st);
  const open = lv => page.evaluate(l => { ClockGame.open(); document.querySelectorAll('#clk-levels .bet')[l - 1].click(); }, lv);
  const info = () => page.evaluate(() => ({ chips: Store.get().chips, problem: ClockGame.problem, value: ClockGame.value }));
  const face = () => page.$eval('#clk-fig svg', e => { const r = e.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 }; });
  /** where on the face (in screen pixels) an angle in degrees from 12 is, at a fraction of the radius */
  const at = (f, deg, k = 0.8) => ({ x: f.cx + Math.sin(deg * Math.PI / 180) * f.r * k, y: f.cy - Math.cos(deg * Math.PI / 180) * f.r * k });

  /* ---------- every numeral can be hit by a real click ---------- */
  await open(1); await g.sleep(200);
  for (let n = 1; n <= 12; n++) { const hit = await page.evaluate(k => { const t = document.querySelector(`#clk-fig [data-num="${k}"] circle`).getBoundingClientRect(), e = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2); return e && e.closest('[data-num]') && e.closest('[data-num]').dataset.num; }, n); assert.strictEqual(hit, String(n), `a click on the ${n} reaches the ${n}`); }
  ctx.log('every numeral on the face can be hit by a real click');

  /* ---------- Easy: a real click on a number, then Check ---------- */
  let s = await info(); const c0 = s.chips; await page.click(`#clk-fig [data-num="${s.problem.hour}"]`); assert.strictEqual((await info()).value, s.problem.hour, 'a real click on the number sets the short hand there');
  await page.click('#clk-go'); await state('done'); s = await info(); assert.strictEqual(s.chips - c0, 10, 'Easy pays 10'); assert.ok(await page.evaluate(() => !document.querySelector('#clk-fig .clk-wrong')), 'no red hand when it is right');
  await page.click('#clk-next'); await state('playing'); s = await info(); const wrongHour = s.problem.hour === 12 ? 1 : s.problem.hour + 1; await page.click(`#clk-fig [data-num="${wrongHour}"]`); await page.keyboard.press('Enter'); await state('done');
  assert.strictEqual((await info()).chips - c0, 10, 'a wrong click pays nothing'); assert.ok(await page.evaluate(() => !!document.querySelector('#clk-fig .clk-wrong') && !!document.querySelector('#clk-fig .clk-right')), 'the wrong hand is red and the right place green');

  /* ---------- the arrow keys ---------- */
  await open(1); await state('playing'); s = await info(); await page.keyboard.press('ArrowRight'); assert.strictEqual((await info()).value, s.value % 12 + 1, 'the right arrow moves the short hand one hour on'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); assert.strictEqual((await info()).value, ((s.value + 10) % 12) + 1, 'and the left arrow back');

  /* ---------- Medium: a real drag of the long hand round the face ---------- */
  await open(2); await state('playing'); s = await info(); let f = await face(); const m0 = s.chips, target = s.problem.minute;
  let a = at(f, 90); await page.mouse.move(a.x, a.y); await page.mouse.down(); assert.strictEqual((await info()).value, 15, 'pressing on the 3 puts the long hand at 15 minutes');
  for (let d = 90; d <= target * 6 + (target * 6 < 90 ? 360 : 0); d += 6) { a = at(f, d); await page.mouse.move(a.x, a.y); } a = at(f, target * 6); await page.mouse.move(a.x, a.y); await page.mouse.up();
  assert.strictEqual((await info()).value, target, `dragging the long hand round to ${target} minutes leaves it at ${target}`); const turned = await page.$eval('#clk-fig [data-hand="minute"]', e => e.getAttribute('transform')); assert.ok(turned.includes(`rotate(${(target * 6).toFixed(2)}`), 'and the hand on screen turned to match');
  await page.click('#clk-go'); await state('done'); assert.strictEqual((await info()).chips - m0, 25, 'Medium pays 25 for the dragged answer');
  await page.click('#clk-next'); await state('playing'); await page.mouse.move(f.cx, f.cy); a = at(f, 270); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.up(); assert.strictEqual((await info()).value, 45, 'a press on the 9 is 45 minutes'); assert.ok(await page.$eval('#clk-nudge', e => e.classList.contains('clk-minutes')));
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); assert.strictEqual((await info()).value, 47); await page.keyboard.down('Shift'); await page.keyboard.press('ArrowLeft'); await page.keyboard.up('Shift'); assert.strictEqual((await info()).value, 42, 'Shift and an arrow moves five minutes');

  /* ---------- Hard: real typing, and real taps on the pad ---------- */
  await open(3); await state('playing'); s = await info(); const h0 = s.chips; await page.keyboard.type(String(s.problem.hour)); await page.keyboard.press('Enter'); await page.keyboard.type(String(s.problem.minute).padStart(2, '0')); await page.keyboard.press('Enter'); await state('done');
  assert.strictEqual((await info()).chips - h0, 50, 'typing the hour, Enter, the minutes, Enter: Hard pays 50'); await page.click('#clk-next'); await state('playing'); s = await info();
  await page.click('#clk-time .abd-col:nth-child(1) input'); for (const ch of String(s.problem.hour)) await page.click(`#clk-pad [data-key="${ch}"]`); await page.click('#clk-time .abd-col:nth-child(3) input'); for (const ch of String(s.problem.minute)) await page.click(`#clk-pad [data-key="${ch}"]`);
  assert.deepStrictEqual(await page.$$eval('#clk-time input', bs => bs.map(b => b.value)), [String(s.problem.hour), String(s.problem.minute)], 'tapped into the hour and the minutes'); await page.click('#clk-check'); await state('done'); assert.strictEqual((await info()).chips - h0, 100, 'a second right answer by tapping');

  /* ---------- the clocks on the walls show their pixels right (at 40 seconds: at :00 the red second hand lies right along the long hand when it points at 12) ---------- */
  const readClock = (zoneName, h, m, sec) => page.evaluate((zn, hh, mm, ss) => {
    Clock.setNow(() => new Date(2026, 10, 12, hh, mm, ss)); const zone = zn === 'lab' ? __primeTime.lab : __primeTime.school; zone.animated.forEach(fn => fn(0.016, 0));
    let mesh; zone.group.traverse(o => { if (o.userData && o.userData.kind === 'clock') mesh = o; }); const cv = mesh.material.map.image, c = cv.getContext('2d'), R = cv.width / 2;
    const dark = (x, y) => { const d = c.getImageData(Math.round(x), Math.round(y), 1, 1).data; return d[3] > 200 && d[0] < 90 && d[1] < 90 && d[2] < 90; }, cream = (x, y) => { const d = c.getImageData(Math.round(x), Math.round(y), 1, 1).data; return d[0] > 220 && d[1] > 210 && d[2] > 180; };
    const pt = (deg, k) => [R + Math.sin(deg * Math.PI / 180) * R * k, R - Math.cos(deg * Math.PI / 180) * R * k], hour = (hh % 12 + mm / 60 + ss / 3600) * 30, minute = (mm + ss / 60) * 6;                   // (the hands creep with the seconds, as on a real clock)
    const numeralInk = n => { let ink = 0; const [x, y] = pt(n * 30, 0.68); for (let dx = -R * 0.12; dx <= R * 0.12; dx += 2) for (let dy = -R * 0.12; dy <= R * 0.12; dy += 2) if (dark(x + dx, y + dy)) ink++; return ink; };
    return { size: cv.width, shown: mesh.userData.shown, hourTip: dark(...pt(hour, 0.38)), minuteTip: dark(...pt(minute, 0.6)), nowhere: cream(...pt((hour + 180) % 360, 0.5)) && cream(...pt((minute + 180) % 360, 0.5)), faceCream: cream(...pt(45, 0.3)), numerals: Array.from({ length: 12 }, (_, i) => numeralInk(i + 1)) };
  }, zoneName, h, m, sec);
  for (const zn of ['school', 'lab']) for (const [h, m] of [[3, 0], [9, 45], [4, 20]]) {
    const r = await readClock(zn, h, m, 40); assert.deepStrictEqual([r.shown.h, r.shown.m, r.shown.s], [h, m, 40], `${zn}: it was told ${h}:${String(m).padStart(2, '0')}`); assert.ok(r.faceCream, `${zn} ${h}:${m}: a cream face`); assert.ok(r.hourTip, `${zn} ${h}:${String(m).padStart(2, '0')}: ink where the short hand points`); assert.ok(r.minuteTip, `${zn} ${h}:${String(m).padStart(2, '0')}: ink where the long hand points`);
    assert.ok(r.numerals.every(n => n > 8), `${zn}: all twelve hours are written on the face (ink at each: ${r.numerals.join(',')})`); }
  { const a = await readClock('lab', 3, 0, 40), b = await readClock('lab', 9, 0, 40); assert.ok(a.hourTip && b.hourTip && a.nowhere && b.nowhere, 'the hands move with the time: nothing is drawn on the far side from where they point'); }
  await page.evaluate(() => Clock.setNow()); ctx.log('the pixels of both wall clocks: a cream face, all twelve numerals inked, the hands pointing where the time says');

  /* ---------- no scrolling in any state, and big enough, at four screen sizes ---------- */
  const over = () => page.evaluate(() => { const o = document.querySelector('.overlay:not(.hidden)'); return o.scrollHeight - o.clientHeight; });
  for (const [label, w, h] of [['desktop 1280x720', 1280, 720], ['phone 390x760', 390, 760], ['small phone 375x667', 375, 667], ['tiny phone 360x640', 360, 640]]) {
    await page.setViewport({ width: w, height: h }); await g.closeAll(); await page.evaluate(() => ClockGame.open()); await g.sleep(120); const pick = await over(); assert.deepStrictEqual(await page.evaluate(FITS), [], `${label}: the picker fits sideways`);
    for (const lv of [1, 2, 3]) {
      let play = 0, after = 0;
      for (let i = 0; i < 6; i++) {
        await open(lv); await state('playing'); await g.sleep(50); play = Math.max(play, await over());
        if (i === 0) {
          assert.deepStrictEqual(await page.evaluate(FITS), [], `level ${lv}, ${label}: fits sideways`); const sz = await page.$eval('#clk-fig svg', e => Math.round(e.getBoundingClientRect().width)); assert.ok(sz >= (lv === 3 ? 120 : 150), `level ${lv}, ${label}: the clock face is big enough to read (${sz} px)`);
          /* only the buttons you can see count: the five-minute steps are hidden on Easy */ if (lv === 3) { const k = await page.$$eval('#clk-pad .eqn-key', ks => Math.min(...ks.map(x => { const r = x.getBoundingClientRect(); return Math.min(r.width, r.height); }))), b = await page.$$eval('#clk-time input', bs => Math.min(...bs.map(x => { const r = x.getBoundingClientRect(); return Math.min(r.width, r.height); }))); assert.ok(k >= 36, `${label}: pad keys at least 36 px (smallest ${Math.round(k)})`); assert.ok(b >= 36, `${label}: boxes at least 36 px (smallest ${Math.round(b)})`); }
          else { const k = await page.$$eval('#clk-ctl .btn', ks => Math.min(...ks.map(x => x.getBoundingClientRect()).filter(r => r.width > 0).map(r => Math.min(r.width, r.height)))); assert.ok(k >= 36, `level ${lv}, ${label}: the buttons are at least 36 px (smallest ${Math.round(k)})`); }
        }
        await page.evaluate(() => { if (ClockGame.boxes.length) { ClockGame.boxes.forEach(b => { b.value = '99'; }); document.getElementById('clk-check').click(); } else document.getElementById('clk-go').click(); }); await g.sleep(50); after = Math.max(after, await over());
      }
      assert.deepStrictEqual([pick, play, after].map(n => n <= 1), [true, true, true], `level ${lv}, ${label}: no scrolling in the picker, while playing or after answering (overflow ${pick} / ${play} / ${after} px)`);
    }
  }
  await page.setViewport({ width: 1280, height: 800 }); await g.closeAll();
  ctx.log('real click, drag, keys and typing; both clocks\' pixels; no scrolling at 4 screen sizes with the face, keys and boxes big enough');
} };
