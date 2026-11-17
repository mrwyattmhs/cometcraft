#!/usr/bin/env node
/* GITHUB PACKS. GitHub's web page takes 100 files in one upload, and this project has 150. You do not have to upload 150 each time: most changes touch a dozen files. This tool finds out which.

     node tools/github-pack.js --repo https://github.com/you/prime-time [--branch main] [--out DIR] [--max 90]
         Fetches what is on GitHub right now (a shallow clone: no login needed for a public repository), compares every file of the project with it, and writes only the files that are
         NEW or CHANGED into github-update-1.zip (and -2, -3 ... if there are more than --max), plus github-update.txt: what to upload, and which files to delete from GitHub (old ones the
         project no longer has). Unzip the pack(s) and drag the folders into GitHub's "Upload files" page: the folders keep their names, so each file lands where it belongs.
     node tools/github-pack.js --split [--max 90] [--out DIR]
         For a first upload (or an empty repository): the whole project in packs of at most --max files, the game first (index.html, css/, js/), then the tests, then the tools.

   The default for --max is 90, not 100, to leave some room. --out defaults to dist/github (dist/ is not committed). The comparison is by git's own file fingerprint (the SHA-1 of "blob <size>", a
   NUL, and the bytes), so a file counts as changed only if its contents differ. If the repository keeps the project in a sub-folder (site/js/main.js), that is noticed and the packs use it.
   Only the game's own folders (js/ css/ tests/ tools/ and the files at the top) are ever reported as "delete": anything else on GitHub (a CNAME, a .nojekyll, a workflow) is left alone and only mentioned. */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const B = require('./bundle.js');

/** The fingerprint git gives a file: the SHA-1 of "blob <size>\0" followed by the bytes. */
const blobSha = buf => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');
/** The folders and top-level files this project owns on GitHub: only these are ever reported for deletion. */
const OWNED = /^(js\/|css\/|tests\/|tools\/|index\.html$|README\.md$|\.gitignore$)/;
/** Cut a list into packs of at most max, keeping the order (so a folder stays together). */
const chunk = (list, max) => { const out = []; for (let i = 0; i < list.length; i += max) out.push(list.slice(i, i + max)); return out; };

/** What differs. local, remote: Map of path -> sha (remote paths may start with prefix). Returns { upload: [{ file, status }], remove: [paths on GitHub], ignored: [paths on GitHub that are not ours], same: n }. */
function compare(local, remote, prefix = '') {
  const upload = [], remove = [], ignored = []; let same = 0;
  for (const [file, sha] of [...local].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const r = remote.get(prefix + file);
    if (r === undefined) upload.push({ file, status: 'new' }); else if (r !== sha) upload.push({ file, status: 'changed' }); else same++;
  }
  for (const key of [...remote.keys()].sort()) {
    if (!key.startsWith(prefix) || local.has(key.slice(prefix.length))) continue;
    (OWNED.test(key.slice(prefix.length)) ? remove : ignored).push(key);
  }
  return { upload, remove, ignored, same };
}
/** Where the project sits inside the repository: "" (the top), or "site/" if js/main.js is found there. */
function findPrefix(remote) { const k = [...remote.keys()].find(x => x === 'js/main.js' || x.endsWith('/js/main.js')); return k ? k.slice(0, -'js/main.js'.length) : ''; }

