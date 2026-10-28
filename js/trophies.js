/* Trophies: one for each game, earned by getting 100 right (25 blueprints in the sandbox) and shown on the shelf in your dorm room.
   Each trophy carries the same symbol as its table. The counts start at zero for everyone: nothing played before trophies existed
   counts toward them. A trophy is earned once and kept.

   The logic here is pure (no DOM), so it is unit tested in Node (tests/trophies.test.js). award() and chip() are the only parts that
   touch the game: they read and write the save in Store and show the progress line and the "trophy earned" banner. */
const Trophies = (() => {
  const BUILD = 36; // bump together with the ?v= numbers in index.html
  const SHELF_CAPACITY = 9; // trophies on one shelf; the tenth starts a second shelf below it (two shelves hold 18)

  /** In the order they appear on the table list. symbol: the shape on the table (see SYMBOLS in world.js), or a few words for the two
      formula tables, or 'd20', 'map' and 'blocks' for the practice table, the wall map and the sandbox. how: a sentence for the trophy case saying how it is earned
      and where (the wing it says is checked against the real table positions in tests/trophies.test.js). */
  const GAMES = [
    { id: 'add', name: 'Addition', symbol: 'plus', color: 0xf7e98e, goal: 100, noun: 'correct answers', how: "Get 100 correct answers at the Addition table in the Arithmetic Academy." },
    { id: 'sub', name: 'Subtraction', symbol: 'minus', color: 0xf6b0c8, goal: 100, noun: 'correct answers', how: "Get 100 correct answers at the Subtraction table in the Arithmetic Academy." },
    { id: 'mul', name: 'Multiplication', symbol: 'times', color: 0xa8d8f0, goal: 100, noun: 'correct answers', how: "Get 100 correct answers at the Multiplication table in the Arithmetic Academy." },
    { id: 'div', name: 'Division', symbol: 'divide', color: 0xcdb8f0, goal: 100, noun: 'correct answers', how: "Get 100 correct answers at the Division table in the Arithmetic Academy." },
    { id: 'practice', name: 'Practice Table', symbol: 'd20', color: 0x52f08f, goal: 100, noun: 'solved', how: "Solve 100 rounds at the Practice Table in the casino's Factoring wing: drop prime gems in the grid until their product is the sum of the dice." },
    { id: 'radical', name: 'Radical Table', symbol: 'sqrt', color: 0x38e8ff, goal: 100, noun: 'solved', how: "Get 100 correct answers at the Radical Table in the casino's Factoring wing." },
    { id: 'trinomial', name: 'Trinomial Table', symbol: { words: ['STANDARD', 'FORM'] }, color: 0xff6a6a, goal: 100, noun: 'solved', how: "Get 100 correct answers at the Trinomial Table in the casino's Factoring wing." },
    { id: 'cubes', name: 'Cubes Table', symbol: 'cube', color: 0xc78bff, goal: 100, noun: 'solved', how: "Get 100 correct answers at the Cubes Table in the casino's Factoring wing." },
    { id: 'polymul', name: 'Multiply Table', symbol: { words: ['MULTIPLY', 'POLY'] }, color: 0xffd166, goal: 100, noun: 'solved', how: "Get 100 correct answers at the Multiply Table in the casino's Polynomials wing." },
    { id: 'polyadd', name: 'Add/Sub Table', symbol: { words: ['ADD/SUB', 'POLY'] }, color: 0x4fe0c0, goal: 100, noun: 'solved', how: "Get 100 correct answers at the Add/Sub Table in the casino's Polynomials wing." },
    { id: 'lines', name: 'Lines Table', symbol: 'linegraph', color: 0x4fe0c0, goal: 100, noun: 'lines graphed', how: "Graph 100 lines at the Lines Table in the casino's Graphing wing, in any form. A line that needed the answer shown doesn't count." },
    { id: 'parabola', name: 'Parabola Table', symbol: 'parabola', color: 0xd58bff, goal: 100, noun: 'solved', how: "Get 100 correct answers at the Parabola Table in the casino's Graphing wing." },
    { id: 'vertex', name: 'Vertex Table', symbol: { words: ['VERTEX', 'FORM'] }, color: 0xffb347, goal: 100, noun: 'solved', how: "Get 100 correct answers at the Vertex Table in the casino's Graphing wing." },
    { id: 'coaster', name: 'Polynomial Coaster', symbol: 'coaster', color: 0xff8a3d, goal: 100, noun: 'rides cleared', how: "Clear 100 rides at the Polynomial Coaster table in the casino's Graphing wing. A ride you give up on doesn't count." },
    { id: 'map', name: 'State Map', symbol: 'map', color: 0x6fcf7a, goal: 100, noun: 'states found', how: "Click 100 states correctly in the Find the State game, on the wall map in the Arithmetic Academy." },
    { id: 'blueprint', name: 'Sandbox', symbol: 'blocks', color: 0xe8b868, goal: 25, noun: 'blueprints solved', how: "Solve 25 blueprints in the Sandbox behind the school." },
    { id: 'mines', name: 'Minesweeper', symbol: 'flag', color: 0xff6b5a, goal: 25, noun: 'games won', how: "Win 25 games of Minesweeper in the minefield next to the Sandbox behind the school: dig every safe square and flag every bomb." },
  ];
  const IDS = GAMES.map(g => g.id);
  const byId = Object.fromEntries(GAMES.map(g => [g.id, g]));
  const valid = id => typeof id === 'string' && !!byId[id];

  /** How many you have got right so far for a game. */
  const count = (solved, id) => Math.max(0, Math.floor(Number(solved && solved[id])) || 0);

  /** Count one more correct answer. Pure: returns new copies, and which trophy (if any) was just earned. */
  function apply(solved, trophies, id, n = 1) {
    if (!valid(id)) return { solved: { ...solved }, trophies: [...trophies], earned: null };
    const next = { ...solved, [id]: count(solved, id) + n };
    const have = trophies.filter(valid);
    let earned = null, list = have;
    if (next[id] >= byId[id].goal && !have.includes(id)) { earned = byId[id]; list = [...have, id]; }
    return { solved: next, trophies: list, earned };
  }

  /** Where the trophies sit: the first shelf holds SHELF_CAPACITY, the rest go on a second shelf below it (which only exists once
      it is needed). Trophies stay in the order they were earned. */
  function shelves(trophies) {
    const list = [...new Set(trophies.filter(valid))];
    const rows = [list.slice(0, SHELF_CAPACITY)];
    if (list.length > SHELF_CAPACITY) rows.push(list.slice(SHELF_CAPACITY, 2 * SHELF_CAPACITY));
    return rows;
  }

  /** Every trophy there is, in table order, for the trophy case: whether you have it, how far along you are, and how it is earned. A trophy you
      have always shows as full (the count of a trophy you have is the goal), and anything else is clamped to the goal. */
  function entries(solved, trophies) {
    const have = new Set((trophies || []).filter(valid));
    return GAMES.map(g => {
      const earned = have.has(g.id), n = earned ? g.goal : Math.min(count(solved, g.id), g.goal);
      return { id: g.id, name: g.name, symbol: g.symbol, color: g.color, goal: g.goal, noun: g.noun, how: g.how, earned, count: n, percent: Math.floor(100 * n / g.goal) };
    });
  }
  /** How many different trophies you have. */
  const earnedCount = trophies => new Set((trophies || []).filter(valid)).size;

  /** "Trophy: 37 of 100", or a note that you have it. */
  function progressText(solved, trophies, id) {
    const g = byId[id];
    if (!g) return '';
    return trophies.includes(id) ? 'Trophy earned!' : `Trophy: ${Math.min(count(solved, id), g.goal)} of ${g.goal}`;
  }

  /* ---------- the parts that touch the game ---------- */
  /** One more right answer in a game. Saves it, and if that earns the trophy, tells the player where to find it. */
  function award(id) {
    if (typeof Store === 'undefined') return null;
    const s = Store.get();
    const r = apply(s.solved || {}, s.trophies || [], id);
    Store.set({ solved: r.solved, trophies: r.trophies });
    if (r.earned && typeof UI !== 'undefined' && UI.trophy) UI.trophy(r.earned);
    return r.earned;
  }

  /** A small "Trophy: 37 of 100" label for a game's screen; it keeps itself up to date. One listener serves every chip, and chips that
      have left the page are dropped. */
  const chips = new Set();
  let listening = false;
  function refresh() {
    const s = Store.get();
    chips.forEach(c => {
      if (c.el.isConnected) c.seen = true;
      else if (c.seen) { chips.delete(c); return; }      // it was on the page and has gone; one that has not been placed yet stays
      c.el.textContent = progressText(s.solved || {}, s.trophies || [], c.id);
      c.el.classList.toggle('got', (s.trophies || []).includes(c.id));
    });
  }
  function chip(id) {
    const el = document.createElement('span');
    el.className = 'trophy-chip';
    chips.add({ el, id, seen: false });
    if (!listening) { listening = true; Store.onChange(refresh); }
    const s = Store.get();
    el.textContent = progressText(s.solved || {}, s.trophies || [], id);
    el.classList.toggle('got', (s.trophies || []).includes(id));
    return el;
  }

  return { BUILD, SHELF_CAPACITY, GAMES, IDS, byId, valid, count, apply, shelves, entries, earnedCount, progressText, award, chip };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Trophies;
