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
    owned: [...FREE_IDS],
    equipped: { ...C.FREE },
  });
  let state = fresh();
  const listeners = [];

  /** Older saves lack the shop fields, and a save can hold ids we no longer sell. Repair, never lose chips. */
  function normalize() {
    state.chips = Math.max(Number.isFinite(state.chips) ? state.chips : 100, MIN_CHIPS);
    const owned = Array.isArray(state.owned) ? state.owned.filter(id => C.find(id)) : [];
    state.owned = [...new Set([...FREE_IDS, ...owned])];
    const eq = { ...C.FREE, ...(state.equipped && typeof state.equipped === 'object' ? state.equipped : {}) };
    C.SLOTS.forEach(slot => {
      const it = C.find(eq[slot]);
      if (!it || it.slot !== slot || !state.owned.includes(it.id)) eq[slot] = C.FREE[slot];
    });
    state.equipped = eq;
  }

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...fresh(), ...JSON.parse(raw) };
  } catch (e) { /* storage unavailable: play without saving */ }
  normalize();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

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

  return {
    MIN_CHIPS,
    get: () => state,
    set, addChips, spend, owns, own, equip,
    onChange: fn => { listeners.push(fn); fn(state); },
    reset: () => set({ ...fresh() }),
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Store;
