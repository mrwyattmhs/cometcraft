# Prime Time

A voxel-style 3D math game that runs in the browser. Walk around a village of students, enter the casino, throw d20 dice, and **factor the sum into primes** by dropping prime gems into a crafting grid.

No build step and no backend. It is plain HTML, CSS, and JavaScript plus Three.js from a CDN, so it deploys to GitHub Pages as-is.

## Run it

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Deploy to GitHub Pages

1. Push this folder to a repo (the contents should sit at the repo root).
2. Settings, Pages, "Deploy from a branch", pick `main` and `/ (root)`.
3. The game goes live at `https://<you>.github.io/<repo>/`.

**Put the files at the top of the repo.** If you unzip the project you get a folder called `prime-time/`. The files inside it (`index.html`, `css/`, `js/`) must sit at the root of the repo, not inside a `prime-time/` folder: GitHub Pages keeps serving whatever `index.html` is at the root, so a copy one folder down changes nothing. Delete the old files first, so a removed file does not linger.

**If the page looks like an old version after you push:** GitHub Pages caches files for a few minutes, and a browser can mix old and new files. Every file link in `index.html` ends in `?v=18`, so bump that number everywhere in `index.html` when you push a change, and bump the `BUILD` constant in each of these files to match: `js/arithmetic.js`, `js/arithmetic-game.js`, `js/blueprint.js`, `js/usmap.js`, `js/map-game.js`, `js/dorm.js`, `js/dorm-planner.js`, `js/trinomials.js`, `js/trinomial-game.js`, `js/radicals.js`, `js/radical-game.js`, `js/parabolas.js`, and `js/parabola-game.js` (where it is called `BUILD_GRAPH_TABLES`). The start screen shows the build number under the Play button, and the games tell you to reload if they detect mismatched files.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Look (click the world to capture the mouse; drag to look if capture is unavailable) |
| Shift | Run (in the sandbox it floats you down instead) |
| E | Interact (doors, tables, shops, signs, and Remy) |
| C | Open your closet (switch outfits, accessory, and pet) |
| V | Toggle first / third person (see your student and what they are holding) |
| Right-click or F | Place a block (sandbox only) |
| Left-click or X | Break a block (sandbox only) |
| Space / Shift | Float up / down (sandbox only) |
| Enter / H / N | Check, hint, and new blueprint (sandbox only) |
| R | Turn a piece of furniture (in the room planner) |
| Esc | Release the mouse, close a window |

## The game

