/* Pure data and rules for the shops and the closet (no DOM, no THREE, unit tested in Node).

   Everything a student can own is one entry in ITEMS. Each item fills one slot:
   shirt, pants, hat, shoes, accessory, or pet. A student holds ONE accessory at a time,
   either a pencil or a graphing calculator (an item's `kind`), so equipping a calculator
   replaces the pencil. The FREE item in each slot is the free starter, so nobody is ever
   stuck without a look. Basic items cost 400 chips, graphing calculators 600, and special
   items more. Add fancy items later by adding rows here. */
const Catalog = (() => {
  const BASIC = 400;
  const GRAPHING = 600;  // a graphing calculator
  const SPECIAL = 1000;

  const SLOTS = ['shirt', 'pants', 'hat', 'shoes', 'accessory', 'pet'];
  const SLOT_LABEL = { shirt: 'Shirts', pants: 'Pants', hat: 'Hats', shoes: 'Shoes', accessory: 'Accessories', pet: 'Pets' };

  /** The free starter for each slot. Everyone owns these and starts wearing them. */
  const FREE = {
    shirt: 'shirt-blue', pants: 'pants-navy', hat: 'hat-none',
    shoes: 'shoes-dark', accessory: 'pencil-yellow', pet: 'pet-none',
  };

  /** Pets for sale. (Remy, the calico cat who roams the village, is not for sale.) */
  const PET_KINDS = {
    dog: ['golden', 'brown', 'black'],
    cat: ['orange', 'gray', 'black', 'white'],
    rabbit: ['white', 'brown', 'gray'],
  };
  const PET_SWATCH = {
    dog: { golden: 0xd9a441, brown: 0x7a4a26, black: 0x2a2a2e },
    cat: { orange: 0xe58a2f, gray: 0x8e949c, black: 0x242428, white: 0xf1efe8 },
    rabbit: { white: 0xf2f2f2, brown: 0x9b6a43, gray: 0xa9aeb5 },
  };

  const items = [];
  // an item's id is prefix-key; the prefix defaults to its slot (accessories use pencil- and calculator-)
  const add = (slot, key, name, extra = {}) => {
    const { prefix, ...rest } = extra;
    items.push({ id: `${prefix || slot}-${key}`, slot, name, price: BASIC, ...rest });
  };
  const colored = (slot, rows, extra = {}) => rows.forEach(([key, name, color]) => add(slot, key, name, { color, ...extra }));
  const cap = s => s[0].toUpperCase() + s.slice(1);

  colored('shirt', [
    ['blue', 'Blue Tee', 0x2f6fdb], ['red', 'Red Tee', 0xd94a4a], ['green', 'Green Tee', 0x3fae5a],
    ['yellow', 'Yellow Tee', 0xe0a030], ['purple', 'Purple Tee', 0x8a4fd0], ['pink', 'Pink Tee', 0xf06fb0],
    ['orange', 'Orange Tee', 0xe8742a], ['black', 'Black Tee', 0x2b2b30], ['white', 'White Tee', 0xececec],
  ]);
  add('shirt', 'kelly-m', 'Kelly Green M Tee', { color: 0x4cbb17, emblem: 'M', glyph: 'M', price: SPECIAL });

  colored('pants', [
    ['navy', 'Navy Pants', 0x2b3a67], ['black', 'Black Pants', 0x2a2a2e], ['khaki', 'Khaki Pants', 0xb59a64],
    ['gray', 'Gray Pants', 0x777b82], ['red', 'Red Pants', 0xb53a3a], ['green', 'Green Pants', 0x3a7a4a],
    ['purple', 'Purple Pants', 0x6a4a9a], ['jeans', 'Blue Jeans', 0x4a78b8],
  ]);

  add('hat', 'none', 'No hat', { none: true });
  colored('hat', [
    ['cap-red', 'Red Cap', 0xd94a4a], ['cap-blue', 'Blue Cap', 0x2f6fdb],
    ['cap-green', 'Green Cap', 0x3fae5a], ['cap-black', 'Black Cap', 0x2b2b30],
  ], { type: 'cap', glyph: 'C' });
  colored('hat', [
    ['beanie-orange', 'Orange Beanie', 0xe8742a], ['beanie-gray', 'Gray Beanie', 0x8b9098],
    ['beanie-purple', 'Purple Beanie', 0x8a4fd0],
  ], { type: 'beanie', glyph: 'B' });

  colored('shoes', [
    ['dark', 'Dark Sneakers', 0x2a2a2a], ['white', 'White Sneakers', 0xf2f2f2], ['red', 'Red Sneakers', 0xc83a3a],
    ['blue', 'Blue Sneakers', 0x2f6fdb], ['green', 'Green Sneakers', 0x3fae5a], ['yellow', 'Yellow Sneakers', 0xe8c030],
    ['pink', 'Pink Sneakers', 0xf06fb0],
  ]);

  colored('accessory', [
    ['yellow', 'Yellow Pencil', 0xf2c230], ['red', 'Red Pencil', 0xd94a4a], ['blue', 'Blue Pencil', 0x2f6fdb],
    ['green', 'Green Pencil', 0x3fae5a], ['pink', 'Pink Pencil', 0xf06fb0], ['purple', 'Purple Pencil', 0x8a4fd0],
    ['black', 'Black Pencil', 0x2b2b30],
  ], { kind: 'pencil', prefix: 'pencil' });

  colored('accessory', [
    ['black', 'Black Graphing Calculator', 0x26282d], ['blue', 'Blue Graphing Calculator', 0x2f6fdb],
    ['red', 'Red Graphing Calculator', 0xd94a4a], ['green', 'Green Graphing Calculator', 0x3fae5a],
    ['pink', 'Pink Graphing Calculator', 0xf06fb0], ['purple', 'Purple Graphing Calculator', 0x8a4fd0],
    ['teal', 'Teal Graphing Calculator', 0x2fb5b0], ['orange', 'Orange Graphing Calculator', 0xe8742a],
  ], { kind: 'calculator', prefix: 'calculator', price: GRAPHING, glyph: 'fx' });

  add('pet', 'none', 'No pet', { none: true });
  Object.entries(PET_KINDS).forEach(([kind, variants]) => variants.forEach(v => {
    add('pet', `${kind}-${v}`, `${cap(v)} ${cap(kind)}`, { kind, variant: v, color: PET_SWATCH[kind][v], glyph: kind[0].toUpperCase() });
  }));

  const byId = new Map(items.map(i => [i.id, i]));
  const find = id => byId.get(id);
  Object.values(FREE).forEach(id => { find(id).price = 0; });

  /** Items in a slot, in shop order, optionally just one kind (pencil or calculator). "None" entries only show up in the closet. */
  const forSlot = (slot, { includeNone = false, kind = null } = {}) =>
    items.filter(i => i.slot === slot && (includeNone || !i.none) && (!kind || i.kind === kind));

  /** Turn { slot: itemId } into what the avatar and pet builders need. Unknown ids fall back to the free starter. */
  function outfitFor(ids) {
    const pick = slot => {
      const it = find(ids[slot]);
      return it && it.slot === slot ? it : find(FREE[slot]);
    };
    const shirt = pick('shirt'), pants = pick('pants'), hat = pick('hat');
    const shoes = pick('shoes'), accessory = pick('accessory'), pet = pick('pet');
    return {
      shirt: { color: shirt.color, emblem: shirt.emblem || null },
      pants: { color: pants.color },
      shoes: { color: shoes.color },
      hat: hat.none ? null : { type: hat.type, color: hat.color },
      accessory: { kind: accessory.kind, color: accessory.color },   // what is in your hand: a pencil or a calculator
      pet: pet.none ? null : { kind: pet.kind, variant: pet.variant },
    };
  }

  const canAfford = (chips, item) => chips >= item.price;

  return { BASIC, GRAPHING, SPECIAL, SLOTS, SLOT_LABEL, FREE, PET_KINDS, ITEMS: items, find, forSlot, outfitFor, canAfford };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Catalog;
