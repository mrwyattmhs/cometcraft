/* The trophy case: press E at the trophy shelf in your dorm room and a window zooms in on EVERY trophy there is.
   The ones you have won are lit up in colour on a gold-lit shelf; the ones you have not are faint outlines with a ghost of their shape.
   Hover over any trophy (or Tab to it, or tap it) for how to earn it, where, and how far along you are.

   The trophies are drawn flat here, with the same symbols as the 3D ones on the shelf (the blocks from World's symbol shapes, the d20, the two
   formula plates, the US map and the sandbox blocks). A trophy you have not won is the same picture turned into an outline. The list of trophies,
   their sentences and your progress come from trophies.js (unit tested). */
const TrophyCase = (() => {
  const $ = id => document.getElementById(`tcase-${id}`);
  const root = () => document.getElementById('tcase');
  const isOpen = () => !root().classList.contains('hidden');
  const W = 280, H = 256;                                         // the picture's own size (shown at half that, so it is sharp)
  const FONT = 'Silkscreen, "Courier New", monospace';
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const BLOCK_SYMBOLS = ['plus', 'minus', 'times', 'divide', 'sqrt', 'parabola', 'linegraph', 'coaster'];
  let wired = false, pinned = null;

  /** The trophy in colour: a marble base with a gold step, and the symbol of its table standing on it. */
  function paintEarned(c, def) {
    c.fillStyle = '#e9e6dc'; c.fillRect(40, 214, 200, 28); c.fillStyle = '#f7f4ea'; c.fillRect(40, 214, 200, 5); c.fillStyle = '#c9c4b3'; c.fillRect(40, 238, 200, 4);
    c.fillStyle = '#c9a24a'; c.fillRect(62, 194, 156, 22); c.fillStyle = '#e1c06a'; c.fillRect(62, 194, 156, 4); c.fillStyle = '#9d7b2e'; c.fillRect(62, 212, 156, 4);
    const sym = def.symbol, col = hex(def.color), area = { x: 40, y: 14, w: 200, h: 176 };
    if (typeof sym === 'string' && BLOCK_SYMBOLS.includes(sym)) {
      const s = World.helpers.symbolCells(sym), k = Math.min(area.w / s.w, area.h / s.h), ox = area.x + (area.w - s.w * k) / 2, oy = area.y + area.h - s.h * k;
      s.cells.forEach(([cc, r]) => {
        const x = Math.floor(ox + cc * k), y = Math.floor(oy + (s.h - 1 - r) * k), w = Math.ceil(k) + 1, h = Math.ceil(k) + 1;
        c.fillStyle = col; c.fillRect(x, y, w, h);
        c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x, y, w, Math.max(1, Math.round(k * 0.2)));             // lit from above
        c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, y + h - Math.max(1, Math.round(k * 0.2)), w, Math.max(1, Math.round(k * 0.2)));
      });
    } else if (sym === 'd20') {
      const cx = 140, cy = 108, r = 78, pts = Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos(Math.PI / 2 + i * Math.PI / 3), cy - r * Math.sin(Math.PI / 2 + i * Math.PI / 3)]);
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = '#f4f1e8'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#b9b4a2'; c.stroke();
      c.lineWidth = 2; c.strokeStyle = '#d6d1c0'; [0, 2, 4].forEach(i => { c.beginPath(); c.moveTo(cx, cy); c.lineTo(pts[i][0], pts[i][1]); c.stroke(); });
      c.fillStyle = '#34302a'; c.font = `54px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('20', cx, cy + 4);
    } else if (sym && sym.words) {
      c.fillStyle = '#1f2a44'; c.fillRect(44, 38, 192, 140); c.strokeStyle = '#c9a24a'; c.lineWidth = 7; c.strokeRect(47, 41, 186, 134);
      c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `30px ${FONT}`; c.fillText(sym.words[0], 140, 80); c.font = `40px ${FONT}`; c.fillText(sym.words[1], 140, 130);
    } else if (sym === 'map') {
      const box = { x: 40, y: 52, w: 200, h: 124 }, k = Math.min((box.w - 14) / USMap.WIDTH, (box.h - 14) / USMap.HEIGHT);
      c.fillStyle = '#cfe8f5'; c.fillRect(box.x, box.y, box.w, box.h);
      USMap.draw(c, { scale: k, dx: box.x + (box.w - USMap.WIDTH * k) / 2, dy: box.y + (box.h - USMap.HEIGHT * k) / 2, lineWidth: 1 });
      c.strokeStyle = '#c9a24a'; c.lineWidth = 7; c.strokeRect(box.x + 3, box.y + 3, box.w - 6, box.h - 6);
    } else if (sym === 'blocks') {
      const b = 58, x0 = 140 - 1.5 * b, y0 = 190 - 3 * b;
      [[0, 2], [1, 2], [2, 2], [0.5, 1], [1.5, 1], [1, 0]].forEach(([gx, gy]) => {
        const x = Math.round(x0 + gx * b), y = Math.round(y0 + gy * b);
        c.fillStyle = col; c.fillRect(x + 2, y + 2, b - 4, b - 4); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x + 2, y + 2, b - 4, 10); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x + 2, y + b - 14, b - 4, 10);
      });
    }
  }

  /** Draw a trophy into a canvas: in colour if you have it, otherwise as a faint outline with a ghost of its shape. */
  function draw(canvas, def, earned) {
    const c = canvas.getContext('2d'); c.clearRect(0, 0, W, H);
    if (earned) { paintEarned(c, def); return; }
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const oc = off.getContext('2d'); paintEarned(oc, def);
    let img = null; try { img = oc.getImageData(0, 0, W, H); } catch (e) { img = null; }
    if (!img || !img.data) { c.globalAlpha = 0.22; c.drawImage(off, 0, 0); c.globalAlpha = 1; return; }
    const a = img.data, solid = new Uint8Array(W * H), edge = new Uint8Array(W * H);
    for (let i = 0; i < solid.length; i++) solid[i] = a[i * 4 + 3] > 40 ? 1 : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solid[i] && (x === 0 || y === 0 || x === W - 1 || y === H - 1 || !solid[i - 1] || !solid[i + 1] || !solid[i - W] || !solid[i + W])) edge[i] = 1;
    }
    const out = c.createImageData(W, H), o = out.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!solid[i]) continue;
      let line = false;                                                                                  // within 2 pixels of the edge: a line about 3 pixels thick
      for (let dy = -2; dy <= 2 && !line; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && edge[yy * W + xx] && Math.abs(dx) + Math.abs(dy) <= 3) { line = true; break; } }
      if (line) { o[i * 4] = 206; o[i * 4 + 1] = 214; o[i * 4 + 2] = 232; o[i * 4 + 3] = 230; }
      else { o[i * 4] = 255; o[i * 4 + 1] = 255; o[i * 4 + 2] = 255; o[i * 4 + 3] = 22; }
    }
    c.putImageData(out, 0, 0);
    if (def.symbol && def.symbol.words) {                                                                  // the plates keep their words, faintly, so you can tell which is which
      c.fillStyle = 'rgba(206,214,232,.55)'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `30px ${FONT}`; c.fillText(def.symbol.words[0], 140, 80); c.font = `40px ${FONT}`; c.fillText(def.symbol.words[1], 140, 130);
    }
  }

  /* ---------- the window ---------- */
  const entryFor = id => Trophies.entries(Store.get().solved || {}, Store.get().trophies || []).find(e => e.id === id);
  function render() {
    const s = Store.get(), list = Trophies.entries(s.solved || {}, s.trophies || []), grid = $('grid');
    grid.textContent = '';
    list.forEach(e => {
      const card = document.createElement('button'); card.type = 'button'; card.className = 'tc-card ' + (e.earned ? 'earned' : 'locked'); card.dataset.id = e.id; card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `${e.name}: ${e.earned ? 'earned' : `not earned yet, ${e.count} of ${e.goal}`}. ${e.how}`);
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; draw(cv, e, e.earned);
      const nm = document.createElement('span'); nm.className = 'tc-name'; nm.textContent = e.name;
      card.append(cv, nm); grid.append(card);
    });
    for (let i = 0, pad = (5 - (list.length % 5)) % 5; i < pad; i++) { const f = document.createElement('div'); f.className = 'tc-card empty'; f.setAttribute('aria-hidden', 'true'); grid.append(f); }      // so every shelf board runs the full width
    $('count').textContent = `${Trophies.earnedCount(s.trophies || [])} of ${list.length} earned`;
  }

  function hideTip() { const t = $('tip'); t.classList.add('hidden'); t.textContent = ''; }
  function showTip(card) {
    const e = entryFor(card.dataset.id); if (!e) return;
    const t = $('tip'); t.textContent = ''; t.classList.toggle('got', e.earned);
    const name = document.createElement('b'); name.textContent = e.earned ? `${e.name}: earned!` : e.name;
    const how = document.createElement('p'); how.textContent = e.how;
    t.append(name, how);
    if (e.earned) { const d = document.createElement('div'); d.className = 'prog'; d.textContent = `You won this one (${e.goal} ${e.noun}).`; t.append(d); }
    else {
      const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('i'); fill.style.width = `${e.percent}%`; bar.append(fill);
      const d = document.createElement('div'); d.className = 'prog'; d.textContent = `${e.count} of ${e.goal} ${e.noun}`; t.append(bar, d);
    }
    t.classList.remove('hidden');
    const panel = root().querySelector('.tcase-panel').getBoundingClientRect(), cr = card.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight;
    let left = cr.left - panel.left + cr.width / 2 - tw / 2; left = Math.max(8, Math.min(panel.width - tw - 8, left));
    let top = cr.top - panel.top - th - 10; if (top < 6) top = cr.bottom - panel.top + 10;                 // above the trophy, or below it if there is no room above
    t.style.left = `${Math.round(left)}px`; t.style.top = `${Math.round(top)}px`;
  }
  const cardOf = e => (e.target.closest ? e.target.closest('.tc-card[data-id]') : null);

  function wire() {
    if (wired) return;
    wired = true;
    $('close').addEventListener('click', close);
    const grid = $('grid');
    grid.addEventListener('mouseover', e => { const c = cardOf(e); if (c && pinned === null) showTip(c); });
    grid.addEventListener('mouseout', e => { const c = cardOf(e); if (c && pinned === null && !c.contains(e.relatedTarget)) hideTip(); });
    grid.addEventListener('focusin', e => { const c = cardOf(e); if (c) showTip(c); });
    grid.addEventListener('focusout', e => { if (cardOf(e) && pinned === null) hideTip(); });
    grid.addEventListener('click', e => {                                                    // for a touch screen, which has no hover: tap to show, tap again to hide
      const c = cardOf(e); if (!c) return;
      if (pinned === c.dataset.id) { pinned = null; hideTip(); } else { pinned = c.dataset.id; showTip(c); }
    });
    root().addEventListener('click', e => { if (!cardOf(e) && pinned !== null) { pinned = null; hideTip(); } });
    Store.onChange(() => { if (isOpen()) { render(); if (pinned) { const c = $('grid').querySelector(`[data-id="${pinned}"]`); if (c) showTip(c); } } });
  }
  function open() {
    wire(); pinned = null; render(); hideTip();
    root().classList.remove('hidden'); UI.setOpen('tcase', true); root().scrollTop = 0; $('close').focus();
  }
  function close() { root().classList.add('hidden'); UI.setOpen('tcase', false); pinned = null; hideTip(); }

  return { open, close, isOpen, draw, render, W, H };
})();
