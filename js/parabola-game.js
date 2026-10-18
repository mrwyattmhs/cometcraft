/* Mini-game engine for the two graphing tables.
   One wager (50 chips), one shot. The questions come one at a time on the left:
     1. the axis of symmetry   x = [ ]
     2. the vertex             ( x , [ ] )    x is filled in from step 1
     3. the y-intercept        ( 0 , [ ] )
   and the graph on the right is sketched from the student's own answers as they go:
   the axis first, then the vertex and the curve, then the intercept and its mirror point.
   If an answer is off, the points visibly miss the curve.

   Two tables share this engine and differ only by their config:
     ParabolaGame  standard form,  y = ax² + bx + c   (overlay #par)
     VertexGame    vertex form,    y = a(x - h)² + k  (overlay #vtx)

   The math lives in parabolas.js; this file is only the interface. */
const BUILD_GRAPH_TABLES = 17; // must match Parabolas.BUILD

function createGraphTable(cfg) {
  const P = cfg.prefix;
  const root = () => document.getElementById(P);
  const $ = id => document.getElementById(`${P}-${id}`);
  const SLOT_NAMES = ['Axis of symmetry', 'Vertex y-value', 'Y-intercept y-value'];

  let problem = null;
  let state = 'idle';            // idle | betting | playing | done
  let slots = [null, null, null]; // axis, vertex y, y-intercept y
  let wired = false;
  let lastKey = null;
  const slotEls = [];

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  const label = n => String(n);
  const numColor = n => `hsl(${120 + ((Math.abs(n) * 23) % 100)} 60% ${n < 0 ? 34 : 48}%)`;
  const numGem = n => `<span class="gem-face" style="--gem:${numColor(n)}">${label(n)}</span>`;

  /* ---------- building the interface (once) ---------- */
  function mkSlot(i) {
    const b = el('button', 'slot');
    b.type = 'button';
    b.addEventListener('click', () => removeAt(i));
    slotEls[i] = b;
    return b;
  }

  function wire() {
    if (wired) return;
    wired = true;

    const card = el('button', 'btn bet-card bet');
    card.type = 'button';
    card.dataset.bet = Parabolas.WAGER;
    card.innerHTML =
      `<span class="bet-amt">${Parabolas.WAGER} chips</span>` +
      `<span class="bet-desc">${cfg.betDesc}</span>` +
      `<span class="bet-win">Win ${Parabolas.payout()}</span>`;
    card.addEventListener('click', chooseBet);
    $('bets').appendChild(card);

    const r1 = $('r1'), r2 = $('r2'), r3 = $('r3');
    const row1 = el('div', 'eq-row');
    row1.append(el('span', 'op', 'x ='), mkSlot(0));
    r1.append(el('h3', '', 'Step 1: axis of symmetry'), el('p', 'hint', cfg.hints.axis), row1);

    const row2 = el('div', 'eq-row');
    const axisShow = el('span', 'axis-show');
    axisShow.id = `${P}-axis-show`;
    row2.append(el('span', 'op', '('), axisShow, el('span', 'op', ','), mkSlot(1), el('span', 'op', ')'));
    r2.append(el('h3', '', 'Step 2: vertex'), el('p', 'hint', cfg.hints.vertex), row2);

    const row3 = el('div', 'eq-row');
    row3.append(el('span', 'op', '(0 ,'), mkSlot(2), el('span', 'op', ')'));
    r3.append(el('h3', '', 'Step 3: y-intercept'), el('p', 'hint', cfg.hints.yint), row3);

    const inv = $('inventory');
    for (let n = -Parabolas.PALETTE_MAX; n <= Parabolas.PALETTE_MAX; n++) {
      const b = el('button', 'gem');
      b.type = 'button';
      b.setAttribute('aria-label', `Number ${n}`);
      b.innerHTML = numGem(n);
      b.addEventListener('click', () => place(n));
      inv.appendChild(b);
    }

    $('close').addEventListener('click', close);
    $('craft').addEventListener('click', craft);
    $('next').addEventListener('click', newRound);
    Store.onChange(() => { $('wallet').textContent = `${Store.get().chips} chips`; if (state !== 'idle') render(); });
  }

  /* ---------- open / close / rounds ---------- */
  function open() {
    if (Parabolas.BUILD !== BUILD_GRAPH_TABLES) {
      UI.dialog({
        title: 'Files out of date',
        html: '<p>Your browser mixed old and new game files. Reload the page with Ctrl+Shift+R (Cmd+Shift+R on Mac) and try again.</p>',
      });
      return;
    }
    wire();
    root().classList.remove('hidden');
    UI.setOpen('par', true);
    newRound();
    $('close').focus();
  }

  function close() {
    state = 'idle';
    root().classList.add('hidden');
    UI.setOpen('par', false);
  }

  const isOpen = () => !root().classList.contains('hidden');

  /** Back to the wager screen. Nothing is dealt until the wager is placed. */
  function newRound() {
    problem = null;
    slots = [null, null, null];
    state = 'betting';
    $('result').innerHTML = '';
    root().scrollTop = 0;
    setMsg('');
    render();
  }

  function chooseBet() {
    if (state !== 'betting' || Parabolas.WAGER > Store.get().chips) return;
    let p = Parabolas.generate();
    for (let tries = 0; tries < 6 && `${p.a},${p.h},${p.k}` === lastKey; tries++) p = Parabolas.generate();
    lastKey = `${p.a},${p.h},${p.k}`;
    problem = p;
    slots = [null, null, null];
    state = 'playing';
    setMsg('Fill in the axis of symmetry.');
    render();
  }

  /* ---------- answering ---------- */
  function place(n) {
    if (state !== 'playing') return;
    const i = slots.indexOf(null);
    if (i < 0) { setMsg('All three are filled in. Click one to take it back out.'); return; }
    slots[i] = n;
    setMsg('');
    render();
  }

  function removeAt(i) {
    if (state !== 'playing' || slots[i] === null) return;
    slots[i] = null;
    render();
  }

  function craft() {
    if (state !== 'playing' || slots.some(s => s === null)) return;
    const res = cfg.check(problem, { axis: slots[0], vy: slots[1], yint: slots[2] });
    const s = Store.get();
    if (res.ok) {
      const win = Parabolas.payout();
      Store.addChips(win);
      Store.set({ [cfg.statWins]: (s[cfg.statWins] || 0) + 1 });
      finish(res, `Correct! You bet ${Parabolas.WAGER} and won ${win} chips (${Parabolas.MULT}x).`, 'good');
    } else {
      const floored = Store.addChips(-Parabolas.WAGER);
      Store.set({ [cfg.statLosses]: (s[cfg.statLosses] || 0) + 1 });
      finish(res, `Not this time. You lose ${Parabolas.WAGER} chips.` +
        (floored ? ` The house tops you up to ${Store.MIN_CHIPS} chips so you can keep playing.` : ''), 'bad');
    }
  }

  function finish(res, msg, kind) {
    state = 'done';
    setMsg(msg, kind);
    const sol = cfg.solution(problem);
    const verdict = ok => (ok ? 'correct' : 'missed');
    const pt = ([x, y]) => `(${x}, ${y})`;
    const notes = ['axis of symmetry', 'vertex', 'y-intercept'];

    $('result').innerHTML =
      `<div class="final stack ${kind}" role="group" aria-label="Answers">` +
        `<div class="final-col"><div class="final-label">Axis of symmetry</div><div class="final-expr">x = ${sol.axis}</div></div>` +
        `<div class="final-col"><div class="final-label">Vertex</div><div class="final-expr">${pt(sol.vertex)}</div></div>` +
        `<div class="final-col"><div class="final-label">y-intercept</div><div class="final-expr">${pt(sol.yint)}</div></div>` +
      '</div>' +
      '<ul class="checks">' +
        `<li class="${res.axis ? 'ok' : 'bad'}">Axis of symmetry: ${verdict(res.axis)}</li>` +
        `<li class="${res.vertex ? 'ok' : 'bad'}">Vertex: ${verdict(res.vertex)}${res.vertex ? '' : cfg.vertexMiss}</li>` +
        `<li class="${res.yint ? 'ok' : 'bad'}">y-intercept: ${verdict(res.yint)}${res.yint ? '' : cfg.yintMiss}</li>` +
      '</ul>' +
      '<details class="worked"><summary>Show the steps</summary><ol class="work">' +
        sol.lines.map((l, i) => `<li>${l}<small>${notes[i]}</small></li>`).join('') +
      '</ol></details>';
    root().scrollTop = 0;
    render();
    $('next').focus();
  }

  /* ---------- the graph ---------- */
  const W = 420, H = 380, PL = 40, PR = 12, PT = 12, PB = 28;

  /** layers: [{type:'axis'|'curve'|'point', ...}] drawn in order. */
  function graphSVG(v, layers) {
    const pw = W - PL - PR, ph = H - PT - PB;
    const sx = x => PL + ((x - v.xmin) / (v.xmax - v.xmin)) * pw;
    const sy = y => PT + ((v.ymax - y) / (v.ymax - v.ymin)) * ph;
    const f = n => Math.round(n * 10) / 10;
    const ySpan = v.ymax - v.ymin;
    const yStep = ySpan <= 16 ? 1 : ySpan <= 34 ? 2 : 5;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Graph of the parabola" class="graph-svg">`;
    s += `<defs><clipPath id="${P}-clip"><rect x="${PL}" y="${PT}" width="${pw}" height="${ph}"/></clipPath></defs>`;
    s += `<rect x="${PL}" y="${PT}" width="${pw}" height="${ph}" fill="#17131f"/>`;

    // grid and tick labels
    for (let x = Math.ceil(v.xmin); x <= Math.floor(v.xmax); x++) {
      s += `<line x1="${f(sx(x))}" y1="${PT}" x2="${f(sx(x))}" y2="${PT + ph}" stroke="#34304a" stroke-width="1"/>`;
      if (x % 2 === 0 && x !== 0) s += `<text x="${f(sx(x))}" y="${H - 8}" text-anchor="middle" class="tick">${x}</text>`;
    }
    for (let y = Math.ceil(v.ymin); y <= Math.floor(v.ymax); y++) {
      s += `<line x1="${PL}" y1="${f(sy(y))}" x2="${PL + pw}" y2="${f(sy(y))}" stroke="#34304a" stroke-width="1"/>`;
      if (y % yStep === 0 && y !== 0) s += `<text x="${PL - 6}" y="${f(sy(y)) + 4}" text-anchor="end" class="tick">${y}</text>`;
    }
    // axes
    if (v.xmin <= 0 && v.xmax >= 0) s += `<line x1="${f(sx(0))}" y1="${PT}" x2="${f(sx(0))}" y2="${PT + ph}" stroke="#b9b4cc" stroke-width="2"/>`;
    if (v.ymin <= 0 && v.ymax >= 0) s += `<line x1="${PL}" y1="${f(sy(0))}" x2="${PL + pw}" y2="${f(sy(0))}" stroke="#b9b4cc" stroke-width="2"/>`;

    s += '<g clip-path="url(#${P}-clip)">';
    layers.forEach(L => {
      if (L.type === 'axis') {
        s += `<line x1="${f(sx(L.x))}" y1="${PT}" x2="${f(sx(L.x))}" y2="${PT + ph}" stroke="${L.color}" stroke-width="2" stroke-dasharray="7 5"/>`;
      } else if (L.type === 'curve') {
        const pts = Parabolas.curve(L.a, L.h, L.k, v.xmin, v.xmax, 0.1).map(([x, y]) => `${f(sx(x))},${f(sy(y))}`).join(' ');
        s += `<polyline points="${pts}" fill="none" stroke="${L.color}" stroke-width="${L.width || 3}" stroke-linejoin="round"${L.dash ? ' stroke-dasharray="8 6"' : ''}/>`;
      }
    });
    s += '</g>';
    layers.filter(L => L.type === 'point').forEach(L => {
      const cx = f(sx(L.x)), cy = f(sy(L.y));
      s += L.hollow
        ? `<circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="${L.color}" stroke-width="3"/>`
        : `<circle cx="${cx}" cy="${cy}" r="6" fill="${L.color}" stroke="#17131f" stroke-width="2"/>`;
      if (L.text) {
        const right = cx < W - 90;
        s += `<text x="${right ? cx + 10 : cx - 10}" y="${cy - 9}" text-anchor="${right ? 'start' : 'end'}" class="plabel" fill="${L.color}">${L.text}</text>`;
      }
    });
    return s + '</svg>';
  }

  const C_AXIS = '#38e8ff', C_VERTEX = '#ff6a6a', C_INT = '#52f08f', C_CURVE = '#ffd36b';

  function renderGraph() {
    const host = $('graph');
    if (!problem) { host.innerHTML = ''; return; }
    const v = Parabolas.view(problem);
    const layers = [];
    const [ax, vy, yi] = slots;
    const { a } = problem;

    if (state === 'done') {
      // the true parabola, plus the student's own marks only where they differ from it
      const vertexOff = ax !== problem.h || vy !== problem.k;
      const yintOff = yi !== problem.c;
      layers.push({ type: 'axis', x: problem.h, color: C_AXIS });
      layers.push({ type: 'curve', a, h: problem.h, k: problem.k, color: C_CURVE, width: 4 });
      if (vertexOff) layers.push({ type: 'curve', a, h: ax, k: vy, color: '#ff6a6a', dash: true, width: 2 });
      layers.push({ type: 'point', x: 2 * problem.h, y: problem.c, color: C_INT });
      layers.push({ type: 'point', x: 0, y: problem.c, color: C_INT, text: `(0, ${problem.c})` });
      layers.push({ type: 'point', x: problem.h, y: problem.k, color: C_VERTEX, text: `(${problem.h}, ${problem.k})` });
      if (vertexOff) layers.push({ type: 'point', x: ax, y: vy, color: '#ffffff', hollow: true });
      if (yintOff) layers.push({ type: 'point', x: 0, y: yi, color: '#ffffff', hollow: true });
    } else {
      // sketched from what the student has entered so far
      if (ax !== null) layers.push({ type: 'axis', x: ax, color: C_AXIS });
      if (ax !== null && vy !== null) layers.push({ type: 'curve', a, h: ax, k: vy, color: C_CURVE });
      if (yi !== null) {
        if (ax !== null && ax !== 0) layers.push({ type: 'point', x: 2 * ax, y: yi, color: C_INT });
        layers.push({ type: 'point', x: 0, y: yi, color: C_INT, text: `(0, ${yi})` });
      }
      if (ax !== null && vy !== null) layers.push({ type: 'point', x: ax, y: vy, color: C_VERTEX, text: `(${ax}, ${vy})` });
    }
    host.innerHTML = graphSVG(v, layers);
  }

  /* ---------- rendering ---------- */
  function setMsg(text, kind = '') {
    const m = $('msg');
    m.textContent = text;
    m.className = 'msg ' + kind;
  }

  const show = (id, on) => $(id).classList.toggle('hidden', !on);

  function render() {
    const stage = state === 'betting' ? 'bet' : state === 'done' ? 'done' : 'play';
    root().dataset.state = state;
    root().dataset.stage = stage;

    const chips = Store.get().chips;
    const locked = Parabolas.WAGER > chips;
    const card = document.querySelector(`#${P}-bets .bet`);
    if (card) {
      card.disabled = locked;
      card.querySelector('.bet-win').textContent = locked ? `Need ${Parabolas.WAGER} chips` : `Win ${Parabolas.payout()}`;
    }
    $('lowhint').classList.toggle('hidden', !locked);

    // one thing at a time
    const [ax, vy, yi] = slots;
    show('bet-row', stage === 'bet');
    show('wager', stage === 'play');
    show('main', stage !== 'bet');
    show('felt', stage === 'play');
    show('steps', stage === 'play');
    show('r2', ax !== null);
    show('r3', ax !== null && vy !== null);
    show('inv-wrap', stage === 'play');
    show('result', stage === 'done');
    show('craft', stage === 'play' && ax !== null && vy !== null && yi !== null);
    show('next', stage === 'done');
    if (!problem) { renderGraph(); return; }

    $('wager').textContent = `Wager: ${Parabolas.WAGER} chips. Win ${Parabolas.payout()} if you get it right.`;
    $('poly').textContent = cfg.fmt(problem);

    slotEls.forEach((b, i) => {
      b.innerHTML = slots[i] === null ? '' : numGem(slots[i]);
      b.setAttribute('aria-label', slots[i] === null ? `${SLOT_NAMES[i]}, empty` : `${SLOT_NAMES[i]}: ${slots[i]}. Click to remove.`);
    });
    $('axis-show').innerHTML = ax === null ? '' : numGem(ax);
    $('craft').disabled = !(ax !== null && vy !== null && yi !== null);
    renderGraph();
  }

  return { open, close, isOpen };
}

