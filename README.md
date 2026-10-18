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

**If the page looks like an old version after you push:** GitHub Pages caches files for a few minutes, and a browser can mix old and new files. Every file link in `index.html` ends in `?v=17`, so bump that number everywhere in `index.html` when you push a change, and bump the `BUILD` constant in each of these files to match: `js/arithmetic.js`, `js/arithmetic-game.js`, `js/blueprint.js`, `js/usmap.js`, `js/map-game.js`, `js/trinomials.js`, `js/trinomial-game.js`, `js/radicals.js`, `js/radical-game.js`, `js/parabolas.js`, and `js/parabola-game.js` (where it is called `BUILD_GRAPH_TABLES`). The start screen shows the build number under the Play button, and the games tell you to reload if they detect mismatched files.

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
| Esc | Release the mouse, close a window |

## The game

- **Village hub:** you start on a road that runs straight to the casino. **The four shops are all on your left** (west side), facing the road, with a crosswalk and street lamps along it. **The casino is straight ahead**, a mini grand hotel: a stepped crescent of sandstone with a window on every other block, a tall center tower and lower wings on each side, gold trim, and a columned porte-cochere over the entrance. **A big lake with dancing fountains is on your right**, in front of the right wing: 23 jets ripple in a wave, with a tall one rising in the middle, and there are benches along its edge. The lake is solid, so it is for looking at, not walking in. **Across the road from the shops, on the east side, is the Arithmetic Academy**: a red-brick school set back behind a front lawn, with two stories of windows, a flat roof, and a projecting entrance with a stepped gable, columns, steps, and a name sign. A little hedged walkway runs from the sidewalk to the front door (in line with the crosswalk), flowers dot the lawn, and a flagpole flies a rippling flag. The notice board stands by the road near the start. Five students wander the village, and so does **Remy**, a light brown and white calico cat with a floating name tag (walk up and press E to pet her; she is not for sale).
- **Shops:** spend chips on how your student looks. Basic items cost 400 chips, graphing calculators 600, and the Kelly Green M tee 1000. Each storefront shows what it sells: the Accessories shop has giant pencils and a giant graphing calculator on the roof, the Style shop a giant T-shirt and mannequins, the Pet Corner a giant paw print and a doghouse, and the Hint shop a spinning gold question mark. Each has a tagline under its name and pictures of its goods in the windows (`SHOP_LOOKS` in `js/world.js`).
  - **Accessories Shop:** pencil colors (400) and **graphing calculators** (600). You hold **one accessory at a time**, so equipping a calculator replaces your pencil (and equipping a pencil puts the calculator away). You keep everything you own and can swap freely in the shop or the closet. The calculators are TI-84-style, in eight colors, with a little parabola on the screen. It's held in the right hand where the pencil was, and shows in the lower right of your first-person view.
  - **Style Shop:** shirts, pants, hats (caps and beanies), and shoes. Includes a **Kelly Green tee with a white block M** on the front.
  - **Pet Corner:** dogs, cats, and rabbits in several colors. One pet follows you at a time, around the village and through the casino door.
  - **Hint Shop:** still a "coming soon" placeholder.

  Every slot has a free starter (blue tee, navy pants, dark sneakers, yellow pencil, no hat, no pet), so nobody is ever stuck. **Try on** puts any item on your avatar before you buy, and the camera swings round so you can see it. Buying takes two clicks (Buy, then Confirm), spends exactly the price, and puts the item on. Press **C** anywhere for the closet, which lists only what you own. Everything saves in this browser only (nothing follows a student between devices, and there are no logins).
- **Arithmetic Academy (inside):** a classroom the same size as the casino, with a green chalkboard (chalk writing and correct sample equations), a number strip, a teacher's desk, sixteen student desks along the side walls, windows, a bookshelf, a spinning globe, a clock, a times-table poster, and a cork board. The way out is a real framed double door (wooden leaves with raised panels, windows, push bars, and hinges), like the school's front entrance. On the north row stand three **timed-practice tables**, **Addition**, **Subtraction**, and **Multiplication**, and **Division** stands on the south side, right of the exit. Each has a chalk-colored **+**, **-**, **×**, or **÷** floating and spinning above it (with a dark green outline and a toned-down fill, so they stand out against the bright room instead of washing out to white). The last south table spot (left of the exit) is kept clear on purpose: the wall map and the flag hang behind it, and a table there would hang its sign in front of them.
  - **Each table is a 60-second round**, in white chalk on a green board in a wooden frame. A **rules page** comes first (how it works, your best score, and a Start button). When you press Start the countdown begins and problems come one after another: two numbers from 1 to 10, added, subtracted (bigger number first, so never negative), or multiplied, or divided. A division problem is a times-table fact turned around, so the answer is always a whole number from 1 to 10, and you never divide by 1.
  - **Type the answer and press Enter**, or tap the on-screen number pad. Backspace corrects a typo. **Every correct answer pays 1 chip, right away.** A wrong answer earns nothing and you move on (so no guessing your way through one problem), and the correct answer flashes by so you can learn it.
  - When time is up you see how many you solved, the chips you earned, your personal best (kept separately for each table), and the ones that got away. Leaving mid-round keeps the chips you already earned but does not count as a best.
