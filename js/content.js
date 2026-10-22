/* Data only. Add or edit shops and copy here without touching engine code. */
const CONTENT = {
  shops: {
    // accessories, style and pets are real shops: their stock lives in catalog.js and the window is built by shop.js
    accessories: { title: 'Accessories Shop', sign: 'ACCESSORIES', roof: 'brick' },
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
      <p>Follow the road straight ahead to the <b>Casino</b>. The shops are on your left and the fountain is on your right. Five tables are inside.</p>
      <p><b>Practice table:</b> break each dice roll into prime factors. A miss costs nothing. Easier rolls (2 dice) earn <b>10 chips</b>, and harder ones earn more, up to <b>50</b>.</p>
      <p><b>Radicals, trinomials, and the two parabola tables</b> let you pick a level, Easy up to Expert. Harder levels pay more, and a wrong answer never costs you chips.</p>
      <p><b>The Lines table</b> (in the Graphing wing) has you graph a line by clicking points, in slope-intercept, point-slope, or standard form. Each line pays <b>25 chips</b>.</p>
      <p><b>Trophies:</b> get 100 right at any table and you win a trophy for the shelf in your room in Wilson Hall.</p>
      <p><b>Little Library:</b> by the fountain in the park. Take a book and read it on the full screen: <i>Flatland</i>, <i>Alice's Adventures in Wonderland</i>, or <i>A Tangled Tale</i>. Your page is saved.</p>
      <p>Across the road from the shops is the <b>Arithmetic Academy</b>: timed practice tables for adding, subtracting, multiplying, and dividing.</p>
      <p>Follow the stone path round the south side of the school to the <b>Sandbox</b>. Build the shape that matches the blueprint board.</p>
      <p>Spend your chips on clothes, pencils, graphing calculators, and pets in the shops. Press <b>C</b> any time to open your closet.</p>`,
  },
};