/** Fetch what is on GitHub: a shallow clone into a temporary folder, read as a Map of path -> blob sha. */
function fetchRemote(repo, branch) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-compare-'));
  try {
    execFileSync('git', ['clone', '--depth', '1', '-q', ...(branch ? ['--branch', branch] : []), repo, dir], { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = execFileSync('git', ['-C', dir, 'ls-tree', '-r', '-z', 'HEAD'], { maxBuffer: 1 << 26 }).toString('utf8');
    const remote = new Map();
    for (const l of out.split('\0').filter(Boolean)) { const m = /^\d+ blob ([0-9a-f]{40})\t(.+)$/.exec(l); if (m) remote.set(m[2], m[1]); }
    return remote;
  } catch (e) {
    const msg = String((e.stderr || e.message || e)).trim().split('\n').slice(-2).join(' ');
    throw new Error(`could not fetch ${repo}${branch ? ` (branch ${branch})` : ''}: ${msg}\n(the repository must be public, or this machine must be logged in to git; otherwise use --split)`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const sizeOf = list => list.reduce((n, f) => n + fs.statSync(path.join(B.ROOT, f)).size, 0);
function writePacks(files, outDir, name, prefix) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (new RegExp(`^${name}(-\\d+)?\\.zip$`).test(f)) fs.rmSync(path.join(outDir, f));        // (an earlier run's packs are replaced, not mixed in)
  return files.map((group, i) => {
    const file = path.join(outDir, `${name}-${i + 1}.zip`);
    fs.writeFileSync(file, B.zipOf(group.map(f => [prefix + f, fs.readFileSync(path.join(B.ROOT, f))])));
    return { zip: file, files: group.map(f => prefix + f) };
  });
}

/** Run it. options: { repo, branch, split, max, out }. Returns { mode, packs, upload, remove, ignored, same, prefix, text }. */
function run(options) {
  const max = Math.max(1, Math.floor(options.max || 90)), outDir = path.resolve(B.ROOT, options.out || 'dist/github'), all = B.projectFiles();
  const lines = []; const say = t => lines.push(t); let result;
  if (options.split) {
    const group = f => (/^(index\.html$|css\/|js\/)/.test(f) ? 0 : f.startsWith('tests/') ? 1 : f.startsWith('tools/') ? 2 : 3);
    const NAMES = ['the game (index.html, css/, js/)', 'the tests', 'the tools', 'the top-level files'];
    const groups = [0, 1, 2, 3].flatMap(g => chunk(all.filter(f => group(f) === g), max).map(files => ({ g, files }))), packs = writePacks(groups.map(x => x.files), outDir, 'github-part', ''), ordered = groups.flatMap(x => x.files);
    say(`The whole project: ${all.length} files in ${packs.length} pack(s) of at most ${max}, each holding one kind of file.`); packs.forEach((p, i) => say(`  github-part-${i + 1}.zip: ${p.files.length} files: ${NAMES[groups[i].g]}`));
    say('Upload them one after another (each is a separate "Upload files" and commit). The game itself (index.html, css/, js/) is the first pack.');
    result = { mode: 'split', packs, upload: ordered.map(file => ({ file, status: 'new' })), remove: [], ignored: [], same: 0, prefix: '' };
  } else {
    if (!options.repo) throw new Error('give --repo https://github.com/you/your-repo (or use --split)');
    const remote = fetchRemote(options.repo, options.branch), prefix = findPrefix(remote), local = new Map(all.map(f => [f, blobSha(fs.readFileSync(path.join(B.ROOT, f)))]));
    const d = compare(local, remote, prefix), packs = writePacks(chunk(d.upload.map(u => u.file), max), outDir, 'github-update', prefix);
    say(`GitHub has ${remote.size} files${prefix ? ` (the project is in ${prefix})` : ''}; the project has ${all.length}. ${d.same} are the same.`);
    if (!d.upload.length && !d.remove.length) say('GitHub is already up to date: nothing to upload.');
    if (d.upload.length) { say(`\nUPLOAD ${d.upload.length} file(s), in ${packs.length} pack(s) of at most ${max}:`); d.upload.forEach(u => say(`  ${u.status === 'new' ? 'new    ' : 'changed'}  ${prefix}${u.file}`)); }
    if (d.remove.length) { say(`\nDELETE from GitHub ${d.remove.length} file(s) the project no longer has (on GitHub: open the file, then the "..." menu, then Delete file):`); d.remove.forEach(f => say(`  ${f}`)); }
    if (d.ignored.length) say(`\nOn GitHub but not part of this project (left alone): ${d.ignored.join(', ')}`);
    result = { mode: 'update', packs, upload: d.upload, remove: d.remove, ignored: d.ignored, same: d.same, prefix };
  }
  const text = lines.join('\n'); fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, options.split ? 'github-parts.txt' : 'github-update.txt'), text + '\n');
  return { ...result, text, outDir };
}

module.exports = { blobSha, compare, findPrefix, chunk, run, OWNED };

if (require.main === module) {
  const args = process.argv.slice(2), opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  try {
    const r = run({ repo: opt('--repo'), branch: opt('--branch'), split: args.includes('--split'), max: Number(opt('--max', 90)), out: opt('--out') });
    console.log(r.text); console.log(`\nWritten to ${path.relative(process.cwd(), r.outDir) || '.'}: ${r.packs.map(p => path.basename(p.zip)).join(', ') || '(no packs: nothing to upload)'}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
