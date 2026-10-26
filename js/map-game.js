/* The "find the state" map on the classroom wall.

   Walk up to the map and press E. The game names a state and you click it on the map. A first-try answer pays 20 chips.
   Miss, and the game shows you where it was and asks that state again a little later. Every state comes up once before any
   repeats. States you have found on the first try turn green.

   Scroll to zoom and drag to move, so the tiny northeastern states are easy to hit. The shapes, the "which state is at
   this point?" test, and the question deck live in usmap.js; this file is the screen. */
const MapGame = (() => {
  const $ = id => document.getElementById(id);
  const BUILD = 32; // must match USMap.BUILD
  const OCEAN = '#cfe8f5';
  const COLOR = { found: '#b9e8a8', hover: '#fff3b0', right: '#4fd068', wrong: '#ff7a7a' };
  const MAX_ZOOM = 8;
  const FORGIVE_PX = 9;        // a click this close to a state still counts for it, so coastlines and tiny states are fair
  const AUTO_NEXT_MS = 1500;   // after a right answer, how long before the next state

  /** Timers are swappable so tests do not have to wait. */
  const clock = { later: (fn, ms) => setTimeout(fn, ms), cancel: id => clearTimeout(id) };

  let canvas, ctx, k0;                       // k0: canvas pixels per map unit when the whole map is showing
  let view = { zoom: 1, tx: 0, ty: 0 };      // zoom factor, and where the map's corner sits on the canvas (in canvas pixels)
  let deck = null, target = null, phase = 'idle';   // phase: idle | ask | result
  let clicked = null, hover = null;          // the state you clicked, and the one under the pointer
  let streak = 0, tried = 0, right = 0;
  let nextTimer = null, wired = false, drag = null;

  const isOpen = () => !$('usmap').classList.contains('hidden');
  const show = (id, on) => $(id).classList.toggle('hidden', !on);
  const found = () => new Set(Store.get().mapFound);
  const nameOf = code => USMap.byCode[code].name;

  /* ---------- the picture ---------- */
  const scale = () => k0 * view.zoom;
  const fills = () => {
    const f = found();
    return s => {
      if (phase === 'result' && s.code === target) return COLOR.right;
      if (phase === 'result' && clicked && s.code === clicked && s.code !== target) return COLOR.wrong;
      if (phase === 'ask' && hover && s.code === hover) return COLOR.hover;
      if (f.has(s.code)) return COLOR.found;
      return USMap.PALETTE[s.color];
    };
  };

  function render() {
    if (!ctx) return;
    ctx.fillStyle = OCEAN; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const outline = {};
    if (phase === 'result') { outline[target] = '#1d6b2c'; if (clicked && clicked !== target) outline[clicked] = '#a02020'; }
    USMap.draw(ctx, { scale: scale(), dx: view.tx, dy: view.ty, fill: fills(), stroke: '#5a4a3a', lineWidth: Math.max(1, Math.min(2.2, 1 + view.zoom * 0.25)), outline: Object.keys(outline).length ? outline : null });
    if (phase === 'result') [target, clicked].filter((c, i, a) => c && a.indexOf(c) === i).forEach(label);
  }

  /** Print a state's name inside it, in dark chalk on a pale patch so it can be read on any color. */
  function label(code) {
    const s = USMap.byCode[code], x = view.tx + s.ax * scale(), y = view.ty + s.ay * scale();
    const shown = canvas.getBoundingClientRect().width || canvas.width;          // the canvas is drawn bigger than it is shown
    const size = Math.max(22, Math.min(64, 18 * canvas.width / shown));            // so size the label for about 18 pixels on screen
    ctx.font = `${size}px "Patrick Hand", "Chalkboard SE", "Comic Sans MS", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(s.name).width;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(x - w / 2 - 8, y - size * 0.62, w + 16, size * 1.24);
    ctx.strokeStyle = code === target ? '#1d6b2c' : '#a02020'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2 - 8, y - size * 0.62, w + 16, size * 1.24);
    ctx.fillStyle = '#243024'; ctx.fillText(s.name, x, y + 1);
  }

  /* ---------- pointing ---------- */
  /** Where a mouse event is, in canvas pixels (the canvas is shown at whatever size fits the screen). */
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    const sx = r.width ? canvas.width / r.width : 1, sy = r.height ? canvas.height / r.height : 1;
    return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy];
  }
  const toMap = ([px, py]) => [(px - view.tx) / scale(), (py - view.ty) / scale()];

  /** Keep the map from being dragged out of sight. */
  function clamp() {
    const w = USMap.WIDTH * scale(), h = USMap.HEIGHT * scale();
    view.tx = w <= canvas.width ? (canvas.width - w) / 2 : Math.min(0, Math.max(canvas.width - w, view.tx));
    view.ty = h <= canvas.height ? (canvas.height - h) / 2 : Math.min(0, Math.max(canvas.height - h, view.ty));
  }

  /** Zoom by a factor, keeping the spot at canvas point (px, py) where it is. */
  function zoomAt(factor, px = canvas.width / 2, py = canvas.height / 2) {
    const z = Math.max(1, Math.min(MAX_ZOOM, view.zoom * factor));
    if (z === view.zoom) return;
    const [mx, my] = toMap([px, py]);
    view.zoom = z;
    view.tx = px - mx * scale(); view.ty = py - my * scale();
    clamp(); render();
  }
  const resetView = () => { view = { zoom: 1, tx: 0, ty: 0 }; clamp(); render(); };

  /* ---------- the questions ---------- */
  function updateStats() {
    const best = Store.get().mapBestStreak;
    const st = Store.get();
    $('usmap-stats').textContent = `Found ${found().size} of 50   Streak ${streak}   Best streak ${best}   ${Trophies.progressText(st.solved || {}, st.trophies || [], 'map')}`;
  }

  /** The line under the map. With nothing to say it reminds you how to zoom. */
  function say(text, kind) {
    const el = $('usmap-feedback');
    el.textContent = text || 'Scroll to zoom and drag to move the map. Tiny states are easier to find up close.';
    el.className = 'chalk-feedback' + (text ? (kind ? ' ' + kind : '') : ' tip');
  }

  function next() {
    if (nextTimer !== null) { clock.cancel(nextTimer); nextTimer = null; }
    target = deck.next(); clicked = null; hover = null; phase = 'ask';
    $('usmap-prompt').innerHTML = '';
    $('usmap-prompt').append('Click on: ', Object.assign(document.createElement('b'), { textContent: nameOf(target) }));
    show('usmap-next', false); say('');
    resetView(); updateStats();
  }

  /** The player clicked a spot. state is the state there (or null for open water). */
  function answer(state) {
    if (phase !== 'ask') return;
    if (!state) { say('That is open water. Click on a state.', ''); return; }
    if (!state.isState) { say(`That is ${state.name}, which is not a state. Try again.`, ''); return; }
    tried++; clicked = state.code; phase = 'result';
    if (state.code === target) {
      right++; streak++;
      Store.earn(USMap.REWARD);
      Trophies.award('map');
      const first = Store.markMapFound(target);
      Store.recordMapStreak(streak);
      say(`Correct! That is ${nameOf(target)}. +${USMap.REWARD} chips${first ? '  (a new state found!)' : ''}`, 'good');
      nextTimer = clock.later(next, AUTO_NEXT_MS);
    } else {
      streak = 0; deck.missed(target);
      say(`Not quite. That is ${state.name}. ${nameOf(target)} is the green one.`, 'bad');
      show('usmap-next', true);
    }
    updateStats(); render();
  }

  /* ---------- building the screen (once) ---------- */
  function wire() {
    if (wired) return;
    wired = true;
    canvas = $('usmap-canvas');
    canvas.width = 1400; canvas.height = Math.round(1400 * USMap.HEIGHT / USMap.WIDTH);
    $('usmap').style.setProperty('--map-ratio', String(canvas.width / canvas.height));   // lets the CSS size the map frame from the window's height
    ctx = canvas.getContext('2d');
    k0 = canvas.width / USMap.WIDTH;

    canvas.addEventListener('mousedown', e => { if (e.button !== 0) return; drag = { from: canvasPoint(e), tx: view.tx, ty: view.ty, moved: 0 }; });
    window.addEventListener('mousemove', e => {
      if (!isOpen()) return;
      if (drag) {
        const [px, py] = canvasPoint(e);
        drag.moved = Math.max(drag.moved, Math.hypot(px - drag.from[0], py - drag.from[1]));
        if (drag.moved > 6 && view.zoom > 1) { view.tx = drag.tx + px - drag.from[0]; view.ty = drag.ty + py - drag.from[1]; clamp(); canvas.classList.add('dragging'); render(); }
        return;
      }
      if (e.target !== canvas) return;
      const [mx, my] = toMap(canvasPoint(e)), s = USMap.pick(mx, my);
      const code = s && s.isState ? s.code : null;
      if (code !== hover) { hover = code; render(); }
    });
    window.addEventListener('mouseup', e => {
      if (!drag) return;
      const d = drag; drag = null; canvas.classList.remove('dragging');
      if (d.moved > 6 || !isOpen()) return;                                   // that was a drag, not a click
      const [mx, my] = toMap(d.from);
      answer(USMap.pick(mx, my, FORGIVE_PX / scale()));
    });
    // zoom by how far the wheel moved: one mouse-wheel notch (100) is 1.25 times, and a trackpad's many tiny events add up smoothly
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);     // some browsers report lines or pages, not pixels
      const [px, py] = canvasPoint(e);
      zoomAt(Math.max(0.5, Math.min(2, Math.pow(1.25, -dy / 100))), px, py);
    }, { passive: false });
    canvas.addEventListener('mouseleave', () => { if (hover) { hover = null; render(); } });

    $('usmap-zoom-in').addEventListener('click', () => zoomAt(1.5));
    $('usmap-zoom-out').addEventListener('click', () => zoomAt(1 / 1.5));
    $('usmap-zoom-reset').addEventListener('click', resetView);
    $('usmap-next').addEventListener('click', next);
    $('usmap-close').addEventListener('click', close);
    window.addEventListener('keydown', e => {
      if (!isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.key === 'Enter' || e.key === ' ') && phase === 'result' && e.target.tagName !== 'BUTTON') { e.preventDefault(); next(); }
      else if (e.key === '+' || e.key === '=') zoomAt(1.5);
      else if (e.key === '-') zoomAt(1 / 1.5);
    });
    Store.onChange(() => { $('usmap-wallet').textContent = `${Store.get().chips} chips`; if (isOpen()) updateStats(); });
  }

  /* ---------- open and close ---------- */
  /** opts.rng: a random number source, so a test can ask for the same states every time. */
  function open(opts = {}) {
    if (USMap.BUILD !== BUILD) {
      UI.dialog({ title: 'Files out of date', html: '<p>Your browser mixed old and new game files. Reload the page with Ctrl+Shift+R (Cmd+Shift+R on Mac) and try again.</p>' });
      return;
    }
    wire();
    deck = USMap.createDeck(opts.rng); streak = 0; tried = 0; right = 0;
    $('usmap').classList.remove('hidden');
    UI.setOpen('usmap', true);
    next();
  }

  function close() {
    if (nextTimer !== null) { clock.cancel(nextTimer); nextTimer = null; }
    drag = null; phase = 'idle';
    $('usmap').classList.add('hidden');
    UI.setOpen('usmap', false);
  }

  return {
    BUILD, isOpen, open, close, next,
    /** For tests and the screen reader: what is being asked, and how it is going. */
    current: () => ({ target, phase, streak, tried, right, zoom: view.zoom, tx: view.tx, ty: view.ty, width: canvas ? canvas.width : 0, height: canvas ? canvas.height : 0 }),
    /** The canvas pixel where a state's label spot is right now (to click it in a test). */
    pointFor: code => { const s = USMap.byCode[code]; return [view.tx + s.ax * scale(), view.ty + s.ay * scale()]; },
    clock,
  };
})();
