#!/usr/bin/env node
/* Test the tests. From the project folder:   node tools/test/self-check.js   (add --slow to include the real-browser mutations, about 2 more minutes)

   A suite that quietly stopped checking what it claims to is worse than no suite. So this copies the project to a temporary folder, breaks one thing at a time in the COPY (the project
   itself is never touched), runs the suite that is supposed to notice, and requires it to FAIL. Every line below says what was broken and which suite caught it. If one is not caught,
   that suite has a hole: fix the suite, not this list.  Add a line here whenever a bug slips through a suite. */
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), slow = process.argv.includes('--slow');

/** [what is broken, file, text to find, text to put instead, suite that must fail, slow?] */
const MUTATIONS = [
  ['a right answer no longer earns trophy progress (Polynomials)', 'js/poly-game.js', ' Trophies.award(cfg.trophy);', '', 'sim:polynomials'],
  ['Enter in a box checks AND skips to the next problem (Polynomials)', 'js/poly-game.js', 'e.preventDefault(); e.stopPropagation(); check(); }', 'e.preventDefault(); check(); }', 'sim:polynomials'],
  ['the minus sign is not distributed with arches (Polynomials)', 'js/poly-game.js', "items: sub ? [{ lit:", "items: false ? [{ lit:", 'sim:polynomials'],
  ['the arches go to the wrong terms (Polynomials)', 'js/poly-game.js', "to: `R${x.j}`, color: x.i % 3, side:", "to: `R${x.i}`, color: x.i % 3, side:", 'sim:polynomials'],
  ['a wrong first round of a cube is forgiven (Polynomials)', 'js/poly-game.js', 'const ok = stageOk.every(Boolean)', 'const ok = stageOk[stageOk.length - 1]', 'sim:polynomials'],
  ['Hard pays 40, not 50 (Economy)', 'js/economy.js', 'polymul: [10, 25, 50]', 'polymul: [10, 25, 40]', 'unit:economy'],
  ['Hard pays 40, not 50 (Economy): the Polynomials suite also pins the displayed pay', 'js/economy.js', 'polymul: [10, 25, 50]', 'polymul: [10, 25, 40]', 'sim:polynomials'],
  ['Enter in a box checks AND skips ahead (Cubes)', 'js/cubes-game.js', 'e.preventDefault(); e.stopPropagation(); check(); }', 'e.preventDefault(); check(); }', 'sim:cubes'],
  ['the Cubes trophy is never awarded', 'js/cubes-game.js', " Trophies.award('cubes');", '', 'sim:cubes'],
  ['a window loses the green template (Parabola)', 'index.html', '<div id="par" class="overlay hidden kelly"', '<div id="par" class="overlay hidden"', 'sim:windows'],
  ['an old-style header is left on a window (Library)', 'index.html', '<header class="craft-head">\n        <div class="k-title">\n          <span class="k-wing">Park</span>', '<header class="craft-head">\n        <div class="k-title">\n          <span class="k-nowing">Park</span>', 'sim:windows'],
  ['the minefield moves back beside the dorm\'s lamp', 'js/minesweeper.js', 'const PLOT_AT = { x0: 30.8, z0: 25.0 };', 'const PLOT_AT = { x0: 24.8, z0: 25.0 };', 'sim:world'],
  ['the coaster table goes back to the Graphing wing', 'js/casino-interior.js', 'coaster: { x: 7.5, z: -30.5 }', 'coaster: { x: 39, z: 5.2 }', 'sim:world'],
  ['a tree is planted on the minefield', 'js/world.js', '[31, 2], [47, 20], [54, 28]', '[31, 2], [47, 20], [36, 30]', 'sim:world'],
  ['the multiplication of polynomials is wrong', 'js/polys.js', 'r[i + j] += a * b;', 'r[i + j] += a + b;', 'unit:polys'],
  ['a trophy sentence names the wrong wing', 'js/trophies.js', "at the Polynomial Coaster table in the casino's Polynomials wing", "at the Polynomial Coaster table in the casino's Graphing wing", 'unit:trophies'],
  ['the casino plan loses a table', 'js/casino-interior.js', 'cubes: { x: -39, z: 5.2 },', '', 'unit:casino'],
  ['version numbers disagree (index.html says 38)', 'index.html', 'css/style.css?v=39', 'css/style.css?v=38', 'VERSION'],
  // the real browser: slow
  ['white text on a cream card (the old Lines bug)', 'css/style.css', '.kelly .lin-steps li.active { background: #1e6314;', '.kelly .lin-steps li.active { background: #fff6cf;', 'browser:tour', true],
  ['a window is wider than a phone', 'css/style.css', '.kelly.overlay { background: rgba(6, 22, 6, .66); grid-template-columns: minmax(0, 1fr); }', '.kelly.overlay { background: rgba(6, 22, 6, .66); }', 'browser:play-polys', true],
  ['blanks lose their arch-colour outline', 'js/poly-game.js', "bx.style.borderColor = ARC_COLORS[row.color % 3]; bx.classList.add('outlined');", "bx.classList.add('outlined');", 'browser:play-polys', true],
  ['the archway is walled off', 'js/casino-interior.js', 'box(g, \'wallGild\', 2 * ARCH.halfWidth, HH - ARCH.height, WALL, 0, ARCH.height + (HH - ARCH.height) / 2, nz);', 'solid(zone, 0, nz, 2 * ARCH.halfWidth, WALL, HH);', 'browser:walk', true],
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'selfcheck-'));
fs.cpSync(ROOT, tmp, { recursive: true, filter: p => !/(^|\/)(node_modules|\.git|dist|\.cache)(\/|$)|\.test-cache\.json$/.test(path.relative(ROOT, p)) });
fs.symlinkSync(path.join(ROOT, 'tools/test/node_modules'), path.join(tmp, 'tools/test/node_modules'));

let missed = 0, ran = 0;
console.log(`breaking things in a copy (${tmp}), one at a time${slow ? ', including the slow browser ones' : ''}:\n`);
for (const [what, file, find, put, suite, isSlow] of MUTATIONS) {
  if (isSlow && !slow) { console.log(`  (skipped, slow)  ${what}`); continue; }
  const f = path.join(tmp, file), orig = fs.readFileSync(f, 'utf8');
  if (!orig.includes(find)) { console.log(`  ?  ${what}: the text to break was not found in ${file} (the code changed: update this line)`); missed++; continue; }
  fs.writeFileSync(f, orig.replace(find, put));
  const args = suite === 'VERSION' ? ['tools/bundle.js', '--version'] : ['tools/test/run.js', '--suite', suite];
  const t0 = Date.now(), r = spawnSync('node', args, { cwd: tmp, encoding: 'utf8', timeout: 600000 });
  fs.writeFileSync(f, orig); ran++;
  const caught = r.status !== 0;
  console.log(`  ${caught ? 'caught' : 'NOT CAUGHT'}  ${what}  [${suite}, ${((Date.now() - t0) / 1000).toFixed(0)}s]`);
  if (!caught) missed++;
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${missed ? `${missed} problem${missed > 1 ? 's' : ''}: a suite has a hole` : `all ${ran} deliberate breaks were caught`}`);
process.exit(missed ? 1 : 0);
