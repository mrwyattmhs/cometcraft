/* The room planner: a top-down plan of your dorm room, like the little map in the sandbox. You do not build furniture, you pick it.
   Choose a piece from the list, move over the plan (a green outline means it fits, red means it does not), and click to put it
   down. Click a piece you have already placed to pick it up and move it, press R to turn it, right-click to take it away. Every
   change is saved and shows up in the room straight away. The rules (what fits, one of each kind, the doorway kept clear) are in
   dorm.js; the furniture models are in dormroom.js; this file is the screen. */
const DormPlanner = (() => {
  const $ = id => document.getElementById(id);
  const BUILD = 32; // must match Dorm.BUILD
  const CELL = 84, M = 60;                                   // pixels per grid cell, and the margin for the walls
  const W = Dorm.ROOM.w * CELL + 2 * M, H = Dorm.ROOM.d * CELL + 2 * M;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

  let room = null, items = [], selected = null, rot = null, tool = 'place', hover = null, wired = false, canvas, ctx, clearTimer = null, note = '';
  const isOpen = () => !$('dorm').classList.contains('hidden');
  const show = (id, on) => $(id).classList.toggle('hidden', !on);

  /* ---------- drawing ---------- */
  const px = c => M + c * CELL;

  /** One piece, seen from above, facing south when rot is 0. alpha < 1 draws it as a preview. */
  function drawItem(it, alpha = 1, tint = null) {
    const f = Dorm.footprint(it.type, it.rot), s = Dorm.ITEMS[it.type];
    const cx = px(it.x) + f.w * CELL / 2, cy = px(it.z) + f.d * CELL / 2;
    const lw = s.w * CELL - 8, ld = s.d * CELL - 8;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(Dorm.mod4(it.rot) * Math.PI / 2);
    const rect = (x, y, w, h, fill, stroke) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); } };
    const L = -lw / 2, T = -ld / 2;
    if (it.type === 'bed' || it.type === 'bunk') {
      const bunk = it.type === 'bunk';
      rect(L, T, lw, ld, bunk ? '#3b4a66' : '#7a4a26', '#1b2233');
      rect(L + 6, T + 6, lw - 12, ld - 12, '#dfe9f6');
      rect(L + 6, T + ld * 0.42, lw - 12, ld * 0.52 - 6, bunk ? '#c84a4a' : '#4a78c8');
      rect(L + lw * 0.18, T + 10, lw * 0.64, ld * 0.2, '#ffffff', '#b8c4d4');
      if (bunk) { ctx.strokeStyle = '#1b2233'; ctx.lineWidth = 2; [0.62, 0.74, 0.86].forEach(k => { ctx.beginPath(); ctx.moveTo(L + lw * 0.25, T + ld * k); ctx.lineTo(L + lw * 0.75, T + ld * k); ctx.stroke(); }); }
    } else if (it.type === 'tv') {
      rect(L, T, lw, ld, '#7a4a26', '#3a2412');
      rect(L + 12, T + 8, lw - 24, ld * 0.3, '#24262c');
      ['#c9c9c9', '#d6d62a', '#2ad6d6', '#2ad62a', '#d62ad6', '#d62a2a'].forEach((c, i) => rect(L + 16 + i * ((lw - 32) / 6), T + 11, (lw - 32) / 6, ld * 0.22, c));
      rect(L + 14, T + ld * 0.55, lw * 0.4, ld * 0.3, '#8d6338', '#3a2412');
      rect(L + lw * 0.55, T + ld * 0.55, lw * 0.4 - 14, ld * 0.3, '#8d6338', '#3a2412');
    } else if (it.type === 'desk') {
      rect(L, T, lw, ld, '#c89b62', '#6b4a26');
      rect(L + lw * 0.3, T + 6, lw * 0.4, ld * 0.28, '#24262c');
      rect(L + lw * 0.34, T + 9, lw * 0.32, ld * 0.2, '#4a78c8');
      rect(L + lw * 0.33, T + ld * 0.42, lw * 0.34, ld * 0.14, '#24262c');
      rect(L + lw * 0.78, T + 6, lw * 0.16, ld * 0.38, '#24262c');
      ctx.fillStyle = '#3a3f4a'; ctx.beginPath(); ctx.arc(0, T + ld * 0.78, ld * 0.17, 0, Math.PI * 2); ctx.fill();
    } else if (it.type === 'dresser') {
      rect(L, T, lw, ld, '#a87b4f', '#5a3a1e');
      [0.6, 0.75, 0.9].forEach(k => rect(L + 8, T + ld * k - 5, lw - 16, 10, '#b98d5c', '#5a3a1e'));
      rect(L + lw * 0.1, T + 8, lw * 0.22, lw * 0.22, '#ffe0a0', '#5a3a1e');
    }
    // a small arrow on the front edge shows which way the piece faces
    ctx.fillStyle = tint || 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(-9, ld / 2 + 2); ctx.lineTo(9, ld / 2 + 2); ctx.lineTo(0, ld / 2 + 13); ctx.closePath(); ctx.fill();
    ctx.restore();
    const label = it.type === 'bunk' ? 'BUNK' : it.type === 'bed' ? 'BED' : it.type === 'tv' ? 'TV' : it.type === 'desk' ? 'DESK' : 'DRESSER';
    ctx.save(); ctx.globalAlpha = alpha; ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(label, cx, cy); ctx.fillStyle = '#fff'; ctx.fillText(label, cx, cy); ctx.restore();
  }

  /** Unless you have turned it yourself, a piece faces the middle of the room: a bed's headboard goes against the wall, a TV faces in. */
  function facingRoom(cell) {
    const dx = Dorm.ROOM.w / 2 - (cell.x + 0.5), dz = Dorm.ROOM.d / 2 - (cell.z + 0.5);
    return Math.abs(dz) >= Math.abs(dx) ? (dz >= 0 ? 0 : 2) : (dx > 0 ? 3 : 1);      // south, north, east, west
  }
  const currentRot = () => (rot !== null ? rot : hover ? facingRoom(hover) : 0);

  /** The item that would go down if you clicked where the pointer is. */
  function candidate() {
    if (!selected || !hover) return null;
    const r = currentRot(), f = Dorm.footprint(selected, r);
    return { type: selected, x: hover.x - Math.floor(f.w / 2), z: hover.z - Math.floor(f.d / 2), rot: r };
  }

  function draw() {
    if (!ctx) return;
    const rw = Dorm.ROOM.w * CELL, rd = Dorm.ROOM.d * CELL;
    ctx.fillStyle = '#1d4f82'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2b6aa6'; ctx.fillRect(M, M, rw, rd);
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
    for (let i = 0; i <= Dorm.ROOM.w; i++) { ctx.beginPath(); ctx.moveTo(px(i), M); ctx.lineTo(px(i), M + rd); ctx.stroke(); }
    for (let j = 0; j <= Dorm.ROOM.d; j++) { ctx.beginPath(); ctx.moveTo(M, px(j)); ctx.lineTo(M + rw, px(j)); ctx.stroke(); }
    // the cells beside the door stay clear: hatched, so you can see why nothing goes there
    ctx.save(); ctx.beginPath(); Dorm.KEEP_CLEAR.forEach(([x, z]) => ctx.rect(px(x), px(z), CELL, CELL)); ctx.clip();
    ctx.fillStyle = 'rgba(255,120,120,.16)'; ctx.fillRect(M, M, rw, rd); ctx.strokeStyle = 'rgba(255,150,150,.55)'; ctx.lineWidth = 2;
    for (let k = -rd; k < rw + rd; k += 16) { ctx.beginPath(); ctx.moveTo(M + k, M + rd); ctx.lineTo(M + k + rd, M); ctx.stroke(); }
    ctx.restore();
    // walls: thick white, with the doorway on the left (west), a window on the right (east), and the trophy shelf on the top (north)
    ctx.strokeStyle = '#f4f1e6'; ctx.lineWidth = 10; ctx.lineCap = 'square';
    const seg = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
    seg(M - 5, M - 5, M + rw + 5, M - 5); seg(M - 5, M + rd + 5, M + rw + 5, M + rd + 5);
    seg(M + rw + 5, M - 5, M + rw + 5, M + rd + 5);
    seg(M - 5, M - 5, M - 5, px(Dorm.DOOR.z) - 4); seg(M - 5, px(Dorm.DOOR.z + 1) + 4, M - 5, M + rd + 5);
    ctx.strokeStyle = '#9fe0ff'; ctx.lineWidth = 6; seg(M + rw + 5, px(1.8), M + rw + 5, px(4.2));
    ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = 6; seg(px(2.0), M - 5, px(7.6), M - 5);
    ctx.font = '600 14px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#dff1ff';
    ctx.textAlign = 'center'; ctx.fillText('trophy shelf', px(4.8), M - 24); ctx.fillStyle = '#ffd0d0'; ctx.fillText('keep clear', px(1), px(Dorm.DOOR.z + 0.5)); ctx.fillStyle = '#dff1ff';
    ctx.save(); ctx.translate(M + rw + 28, px(3)); ctx.rotate(Math.PI / 2); ctx.fillText('window', 0, 0); ctx.restore();
    ctx.save(); ctx.translate(M - 28, px(Dorm.DOOR.z + 0.5)); ctx.rotate(-Math.PI / 2); ctx.fillText('door', 0, 0); ctx.restore();
    // the pieces already placed, then the preview
    items.forEach(it => drawItem(it));
    const cand = candidate();
    if (cand) {
      const res = Dorm.place(items, cand);
      const f = Dorm.footprint(cand.type, cand.rot);
      ctx.fillStyle = res.ok ? 'rgba(90,240,130,.28)' : 'rgba(255,90,90,.34)';
      for (let i = 0; i < f.w; i++) for (let j = 0; j < f.d; j++) ctx.fillRect(px(cand.x + i), px(cand.z + j), CELL, CELL);
      ctx.strokeStyle = res.ok ? '#6dff9a' : '#ff7b7b'; ctx.lineWidth = 3; ctx.strokeRect(px(cand.x) + 1, px(cand.z) + 1, f.w * CELL - 2, f.d * CELL - 2);
      if (res.ok || Dorm.fits(cand)) drawItem(cand, 0.62, res.ok ? '#6dff9a' : '#ff7b7b');
    } else if (hover && tool === 'remove' && Dorm.itemAt(items, hover.x, hover.z)) {
      const it = Dorm.itemAt(items, hover.x, hover.z), f = Dorm.footprint(it.type, it.rot);
      ctx.strokeStyle = '#ff7b7b'; ctx.lineWidth = 4; ctx.strokeRect(px(it.x) + 1, px(it.z) + 1, f.w * CELL - 2, f.d * CELL - 2);
    }
  }

  /* ---------- the list on the left, and the line under the plan ---------- */
  function refresh() {
    const placed = new Set(items.map(o => Dorm.ITEMS[o.type].group));
    document.querySelectorAll('#dorm-palette [data-type]').forEach(b => {
      const t = b.dataset.type, s = Dorm.ITEMS[t];
      const here = items.some(o => o.type === t);
      b.classList.toggle('on', selected === t && tool === 'place');
      b.classList.toggle('placed', here);
      b.querySelector('.plan-state').textContent = here ? 'placed' : (placed.has(s.group) ? 'swap' : '');
    });
    $('dorm-rotate').classList.toggle('on', false);
    $('dorm-remove').classList.toggle('on', tool === 'remove');
    $('dorm-hint').textContent = note || (tool === 'remove' ? 'Click a piece to take it away.'
      : selected ? `${Dorm.ITEMS[selected].name}: click a square to put it down. It faces the room by itself; press R to turn it.` : 'Pick something from the list, then click a square in the room.');
    $('dorm-count').textContent = `${items.length} of ${Dorm.GROUPS.length} placed`;
  }

  /** Save a new list: the room shows it right away. */
  function commit(next, message) {
    items = room.save(next);
    note = message || '';
    refresh(); draw();
  }

  /* ---------- the pointer ---------- */
  function cellAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (r.width ? canvas.width / r.width : 1), y = (e.clientY - r.top) * (r.height ? canvas.height / r.height : 1);
    const cx = Math.floor((x - M) / CELL), cz = Math.floor((y - M) / CELL);
    return cx >= 0 && cz >= 0 && cx < Dorm.ROOM.w && cz < Dorm.ROOM.d ? { x: cx, z: cz } : null;
  }

  function click(cell) {
    if (!cell) return;
    const there = Dorm.itemAt(items, cell.x, cell.z);
    if (tool === 'remove') {
      const r = Dorm.removeAt(items, cell.x, cell.z);
      if (r.ok) commit(r.items, `${Dorm.ITEMS[r.removed.type].name} taken away.`);
      return;
    }
    if (!selected) {
      if (there) { selected = there.type; rot = there.rot; note = `${Dorm.ITEMS[there.type].name} picked up: click where it should go.`; refresh(); draw(); }
      return;
    }
    const cand = candidate(), res = Dorm.place(items, cand);
    if (!res.ok) { note = res.reason; refresh(); draw(); return; }
    commit(res.items, `${Dorm.ITEMS[cand.type].name} placed.`);
  }

  function turn() {
    if (!selected) { note = 'Pick a piece first, then press R to turn it.'; refresh(); return; }
    rot = (currentRot() + 1) % 4; note = ''; refresh(); draw();
  }

  /* ---------- building the screen (once) ---------- */
  function wire() {
    if (wired) return;
    wired = true;
    canvas = $('dorm-canvas'); canvas.width = W; canvas.height = H; ctx = canvas.getContext('2d');
    $('dorm').style.setProperty('--plan-ratio', String(W / H));
    const pal = $('dorm-palette');
    Object.keys(Dorm.ITEMS).forEach(t => {
      const b = el('button', 'plan-item'); b.type = 'button'; b.dataset.type = t;
      b.append(el('span', 'plan-name', Dorm.ITEMS[t].name), el('span', 'plan-state', ''));
      b.addEventListener('click', () => { selected = selected === t && tool === 'place' ? null : t; tool = 'place'; rot = null; note = ''; refresh(); draw(); });
      pal.appendChild(b);
    });
    $('dorm-rotate').addEventListener('click', turn);
    $('dorm-remove').addEventListener('click', () => { tool = tool === 'remove' ? 'place' : 'remove'; if (tool === 'remove') selected = null; note = ''; refresh(); draw(); });
    $('dorm-clear').addEventListener('click', () => {
      if (clearTimer === null) { $('dorm-clear').textContent = 'Sure? Click again'; clearTimer = setTimeout(() => { clearTimer = null; $('dorm-clear').textContent = 'Clear room'; }, 3000); return; }
      clearTimeout(clearTimer); clearTimer = null; $('dorm-clear').textContent = 'Clear room';
      commit([], 'The room is empty.');
    });
    $('dorm-done').addEventListener('click', close);
    canvas.addEventListener('mousemove', e => { const c = cellAt(e); if (!hover !== !c || (c && hover && (c.x !== hover.x || c.z !== hover.z))) { hover = c; draw(); } });
    canvas.addEventListener('mouseleave', () => { hover = null; draw(); });
    canvas.addEventListener('click', e => click(cellAt(e)));
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); const c = cellAt(e); if (!c) return; const r = Dorm.removeAt(items, c.x, c.z); if (r.ok) commit(r.items, `${Dorm.ITEMS[r.removed.type].name} taken away.`); });
    window.addEventListener('keydown', e => {
      if (!isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyR') { e.preventDefault(); if (!e.repeat) turn(); }
      else if ((e.code === 'Delete' || e.code === 'Backspace') && hover) { e.preventDefault(); const r = Dorm.removeAt(items, hover.x, hover.z); if (r.ok) commit(r.items, `${Dorm.ITEMS[r.removed.type].name} taken away.`); }
    });
  }

  /* ---------- open and close ---------- */
  function open(r) {
    if (Dorm.BUILD !== BUILD) { UI.dialog({ title: 'Files out of date', html: '<p>Your browser mixed old and new game files. Reload the page with Ctrl+Shift+R (Cmd+Shift+R on Mac) and try again.</p>' }); return; }
    wire();
    room = r; items = room.get(); selected = null; tool = 'place'; rot = null; hover = null; note = '';
    Player.teleport(room.entry.x, room.entry.z, room.entry.yaw);          // stand in the doorway lane, clear of whatever you place
    $('dorm').classList.remove('hidden');
    UI.setOpen('dorm', true);
    refresh(); draw();
  }

  function close() {
    if (clearTimer !== null) { clearTimeout(clearTimer); clearTimer = null; $('dorm-clear').textContent = 'Clear room'; }
    $('dorm').classList.add('hidden');
    UI.setOpen('dorm', false);
    if (room) Player.teleport(room.entry.x, room.entry.z, room.entry.yaw);
  }

  return { BUILD, isOpen, open, close, W, H, CELL, M, cellCenter: (x, z) => [px(x) + CELL / 2, px(z) + CELL / 2],
    /** For tests: the planner's current state. */
    current: () => ({ selected, rot: currentRot(), manualRot: rot, tool, items: items.map(o => ({ ...o })), note }), facingRoom };
})();
