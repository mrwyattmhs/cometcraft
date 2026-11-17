// Run with: node tests/github-pack.test.js
// tools/github-pack.js finds the files that differ from what is on GitHub, and packs only those (GitHub's web upload takes 100 files at a time). The pure parts are tested directly; the whole
// thing is tested against a real git repository made in a temporary folder (a stand-in for GitHub: git clones it exactly as it would clone the real one). Skipped if git is not installed.
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const { execFileSync } = require('child_process');
const G = require('../tools/github-pack.js'), B = require('../tools/bundle.js');
const git = (...a) => execFileSync('git', a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
let haveGit = true; try { git('--version'); } catch (e) { haveGit = false; }

/* ---------- the fingerprint is git's own ---------- */
assert.strictEqual(G.blobSha(Buffer.alloc(0)), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391', 'the empty file');
assert.strictEqual(G.blobSha(Buffer.from('hello\n')), 'ce013625030ba8dba906f756967f9e9ca394464a', 'a known file');
if (haveGit) for (const buf of [Buffer.from('const x = 1;\n'), Buffer.from([0, 255, 128, 10, 13, 0]), Buffer.alloc(100000, 'ab'), Buffer.from('caf\u00e9 \u2212 \u00b2\n')]) {
  const f = path.join(os.tmpdir(), `blob-${process.pid}.bin`); fs.writeFileSync(f, buf); assert.strictEqual(G.blobSha(buf), git('hash-object', f).trim(), `${buf.length} bytes: the same as git hash-object`); fs.rmSync(f);
}
assert.notStrictEqual(G.blobSha(Buffer.from('a')), G.blobSha(Buffer.from('b')));

/* ---------- packs ---------- */
const nums = n => Array.from({ length: n }, (_, i) => `f${String(i).padStart(3, '0')}`);
assert.deepStrictEqual(G.chunk([], 90), []); assert.deepStrictEqual(G.chunk(nums(90), 90).map(c => c.length), [90]); assert.deepStrictEqual(G.chunk(nums(91), 90).map(c => c.length), [90, 1]); assert.deepStrictEqual(G.chunk(nums(250), 90).map(c => c.length), [90, 90, 70]);
assert.deepStrictEqual(G.chunk(nums(250), 90).flat(), nums(250), 'nothing lost, nothing reordered'); assert.deepStrictEqual(G.chunk(nums(3), 1), [['f000'], ['f001'], ['f002']]);

/* ---------- where the project sits in the repository ---------- */
const R = entries => new Map(entries);
assert.strictEqual(G.findPrefix(R([['js/main.js', 'a'], ['index.html', 'b']])), ''); assert.strictEqual(G.findPrefix(R([['site/js/main.js', 'a'], ['README.md', 'b']])), 'site/'); assert.strictEqual(G.findPrefix(R([['docs/game/js/main.js', 'a']])), 'docs/game/');
assert.strictEqual(G.findPrefix(R([['README.md', 'a']])), '', 'an empty repository: the top'); assert.strictEqual(G.findPrefix(new Map()), '');

/* ---------- what differs ---------- */
{ const local = new Map([['index.html', 'A'], ['js/a.js', 'B'], ['js/b.js', 'C'], ['tests/t.js', 'D'], ['README.md', 'E']]);
  let d = G.compare(local, R([['index.html', 'A'], ['js/a.js', 'B'], ['js/b.js', 'C'], ['tests/t.js', 'D'], ['README.md', 'E']]));
  assert.deepStrictEqual([d.upload, d.remove, d.ignored, d.same], [[], [], [], 5], 'identical: nothing to do');
  d = G.compare(local, R([['index.html', 'A'], ['js/a.js', 'OLD'], ['tests/t.js', 'D'], ['README.md', 'E'], ['js/gone.js', 'X'], ['CNAME', 'Y'], ['.nojekyll', 'Z'], ['.github/workflows/x.yml', 'W'], ['tools/old.js', 'V']]));
  assert.deepStrictEqual(d.upload, [{ file: 'js/a.js', status: 'changed' }, { file: 'js/b.js', status: 'new' }], 'changed and new, in order'); assert.deepStrictEqual(d.remove, ['js/gone.js', 'tools/old.js'], 'only the project\'s own old files are reported for deletion');
  assert.deepStrictEqual(d.ignored, ['.github/workflows/x.yml', '.nojekyll', 'CNAME'], 'anything else on GitHub is left alone'); assert.strictEqual(d.same, 3);
  assert.deepStrictEqual(G.compare(new Map(), R([['js/a.js', 'B']])).remove, ['js/a.js'], 'a project with nothing: everything on GitHub is old');
  assert.strictEqual(G.compare(local, new Map()).upload.length, 5, 'an empty repository: everything is new'); assert.ok(G.compare(local, new Map()).upload.every(u => u.status === 'new'));
  d = G.compare(local, R([['site/index.html', 'A'], ['site/js/a.js', 'OLD'], ['site/js/zzz.js', 'Q'], ['README.md', 'top-level readme of the repository'], ['site/CNAME', 'c']]), 'site/');
  assert.deepStrictEqual(d.upload.map(u => `${u.status}:${u.file}`), ['new:README.md', 'changed:js/a.js', 'new:js/b.js', 'new:tests/t.js'], 'with a prefix, files are matched inside it (the repository\'s own top-level README is not the project\'s)'); assert.deepStrictEqual(d.remove, ['site/js/zzz.js']); assert.deepStrictEqual(d.ignored, ['site/CNAME'], 'and the repository\'s own top-level files are not touched');
  for (const k of ['js/', 'css/', 'tests/', 'tools/']) assert.ok(G.OWNED.test(`${k}x.js`), `${k} is the project's`); for (const k of ['index.html', 'README.md', '.gitignore']) assert.ok(G.OWNED.test(k)); for (const k of ['CNAME', '.nojekyll', 'LICENSE', '.github/x.yml', 'docs/x.md', 'jsx/a.js']) assert.ok(!G.OWNED.test(k), `${k} is not`); }

/* ---------- the real thing, against a real repository ---------- */
function readZip(file) {
  const b = fs.readFileSync(file), out = new Map(); let e = b.length - 22; while (b.readUInt32LE(e) !== 0x06054b50) e--;
  let p = b.readUInt32LE(e + 16); const n = b.readUInt16LE(e + 10);
  for (let i = 0; i < n; i++) { const method = b.readUInt16LE(p + 10), csize = b.readUInt32LE(p + 20), nameLen = b.readUInt16LE(p + 28), extra = b.readUInt16LE(p + 30), com = b.readUInt16LE(p + 32), off = b.readUInt32LE(p + 42), name = b.slice(p + 46, p + 46 + nameLen).toString('utf8');
    const lh = off + 30 + b.readUInt16LE(off + 26) + b.readUInt16LE(off + 28), raw = b.slice(lh, lh + csize); out.set(name, method === 8 ? zlib.inflateRawSync(raw) : raw); p += 46 + nameLen + extra + com; }
  return out;
}
if (!haveGit) console.log('git is not installed: the repository tests are skipped');
else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghpack-')), all = B.projectFiles(), local = f => fs.readFileSync(path.join(B.ROOT, f));
  const makeRemote = (name, { under = '', edit = [], drop = [], extra = {} } = {}) => {
    const dir = path.join(tmp, name); fs.mkdirSync(dir);
    for (const f of all) { if (drop.includes(f)) continue; const t = path.join(dir, under + f); fs.mkdirSync(path.dirname(t), { recursive: true }); fs.writeFileSync(t, edit.includes(f) ? Buffer.concat([local(f), Buffer.from('\n// an older version\n')]) : local(f)); }
    for (const [f, c] of Object.entries(extra)) { const t = path.join(dir, f); fs.mkdirSync(path.dirname(t), { recursive: true }); fs.writeFileSync(t, c); }
    git('-C', dir, 'init', '-q', '-b', 'main'); git('-C', dir, 'add', '-A'); git('-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'x'); return `file://${dir}`;
  };
  const out = path.join(tmp, 'out'), has = f => fs.existsSync(path.join(out, f));
  try {
    /* some files changed, one missing, one old, and two that are not the project's */
    let r = G.run({ repo: makeRemote('r1', { edit: ['js/clock.js'], drop: ['js/lab.js'], extra: { 'js/old-thing.js': 'old\n', '.nojekyll': '', CNAME: 'x.org\n' } }), out });
    assert.deepStrictEqual(r.upload.map(u => `${u.status}:${u.file}`), ['changed:js/clock.js', 'new:js/lab.js'], 'exactly the changed and the missing file'); assert.deepStrictEqual(r.remove, ['js/old-thing.js']); assert.deepStrictEqual(r.ignored, ['.nojekyll', 'CNAME']); assert.strictEqual(r.same, all.length - 2);
    assert.strictEqual(r.packs.length, 1); const z = readZip(r.packs[0].zip); assert.deepStrictEqual([...z.keys()].sort(), ['js/clock.js', 'js/lab.js'], 'the pack holds only those two'); for (const [name, buf] of z) assert.ok(buf.equals(local(name)), `${name} in the pack is the project's file, byte for byte`);
    assert.ok(/UPLOAD 2 file\(s\)/.test(r.text) && /changed  js\/clock.js/.test(r.text) && /new      js\/lab.js/.test(r.text) && /DELETE from GitHub 1 file/.test(r.text) && /js\/old-thing.js/.test(r.text) && /CNAME/.test(r.text), 'the list says what to do'); assert.ok(has('github-update.txt') && has('github-update-1.zip'));
    /* up to date: nothing to upload, and the last run's pack is gone (not mixed in) */
    r = G.run({ repo: makeRemote('r2'), out }); assert.deepStrictEqual([r.upload, r.remove, r.packs.length, r.same], [[], [], 0, all.length]); assert.ok(/already up to date/.test(r.text)); assert.ok(!has('github-update-1.zip'), 'an old pack is removed'); assert.ok(has('github-update.txt'));
    /* a small --max makes more packs */
    r = G.run({ repo: makeRemote('r3', { edit: ['js/clock.js', 'js/lab.js', 'css/style.css'] }), out, max: 2 }); assert.deepStrictEqual(r.packs.map(p => p.files.length), [2, 1], 'three files, at most two to a pack'); assert.ok(has('github-update-1.zip') && has('github-update-2.zip') && !has('github-update-3.zip'));
    assert.deepStrictEqual([...readZip(r.packs[0].zip).keys(), ...readZip(r.packs[1].zip).keys()].sort(), ['css/style.css', 'js/clock.js', 'js/lab.js']);
    /* the project in a sub-folder of the repository */
    r = G.run({ repo: makeRemote('r4', { under: 'site/', edit: ['js/daily.js'], extra: { 'README.md': 'the repository readme\n' } }), out });
    assert.strictEqual(r.prefix, 'site/'); assert.deepStrictEqual(r.upload.map(u => u.file), ['js/daily.js'], 'matched inside site/: only the edited file'); assert.deepStrictEqual(r.remove, [], 'the repository\'s own readme is not reported as old');
    assert.deepStrictEqual([...readZip(r.packs[0].zip).keys()], ['site/js/daily.js'], 'and the pack puts it back inside site/');
    /* a repository with nothing in it but a readme: everything is new */
    r = G.run({ repo: makeRemote('r5', { drop: all, extra: { LICENSE: 'MIT\n' } }), out, max: 90 }); assert.strictEqual(r.upload.length, all.length); assert.deepStrictEqual(r.ignored, ['LICENSE'], 'the licence file is left alone'); assert.ok(r.packs.every(p => p.files.length <= 90), 'every pack is under the limit'); assert.strictEqual(r.packs.flatMap(p => p.files).length, all.length);
    /* mistakes are explained */
    assert.throws(() => G.run({ repo: 'file:///no/such/repository', out }), /could not fetch file:\/\/\/no\/such\/repository.*public/s); assert.throws(() => G.run({ out }), /give --repo/);
    /* --split: the whole project in packs, the game first and by itself */
    r = G.run({ split: true, max: 90, out }); const names = r.packs.map(p => p.files);
    assert.ok(names.every(f => f.length <= 90 && f.length >= 1), 'every pack is under the limit'); assert.deepStrictEqual(names.flat().sort(), all.slice().sort(), 'every file of the project, exactly once');
    assert.ok(names[0].every(f => /^(index\.html$|css\/|js\/)/.test(f)) && names[0].length === all.filter(f => /^(index\.html$|css\/|js\/)/.test(f)).length, 'pack 1 is the game and nothing else'); assert.ok(names[1].every(f => f.startsWith('tests/')) && names[2].every(f => f.startsWith('tools/')), 'then the tests, then the tools');
    assert.ok(readZip(r.packs[0].zip).has('index.html') && has('github-part-1.zip') && has('github-parts.txt')); r = G.run({ split: true, max: 20, out }); assert.ok(r.packs.every(p => p.files.length <= 20) && r.packs.flatMap(p => p.files).length === all.length, 'a smaller limit: more packs, same files');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
console.log('github pack tests passed');
