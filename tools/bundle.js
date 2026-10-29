#!/usr/bin/env node
/* The bundler. From the project folder:

     node tools/bundle.js                 build dist/prime-time-preview.html (one file, for the artifact preview) and dist/prime-time.zip
     node tools/bundle.js --out DIR       write them to DIR instead of dist/
     node tools/bundle.js --check         build in memory and compare with the files in dist/ (are they stale?); exit 1 if they differ
     node tools/bundle.js --version       only check that every ?v= tag in index.html and every `const BUILD = N` in js/ agree

   The single file is index.html with the stylesheet and every local script written into it (in the order index.html lists them), and nothing else changed:
   the Google Fonts links and the Three.js tag (cdnjs, r128) stay as links. The zip holds the project folder (not node_modules, dist, caches or .git) and is
   deterministic: the same source gives the same bytes, so a bundle can be checked against the source. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.resolve(__dirname, '..');
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** The ?v= number on every file link in index.html, and the BUILD number in every js file that has one: they must all be the same. */
function versions() {
  const html = read('index.html'), tags = new Set([...html.matchAll(/\?v=(\d+)"/g)].map(m => m[1]));
  const builds = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'))) {
    for (const m of read(`js/${f}`).matchAll(/const (BUILD|BUILD_GRAPH_TABLES) = (\d+);/g)) builds[`js/${f} ${m[1]}`] = m[2];
  }
  const all = new Set([...tags, ...Object.values(builds)]);
  return { ok: all.size === 1 && tags.size === 1, tags: [...tags], builds, number: [...all][0] };
}

/** index.html with the local stylesheet and scripts inlined. */
function singleFile() {
  let html = read('index.html');
  html = html.replace(/<link rel="stylesheet" href="(css\/[^"?]+)(?:\?v=\d+)?">/g, (m, f) => `<style>\n${read(f)}\n</style>`);
  html = html.replace(/<script src="(js\/[^"?]+)(?:\?v=\d+)?"><\/script>/g, (m, f) => `<script>\n${read(f)}\n</script>`);
  if (/<script src="js\//.test(html) || /<link rel="stylesheet" href="css\//.test(html)) throw new Error('a local file was not inlined');
  return html;
}

/* ---------- the zip: store/deflate with fixed timestamps, so it is reproducible ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipOf(files) {                                         // files: [[name, Buffer]]
  const parts = [], central = []; let offset = 0;
  const DOS_TIME = 0, DOS_DATE = (46 << 9) | (1 << 5) | 1;       // 2026-01-01 00:00, always
  for (const [name, data] of files) {
    const nameB = Buffer.from(name), comp = zlib.deflateRawSync(data, { level: 9 }), useDeflate = comp.length < data.length, body = useDeflate ? comp : data, crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(useDeflate ? 8 : 0, 8);
    local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameB.length, 26);
    parts.push(local, nameB, body);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(useDeflate ? 8 : 0, 10);
    c.writeUInt16LE(DOS_TIME, 12); c.writeUInt16LE(DOS_DATE, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nameB.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, nameB); offset += 30 + nameB.length + body.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}
const SKIP = /(^|\/)(node_modules|dist|\.git|\.cache)(\/|$)|\.DS_Store$|(^|\/)(\.test-cache|last-run)\.json$/;
function projectFiles() {
  const out = [];
  (function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const p = path.join(dir, e.name), r = rel(p); if (SKIP.test(r)) continue; if (e.isDirectory()) walk(p); else out.push(r); } })(ROOT);
  return out;
}
function zipProject() { return zipOf(projectFiles().map(f => [`prime-time/${f}`, fs.readFileSync(path.join(ROOT, f))])); }

function build() { return { html: Buffer.from(singleFile()), zip: zipProject() }; }

module.exports = { versions, singleFile, zipProject, projectFiles, build, ROOT };

if (require.main === module) {
  const args = process.argv.slice(2), v = versions();
  if (!v.ok) { console.error(`version mismatch: ?v= tags ${JSON.stringify(v.tags)}, BUILD values ${JSON.stringify(v.builds)}`); process.exit(1); }
  if (args.includes('--version')) { console.log(`build ${v.number}: every ?v= tag and BUILD number agrees`); process.exit(0); }
  const outDir = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist');
  const { html, zip } = build();
  if (args.includes('--check')) {
    const same = (f, b) => fs.existsSync(path.join(outDir, f)) && Buffer.compare(fs.readFileSync(path.join(outDir, f)), b) === 0;
    const bad = [['prime-time-preview.html', html], ['prime-time.zip', zip]].filter(([f, b]) => !same(f, b)).map(([f]) => f);
    if (bad.length) { console.error(`stale or missing in ${rel(outDir) || '.'}: ${bad.join(', ')}  (run: node tools/bundle.js)`); process.exit(1); }
    console.log(`the bundle in ${rel(outDir) || '.'} matches the source (build ${v.number})`); process.exit(0);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'prime-time-preview.html'), html); fs.writeFileSync(path.join(outDir, 'prime-time.zip'), zip);
  console.log(`build ${v.number}: ${rel(path.join(outDir, 'prime-time-preview.html'))} (${(html.length / 1024).toFixed(0)} KB), ${rel(path.join(outDir, 'prime-time.zip'))} (${(zip.length / 1024).toFixed(0)} KB, ${projectFiles().length} files)`);
}
