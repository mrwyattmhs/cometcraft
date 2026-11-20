// The chess table in the REAL browser:
//   WALKING UP     the table stops you (it is solid), the prompt shows beside it, a real E sits you down, a real Escape leaves
//   REAL INPUT     real mouse clicks on the board, a real drag of a piece, the keyboard, a win by real clicks showing on the chip counter, and a real engine reply
//   THE BOARD      measured: 64 square squares, the rank and file labels level with their rows and columns, the pieces drawn and filling their squares, nothing running off the screen
//   FOUR SIZES     the picker, a game and the result banner: no scrolling, every word readable (contrast), the buttons big enough to press
const assert = require('assert');
const { FITS, assertReadable } = require('../lib/scan');
module.exports = { name: 'browser:chess', tier: 'browser', covers: ['js/chess.js', 'js/chess-game.js', 'js/world.js', 'js/main.js', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'css/style.css', 'index.html', 'tools/test/lib/scan.js'], timeout: 600000, run: async ctx => {
  const g = await ctx.browser(), { page } = g;
  const SIZES = [['desktop 1280x720', 1280, 720], ['phone 390x760', 390, 760], ['small phone 375x667', 375, 667], ['tiny phone 360x640', 360, 640]];
  const q = fn => page.evaluate(fn), idx = n => (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 16;
  const centre = name => page.evaluate(i => { const e = document.getElementById(`chess-sq-${i}`).getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; }, idx(name));
  const click = async n => { const c = await centre(n); await page.mouse.click(c.x, c.y); await g.sleep(60); };
  const idle = () => page.waitForFunction(() => !ChessGame.thinking, { timeout: 20000 });
  const script = (...m) => page.evaluate(ms => { window.__script = ms.slice(); ChessGame.config.delay = () => 0; ChessGame.config.engine = game => { const t = window.__script.shift(); return { move: t ? game.pos.fromUci(t) : game.pos.moves()[0] }; }; }, m);
  const real = () => q(() => { ChessGame.config.engine = (g, lv) => Chess.chooseMove(g, lv); ChessGame.config.delay = lv => ({ easy: 450, medium: 600, hard: 350 }[lv] || 400); });
  const fresh = async () => { await q(() => { if (ChessGame.isOpen()) ChessGame.close(); Store.set({ chess: { level: '', human: 0, uci: [], over: false, result: '' } }); }); await g.closeAll(); };
  const chipsOnScreen = () => q(() => Number(document.getElementById('chips').textContent.replace(/\D/g, '')));
  const overlayOver = () => q(() => { const o = document.getElementById('chess'); return o.scrollHeight - o.clientHeight; });

  /* ---------- walking up to the table, and sitting down ---------- */
  await page.setViewport({ width: 1280, height: 800 }); await fresh(); await g.at(-15.8, 52.4, Math.PI / 2, 0.1); await g.sleep(500);
  await page.keyboard.down('KeyW'); await g.sleep(3500); await page.keyboard.up('KeyW'); await g.sleep(300); const x = await q(() => Player.x);
  assert.ok(x > -17.75 && x < -16.4, `the table stops you (you got as far as x ${x.toFixed(2)}; its edge is at -17.75, and you started at -15.8)`); assert.match(await q(() => document.getElementById('prompt').innerText), /Sit down and play chess/, 'the prompt shows beside the table');
  await page.keyboard.press('KeyE'); await g.sleep(500); assert.ok(await q(() => ChessGame.isOpen() && ChessGame.view === 'pick'), 'a real E sits you down at the picker'); assert.ok(await q(() => UI.isOpen()), 'and the world waits');
  await page.keyboard.press('Escape'); await g.sleep(300); assert.ok(!(await q(() => ChessGame.isOpen())), 'a real Escape leaves the table');
  /* and the little library, now on the south edge of the terrace and facing north: stand in front of it, look at it, press E */
  await g.at(-12.1, 53.4, Math.PI, 0.05); await g.sleep(500); assert.match(await q(() => document.getElementById('prompt').innerText), /Open the Little Library/, 'the library\'s prompt shows on its north side'); await page.keyboard.press('KeyE'); await g.sleep(500); assert.ok(await q(() => LittleLibrary.isOpen()), 'and E opens it'); await page.keyboard.press('Escape'); await g.sleep(300); assert.ok(!(await q(() => LittleLibrary.isOpen())));
  ctx.log('walked up: the table stops you, the prompt shows, E sits you down, Escape leaves; the library opens from its north side');

  /* ---------- real clicks, a real drag, and the real computer ---------- */
  await fresh(); await real(); await q(() => { ChessGame.open(); document.querySelector('#chess-levels [data-level="easy"]').click(); document.querySelector('#chess-colors [data-color="w"]').click(); document.getElementById('chess-start').click(); }); await g.sleep(300);      // (the window remembers the side you chose last, so say White)
  await click('e2'); assert.strictEqual(await q(() => document.querySelectorAll('#chess-board .ch-hint').length), 2, 'a real click on e2 shows two squares'); await click('e4'); await idle(); assert.strictEqual(await q(() => ChessGame.game.played.length), 2, 'you moved, and the real Easy computer answered');
  const from = await centre('g1'), to = await centre('f3'); await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 }); const ghost = await q(() => !!document.querySelector('.ch-ghost')); await page.mouse.move(to.x, to.y, { steps: 4 }); await page.mouse.up(); await idle();
  assert.ok(ghost, 'a real drag: the piece follows the pointer'); assert.strictEqual(await q(() => ChessGame.game.sans[2]), 'Nf3', 'and is put down on f3'); assert.ok(!(await q(() => document.querySelector('.ch-ghost'))));
  const n0 = await q(() => ChessGame.game.played.length); await click('a2'); await click('a5'); assert.strictEqual(await q(() => ChessGame.game.played.length), n0, 'an illegal move is refused'); ctx.log('real clicks, a real drag, an illegal press, and a real computer reply');
  /* the keyboard, for real */
  await fresh(); await script('e7e5'); await q(() => { ChessGame.open(); ChessGame.startGame('easy', 'w'); }); await g.sleep(200); await click('a1'); await click('a1'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp');
  await q(() => document.getElementById('chess-board').focus()); const cur0 = await q(() => ChessGame.cursor); await page.keyboard.press('ArrowRight'); assert.strictEqual(await q(() => ChessGame.cursor), cur0 + 1, 'the arrow keys move the cursor'); ctx.log('keyboard');

  /* ---------- a win by real clicks, on the chip counter ---------- */
  await fresh(); await script('f2f3', 'g2g4'); await q(() => { ChessGame.open(); document.querySelector('#chess-levels [data-level="medium"]').click(); document.querySelector('#chess-colors [data-color="b"]').click(); document.getElementById('chess-start').click(); }); await idle(); const c0 = await chipsOnScreen();
  await click('e7'); await click('e5'); await idle(); await click('d8'); await click('h4'); await g.sleep(300);
  assert.strictEqual(await q(() => document.querySelector('#chess .ch-banner h3').textContent), 'Checkmate! You win!'); assert.strictEqual(await chipsOnScreen() - c0, 200, 'the chip counter on screen went up by exactly 200 (a Medium win)');
  const banner = await q(() => { const b = document.querySelector('#chess .ch-banner').getBoundingClientRect(), bd = document.getElementById('chess-board').getBoundingClientRect(); return { inside: b.left >= bd.left - 1 && b.right <= bd.right + 1 && b.top >= bd.top - 1 && b.bottom <= bd.bottom + 1, btns: [...document.querySelectorAll('#chess .ch-banner .btn')].map(x => Math.round(x.getBoundingClientRect().height)) }; });
  assert.ok(banner.inside, 'the result banner sits inside the board'); assert.ok(banner.btns.every(h => h >= 40), `its buttons are big enough (${banner.btns.join(', ')} px high)`); ctx.log('a win by real clicks: +200 on the chip counter, the banner inside the board');

  /* ---------- the board, measured ---------- */
  await fresh(); await q(() => { ChessGame.open(); ChessGame.startGame('hard', 'w'); }); await g.sleep(250);
  const m = await q(() => {
    const sqs = [...document.querySelectorAll('#chess-board .ch-sq')].map(e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, pc: e.querySelector('svg.ch-pc') ? e.querySelector('svg.ch-pc').getBoundingClientRect().width : 0 }; });
    const ranks = [...document.querySelectorAll('#chess-ranks span')].map(e => { const r = e.getBoundingClientRect(); return { y: r.top + r.height / 2, x: r.right }; }), files = [...document.querySelectorAll('#chess-files span')].map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; });
    const bd = document.getElementById('chess-board').getBoundingClientRect(), gradients = ['pcw', 'pcb'].map(id => !!document.getElementById(id)); return { sqs, ranks, files, bd: { l: bd.left, t: bd.top, r: bd.right, b: bd.bottom }, gradients, fills: [...document.querySelectorAll('#chess-board svg.ch-pc > g:first-child')].map(e => e.getAttribute('fill')) };
  });
  assert.strictEqual(m.sqs.length, 64); assert.ok(m.sqs.every(s => Math.abs(s.w - m.sqs[0].w) < 1.5 && Math.abs(s.h - s.w) < 1.5), 'every square is the same size, and square'); assert.deepStrictEqual(m.gradients, [true, true], 'the shading gradients for the pieces are in the page');
  m.ranks.forEach((r, i) => assert.ok(Math.abs(r.y - (m.sqs[i * 8].y + m.sqs[i * 8].h / 2)) < 2.5, `rank label ${8 - i} is level with its row`)); m.files.forEach((f, i) => assert.ok(Math.abs(f.x - (m.sqs[56 + i].x + m.sqs[56 + i].w / 2)) < 2.5, `file label ${'abcdefgh'[i]} is under its column`));
  assert.ok(m.ranks.every(r => r.x <= m.bd.l + 1) && m.files.every(f => f.y >= m.bd.b - 1), 'the labels are outside the board (on the dark panel, where they can be read)'); const pcs = m.sqs.filter(s => s.pc); assert.strictEqual(pcs.length, 32); assert.ok(pcs.every(s => s.pc >= s.w * 0.88 && s.pc <= s.w * 0.98), 'each piece fills its square');
  assert.strictEqual(m.fills.length, 32); assert.ok(m.fills.every(f => /^url\(#pc[wb]\)$/.test(f)) && m.fills.filter(f => f === 'url(#pcb)').length === 16, 'and is drawn with the shading: sixteen white, sixteen black');
  { const clip = await centre('e1'); const shot = await page.screenshot({ clip: { x: clip.x - m.sqs[0].w / 2, y: clip.y - m.sqs[0].h / 2, width: m.sqs[0].w, height: m.sqs[0].h }, encoding: 'base64' }); assert.ok(shot.length > 900, `the white king's square is a drawing, not a blank (${shot.length} bytes of picture)`); const empty = await centre('e4'); const eshot = await page.screenshot({ clip: { x: empty.x - 10, y: empty.y - 10, width: 20, height: 20 }, encoding: 'base64' }); assert.ok(shot.length > eshot.length * 2, 'much more picture than an empty square'); }
  ctx.log('the board measured: square squares, labels level with their rows and columns, 32 pieces filling their squares');

  /* ---------- four screen sizes: the picker, a game, the result ---------- */
  for (const [label, w, h] of SIZES) {
    await page.setViewport({ width: w, height: h }); await fresh();
    await q(() => ChessGame.open()); await g.sleep(150); assert.ok((await overlayOver()) <= 1, `${label}: the picker does not scroll`); assert.deepStrictEqual(await page.evaluate(FITS), [], `${label}: the picker fits`); await assertReadable(page, `chess picker, ${label}`);
    const btn = await q(() => Math.min(...[...document.querySelectorAll('#chess-colors .btn, #chess-start')].map(b => b.getBoundingClientRect().height))); assert.ok(btn >= 40, `${label}: the picker's buttons are big enough (${Math.round(btn)} px)`);
    await script(); await q(() => ChessGame.startGame('medium', 'w')); await idle(); await g.sleep(150); const play = await overlayOver(); assert.ok(play <= 1, `${label}: a game does not scroll (${play} px over)`); assert.deepStrictEqual(await page.evaluate(FITS), [], `${label}: a game fits`); await assertReadable(page, `chess game, ${label}`);
    const geo = await q(() => { const bd = document.getElementById('chess-board').getBoundingClientRect(); return { sq: bd.width / 8, on: bd.left >= 0 && bd.right <= innerWidth && bd.top >= 0 && bd.bottom <= innerHeight, btns: [...document.querySelectorAll('#chess-flip, #chess-resign')].map(b => b.getBoundingClientRect().height) }; });
    assert.ok(geo.on, `${label}: the whole board is on the screen`); assert.ok(geo.sq >= 36, `${label}: squares are big enough to press (${geo.sq.toFixed(0)} px)`); assert.ok(geo.btns.every(h2 => h2 >= 40), `${label}: Flip board and Resign are big enough`);
    await fresh(); await script('f2f3', 'g2g4'); await q(() => { ChessGame.open(); ChessGame.startGame('hard', 'b'); }); await idle(); await click('e7'); await click('e5'); await idle(); await click('d8'); await click('h4'); await g.sleep(250);
    assert.ok(await q(() => !!document.querySelector('#chess .ch-banner')), `${label}: the result banner is up`); assert.ok((await overlayOver()) <= 1, `${label}: the result does not scroll`); assert.deepStrictEqual(await page.evaluate(FITS), [], `${label}: the result fits`); await assertReadable(page, `chess result, ${label}`);
  }
  await page.setViewport({ width: 1280, height: 800 }); await fresh(); ctx.log('four screen sizes: the picker, a game and the result fit, read well, and have big enough buttons');
} };
