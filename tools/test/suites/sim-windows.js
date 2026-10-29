// Every window: closed at the start, wears the green template with the new header, opens and closes (Escape), shows the pay from Economy, and nothing of the old chalkboard,
// library or planner chrome is left. Fast: no real layout is needed for any of this (readable text is the browser tour's job).
const assert = require('assert');
const { plain } = require('../lib/util');
const { WINDOWS } = require('../lib/windows');
const PAY = { '#tri': 'trinomial', '#rad': 'radical', '#par': 'parabola', '#vtx': 'vertex', '#cub': 'cubes', '#pmul': 'polymul', '#padd': 'polyadd' };

module.exports = { name: 'sim:windows', tier: 'sim', covers: ['index.html', 'js/*.js'], run: async ctx => {
  const s = ctx.sim(), { doc, w, T, $ } = s; s.start(); await s.frames(3);
  // closed at the start, and every window that is in the page wears the template
  assert.ok([...doc.querySelectorAll('.overlay')].every(o => o.classList.contains('hidden')), 'every window starts closed');
  assert.deepStrictEqual([...doc.querySelectorAll('.overlay')].filter(o => !o.classList.contains('kelly')).map(o => o.id), [], 'every window in the page wears the green template');
  assert.ok($('start-screen').classList.contains('kelly') && $('reader').classList.contains('kelly'), 'and so do the title screen and the reader');
  assert.strictEqual(doc.querySelectorAll('.chalk-board, .chalk-head, .chalk-btn, .chalk-chip, .lib-box, .lib-head, .lib-btn, .plan-board, .plan-head, .plan-btn, .plan-chip').length, 0, 'none of the old chrome is left');
  const G = s.G, opened = [];
  for (const [name, win] of Object.entries(WINDOWS)) {
    if (name === 'lesson') continue;                                   // (the lesson needs a table context; the lesson suites cover it)
    s.exec(win.open); await s.frames(2);
    const root = doc.querySelector(win.root); assert.ok(root, `${name}: its window is in the page after opening`);
    assert.ok(!root.classList.contains('hidden'), `${name}: opens`); opened.push(name);
    assert.ok(root.classList.contains('kelly'), `${name}: wears the template`);
    if (win.wing) assert.ok(root.querySelector('.k-title .k-wing') && root.querySelector('.k-titlerow .k-cube') && root.querySelector('.k-titlerow h2'), `${name}: has the wing / icon / title header`);
    if (PAY[win.root]) {                                               // the cards say what Economy pays, level by level
      const cards = [...root.querySelectorAll('.bet-win')].map(e => Number((e.textContent.match(/\d+/) || [])[0])); const want = T.Economy.PAY[PAY[win.root]];
      assert.deepStrictEqual(cards.slice(0, want.length), plain(want), `${name}: the level cards pay ${want.join(', ')}, as Economy says`);
    }
    s.key('Escape'); await s.frames(2); assert.ok(root.classList.contains('hidden'), `${name}: Escape closes it`);
    assert.ok([...doc.querySelectorAll('.overlay')].every(o => o.classList.contains('hidden')), `${name}: nothing is left open after Escape`);
  }
  assert.ok(opened.length >= 17, `${opened.length} windows were opened and closed`);
  assert.deepStrictEqual(s.errors, [], 'no errors');
  ctx.log(`${opened.length} windows: template, header, pay, open and close`);
} };
