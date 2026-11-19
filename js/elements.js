/* The periodic table, for the Science Lab: all 118 elements, and the ELEMENT MATCH game (you are given an element's name and click its tile on the table).

   No DOM here, so it is all unit tested in Node (tests/elements.test.js). Only the names and symbols are typed in; where an element sits (its group and period, and its place in the drawn
   table) is worked out from its atomic number, and so is its family, so a typing slip cannot put an element in the wrong box.
   Easy    the first 20 elements (hydrogen to calcium); the table shows only the rows it needs
   Medium  the first 36, and ten well-known heavier ones (silver, tin, iodine, barium, tungsten, platinum, gold, mercury, lead, xenon): many have symbols that do not match their English names
   Hard    all 118, with the lanthanides and actinides in their two rows underneath */
const Elements = (() => {
  const BUILD = 51; // bump together with the ?v= numbers in index.html
  const RAW = 'H Hydrogen,He Helium,Li Lithium,Be Beryllium,B Boron,C Carbon,N Nitrogen,O Oxygen,F Fluorine,Ne Neon,Na Sodium,Mg Magnesium,Al Aluminum,Si Silicon,P Phosphorus,S Sulfur,Cl Chlorine,Ar Argon,' +
    'K Potassium,Ca Calcium,Sc Scandium,Ti Titanium,V Vanadium,Cr Chromium,Mn Manganese,Fe Iron,Co Cobalt,Ni Nickel,Cu Copper,Zn Zinc,Ga Gallium,Ge Germanium,As Arsenic,Se Selenium,Br Bromine,Kr Krypton,' +
    'Rb Rubidium,Sr Strontium,Y Yttrium,Zr Zirconium,Nb Niobium,Mo Molybdenum,Tc Technetium,Ru Ruthenium,Rh Rhodium,Pd Palladium,Ag Silver,Cd Cadmium,In Indium,Sn Tin,Sb Antimony,Te Tellurium,I Iodine,Xe Xenon,' +
    'Cs Cesium,Ba Barium,La Lanthanum,Ce Cerium,Pr Praseodymium,Nd Neodymium,Pm Promethium,Sm Samarium,Eu Europium,Gd Gadolinium,Tb Terbium,Dy Dysprosium,Ho Holmium,Er Erbium,Tm Thulium,Yb Ytterbium,Lu Lutetium,' +
    'Hf Hafnium,Ta Tantalum,W Tungsten,Re Rhenium,Os Osmium,Ir Iridium,Pt Platinum,Au Gold,Hg Mercury,Tl Thallium,Pb Lead,Bi Bismuth,Po Polonium,At Astatine,Rn Radon,' +
    'Fr Francium,Ra Radium,Ac Actinium,Th Thorium,Pa Protactinium,U Uranium,Np Neptunium,Pu Plutonium,Am Americium,Cm Curium,Bk Berkelium,Cf Californium,Es Einsteinium,Fm Fermium,Md Mendelevium,No Nobelium,Lr Lawrencium,' +
    'Rf Rutherfordium,Db Dubnium,Sg Seaborgium,Bh Bohrium,Hs Hassium,Mt Meitnerium,Ds Darmstadtium,Rg Roentgenium,Cn Copernicium,Nh Nihonium,Fl Flerovium,Mc Moscovium,Lv Livermorium,Ts Tennessine,Og Oganesson';

  /** The first atomic number of each period (and one past the last). */
  const PERIOD_START = [1, 3, 11, 19, 37, 55, 87, 119];
  /** Where an element sits: its period, its group (null for the lanthanides and actinides, which have none), and its row and column in the table as it is drawn (the two f-block rows are rows
      9 and 10, under a gap, in columns 3 to 17). */
  function place(z) {
    const period = PERIOD_START.findIndex((s, i) => z >= s && z < PERIOD_START[i + 1]) + 1, k = z - PERIOD_START[period - 1];
    if (period === 1) return { period, group: z === 1 ? 1 : 18, row: 1, col: z === 1 ? 1 : 18 };
    if (period <= 3) { const group = k < 2 ? k + 1 : k + 11; return { period, group, row: period, col: group }; }
    if (period <= 5) return { period, group: k + 1, row: period, col: k + 1 };
    if (k < 2) return { period, group: k + 1, row: period, col: k + 1 };
    if (k < 17) return { period, group: null, row: period + 3, col: k + 1 };                 // 57 to 71 and 89 to 103: fifteen across, under the main table
    return { period, group: k - 13, row: period, col: k - 13 };
  }
  const NONMETALS = [1, 6, 7, 8, 15, 16, 34], METALLOIDS = [5, 14, 32, 33, 51, 52], POST = [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116];
  const FAMILIES = { alkali: 'an alkali metal', alkaline: 'an alkaline earth metal', transition: 'a transition metal', post: 'a post-transition metal', metalloid: 'a metalloid', nonmetal: 'a nonmetal', halogen: 'a halogen', noble: 'a noble gas', lanthanide: 'a lanthanide', actinide: 'an actinide' };
  function family(z) {
    const p = place(z);
    if (p.group === null) return p.period === 6 ? 'lanthanide' : 'actinide';
    if (p.group === 18) return 'noble'; if (NONMETALS.includes(z)) return 'nonmetal'; if (METALLOIDS.includes(z)) return 'metalloid'; if (POST.includes(z)) return 'post';
    if (p.group === 17) return 'halogen'; if (p.group === 1) return 'alkali'; if (p.group === 2) return 'alkaline';
    return 'transition';
  }
  /** Every element: { z, symbol, name, period, group, row, col, family }. ALL[0] is hydrogen. */
  const ALL = RAW.split(',').map((s, i) => { const [symbol, name] = s.split(' '), z = i + 1; return { z, symbol, name, ...place(z), family: family(z) }; });
  const byZ = z => ALL[z - 1], bySymbol = Object.fromEntries(ALL.map(e => [e.symbol, e]));
  /** The two placeholder tiles in group 3 of periods 6 and 7 that point down to the rows of lanthanides and actinides (the way a printed table does it). They are not elements. */
  const GAPS = [{ row: 6, col: 3, label: '57\u201371' }, { row: 7, col: 3, label: '89\u2013103' }];

  const HEAVY = [47, 50, 53, 54, 56, 74, 78, 79, 80, 82];
  const LEVELS = [
    { level: 1, name: 'Easy', sample: 'H to Ca', desc: 'The first 20 elements, hydrogen to calcium', set: ALL.filter(e => e.z <= 20).map(e => e.z) },
    { level: 2, name: 'Medium', sample: 'Fe, Au, Ag', desc: 'The first 36, and ten famous heavier ones like silver, gold and lead', set: [...ALL.filter(e => e.z <= 36).map(e => e.z), ...HEAVY].sort((a, b) => a - b) },
    { level: 3, name: 'Hard', sample: 'all 118', desc: 'Every element, with the lanthanides and actinides', set: ALL.map(e => e.z) },
  ];
  const levelOf = l => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(Number(l)) || 1)) - 1];
  /** The tiles a level's table shows: every element in the rows it needs (so Easy shows periods 1 to 4, Medium periods 1 to 6 without the lanthanides, Hard everything). */
  function tiles(level) { const L = levelOf(level), rows = new Set(L.set.map(z => byZ(z).row)); return ALL.filter(e => rows.has(e.row)); }

  /** A problem: { level, z } (find this element). Never the same one twice in a row. */
  function problem(level, rng = Math.random, last = null) {
    const L = levelOf(level);
    for (let i = 0; i < 40; i++) { const z = L.set[Math.floor(rng() * L.set.length)]; if (!last || last.z !== z) return { level: L.level, z }; }
    return { level: L.level, z: L.set[0] };
  }
  const count = level => levelOf(level).set.length;
  /** What you are asked: "Find sodium". */
  const prompt = p => `Find ${byZ(p.z).name.toLowerCase()}`;
  /** The key of the tile to click (the atomic number, as a string). */
  const answerOf = p => String(p.z);
  const isCorrect = (p, key) => String(key) === String(p.z);
  /** The table a level shows, as HTML text: a grid of tiles (each a button with data-key = its atomic number, its place in the grid, and its family as a class for colour), with the two
      placeholder tiles for the rows underneath. A tile shows the atomic number and the symbol, never the name: the name is what you are asked for. */
  function figure(level) {
    const T = tiles(level), maxRow = Math.max(...T.map(e => e.row)), rows = maxRow <= 7 ? `repeat(${maxRow}, var(--tile))` : 'repeat(7, var(--tile)) 8px repeat(2, var(--tile))';
    const cells = T.map(e => `<button type="button" class="pt-tile fam-${e.family}" data-key="${e.z}" style="grid-row:${e.row};grid-column:${e.col}" aria-label="${e.symbol}, number ${e.z}"><span class="pt-z">${e.z}</span><span class="pt-sym">${e.symbol}</span></button>`);
    const gaps = GAPS.filter(g => g.row <= maxRow).map(g => `<div class="pt-gap" style="grid-row:${g.row};grid-column:${g.col}" aria-hidden="true">${g.label}</div>`);
    return `<div class="pt" style="grid-template-rows:${rows}">${gaps.join('')}${cells.join('')}</div>`;
  }
  /** What a tile says, for a message that must not give the answer away: its symbol. */
  const label = key => (byZ(Number(key)) ? byZ(Number(key)).symbol : '');

  /** One line about an element: "Sodium (Na) is number 11: an alkali metal, in group 1 and period 3." */
  function fact(z) { const e = byZ(z); return `${e.name} (${e.symbol}) is number ${e.z}: ${FAMILIES[e.family]}, in ${e.group ? `group ${e.group} and ` : ''}period ${e.period}.`; }
  const done = p => fact(p.z);

  return { BUILD, ALL, GAPS, FAMILIES, LEVELS, byZ, bySymbol, place, family, levelOf, tiles, figure, label, problem, count, prompt, answerOf, isCorrect, fact, done };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Elements;