const ParabolaGame = createGraphTable({
  prefix: 'par',
  betDesc: 'Graph a parabola from standard form',
  hints: {
    axis: 'What is the axis of symmetry?',
    vertex: 'The vertex sits on the axis. Plug that x into the polynomial to find y.',
    yint: 'Where does the parabola cross the y-axis?',
  },
  fmt: p => Parabolas.fmtPoly(p),
  check: (p, s) => Parabolas.check(p, s),
  solution: p => Parabolas.solution(p),
  vertexMiss: '. Plug your x back into the polynomial.',
  yintMiss: '. At x = 0 only c is left.',
  statWins: 'parabolaWins',
  statLosses: 'parabolaLosses',
});

const VertexGame = createGraphTable({
  prefix: 'vtx',
  betDesc: 'Graph a parabola from vertex form',
  hints: {
    axis: 'What is the axis of symmetry?',
    vertex: 'The vertex sits on the axis. What is its y-value?',
    yint: 'Where does the parabola cross the y-axis? Plug in x = 0.',
  },
  fmt: p => Parabolas.fmtVertexForm(p),
  check: (p, s) => Parabolas.checkVertexForm(p, s),
  solution: p => Parabolas.solutionVertexForm(p),
  vertexMiss: '. The y-value of the vertex is k.',
  yintMiss: '. Plug x = 0 into the equation.',
  statWins: 'vertexWins',
  statLosses: 'vertexLosses',
});
