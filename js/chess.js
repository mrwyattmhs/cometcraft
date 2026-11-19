/* CHESS, for the chess table by the little library: the rules and the computer opponent. No DOM and no dependencies, so it is all unit tested in Node (tests/chess.test.js, which also checks it
   against the standard "perft" counts and, if the chess.js test library is installed, against that library over hundreds of random games).
     Position       the board (0x88), legal moves, make/unmake, FEN, SAN, check/mate/stalemate/insufficient material, an incremental hash
     Game           a position plus its history: threefold repetition, the fifty-move rule, the result; and the game as a list of moves ("e2e4", "e7e8q") to save and replay
     search()       negamax with alpha-beta, iterative deepening, a transposition table, quiescence, move ordering; optional "noise" so a weak level plays weakly on purpose
     LEVELS         easy / medium / hard: how deep, how long, how much noise, and (Medium) how often it has a lapse and plays like Easy for a move
   The engine thinks on the main thread for at most LEVELS[...].ms, so a window should let the page paint "thinking" first (a setTimeout of a few ms) before calling it. */
const Chess = (() => {
  const BUILD = 51; // bump together with the ?v= numbers in index.html
  const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;                       // piece types; a black piece is the type + 8
  const FILES = 'abcdefgh', LETTER = ' PNBRQK';
  const sqName = s => FILES[s & 7] + ((s >> 4) + 1), sqOf = n => (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 16;
  const KNIGHT = [-33, -31, -18, -14, 14, 18, 31, 33], KING = [-17, -16, -15, -1, 1, 15, 16, 17], DIAG = [-17, -15, 15, 17], ORTHO = [-16, -1, 1, 16];
  const VALUE = [0, 100, 320, 330, 500, 900, 0];

  /* ---------- a fixed random table for the hash ---------- */
  let seed = 0x9e3779b9; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
  const Z1 = Array.from({ length: 16 }, () => Array.from({ length: 128 }, rnd)), Z2 = Array.from({ length: 16 }, () => Array.from({ length: 128 }, rnd));
  const ZS1 = rnd(), ZS2 = rnd(), ZC1 = Array.from({ length: 16 }, rnd), ZC2 = Array.from({ length: 16 }, rnd), ZE1 = Array.from({ length: 8 }, rnd), ZE2 = Array.from({ length: 8 }, rnd);

  class Position {
    constructor(fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
      this.b = new Int8Array(128); this.side = 0; this.castle = 0; this.ep = -1; this.half = 0; this.full = 1; this.k = [4, 116]; this.stack = []; this.h1 = 0; this.h2 = 0; this.load(fen);
    }
    load(fen) {
      const [place, side, cast, ep, half, full] = fen.trim().split(/\s+/); this.b.fill(0); let r = 7, f = 0;
      for (const ch of place) { if (ch === '/') { r--; f = 0; } else if (/\d/.test(ch)) f += Number(ch); else { const t = LETTER.indexOf(ch.toUpperCase()), p = t + (ch === ch.toLowerCase() ? 8 : 0), s = r * 16 + f++; this.b[s] = p; if (t === K) this.k[p >> 3] = s; } }
      this.side = side === 'b' ? 1 : 0; this.castle = (cast.includes('K') ? 1 : 0) | (cast.includes('Q') ? 2 : 0) | (cast.includes('k') ? 4 : 0) | (cast.includes('q') ? 8 : 0);
      this.ep = ep && ep !== '-' ? sqOf(ep) : -1; this.half = Number(half) || 0; this.full = Number(full) || 1; this.stack = []; this.rehash();
    }
    fen() {
      let out = ''; for (let r = 7; r >= 0; r--) { let e = 0; for (let f = 0; f < 8; f++) { const p = this.b[r * 16 + f]; if (!p) e++; else { if (e) out += e; e = 0; const c = LETTER[p & 7]; out += p & 8 ? c.toLowerCase() : c; } } if (e) out += e; if (r) out += '/'; }
      const c = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
      return `${out} ${this.side ? 'b' : 'w'} ${c || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} ${this.full}`;
    }
    rehash() {
      let a = 0, b = 0; for (let s = 0; s < 128; s++) { if (s & 0x88) continue; const p = this.b[s]; if (p) { a ^= Z1[p][s]; b ^= Z2[p][s]; } }
      if (this.side) { a ^= ZS1; b ^= ZS2; } a ^= ZC1[this.castle]; b ^= ZC2[this.castle]; if (this.ep >= 0) { a ^= ZE1[this.ep & 7]; b ^= ZE2[this.ep & 7]; } this.h1 = a; this.h2 = b;
    }
    /** Is square s attacked by side `by`? */
    attacked(s, by) {
      const b = this.b, c = by << 3;
      const pd = by ? [17, 15] : [-17, -15]; for (const d of pd) { const t = s + d; if (!(t & 0x88) && b[t] === (P | c)) return true; }
      for (const d of KNIGHT) { const t = s + d; if (!(t & 0x88) && b[t] === (N | c)) return true; }
      for (const d of KING) { const t = s + d; if (!(t & 0x88) && b[t] === (K | c)) return true; }
      for (const d of DIAG) for (let t = s + d; !(t & 0x88); t += d) { const p = b[t]; if (p) { if (p === (B | c) || p === (Q | c)) return true; break; } }
      for (const d of ORTHO) for (let t = s + d; !(t & 0x88); t += d) { const p = b[t]; if (p) { if (p === (R | c) || p === (Q | c)) return true; break; } }
      return false;
    }
    inCheck(side = this.side) { return this.attacked(this.k[side], side ^ 1); }
    /** Pseudo-legal moves; captures only if caps. A move: { f, t, p (piece), c (captured), pr (promotion type), fl (1 double push, 2 en passant, 4 castle kingside, 8 castle queenside) }. */
    pseudo(caps = false) {
      const out = [], b = this.b, side = this.side, me = side << 3, add = (f, t, p, c, pr = 0, fl = 0) => out.push({ f, t, p, c, pr, fl });
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; } const p = b[s]; if (!p || (p >> 3) !== side) continue; const type = p & 7;
        if (type === P) {
          const dir = side ? -16 : 16, last = side ? 0 : 7, start = side ? 6 : 1, t1 = s + dir;
          if (!(t1 & 0x88) && !b[t1] && !caps) { if ((t1 >> 4) === last) for (const pr of [Q, R, B, N]) add(s, t1, p, 0, pr); else { add(s, t1, p, 0); const t2 = t1 + dir; if ((s >> 4) === start && !b[t2]) add(s, t2, p, 0, 0, 1); } }
          else if (!(t1 & 0x88) && !b[t1] && caps && (t1 >> 4) === last) for (const pr of [Q]) add(s, t1, p, 0, pr);
          for (const dd of [dir - 1, dir + 1]) { const t = s + dd; if (t & 0x88) continue; const c = b[t]; if (c && (c >> 3) !== side) { if ((t >> 4) === last) for (const pr of [Q, R, B, N]) add(s, t, p, c, pr); else add(s, t, p, c); } else if (t === this.ep) add(s, t, p, b[t - dir], 0, 2); }
        } else if (type === N || type === K) {
          for (const d of type === N ? KNIGHT : KING) { const t = s + d; if (t & 0x88) continue; const c = b[t]; if (!c) { if (!caps) add(s, t, p, 0); } else if ((c >> 3) !== side) add(s, t, p, c); }
          if (type === K && !caps) {
            const home = side ? 116 : 4, rights = side ? this.castle >> 2 : this.castle;
            if (s === home && !this.attacked(s, side ^ 1)) {
              if ((rights & 1) && !b[s + 1] && !b[s + 2] && b[s + 3] === (R | me) && !this.attacked(s + 1, side ^ 1) && !this.attacked(s + 2, side ^ 1)) add(s, s + 2, p, 0, 0, 4);
              if ((rights & 2) && !b[s - 1] && !b[s - 2] && !b[s - 3] && b[s - 4] === (R | me) && !this.attacked(s - 1, side ^ 1) && !this.attacked(s - 2, side ^ 1)) add(s, s - 2, p, 0, 0, 8);
            }
          }
        } else {
          for (const d of type === B ? DIAG : type === R ? ORTHO : DIAG.concat(ORTHO)) for (let t = s + d; !(t & 0x88); t += d) { const c = b[t]; if (!c) { if (!caps) add(s, t, p, 0); } else { if ((c >> 3) !== side) add(s, t, p, c); break; } }
        }
      }
      return out;
    }
    /** Legal moves (those that do not leave your own king in check). */
    moves(caps = false) { const out = []; for (const m of this.pseudo(caps)) { this.make(m); if (!this.inCheck(this.side ^ 1)) out.push(m); this.unmake(); } return out; }
    make(m) {
      const b = this.b, side = this.side, us = side << 3, rec = { m, castle: this.castle, ep: this.ep, half: this.half, h1: this.h1, h2: this.h2 }; this.stack.push(rec);
      let a = this.h1, c2 = this.h2; const xor = (p, s) => { a ^= Z1[p][s]; c2 ^= Z2[p][s]; };
      a ^= ZC1[this.castle]; c2 ^= ZC2[this.castle]; if (this.ep >= 0) { a ^= ZE1[this.ep & 7]; c2 ^= ZE2[this.ep & 7]; }
      xor(m.p, m.f); b[m.f] = 0;
      if (m.fl & 2) { const cs = m.t - (side ? -16 : 16); xor(b[cs], cs); b[cs] = 0; } else if (m.c) xor(m.c, m.t);
      const placed = m.pr ? (m.pr | us) : m.p; b[m.t] = placed; xor(placed, m.t);
      if (m.fl & 4) { xor(R | us, m.t + 1); b[m.t + 1] = 0; b[m.t - 1] = R | us; xor(R | us, m.t - 1); }
      if (m.fl & 8) { xor(R | us, m.t - 2); b[m.t - 2] = 0; b[m.t + 1] = R | us; xor(R | us, m.t + 1); }
      if ((m.p & 7) === K) this.k[side] = m.t;
      let cast = this.castle; const lose = s => { if (s === 4) cast &= ~3; else if (s === 116) cast &= ~12; else if (s === 0) cast &= ~2; else if (s === 7) cast &= ~1; else if (s === 112) cast &= ~8; else if (s === 119) cast &= ~4; };
      lose(m.f); lose(m.t); this.castle = cast; this.ep = (m.fl & 1) ? (m.f + m.t) >> 1 : -1;
      this.half = ((m.p & 7) === P || m.c) ? 0 : this.half + 1; if (side) this.full++; this.side ^= 1; a ^= ZS1; c2 ^= ZS2;
      a ^= ZC1[this.castle]; c2 ^= ZC2[this.castle]; if (this.ep >= 0) { a ^= ZE1[this.ep & 7]; c2 ^= ZE2[this.ep & 7]; } this.h1 = a; this.h2 = c2;
    }
    unmake() {
      const rec = this.stack.pop(), m = rec.m, b = this.b; this.side ^= 1; const side = this.side, us = side << 3; if (side) this.full--;
      b[m.f] = m.p; b[m.t] = 0;
      if (m.fl & 2) b[m.t - (side ? -16 : 16)] = m.c; else if (m.c) b[m.t] = m.c;
      if (m.fl & 4) { b[m.t + 1] = R | us; b[m.t - 1] = 0; } if (m.fl & 8) { b[m.t - 2] = R | us; b[m.t + 1] = 0; }
      if ((m.p & 7) === K) this.k[side] = m.f; this.castle = rec.castle; this.ep = rec.ep; this.half = rec.half; this.h1 = rec.h1; this.h2 = rec.h2;
    }
    makeNull() { this.stack.push({ m: null, castle: this.castle, ep: this.ep, half: this.half, h1: this.h1, h2: this.h2 }); if (this.ep >= 0) { this.h1 ^= ZE1[this.ep & 7]; this.h2 ^= ZE2[this.ep & 7]; } this.ep = -1; this.side ^= 1; this.h1 ^= ZS1; this.h2 ^= ZS2; }
    unmakeNull() { const r = this.stack.pop(); this.side ^= 1; this.castle = r.castle; this.ep = r.ep; this.half = r.half; this.h1 = r.h1; this.h2 = r.h2; }
    perft(d) { if (!d) return 1; let n = 0; for (const m of this.moves()) { this.make(m); n += this.perft(d - 1); this.unmake(); } return n; }
    /** Standard algebraic notation of a legal move, in this position (before it is made). */
    san(m) {
      const type = m.p & 7; let s;
      if (m.fl & 4) s = 'O-O'; else if (m.fl & 8) s = 'O-O-O';
      else {
        s = type === P ? (m.c ? FILES[m.f & 7] : '') : LETTER[type];
        if (type !== P) { const others = this.moves().filter(o => o.f !== m.f && o.t === m.t && o.p === m.p); if (others.length) { const sameFile = others.some(o => (o.f & 7) === (m.f & 7)), sameRank = others.some(o => (o.f >> 4) === (m.f >> 4)); s += !sameFile ? FILES[m.f & 7] : !sameRank ? String((m.f >> 4) + 1) : sqName(m.f); } }
        if (m.c) s += 'x'; s += sqName(m.t); if (m.pr) s += `=${LETTER[m.pr]}`;
      }
      this.make(m); const check = this.inCheck(), any = this.moves().length > 0; this.unmake(); return s + (check ? (any ? '+' : '#') : '');
    }
    /** The legal move for a from/to (and a promotion letter), or null. */
    find(from, to, promo = 'q') { return this.moves().find(m => m.f === from && m.t === to && (!m.pr || LETTER[m.pr].toLowerCase() === promo)) || null; }
    /** The move as text for saving: "e2e4", or "e7e8q" for a promotion. */
    uci(m) { return sqName(m.f) + sqName(m.t) + (m.pr ? LETTER[m.pr].toLowerCase() : ''); }
    /** The legal move a saved text stands for in this position, or null (anything that is not exactly a legal move: a typo, a damaged save). */
    fromUci(text) {
      if (typeof text !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(text)) return null;
      const from = sqOf(text.slice(0, 2)), to = sqOf(text.slice(2, 4)), promo = text[4] || '';
      return this.moves().find(m => m.f === from && m.t === to && (m.pr ? LETTER[m.pr].toLowerCase() === promo : !promo)) || null;
    }
    insufficient() {
      const pieces = []; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = this.b[s]; if (p && (p & 7) !== K) pieces.push([p & 7, p >> 3, ((s >> 4) + (s & 7)) & 1]); }
      if (!pieces.length) return true; if (pieces.some(x => x[0] === P || x[0] === R || x[0] === Q)) return false; if (pieces.length === 1) return true;
      return pieces.every(x => x[0] === B) && pieces.every(x => x[2] === pieces[0][2]);
    }
  }

  /* ---------- the game: a position and everything that has been played ---------- */
  class Game {
    constructor(fen) { this.pos = new Position(fen); this.keys = [this.pos.h1 + ':' + this.pos.h2]; this.sans = []; this.played = []; }
    /** The game so far, as a list of moves to save: ["e2e4", "e7e5", ...]. */
    uciMoves() { return this.played.map(m => this.pos.uci(m)); }
    play(m) { this.sans.push(this.pos.san(m)); this.played.push(m); this.pos.make(m); this.keys.push(this.pos.h1 + ':' + this.pos.h2); }
    undo() { if (!this.played.length) return null; this.pos.unmake(); this.keys.pop(); this.sans.pop(); return this.played.pop(); }
    repetitions() { const k = this.keys[this.keys.length - 1]; return this.keys.filter(x => x === k).length; }
    /** { over, result: '1-0' | '0-1' | '1/2-1/2' | null, reason } */
    status() {
      const p = this.pos, any = p.moves().length > 0, check = p.inCheck();
      if (!any) return check ? { over: true, result: p.side ? '1-0' : '0-1', reason: 'checkmate' } : { over: true, result: '1/2-1/2', reason: 'stalemate' };
      if (p.insufficient()) return { over: true, result: '1/2-1/2', reason: 'insufficient material' };
      if (p.half >= 100) return { over: true, result: '1/2-1/2', reason: 'the fifty-move rule' };
      if (this.repetitions() >= 3) return { over: true, result: '1/2-1/2', reason: 'threefold repetition' };
      return { over: false, result: null, reason: check ? 'check' : '' };
    }
  }

  /* ---------- evaluation: material and where the pieces stand ---------- */
  const T = {
    [P]: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    [N]: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    [B]: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    [R]: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    [Q]: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    [K]: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  };
  const KING_END = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
  /** The score for the side to move, in hundredths of a pawn. */
  function evaluate(pos) {
    const b = pos.b; let score = 0, phase = 0, bishops = [0, 0];
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; } const p = b[s]; if (!p) continue; const type = p & 7, color = p >> 3, sign = color ? -1 : 1, idx = color ? (s >> 4) * 8 + (s & 7) : (7 - (s >> 4)) * 8 + (s & 7);
      if (type === N || type === B) phase += 1; else if (type === R) phase += 2; else if (type === Q) phase += 4; if (type === B) bishops[color]++;
      score += sign * (VALUE[type] + (type === K ? 0 : T[type][idx]));
    }
    for (const color of [0, 1]) {
      const k = pos.k[color], idx = color ? (k >> 4) * 8 + (k & 7) : (7 - (k >> 4)) * 8 + (k & 7), ph = Math.min(24, phase), kv = (T[K][idx] * ph + KING_END[idx] * (24 - ph)) / 24; score += (color ? -1 : 1) * kv;
    }
    score += 30 * (bishops[0] >= 2) - 30 * (bishops[1] >= 2);
    return pos.side ? -score : score;
  }

  /* ---------- search ---------- */
  const MATE = 30000, INF = 32000;
  /** Find a move. opts: { depth, ms, noise (centipawns of random wobble added to each root move's score), rng, game (for repetition), qsearch (default true) }.
      Returns { move, score, depth, nodes, ms }. */
  function search(pos, opts = {}) {
    const maxDepth = opts.depth || 4, limit = opts.ms ? Date.now() + opts.ms : Infinity, rng = opts.rng || Math.random, noise = opts.noise || 0, useQ = opts.qsearch !== false;
    const tt = new Map(), killers = Array.from({ length: 64 }, () => [null, null]), history = new Int32Array(16 * 128 * 128 / 16), path = []; let nodes = 0, stop = false;
    const past = opts.game ? new Set(opts.game.keys.slice(0, -1)) : new Set();
    const key = () => pos.h1 + ':' + pos.h2;
    const orderScore = (m, ttMove, ply) => {
      if (ttMove && m.f === ttMove.f && m.t === ttMove.t && m.pr === ttMove.pr) return 1e6;
      if (m.c) return 1e5 + VALUE[m.c & 7] * 10 - VALUE[m.p & 7] / 10; if (m.pr) return 9e4;
      const k = killers[ply]; if (k && ((k[0] && k[0].f === m.f && k[0].t === m.t) || (k[1] && k[1].f === m.f && k[1].t === m.t))) return 8e4;
      return history[(m.p & 7) * 128 + m.t] || 0;
    };
    function quiesce(alpha, beta, ply) {
      nodes++; if ((nodes & 2047) === 0 && Date.now() > limit) stop = true; if (stop) return 0;
      const stand = evaluate(pos); if (stand >= beta) return beta; if (stand > alpha) alpha = stand; if (ply > 40) return alpha;
      const ms = pos.pseudo(true); ms.sort((a, c) => (VALUE[c.c & 7] * 10 - VALUE[c.p & 7]) - (VALUE[a.c & 7] * 10 - VALUE[a.p & 7]));
      for (const m of ms) { if (stand + 200 + (m.c ? VALUE[m.c & 7] : 0) < alpha && !m.pr) continue; pos.make(m); if (pos.inCheck(pos.side ^ 1)) { pos.unmake(); continue; } const sc = -quiesce(-beta, -alpha, ply + 1); pos.unmake(); if (stop) return 0; if (sc >= beta) return beta; if (sc > alpha) alpha = sc; }
      return alpha;
    }
    function negamax(depth, alpha, beta, ply, canNull) {
      nodes++; if ((nodes & 2047) === 0 && Date.now() > limit) stop = true; if (stop) return 0;
      const check = pos.inCheck(); if (check) depth++;
      if (ply > 0) { if (pos.half >= 100) return 0; const k = key(); if (past.has(k) || path.includes(k)) return 0; }
      if (depth <= 0) return useQ ? quiesce(alpha, beta, ply) : evaluate(pos);
      const k = key(), hit = tt.get(k); let ttMove = null; const a0 = alpha;
      if (hit) { ttMove = hit.move; if (hit.depth >= depth && ply > 0) { if (hit.flag === 0) return hit.score; if (hit.flag === 1 && hit.score >= beta) return hit.score; if (hit.flag === 2 && hit.score <= alpha) return hit.score; } }
      if (canNull && !check && depth >= 3 && ply > 0) { let heavy = 0; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = pos.b[s]; if (p && (p >> 3) === pos.side && (p & 7) > P && (p & 7) !== K) heavy++; } if (heavy) { path.push(k); pos.makeNull(); const sc = -negamax(depth - 3, -beta, -beta + 1, ply + 1, false); pos.unmakeNull(); path.pop(); if (stop) return 0; if (sc >= beta) return beta; } }
      const ms = pos.pseudo(); for (const m of ms) m.o = orderScore(m, ttMove, ply); ms.sort((x, y) => y.o - x.o);
      let best = -INF, bestMove = null, legal = 0; path.push(k);
      for (const m of ms) {
        pos.make(m); if (pos.inCheck(pos.side ^ 1)) { pos.unmake(); continue; } legal++;
        let sc; if (legal > 4 && depth >= 3 && !m.c && !m.pr && !check) { sc = -negamax(depth - 2, -alpha - 1, -alpha, ply + 1, true); if (sc > alpha) sc = -negamax(depth - 1, -beta, -alpha, ply + 1, true); } else sc = -negamax(depth - 1, -beta, -alpha, ply + 1, true);
        pos.unmake(); if (stop) { path.pop(); return 0; }
        if (sc > best) { best = sc; bestMove = m; } if (sc > alpha) alpha = sc;
        if (alpha >= beta) { if (!m.c) { const kk = killers[ply]; if (!kk[0] || kk[0].f !== m.f || kk[0].t !== m.t) { kk[1] = kk[0]; kk[0] = m; } history[(m.p & 7) * 128 + m.t] += depth * depth; } break; }
      }
      path.pop(); if (!legal) return check ? -MATE + ply : 0;
      tt.set(k, { depth, score: best, move: bestMove, flag: best <= a0 ? 2 : best >= beta ? 1 : 0 }); return best;
    }
    const rootMoves = pos.moves(); if (!rootMoves.length) return { move: null, score: check0(pos), depth: 0, nodes: 0, ms: 0 };
    function check0(p) { return p.inCheck() ? -MATE : 0; }
    if (rootMoves.length === 1) return { move: rootMoves[0], score: 0, depth: 0, nodes: 0, ms: 0 };
    const t0 = Date.now(); let best = { move: rootMoves[0], score: 0, depth: 0 };
    if (noise) {                                                                                     // a deliberately weak level: score each move a little, wobble the scores, take the best-looking
      const d = Math.max(0, maxDepth - 1); const scored = [];
      for (const m of rootMoves) { pos.make(m); path.length = 0; const sc = d === 0 ? -(useQ ? quiesce(-INF, INF, 1) : evaluate(pos)) : -negamax(d, -INF, INF, 1, true); pos.unmake(); scored.push({ m, sc: sc + (rng() * 2 - 1) * noise }); }
      scored.sort((x, y) => y.sc - x.sc); return { move: scored[0].m, score: scored[0].sc, depth: maxDepth, nodes, ms: Date.now() - t0 };
    }
    for (let depth = 1; depth <= maxDepth; depth++) {
      let alpha = -INF; const beta = INF, ordered = rootMoves.slice(), ttm = best.move; for (const m of ordered) m.o = (ttm && m.f === ttm.f && m.t === ttm.t && m.pr === ttm.pr) ? 1e7 : orderScore(m, null, 0); ordered.sort((x, y) => y.o - x.o);
      let iterBest = null, iterScore = -INF;
      for (const m of ordered) { pos.make(m); path.length = 0; const sc = -negamax(depth - 1, -beta, -alpha, 1, true); pos.unmake(); if (stop) break; if (sc > iterScore) { iterScore = sc; iterBest = m; } if (sc > alpha) alpha = sc; }
      if (stop) break; if (iterBest) best = { move: iterBest, score: iterScore, depth }; if (Math.abs(iterScore) > MATE - 100) break;
    }
    return { ...best, nodes, ms: Date.now() - t0 };
  }

  /** The three levels. depth/ms limit the search; noise (hundredths of a pawn) makes a level play badly on purpose. */
  const LEVELS = {
    easy: { name: 'Easy', depth: 1, ms: 200, noise: 300, qsearch: false },
    medium: { name: 'Medium', depth: 2, ms: 400, noise: 90, qsearch: true, lapse: 1 / 7 },      /* one move in seven it plays like Easy: a lapse of attention */
    hard: { name: 'Hard', depth: 6, ms: 900, noise: 0, qsearch: true },
  };
  function chooseMove(game, level = 'hard', rng) { const r = rng || Math.random, base = LEVELS[level] || LEVELS.hard, L = base.lapse && r() < base.lapse ? LEVELS.easy : base; return search(game.pos, { depth: L.depth, ms: L.ms, noise: L.noise, qsearch: L.qsearch, rng: r, game }); }

  /** Replay a saved list of moves from the start. Returns a Game, or null if any of it is not legal (a damaged save is thrown away, never half-believed). */
  function replay(list, fen) {
    if (!Array.isArray(list)) return null; const game = new Game(fen);
    for (const text of list) { const m = game.pos.fromUci(text); if (!m) return null; game.play(m); }
    return game;
  }

  return { BUILD, Position, Game, replay, search, evaluate, chooseMove, LEVELS, sqName, sqOf, P, N, B, R, Q, K, MATE };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Chess;
