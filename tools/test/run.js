#!/usr/bin/env node
/* The test runner. From the project folder:

     node tools/test/run.js                  run what your changes affect (suites whose files changed since they last passed), cheapest first, stopping at the first failing tier
     node tools/test/run.js --full           run EVERYTHING, ignoring what passed before, including the deep suites (the check for when something bigger is wrong)
     node tools/test/run.js --list           show every suite and whether it is new / changed / unchanged, and run nothing
     node tools/test/run.js --list --files js/poly-game.js css/style.css     show what WOULD be affected if those files changed (nothing is run, nothing is touched)
     node tools/test/run.js --list --affected     (with either form) show only the suites that would run
     node tools/test/run.js --suite NAME[,NAME]     run just these (names from --list), whatever their state
     node tools/test/run.js --tier unit|sim|browser|deep     run just that tier (affected ones only; add --full to force)
     node tools/test/run.js --keep-going     do not stop at the first failing tier
     node tools/test/run.js --check-map      check every source file is covered by at least one suite (a file nobody tests is a bug in the map)

   How "affected" works. Every suite lists the files it covers. After a suite passes, the runner saves a fingerprint of those files (tools/test/.test-cache.json). Next time a suite
   runs only if its fingerprint changed (or it has never passed). Unit suites (tests/*.test.js) need no list: the files they require() are their files.
   Tiers, cheapest first:  unit (plain Node, seconds)  ->  sim (the game in jsdom, seconds)  ->  browser (real Chromium, minutes)  ->  deep (long checks, only with --full or --tier deep).
   A failed browser suite is retried once (software rendering is slow and timing-sensitive); if the retry passes it is reported as flaky, never as a clean pass. */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawnSync } = require('child_process');
const { ROOT, TEST } = require('./lib/util');
const bundle = require('../bundle');

const CACHE = path.join(TEST, '.test-cache.json');
const args = process.argv.slice(2), flag = f => args.includes(f), val = f => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const TIERS = ['unit', 'sim', 'browser', 'deep'];
const LIBS = { unit: [], sim: ['tools/test/lib/sim.js', 'tools/test/lib/util.js'], browser: ['tools/test/lib/browser.js', 'tools/test/lib/util.js', 'tools/test/lib/scan.js', 'tools/test/lib/windows.js'], deep: ['tools/test/lib/browser.js', 'tools/test/lib/util.js', 'tools/test/lib/scan.js', 'tools/test/lib/windows.js'] };

/* ---------- files and fingerprints ---------- */
const allFiles = bundle.projectFiles();
const globRe = g => new RegExp('^' + g.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$');
const expand = patterns => [...new Set(patterns.flatMap(p => (p.includes('*') ? allFiles.filter(f => globRe(p).test(f)) : fs.existsSync(path.join(ROOT, p)) ? [p] : [])))].sort();
const sha = f => crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
const fingerprint = files => crypto.createHash('sha1').update(files.map(f => `${f}:${sha(f)}`).join('\n')).digest('hex');

/* ---------- discovering suites ---------- */
function discover() {
  const suites = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'tests')).filter(f => f.endsWith('.test.js')).sort()) {
    const src = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'), files = new Set([`tests/${f}`]);
    for (const m of src.matchAll(/['"`]\.\.\/([\w./-]+)['"`]/g)) {                       // anything the test loads: '../js/x.js', '../css/style.css', '../books' (a folder means everything under it)
      const p = m[1].replace(/\/$/, ''), full = path.join(ROOT, p); if (!fs.existsSync(full)) continue;
      if (fs.statSync(full).isDirectory()) allFiles.filter(f => f.startsWith(p + '/')).forEach(f => files.add(f)); else files.add(p);
    }
    suites.push({ name: `unit:${f.replace('.test.js', '')}`, tier: 'unit', covers: [...files], file: path.join(ROOT, 'tests', f), kind: 'script' });
  }
  const dir = path.join(TEST, 'suites');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort() : []) {
    const mod = require(path.join(dir, f));
    if (!TIERS.includes(mod.tier)) throw new Error(`${f}: tier must be one of ${TIERS.join(', ')}`);
    suites.push({ name: mod.name || f.replace('.js', ''), tier: mod.tier, covers: [...(mod.covers || []), `tools/test/suites/${f}`, ...LIBS[mod.tier]], run: mod.run, timeout: mod.timeout, kind: 'module', needs: mod.needs });
  }
  for (const s of suites) { s.files = expand(s.covers); s.print = fingerprint(s.files); }
  return suites;
}

