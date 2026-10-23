/* The dorm room's furniture rules: what you can place, where it fits, and how it turns. No DOM here, so it is tested in
   Node (tests/dorm.test.js). The room is a grid of 8 x 6 cells (x runs west to east, z north to south). You do not build
   furniture, you pick it from a short list and put it down, one of each kind:
     bed       a regular bed or a bunk bed (one or the other)
     tv        a TV stand with a TV on it
     desk      a desk with a computer on it
     dresser   a small dresser
   An item is { type, x, z, rot }: (x, z) is the top-left cell of the space it covers once turned, and rot is quarter turns
   clockwise (seen from above, north up). Turned 0, an item faces south; 1 faces west, 2 north, 3 east. */
const Dorm = (() => {
  const BUILD = 27; // bump together with the ?v= numbers in index.html
  const ROOM = { w: 8, d: 6 };
  const DOOR = { x: 0, z: 2 };                       // the doorway is in the west wall, beside cell (0, 2)
  const KEEP_CLEAR = [[0, 2], [1, 2]];               // the cells just inside the door stay empty, so you can always walk in

  /** w x d is the space an item covers when it faces south (rot 0). */
  const ITEMS = {
    bed: { name: 'Bed', group: 'bed', w: 1, d: 2 },
    bunk: { name: 'Bunk bed', group: 'bed', w: 1, d: 2 },
    tv: { name: 'TV stand', group: 'tv', w: 2, d: 1 },
    desk: { name: 'Desk and computer', group: 'desk', w: 2, d: 1 },
    dresser: { name: 'Small dresser', group: 'dresser', w: 1, d: 1 },
  };
  const GROUPS = ['bed', 'tv', 'desk', 'dresser'];
  const FACING = [[0, 1], [-1, 0], [0, -1], [1, 0]];   // rot 0..3: south, west, north, east

  const mod4 = r => ((Math.floor(Number(r)) % 4) + 4) % 4;
  const isInt = v => Number.isInteger(v);

  /** The width and depth (in cells) of an item once it is turned. */
  function footprint(type, rot) {
    const s = ITEMS[type];
    return mod4(rot) % 2 ? { w: s.d, d: s.w } : { w: s.w, d: s.d };
  }

  /** Every cell an item covers, as [x, z] pairs. */
  function cellsOf(item) {
    const f = footprint(item.type, item.rot), out = [];
    for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) out.push([item.x + i, item.z + j]);
    return out;
  }

  const inRoom = ([x, z]) => x >= 0 && z >= 0 && x < ROOM.w && z < ROOM.d;
  const isKeepClear = ([x, z]) => KEEP_CLEAR.some(([a, b]) => a === x && b === z);
  const keyOf = ([x, z]) => `${x},${z}`;

  /** Is this item shaped right, inside the room, and clear of the doorway? (Not about other items.) */
  function fits(item) {
    if (!item || !ITEMS[item.type] || !isInt(item.x) || !isInt(item.z) || !isInt(item.rot) || item.rot < 0 || item.rot > 3) return false;
    return cellsOf(item).every(c => inRoom(c) && !isKeepClear(c));
  }

  /** Put an item down. One of each kind: a second bed replaces the first, and an item moved to a new spot leaves its old one.
      Returns { ok, items } or { ok: false, reason }. The list you pass in is never changed. */
  function place(items, item) {
    if (!item || !ITEMS[item.type]) return { ok: false, reason: 'That is not something you can place.' };
    const rot = mod4(item.rot);
    const next = { type: item.type, x: item.x, z: item.z, rot };
    if (!fits(next)) {
      const outside = !isInt(next.x) || !isInt(next.z) || !cellsOf(next).every(inRoom);
      return { ok: false, reason: outside ? 'That does not fit inside the room.' : 'Keep the doorway clear so you can walk in.' };
    }
    const group = ITEMS[next.type].group;
    const others = items.filter(o => ITEMS[o.type].group !== group);
    const taken = new Set(others.flatMap(o => cellsOf(o).map(keyOf)));
    if (cellsOf(next).some(c => taken.has(keyOf(c)))) return { ok: false, reason: 'Something is already there.' };
    return { ok: true, items: [...others, next].sort((a, b) => GROUPS.indexOf(ITEMS[a.type].group) - GROUPS.indexOf(ITEMS[b.type].group)) };
  }

  /** Take away whatever covers cell (x, z). */
  function removeAt(items, x, z) {
    const hit = items.find(o => cellsOf(o).some(([a, b]) => a === x && b === z));
    return hit ? { ok: true, items: items.filter(o => o !== hit), removed: hit } : { ok: false, items };
  }

  /** The item covering a cell, if any. */
  const itemAt = (items, x, z) => items.find(o => cellsOf(o).some(([a, b]) => a === x && b === z)) || null;

  /** Clean up a saved list: unknown things, bad numbers, doorway blockers, overlaps and second beds are dropped, so a damaged
      save can never put furniture through a wall or on top of other furniture. */
  function sanitize(list) {
    let items = [];
    if (!Array.isArray(list)) return items;
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      const r = place(items, { type: raw.type, x: raw.x, z: raw.z, rot: isInt(raw.rot) ? raw.rot : 0 });
      if (r.ok && !items.some(o => ITEMS[o.type].group === ITEMS[raw.type].group)) items = r.items;
    }
    return items;
  }

  /** The cells that are still free (no furniture, not outside the room). */
  function freeCells(items) {
    const taken = new Set(items.flatMap(o => cellsOf(o).map(keyOf)));
    const out = [];
    for (let x = 0; x < ROOM.w; x++) for (let z = 0; z < ROOM.d; z++) if (!taken.has(keyOf([x, z]))) out.push([x, z]);
    return out;
  }

  /** Free cells you can reach on foot from the doorway. */
  function reachableCells(items) {
    const free = new Set(freeCells(items).map(keyOf)), seen = new Set([keyOf([DOOR.x, DOOR.z])]), stack = [[DOOR.x, DOOR.z]];
    while (stack.length) {
      const [x, z] = stack.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { const k = keyOf([x + dx, z + dz]); if (free.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, z + dz]); } });
    }
    return seen;
  }

  return { BUILD, ROOM, DOOR, KEEP_CLEAR, ITEMS, GROUPS, FACING, footprint, cellsOf, fits, place, removeAt, itemAt, sanitize, freeCells, reachableCells, mod4 };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Dorm;
