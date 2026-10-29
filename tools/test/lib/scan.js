// Readability: every piece of text in every open window is above its WCAG AA contrast ratio (4.5, or 3 for large text), measured on the real page.
const assert = require('assert');
/** Runs in the page. Returns one row per visible piece of text (and per filled input): its colour, the background it sits on, and the ratio. */
function SCAN() {
  const parse = c => { let m = c.match(/^color\(srgb ([^)]+)\)/); if (m) { const [v, al] = m[1].split('/'); const p = v.trim().split(/\s+/).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: al ? Number(al) : 1 }; }
    m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
  let lastSrc = '';
  const bgOf = el => { const chain = []; lastSrc = ''; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { chain.push(c); if (!lastSrc) lastSrc = `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${(typeof e.className === 'string' ? e.className : '').split(' ').join('.')}`; if (c.a >= 1) break; } } let acc = { r: 0, g: 0, b: 0, a: 1 }; for (const c of chain.reverse()) acc = blend(c, acc); return acc; };
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), out = [];
  for (const root of document.querySelectorAll('.overlay:not(.hidden), #start-screen:not(.hidden), #reader:not(.hidden)')) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      const t = n.textContent.trim(); if (!t) continue; const el = n.parentElement, cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (cs.visibility === 'hidden' || cs.display === 'none' || r.width < 1 || r.height < 1 || parseFloat(cs.opacity) < 0.05 || el.closest('svg, canvas')) continue;
      const fg = parse(cs.color), bg = bgOf(el), px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700, large = px >= 24 || (px >= 18.66 && bold);
      out.push({ text: t.slice(0, 44), cls: ((typeof el.className === 'string' && el.className) || el.tagName.toLowerCase()).slice(0, 40), color: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, src: lastSrc.slice(0, 60), ratio: Math.round(ratio(lum(blend(fg, bg)), lum(bg)) * 100) / 100, need: large ? 3 : 4.5, px });
    }
    for (const b of root.querySelectorAll('input:not([type=range]):not([type=checkbox]):not([type=radio]), select, textarea')) {
      if (!b.value || b.offsetWidth < 2) continue; const cs = getComputedStyle(b), fg = parse(cs.webkitTextFillColor && cs.webkitTextFillColor.startsWith('rgb') ? cs.webkitTextFillColor : cs.color), bg = bgOf(b);
      out.push({ text: `[field] ${String(b.value).slice(0, 12)}`, cls: b.className.slice(0, 30), color: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, src: lastSrc.slice(0, 60), ratio: Math.round(ratio(lum(blend(fg, bg)), lum(bg)) * 100) / 100, need: 3, px: parseFloat(cs.fontSize) });
    }
  }
  return out;
}
/** Fail if any text on screen is below its ratio. Returns how many pieces of text were checked. */
async function assertReadable(page, label, min = 3) {
  const rows = await page.evaluate(SCAN), bad = rows.filter(r => r.ratio < r.need);
  bad.slice(0, 6).forEach(r => console.log(`      ${label}: ${r.ratio}:1 (needs ${r.need}) "${r.text}" [${r.cls}] ${r.color} on ${r.bg} (from ${r.src})`));
  assert.ok(rows.length >= min, `${label}: the scan saw the text (${rows.length})`);
  assert.strictEqual(bad.length, 0, `${label}: every piece of text is readable (${bad.length} are not)`);
  return rows.length;
}
module.exports = { SCAN, assertReadable };

/** Windows that stick out sideways or past the top of the screen (checked on the page as it is now). Returns a list of offenders; empty is good. */
function FITS() {
  const bad = [];
  document.querySelectorAll('.overlay:not(.hidden)').forEach(o => {
    if (o.scrollWidth > o.clientWidth + 1) bad.push(`#${o.id}: scrolls sideways (${o.scrollWidth} wide in a ${o.clientWidth} screen)`);
    const p = o.querySelector('.mc-panel'); if (!p) return; const r = p.getBoundingClientRect();
    if (r.left < -1 || r.right > innerWidth + 1) bad.push(`#${o.id}: its window runs off the side (${Math.round(r.left)} to ${Math.round(r.right)} in a ${innerWidth} screen)`);
    if (r.top + o.scrollTop < -1) bad.push(`#${o.id}: its top is cut off (${Math.round(r.top + o.scrollTop)})`);
  });
  return bad;
}
/** One seeded click-around in a window: after every click the screen is scanned. Returns { screens, bad: Map, reached: Set }. */
async function monkey(page, openJs, rootSel, steps, seed) {
  await page.evaluate(([o, sd]) => { window.__seed = sd; Math.random = () => { window.__seed = (window.__seed * 1664525 + 1013904223) >>> 0; return window.__seed / 4294967296; }; (0, eval)(o); }, [openJs, seed]);
  await new Promise(r => setTimeout(r, 300)); const bad = new Map(), reached = new Set(); let screens = 0;
  for (let i = 0; i < steps; i++) {
    const rows = await page.evaluate(SCAN); screens++; rows.filter(r => r.ratio < r.need).forEach(r => bad.set(`${r.text}|${r.cls}`, r));
    (await page.evaluate(root => ['.msg.good', '.msg.bad', '.result:not(.hidden)', '.final', '.worked', '.checks', '.cst-fb', '.tcase-tip:not(.hidden)', '.item.equipped'].filter(q => document.querySelector(root + ' ' + q)), rootSel)).forEach(q => reached.add(q));
    const did = await page.evaluate(root => {
      const R = document.querySelector(root); if (!R || R.classList.contains('hidden')) return 'closed';
      const risky = /close|leave|change level|exit|pick a form|modes/i;
      const c = [...R.querySelectorAll('button:not(:disabled), .gem, .slot, [role=button], canvas, svg.graph-svg')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(e).visibility !== 'hidden' && !risky.test(e.textContent + ' ' + (e.getAttribute('aria-label') || '') + ' ' + e.id); });
      if (!c.length) return 'nothing'; const e = c[Math.floor(Math.random() * c.length)], r = e.getBoundingClientRect(), x = r.left + r.width * (0.1 + 0.8 * Math.random()), y = r.top + r.height * (0.1 + 0.8 * Math.random());
      for (const t of ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click']) e.dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: x, clientY: y })); return 'clicked';
    }, rootSel);
    if (did === 'closed') await page.evaluate(o => (0, eval)(o), openJs);
    await new Promise(r => setTimeout(r, 120));
  }
  return { screens, bad, reached };
}
module.exports.FITS = FITS; module.exports.monkey = monkey;
