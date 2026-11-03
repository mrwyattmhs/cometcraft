/* The House of Algebra's booths that are one-step equations: the window. Pick a level, then an equation with a box in it, like

       [ ] + 5 = 7          or          [ ] x 4 = 20

   and type the number that makes it true (a 2, a 5) into the box itself. One shot per problem: a right answer pays the level's chips and counts toward the trophy, a wrong one costs nothing,
   and either way the worked solution is shown. The maths is in equations.js (Missing Number, unit 1) and equations-md.js (Multiply and Divide, unit 2), which have the same shape; this file is
   only the window, and ONE engine runs both, so they cannot drift apart. Each window is made the first time you walk up to its booth (no markup in index.html).
   createEquationTable({ id, logic, payKey, wins, losses, trophy, title, formula, remember }) -> { open, close, isOpen, state, problem, level, box } */
function createEquationTable(cfg) {
  const P = cfg.id, L = cfg.logic, $ = id => document.getElementById(`${P}-${id}`);
  let problem = null, level = 1, state = 'idle', wired = false, last = null, box = null;
  const isOpen = () => !!document.getElementById(P) && !document.getElementById(P).classList.contains('hidden');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const show = which => { $('pick').classList.toggle('hidden', which !== 'pick'); $('play').classList.toggle('hidden', which !== 'play'); document.getElementById(P).dataset.state = which; };

  function ensureDom() {
    if (document.getElementById(P)) return;
    const d = document.createElement('div'); d.id = P; d.className = 'overlay hidden kelly'; d.dataset.state = 'idle';
    d.innerHTML =
      `<div class="mc-panel eqn-panel" role="dialog" aria-modal="true" aria-labelledby="${P}-title">` +
      `<header class="craft-head"><div class="k-title"><span class="k-wing">House of Algebra</span><div class="k-titlerow"><span class="k-cube" aria-hidden="true"></span><h2 id="${P}-title">${cfg.title}</h2><span class="k-formula">${cfg.formula}</span></div></div>` +
      `<div class="craft-meta"><span id="${P}-wallet" class="wallet-chip">0 chips</span><button id="${P}-close" class="btn small" type="button">Leave booth</button></div></header>` +
      `<div id="${P}-pick"><span class="k-label">Pick a level</span><p class="bet-prompt">Find the number that goes in the box. A wrong answer never costs you chips.</p><div id="${P}-levels" class="bet-grid"></div>` +
      `<div class="cub-ref"><span class="k-label">Remember</span>${cfg.remember.map(t => `<p>${t}</p>`).join('')}</div></div>` +
      `<div id="${P}-play" class="hidden"><p id="${P}-wager" class="wager-line"></p><div class="felt"><div id="${P}-eq" class="eqn-line" role="group"></div></div><p id="${P}-hint" class="hint">Type the missing number into the box.</p>` +
      `<p id="${P}-msg" class="msg" role="status"></p><div id="${P}-result" class="result hidden"></div>` +
      `<div class="cub-actions"><button id="${P}-check" class="btn primary" type="button">Check my answer</button><button id="${P}-next" class="btn primary hidden" type="button">Next problem</button><button id="${P}-change" class="btn hidden" type="button">Change level</button></div></div></div>`;
    document.body.appendChild(d);
  }
  function wire() {
    if (wired) return;
    wired = true; ensureDom();
    L.LEVELS.forEach(lv => {
      const b = el('button', 'btn bet-card bet'); b.type = 'button'; b.dataset.level = lv.level;
      b.innerHTML = `<span class="k-ico"><span class="poly-sample">${lv.sample}</span></span><span class="bet-amt">${lv.name}</span><span class="bet-desc">${lv.desc}</span>` +
        `<span class="bet-win"><i class="k-coin" aria-hidden="true"></i><b>${Economy.PAY[cfg.payKey][lv.level - 1]} chips</b><em> per answer</em></span>`;
      b.addEventListener('click', () => start(lv.level));
      $('levels').appendChild(b);
    });
    $('close').addEventListener('click', close); $('check').addEventListener('click', check); $('next').addEventListener('click', () => deal());
    $('change').addEventListener('click', () => { state = 'picking'; show('pick'); const c = $('levels').querySelector('.bet'); if (c) c.focus(); });
    $('wallet').parentNode.insertBefore(Trophies.chip(cfg.trophy), $('wallet'));
    Store.onChange(() => { $('wallet').textContent = `${Store.get().chips} chips`; });
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.defaultPrevented && isOpen() && state === 'done' && !e.repeat && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); deal(); } });
  }
  function open() {
    wire(); $('wallet').textContent = `${Store.get().chips} chips`;
    state = 'picking'; show('pick'); document.getElementById(P).classList.remove('hidden'); UI.setOpen(P, true);
    const c = $('levels').querySelector('.bet'); if (c) c.focus();
  }
  function close() { if (!isOpen()) return; document.getElementById(P).classList.add('hidden'); UI.setOpen(P, false); state = 'idle'; }
  function start(l) { level = L.levelOf(l).level; last = null; deal(); }

  /* ---------- a new problem: the equation, with a real box in it ---------- */
  function deal() {
    problem = L.problem(level, Math.random, last); last = problem; state = 'playing';
    $('wager').textContent = `Level: ${L.levelOf(level).name}. Pays ${Economy.PAY[cfg.payKey][level - 1]} chips if you get it right.`;
    const line = $('eq'); line.textContent = ''; line.setAttribute('aria-label', `The equation ${L.text(problem).replace('[ ]', 'box')}`);
    L.pieces(problem).forEach(pc => {
      if (pc.box) {
        const i = el('input', 'eqn-box'); i.type = 'text'; i.inputMode = 'numeric'; i.autocomplete = 'off'; i.maxLength = 3; i.setAttribute('aria-label', 'The missing number');
        i.addEventListener('input', () => { i.value = i.value.replace(/[^0-9]/g, ''); });
        i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); } });
        box = i; line.appendChild(i);
      } else if (pc.eq) line.appendChild(el('span', 'eqn-eq', '='));
      else if (pc.op) line.appendChild(el('span', 'eqn-op', pc.op));
      else line.appendChild(el('span', 'eqn-num', String(pc.num)));
    });
    setMsg(''); $('result').classList.add('hidden'); $('result').textContent = '';
    $('check').classList.remove('hidden'); $('next').classList.add('hidden'); $('change').classList.add('hidden');
    show('play'); box.focus();
  }
  const setMsg = (text, cls) => { const m = $('msg'); m.textContent = text; m.className = `msg${cls ? ' ' + cls : ''}`; };

  function check() {
    if (state !== 'playing') return;
    const v = box.value.trim(); if (!v) { setMsg('Type a number into the box first.', 'bad'); box.focus(); return; }
    const n = Number(v), ok = L.isCorrect(problem, n), s = Store.get();
    state = 'done'; box.disabled = true; box.classList.add(ok ? 'ok' : 'miss');
    if (ok) { const win = Economy.PAY[cfg.payKey][level - 1]; Store.earn(win); Store.set({ [cfg.wins]: s[cfg.wins] + 1 }); Trophies.award(cfg.trophy); setMsg(`Correct! +${win} chips.`, 'good'); }
    else { Store.set({ [cfg.losses]: s[cfg.losses] + 1 }); setMsg('Not this time. Nothing lost. Here is how it works.', 'bad'); }
    showResult(ok);
    $('check').classList.add('hidden'); $('next').classList.remove('hidden'); $('change').classList.remove('hidden'); $('next').focus({ preventScroll: true });
  }
  function showResult(ok) {
    const r = $('result'); r.textContent = '';
    const done = L.text(problem).replace('[ ]', String(problem.x)), fin = el('div', `final${ok ? '' : ' bad'}`);
    fin.appendChild(el('span', 'final-label', ok ? 'Your answer is right' : 'The answer'));
    fin.appendChild(el('div', 'final-expr', done)); r.appendChild(fin);
    const d = el('details', 'worked'); if (!ok) d.open = true; d.appendChild(el('summary', '', 'Show the steps'));
    const ol = el('ol', 'work'); L.steps(problem).forEach(t => ol.appendChild(el('li', '', t))); d.appendChild(ol); r.appendChild(d); r.classList.remove('hidden');
  }

  return { open, close, isOpen, state: () => state, get problem() { return problem; }, get level() { return level; }, get box() { return box; } };
}

/** Unit 1: the Missing Number, in the booth nearest the stage on the west wall. */
const EquationGame = createEquationTable({
  id: 'eqn', logic: Equations, payKey: 'missing', wins: 'missingWins', losses: 'missingLosses', trophy: 'missing', title: 'Missing Number', formula: '[ ] + 5 = 7',
  remember: ['The box holds the number that makes the equation true: [ ] + 5 = 7 is true when the box is 2, because 2 + 5 = 7.', 'To undo adding, take away. To undo taking away, put back.'],
});
/** Unit 2: Multiply and Divide, in the booth across the aisle from it. */
const MulDivGame = createEquationTable({
  id: 'eqm', logic: EquationsMD, payKey: 'muldiv', wins: 'muldivWins', losses: 'muldivLosses', trophy: 'muldiv', title: 'Multiply & Divide', formula: '[ ] \u00d7 4 = 20',
  remember: ['The box holds the number that makes the equation true: [ ] \u00d7 4 = 20 is true when the box is 5, because 5 \u00d7 4 = 20.', 'To undo multiplying, divide. To undo dividing, multiply.'],
});
