// Run with: node tests/chess.test.js
// The chess engine (js/chess.js): the rules, saving a game as moves, the end of a game, the search, and how the three levels behave. If the chess.js test library is installed
// (cd tools/test && npm install) the engine is also checked against it, position by position, over random games.
const assert = require('assert'), fs = require('fs'), path = require('path');
const C = require('../js/chess.js');
let seed = 20260101; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const play = (game, ...sans) => sans.forEach(s => { const m = game.pos.moves().find(x => game.pos.san(x) === s); assert.ok(m, `${s} is legal here (${game.pos.fen()})`); game.play(m); });
const randomGame = (plies, fen) => { const g = new C.Game(fen); for (let i = 0; i < plies && !g.status().over; i++) { const ms = g.pos.moves(); g.play(ms[Math.floor(rng() * ms.length)]); } return g; };

/* ---------- the rules: the standard perft counts (the number of legal move sequences, known exactly) ---------- */
const PERFT = [
  ['start position', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  ['kiwipete: castling, pins, en passant', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['an endgame with en passant checks', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['promotions and castling through attacks', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['a promotion that gives check', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ['a middlegame, both sides castled', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]],
];
for (const [name, fen, want] of PERFT) { const p = new C.Position(fen); want.forEach((n, i) => assert.strictEqual(p.perft(i + 1), n, `${name}, depth ${i + 1}`)); assert.strictEqual(p.fen(), new C.Position(fen).fen(), `${name}: perft leaves the position as it was`); }

/* ---------- the position: FEN, hashing, make and unmake ---------- */
for (const fen of ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R b Kq e3 7 20', '8/8/8/4k3/8/8/8/4K2R w K - 0 1']) assert.strictEqual(new C.Position(fen).fen(), fen, 'a FEN reads and writes back the same');
for (let i = 0; i < 120; i++) { const g = randomGame(Math.floor(rng() * 90)), p = g.pos, again = new C.Position(p.fen()); assert.ok(p.h1 === again.h1 && p.h2 === again.h2, `the hash kept up move by move equals the hash from scratch (${p.fen()})`); }
{ const g = randomGame(40), fen = g.pos.fen(), h = [g.pos.h1, g.pos.h2], st = g.pos.stack.length; for (const m of g.pos.moves()) { g.pos.make(m); g.pos.unmake(); } assert.strictEqual(g.pos.fen(), fen, 'make then unmake of every move changes nothing'); assert.deepStrictEqual([g.pos.h1, g.pos.h2], h); assert.strictEqual(g.pos.stack.length, st); }
assert.ok(new C.Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').h1 !== new C.Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1').h1, 'the side to move is part of the hash');

/* ---------- moves written down: SAN for the screen, UCI for the save ---------- */
{ const g = new C.Game(); play(g, 'e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'); assert.strictEqual(g.sans.join(' '), 'e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7#'); assert.strictEqual(g.status().reason, 'checkmate'); assert.strictEqual(g.status().result, '1-0', "Scholar's mate"); }
{ const p = new C.Position('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'); const sans = p.moves().map(m => p.san(m)); assert.ok(sans.includes('O-O') && sans.includes('O-O-O'), 'castling is written O-O and O-O-O'); assert.strictEqual(p.uci(p.moves().find(m => p.san(m) === 'O-O')), 'e1g1'); assert.strictEqual(p.fromUci('e1g1').fl, 4); assert.strictEqual(p.fromUci('e1c1').fl, 8); }
{ const p = new C.Position('4k3/8/8/8/8/8/8/R5RK w - - 0 1'); const sans = p.moves().map(m => p.san(m)); assert.ok(sans.includes('Rad1') && sans.includes('Rgd1') && !sans.includes('Rd1'), 'two rooks that can both reach d1 are told apart by file'); const q = new C.Position('4k3/8/8/R7/8/8/R7/4K3 w - - 0 1'); const qs = q.moves().map(m => q.san(m)); assert.ok(qs.includes('R5a3') && qs.includes('R2a3'), 'and by rank when they share a file'); }
{ const p = new C.Position('8/P6k/8/8/8/8/8/K7 w - - 0 1'); const sans = p.moves().map(m => p.san(m)); assert.deepStrictEqual(sans.filter(x => x.includes('=')).sort(), ['a8=B', 'a8=N', 'a8=Q', 'a8=R'], 'a pawn that reaches the end can become any of four, written a8=Q'); const g = new C.Position('7k/P7/8/8/8/8/8/K7 w - - 0 1'); assert.ok(g.moves().map(m => g.san(m)).includes('a8=Q+'), 'and a promotion that gives check says so'); }
for (const [text, ok] of [['e2e4', true], ['e2e5', false], ['e7e8q', false], ['', false], ['e2', false], ['E2E4', false], ['e2e4x', false], [null, false], [12, false], ['e2e4 ', false], ['a1a1', false]]) assert.strictEqual(!!new C.Position().fromUci(text), ok, `"${text}" ${ok ? 'is' : 'is not'} a legal first move`);
{ const p = new C.Position('8/P6k/8/8/8/8/8/K7 w - - 0 1'); assert.strictEqual(p.fromUci('a7a8'), null, 'a promotion needs its letter'); assert.strictEqual(p.fromUci('a7a8q').pr, C.Q); assert.strictEqual(p.fromUci('a7a8n').pr, C.N); assert.strictEqual(new C.Position().fromUci('e2e4q'), null, 'and a letter on a move that is not a promotion is wrong'); assert.strictEqual(p.fromUci('a7a8k'), null); }
{ const p = new C.Position('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3'); const m = p.fromUci('e5f6'); assert.ok(m && m.fl === 2, 'en passant is found from its text'); assert.strictEqual(p.san(m), 'exf6'); }
for (let i = 0; i < 40; i++) { const g = randomGame(20 + Math.floor(rng() * 120)), list = g.uciMoves(); const r = C.replay(list); assert.ok(r && r.pos.fen() === g.pos.fen() && r.sans.join() === g.sans.join(), 'a saved game replays to the same position and the same moves'); assert.deepStrictEqual(r.uciMoves(), list); }
assert.strictEqual(C.replay(['e2e4', 'e2e4']), null); assert.strictEqual(C.replay(['e2e4', 'e7e5', 'e4e5']), null, 'one illegal move spoils the whole list'); assert.strictEqual(C.replay('e2e4'), null); assert.strictEqual(C.replay(null), null); assert.strictEqual(C.replay([5]), null); assert.strictEqual(C.replay([]).pos.fen(), new C.Position().fen(), 'no moves: the start');

/* ---------- how a game ends ---------- */
const over = (fen, then) => { const g = new C.Game(fen); if (then) play(g, ...then); return g.status(); };
{ const g = new C.Game(); play(g, 'f3', 'e5', 'g4', 'Qh4#'); assert.deepStrictEqual(g.status(), { over: true, result: '0-1', reason: 'checkmate' }, "fool's mate: Black wins"); }
assert.deepStrictEqual(over('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'), { over: true, result: '1/2-1/2', reason: 'stalemate' }); assert.strictEqual(over('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').over, true);
for (const [fen, ends] of [['8/8/8/4k3/8/8/8/4K3 w - - 0 1', true], ['8/8/8/4k3/8/8/8/4KB2 w - - 0 1', true], ['8/8/8/4k3/8/8/8/4KN2 w - - 0 1', true], ['8/8/8/4k3/8/3b4/8/4KB2 w - - 0 1', true], ['8/8/8/4k3/8/2b5/8/4KB2 w - - 0 1', false], ['8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', false], ['8/8/8/4k3/8/8/8/4KR2 w - - 0 1', false], ['8/8/8/4k3/8/8/8/3NKN2 w - - 0 1', false]]) assert.strictEqual(over(fen).over, ends, `${fen}: ${ends ? 'a dead draw (no way to mate)' : 'play on (a mate is still possible, e.g. with bishops on opposite colours)'}`);
assert.strictEqual(over('8/8/8/4k3/8/8/8/4K3 w - - 0 1').reason, 'insufficient material');
assert.deepStrictEqual(over('3k4/8/8/8/8/8/4R3/4K3 b - - 99 80'), { over: false, result: null, reason: '' }); { const g = new C.Game('3k4/8/8/8/8/8/4R3/4K3 b - - 99 80'); play(g, 'Kc8'); assert.deepStrictEqual(g.status(), { over: true, result: '1/2-1/2', reason: 'the fifty-move rule' }, '100 half-moves with no capture or pawn move'); }
{ const g = new C.Game(); play(g, 'Nf3', 'Nf6', 'Ng1', 'Ng8'); assert.strictEqual(g.repetitions(), 2); assert.strictEqual(g.status().over, false); play(g, 'Nf3', 'Nf6', 'Ng1', 'Ng8'); assert.strictEqual(g.repetitions(), 3); assert.deepStrictEqual(g.status(), { over: true, result: '1/2-1/2', reason: 'threefold repetition' }); g.undo(); assert.strictEqual(g.status().over, false, 'taking a move back undoes the repetition'); }
{ const g = new C.Game('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'); assert.strictEqual(g.status().reason, ''); play(g, 'Ra8#'); assert.deepStrictEqual(g.status(), { over: true, result: '1-0', reason: 'checkmate' }, 'a back-rank mate'); }
{ const g = new C.Game(); play(g, 'e4'); assert.strictEqual(g.played.length, 1); assert.ok(g.undo()); assert.strictEqual(g.pos.fen(), new C.Position().fen()); assert.strictEqual(g.undo(), null, 'nothing more to take back'); assert.deepStrictEqual(g.sans, []); }
{ const p = new C.Position('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'); assert.strictEqual(p.inCheck(), true); assert.strictEqual(p.moves().length, 0, 'checkmated: no legal moves'); }

/* ---------- the evaluation looks the same from both sides ---------- */
const flip = fen => { const [pl, side, cast, ep] = fen.split(' '); const rows = pl.split('/').reverse().map(r => r.split('').map(c => (/[a-z]/.test(c) ? c.toUpperCase() : /[A-Z]/.test(c) ? c.toLowerCase() : c)).join('')); const sw = cast === '-' ? '-' : cast.split('').map(c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).sort((a, b) => (a < b ? -1 : 1)).join(''); return `${rows.join('/')} ${side === 'w' ? 'b' : 'w'} ${sw === '-' ? '-' : sw} ${ep === '-' ? '-' : ep[0] + (9 - Number(ep[1]))} 0 1`; };
for (let i = 0; i < 40; i++) { const g = randomGame(10 + Math.floor(rng() * 60)); if (g.status().over) continue; const f = g.pos.fen(); assert.strictEqual(C.evaluate(new C.Position(f)), C.evaluate(new C.Position(flip(f))), `colour-flipped: the same score for the side to move (${f})`); }
assert.ok(Math.abs(C.evaluate(new C.Position())) < 60, 'the start is about level'); assert.ok(C.evaluate(new C.Position('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')) > 700, 'a queen up is worth about nine pawns');
assert.ok(C.evaluate(new C.Position('4k3/8/8/8/8/8/8/4KQ2 w - - 0 1')) > 800 && C.evaluate(new C.Position('4k3/8/8/8/8/8/8/4KQ2 b - - 0 1')) < -800, 'and it is the side to move that is scored');

/* ---------- the levels ---------- */
assert.deepStrictEqual(Object.keys(C.LEVELS), ['easy', 'medium', 'hard']); assert.deepStrictEqual(Object.values(C.LEVELS).map(l => l.name), ['Easy', 'Medium', 'Hard']);
assert.ok(C.LEVELS.easy.depth === 1 && C.LEVELS.easy.noise >= 200 && !C.LEVELS.easy.lapse, 'Easy: one move deep, a wild wobble'); assert.ok(C.LEVELS.medium.depth === 2 && C.LEVELS.medium.lapse > 0.05 && C.LEVELS.medium.lapse < 0.25, 'Medium: two deep, with a lapse now and then'); assert.ok(C.LEVELS.hard.depth >= 5 && !C.LEVELS.hard.noise && C.LEVELS.hard.ms <= 1000, 'Hard: deep, no wobble, under a second');
assert.ok(C.LEVELS.easy.ms <= C.LEVELS.medium.ms && C.LEVELS.medium.ms <= C.LEVELS.hard.ms);
{ const g = new C.Game(); const r1 = C.chooseMove(g, 'medium', () => 0), r2 = C.chooseMove(g, 'medium', () => 0.99); assert.strictEqual(r1.depth, 1, 'a lapse: that move is played like Easy'); assert.strictEqual(r2.depth, 2, 'no lapse: Medium'); assert.strictEqual(C.chooseMove(g, 'easy', () => 0).depth, 1); assert.ok(C.chooseMove(g, 'hard').depth >= 3, 'Hard gets some depth in its time'); assert.ok(C.chooseMove(g, 'nonsense').move, 'an unknown level is Hard'); }
/* a level always plays a legal move, and says so when there is none */
for (const level of ['easy', 'medium', 'hard']) for (let i = 0; i < 25; i++) { const g = randomGame(6 + Math.floor(rng() * 80)); if (g.status().over) continue; const L = { ...C.LEVELS[level], ms: 30 }; const r = C.search(g.pos, { depth: Math.min(L.depth, 3), ms: L.ms, noise: L.noise, qsearch: L.qsearch, rng, game: g }); assert.ok(r.move && g.pos.moves().some(m => m.f === r.move.f && m.t === r.move.t && m.pr === r.move.pr), `${level} played a legal move in ${g.pos.fen()}`); assert.strictEqual(g.pos.fen(), new C.Position(g.pos.fen()).fen(), 'and left the position alone'); }
{ const g = new C.Game(); play(g, 'f3', 'e5', 'g4', 'Qh4#'); assert.strictEqual(C.search(g.pos, { depth: 3 }).move, null, 'nothing to play after checkmate'); }
{ const g = new C.Game('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'), t0 = Date.now(); C.search(g.pos, { depth: 40, ms: 120 }); assert.ok(Date.now() - t0 < 600, `it stops when its time is up (${Date.now() - t0} ms)`); }
/* the position tests: what each level can and cannot do (Hard and the search deterministically, the others by how often) */
const TACTICS = { scholar: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', backRank: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', freeQueen: 'rnb1kbnr/pppp1ppp/8/4p3/3qP3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', legal: 'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R b KQkq - 0 5' };
/* a level's move as the game gets it (chooseMove, with Medium's lapses); or, with a depth, Hard at a fixed depth so the answer is the same every time */
const san = (fen, level, opts = {}) => { const g = new C.Game(fen); return g.pos.san(opts.depth ? C.search(g.pos, { depth: opts.depth, game: g }).move : C.chooseMove(g, level, rng).move); };
assert.strictEqual(san(TACTICS.scholar, 'hard', { depth: 4 }), 'Qxf7#'); assert.strictEqual(san(TACTICS.backRank, 'hard', { depth: 4 }), 'Ra8#'); assert.strictEqual(san(TACTICS.freeQueen, 'hard', { depth: 4 }), 'Nxd4', 'Hard takes a free queen');
assert.notStrictEqual(san(TACTICS.legal, 'hard', { depth: 5 }), 'Bxd1', "Hard does not fall for Legal's trap (Bxd1? Bxf7+ Ke7 Nd5#)"); { const g = new C.Game(TACTICS.legal); play(g, 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#'); assert.strictEqual(g.status().reason, 'checkmate', 'and the trap is real'); }
{ let m = 0, e = 0; for (let i = 0; i < 60; i++) { if (san(TACTICS.scholar, 'medium').endsWith('#')) m++; if (san(TACTICS.scholar, 'easy').endsWith('#')) e++; } assert.ok(m >= 42 && m <= 59, `Medium finds a mate in one most of the time, but not always (${m} of 60)`); assert.ok(e <= 28 && e < m - 12, `Easy misses it more often than not, and far more often than Medium (${e} of 60, against ${m})`); }
{ let m = 0; for (let i = 0; i < 40; i++) if (san(TACTICS.legal, 'medium') === 'Bxd1') m++; assert.ok(m >= 36, `Medium falls for a three-move trap (${m} of 40)`); }
{ let e = 0; for (let i = 0; i < 40; i++) if (san(TACTICS.freeQueen, 'easy') === 'Nxd4') e++; assert.ok(e >= 30, `Easy does take a free queen (${e} of 40)`); }
/* the levels in order: stronger beats weaker (Hard at a fixed depth, so this is the same every time) */
function match(a, b, games) {
  let aWins = 0, bWins = 0; const choose = (g, who) => { const o = who === 'hard' ? { depth: 3 } : { depth: C.LEVELS[who].depth }; const L = who === 'hard' ? { noise: 0, qsearch: true } : C.LEVELS[who]; return C.search(g.pos, { depth: o.depth, noise: L.noise, qsearch: L.qsearch, rng, game: g }).move; };
  for (let k = 0; k < games; k++) { const g = new C.Game(), aWhite = k % 2 === 0; for (let i = 0; i < 2; i++) { const ms = g.pos.moves(); g.play(ms[Math.floor(rng() * ms.length)]); } let st; while (!(st = g.status()).over && g.played.length < 240) g.play(choose(g, (g.pos.side === 0) === aWhite ? a : b)); if (st.over && st.reason === 'checkmate') { if ((st.result === '1-0') === aWhite) aWins++; else bWins++; } }
  return [aWins, bWins];
}
{ const [m, e] = match('medium', 'easy', 6); assert.ok(m >= 5 && e === 0, `Medium beats Easy (${m}-${e})`); const [h, mm] = match('hard', 'medium', 4); assert.ok(h >= 3 && mm === 0, `Hard beats Medium (${h}-${mm})`); }
/* and the thing a weak level cannot do: turn a won ending into checkmate */
{ let hard = 0; for (const fen of ['8/8/8/4k3/8/8/8/Q3K3 w - - 0 1', '8/6k1/8/8/8/8/1Q6/K7 w - - 0 1', '4k3/8/8/8/8/8/6Q1/4K3 w - - 0 1']) { const g = new C.Game(fen); let st; while (!(st = g.status()).over && g.played.length < 100) { if (g.pos.side === 0) g.play(C.search(g.pos, { depth: 5, game: g }).move); else { const ms = g.pos.moves(); g.play(ms[Math.floor(rng() * ms.length)]); } } if (st.reason === 'checkmate') hard++; } assert.strictEqual(hard, 3, 'Hard mates with king and queen against a king (within fifty moves, against a king that moves at random)'); }

/* ---------- against the reference library, if it is installed ---------- */
let Ref = null; try { Ref = require(path.join(__dirname, '../tools/test/node_modules/chess.js')).Chess; } catch (e) { /* not installed: the checks above still ran */ }
if (!Ref) console.log('(the chess.js test library is not installed: cd tools/test && npm install, to check the rules against it too)');
else {
  const core = f => f.split(' ').filter((_, i) => i !== 3).join(' '); let positions = 0;
  for (let k = 0; k < 24; k++) {                                                                  // (24 games is enough to catch a regression: the 400-game comparison was done once, when the engine was written)
    const ref = new Ref(), mine = new C.Game();
    for (let ply = 0; ply < 220; ply++) {
      positions++; const rm = ref.moves({ verbose: true }), a = rm.map(m => m.san).sort(), b = mine.pos.moves().map(m => mine.pos.san(m)).sort(); assert.deepStrictEqual(b, a, `game ${k} ply ${ply}: the same legal moves (${ref.fen()})`); assert.strictEqual(core(mine.pos.fen()), core(ref.fen()), `game ${k} ply ${ply}: the same position`);
      assert.deepStrictEqual(mine.pos.moves().map(m => mine.pos.uci(m)).sort(), rm.map(m => m.from + m.to + (m.promotion || '')).sort(), 'and the same moves written as from-to');
      assert.strictEqual(mine.status().over, ref.isGameOver(), `game ${k} ply ${ply}: over or not (${ref.fen()})`); if (ref.isGameOver()) { const why = ref.isCheckmate() ? 'checkmate' : ref.isStalemate() ? 'stalemate' : ref.isInsufficientMaterial() ? 'insufficient material' : ref.isThreefoldRepetition() ? 'threefold repetition' : 'the fifty-move rule'; assert.strictEqual(mine.status().reason, why, 'the same reason'); break; }
      const ms = mine.pos.moves(), m = ms[Math.floor(rng() * ms.length)]; ref.move(mine.pos.san(m)); mine.play(m);
    }
  }
  console.log(`checked against chess.js: ${positions.toLocaleString()} positions in 24 random games, no differences`);
}
console.log('chess tests passed');
