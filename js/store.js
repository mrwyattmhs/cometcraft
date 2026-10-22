/* One shared save state that every zone, mini-game, and shop reads and writes.
   It saves in this browser only (localStorage), so nothing follows a student between devices. */
const Store = (() => {
  const C = typeof Catalog !== 'undefined' ? Catalog : require('./catalog.js');
  const KEY = 'primetime.save.v1';
  const MIN_CHIPS = 10; // addChips never takes the wallet below this (nothing is wagered any more, but the floor is kept)
  const FREE_IDS = Object.values(C.FREE);

  const fresh = () => ({
    chips: 100,
    practiceWins: 0, wagerWins: 0, wagerLosses: 0,
    trinomialWins: 0, trinomialLosses: 0, radicalWins: 0, radicalLosses: 0,
    parabolaWins: 0, parabolaLosses: 0, vertexWins: 0, vertexLosses: 0, linesWins: 0, linesLosses: 0,
    arithBest: { add: 0, sub: 0, mul: 0, div: 0 },   // most problems solved in one 60-second round, per table
    blueprintsSolved: 0,
    mapFound: [],            // two-letter codes of the states you have found on the map (first try)
    mapBestStreak: 0,        // most states in a row on the first try
    solved: {},              // how many you have got right in each game, toward its trophy (see trophies.js). Starts at zero for everyone.
    trophies: [],            // the trophies earned, in the order earned
    reading: {},             // your place in each Little Library book: { bookId: pageNumber }, saved every time you turn a page
    readerFont: 2,           // the reader's text size, 0 (smallest) to 4
    remyPets: 0,             // how many times Remy has been petted, over the whole life of the save. The player is never shown this.
    dorm: [],                // the furniture in your dorm room: { type, x, z, rot } (Dorm.sanitize makes sure it fits)
    owned: [...FREE_IDS],
    equipped: { ...C.FREE },
  });
  let state = fresh();
  const listeners = [];

  /** Older saves lack the shop fields, and a save can hold ids we no longer sell. Repair, never lose chips.
      Saves from when pencils and calculators were separate slots keep everything they bought: the ids are
      unchanged, and whichever of the two was in use becomes the one accessory (the calculator, if both,
      since it replaces the pencil). */
  function normalize() {
    state.chips = Math.max(Number.isFinite(state.chips) ? state.chips : 100, MIN_CHIPS);
    const owned = Array.isArray(state.owned) ? state.owned.filter(id => C.find(id)) : [];
    state.owned = [...new Set([...FREE_IDS, ...owned])];

    const best = state.arithBest && typeof state.arithBest === 'object' ? state.arithBest : {};
    const whole = v => Math.max(0, Math.floor(Number(v)) || 0);
    state.arithBest = { add: whole(best.add), sub: whole(best.sub), mul: whole(best.mul), div: whole(best.div) };

    state.blueprintsSolved = whole(state.blueprintsSolved);
    state.mapBestStreak = whole(state.mapBestStreak);
    state.remyPets = whole(state.remyPets);
    state.reading = state.reading && typeof state.reading === 'object' && !Array.isArray(state.reading)
      ? Object.fromEntries(Object.entries(state.reading).filter(([k, v]) => /^[a-z]{2,12}$/.test(k) && whole(v) >= 1).map(([k, v]) => [k, Math.min(9999, whole(v))])) : {};
    state.readerFont = Math.min(4, Math.max(0, Number.isInteger(state.readerFont) ? state.readerFont : 2));
    state.solved = state.solved && typeof state.solved === 'object' && !Array.isArray(state.solved)
      ? Object.fromEntries(Object.entries(state.solved).filter(([k]) => /^[a-z]{2,12}$/.test(k)).map(([k, v]) => [k, whole(v)])) : {};
    state.trophies = Array.isArray(state.trophies) ? [...new Set(state.trophies.filter(t => typeof t === 'string' && /^[a-z]{2,12}$/.test(t)))].slice(0, 30) : [];
    state.dorm = Array.isArray(state.dorm) ? state.dorm.filter(o => o && typeof o.type === 'string' && Number.isInteger(o.x) && Number.isInteger(o.z) && Number.isInteger(o.rot)).slice(0, 4).map(o => ({ type: o.type, x: o.x, z: o.z, rot: o.rot })) : [];
    state.mapFound = Array.isArray(state.mapFound) ? [...new Set(state.mapFound.filter(c => typeof c === 'string' && /^[A-Z]{2}$/.test(c)))].slice(0, 51) : [];

    const raw = state.equipped && typeof state.equipped === 'object' ? { ...state.equipped } : {};
    if (!raw.accessory) {
      const calc = raw.calculator, pencil = raw.pencil;
      raw.accessory = calc && calc !== 'calculator-none' ? calc : pencil;
    }
    const eq = {};
    C.SLOTS.forEach(slot => {
      const it = C.find(raw[slot]);
      eq[slot] = it && it.slot === slot && state.owned.includes(it.id) ? it.id : C.FREE[slot];
    });
    state.equipped = eq;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  let hadSave = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { state = { ...fresh(), ...JSON.parse(raw) }; hadSave = true; }
  } catch (e) { /* storage unavailable, or the save was damaged: play on with what we can recover */ }
  normalize();
  if (hadSave) save(); // write the repaired / migrated save straight back

  function set(patch) {
    Object.assign(state, patch);
    save();
    listeners.forEach(fn => fn(state));
  }

  /** Add (or subtract) chips, enforcing the floor. Returns true if the floor kicked in. Used by the games. */
  function addChips(delta) {
    const next = state.chips + delta;
    const floored = next < MIN_CHIPS;
    set({ chips: Math.max(next, MIN_CHIPS) });
    return floored;
  }

  /** Earn chips for doing something well. Adds exactly that many: the 10-chip floor above is for losses,
      and would otherwise turn a first +1 into +10 for someone who has spent everything. */
  function earn(amount) {
    if (!Number.isInteger(amount) || amount <= 0) return false;
    set({ chips: state.chips + amount });
    return true;
  }

  /** Remember the best score for a practice table. Returns true if this is a new best. */
  function recordBest(op, score) {
    if (!(op in state.arithBest) || !Number.isInteger(score) || score <= state.arithBest[op]) return false;
    set({ arithBest: { ...state.arithBest, [op]: score } });
    return true;
  }

  /** Spend chips on something. Spending is a choice, so it can use every chip (no floor), and it
      never refunds anything. Returns false if the wallet is short. */
  function spend(amount) {
    if (!Number.isInteger(amount) || amount < 0 || state.chips < amount) return false;
    set({ chips: state.chips - amount });
    return true;
  }

  const owns = id => state.owned.includes(id);
  function own(id) {
    if (!C.find(id) || owns(id)) return false;
    set({ owned: [...state.owned, id] });
    return true;
  }
  /** Wear/use an owned item. */
  function equip(slot, id) {
    const it = C.find(id);
    if (!it || it.slot !== slot || !owns(id)) return false;
    set({ equipped: { ...state.equipped, [slot]: id } });
    return true;
  }

  /** Remy was petted. Counted at most once every two seconds, so tapping the key cannot run the number up. This count is for the
      story to come: nothing on screen ever shows it. */
  const REMY_COOLDOWN_MS = 2000;
  let lastRemyPet = -Infinity;
  function countRemyPet(nowMs = Date.now()) {
    if (nowMs - lastRemyPet < REMY_COOLDOWN_MS) return false;
    lastRemyPet = nowMs;
    set({ remyPets: state.remyPets + 1 });
    return true;
  }

  /** A state found on the first try. Returns true the first time. */
  function markMapFound(code) {
    if (typeof code !== 'string' || !/^[A-Z]{2}$/.test(code) || state.mapFound.includes(code)) return false;
    set({ mapFound: [...state.mapFound, code] });
    return true;
  }
  /** Remember a streak if it is the best so far. */
  function recordMapStreak(n) {
    if (!Number.isInteger(n) || n <= state.mapBestStreak) return false;
    set({ mapBestStreak: n });
    return true;
  }
  return {
    MIN_CHIPS,
    get: () => state,
    set, addChips, earn, recordBest, countRemyPet, markMapFound, recordMapStreak, spend, owns, own, equip,
    onChange: fn => { listeners.push(fn); fn(state); },
    reset: () => set({ ...fresh() }),
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Store;
