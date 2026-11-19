// The chess table's window through its real DOM (simulated browser), played against a SCRIPTED opponent so every result is exact:
//   THE PICKER     three levels with their prices, the side to play, the Start button
//   WINNING        a win at each level pays exactly 100, 200 or 300 chips, is counted, and cannot be paid twice; a loss, a draw and resigning pay nothing
//   PLAYING        click a piece and a square, the dots, an illegal press, promotion (all four), dragging, the keyboard (also with the board flipped), Escape, flipping
//   THE SAVE       leaving the table mid-game and coming back, leaving while the computer is thinking, a damaged save thrown away, a finished game staying finished
//   THE TROPHY     the tenth win
const assert = require('assert');
const { plain, text } = require('../lib/util');

module.exports = { name: 'sim:chess', tier: 'sim', covers: ['js/chess.js', 'js/chess-game.js', 'js/world.js', 'js/economy.js', 'js/store.js', 'js/trophies.js', 'js/ui.js', 'js/main.js', 'css/style.css', 'index.html'], run: async ctx => {
  const s = ctx.sim(), { T, doc, $, click, w } = s, { Store, Economy, ChessGame: G, Chess: C } = T; s.start(); await s.frames(2);
  const chips = () => Store.get().chips, st = () => Store.get(), solved = () => (st().solved || {}).chess || 0, trophies = () => st().trophies || [];
  const queue = []; G.config.delay = () => 0; G.config.engine = game => { const t = queue.shift(), m = t ? game.pos.fromUci(t) : game.pos.moves()[0]; assert.ok(m, `the scripted reply "${t}" is legal here`); return { move: m }; };
  const idx = n => (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 16, sq = n => doc.getElementById(`chess-sq-${idx(n)}`), board = () => $('chess-board');
  const press = (type, el, x = 0, y = 0) => el.dispatchEvent(new w.MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  const tap = n => { press('pointerdown', sq(n)); press('pointerup', board()); };
  const until = async (fn, what = 'something') => { for (let i = 0; i < 600; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 5)); } assert.fail(`timed out waiting for ${what}`); };
  const idle = () => until(() => !G.thinking, 'the computer to move');
  const play = async (from, to, ...reply) => { queue.push(...reply); tap(from); tap(to); await idle(); };
  const key = (k, el = board()) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, code: k === ' ' ? 'Space' : k, bubbles: true, cancelable: true }));
  const start = async (level, color) => { if (!G.isOpen()) G.open(); G.startGame(level, color); await idle(); };
  const fresh = () => { if (G.isOpen()) G.close(); Store.set({ chess: { level: '', human: 0, uci: [], over: false, result: '' } }); queue.length = 0; };
  const banner = () => { const b = doc.querySelector('#chess .ch-banner'); return b ? { title: text(b.querySelector('h3')), detail: text(b.querySelector('p')) } : null; };
  const uiOpen = () => T.UI.isOpen();

  /* ---------- the picker ---------- */
  fresh(); s.G.hub.interactables.find(i => i.label === 'Sit down and play chess').action(); assert.ok(G.isOpen(), 'the prompt at the table sits you down'); G.close();
  G.open(); assert.strictEqual(G.view, 'pick'); assert.ok(uiOpen(), 'the window is open, so the game waits');
  const cards = [...doc.querySelectorAll('#chess-levels .bet')];
  assert.deepStrictEqual(plain(cards.map(c => c.querySelector('.bet-amt').textContent)), ['Easy', 'Medium', 'Hard']); assert.deepStrictEqual(plain(cards.map(c => text(c.querySelector('.bet-win')))), ['100 chips for a win', '200 chips for a win', '300 chips for a win']); assert.deepStrictEqual(plain(Economy.PAY.chess), [100, 200, 300]);
  assert.strictEqual(text(doc.querySelector('#chess .k-wing')), 'The park'); assert.strictEqual(text($('chess-title')), 'Chess'); assert.strictEqual(text($('chess-close')), 'Leave the table'); assert.ok(doc.querySelector('#chess .trophy-chip, #chess [class*="trophy"]'), 'the trophy chip is there');
  assert.ok(cards[1].classList.contains('picked') && !cards[0].classList.contains('picked'), 'Medium is the level to begin with'); assert.strictEqual(text($('chess-start')), 'Start game (win 200 chips)'); click(cards[2]); assert.ok(cards[2].classList.contains('picked') && !cards[1].classList.contains('picked')); assert.strictEqual(text($('chess-start')), 'Start game (win 300 chips)');
  const colors = [...doc.querySelectorAll('#chess-colors .btn')]; assert.deepStrictEqual(plain(colors.map(b => text(b))), ['White', 'Black', 'Either']); assert.ok(colors[0].classList.contains('on')); click(colors[1]); assert.ok(colors[1].classList.contains('on') && !colors[0].classList.contains('on'));
  /* start from the buttons: Hard, Black: the computer opens */
  queue.push('d2d4'); click($('chess-start')); await idle(); assert.strictEqual(G.view, 'play'); assert.deepStrictEqual([G.level, G.human], ['hard', 1]); assert.strictEqual(G.game.sans[0], 'd4', 'the computer, playing White, has opened'); assert.strictEqual(st().chess.level, 'hard'); assert.strictEqual(st().chess.uci.join(), 'd2d4', 'and the game is saved');
  ctx.log('the picker: three levels and their prices, the side, Start');

  /* ---------- the board, and the ways to move ---------- */
  fresh(); await start('easy', 'w'); assert.strictEqual(doc.querySelectorAll('#chess-board .ch-sq').length, 64); assert.strictEqual(doc.querySelectorAll('#chess-board svg.ch-pc').length, 32); assert.strictEqual(sq('e1').getAttribute('aria-label'), 'e1, white king'); assert.strictEqual(sq('e4').getAttribute('aria-label'), 'e4, empty');
  assert.strictEqual(board().getAttribute('role'), 'grid'); assert.strictEqual(text($('chess-ranks')), '87654321'); assert.strictEqual(text($('chess-files')), 'abcdefgh'); assert.strictEqual(text($('chess-topwho')), 'Computer (Easy)'); assert.strictEqual(text($('chess-botwho')), 'You'); assert.strictEqual(text($('chess-status')), 'Your move.');
  tap('e2'); assert.ok(sq('e2').classList.contains('sel')); assert.strictEqual(doc.querySelectorAll('#chess-board .ch-hint').length, 2, 'a pawn shows the two squares it can go to'); assert.ok(sq('e3').classList.contains('target') && sq('e4').classList.contains('target'));
  tap('e5'); assert.strictEqual(G.selected, null, 'pressing a square it cannot go to puts the piece back'); tap('e7'); assert.strictEqual(G.selected, null, 'you cannot pick up the computer\'s piece'); tap('e3'); assert.strictEqual(G.selected, null, 'or press an empty square with nothing picked up');
  tap('g1'); assert.strictEqual(doc.querySelectorAll('#chess-board .ch-hint').length, 2, 'a knight shows two squares'); tap('e2'); assert.strictEqual(G.selected, idx('e2'), 'pressing another piece of yours picks that one up instead'); tap('e2'); assert.strictEqual(G.selected, null, 'pressing the same piece again puts it down');
  await play('e2', 'e4', 'e7e5'); assert.deepStrictEqual(plain(G.game.sans), ['e4', 'e5'], 'you moved and the computer answered'); assert.ok(sq('e7').classList.contains('last') && sq('e5').classList.contains('last') && !sq('e2').classList.contains('last'), 'the computer\'s move is the one that is lit');
  assert.deepStrictEqual(plain([...doc.querySelectorAll('#chess-moves span')].map(x => x.textContent)), ['1.', 'e4', 'e5']); assert.ok(doc.querySelector('#chess-moves .m.cur'), 'the latest move is marked');
  await play('d1', 'h5', 'b8c6'); tap('h5'); assert.ok(sq('e5').classList.contains('target') && sq('e5').querySelector('.ch-hint.cap'), 'a capture shows a ring'); queue.push('c6e5'); tap('e5'); await idle(); assert.deepStrictEqual(plain(G.game.sans.slice(4)), ['Qxe5+', 'Nxe5'], 'the queen took a pawn with check, and was taken');
  assert.strictEqual(text($('chess-topadv')), '+8', 'the computer is eight points up: a queen for a pawn'); assert.strictEqual(text($('chess-botadv')), ''); assert.strictEqual(doc.querySelectorAll('#chess-toptaken svg').length, 1, 'your queen is shown by the computer\'s name'); assert.strictEqual(doc.querySelectorAll('#chess-bottaken svg').length, 1, 'and the pawn you took by yours');
  /* check lights the king: the computer gives check to you */
  fresh(); await start('easy', 'w'); await play('f2', 'f3', 'e7e5'); await play('e2', 'e3', 'd8h4'); assert.ok(sq('e1').classList.contains('check'), 'a king in check is lit'); assert.strictEqual(text($('chess-status')), 'Check! Your move.'); queue.push('a7a6'); tap('g2'); tap('g3'); await idle(); assert.ok(!sq('e1').classList.contains('check'), 'and not once it is out of check');
  fresh(); ctx.log('the board: 64 squares, 32 pieces, dots and rings, an illegal press, the last move, check, captured pieces');

  /* ---------- a win at each level pays exactly its price, once ---------- */
  for (const [level, pay] of [['easy', 100], ['medium', 200], ['hard', 300]]) {
    fresh(); const c0 = chips(), w0 = st().chessWins, s0 = solved(); queue.push('f2f3'); await start(level, 'b'); await play('e7', 'e5', 'g2g4'); queue.push(); tap('d8'); tap('h4'); await idle();
    assert.strictEqual(G.over && G.over.result, 'win', `${level}: Qh4# wins`); assert.deepStrictEqual(banner(), { title: 'Checkmate! You win!', detail: `You beat the ${level[0].toUpperCase() + level.slice(1)} computer and earn ${pay} chips.` }); assert.strictEqual(chips() - c0, pay, `${level} pays exactly ${pay}`);
    assert.deepStrictEqual([st().chessWins - w0, solved() - s0], [1, 1], 'it is counted'); assert.deepStrictEqual(plain(st().chess), { level, human: 1, uci: ['f2f3', 'e7e5', 'g2g4', 'd8h4'], over: true, result: 'win' }, 'and saved as finished'); assert.strictEqual(text($('chess-status')), `You won by checkmate: +${pay} chips.`);
    tap('a7'); tap('a6'); assert.strictEqual(G.game.played.length, 4, 'a finished game takes no more moves');
    G.close(); G.open(); assert.strictEqual(G.view, 'play'); assert.ok(banner() && banner().title === 'Checkmate! You win!', 'coming back to a finished game shows how it ended'); assert.strictEqual(chips() - c0, pay, 'and pays nothing more'); assert.strictEqual(st().chessWins - w0, 1);
    G.close(); G.open(); G.close(); assert.strictEqual(chips() - c0, pay, 'however often you come back');
  }
  /* "Play again" goes back to the picker with the table cleared */
  G.open(); click(doc.querySelector('#chess .ch-banner .btn.primary')); assert.strictEqual(G.view, 'pick'); assert.strictEqual(st().chess.level, '', 'a new game can be picked'); ctx.log('a win pays 100, 200 or 300 chips, once, however often you come back');

  /* ---------- a loss, a draw and resigning pay nothing ---------- */
  fresh(); { const c0 = chips(), l0 = st().chessLosses, s0 = solved(); queue.push('e7e5', 'd8h4'); await start('medium', 'w'); await play('f2', 'f3', 'e7e5'); await play('g2', 'g4', 'd8h4'); assert.strictEqual(G.over.result, 'loss'); assert.deepStrictEqual(banner(), { title: 'Checkmate', detail: 'The Medium computer wins this one. Try again?' }); assert.strictEqual(chips(), c0, 'a loss pays nothing, and takes nothing'); assert.strictEqual(st().chessLosses - l0, 1); assert.strictEqual(solved(), s0, 'no progress toward the trophy'); }
  fresh(); { const c0 = chips(), d0 = st().chessDraws, s0 = solved(); await start('hard', 'w'); const shuffle = ['g1f3', 'g8f6', 'f3g1', 'f6g8']; for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i += 2) await play(shuffle[i].slice(0, 2), shuffle[i].slice(2), shuffle[i + 1]);
    assert.strictEqual(G.over && G.over.result, 'draw', 'the same position three times is a draw'); assert.deepStrictEqual(banner(), { title: 'Draw', detail: 'By threefold repetition. A draw pays no chips.' }); assert.strictEqual(chips(), c0, 'a draw pays nothing'); assert.strictEqual(st().chessDraws - d0, 1); assert.strictEqual(solved(), s0); }
  fresh(); { const c0 = chips(), l0 = st().chessLosses, s0 = solved(); await start('hard', 'w'); await play('e2', 'e4', 'e7e5'); const r = $('chess-resign'); assert.strictEqual(text(r), 'Resign'); click(r); assert.strictEqual(text(r), 'Click again to resign'); assert.strictEqual(G.over, null, 'one click does not resign: it asks again'); click(r); assert.strictEqual(G.over && G.over.result, 'loss'); assert.strictEqual(banner().title, 'You resigned'); assert.strictEqual(chips(), c0); assert.strictEqual(st().chessLosses - l0, 1); assert.strictEqual(solved(), s0); assert.ok(r.disabled, 'a finished game cannot be resigned again'); }
  ctx.log('a loss, a draw by repetition and resigning pay nothing and are counted');

  /* ---------- promotion: all four pieces, by capture ---------- */
  fresh(); Store.set({ chess: { level: 'easy', human: 0, uci: ['h2h4', 'g7g5', 'h4g5', 'h7h6', 'g5h6', 'a7a6', 'h6h7', 'a6a5'], over: false, result: '' } }); G.open(); assert.strictEqual(G.view, 'play'); assert.strictEqual(G.game.played.length, 8);
  tap('h7'); tap('g8'); const promo = [...doc.querySelectorAll('#chess .ch-promo button')]; assert.deepStrictEqual(plain(promo.map(b => b.getAttribute('aria-label'))), ['queen', 'rook', 'bishop', 'knight'], 'a pawn that reaches the end asks what it should become'); assert.strictEqual(G.game.played.length, 8, 'and nothing has moved yet');
  queue.push('a8a7'); click(promo[3]); await idle(); assert.ok(/^hxg8=N/.test(G.game.sans[8]), `it became a knight (${G.game.sans[8]})`); assert.strictEqual(doc.querySelectorAll('#chess .ch-promo').length, 0); assert.ok(sq('g8').getAttribute('aria-label') === 'g8, white knight', 'and the knight is on g8');
  for (const [i, name] of [[0, 'Q'], [1, 'R'], [2, 'B']]) { Store.set({ chess: { level: 'easy', human: 0, uci: ['h2h4', 'g7g5', 'h4g5', 'h7h6', 'g5h6', 'a7a6', 'h6h7', 'a6a5'], over: false, result: '' } }); G.close(); G.open(); tap('h7'); tap('g8'); queue.push('a8a7'); click(doc.querySelectorAll('#chess .ch-promo button')[i]); await idle(); assert.ok(G.game.sans[8].startsWith(`hxg8=${name}`), `${name}: ${G.game.sans[8]}`); }
  fresh(); ctx.log('promotion offers queen, rook, bishop and knight, and makes the one you pick');

  /* ---------- dragging ---------- */
  fresh(); await start('easy', 'w'); doc.elementFromPoint = (x, y) => sq(x === 50 ? 'e4' : 'a5'); press('pointerdown', sq('e2'), 0, 0); press('pointermove', board(), 3, 0); assert.ok(!doc.querySelector('.ch-ghost'), 'a small wobble is not a drag'); press('pointermove', board(), 40, 0); assert.ok(doc.querySelector('.ch-ghost'), 'a piece follows the pointer once you drag it');
  assert.ok(!sq('e2').querySelector('svg'), 'and has left its square'); queue.push('e7e5'); press('pointerup', board(), 50, 0); await idle(); assert.strictEqual(G.game.sans[0], 'e4', 'dropped on e4: the move is made'); assert.ok(!doc.querySelector('.ch-ghost'), 'and the ghost is gone');
  press('pointerdown', sq('d2'), 0, 0); press('pointermove', board(), 40, 0); press('pointerup', board(), 99, 0); assert.strictEqual(G.game.played.length, 2, 'dropped on a square it cannot go to: nothing happens'); assert.ok(sq('d2').querySelector('svg'), 'the piece is back'); delete doc.elementFromPoint;
  ctx.log('dragging');

  /* ---------- the keyboard ---------- */
  fresh(); await start('easy', 'w'); assert.strictEqual(board().getAttribute('aria-activedescendant'), `chess-sq-${idx('e1')}`, 'the cursor starts on your king'); key('ArrowUp'); assert.strictEqual(G.cursor, idx('e2')); key('Enter'); assert.strictEqual(G.selected, idx('e2'), 'Enter picks the piece up'); assert.ok(sq('e2').classList.contains('cur'));
  key('ArrowUp'); key('ArrowUp'); assert.strictEqual(G.cursor, idx('e4')); queue.push('e7e5'); key(' '); await idle(); assert.strictEqual(G.game.sans[0], 'e4', 'Space puts it down');
  key('ArrowLeft'); assert.strictEqual(G.cursor, idx('d4')); for (let i = 0; i < 9; i++) key('ArrowRight'); assert.strictEqual(G.cursor, idx('h4'), 'the cursor stops at the edge'); for (let i = 0; i < 9; i++) key('ArrowDown'); assert.strictEqual(G.cursor, idx('h1'));
  key('ArrowLeft'); key('ArrowLeft'); key('ArrowLeft'); key('ArrowLeft'); key('ArrowLeft'); key('ArrowLeft'); key('ArrowLeft'); key('Enter'); assert.strictEqual(G.selected, idx('a1'), 'a rook picked up with the keyboard'); const open0 = G.isOpen(); key('Escape'); assert.strictEqual(G.selected, null, 'Escape puts the piece back'); assert.ok(G.isOpen() && open0, 'without leaving the table');
  key('Escape'); assert.ok(!G.isOpen(), 'and a second Escape leaves it'); fresh();
  /* with the board flipped (playing Black) up is still up on the screen */
  queue.push('e2e4'); await start('easy', 'b'); assert.strictEqual(G.cursor, idx('e8')); key('ArrowUp'); assert.strictEqual(G.cursor, idx('e7'), 'flipped: up on the screen is towards your side of the board'); key('Enter'); key('ArrowUp'); key('ArrowUp'); assert.strictEqual(G.cursor, idx('e5')); queue.push('g1f3'); key('Enter'); await idle(); assert.strictEqual(G.game.sans[1], 'e5', 'Black played e5 from the keyboard');
  key('ArrowLeft'); assert.strictEqual(G.cursor, idx('f5'), 'flipped: left on the screen is towards the h-file'); assert.strictEqual(text($('chess-ranks')), '12345678'); assert.strictEqual(text($('chess-files')), 'hgfedcba'); click($('chess-flip')); assert.strictEqual(text($('chess-ranks')), '87654321', 'Flip board turns it round'); fresh();
  ctx.log('the keyboard: arrows, Enter, Space, Escape, and a flipped board');

  /* ---------- the save ---------- */
  fresh(); await start('medium', 'w'); await play('e2', 'e4', 'e7e5'); G.close(); assert.ok(!G.isOpen()); assert.strictEqual(st().chess.uci.join(), 'e2e4,e7e5', 'leaving the table keeps the game'); G.open(); assert.strictEqual(G.view, 'play'); assert.deepStrictEqual([G.level, G.human, G.game.sans.join(' ')], ['medium', 0, 'e4 e5'], 'and you come back to the same game');
  /* leaving while the computer is thinking: its move must not arrive after you have gone */
  G.config.delay = () => 80; queue.push('b8c6'); tap('g1'); tap('f3'); assert.ok(G.thinking); G.close(); await new Promise(r => setTimeout(r, 200)); assert.strictEqual(st().chess.uci.length, 3, 'the computer did not move while you were away'); queue.push('b8c6'); G.open(); await idle(); assert.strictEqual(G.game.played.length, 4, 'it moves when you sit down again'); G.config.delay = () => 0;
  /* damaged saves are thrown away */
  for (const bad of [{ level: 'hard', human: 0, uci: ['e2e4', 'e2e4'], over: false, result: '' }, { level: 'hard', human: 0, uci: ['e2e5'], over: false, result: '' }]) { Store.set({ chess: bad }); G.close(); G.open(); assert.strictEqual(G.view, 'pick', 'a save that is not a legal game is not believed'); assert.strictEqual(st().chess.level, '', 'and is cleared'); }
  Store.set({ chess: { level: '', human: 0, uci: ['e2e4'], over: false, result: '' } }); G.close(); G.open(); assert.strictEqual(G.view, 'pick', 'moves without a level are not a game'); G.close();
  { Store.set({ chess: { level: 'easy', human: 0, uci: ['f2f3', 'e7e5', 'g2g4', 'd8h4'], over: false, result: '' } }); const c0 = chips(); G.open(); assert.strictEqual(G.over && G.over.result, 'loss', 'a saved game that is already checkmate is settled when you come back'); assert.strictEqual(st().chess.over, true); assert.strictEqual(chips(), c0); G.close(); }
  ctx.log('the save: leaving and coming back, leaving mid-thought, damaged saves');

  /* ---------- the trophy: the tenth win ---------- */
  fresh(); Store.set({ solved: {}, trophies: [], chips: 100 }); await new Promise(r => setTimeout(r, 5)); const t0 = chips();
  for (let n = 1; n <= 10; n++) { queue.push('f2f3'); await start('easy', 'b'); await play('e7', 'e5', 'g2g4'); tap('d8'); tap('h4'); await idle(); assert.strictEqual(G.over.result, 'win'); assert.strictEqual(solved(), n, `${n} wins`); if (n < 10) assert.ok(!trophies().includes('chess'), `no trophy after ${n} wins`); }
  assert.ok(trophies().includes('chess'), 'the tenth win earns the Chess trophy'); assert.strictEqual(chips() - t0, 1000, 'ten Easy wins at 100 chips'); assert.strictEqual(T.Trophies.byId.chess.goal, 10);
  G.close(); assert.deepStrictEqual(s.errors, [], 'no errors'); ctx.log('the tenth win earns the trophy');
} };
