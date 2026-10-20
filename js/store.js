/* One shared save state that every zone, mini-game, and shop reads and writes.
   It saves in this browser only (localStorage), so nothing follows a student between devices. */
const Store = (() => {
  const C = typeof Catalog !== 'undefined' ? Catalog : require('./catalog.js');
  const KEY = 'primetime.save.v1';
  const MIN_CHIPS = 10; // wagers never take the wallet below this, so there's always a way back in
  const FREE_IDS = Object.values(C.FREE);

  const fresh = () => ({
    chips: 100,
    practiceWins: 0, wagerWins: 0, wagerLosses: 0,
    trinomialWins: 0, trinomialLosses: 0, radicalWins: 0, radicalLosses: 0,
    parabolaWins: 0, parabolaLosses: 0, vertexWins: 0, vertexLosses: 0,
    arithBest: { add: 0, sub: 0, mul: 0, div: 0 },   // most problems solved in one 60-second round, per table
    blueprintsSolved: 0,
    mapFound: [],            // two-letter codes of the states you have found on the map (first try)
    mapBestStreak: 0,        // most states in a row on the first try
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
    set, addChips, earn, recordBest, markMapFound, recordMapStreak, spend, owns, own, equip,
    onChange: fn => { listeners.push(fn); fn(state); },
    reset: () => set({ ...fresh() }),
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Store;
