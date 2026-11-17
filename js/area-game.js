/* The MULTIPLY TABLE of the Polynomials wing, as an AREA MODEL (overlay #pmul; trophy 'polymul'; Easy 10, Medium 25, Hard 50 chips per right answer). The window is made the first time you sit
   down, so there is no markup for it in index.html. The maths (the problems, the grid, reading a typed term, the pad's keys, checking) is in polys.js; this file is the screen.

     The two polynomials are OUTSIDE a rectangle: the first one down the left side and the second across the top, a term at the head of each row and column.
     Every SQUARE is one row's term times one column's term, and you type that area in it:  x \u00b7 5  gives  5x;  3x \u00b7 (\u22124)  gives  \u221212x.  (A term is typed whole: its number and its power.)
     Underneath is a line to COMBINE LIKE TERMS: one box for each power, highest first, with none left out, and a 0 for a power that cancels or is missing:  [ ]x\u00b2 + [ ]x + [ ].
   Easy is a monomial times a binomial (one row of two squares, nothing to combine); Medium is two binomials (2 by 2); Hard is a binomial and a trinomial (2 by 3, or 3 by 2) or two
   trinomials (3 by 3). Squares take a term from the pad (digits, a minus key, and the problem's variable with a power 1 to 4) or from the keyboard; the boxes on the combine line take a number.
   One shot per problem: a right answer pays and counts toward the trophy, a wrong one costs nothing, and either way every square and every box is marked on its own, a wrong one shows the
   right answer, and the worked steps are there. Focusing a square lights the term at the head of its row and of its column. */
