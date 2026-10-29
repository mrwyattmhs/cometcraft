# Testing Prime Time

Everything lives in the project (`tools/`), so a fresh machine only needs `npm install` in this folder.

## The two commands you actually use

```
node tools/test/run.js          # test what you changed (and nothing else)
node tools/test/run.js --full   # test EVERYTHING (about 5 minutes): use it when something bigger is wrong, or before a release
```

`run.js` runs the cheapest tests first and stops at the first failing tier (unit, then sim, then browser), so a typo costs seconds, not minutes.

Other options: `--list` (every suite and whether it is new / changed / unchanged), `--list --files js/world.js css/style.css` (what *would* run if those files changed; nothing is run),
`--list --affected`, `--suite NAME[,NAME]`, `--tier unit|sim|browser|deep`, `--keep-going`, `--check-map` (every source file is covered by some suite).

## How "only what changed" works

Each suite lists the files it covers. After a suite passes, the runner saves a fingerprint of those files in `.test-cache.json` (not shipped in the zip). Next time a suite runs only if
its fingerprint changed, or it has never passed. A README edit runs nothing; a change to `js/polys.js` runs the Polynomials unit test, the Polynomials simulated flow and the Polynomials typing
test (about a minute); a CSS change runs the four browser suites that render windows (about 3 minutes). Unit suites (`tests/*.test.js`) need no list: the files they `require()` are theirs.

Rough costs on the slow machine these were written on (software rendering, about 1.5 frames a second): unit 40 s in all, sim 8 s in all, browser: tour 95 s, play-polys 35-70 s,
play-cubes 17 s, play-mines 7-15 s, walk 45-55 s, plus about 25 s once to start the browser.

## The tiers and suites

| Tier | What it is | Suites |
|---|---|---|
| unit | plain Node, the rules and the data | `tests/*.test.js` (22: payouts, trophies, every game's maths, the casino plan, the green palette's contrast ...) |
| sim | the game in jsdom, its own files loaded, no real layout | `sim:windows` (every window: template, header, pay, opens and closes), `sim:world` (the layout, measured, with a flood fill from the start), `sim:polynomials`, `sim:cubes` |
| browser | real Chromium | `browser:tour` (every window in every state, desktop and phone: template, readable text, fits, a seeded click-around), `browser:play-polys`, `browser:play-cubes`, `browser:play-mines` (real typing and clicking, and the arches measured on screen), `browser:walk` (a real keyboard walk through the archway to the tables) |
| deep | long checks, only with `--full` or `--tier deep` | none yet |

**Not rebuilt yet** (the old versions were lost when the work machine reset): the casino exterior flicker check, the chapel, the dorm's 3D pixels, and real-input flows for Lines, Coaster,
Practice, the library and the map. Their logic is covered by the unit tests and their windows by the tour. Add suites here when you change that code.

## Test the tests

```
node tools/test/self-check.js           # about 1 minute
node tools/test/self-check.js --slow    # adds the real-browser breaks, about 5 minutes
```

It copies the project, breaks one thing at a time in the copy (a trophy never awarded, a window without the template, the minefield back beside the lamp ...) and requires the right
suite to fail. **Whenever a bug gets past the suites, add a line to `MUTATIONS` for it.** It has already found a hole once.

## The bundler

```
node tools/bundle.js            # dist/prime-time-preview.html (one file, for the artifact preview) and dist/prime-time.zip
node tools/bundle.js --check    # is dist/ stale?     node tools/bundle.js --version    # do every ?v= and BUILD agree?
```
It reproduces the published preview byte for byte, and the zip is deterministic. `run.js` refuses to run if the version numbers disagree.
To release: bump `BUILD` in `js/*.js` and every `?v=` in `index.html` together, `node tools/test/run.js`, then `node tools/bundle.js --out <where it goes>`.

## Setup

`cd tools/test && npm install` (the versions are pinned; Three.js must stay at r128, which is what the game uses). Chromium: `CHROME_PATH=/path/to/chrome`, or it finds one in `~/.cache/puppeteer`.
`GAME_ROOT=/path/to/an/unzipped/copy node tools/test/run.js --suite tour` tests that copy instead of the project.

## Writing a suite

A file in `tools/test/suites/` exporting `{ name, tier: 'sim'|'browser'|'deep', covers: ['js/x.js', 'css/*.css', ...], run(ctx) }`. `ctx.sim()` gives a fresh simulated game
(`s.T.Store`, `s.$('id')`, `s.click(el)`, `s.key('KeyE')`, `s.seed(n)`, `s.exec('PolyMulGame.open()')`); `await ctx.browser()` gives the shared Chromium (`g.page`, `g.at(x, z, yaw, pitch)`,
`g.closeAll()`, `g.shot(file)`). Throw (assert) to fail. List only the files the suite really depends on: too wide and it reruns for nothing, too narrow and it misses a break (`--check-map` and the self-check help).

## Lessons that cost time (so they do not again)

- **Judge a test by its exit code**, not by looking for the word "passed" in its output: a file can print "passed" and then crash.
- **jsdom arrays are a different type** from Node's: `assert.deepStrictEqual(fromTheGame, [1, 2])` fails even when equal. Copy with `plain(...)` first.
- **The game ignores keys until Play is pressed**, and **hiding a window with CSS leaves the game thinking it is open**: use `g.closeAll()` (it presses Escape the way a player does).
- **Software rendering is slow and uneven** (1-3 frames a second): wait for a condition, never a fixed pause; walks are short; a browser suite that fails once is retried once, and a retry-pass is reported as FLAKY.
- **Measure, do not hard-code**: positions come from the game's own constants (`Minesweeper.PLOT_AT`, `CasinoInterior.TABLES`), so moving something does not break fifty tests.