- **Village hub:** you start on a road that runs straight to the casino. You start level with **Wilson Hall, the dorm, directly on your right** (east side). **Directly across the road from it is a little park** (west side): a huge old tree with a very thick trunk stands in the middle of a planting bed, a square paved walkway goes all the way round it, benches sit just outside the walkway facing the tree, a walk leads in from the sidewalk, two lamps stand at the far corners, and trimmed shrubs sit round the tree. On the south side (to the left as you face the park from the road) a short walk leads to a small paved plaza with a **fountain**, a gold-rimmed stone basin with drifting water, a tall center jet and four arching jets, and a bench on each side facing it (`buildPark` and `addMiniFountain` in `js/world.js`). **The four shops are on your left** (west side), set well back from the road behind a wide paved plaza and facing it, with a crosswalk and street lamps along the road. **The casino is straight ahead**, a mini grand hotel: a stepped crescent of sandstone with a window on every other block, a tall center tower and lower wings on each side, gold trim, and a columned porte-cochere over the entrance. **A big lake with dancing fountains is on your right**, in front of the right wing: 23 jets ripple in a wave, with a tall one rising in the middle, and there are benches along its edge. The lake is solid, so it is for looking at, not walking in. **Across the road from the shops, on the east side, is the Arithmetic Academy**: a red-brick school set back behind a front lawn, with two stories of windows, a flat roof, and a projecting entrance with a stepped gable, columns, steps, and a name sign. A little hedged walkway runs from the sidewalk to the front door (in line with the crosswalk), flowers dot the lawn, and a flagpole flies a rippling flag. The notice board stands by the road near the start. Five students wander the village, and so does **Remy**, a light brown and white calico cat with a floating name tag (walk up and press E to pet her; she is not for sale).
- **The Little Library (in the park, by the fountain):** a big blue mailbox on a post with a glass door and books inside, like the little free libraries in parks. Press **E** at it, pick a book from the shelf, and it fills the screen: *Flatland* (Edwin A. Abbott, 1884), *Alice's Adventures in Wonderland* (Lewis Carroll, 1865) and *A Tangled Tale* (Lewis Carroll, 1885, ten stories with a math puzzle hidden in each). Turn pages with the buttons, the left and right arrow keys, PageUp and PageDown, or a swipe. **Home** and **End** go to the first and last page. The slider and the page box (type a number, press Enter) jump to any page, **Contents** jumps to a chapter, and **A-** and **A+** change the text size. A red ribbon shows your page, and **your place is saved every time you turn a page**, so the shelf offers *Continue at page N* or *Start over* (each book has its own bookmark, kept in this browser only). Escape goes from the book back to the shelf, and again closes it. Pages are a fixed length (about a screen), so page 50 is the same page on every device and text size. The books are the full text, free to read from Project Gutenberg and in the public domain in the United States, with the pictures left out. The Project Gutenberg title block and license are kept on an "About this edition" page at the end of each book. In *A Tangled Tale*, square roots, "therefore" signs and exponents are drawn as symbols (√ ∴ ²), and its printed contents page keeps the original book's page numbers.
- **Trophies:** every game has one trophy (thirteen in all): get **100 right** at a table (or in the map game) to win it, or solve **25 blueprints** in the sandbox. Each game screen shows your progress ("Trophy: 37 of 100"), a gold banner appears when you earn one, and it goes on the trophy shelf in your room in Wilson Hall, carrying the same symbol as its table (the two formula tables say *Standard Form* and *Vertex Form*). The shelf holds eight; a second shelf appears below it for the rest (four more fit on it today). Counts start from zero for everyone.
- **Wilson Hall (the dorm):** a Georgian building after the documented look of Wilson Hall at Miami University in Oxford, Ohio (once called The Pines, built 1926, demolished 2019): blue limestone walls, a red tile roof, a white columned portico with a pediment and nameplate, shuttered windows on three floors, dormers and chimneys. Inside is one hallway with eight numbered doors and a staircase, **all locked except your room, the first door on the right**. Your room is a small grid. Press **E** at "Arrange your room" for the **room planner**, a top-down blueprint of the room: pick a **bed or a bunk bed**, a **TV stand with a TV**, a **desk with a computer**, and a **small dresser** (one of each), see a green or red preview follow your cursor, and click to place. Pieces turn to face the room by themselves (R turns one), clicking a placed piece picks it up to move it, and right-click takes it away. The two squares just inside the door always stay clear so you can walk in. Everything saves in this browser. A **trophy shelf** on the wall is empty for now, waiting for quest rewards. The rules are in `js/dorm.js` (tested by `tests/dorm.test.js`), the 3D furniture in `js/dormroom.js`, and the screen in `js/dorm-planner.js`.
- **Shops:** spend chips on how your student looks. Basic items cost 400 chips, graphing calculators 600, and the Kelly Green M tee 1000. Each storefront shows what it sells: the Accessories shop has giant pencils and a giant graphing calculator on the roof, the Style shop a giant T-shirt and mannequins, the Pet Corner a giant paw print and a doghouse, and the Hint shop a spinning gold question mark. Each has a tagline under its name and pictures of its goods in the windows (`SHOP_LOOKS` in `js/world.js`).
  - **Accessories Shop:** pencil colors (400) and **graphing calculators** (600). You hold **one accessory at a time**, so equipping a calculator replaces your pencil (and equipping a pencil puts the calculator away). You keep everything you own and can swap freely in the shop or the closet. The calculators are TI-84-style, in eight colors, with a little parabola on the screen. It's held in the right hand where the pencil was, and shows in the lower right of your first-person view.
  - **Style Shop:** shirts, pants, hats (caps and beanies), and shoes. Includes a **Kelly Green tee with a white block M** on the front.
  - **Pet Corner:** dogs, cats, and rabbits in several colors. One pet follows you at a time, around the village and through the casino door.
  - **Hint Shop:** still a "coming soon" placeholder.

  Every slot has a free starter (blue tee, navy pants, dark sneakers, yellow pencil, no hat, no pet), so nobody is ever stuck. **Try on** puts any item on your avatar before you buy, and the camera swings round so you can see it. Buying takes two clicks (Buy, then Confirm), spends exactly the price, and puts the item on. Press **C** anywhere for the closet, which lists only what you own. Everything saves in this browser only (nothing follows a student between devices, and there are no logins).
