// The daily quest in the game (simulated browser; the calendar is the shared clock, so the test chooses the day):
//   THE TITLE SCREEN  the quest exists, but nothing pops up when Play is pressed, and the tracker stays out of sight until you are playing (and while the game is paused or on the title screen)
//   Q             shows the quest whenever you like (but not before Play, and not over another window)
//   THE TRACKER   under the chips, with the progress, stacked below Remy's tracker; GONE once the quest is finished, and back with the next day's quest
//   PROGRESS      only right answers in that game, made today, count; at the last one: 200 chips, once, and a popup; more answers pay nothing
//   MIDNIGHT      the next day is a new quest (a different game), starting from your counts then; nothing is carried over
//   A REAL GAME   ten Multiply Table answers through the real window finish the quest when that is the day's game
//   PAUSED        the tests' switch: nothing pays and nothing pops up
const assert = require('assert');
const { plain, text } = require('../lib/util');

module.exports = { name: 'sim:daily', tier: 'sim', covers: ['js/daily.js', 'js/store.js', 'js/trophies.js', 'js/main.js', 'js/ui.js', 'js/clock.js', 'js/area-game.js', 'js/polys.js', 'css/style.css', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, G, doc, $, click, w } = s, { Store, Trophies, DailyQuest: D, Clock, UI } = T;
  const at = (y, mo, d, h = 9, mi = 0) => { Clock.setNow(() => new Date(y, mo - 1, d, h, mi, 0)); };
  const dlg = () => ({ open: !$('dialog').classList.contains('hidden'), title: $('dialog').querySelector('#dlg-title') ? text($('dialog').querySelector('#dlg-title')) : '', html: $('dialog').innerHTML });
  const closeDlg = () => { if (dlg().open) UI.closeDialog(); };
  const key = (code, target = doc) => target.dispatchEvent(new w.KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true }));
  const chips = () => Store.get().chips, solved = id => (Store.get().solved || {})[id] || 0, tracker = () => text($('daily').querySelector('span'));
  const toasts = []; const realToast = UI.toast; UI.toast = t => { toasts.push(t); realToast(t); };
  const award = (id, n = 1) => { for (let i = 0; i < n; i++) Trophies.award(id); };
  const other = id => D.TOPICS.find(x => x.id !== id).id;

  /* ---------- the title screen: the quest exists, but stays out of sight ---------- */
  at(2026, 11, 16); Store.reset(); await s.frames(2);
  const day = '2026-11-16', topic = D.topicFor(day); let d = Store.get().daily;
  assert.deepStrictEqual(plain(d), { day, id: topic.id, need: topic.need, base: 0, done: false }, 'a fresh save gets today\'s quest'); assert.ok($('daily').classList.contains('hidden'), 'but the tracker is not shown on the title screen'); assert.ok(!dlg().open, 'and nothing has popped up');
  assert.ok(/Q daily quest/.test(text($('controls-hint'))), 'the controls hint mentions Q'); key('KeyQ'); assert.ok(!dlg().open, 'Q before you have pressed Play does nothing');

  /* ---------- Play: nothing pops up, and the tracker appears ---------- */
  click($('play')); assert.ok(!dlg().open && !UI.isOpen(), 'pressing Play does not show the quest'); assert.ok(!$('daily').classList.contains('hidden'), 'the tracker shows while you play'); assert.strictEqual(text($('daily').querySelector('b')), 'Daily quest'); assert.strictEqual(tracker(), `${topic.task(topic.need)} (0/${topic.need})`);
  assert.ok($('trackers').contains($('daily')) && $('trackers').contains($('quest')) && $('quest').compareDocumentPosition($('daily')) & 4, 'both trackers are in the stack, the daily one below Remy\'s');
  G.daily.hold(true); assert.ok($('daily').classList.contains('hidden'), 'on the pause screen it goes away again'); click($('play')); assert.ok(!$('daily').classList.contains('hidden') && !dlg().open, 'and Resume brings it back, quietly');

  /* ---------- Q: whenever you like, never over another window ---------- */
  key('KeyQ'); assert.ok(dlg().open && dlg().html.includes('Your quest for today') && dlg().html.includes('0 of ' + topic.need)); key('Escape'); assert.ok(!dlg().open, 'Escape closes it');
  T.ElementGame.open(); key('KeyQ'); assert.ok(!dlg().open, 'Q does not open over another window'); T.ElementGame.close();
  key('KeyQ'); assert.ok(dlg().open); closeDlg(); ctx.log('no popup at the title screen or on Play; the tracker only while playing; Q, Escape, and not over another window');

  /* ---------- progress: only this game, only today ---------- */
  award(other(topic.id), 5); assert.strictEqual(tracker(), `${topic.task(topic.need)} (0/${topic.need})`, 'answers in other games do not count');
  const c0 = chips(); award(topic.id, topic.need - 1); assert.strictEqual(tracker(), `${topic.task(topic.need)} (${topic.need - 1}/${topic.need})`); assert.strictEqual(chips(), c0, 'nothing is paid early'); assert.ok(!dlg().open, 'and no popup');
  key('KeyQ'); assert.ok(dlg().html.includes(`${topic.need - 1} of ${topic.need}: one to go!`) && dlg().html.includes('aria-valuenow="' + (topic.need - 1) + '"'), 'the popup shows how far you are'); closeDlg();
  award(topic.id); assert.strictEqual(chips() - c0, 200, 'the last answer pays 200 chips'); assert.ok(Store.get().daily.done); assert.ok(dlg().open && dlg().title === 'Quest complete!' && dlg().html.includes('You earned 200 chips!') && dlg().html.includes('A new quest comes tomorrow'), 'and a popup says so');
  assert.ok($('daily').classList.contains('hidden') && $('daily').textContent === '', 'the tracker is gone once the quest is finished'); closeDlg();
  award(topic.id, 15); assert.strictEqual(chips() - c0, 200, 'more answers pay nothing more'); assert.ok(!dlg().open); key('KeyQ'); assert.ok(dlg().html.includes('Complete!') && dlg().html.includes('Today\u2019s quest') && dlg().html.includes('dq-done'), 'Q now shows it finished'); closeDlg();
  assert.strictEqual(G.daily.check(), false, 'the same day: the midnight check does nothing'); assert.strictEqual(Store.get().daily.done, true); ctx.log('progress by right answers in that game only; 200 chips once; the popup; the tracker');

  /* ---------- midnight: a new quest, from your counts then ---------- */
  const next = D.dayKey(new Date(2026, 10, 17)), nt = D.topicFor(next); assert.notStrictEqual(nt.id, topic.id, 'a different game tomorrow'); award(nt.id, 4);        // (answers made "yesterday" in tomorrow's game do not count)
  at(2026, 11, 17, 0, 5); toasts.length = 0; assert.strictEqual(G.daily.check(), true, 'after midnight the check starts the new day');
  d = Store.get().daily; assert.deepStrictEqual(plain(d), { day: next, id: nt.id, need: nt.need, base: 4, done: false }, 'a new quest, not done, starting from your count'); assert.ok(!$('daily').classList.contains('hidden'), 'and the tracker is back for the new day'); assert.strictEqual(tracker(), `${nt.task(nt.need)} (0/${nt.need})`); assert.ok(!$('daily').classList.contains('done'));
  assert.ok(toasts.some(t => /new daily quest/i.test(t)), 'a toast says so (the popup would interrupt you)'); assert.ok(!dlg().open, 'and no popup in the middle of play'); const cc = chips(); award(nt.id); assert.strictEqual(tracker(), `${nt.task(nt.need)} (1/${nt.need})`); assert.strictEqual(chips(), cc);
  assert.strictEqual(G.daily.check(), false);
  at(2026, 11, 17, 23, 59); assert.strictEqual(G.daily.check(), false, 'still the same day at 23:59'); at(2026, 11, 18, 0, 0); assert.strictEqual(G.daily.check(), true, 'and new at midnight'); assert.strictEqual(Store.get().daily.day, '2026-11-18');
  /* a reset save starts a fresh quest from nothing */
  Store.reset(); assert.deepStrictEqual(plain(Store.get().daily), plain(D.fresh('2026-11-18', {}))); ctx.log('midnight: a new game, a new count, a toast, no popup in play; a reset starts again');

  /* ---------- a real game: ten Multiply Table answers ---------- */
  let k = 0; const base = new Date(2026, 10, 20); let mulDay = null; for (; k < 60; k++) { const dt = new Date(base.getTime() + k * 86400000); if (D.topicFor(D.dayKey(dt)).id === 'polymul') { mulDay = dt; break; } } assert.ok(mulDay, 'Multiply Table comes up within 60 days');
  Clock.setNow(() => new Date(mulDay.getFullYear(), mulDay.getMonth(), mulDay.getDate(), 12)); Store.reset(); assert.strictEqual(Store.get().daily.id, 'polymul'); const M = T.PolyMulGame, P = T.Polys, start = chips();
  const type = (b, v) => { b.value = String(v); b.dispatchEvent(new w.Event('input', { bubbles: true })); };
  M.open(); click(doc.querySelectorAll('#pmul-levels .bet')[0]);
  for (let n = 1; n <= 10; n++) {
    const a = P.mulAnswer(M.problem); M.cells.forEach((b, i) => type(b, P.termText(a.cells[i].c, a.cells[i].d, M.problem.v))); M.sums.forEach((b, i) => type(b, String(a.combined[i]).replace('-', P.MINUS))); click($('pmul-check'));
    if (n < 10) assert.strictEqual(tracker(), `Get 10 Multiply Table problems right (${n}/10)`, `after answer ${n}`); else assert.ok($('daily').classList.contains('hidden'), 'after the tenth the tracker is gone');
    if (n < 10) { assert.ok(!dlg().open); click($('pmul-next')); }
  }
  assert.strictEqual(chips() - start, 10 * 10 + 200, 'ten Easy answers at 10 chips each, and the quest\'s 200'); assert.ok(dlg().open && dlg().title === 'Quest complete!', 'the quest popup comes up over the game window'); closeDlg(); M.close();
  assert.strictEqual(solved('polymul'), 10); ctx.log('ten real Multiply Table answers finish the quest: 100 chips from the table and 200 from the quest');

  /* ---------- a real game: one chess win finishes a "win a game of chess" quest ---------- */
  { let day2 = null; for (let k = 0; k < 80; k++) { const dt = new Date(new Date(2026, 10, 20).getTime() + k * 86400000); if (D.topicFor(D.dayKey(dt)).id === 'chess') { day2 = dt; break; } } assert.ok(day2, 'chess comes up within 80 days');
    Clock.setNow(() => new Date(day2.getFullYear(), day2.getMonth(), day2.getDate(), 12)); Store.reset(); assert.strictEqual(Store.get().daily.id, 'chess'); assert.strictEqual(tracker(), 'Win 1 game of chess (0/1)'); const CG = T.ChessGame, c1 = chips(), script = ['f2f3', 'g2g4'];
    CG.config.delay = () => 0; CG.config.engine = g => ({ move: g.pos.fromUci(script.shift()) }); CG.open(); CG.startGame('medium', 'b'); const settle = async () => { for (let i = 0; i < 400 && CG.thinking; i++) await new Promise(r => setTimeout(r, 5)); };
    await settle(); const press = (type, e) => e.dispatchEvent(new w.MouseEvent(type, { bubbles: true })), sqEl = n => doc.getElementById(`chess-sq-${(n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 16}`), tapSq = n => { press('pointerdown', sqEl(n)); press('pointerup', $('chess-board')); };
    tapSq('e7'); tapSq('e5'); await settle(); tapSq('d8'); tapSq('h4'); await settle(); assert.strictEqual(CG.over && CG.over.result, 'win'); assert.strictEqual(chips() - c1, 200 + 200, 'a Medium win pays 200 and the quest 200'); assert.ok(Store.get().daily.done, 'the quest is done'); assert.ok($('daily').classList.contains('hidden'), 'and its tracker is gone');
    assert.ok(dlg().open && dlg().title === 'Quest complete!', 'the quest popup comes up over the chess window'); closeDlg(); CG.close(); }
  /* ---------- paused (the tests\' switch): nothing pays, nothing pops up ---------- */
  Store.reset(); const pt = Store.get().daily.id; G.daily.pause(); assert.strictEqual(G.daily.paused, true); const p0 = chips(); award(pt, D.byId[pt].need + 2); assert.strictEqual(chips(), p0, 'paused: no reward'); assert.ok(!dlg().open, 'and no popup');
  G.daily.resume(); assert.strictEqual(chips() - p0, 200, 'resumed: the quest finishes'); closeDlg();
  assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log('paused and resumed');
  UI.toast = realToast; Clock.setNow();
} };