const loadCache = () => { try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) { return {}; } };
const saveCache = c => fs.writeFileSync(CACHE, JSON.stringify(c, null, 1));

/* ---------- the shared browser: launched once, soft-reset between suites ---------- */
let session = null;
async function getBrowser() {
  const B = require('./lib/browser');
  if (session) { try { await softReset(session); return session; } catch (e) { try { await session.close(); } catch (e2) {} session = null; } }
  session = await B.launch({});
  await session.page.evaluate(() => { window.__origRandom = Math.random; });
  return session;
}
async function softReset(g) {
  g.errors.length = 0; await g.page.setViewport({ width: 1280, height: 800 });
  await g.page.evaluate(() => {
    Math.random = window.__origRandom || Math.random;
    Store.reset(); const G = __primeTime; G.setZone(G.hub, G.hub.spawn);
  });
  await g.closeAll();
}

/* ---------- running one suite ---------- */
const sims = [];
const timeoutAfter = (ms, what) => new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out after ${Math.round(ms / 1000)} s: ${what}`)), ms));
async function runOne(s) {
  const t0 = Date.now();
  try {
    if (s.kind === 'script') {
      const r = spawnSync('node', [s.file], { cwd: ROOT, encoding: 'utf8', timeout: 90000 });
      if (r.status !== 0) throw new Error(((r.stderr || '') + (r.stdout || '')).split('\n').filter(l => l && !/^\s+at /.test(l)).slice(-6).join('\n') || `exit ${r.status}`);
    } else {
      const ctx = {
        log: (...a) => console.log('      ', ...a),
        sim: () => { const x = require('./lib/sim').create(); sims.push(x); return x; },
        browser: () => getBrowser(),
      };
      await Promise.race([s.run(ctx), timeoutAfter(s.timeout || (s.tier === 'sim' ? 120000 : 600000), s.name)]);
      if (session && session.errors.length && s.tier !== 'unit' && s.needs !== 'errors-ok') throw new Error(`errors in the browser console: ${session.errors.slice(0, 3).join(' | ')}`);
    }
    return { ok: true, ms: Date.now() - t0 };
  } catch (e) { return { ok: false, ms: Date.now() - t0, error: String(e.message || e) }; }
  finally { while (sims.length) { try { sims.pop().w.close(); } catch (e) {} } }
}

/* ---------- main ---------- */
async function main() {
  const v = bundle.versions();
  if (!v.ok) { console.error(`version mismatch: ?v= tags ${JSON.stringify(v.tags)}, BUILD values ${JSON.stringify(v.builds)}\n(fix: every ?v= in index.html and every BUILD in js/ must be the same number)`); process.exit(1); }
  const suites = discover(), cache = loadCache(), full = flag('--full');

  if (flag('--check-map')) {
    const covered = new Set(suites.flatMap(s => s.files)), need = allFiles.filter(f => /^(js|css)\/.+\.(js|css)$/.test(f) || f === 'index.html');
    const missing = need.filter(f => !covered.has(f));
    if (missing.length) { console.error(`not covered by any suite:\n  ${missing.join('\n  ')}`); process.exit(1); }
    console.log(`every one of the ${need.length} source files is covered by at least one suite (${suites.length} suites)`); return;
  }

  // what is affected: a suite is affected if it never passed, or the files it covers changed since it did (or you named files with --files)
  const fakeChanged = flag('--files') ? args.slice(args.indexOf('--files') + 1).filter(a => !a.startsWith('--')) : null;
  const status = s => (fakeChanged ? (s.files.some(f => fakeChanged.includes(f)) ? 'changed' : 'unchanged') : !cache[s.name] ? 'new' : cache[s.name].print !== s.print ? 'changed' : 'unchanged');
  if (flag('--list')) {
    console.log(`build ${v.number}\n`); const w = Math.max(...suites.map(s => s.name.length));
    for (const t of TIERS) for (const s of suites.filter(s => s.tier === t && (!flag('--affected') || status(s) !== 'unchanged'))) console.log(`  ${t.padEnd(8)}${s.name.padEnd(w + 2)}${status(s).padEnd(10)}${s.files.length} files${cache[s.name] && !fakeChanged ? `  (last passed ${cache[s.name].when}, ${(cache[s.name].ms / 1000).toFixed(1)}s${cache[s.name].flaky ? ', flaky' : ''})` : ''}`);
    const aff = suites.filter(s => s.tier !== 'deep' && status(s) !== 'unchanged');
    console.log(`\n${aff.length} of ${suites.filter(s => s.tier !== 'deep').length} regular suites would run (${aff.filter(s => s.tier === 'browser').length} in the real browser). Deep suites run only with --full.`);
    return;
  }

  let todo;
  if (val('--suite')) { const names = val('--suite').split(','); todo = suites.filter(s => names.some(n => s.name === n || s.name.endsWith(':' + n))); const bad = names.filter(n => !todo.some(s => s.name === n || s.name.endsWith(':' + n))); if (bad.length) { console.error(`no such suite: ${bad.join(', ')} (see --list)`); process.exit(2); } }
  else { todo = suites.filter(s => (full ? true : s.tier !== 'deep' && status(s) !== 'unchanged') && (!val('--tier') || s.tier === val('--tier')) && (s.tier !== 'deep' || full || val('--tier') === 'deep')); }
  const skipped = suites.filter(s => !todo.includes(s) && s.tier !== 'deep' && status(s) === 'unchanged' && (!val('--tier') || s.tier === val('--tier')));
  console.log(`build ${v.number}: ${todo.length} suites to run${full ? ' (full check)' : ''}, ${skipped.length} unchanged since they last passed${flag('--keep-going') ? '' : ''}\n`);

  const results = []; let failedTier = null;
  for (const t of TIERS) {
    const batch = todo.filter(s => s.tier === t); if (!batch.length) continue;
    if (failedTier && !flag('--keep-going')) { batch.forEach(s => results.push({ s, skipped: true })); console.log(`  - ${t}: ${batch.length} suites not run (a ${failedTier} suite failed; fix that first, or use --keep-going)`); continue; }
    for (const s of batch) {
      process.stdout.write(`  ${s.name} ... `); let r = await runOne(s), flaky = false;
      if (!r.ok && (s.tier === 'browser' || s.tier === 'deep')) { process.stdout.write('failed, retrying once ... '); const r2 = await runOne(s); if (r2.ok) { r = r2; flaky = true; } else r = { ...r2, first: r.error }; }
      console.log(r.ok ? `${flaky ? 'passed on the retry (FLAKY: it failed once first)' : 'ok'} (${(r.ms / 1000).toFixed(1)}s)` : `FAILED (${(r.ms / 1000).toFixed(1)}s)`);
      if (!r.ok) { console.log(r.error.split('\n').map(l => '      ' + l).join('\n')); failedTier = failedTier || t; }
      results.push({ s, ...r, flaky });
      if (r.ok) { cache[s.name] = { print: s.print, when: new Date().toISOString().slice(0, 16).replace('T', ' '), ms: r.ms, flaky }; saveCache(cache); }
      else if (cache[s.name]) { delete cache[s.name]; saveCache(cache); }
    }
  }
  if (session) { try { await session.close(); } catch (e) {} }

  const ran = results.filter(r => !r.skipped), failed = ran.filter(r => !r.ok), flaky = ran.filter(r => r.ok && r.flaky), notRun = results.filter(r => r.skipped);
  console.log(`\n${failed.length ? 'FAILED' : 'PASSED'}: ${ran.length - failed.length} passed, ${failed.length} failed${flaky.length ? `, ${flaky.length} flaky` : ''}, ${skipped.length} skipped as unchanged${notRun.length ? `, ${notRun.length} not run` : ''}  (${((Date.now() - T0) / 1000).toFixed(0)}s)`);
  failed.forEach(r => console.log(`  FAILED  ${r.s.name}`)); flaky.forEach(r => console.log(`  FLAKY   ${r.s.name}`));
  fs.writeFileSync(path.join(TEST, 'last-run.json'), JSON.stringify({ when: new Date().toISOString(), full, results: ran.map(r => ({ name: r.s.name, ok: r.ok, flaky: !!r.flaky, ms: r.ms, error: r.error })) }, null, 1));
  process.exit(failed.length ? 1 : 0);
}
const T0 = Date.now();
main().catch(e => { console.error(e.stack || e); process.exit(2); });
