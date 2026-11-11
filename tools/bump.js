#!/usr/bin/env node
/* Bump the build number everywhere at once. From the project folder:

     node tools/bump.js          the next number (the current one plus 1)
     node tools/bump.js 50       a number you choose

   The game has one build number in three kinds of place, and they must always agree (a browser that mixes an old file with a new one is how a release breaks): `const BUILD = N` (and
   BUILD_GRAPH_TABLES) in the js files, the `?v=N` on every file link in index.html, and the "Build N" under the Play button. `node tools/bundle.js --version` checks that they agree, and the
   test runner will not run if they do not. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), bundle = require('./bundle');
const now = bundle.versions();
if (!now.ok) { console.error(`the version numbers already disagree: ?v= ${JSON.stringify(now.tags)}, BUILD ${JSON.stringify(now.builds)}. Fix that by hand first.`); process.exit(1); }
const from = Number(now.number), to = process.argv[2] ? Number(process.argv[2]) : from + 1;
if (!Number.isInteger(to) || to < 1) { console.error('the build number must be a whole number'); process.exit(1); }
let files = 0;
for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'))) {
  const p = path.join(ROOT, 'js', f), s = fs.readFileSync(p, 'utf8'), t = s.replace(/const (BUILD|BUILD_GRAPH_TABLES) = \d+;/g, `const $1 = ${to};`);
  if (t !== s) { fs.writeFileSync(p, t); files++; }
}
const ip = path.join(ROOT, 'index.html'), html = fs.readFileSync(ip, 'utf8');
fs.writeFileSync(ip, html.replace(/\?v=\d+"/g, `?v=${to}"`).replace(/Build \d+/g, `Build ${to}`));
const after = bundle.versions();
if (!after.ok || Number(after.number) !== to) { console.error('something did not take: check index.html and js/ by hand'); process.exit(1); }
console.log(`build ${from} -> ${to}: ${files} js files and index.html`);
