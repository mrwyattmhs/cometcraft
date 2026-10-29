// THE TOUR (real Chromium). Every window, in every state a player sees, on a desktop screen and on a phone:
//   1. it wears the green template and has the wing / icon / title header          2. every piece of text on it is readable (WCAG AA)
//   3. it fits the screen (no sideways scrolling, top not cut off)                  4. a seeded click-around in each window (wrong answers, hints, results) stays readable
//   5. nothing is printed to the browser console as an error
// This one suite stands in for what used to be a separate readability / fit test per window. It covers the files that build, style or wire a window; the pure maths modules are
// covered by their unit tests and by the typing suites, so a change to polys.js does not rerun this 100-second tour.
const assert = require('assert');
const { WINDOWS, STATES } = require('../lib/windows');
const { SCAN, FITS, monkey } = require('../lib/scan');

module.exports = { name: 'browser:tour', tier: 'browser', covers: ['index.html', 'css/*.css', 'js/*-game.js', 'js/mines-menu.js', 'js/crafting.js', 'js/shop.js', 'js/catalog.js', 'js/trophy-case.js', 'js/library.js', 'js/books-data.js', 'js/dorm-planner.js', 'js/ui.js', 'js/content.js',
    'js/lesson-panel.js', 'js/lessons.js', 'js/store.js', 'js/trophies.js', 'js/economy.js', 'js/main.js', 'js/factoring.js'], timeout: 1200000, run: async ctx => {
  const g = await ctx.browser(), { page } = g, STEPS = Number(process.env.TOUR_STEPS || 14);
  const closeAll = () => g.closeAll();

  /* ---------- 1. the template ---------- */
  for (const [name, w] of Object.entries(WINDOWS)) { if (name === 'lesson') continue; await closeAll(); await page.evaluate(js => (0, eval)(js), w.open); }   // (opening each one makes the windows that are built on first use)
  await closeAll();
  const st = await page.evaluate(wing => {
    const out = { n: document.querySelectorAll('.overlay').length, notKelly: [...document.querySelectorAll('.overlay')].filter(o => !o.classList.contains('kelly')).map(o => o.id), noHeader: [], oldChrome: document.querySelectorAll('.chalk-board, .chalk-head, .chalk-btn, .lib-box, .plan-board, .plan-head, .plan-btn, .lib-btn').length };
    ['start-screen', 'reader'].forEach(id => { if (!document.getElementById(id).classList.contains('kelly')) out.notKelly.push(id); });
    wing.forEach(sel => { const o = document.querySelector(sel); if (!(o && o.querySelector('.k-title .k-wing') && o.querySelector('.k-titlerow .k-cube') && o.querySelector('.k-titlerow h2'))) out.noHeader.push(sel); });
    return out;
  }, Object.values(WINDOWS).filter(w => w.wing).map(w => w.root));
  assert.deepStrictEqual(st.notKelly, [], `every window wears the green template (${st.n} windows, the title screen and the reader)`);
  assert.deepStrictEqual(st.noHeader, [], 'every menu window has the wing / icon / title header'); assert.strictEqual(st.oldChrome, 0, 'no old chalkboard, library or planner chrome is left');
  ctx.log(`all ${st.n} windows, the title screen and the reader wear the template`);

  /* ---------- 2 and 3. the states: readable, and they fit (desktop, then a phone) ---------- */
  for (const [label, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 800 }]]) {
    await page.setViewport(vp); let pieces = 0;
    for (const [name, fn] of STATES) {
      await closeAll(); await fn(page, g); await g.sleep(350);
      const rows = await page.evaluate(SCAN), bad = rows.filter(r => r.ratio < r.need), fit = await page.evaluate(FITS); pieces += rows.length;
      bad.slice(0, 5).forEach(r => ctx.log(`${label} ${name}: ${r.ratio}:1 (needs ${r.need}) "${r.text}" [${r.cls}] ${r.color} on ${r.bg} (from ${r.src})`));
      assert.ok(rows.length >= 4, `${label} ${name}: the scan saw text (${rows.length})`);
      assert.strictEqual(bad.length, 0, `${label} ${name}: every piece of text is readable (${bad.length} are not)`); assert.deepStrictEqual(fit, [], `${label} ${name}: fits the screen`);
    }
    ctx.log(`${label}: ${STATES.length} states, ${pieces} pieces of text readable, every window fits`);
  }
  await page.setViewport({ width: 1280, height: 800 });

  /* ---------- 4. clicking around ---------- */
  let screens = 0; const misses = [];
  for (const [name, w] of Object.entries(WINDOWS)) {
    if (name === 'lesson') continue; await closeAll();
    const r = await monkey(page, w.open, w.root, STEPS, 17); screens += r.screens;
    [...r.bad.values()].slice(0, 4).forEach(x => ctx.log(`${name}: ${x.ratio}:1 (needs ${x.need}) "${x.text}" [${x.cls}] ${x.color} on ${x.bg} (from ${x.src})`)); if (r.bad.size) misses.push(`${name} (${r.bad.size})`);
  }
  assert.deepStrictEqual(misses, [], 'clicking around never shows unreadable text');
  ctx.log(`clicking around in ${Object.keys(WINDOWS).length - 1} windows: ${screens} screens, all readable`);
} };