- **Arithmetic Academy (inside):** a classroom 30 x 24 inside (a little bigger than each casino wing), with a green chalkboard (chalk writing and correct sample equations), a number strip, a teacher's desk, sixteen student desks along the side walls, windows, a bookshelf, a spinning globe, a clock, a times-table poster, and a cork board. The way out is a real framed double door (wooden leaves with raised panels, windows, push bars, and hinges), like the school's front entrance. On the north row stand three **timed-practice tables**, **Addition**, **Subtraction**, and **Multiplication**, and **Division** stands on the south side, right of the exit. Each has a chalk-colored **+**, **-**, **×**, or **÷** floating and spinning above it (with a dark green outline and a toned-down fill, so they stand out against the bright room instead of washing out to white). The last south table spot (left of the exit) is kept clear on purpose: the wall map and the flag hang behind it, and a table there would hang its sign in front of them.
  - **Each table is a 60-second round**, in white chalk on a green board in a wooden frame. A **rules page** comes first (how it works, your best score, and a Start button). When you press Start the countdown begins and problems come one after another: two numbers from 1 to 10, added, subtracted (bigger number first, so never negative), or multiplied, or divided. A division problem is a times-table fact turned around, so the answer is always a whole number from 1 to 10, and you never divide by 1.
  - **Type the answer and press Enter**, or tap the on-screen number pad. Backspace corrects a typo. **Every correct answer pays right away: 2 chips at Addition and Subtraction, 4 at Multiplication, 5 at Division.** A wrong answer earns nothing and you move on (so no guessing your way through one problem), and the correct answer flashes by so you can learn it.
  - When time is up you see how many you solved, the chips you earned, your personal best (kept separately for each table), and the ones that got away. Leaving mid-round keeps the chips you already earned but does not count as a best.