const PolyMulGame = (() => {
  const P = 'pmul', $ = id => document.getElementById(`${P}-${id}`), WIN = Economy.PAY.polymul, MINUS = Polys.MINUS;
  let problem = null, grid = null, level = 1, state = 'idle', wired = false, last = null, cells = [], sums = [], active = null;
  const isOpen = () => !!document.getElementById(P) && !document.getElementById(P).classList.contains('hidden');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const show = which => { $('pick').classList.toggle('hidden', which !== 'pick'); $('play').classList.toggle('hidden', which !== 'play'); document.getElementById(P).dataset.state = which; };
  const setMsg = (text, cls) => { const m = $('msg'); m.textContent = text; m.className = `msg${cls ? ' ' + cls : ''}`; };
  /** A term at the head of a row or column, with its sign unless it is the first and positive: x, +5, \u22124x. */
  const headText = (t, k, v) => (k === 0 ? Polys.termText(t.c, t.d, v) : `${t.c < 0 ? MINUS : '+'}${Polys.termText(Math.abs(t.c), t.d, v)}`);
  const boxes = () => cells.concat(sums);
  const KEYS = ['7', '8', '9', 'back', '4', '5', '6', 'neg', '1', '2', '3', 'v1', '0', 'v2', 'v3', 'v4'];

  function ensureDom() {
    if (document.getElementById(P)) return;
    const d = document.createElement('div'); d.id = P; d.className = 'overlay hidden kelly'; d.dataset.state = 'idle';
    d.innerHTML =
      `<div class="mc-panel eqn-panel area-panel" role="dialog" aria-modal="true" aria-labelledby="${P}-title">` +
      `<header class="craft-head"><div class="k-title"><span class="k-wing">Polynomials wing</span><div class="k-titlerow"><span class="k-cube" aria-hidden="true"></span><h2 id="${P}-title">Multiply Table</h2><span class="k-formula">(a + b)(c + d)</span></div></div>` +
      `<div class="craft-meta"><span id="${P}-wallet" class="wallet-chip">0 chips</span><button id="${P}-close" class="btn small" type="button">Leave table</button></div></header>` +
      `<div id="${P}-pick"><span class="k-label">Pick a level</span><p class="bet-prompt">Multiply the polynomials with an area model, then combine like terms. A wrong answer never costs you chips.</p><div id="${P}-levels" class="bet-grid"></div>` +
      `<div class="cub-ref"><span class="k-label">Remember</span><p>The area of a square is its row times its column. Multiply the numbers and add the powers: (3x)(2x\u00b2) = 6x\u00b3. Mind the signs: a negative times a positive is negative.</p>` +
      `<p>Like terms have the same power of the variable: 3x and 5x make 8x. A power with nothing in it gets a 0. Type a minus sign for a negative number.</p></div></div>` +
      `<div id="${P}-play" class="area-play hidden"><div class="area-main"><p id="${P}-wager" class="wager-line"></p><p id="${P}-poly" class="area-poly"></p>` +
      `<div class="felt"><div id="${P}-grid" class="area" role="group" aria-label="The area model"></div><div id="${P}-combine" class="area-combine"></div></div><p id="${P}-hint" class="hint"></p><p id="${P}-msg" class="msg" role="status"></p></div>` +
      `<div class="area-side"><div id="${P}-pad" class="eqn-pad eqn-pad4 area-pad" role="group" aria-label="Term pad"></div>` +
      `<div id="${P}-after" class="area-after hidden"><div id="${P}-result" class="result"></div><div class="cub-actions"><button id="${P}-next" class="btn primary" type="button">Next problem</button><button id="${P}-change" class="btn" type="button">Change level</button></div></div></div></div></div>`;
    document.body.appendChild(d);
  }
  function wire() {
    if (wired) return;
    wired = true; ensureDom();
    Polys.MUL_LEVELS.forEach(L => {
      const b = el('button', 'btn bet-card bet'); b.type = 'button'; b.dataset.level = L.level;
      b.innerHTML = `<span class="k-ico"><span class="poly-sample">${L.sample}</span></span><span class="bet-amt">${L.name}</span><span class="bet-desc">${L.desc}</span>` +
        `<span class="bet-win"><i class="k-coin" aria-hidden="true"></i><b>${WIN[L.level - 1]} chips</b><em> per answer</em></span>`;
      b.addEventListener('click', () => start(L.level)); $('levels').appendChild(b);
    });
    const pad = $('pad');
    KEYS.forEach(k => { const b = el('button', 'btn eqn-key', k === 'back' ? '\u232b' : k === 'neg' ? MINUS : k); b.type = 'button'; b.dataset.key = k; b.setAttribute('aria-label', k === 'back' ? 'Backspace' : k === 'neg' ? 'Minus sign' : k); pad.appendChild(b); });
    const check = el('button', 'btn eqn-key primary eqn-keycheck', 'Check'); check.type = 'button'; check.id = `${P}-check`; check.setAttribute('aria-label', 'Check my answer'); pad.appendChild(check);
    pad.addEventListener('mousedown', e => e.preventDefault());
    pad.addEventListener('click', e => { const k = e.target.closest('.eqn-key'); if (!k || state !== 'playing' || k.id === `${P}-check` || k.disabled) return; tap(k.dataset.key); });
    $('close').addEventListener('click', close); check.addEventListener('click', check_); $('next').addEventListener('click', () => deal());
    $('change').addEventListener('click', () => { state = 'picking'; show('pick'); const c = $('levels').querySelector('.bet'); if (c) c.focus(); });
    $('wallet').parentNode.insertBefore(Trophies.chip('polymul'), $('wallet'));
    Store.onChange(() => { $('wallet').textContent = `${Store.get().chips} chips`; });
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.defaultPrevented && isOpen() && state === 'done' && !e.repeat && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); deal(); } });
  }
  function open() {
    wire(); $('wallet').textContent = `${Store.get().chips} chips`;
    state = 'picking'; show('pick'); document.getElementById(P).classList.remove('hidden'); UI.setOpen(P, true);
    const c = $('levels').querySelector('.bet'); if (c) c.focus();
  }
  function close() { if (!isOpen()) return; document.getElementById(P).classList.add('hidden'); UI.setOpen(P, false); state = 'idle'; }
  function start(l) { level = Polys.mulLevelOf(l).level; last = null; deal(); }

  /* ---------- the keys ---------- */
  const isSum = b => sums.includes(b);
  /** What a key does to the box you are in (the pad's variable keys need a square: a box on the combine line only takes a number). */
  function tap(key) {
    const box = active && boxes().includes(active) ? active : cells[0]; if (!box) return;
    if (isSum(box) && /^v/.test(key)) return;
    box.value = Polys.padTap(box.value, key, problem.v); if ($('msg').classList.contains('bad')) setMsg(''); box.focus({ preventScroll: true });
  }
  const syncKeys = () => $('pad').querySelectorAll('.eqn-key[data-key^="v"]').forEach(k => { k.disabled = !!active && isSum(active); });

  /* ---------- a new problem ---------- */
  function deal() {
    problem = Polys.mulProblem(level, Math.random, last); last = problem; grid = Polys.mulGrid(problem); state = 'playing'; active = null; cells = []; sums = [];
    const v = problem.v, g = $('grid'), n = grid.cols.length;
    $('wager').textContent = `Level: ${Polys.mulLevelOf(level).name}. Pays ${WIN[level - 1]} chips if you get it right.`; $('poly').textContent = Polys.mulText(problem);
    $('hint').textContent = 'Each square is its row times its column. Then combine the like terms on the line below.';
    // the rectangle: the second polynomial across the top, the first down the side, a square where each row meets each column
    g.textContent = ''; g.style.gridTemplateColumns = `auto repeat(${n}, minmax(0, 1fr))`;
    g.appendChild(el('div', 'area-corner', '\u00d7'));
    grid.cols.forEach((t, j) => { const h = el('div', 'area-head area-colhead', headText(t, j, v)); h.dataset.col = String(j); g.appendChild(h); });
    grid.rows.forEach((rt, i) => {
      const h = el('div', 'area-head area-rowhead', headText(rt, i, v)); h.dataset.row = String(i); g.appendChild(h);
      grid.cols.forEach((ct, j) => {
        const b = el('input', 'eqn-box area-cell'); b.type = 'text'; b.inputMode = 'none'; b.autocomplete = 'off'; b.maxLength = 6; b.dataset.row = String(i); b.dataset.col = String(j);
        b.setAttribute('aria-label', `The area of the square for ${headText(rt, i, v)} times ${headText(ct, j, v).replace(/^\+/, '')}`);
        b.addEventListener('input', () => { b.value = Polys.tidyTerm(b.value, v); if ($('msg').classList.contains('bad')) setMsg(''); });
        wireBox(b, i, j); cells.push(b); g.appendChild(b);
      });
    });
    // the line underneath: [ ]x\u00b2 + [ ]x + [ ], one box for each power the squares reach, highest first
    const line = $('combine'); line.textContent = ''; line.appendChild(el('span', 'area-lead', 'Combine like terms:'));
    const row = el('div', 'area-sums'); line.appendChild(row);
    grid.degrees.forEach((d, k) => {
      if (k) row.appendChild(el('span', 'area-plus', '+'));
      const b = el('input', 'eqn-box area-sum'); b.type = 'text'; b.inputMode = 'none'; b.autocomplete = 'off'; b.maxLength = 3; b.setAttribute('aria-label', `The number in front of ${d === 0 ? 'the constant term' : Polys.power(v, d)}`);
      b.addEventListener('input', () => { const t = b.value.replace(/[-\u2013]/g, MINUS).replace(/[^0-9\u2212]/g, ''); b.value = (t.startsWith(MINUS) ? MINUS : '') + t.replace(/\u2212/g, '').slice(0, 2); if ($('msg').classList.contains('bad')) setMsg(''); });
      wireBox(b, -1, k); sums.push(b); row.appendChild(b); row.appendChild(el('span', 'area-pow', Polys.power(v, d)));
    });
    KEYS.forEach(k => { if (/^v/.test(k)) { const b = $('pad').querySelector(`[data-key="${k}"]`), n2 = Number(k[1]); b.textContent = n2 === 1 ? v : `${v}${Polys.power('', n2) || ''}`; b.setAttribute('aria-label', n2 === 1 ? `${v}` : `${v} to the power ${n2}`); } });
    $('pad').classList.remove('hidden'); $('after').classList.add('hidden'); $('result').textContent = ''; $('play').classList.remove('answered'); setMsg(''); syncKeys(); show('play'); cells[0].focus({ preventScroll: true });
  }
  /** Common to every box: it knows which box you are in (and lights its row and column), and Enter goes on to the next empty one, or checks. */
  function wireBox(b, i, j) {
    b.addEventListener('focus', () => { active = b; syncKeys(); light(i, j); });
    b.addEventListener('blur', () => light(-2, -2));
    b.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return; e.preventDefault(); e.stopPropagation();
      const all = boxes(), next = all.slice(all.indexOf(b) + 1).concat(all).find(x => x !== b && !x.value.trim()); if (next && b.value.trim()) next.focus(); else check_();
    });
  }
  /** Light the term at the head of this square's row and column. */
  function light(i, j) { $('grid').querySelectorAll('.area-head').forEach(h => h.classList.toggle('on', (h.dataset.row !== undefined && Number(h.dataset.row) === i) || (h.dataset.col !== undefined && Number(h.dataset.col) === j && i >= 0))); }

  /* ---------- checking ---------- */
  const readSum = b => { const t = b.value.trim().replace(MINUS, '-'); return /^-?\d+$/.test(t) ? Number(t) : null; };
  function check_() {
    if (state !== 'playing') return;
    const typed = cells.map(b => b.value.trim()), numbers = sums.map(readSum);
    const missing = boxes().find(b => (isSum(b) ? readSum(b) === null : Polys.parseTerm(b.value, problem.v) === null));
    if (missing) { setMsg(isSum(missing) ? `Type a number in every box on the line. Type a minus sign (${MINUS} or -) for a negative number.` : 'Type a term in every square: its number and its power, like 5x or \u22126x\u00b2. A plain number is fine for a square with no x.', 'bad'); missing.focus(); return; }
    const r = Polys.checkMul(problem, { cells: typed, combined: numbers }), want = Polys.mulAnswer(problem), v = problem.v;
    cells.forEach((b, i) => { b.disabled = true; b.classList.add(r.cells[i] ? 'ok' : 'miss'); if (!r.cells[i]) { b.dataset.typed = b.value; b.value = Polys.termText(want.cells[i].c, want.cells[i].d, v); } });
    sums.forEach((b, i) => { b.disabled = true; b.classList.add(r.combined[i] ? 'ok' : 'miss'); if (!r.combined[i]) { b.dataset.typed = b.value; b.value = (want.combined[i] < 0 ? MINUS : '') + Math.abs(want.combined[i]); } });
    state = 'done'; light(-2, -2); const s = Store.get();
    if (r.ok) { Store.earn(WIN[level - 1]); Store.set({ polymulWins: s.polymulWins + 1 }); Trophies.award('polymul'); setMsg(`Correct! +${WIN[level - 1]} chips.`, 'good'); }
    else { Store.set({ polymulLosses: s.polymulLosses + 1 }); setMsg('Not this time. Nothing lost. The right answers are filled in.', 'bad'); }
    const res = $('result'); res.textContent = ''; const fin = el('div', `final${r.ok ? '' : ' bad'}`); fin.appendChild(el('span', 'final-label', r.ok ? 'Your answer is right' : 'The answer')); fin.appendChild(el('div', 'final-expr', `${Polys.mulText(problem)} = ${Polys.fmt(Polys.mulResult(problem), v)}`)); res.appendChild(fin);
    /* on a narrow screen the steps start closed and are one tap away: the right answers are already in the boxes */ const narrow = !!window.matchMedia && window.matchMedia('(max-width: 860px)').matches, d = el('details', 'worked'); if (!r.ok && !narrow) d.open = true; d.appendChild(el('summary', '', 'Show the steps')); const ol = el('ol', 'work'); Polys.mulSteps(problem).forEach(t => ol.appendChild(el('li', '', t))); d.appendChild(ol); res.appendChild(d);
    $('pad').classList.add('hidden'); $('after').classList.remove('hidden'); $('play').classList.add('answered'); $('next').focus({ preventScroll: true });
  }

  return { open, close, isOpen, state: () => state, get problem() { return problem; }, get level() { return level; }, get cells() { return cells; }, get sums() { return sums; }, get boxes() { return boxes(); }, get grid() { return grid; } };
})();
