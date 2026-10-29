// The real browser: Chromium (headless, software rendering) driven by puppeteer-core, with the project folder served from a local port.
// Nothing leaves the machine: Three.js is served from the pinned local copy and every other outside request is blocked (so fonts fall back to the system's).
// Set GAME_ROOT=/path/to/an/unzipped/copy to test that copy instead of the project.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const puppeteer = require('puppeteer-core');
const { ROOT, TEST, sleep } = require('./util');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.png': 'image/png', '.svg': 'image/svg+xml' };

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const home of [os.homedir(), '/home/claude', '/root']) {
    const base = path.join(home, '.cache/puppeteer/chrome');
    if (fs.existsSync(base)) for (const v of fs.readdirSync(base).sort().reverse()) { const p = path.join(base, v, 'chrome-linux64/chrome'); if (fs.existsSync(p)) return p; }
  }
  throw new Error('no Chromium found: set CHROME_PATH');
}

async function launch({ width = 1280, height = 800, hideStart = true } = {}) {
  const root = path.resolve(process.env.GAME_ROOT || ROOT), three = fs.readFileSync(path.join(TEST, 'node_modules/three/build/three.min.js'));
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]), f = path.join(root, u === '/' ? 'index.html' : u);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const page = await browser.newPage(); await page.setViewport({ width, height });
  const errors = [];
  await page.setRequestInterception(true);
  page.on('request', r => { const u = r.url(); if (u.startsWith(base)) r.continue(); else if (/three\.js\/r128\/three\.min\.js/.test(u)) r.respond({ status: 200, contentType: 'text/javascript', body: three }); else r.abort(); });
  page.on('pageerror', e => errors.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__primeTime, { timeout: 30000 });
  // press Play like a player (the game ignores the keys until it has been started); a script's click gets no pointer lock, so nothing else changes
  if (hideStart) await page.evaluate(() => { document.getElementById('play').click(); document.getElementById('start-screen').classList.add('hidden'); });
  const api = {
    page, errors, base, sleep, root,
    ev: (fn, ...a) => page.evaluate(fn, ...a),
    shot: async f => { fs.mkdirSync(path.dirname(f), { recursive: true }); await page.screenshot({ path: f }); },
    /** Stand somewhere and look somewhere. Frames are slow in software rendering, so this waits until the game has really drawn a frame from there (not a fixed pause). */
    async at(x, z, yaw = 0, pitch = 0, lift = 0) {
      await page.evaluate((x, z, yaw, pitch, lift) => { Player.teleport(x, z, yaw); Player.pitch = pitch; Player.lift = lift; }, x, z, yaw, pitch, lift);
      await page.waitForFunction((x, z) => { const c = window.__primeTime && __primeTime.camera; return !c || (Math.abs(c.position.x - x) < 0.6 && Math.abs(c.position.z - z) < 0.6); }, { timeout: 20000 }, x, z).catch(() => {});
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await sleep(150);
    },
    /** Close every window the way a player does: Escape, until the game says nothing is open (hiding a window by CSS alone leaves the game believing it is open, and then it ignores the keys). */
    async closeAll() {
      for (let i = 0; i < 12; i++) { if (!(await page.evaluate(() => !UI.isOpen()))) await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }))); else break; }
      await page.evaluate(() => { document.querySelectorAll('.overlay:not(.hidden)').forEach(o => o.classList.add('hidden')); document.getElementById('reader').classList.add('hidden'); document.getElementById('start-screen').classList.add('hidden'); });
      if (await page.evaluate(() => UI.isOpen())) throw new Error('could not close every window');
    },
    async close() { await browser.close(); server.close(); },
  };
  return api;
}
module.exports = { launch };
