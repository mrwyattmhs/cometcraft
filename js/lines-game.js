/* The Lines table: graph a line from its equation by clicking points on a plane.

   Pick a form (slope-intercept, point-slope or standard form) and a line is dealt. You click two points, one step at a time, and the
   line is drawn through them. Every click snaps to the nearest whole-number point, and a ring shows which one before you click.
   A wrong click gets a hint; a second wrong click on the same step shows the answer, and that line does not pay.
   A line done without help pays 25 chips and counts toward the Lines trophy, whichever form it was in.

   The problems, the steps and the checking are in lines.js. This file draws the plane and runs the steps. */
const LinesGame = (() => {
  const $ = id => document.getElementById(`lin-${id}`);
  const root = () => document.getElementById('lin');
  const BUILD = 38; // must match Lines.BUILD
  const N = Lines.GRID, CELL = 24, PL = 30, PT = 14, PR = 14, PB = 30;
  const PW = 2 * N * CELL, W = PL + PW + PR, H = PT + PW + PB;
  const sx = x => PL + (x + N) * CELL, sy = y => PT + (N - y) * CELL;
  const MINUS = '\u2212', num = n => (n < 0 ? MINUS + -n : String(n)), pt = (x, y) => `(${num(x)}, ${num(y)})`;
  const COLORS = ['#52f08f', '#ffd36b'];

  let wired = false, state = 'idle', formId = null, problem = null, stepIdx = 0, placed = [], wrong = 0, missed = false;
  let lastEq = null, cursor = { x: 0, y: 0 }, ring = null;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isOpen = () => !root().classList.contains('hidden');

  /* ---------- the plane ---------- */
  function graphSVG() {
    const f = n => Math.round(n * 10) / 10;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${placed.length ? 'Coordinate grid. Plotted: ' + placed.map(p => pt(p.x, p.y)).join(', ') : 'Coordinate grid, nothing plotted yet'}">`;
    s += `<defs><clipPath id="lin-clip"><rect x="${PL}" y="${PT}" width="${PW}" height="${PW}"/></clipPath></defs>`;
    s += `<rect x="${PL}" y="${PT}" width="${PW}" height="${PW}" fill="#17131f"/>`;
    for (let n = -N; n <= N; n++) {
      const major = n % 5 === 0;
      s += `<line x1="${sx(n)}" y1="${PT}" x2="${sx(n)}" y2="${PT + PW}" stroke="${major ? '#4d4870' : '#2e2a44'}" stroke-width="1"/>`;
      s += `<line x1="${PL}" y1="${sy(n)}" x2="${PL + PW}" y2="${sy(n)}" stroke="${major ? '#4d4870' : '#2e2a44'}" stroke-width="1"/>`;
      if (n !== 0) {
        s += `<text x="${sx(n)}" y="${H - 11}" text-anchor="middle" class="tick">${num(n)}</text>`;
        s += `<text x="${PL - 6}" y="${sy(n) + 4}" text-anchor="end" class="tick">${num(n)}</text>`;
      }
    }
    s += `<line x1="${sx(0)}" y1="${PT}" x2="${sx(0)}" y2="${PT + PW}" stroke="#b9b4cc" stroke-width="2"/><line x1="${PL}" y1="${sy(0)}" x2="${PL + PW}" y2="${sy(0)}" stroke="#b9b4cc" stroke-width="2"/>`;
    s += `<text x="${PL + PW - 4}" y="${sy(0) - 6}" text-anchor="end" class="tick">x</text><text x="${sx(0) + 7}" y="${PT + 11}" class="tick">y</text>`;
    // the line, once it is done
    if (state === 'done' && placed.length === 2) {
      const ends = Lines.lineEnds([placed[0].x, placed[0].y], [placed[1].x, placed[1].y]);
      if (ends) s += `<line clip-path="url(#lin-clip)" x1="${f(sx(ends[0][0]))}" y1="${f(sy(ends[0][1]))}" x2="${f(sx(ends[1][0]))}" y2="${f(sy(ends[1][1]))}" stroke="#ffd36b" stroke-width="4" stroke-linecap="round"/>`;
    }
    // rise and run, once the slope has been counted
    if (problem && problem.steps[1] && problem.steps[1].kind === 'slope' && placed.length === 2) {
      const [a, b] = placed, dx = b.x - a.x, dy = b.y - a.y;
      s += `<line x1="${sx(a.x)}" y1="${sy(a.y)}" x2="${sx(b.x)}" y2="${sy(a.y)}" stroke="#38e8ff" stroke-width="3" stroke-dasharray="6 4"/>`;
      s += `<line x1="${sx(b.x)}" y1="${sy(a.y)}" x2="${sx(b.x)}" y2="${sy(b.y)}" stroke="#ff9ad5" stroke-width="3" stroke-dasharray="6 4"/>`;
      s += `<text x="${(sx(a.x) + sx(b.x)) / 2}" y="${sy(a.y) + (dy >= 0 ? 15 : -7)}" text-anchor="middle" class="plabel" fill="#38e8ff">run ${num(dx)}</text>`;
      s += `<text x="${sx(b.x) + (dx >= 0 ? 8 : -8)}" y="${(sy(a.y) + sy(b.y)) / 2 + 4}" text-anchor="${dx >= 0 ? 'start' : 'end'}" class="plabel" fill="#ff9ad5">rise ${num(dy)}</text>`;
    }
    placed.forEach((p, i) => {
      const col = p.revealed ? '#ff9b3d' : COLORS[i];
      s += p.revealed
        ? `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="8" fill="none" stroke="${col}" stroke-width="4"/>`
        : `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="7" fill="${col}" stroke="#17131f" stroke-width="2"/>`;
      const right = sx(p.x) < W - 100;
      s += `<text x="${right ? sx(p.x) + 11 : sx(p.x) - 11}" y="${sy(p.y) - 10}" text-anchor="${right ? 'start' : 'end'}" class="plabel" fill="${col}">${pt(p.x, p.y)}</text>`;
    });
    s += `<circle id="lin-ring" cx="0" cy="0" r="9" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 3" visibility="hidden"/>`;
    return s + '</svg>';
  }

  /** Move the ring to a whole-number point (or hide it). */
  function showRing(p) {
    ring = $('graph').querySelector('#lin-ring');
    if (!ring) return;
    if (!p) { ring.setAttribute('visibility', 'hidden'); return; }
    ring.setAttribute('cx', sx(p.x)); ring.setAttribute('cy', sy(p.y)); ring.setAttribute('visibility', 'visible');
  }

  /** The whole-number point nearest a mouse position, or null if it is off the plane. */
  function pointAt(evt) {
    const svg = $('graph').querySelector('svg');
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const bl = svg.clientLeft || 0, bt = svg.clientTop || 0;                       // the svg has a border: the drawing starts inside it
    const cw = svg.clientWidth || r.width - 2 * bl, ch = svg.clientHeight || r.height - 2 * bt;
    const vx = (evt.clientX - r.left - bl) * W / cw, vy = (evt.clientY - r.top - bt) * H / ch;
    const x = Math.round((vx - PL) / CELL) - N, y = N - Math.round((vy - PT) / CELL);
    return Math.abs(x) <= N && Math.abs(y) <= N && vx > PL - CELL * 0.6 && vx < PL + PW + CELL * 0.6 && vy > PT - CELL * 0.6 && vy < PT + PW + CELL * 0.6 ? { x, y } : null;
  }

  /* ---------- the steps ---------- */
  function setMsg(text, kind = '') { const m = $('msg'); m.textContent = text; m.className = 'msg ' + kind; }

  function shake() {
    if (reduceMotion()) return;
    const g = $('graph'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
  }

  function render() {
    root().dataset.state = state;
    $('pick').classList.toggle('hidden', state !== 'picking');
    $('play').classList.toggle('hidden', state === 'picking');
    $('next').classList.toggle('hidden', state !== 'done');
    if (state === 'picking' || !problem) return;
    $('graph').innerHTML = graphSVG();
    $('eq').textContent = problem.eq;
    $('formname').textContent = Lines.formById(formId).name;
    const steps = $('steps'); steps.textContent = '';
    problem.steps.forEach((st, i) => {
      const li = el('li', i < stepIdx ? 'done' : i === stepIdx && state === 'playing' ? 'active' : '');
      li.dataset.n = i + 1;
      li.append(el('b', '', st.title), document.createTextNode(st.prompt));
      steps.append(li);
    });
  }

  /** A click (or Enter) on a whole-number point. */
  function plot(x, y) {
    if (state !== 'playing') return;
    const r = Lines.check(problem, stepIdx, placed, x, y);
    if (r.ok) {
      placed.push({ x, y });
      wrong = 0; stepIdx++;
      if (stepIdx === problem.steps.length) { finish(r.say); return; }
      setMsg(r.say, 'good');
    } else {
      wrong++;
      if (wrong > Lines.MISTAKES_ALLOWED) { reveal(); return; }
      setMsg(r.hint, 'bad');
      shake();
    }
    render();
  }

  /** A second wrong click: show the answer, plot it, and carry on (this line will not pay). */
  function reveal() {
    const [x, y] = Lines.answer(problem, stepIdx, placed);
    missed = true;
    placed.push({ x, y, revealed: true });
    wrong = 0; stepIdx++;
    const shown = `The answer was ${pt(x, y)} (the orange ring).`;
    if (stepIdx === problem.steps.length) { finish(shown); return; }
    setMsg(shown + ' Carry on with the next step.', 'bad');
    shake();
    render();
  }

  function finish(first) {
    state = 'done';
    const s = Store.get();
    if (!missed) {
      Store.earn(Lines.PAY);
      Store.set({ linesWins: (s.linesWins || 0) + 1 });
      Trophies.award('lines');
      setMsg(`${first} The line is drawn. +${Lines.PAY} chips!`, 'good');
    } else {
      Store.set({ linesLosses: (s.linesLosses || 0) + 1 });
      setMsg(`${first} The line is drawn, but it needed help, so no chips this time. Try the next one!`, 'bad');
    }
    const res = $('result'); res.textContent = '';
    res.append(el('div', 'factor-line', problem.eq));
    const ul = el('ul'); Lines.explain(problem).forEach(t => ul.append(el('li', '', t))); res.append(ul);
    render();
    $('next').focus();
  }

  /** Deal a line in the chosen form. */
  function deal(form) {
    formId = form;
    let p = Lines.generate(form);
    for (let tries = 0; tries < 6 && p && p.eq === lastEq; tries++) p = Lines.generate(form);
    problem = p; lastEq = p.eq;
    state = 'playing'; stepIdx = 0; placed = []; wrong = 0; missed = false;
    $('result').textContent = '';
    cursor = { x: 0, y: 0 };
    $('coords').textContent = '';
    setMsg('Click a point on the grid. The ring shows where it will land.');
    render();
    showRing(null);
    root().scrollTop = 0;
  }

  function pick() {
    state = 'picking'; problem = null; placed = []; stepIdx = 0;
    setMsg('');
    render();
    root().scrollTop = 0;
  }

  /* ---------- wiring ---------- */
  function wire() {
    if (wired) return;
    wired = true;
    Lines.FORMS.forEach(f => {
      const card = el('button', 'btn bet-card bet'); card.type = 'button'; card.dataset.form = f.id;
      card.append(el('span', 'bet-amt', f.name), el('span', 'bet-desc', f.form), el('span', 'bet-desc', f.blurb), el('span', 'bet-win', `Pays ${Lines.PAY} chips`));
      card.addEventListener('click', () => deal(f.id));
      $('forms').append(card);
    });
    $('pay').textContent = `Pays ${Lines.PAY} chips`;
    $('wallet').parentNode.insertBefore(Trophies.chip('lines'), $('wallet'));
    Store.onChange(() => { $('wallet').textContent = `${Store.get().chips} chips`; });
    $('close').addEventListener('click', close);
    $('again').addEventListener('click', pick);
    $('next').addEventListener('click', () => deal(formId));
    const host = $('graph');
    host.addEventListener('mousemove', e => { const p = pointAt(e); showRing(state === 'playing' ? p : null); $('coords').textContent = p ? pt(p.x, p.y) : ''; });
    host.addEventListener('mouseleave', () => { showRing(null); $('coords').textContent = ''; });
    host.addEventListener('click', e => { const p = pointAt(e); if (p) plot(p.x, p.y); });
    // the keyboard: arrow keys move a ring over the plane, Enter or Space plots there
    host.addEventListener('keydown', e => {
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      if (d) {
        e.preventDefault();
        cursor = { x: Math.max(-N, Math.min(N, cursor.x + d[0])), y: Math.max(-N, Math.min(N, cursor.y + d[1])) };
        showRing(state === 'playing' ? cursor : null); $('coords').textContent = pt(cursor.x, cursor.y);
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); plot(cursor.x, cursor.y); }
    });
  }

  function open() {
    if (Lines.BUILD !== BUILD) {
      UI.dialog({ title: 'Files out of date', html: '<p>Your browser mixed old and new game files. Reload the page with Ctrl+Shift+R (Cmd+Shift+R on Mac) and try again.</p>' });
      return;
    }
    wire();
    $('wallet').textContent = `${Store.get().chips} chips`;
    root().classList.remove('hidden');
    UI.setOpen('lin', true);
    pick();
    $('close').focus();
  }

  function close() {
    state = 'idle';
    root().classList.add('hidden');
    UI.setOpen('lin', false);
  }

  return {
    BUILD, open, close, isOpen, plot,
    /** For tests and screen readers: where the game is up to. */
    status: () => ({ state, form: formId, problem, step: stepIdx, placed: placed.map(p => ({ ...p })), wrong, missed }),
  };
})();
