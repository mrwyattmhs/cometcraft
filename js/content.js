/* Data only. Add or edit shops and copy here without touching engine code. */
const CONTENT = {
  shops: {
    // pencils, style and pets are real shops: their stock lives in catalog.js and the window is built by shop.js
    pencils: { title: 'Pencil Shop', sign: 'PENCILS', roof: 'brick' },
    style: { title: 'Style Shop', sign: 'STYLE', roof: 'wallDark' },
    hints: {
      title: 'Hint Shop',
      sign: 'HINTS',
      roof: 'stone',
      blurb: 'Scrolls that make divisibility rules visible. Coming in a later update.',
      wares: [
        { name: 'Scroll of 2s and 5s', price: 60 },
        { name: 'Scroll of 3s and 9s', price: 90 },
        { name: 'Prime Compass', price: 200 },
      ],
    },
    pets: { title: 'Pet Corner', sign: 'PETS', roof: 'log' },
  },

  board: {
    title: 'How to play',
    html: `
      <p>Walk to the <b>Casino</b> at the north end of the village. Five tables are inside.</p>
      <p><b>Practice table:</b> break each dice roll into prime factors. A miss costs nothing, and you earn a few chips.</p>
      <p><b>The other four</b> (radicals, trinomials, and two graphing tables) are wagers. You bet chips first, then get one shot.</p>
      <p>Spend your chips on pencils, clothes, and pets in the shops. Press <b>C</b> any time to open your closet.</p>`,
  },
};
