/* Trophies: one for each game, earned by getting 100 right (25 blueprints in the sandbox) and shown on the shelf in your dorm room.
   Each trophy carries the same symbol as its table. The counts start at zero for everyone: nothing played before trophies existed
   counts toward them. A trophy is earned once and kept.

   The logic here is pure (no DOM), so it is unit tested in Node (tests/trophies.test.js). award() and chip() are the only parts that
   touch the game: they read and write the save in Store and show the progress line and the "trophy earned" banner. */
const Trophies = (() => {
  const BUILD = 26; // bump together with the ?v= numbers in index.html
  const SHELF_CAPACITY = 8; // trophies on one shelf; the ninth starts a second shelf below it

  /** In the order they appear on the table list. symbol: the shape on the table (see SYMBOLS in world.js), or a few words for the two
      formula tables, or 'd20', 'map' and 'blocks' for the practice table, the wall map and the sandbox. */
  const GAMES = [
    { id: 'add', name: 'Addition', symbol: 'plus', color: 0xf7e98e, goal: 100, noun: 'correct answers' },
    { id: 'sub', name: 'Subtraction', symbol: 'minus', color: 0xf6b0c8, goal: 100, noun: 'correct answers' },
    { id: 'mul', name: 'Multiplication', symbol: 'times', color: 0xa8d8f0, goal: 100, noun: 'correct answers' },
    { id: 'div', name: 'Division', symbol: 'divide', color: 0xcdb8f0, goal: 100, noun: 'correct answers' },
    { id: 'practice', name: 'Practice Table', symbol: 'd20', color: 0x52f08f, goal: 100, noun: 'solved' },
    { id: 'radical', name: 'Radical Table', symbol: 'sqrt', color: 0x38e8ff, goal: 100, noun: 'solved' },
    { id: 'trinomial', name: 'Trinomial Table', symbol: { words: ['STANDARD', 'FORM'] }, color: 0xff6a6a, goal: 100, noun: 'solved' },
    { id: 'lines', name: 'Lines Table', symbol: 'linegraph', color: 0x4fe0c0, goal: 100, noun: 'lines graphed' },
    { id: 'parabola', name: 'Parabola Table', symbol: 'parabola', color: 0xd58bff, goal: 100, noun: 'solved' },
    { id: 'vertex', name: 'Vertex Table', symbol: { words: ['VERTEX', 'FORM'] }, color: 0xffb347, goal: 100, noun: 'solved' },
    { id: 'map', name: 'State Map', symbol: 'map', color: 0x6fcf7a, goal: 100, noun: 'states found' },
    { id: 'blueprint', name: 'Sandbox', symbol: 'blocks', color: 0xe8b868, goal: 25, noun: 'blueprints solved' },
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

  return { BUILD, SHELF_CAPACITY, GAMES, IDS, byId, valid, count, apply, shelves, progressText, award, chip };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Trophies;