- **The wall map and the flag (Arithmetic Academy):** on the back wall, left of the exit, hangs a pull-down map of the United States. Press **E** at it to play *Find the state*: the game names a state and you click it. **A first-try answer pays 20 chips.** A miss shows the right state in green and yours in red, and that state comes back a few questions later. Every state comes up once before any repeats, and states you have found turn green. Scroll to zoom and drag to move the map, and a click just off a coastline still counts, which helps with the tiny states. The outlines come from US Census Bureau boundaries (`us-atlas`, ISC license), built into `js/usmap-data.js` by `tools/build-usmap.js`. Beside the map hangs the **flag of the United States**, drawn to the official proportions (Executive Order 10834) and hung the way the Flag Code says for a wall (4 U.S.C. 7(i)): the blue field is uppermost and to the observer's left. Press **E** at it to read about it.
- **The Sandbox (behind the school):** follow the stone path from the sidewalk round the south side of the school. You build with one kind of block, and only while you stand in the sandbox. **Right-click or F** places a block against the ground or another block, **left-click or X** breaks one, and **Space / Shift** float you up and down so you can reach the top of a tall build. A top-down map of your build sits in the corner. The big chalkboard shows a **blueprint**, the TOP, FRONT, and SIDE views of a hidden shape (stand on the FRONT and SIDE mats to look from those sides). Build the shape and press **Enter** to check it (30 chips, with the stars dropping if you use hints), **H** for a hint, **N** for a new one. There are four levels, Easy to Expert. Every blueprint is fair: each block is needed by at least one view, and the three views allow no extra "ghost" blocks, so exactly one shape matches. `tests/blueprint.test.js` checks that by brute force.
- **Casino:** five tables. Three are on the north wall as you walk in: Practice (primes, with dice), Radical (a floating, spinning √), and Trinomial (a floating, spinning ax² + bx + c). Two graphing tables are behind you on the south side, one on each side of the exit door, so you turn around to find them: the Parabola table (standard form, a floating parabola) and the Vertex table (vertex form, a floating a(x - h)² + k), mirror images of each other across the entrance. The floating symbols are built from blocks in `js/world.js`.
- **Practice table (primes):** throw 2-4 d20s and factor the sum by dropping prime gems into a crafting grid. The product is live and retries are free. **Every solved round pays a flat 20 chips**, whatever the dice setting. The correct factorization is shown as a factor tree afterward.
- **Radical table:** simplify a square root by pairing prime factors. Same wager-first setup: you pick a bet, and a bigger bet deals a bigger radicand.

  | Wager | Deals | Pays |
  | --- | --- | --- |
  | 10 | roots up to 63 (√12, √45, ...) | 10 |
  | 25 | roots up to 150 | 38 |
  | 50 | roots up to 300 | 100 |
  | 100 | roots up to 600 (up to three or four pairs) | 300 |

  One step on screen at a time, one shot:
  1. **Factor:** drop prime gems into the radical, like the Practice table.
  2. **Pair up:** click two equal primes to pair them (click a pair to split it).
  3. **Simplify:** pick the number that comes outside and the number that stays inside from a row of number tiles. √48 becomes 4√3.

  Afterward the original and simplified forms appear side by side, with three quick checks (prime factors, pairs, inside and outside) and a collapsible worked solution. Each check is judged on the student's own work, and it doesn't matter which two equal primes you pair.

- **Parabola table:** graph a quadratic from standard form, y = ax² + bx + c. One fixed wager of 50 chips (win 100), one shot. The questions come one at a time on the left, and the graph on the right is sketched from your own answers as you go:
  1. **Axis of symmetry** x = [ ]: a dashed line appears on the graph.
  2. **Vertex** ( x, [ ] ): x is filled in from step 1. The vertex is plotted and the curve is drawn through it using the polynomial's a.
  3. **y-intercept** (0, [ ]): the point and its mirror across the axis are plotted. If any answer is off, those points visibly miss the curve.

  Afterward you see the correct axis, vertex, and intercept, three quick checks, a collapsible worked solution, and the true parabola drawn solid (your sketch is dashed where it differs). Problems are built from vertex form, so the axis, vertex, and intercept are always whole numbers, with a opening up or down and b never 0.
