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
      <p>Follow the road straight ahead to the <b>Casino</b>. A street of shops runs west off the road on your left, and the fountain is on your right. Ten tables are inside, in three wings: Factoring on the left, Graphing on the right, and Polynomials straight ahead.</p>
      <p><b>Practice table:</b> break each dice roll into prime factors. A miss costs nothing. Easier rolls (2 dice) earn <b>10 chips</b>, and harder ones earn more, up to <b>50</b>.</p>
      <p><b>Radicals, trinomials, and the two parabola tables</b> let you pick a level, Easy up to Expert. Harder levels pay more, and a wrong answer never costs you chips.</p>
      <p><b>The Lines table</b> (in the Graphing wing) has you graph a line by clicking points, in slope-intercept, point-slope, or standard form. Each line pays <b>25 chips</b>.</p>
      <p><b>The Polynomial Coaster</b> (in the Polynomials wing, in the north of the casino, next to the Multiply and Add/Sub tables) has you build a minecart track from a polynomial: choose where the ends go and whether each zero passes through or bounces. Every star pays chips, up to 30 a ride on Factored form and 60 on Factor first.</p>
      <p><b>The House of Algebra</b> is the blues venue at the north end of the street of shops. Walk up the red carpet past the stage: the booths along the walls are tables of algebra problems, one unit at a time. Unit 1 is the <b>Missing Number</b> booth, nearest the stage on the left: find the number that goes in the box, like <b>[ ] + 5 = 7</b> (a 2); tap the answer on the number pad. Unit 2 is <b>Multiply &amp; Divide</b>, across the aisle: <b>[ ] \u00d7 4 = 20</b> (a 5). Unit 3 is the <b>Numbers Game</b>, next to Unit 1: find the two numbers that <b>multiply to 32 and add to 18</b> (16 and 2), the step that splits the middle term when you factor. Each pays <b>10, 25 or 50 chips</b> an answer.</p>
      <p><b>Every clock in the village tells the real time.</b> Walk up to the big clock in the <b>Arithmetic Academy's classroom</b> (or the one in the Science Lab) and press E to practise reading it: point the short hand at an hour, point the long hand at a minute, or read the time yourself. <b>10, 25 or 50 chips</b> an answer.</p>
      <p><b>The Science Lab</b> is at the far end of the street of shops: follow the path west past the last shop. Inside, three stations: find an element on the <b>periodic table</b> (Element Match), click the right part of a <b>cell</b> (Cell Lab), and build an <b>atom</b> from its protons, neutrons and electrons (Atom Builder). Each pays <b>10, 25 or 50 chips</b> an answer.</p>
      <p><b>Trophies:</b> get 100 right at any table and you win a trophy for the shelf in your room in Wilson Hall.</p>
      <p><b>Little Library:</b> by the fountain in the park. Take a book and read it on the full screen: <i>Flatland</i>, <i>Alice's Adventures in Wonderland</i>, or <i>A Tangled Tale</i>. Your page is saved.</p>
      <p>Across the road from the shops is the <b>Arithmetic Academy</b>: timed practice tables for adding, subtracting, multiplying, and dividing.</p>
      <p>Follow the stone path round the south side of the school to the <b>Sandbox</b>. Build the shape that matches the blueprint board.</p>
      <p>Spend your chips on clothes, pencils, graphing calculators, and pets in the shops. The Style Shop's top line is the <b>Kelly Green set with gold outlines</b>: 5,000 chips a piece. Press <b>C</b> any time to open your closet.</p>`,
  },
};