- **The wall map and the flag (Arithmetic Academy):** on the back wall, left of the exit, hangs a pull-down map of the United States. Press **E** at it to play *Find the state*: the game names a state and you click it. **A first-try answer pays 5 chips.** A miss shows the right state in green and yours in red, and that state comes back a few questions later. Every state comes up once before any repeats, and states you have found turn green. Scroll to zoom and drag to move the map, and a click just off a coastline still counts, which helps with the tiny states. The outlines come from US Census Bureau boundaries (`us-atlas`, ISC license), built into `js/usmap-data.js` by `tools/build-usmap.js`. Beside the map hangs the **flag of the United States**, drawn to the official proportions (Executive Order 10834) and hung the way the Flag Code says for a wall (4 U.S.C. 7(i)): the blue field is uppermost and to the observer's left. Press **E** at it to read about it.
- **The Sandbox (behind the school):** follow the stone path from the sidewalk round the south side of the school. You build with one kind of block, and only while you stand in the sandbox. **Right-click or F** places a block against the ground or another block, **left-click or X** breaks one, and **Space / Shift** float you up and down so you can reach the top of a tall build. A top-down map of your build sits in the corner. The big chalkboard shows a **blueprint**, the TOP, FRONT, and SIDE views of a hidden shape (stand on the FRONT and SIDE mats to look from those sides). Build the shape and press **Enter** to check it (the stars drop if you use hints, but the chips don't: **Easy 50, Medium 100, Hard 150, Expert 200**), **H** for a hint, **N** for a new one. There are four levels, Easy to Expert. Every blueprint is fair: each block is needed by at least one view, and the three views allow no extra "ghost" blocks, so exactly one shape matches. `tests/blueprint.test.js` checks that by brute force.
- **Casino (inside):** a grand hotel lobby with two wings, entered from the south door and sorted by the **kind of question**. The **entrance hall** is 32 x 28 with a ceiling 16 blocks up: a checkered marble floor with gold inlay and a red runner from the door, eight marble columns, a painted sky ceiling with gold beams, a big round **fountain** in the middle whose 37 jets rise and fall in a slowly changing wave, and over it a **glass sculpture in the style of Chihuly's Fiori di Como**: about 550 translucent blown-glass blossoms, trumpets, ruffled saucers, buds and curling tendrils in every color, growing from a bronze armature against the ceiling and densest in the middle. It is still (nothing turns or flickers), the same every time (its layout is seeded), and it keeps well clear of the fountain jets, the ceiling and the beams. Each wing keeps a small crystal chandelier. Two tall gold archways lead off the hall, each with a sign. **To the left is the Factoring wing** (the Practice table with dice, the Radical table with a floating, spinning √, and the Trinomial table with a floating ax² + bx + c). **To the right is the Graphing wing** (the Lines table, with a floating line on its axes, then the Parabola table, standard form, with a floating parabola, and the Vertex table, vertex form, with a floating a(x - h)² + k). Each wing is 28 x 22 (a little smaller than the 30 x 24 Arithmetic Academy), with gilded walls, a patterned carpet (red for Factoring, blue for Graphing), a small chandelier, lounge sofas, its name on the far wall, and a painting over each table of its kind of question: a factor tree, √72 simplified, x² + 5x + 6 factored, one line written three ways, and a parabola graphed from each form. Straight ahead, in the hall's north wall, are **closed gilded doors with a velvet rope and a "North Wing, opening soon" sign**. That wing's space (28 x 22, straight north of the hall) is kept empty on purpose. A few students wander the hall. The floating symbols are built from blocks in `js/world.js`; the casino interior is `js/casino-interior.js`.
- **The wedding chapel (east wing of the casino, on the south wall):** a little chapel entrance in the middle of the Graphing wing's south wall, where a sofa used to stand. There are **ivory double doors** with gilded panels and handles, set in a gold frame under a **gold arch with a fan window and a keystone**, a **"WEDDING CHAPEL" sign** over the arch, and a **red rope hanging between two brass posts** in front of the doors. The roped-off space is closed to walkers, so the doors stay shut. Beside it is a **sign on a post** with a silver frame, an ivory stepped top with a W&W monogram, and a card recreating a wedding sign: a flower banner (calla lilies, red roses, a lime rose) over "Winters & Wyatt / Wedding Ceremony" in script. The date, the times and the "invited guests only" line are left off on purpose. The script is the Great Vibes font from Google Fonts; if it cannot load (offline), the card falls back to an italic serif. It is scenery: it adds no prompts. It lives in `addWeddingChapel` and `paintWeddingCard` in `js/casino-interior.js`, and its spot is `CHAPEL` in the same file.
- **Practice table (primes):** throw 2-4 d20s and factor the sum by dropping prime gems into a crafting grid. The product is live and retries are free. **A solved round pays by the number of dice: 2 dice 10 chips, 3 dice 25, 4 dice 50.** A **factor tree grows inline in the toolbar as you play**, between the grid and the prime gems: it starts as the target, and every prime you place splits a leaf off the number that is left (a dashed box is what is still to factor). A prime that does not divide what is left is flagged as "Does not fit" and leaves the tree alone, and the last prime turns the final box into a leaf. When you win, the finished tree is already there and the factor line (like 60 = 2² · 3 · 5) shows under the buttons. The whole window is compact (about 940 x 450, with the dice and the target in one slim strip and the buttons under the grid), so it fits on a laptop screen without scrolling; in a narrow window the gems drop to a second row.
- **Radical table:** simplify a square root by pairing prime factors. You pick a level first, and a harder level deals a bigger radicand and pays more. A wrong answer costs nothing.

  | Level | Deals | Pays |
  | --- | --- | --- |
  | Easy | roots up to 63 (√12, √45, ...) | 10 |
  | Medium | roots up to 150 | 25 |
  | Hard | roots up to 300 | 50 |
  | Expert | roots up to 600 (up to three or four pairs) | 100 |

  One step on screen at a time, one shot:
  1. **Factor:** drop prime gems into the radical, like the Practice table.
  2. **Pair up:** click two equal primes to pair them (click a pair to split it).
  3. **Simplify:** pick the number that comes outside and the number that stays inside from a row of number tiles. √48 becomes 4√3.

  Afterward the original and simplified forms appear side by side, with three quick checks (prime factors, pairs, inside and outside) and a collapsible worked solution. Each check is judged on the student's own work, and it doesn't matter which two equal primes you pair.

- **Lines table (Graphing wing):** graph a line by clicking points on a plane that runs from -10 to 10 each way. You pick a **form** first, and a line is dealt in it:
  - **Slope-intercept**, y = mx + b: click the **y-intercept** first, then **count the slope** (rise over run from that point) to plot one more point.
  - **Point-slope**, y − y₁ = m(x − x₁): click the point **(x₁, y₁)** first (watch the signs), then count the slope to plot one more point.
  - **Standard form**, Ax + By = C: **divide C by A** for the x-intercept and **C by B** for the y-intercept, and click each.

  Each click snaps to the nearest whole-number point, and a dashed ring shows which one before you click (the arrow keys and Enter work too). Every wrong click gets a hint; a **second wrong click on a step shows the answer** (a hollow orange ring) and that line is drawn but does not pay. **Every line done without help pays 25 chips in any form and counts toward the Lines trophy (100 lines, any mix of forms).** When the line is drawn, the run and rise are shown as a triangle (for the two slope forms), and the working is written out under it. There are 352 slope-intercept, 4,312 point-slope and 196 standard-form lines, all with whole-number points on the plane (and standard form always has C divisible by both A and B, and is in lowest terms).
- **Polynomial Coaster (Graphing wing, in a second row behind the Vertex table):** build a minecart track from a polynomial's **end behavior** and **zeros**, then ride it. It is Polynomial Coaster by mrwyattmhs (https://github.com/mrwyattmhs/polynomial-coaster, MIT licensed), with the same math and logic and a Minecraft look. Pick a mode:
  - **Easy, Factored form:** `f(x) = -2(x + 3)(x - 1)²(x - 4)³`. Read the exponents and signs and build the track. The zeros are marked for you with "?" blocks, so you only choose pass through or bounce.
  - **Medium, Factor first:** `f(x) = 2x³ - 2x² - 12x`. Factor it yourself to find the real zeros (some factors have none, like x² + 9), click those x-values, and choose pass through or bounce. Five kinds of problem (a common factor, grouping, only even powers, sums and differences of cubes, a common factor with a leftover that has no zeros) open up two at first and one more every two rides.
  - **Expert, Synthetic division:** shown but locked ("coming soon"), as in the original.

  A run is **8 rides** that get harder. Click an end block (up or down) on each side, then each zero: a green block means the track **passes through** the axis (odd exponent) and a gold block means it **bounces** (even). Your own track draws live on iron rails. Press **Ride**: the cart comes off at the **first mistake**, left to right, and a **TNT block** marks where. A clean ride shows the true graph on **powered gold rails** with the minecart waiting at the end. There is **no cart animation** (the result is shown at once), and nothing costs you for a derail. A ride is worth **3 stars, minus one for each derail and one for using a hint** (never fewer than one once you finish it); "Show me the answer" ends a ride with no stars. **Each star pays chips: 10 on Factored form and 20 on Factor first** (so a clean ride pays 30 or 60; set in `PAY.coaster` in `js/economy.js`). **Every ride you clear (not one you gave up on) counts toward the Polynomial Coaster trophy: 100 rides.** The end of a run tallies where the cart came off (ends, pass vs. bounce, missed or extra zeros). The blocks are keyboard buttons (Tab, then Enter or Space). The math is in `js/coaster.js` (4,000 generated problems checked in `tests/coaster.test.js`), the screen in `js/coaster-game.js`.
- **Parabola table:** graph a quadratic from standard form, y = ax² + bx + c. Pick a level first (Easy pays 25 chips, Medium 50, Hard 100), then one shot. Easy keeps a to 1 or -1 with the vertex near the center, Medium allows a up to 2, and Hard is every problem the table can deal. A wrong answer costs nothing. The questions come one at a time on the left, and the graph on the right is sketched from your own answers as you go:
  1. **Axis of symmetry** x = [ ]: a dashed line appears on the graph.
  2. **Vertex** ( x, [ ] ): x is filled in from step 1. The vertex is plotted and the curve is drawn through it using the polynomial's a.
  3. **y-intercept** (0, [ ]): the point and its mirror across the axis are plotted. If any answer is off, those points visibly miss the curve.

  Afterward you see the correct axis, vertex, and intercept, three quick checks, a collapsible worked solution, and the true parabola drawn solid (your sketch is dashed where it differs). Problems are built from vertex form, so the axis, vertex, and intercept are always whole numbers, with a opening up or down and b never 0.
- **Vertex table:** the same graphing table, same three levels and live sketch, but the equation is given in vertex form, y = a(x - h)² + k, for example y = 2(x + 3)² - 3. You find the axis (watch the sign: (x + 3) means h = -3), the vertex, and the y-intercept (plug in x = 0). The vertex's y-value is checked as k. One thing to know: in vertex form a sign slip on h gives a mirror-image parabola whose y-intercept is the same, so the live sketch won't flag it. The results screen does, drawing the true curve solid and the student's mirrored one dashed. Both graphing tables run on one shared engine (`createGraphTable` in `js/parabola-game.js`), so a fix to one is a fix to both.

- **Trinomial table:** factor a trinomial by "splitting the middle". **You pick a level first, and the level sets the difficulty**: the trinomial is only dealt after you pick, and a harder level means a bigger a·c. A wrong answer costs nothing.

  | Level | Deals | Typical a·c | Pays |
  | --- | --- | --- | --- |
  | Easy | x² + bx + c, small numbers | up to 36 | 10 |
  | Medium | x² + bx + c, bigger numbers | 40 to 120 | 25 |
  | Hard | ax² + bx + c | 60 to 200 | 50 |
  | Expert | ax² + bx + c, bigger numbers | 150 to 400 | 100 |

  The screen then reveals itself in stages so it never gets crowded:
  1. Only the two number slots show: drop in the two numbers that multiply to a·c and add to b.
  2. A big rewrite line appears with the split terms highlighted (6x² + 3x + 4x + 2), and step 2 opens: drop in the GCF of each pair and what is left inside each set of parentheses.
  3. After you craft, the workbench is replaced by the expanded and factored forms side by side, three quick checks, and a collapsible worked solution.

  One shot per trinomial. Any algebraically correct answer is accepted (either order of the split, negated GCFs).
- The wallet never drops below 10 chips, so a bad streak can't lock anyone out.

Chips and win counts save to `localStorage`.

## Project layout

```
index.html
css/style.css
js/
  factoring.js   pure math, including the factor tree so far (treeSteps), and the practice pay by dice (no DOM, unit tested)
  catalog.js     pure shop catalog: every item, price, and outfit rule (unit tested)
  store.js       shared save state (wallet, stats, owned and equipped items)
  content.js     data only: shops and sign copy
  textures.js    procedural pixel textures (no image files)
  avatar.js      blocky student with backpack and pencil; dress() applies an outfit
  pets.js        blocky dogs, cats, rabbits, Remy the calico, and the follower
  showcase.js    the camera that frames your avatar while a shop is open
  shop.js        the shop and closet window
  world.js       zones: the village, the outside of the casino, the academy, the dorm; collision, NPCs, the table builder
  casino-interior.js  the casino inside: the grand hall, the Factoring and Graphing wings, the fountain, the Fiori di Como glass sculpture and the wing chandeliers, and the reserved north wing
  player.js      movement and look
  ui.js          overlays, dialogs, shop window
  crafting.js    prime-factoring mini-game (practice table), including drawing the live factor tree
  trinomials.js  pure trinomial logic: generation, checking, worked solutions (unit tested)
  trinomial-game.js  the trinomial table interface
  radicals.js    pure radical logic: tiers, generation, checking, worked solutions (unit tested)
  radical-game.js  the radical table interface
  parabolas.js   pure parabola logic: problems, checking, graph window and curve (unit tested)
  parabola-game.js  the graphing-table engine, used by both the Parabola and Vertex tables
  lines.js       pure line logic: problems in the three forms, the equation text, the steps, checking clicks (unit tested)
  lines-game.js  the Lines table screen: the clickable plane, the steps, hints and the reveal
  coaster.js     pure Polynomial Coaster logic: the generators, track geometry, the sketch, checking, hints, stars (unit tested)
  coaster-game.js  the Polynomial Coaster screen: the Minecraft-style stage, the screens, the payout and trophy
  arithmetic.js  pure logic for the timed arithmetic rounds: problems, the 60-second clock, scoring (unit tested)
  arithmetic-game.js  the chalkboard screen: rules page, countdown, number pad, results
  usmap-data.js  GENERATED: the 50 state outlines (do not edit; rebuild with tools/build-usmap.js)
  usmap.js       pure map logic: outlines, which state is at a point, the question deck (unit tested)
  map-game.js    the click-the-state screen on the wall map
  books-data.js  GENERATED: the pages of the three Little Library books (do not edit; rebuild with tools/build-books.js)
  library.js     pure reader logic: the books, which page to open on, bookmarks, text sizes, italics (unit tested)
  reader-game.js the Little Library screens: the shelf and the full-screen reader
  flag.js        the US flag, drawn to the official proportions (unit tested)
  dorm.js        pure furniture rules for the dorm room: what fits, one of each kind, turning (unit tested)
  dormroom.js    the dorm room's furniture models, solid and saved
  dorm-planner.js  the top-down room planner screen
  blueprint.js   pure blueprint logic: fair random shapes, checking, hints (unit tested)
  sandbox.js     the build area, aiming, floating, the blueprint chalkboard
  main.js        renderer, input, zone switching
tests/factoring.test.js
tests/trinomials.test.js
tests/radicals.test.js
tests/parabolas.test.js
tests/catalog.test.js
tests/arithmetic.test.js
tests/blueprint.test.js
tests/usmap.test.js
tests/flag.test.js
tests/dorm.test.js
tools/build-usmap.js   rebuilds js/usmap-data.js (needs us-atlas, topojson-client, topojson-simplify)
tools/build-books.js   cuts the Project Gutenberg texts in books/ into pages and rewrites js/books-data.js (no packages needed)
books/                 the original Project Gutenberg texts (flatland-97.txt, alice-11.txt, tangled-29042.txt), kept so the pages can be rebuilt
```

## Adding things

- **A new zone:** write a `buildX(actions)` function in `world.js` that returns `createZone(...)`, add an `interact(...)` door to it, and register the action in `main.js`.
- **A new mini-game:** follow `crafting.js`. It opens an overlay, runs a round, and writes results to `Store`. Pay through `js/economy.js`, and call `Trophies.award('game-id')` on a correct answer so it counts toward a trophy.
- **Shop items:** add a row to `js/catalog.js` (`add(...)` or `colored(...)`). Pets also need a palette in `js/pets.js`, and a new hat shape goes in `setHat` in `js/avatar.js`.
- **Prices:** `BASIC` (400), `GRAPHING` (600), and `SPECIAL` (1000) at the top of `js/catalog.js`.
- **Sign and shop-building copy:** edit `js/content.js`.
- **A table in the casino:** `buildTable` in `world.js` makes one; `CasinoInterior.build` in `js/casino-interior.js` calls it for each table. Put the new table in the wing for its kind of question (Factoring on the left, Graphing on the right) in the same row, give it a picture above it in the `art` list, and add its spot to `TABLES`. `node tests/casino.test.js` checks the plan (sizes, wings, table spots, the reserved north wing), so update `TABLES` and that test together. A new wing goes in the reserved north space: build it from the same pieces (a wall with an opening, a `slab` for each wall, a carpet) and open the doors in the north wall.
- **A book for the Little Library:** it must be public domain (in the US, published in 1930 or earlier; check that the *edition* is too, since a modern translation or introduction can still be under copyright). Put its Project Gutenberg plain text in `books/`, add an entry to `BOOKS` in `tools/build-books.js` (an id, the file, the Gutenberg number, title, a short cover title, author, year, a cover color, and a pattern for its chapter headings), run `node tools/build-books.js`, and run `node tests/books.test.js`. That test proves that every word of the book is on the pages, once and in order. (It also pins the three current books, so add the new one's expectations.) The booth already draws filler spines, so the shelf and booth need no change for a fourth book; the shelf grid wraps.
- **Economy:** every payout is in `js/economy.js` (`PAY`), and nothing is wagered: a correct answer pays and a wrong one costs nothing. `DURATION_MS` (60 seconds) is in `js/arithmetic.js`. The problem size at each level (`TIERS`) is in `js/radicals.js`, `js/trinomials.js` and `js/parabolas.js`, and the four sandbox `LEVELS` are in `js/blueprint.js`.
- **Trophies:** the thirteen trophies (goal, symbol, color) are `GAMES` in `js/trophies.js`; the 3D trophies and the shelves (a second shelf appears below the first at the ninth trophy) are built in `js/dormroom.js`.

## Tests

```
node tests/factoring.test.js
node tests/trinomials.test.js
node tests/radicals.test.js
node tests/parabolas.test.js
node tests/catalog.test.js
node tests/arithmetic.test.js
node tests/blueprint.test.js
node tests/usmap.test.js
node tests/flag.test.js
node tests/dorm.test.js
node tests/economy.test.js
node tests/trophies.test.js
node tests/books.test.js     # also fails if js/books-data.js is out of date with books/
node tests/library.test.js
node tests/casino.test.js    # the casino's plan: hall and wing sizes, where the tables go, the reserved north wing
node tests/lines.test.js     # every line problem, every step, every click on the plane
node tests/coaster.test.js   # Polynomial Coaster: 4,000 problems re-expanded numerically, the tracks, the answers, the stars
```

## Assets and naming

All textures and models are generated in code. The one exception is data, not art: the state outlines come from the US Census Bureau via the `us-atlas` package (ISC license). The game uses a blocky voxel style but no assets, names, or branding from any other game, and the project should keep it that way.

## Next up

A free-practice version of the trinomial table, exponent stacks in the prime grid (2⁴ as one slot), working hints in the Hint Shop, touch controls, a sound pass, and more casino games. The **north wing** of the casino is next: its doors are already in the hall and its space is reserved (`NORTH_WING` in `js/casino-interior.js`).
