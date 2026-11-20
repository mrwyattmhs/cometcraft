/* The CHESS TABLE's window (overlay #chess): walk up to the table in the park, next to the little library, and play the computer on a plain 2D board, the way it looks on a chess website.
   The world is hidden while you play. The rules and the computer are in chess.js; this file is the screen, and it is made the first time you sit down.
     Pick a level (Easy 100 chips, Medium 200, Hard 300 for a WIN) and a side (White, Black, or either), then play: click a piece and a square, or drag it, or use the keyboard (arrow keys to
     move round the board, Enter or Space to pick a piece up and put it down). Squares you can go to show a dot, a capture shows a ring, the last move and a king in check are lit, a pawn that
     reaches the end asks what you want it to become. A win pays the level's chips and counts toward the trophy (10 wins); a draw or a loss pays nothing, and neither does resigning.
   The game is SAVED as it is played (the level, your side and the moves, in Store.chess): leaving the table, closing the window or reloading brings you back to the same position, and a game that is
   over stays over (it cannot be paid twice). A save that is not a legal game is thrown away, never half-believed.
   For tests: ChessGame.config.engine (who plays the computer's moves) and ChessGame.config.delay (how long a move is held back so it does not feel instant) can be replaced. */
const ChessGame = (() => {
  const BUILD = 52; // bump together with the ?v= numbers in index.html
  const P = 'chess', $ = id => document.getElementById(`${P}-${id}`), LEVELS = ['easy', 'medium', 'hard'], WIN = Economy.PAY.chess, C = Chess;
  const config = { engine: (g, level) => C.chooseMove(g, level), delay: level => ({ easy: 450, medium: 600, hard: 350 }[level] || 400) };
  const ABOUT = {
    easy: 'Plays at once. Grabs free pieces, but misses most threats and cannot finish a won game. Good for learning how the pieces move.',
    medium: 'Sees a move or two ahead and finds simple checkmates, but has lapses and falls for traps that take three moves to spring.',
    hard: 'Thinks for up to a second, looking five or six moves ahead. Sees through traps and checkmates reliably. Beats most casual players.',
  };
  const PNAME = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'], VAL = [0, 1, 3, 3, 5, 9, 0], START = [0, 8, 2, 2, 2, 1, 1];

  /* ---------- the pieces, drawn in code: no pictures to download. A shaded vector set in a 100 x 100 box, with one base and an outline; the gradients are defined once, hidden, in the window. ---------- */
  const PIECE_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    '<linearGradient id="pcw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f1ecdf"/><stop offset="1" stop-color="#cfc8b6"/></linearGradient>' +
    '<linearGradient id="pcb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a6660"/><stop offset="0.5" stop-color="#383531"/><stop offset="1" stop-color="#171614"/></linearGradient></defs></svg>';
  const BASE = '<path d="M25 89 Q25 83 31 81 H69 Q75 83 75 89 Z"/><path d="M31 81 Q35 76 41 75 H59 Q65 76 69 81 Z"/>';
  const PARTS = {
    1: '<circle cx="50" cy="27" r="11.5"/><ellipse cx="50" cy="41" rx="14" ry="4.6"/><path d="M38 43 Q38 60 31 75 H69 Q62 60 62 43 Z"/>' + BASE,
    2: '<path d="M27 89 C25 74 30 62 41 54 C33 56 25 58 19 55 C13 53 11 47 14 43 C19 40 26 36 31 30 L34 22 L39 14 L45 22 C47 21 49 21 51 22 C69 26 80 46 77 75 L73 89 Z"/><path d="M31 81 Q35 76 41 75 H62 Q70 76 74 81 Z"/><path d="M26 89 Q26 83 32 81 H72 Q76 83 76 89 Z"/>',
    3: '<circle cx="50" cy="13" r="5.2"/><path d="M50 18 C64 26 69 40 63 51 C60 56 40 56 37 51 C31 40 36 26 50 18 Z"/><ellipse cx="50" cy="57" rx="15.5" ry="4.8"/><path d="M38 59 Q40 68 31 76 H69 Q60 68 62 59 Z"/>' + BASE,
    4: '<path d="M27 20 H38 V28 H45 V20 H55 V28 H62 V20 H73 V40 H27 Z"/><path d="M31 40 L34 47 H66 L69 40 Z"/><path d="M34 47 H66 L70 75 H30 Z"/>' + BASE,
    5: '<path d="M30 78 L22 38 L36 56 L38 28 L50 52 L62 28 L64 56 L78 38 L70 78 Z"/><circle cx="22" cy="33" r="5"/><circle cx="38" cy="23" r="5"/><circle cx="50" cy="19" r="5"/><circle cx="62" cy="23" r="5"/><circle cx="78" cy="33" r="5"/><ellipse cx="50" cy="73" rx="22" ry="5"/>' + BASE,
    6: '<path d="M46 6 H54 V13 H61 V21 H54 V29 H46 V21 H39 V13 H46 Z"/><path d="M35 46 Q33 34 50 31 Q67 34 65 46 Q73 53 64 59 H36 Q27 53 35 46 Z"/><ellipse cx="50" cy="62" rx="16" ry="4.8"/><path d="M38 63 Q40 70 31 76 H69 Q60 70 62 63 Z"/>' + BASE,
  };
  const DETAIL = {
    1: '<path d="M44 21 Q46 17 51 17" class="hl"/><path d="M42 50 Q41 62 37 72" class="hl"/>',
    2: '<circle cx="35" cy="34" r="2.6" class="eye"/><circle cx="17" cy="46" r="1.5" class="eye"/><path d="M27 52 Q34 49 39 43" class="dk"/><path d="M45 26 Q62 30 70 50" class="dk"/><path d="M50 32 Q64 40 71 58" class="dk"/><path d="M54 40 Q65 48 72 66" class="dk"/><path d="M38 60 Q34 70 32 80" class="hl"/><path d="M33 33 Q30 38 24 41" class="hl"/>',
    3: '<path d="M44 33 L55 24" class="dk"/><path d="M42 30 Q42 38 40 46" class="hl"/><circle cx="48" cy="11.5" r="1.5" class="eye"/>',
    4: '<path d="M30 40 H70" class="dk"/><path d="M38 52 L36 70" class="hl"/><path d="M31 28 V36" class="hl"/>',
    5: '<path d="M36 56 L37 68 M50 52 V68 M64 56 L63 68" class="dk"/><path d="M26 46 L31 70" class="hl"/>',
    6: '<path d="M42 40 Q50 36 58 40" class="dk"/><path d="M41 50 Q40 56 38 58" class="hl"/><path d="M47 10 V26" class="hl"/>',
  };
  /** A piece as SVG text: type 1 to 6 (pawn to king), color 0 white or 1 black. */
  function pieceSvg(type, color, cls = 'ch-pc') {
    const fill = color ? 'url(#pcb)' : 'url(#pcw)', line = color ? '#0b0a09' : '#34302a', light = color ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.9)', dark = color ? 'rgba(255,255,255,.28)' : 'rgba(40,36,30,.5)', eye = color ? '#f4f1e8' : '#26231f';
    return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><g fill="${fill}" stroke="${line}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${PARTS[type]}</g>` +
      `<g fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><style>.hl{stroke:${light}}.dk{stroke:${dark}}.eye{fill:${eye};stroke:none}</style>${DETAIL[type]}</g></svg>`;
  }

  /* ---------- the state ---------- */
  let game = null, human = 0, level = 'medium', colorChoice = 'w', over = null, flipped = false, sel = null, targets = [], thinking = false, drag = null, seq = 0, cursor = 4, wired = false, resignAt = 0, view = 'pick';
  const isOpen = () => !!document.getElementById(P) && !document.getElementById(P).classList.contains('hidden');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const show = which => { view = which; $('pick').classList.toggle('hidden', which !== 'pick'); $('play').classList.toggle('hidden', which !== 'play'); document.getElementById(P).dataset.state = which; };
  const levelName = id => ({ easy: 'Easy', medium: 'Medium', hard: 'Hard' }[id]);

  function ensureDom() {
    if (document.getElementById(P)) return;
    const d = document.createElement('div'); d.id = P; d.className = 'overlay hidden kelly'; d.dataset.state = 'pick';
    d.innerHTML = PIECE_DEFS +
      `<div class="mc-panel eqn-panel chess-panel" role="dialog" aria-modal="true" aria-labelledby="${P}-title">` +
      `<header class="craft-head"><div class="k-title"><span class="k-wing">The park</span><div class="k-titlerow"><span class="k-cube" aria-hidden="true"></span><h2 id="${P}-title">Chess</h2><span class="k-formula">vs the computer</span></div></div>` +
      `<div class="craft-meta"><span id="${P}-wallet" class="wallet-chip">0 chips</span><button id="${P}-close" class="btn small" type="button">Leave the table</button></div></header>` +
      `<div id="${P}-pick"><span class="k-label">Pick a level</span><p class="bet-prompt">Win a game to earn chips: a draw or a loss pays nothing, and nothing is ever taken from you.</p><div id="${P}-levels" class="bet-grid"></div>` +
      `<span class="k-label">Play as</span><div id="${P}-colors" class="ch-seg"></div><button id="${P}-start" class="btn primary ch-start" type="button">Start game</button></div>` +
      `<div id="${P}-play" class="ch-play hidden"><div class="ch-left"><div class="ch-bar" id="${P}-top"><span class="ch-who" id="${P}-topwho"></span><span class="ch-taken" id="${P}-toptaken"></span><span class="ch-adv" id="${P}-topadv"></span><span class="ch-turn" id="${P}-topturn"></span></div>` +
      `<div class="ch-boardwrap"><div class="ch-ranks" id="${P}-ranks" aria-hidden="true"></div><div class="ch-board" id="${P}-board" role="grid" tabindex="0" aria-label="Chess board. Arrow keys move around the board; Enter or Space picks a piece up and puts it down."></div><div></div><div class="ch-files" id="${P}-files" aria-hidden="true"></div></div>` +
      `<div class="ch-bar" id="${P}-bot"><span class="ch-who" id="${P}-botwho"></span><span class="ch-taken" id="${P}-bottaken"></span><span class="ch-adv" id="${P}-botadv"></span><span class="ch-turn" id="${P}-botturn"></span></div></div>` +
      `<div class="ch-right"><p id="${P}-status" class="ch-status" role="status"></p><div class="ch-moves" id="${P}-moves" aria-label="Moves"></div><div class="ch-actions"><button id="${P}-flip" class="btn" type="button">Flip board</button><button id="${P}-resign" class="btn" type="button">Resign</button></div></div></div></div>`;
    document.body.appendChild(d);
  }
  function wire() {
    if (wired) return; wired = true; ensureDom();
    LEVELS.forEach((id, i) => {
      const b = el('button', 'btn bet-card bet'); b.type = 'button'; b.dataset.level = id;
      b.innerHTML = `<span class="k-ico">${pieceSvg([1, 2, 5][i], 0, 'ch-ico')}</span><span class="bet-amt">${levelName(id)}</span><span class="bet-desc">${ABOUT[id]}</span><span class="bet-win"><i class="k-coin" aria-hidden="true"></i><b>${WIN[i]} chips</b><em> for a win</em></span>`;
      b.addEventListener('click', () => { level = id; markPick(); }); $('levels').appendChild(b);
    });
    [['w', 'White'], ['b', 'Black'], ['r', 'Either']].forEach(([id, name]) => { const b = el('button', 'btn', name); b.type = 'button'; b.dataset.color = id; b.addEventListener('click', () => { colorChoice = id; markPick(); }); $('colors').appendChild(b); });
    $('start').addEventListener('click', () => startGame(level, colorChoice)); $('close').addEventListener('click', close);
    $('flip').addEventListener('click', () => { flipped = !flipped; render(); }); $('resign').addEventListener('click', resign);
    $('wallet').parentNode.insertBefore(Trophies.chip('chess'), $('wallet')); Store.onChange(() => { $('wallet').textContent = `${Store.get().chips} chips`; });
    const board = $('board');
    board.addEventListener('pointerdown', onDown); board.addEventListener('pointermove', onMove); board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', () => { if (drag) { if (drag.ghost) drag.ghost.remove(); drag = null; render(); } });
    board.addEventListener('keydown', onKey);
  }
  function markPick() {
    $('levels').querySelectorAll('.bet').forEach(b => b.classList.toggle('picked', b.dataset.level === level)); $('colors').querySelectorAll('.btn').forEach(b => b.classList.toggle('on', b.dataset.color === colorChoice));
    const i = LEVELS.indexOf(level); $('start').textContent = `Start game (win ${WIN[i]} chips)`;
  }

  /* ---------- opening, closing, and the saved game ---------- */
  function open() {
    wire(); $('wallet').textContent = `${Store.get().chips} chips`; const root = document.getElementById(P);
    const back = restore(); markPick(); root.classList.remove('hidden'); UI.setOpen(P, true);
    if (back) { show('play'); render(); computerMove(); $('board').focus({ preventScroll: true }); } else { show('pick'); const c = $('levels').querySelector('.picked') || $('levels').querySelector('.bet'); if (c) c.focus(); }
  }
  function close() { if (!isOpen()) return; seq++; thinking = false; resignAt = 0; if (drag && drag.ghost) drag.ghost.remove(); drag = null; document.getElementById(P).classList.add('hidden'); UI.setOpen(P, false); }
  /** Bring back the saved game, if there is one and it is a real one. Returns true if there is a game on the table. */
  function restore() {
    const c = Store.get().chess; game = null; over = null; sel = null; targets = []; seq++; thinking = false;
    if (!c || !LEVELS.includes(c.level)) return false;
    const g = C.replay(c.uci); if (!g) { Store.set({ chess: { level: '', human: 0, uci: [], over: false, result: '' } }); return false; }
    game = g; human = c.human === 1 ? 1 : 0; level = c.level; flipped = human === 1; cursor = human === 1 ? 116 : 4;
    if (c.over) over = describe(c.result); else if (g.status().over) finish(false);
    return true;
  }
  function save() { Store.set({ chess: { level, human, uci: game.uciMoves(), over: !!over, result: over ? over.result : '' } }); }
  function startGame(lv, color) {
    level = LEVELS.includes(lv) ? lv : 'medium'; colorChoice = color; human = color === 'r' ? (Math.random() < 0.5 ? 0 : 1) : color === 'b' ? 1 : 0;
    seq++; thinking = false; over = null; sel = null; targets = []; game = new C.Game(); flipped = human === 1; cursor = human === 1 ? 116 : 4; save(); show('play'); render(); computerMove(); $('board').focus({ preventScroll: true });
  }

  /* ---------- the end of a game ---------- */
  /** What an ended game says, from its result for you ('win', 'loss' or 'draw'). */
  function describe(result) {
    const st = game.status(), i = LEVELS.indexOf(level), name = levelName(level);
    if (result === 'win') return { result, pay: WIN[i], title: 'Checkmate! You win!', detail: `You beat the ${name} computer and earn ${WIN[i]} chips.`, text: `You won by checkmate: +${WIN[i]} chips.` };
    if (result === 'loss') return st.over ? { result, pay: 0, title: 'Checkmate', detail: `The ${name} computer wins this one. Try again?`, text: 'You were checkmated.' } : { result, pay: 0, title: 'You resigned', detail: 'The computer wins this one. Try again?', text: 'You resigned.' };
    return { result: 'draw', pay: 0, title: 'Draw', detail: `By ${st.reason}. A draw pays no chips.`, text: `Draw by ${st.reason}.` };
  }
  /** The game is over (or you resigned): settle it ONCE: count it, pay a win, save. */
  function finish(resigned) {
    const st = game.status(); if (over || (!st.over && !resigned)) return false;
    const result = resigned ? 'loss' : st.reason === 'checkmate' ? ((st.result === '1-0') === (human === 0) ? 'win' : 'loss') : 'draw';
    over = describe(result); const s = Store.get();
    Store.set({ chessWins: s.chessWins + (result === 'win' ? 1 : 0), chessLosses: s.chessLosses + (result === 'loss' ? 1 : 0), chessDraws: s.chessDraws + (result === 'draw' ? 1 : 0) }); save();
    if (result === 'win') { Store.earn(over.pay); Trophies.award('chess'); }
    return true;
  }
  function resign() {
    if (!game || over || thinking) return; const now = Date.now();
    if (now - resignAt > 3000) { resignAt = now; $('resign').textContent = 'Click again to resign'; setTimeout(() => { if (Date.now() - resignAt >= 2900) { resignAt = 0; $('resign').textContent = 'Resign'; } }, 3100); return; }
    resignAt = 0; seq++; $('resign').textContent = 'Resign'; finish(true); render();
  }

  /* ---------- drawing ---------- */
  const order = () => { const out = []; for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) out.push(flipped ? (r * 16 + (7 - f)) : ((7 - r) * 16 + f)); return out; };
  const nameOf = s => 'abcdefgh'[s & 7] + ((s >> 4) + 1);
  function render() {
    if (!game) return; const p = game.pos, b = p.b, last = game.played.length ? game.played[game.played.length - 1] : null, st = over ? null : game.status(), inCheck = p.inCheck(), board = $('board');
    board.textContent = ''; const sqs = order();
    $('ranks').innerHTML = (flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1]).map(n => `<span>${n}</span>`).join(''); $('files').innerHTML = (flipped ? 'hgfedcba' : 'abcdefgh').split('').map(c => `<span>${c}</span>`).join('');
    board.setAttribute('aria-activedescendant', `${P}-sq-${cursor}`);
    sqs.forEach(s => {
      const d = document.createElement('div'), light = (((s >> 4) + (s & 7)) & 1) === 1; d.className = `ch-sq ${light ? 'l' : 'd'}`; d.id = `${P}-sq-${s}`; d.dataset.sq = s; d.setAttribute('role', 'gridcell');
      d.setAttribute('aria-label', nameOf(s) + (b[s] ? `, ${b[s] >> 3 ? 'black' : 'white'} ${PNAME[b[s] & 7]}` : ', empty'));
      if (last && (s === last.f || s === last.t)) d.classList.add('last'); if (s === sel) d.classList.add('sel'); if (inCheck && s === p.k[p.side]) d.classList.add('check'); if (s === cursor) d.classList.add('cur');
      if (b[s] && !(drag && drag.moving && drag.from === s)) d.insertAdjacentHTML('beforeend', pieceSvg(b[s] & 7, b[s] >> 3));
      const t = targets.find(m => m.t === s); if (t) { d.classList.add('target'); d.appendChild(el('span', 'ch-hint' + (b[s] || t.fl & 2 ? ' cap' : ''))); }
      board.appendChild(d);
    });
    const me = human, opp = human ^ 1, count = color => { const c = [0, 0, 0, 0, 0, 0, 0]; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } if (b[s] && (b[s] >> 3) === color) c[b[s] & 7]++; } return c; };
    const mine = count(me), theirs = count(opp), gone = c => { const out = []; for (const t of [5, 4, 3, 2, 1]) for (let i = 0; i < Math.max(0, START[t] - c[t]); i++) out.push(t); return out; }, mat = c => c.reduce((a, n, t) => a + n * VAL[t], 0), diff = mat(mine) - mat(theirs);
    $('topwho').textContent = `Computer (${levelName(level)})`; $('botwho').textContent = 'You'; $('toptaken').innerHTML = gone(mine).map(t => pieceSvg(t, me, 'ch-cap')).join(''); $('bottaken').innerHTML = gone(theirs).map(t => pieceSvg(t, opp, 'ch-cap')).join('');
    $('botadv').textContent = diff > 0 ? `+${diff}` : ''; $('topadv').textContent = diff < 0 ? `+${-diff}` : ''; $('topturn').classList.toggle('on', !over && p.side === opp); $('botturn').classList.toggle('on', !over && p.side === me);
    $('topturn').setAttribute('aria-label', p.side === opp && !over ? 'Computer to move' : ''); $('botturn').setAttribute('aria-label', p.side === me && !over ? 'Your move' : '');
    const mv = $('moves'); mv.textContent = ''; game.sans.forEach((s, i) => { if (i % 2 === 0) mv.appendChild(el('span', 'n', `${i / 2 + 1}.`)); mv.appendChild(el('span', 'm' + (i === game.sans.length - 1 ? ' cur' : ''), s)); }); mv.scrollTop = mv.scrollHeight;
    $('status').textContent = over ? over.text : thinking ? 'The computer is thinking...' : st && st.reason === 'check' ? (p.side === me ? 'Check! Your move.' : 'Check!') : p.side === me ? 'Your move.' : '';
    $('resign').disabled = !!over || thinking;
    const old = board.querySelector('.ch-banner'); if (old) old.remove();
    if (over) {
      const d = el('div', `ch-banner ${over.result}`); d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-label', over.title); d.appendChild(el('h3', '', over.title)); d.appendChild(el('p', '', over.detail));
      const again = el('button', 'btn primary', 'Play again'), leave = el('button', 'btn', 'Leave the table'); again.type = leave.type = 'button'; again.onclick = () => { Store.set({ chess: { level: '', human: 0, uci: [], over: false, result: '' } }); seq++; game = null; over = null; sel = null; targets = []; markPick(); show('pick'); const c = $('levels').querySelector('.picked'); if (c) c.focus(); }; leave.onclick = close;
      const row = el('div', 'ch-banner-row'); row.append(again, leave); d.appendChild(row); board.appendChild(d); if (isOpen()) again.focus({ preventScroll: true });
    }
  }

  /* ---------- playing ---------- */
  function select(s) { sel = s; targets = s == null ? [] : game.pos.moves().filter(m => m.f === s); }
  function tryMove(from, to) { const ms = game.pos.moves().filter(m => m.f === from && m.t === to); if (!ms.length) return false; if (ms.length > 1) promote(ms); else commit(ms[0]); return true; }
  function promote(ms) {
    const wrap = el('div', 'ch-promo'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Choose what the pawn becomes');
    [5, 4, 3, 2].forEach(t => { const b = el('button', 'btn'); b.type = 'button'; b.setAttribute('aria-label', PNAME[t]); b.innerHTML = pieceSvg(t, human); b.onclick = () => { wrap.remove(); commit(ms.find(m => m.pr === t)); }; wrap.appendChild(b); });
    $('board').appendChild(wrap); wrap.firstChild.focus({ preventScroll: true });
  }
  function commit(m) { select(null); game.play(m); finish(false); save(); render(); computerMove(); }
  function computerMove() {
    if (!game || over || game.pos.side === human) return; thinking = true; render(); const my = ++seq, lv = level;
    setTimeout(() => {
      if (my !== seq) return; const t0 = Date.now(), r = config.engine(game, lv), wait = Math.max(0, config.delay(lv) - (Date.now() - t0));
      setTimeout(() => { if (my !== seq || !game) return; thinking = false; if (r && r.move) game.play(r.move); finish(false); save(); render(); }, wait);
    }, 30);
  }
  /** What a press on a square does: put a piece down on a square it can go to, pick one of yours up, or put it back. */
  function press(s) {
    if (!game || over || thinking || s == null) return; const p = game.pos;
    if (sel != null && targets.some(m => m.t === s)) { const from = sel; if (!tryMove(from, s)) { select(null); render(); } return; }
    if (p.b[s] && (p.b[s] >> 3) === human && p.side === human && s !== sel) { select(s); render(); } else { select(null); render(); }
  }
  const squareOf = e => { const q = e.target && e.target.closest ? e.target.closest('.ch-sq') : null; return q ? Number(q.dataset.sq) : null; };
  const squareAt = (x, y) => { const e = document.elementFromPoint(x, y), q = e && e.closest('.ch-sq'); return q ? Number(q.dataset.sq) : null; };
  function onDown(e) {
    if (!game || over || thinking || e.target.closest('.ch-promo') || e.target.closest('.ch-banner')) return; const s = squareOf(e); if (s == null) return; cursor = s; const p = game.pos, piece = p.b[s];
    if (sel != null && targets.some(m => m.t === s)) { press(s); return; }
    if (piece && (piece >> 3) === human && p.side === human) { const wasSel = s === sel; select(s); drag = { from: s, x: e.clientX, y: e.clientY, moving: false, ghost: null, wasSel }; render(); try { $('board').setPointerCapture(e.pointerId); } catch (x) { /* a stand-in event has no pointer to capture */ } } else { select(null); render(); }
  }
  function onMove(e) {
    if (!drag) return;
    if (!drag.moving && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { drag.moving = true; const g = el('div', 'ch-ghost'); g.innerHTML = pieceSvg(game.pos.b[drag.from] & 7, game.pos.b[drag.from] >> 3); document.body.appendChild(g); drag.ghost = g; render(); }
    if (drag.moving) { drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`; }
  }
  function onUp(e) {
    if (!drag) return; const d = drag; drag = null; if (d.ghost) d.ghost.remove();
    if (!d.moving && d.wasSel) { select(null); render(); return; }                  // pressed the piece that was already picked up, and did not drag it: put it back
    if (d.moving) { const s = squareAt(e.clientX, e.clientY); if (s != null && s !== d.from && targets.some(m => m.t === s)) { tryMove(d.from, s); return; } } render();
  }
  /** The keyboard: arrows move round the board (the way you SEE it, even when it is flipped), Enter or Space presses the square, Escape puts a piece back (a second Escape leaves the table). */
  function onKey(e) {
    const dx = { ArrowLeft: -1, ArrowRight: 1 }[e.key] || 0, dy = { ArrowUp: 1, ArrowDown: -1 }[e.key] || 0;
    if (dx || dy) { e.preventDefault(); const f = (cursor & 7) + (flipped ? -dx : dx), r = (cursor >> 4) + (flipped ? -dy : dy); cursor = Math.max(0, Math.min(7, r)) * 16 + Math.max(0, Math.min(7, f)); render(); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); press(cursor); }
    else if (e.key === 'Escape' && sel != null) { e.preventDefault(); e.stopPropagation(); select(null); render(); }
  }

  return { open, close, isOpen, startGame, config, press, get game() { return game; }, get human() { return human; }, get level() { return level; }, get over() { return over; }, get thinking() { return thinking; }, get view() { return view; }, get selected() { return sel; }, get cursor() { return cursor; } };
})();