- **Vertex table:** the same graphing table, same 50 chip wager and live sketch, but the equation is given in vertex form, y = a(x - h)² + k, for example y = 2(x + 3)² - 3. You find the axis (watch the sign: (x + 3) means h = -3), the vertex, and the y-intercept (plug in x = 0). The vertex's y-value is checked as k. One thing to know: in vertex form a sign slip on h gives a mirror-image parabola whose y-intercept is the same, so the live sketch won't flag it. The results screen does, drawing the true curve solid and the student's mirrored one dashed. Both graphing tables run on one shared engine (`createGraphTable` in `js/parabola-game.js`), so a fix to one is a fix to both.

- **Trinomial table:** factor a trinomial by "splitting the middle". **You wager first, and the wager sets the difficulty**: the trinomial is only dealt after you pick a bet, and a bigger bet means a bigger a·c.

  | Wager | Deals | Typical a·c | Pays |
  | --- | --- | --- | --- |
  | 10 | x² + bx + c, small numbers | up to 36 | 10 |
  | 25 | x² + bx + c, bigger numbers | 40 to 120 | 38 |
  | 50 | ax² + bx + c | 60 to 200 | 100 |
  | 100 | ax² + bx + c, bigger numbers | 150 to 400 | 300 |

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
  factoring.js   pure math + economy knobs (no DOM, unit tested)
  catalog.js     pure shop catalog: every item, price, and outfit rule (unit tested)
  store.js       shared save state (wallet, stats, owned and equipped items)
  content.js     data only: shops and sign copy
  textures.js    procedural pixel textures (no image files)
  avatar.js      blocky student with backpack and pencil; dress() applies an outfit
  pets.js        blocky dogs, cats, rabbits, Remy the calico, and the follower
  showcase.js    the camera that frames your avatar while a shop is open
  shop.js        the shop and closet window
  world.js       zones: village + casino, collision, NPCs
  player.js      movement and look
  ui.js          overlays, dialogs, shop window
  crafting.js    prime-factoring mini-game (practice table)
  trinomials.js  pure trinomial logic: generation, checking, worked solutions (unit tested)
  trinomial-game.js  the trinomial table interface
  radicals.js    pure radical logic: tiers, generation, checking, worked solutions (unit tested)
  radical-game.js  the radical table interface
  parabolas.js   pure parabola logic: problems, checking, graph window and curve (unit tested)
  parabola-game.js  the graphing-table engine, used by both the Parabola and Vertex tables
  arithmetic.js  pure logic for the timed arithmetic rounds: problems, the 60-second clock, scoring (unit tested)
  arithmetic-game.js  the chalkboard screen: rules page, countdown, number pad, results
  usmap-data.js  GENERATED: the 50 state outlines (do not edit; rebuild with tools/build-usmap.js)
  usmap.js       pure map logic: outlines, which state is at a point, the question deck (unit tested)
  map-game.js    the click-the-state screen on the wall map
  flag.js        the US flag, drawn to the official proportions (unit tested)
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
tools/build-usmap.js   rebuilds js/usmap-data.js (needs us-atlas, topojson-client, topojson-simplify)
```

## Adding things

- **A new zone:** write a `buildX(actions)` function in `world.js` that returns `createZone(...)`, add an `interact(...)` door to it, and register the action in `main.js`.
- **A new mini-game:** follow `crafting.js`. It opens an overlay, runs a round, and writes results to `Store`. Practice and wager are the same game with different rules, so a new game can reuse that pattern.
- **Shop items:** add a row to `js/catalog.js` (`add(...)` or `colored(...)`). Pets also need a palette in `js/pets.js`, and a new hat shape goes in `setHat` in `js/avatar.js`.
- **Prices:** `BASIC` (400), `GRAPHING` (600), and `SPECIAL` (1000) at the top of `js/catalog.js`.
- **Sign and shop-building copy:** edit `js/content.js`.
- **Economy:** `PRACTICE_REWARD` (20) in `js/factoring.js`, `REWARD` (1 chip per correct answer) and `DURATION_MS` (60 seconds) in `js/arithmetic.js`, `REWARD` (20 chips per state found) in `js/usmap.js`, `REWARD` (30 chips per blueprint) and the four `LEVELS` in `js/blueprint.js`, the wager tiers (`TIERS`: bet, multiplier, and problem size) in `js/trinomials.js` and `js/radicals.js`, and the parabola table's single `WAGER` and `MULT` in `js/parabolas.js`.

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
```

## Assets and naming

All textures and models are generated in code. The one exception is data, not art: the state outlines come from the US Census Bureau via the `us-atlas` package (ISC license). The game uses a blocky voxel style but no assets, names, or branding from any other game, and the project should keep it that way.

## Next up

A free-practice version of the trinomial table, exponent stacks in the prime grid (2⁴ as one slot), working hints in the Hint Shop, touch controls, a sound pass, and more casino games. (The prime-factoring game still has a one-shot wager mode in `crafting.js`; it just isn't attached to a table right now.)
