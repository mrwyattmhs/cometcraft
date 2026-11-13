/* The Science Lab's CLICK-THE-PICTURE games: the window. ONE engine runs both, so they cannot drift apart:
     ELEMENT MATCH   "Find sodium"                  the periodic table, as tiles: click the tile
     CELL LAB        "Click the nucleus"            a picture of a cell: click the part
   You tap the part you think it is (it lights up, and you can change your mind), then press Check (or Enter). One shot per question: a right answer pays the level's chips and counts toward the
   trophy, a wrong one costs nothing, and either way the right part lights up green and a line says what it is. The answer card takes the place of the Check bar, so the window never grows and
   never needs scrolling (the periodic table itself can scroll sideways inside its own frame on a narrow phone: it is a map). Each window is made the first time you walk up to its station.

   createPickTable(cfg) -> { open, close, isOpen, state, problem, level, picked }
     cfg    { id, logic, payKey, wins, losses, trophy, title, formula, remember: [text, ...], figureClass }
     logic  a pure module (elements.js, cells.js) with LEVELS ({ level, name, sample, desc }), levelOf, problem(level, rng, last), prompt(problem), isCorrect(problem, key), answerOf(problem), done(problem),
            and figure(level): the picture as HTML or SVG text, in which everything you can click has data-key. */
function createPickTable(cfg) {
  const P = cfg.id, L = cfg.logic, $ = id => document.getElementById(`${P}-${id}`);
  let problem = null, level = 1, state = 'idle', wired = false, last = null, picked = null;
  const isOpen = () => !!document.getElementById(P) && !document.getElementById(P).classList.contains('hidden');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const show = which => { $('pick').classList.toggle('hidden', which !== 'pick'); $('play').classList.toggle('hidden', which !== 'play'); document.getElementById(P).dataset.state = which; };
  const setMsg = (text, cls) => { const m = $('msg'); m.textContent = text; m.className = `msg${cls ? ' ' + cls : ''}`; };
  const things = key => [...$('fig').querySelectorAll('[data-key]')].filter(n => n.dataset.key === String(key));

  function ensureDom() {
    if (document.getElementById(P)) return;
    const d = document.createElement('div'); d.id = P; d.className = 'overlay hidden kelly'; d.dataset.state = 'idle';
    d.innerHTML =
      `<div class="mc-panel eqn-panel pick-panel" role="dialog" aria-modal="true" aria-labelledby="${P}-title">` +
      `<header class="craft-head"><div class="k-title"><span class="k-wing">Science Lab</span><div class="k-titlerow"><span class="k-cube" aria-hidden="true"></span><h2 id="${P}-title">${cfg.title}</h2><span class="k-formula">${cfg.formula}</span></div></div>` +
      `<div class="craft-meta"><span id="${P}-wallet" class="wallet-chip">0 chips</span><button id="${P}-close" class="btn small" type="button">Leave station</button></div></header>` +
      `<div id="${P}-pick"><span class="k-label">Pick a level</span><p class="bet-prompt">${cfg.prompt} A wrong answer never costs you chips.</p><div id="${P}-levels" class="bet-grid"></div>` +
      `<div class="cub-ref"><span class="k-label">Remember</span>${cfg.remember.map(t => `<p>${t}</p>`).join('')}</div></div>` +
      `<div id="${P}-play" class="pick-play hidden"><p id="${P}-ask" class="pick-ask"></p><div id="${P}-fig" class="pick-fig ${cfg.figureClass || ''}"></div>` +
      `<div id="${P}-bar" class="pick-bar"><span id="${P}-wager" class="wager-line"></span><p id="${P}-msg" class="msg" role="status"></p><button id="${P}-check" class="btn primary" type="button" disabled>Check</button></div>` +
      `<div id="${P}-after" class="pick-after hidden"><div id="${P}-result" class="result"></div><div class="cub-actions"><button id="${P}-next" class="btn primary" type="button">Next</button><button id="${P}-change" class="btn" type="button">Change level</button></div></div></div></div>`;
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
    $('fig').addEventListener('click', e => { const t = e.target.closest('[data-key]'); if (t) choose(t.dataset.key); });
    // The keyboard on the picture: Space or Enter on a part picks it. Enter on the part you have ALREADY picked checks (a mouse click leaves the focus on the part, so Enter must still mean Check).
    $('fig').addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return; const t = e.target.closest('[data-key]'); if (!t) return; e.preventDefault(); e.stopPropagation();
      if (e.key === 'Enter' && state === 'playing' && picked != null && String(t.dataset.key) === String(picked)) check(); else choose(t.dataset.key);
    });
    $('close').addEventListener('click', close); $('check').addEventListener('click', check); $('next').addEventListener('click', () => deal());
    $('change').addEventListener('click', () => { state = 'picking'; show('pick'); const c = $('levels').querySelector('.bet'); if (c) c.focus(); });
    $('wallet').parentNode.insertBefore(Trophies.chip(cfg.trophy), $('wallet'));
    Store.onChange(() => { $('wallet').textContent = `${Store.get().chips} chips`; });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.defaultPrevented || !isOpen() || e.repeat || (document.activeElement && document.activeElement.closest && document.activeElement.closest(`#${P}-fig`))) return;
      if (state === 'playing' && picked != null) { e.preventDefault(); check(); } else if (state === 'done' && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); deal(); }
    });
  }
  function open() {
    wire(); $('wallet').textContent = `${Store.get().chips} chips`;
    state = 'picking'; show('pick'); document.getElementById(P).classList.remove('hidden'); UI.setOpen(P, true);
    const c = $('levels').querySelector('.bet'); if (c) c.focus();
  }
  function close() { if (!isOpen()) return; document.getElementById(P).classList.add('hidden'); UI.setOpen(P, false); state = 'idle'; }
  function start(l) { level = L.levelOf(l).level; last = null; $('fig').innerHTML = L.figure(level); deal(); }

  /** Light up what you chose, and only that (a part can be several shapes: the two mitochondria are one choice). */
  function choose(key) {
    if (state !== 'playing') return;
    $('fig').querySelectorAll('.picked').forEach(n => n.classList.remove('picked'));
    picked = key; things(key).forEach(n => n.classList.add('picked')); $('check').disabled = false; if ($('msg').classList.contains('bad')) setMsg('');
    if (cfg.pickedLabel) setMsg(cfg.pickedLabel(L, key));
  }
  function deal() {
    problem = L.problem(level, Math.random, last); last = problem; state = 'playing'; picked = null;
    $('fig').querySelectorAll('.picked, .right, .wrong').forEach(n => n.classList.remove('picked', 'right', 'wrong')); $('fig').classList.remove('answered');
    $('ask').textContent = L.prompt(problem); $('wager').textContent = `${L.levelOf(level).name}: ${Economy.PAY[cfg.payKey][level - 1]} chips for a right answer`;
    setMsg(''); $('check').disabled = true; $('bar').classList.remove('hidden'); $('after').classList.add('hidden'); $('result').textContent = ''; $('play').classList.remove('answered');
    show('play');
  }
  function check() {
    if (state !== 'playing') return;
    if (picked == null) { setMsg('Tap an answer first.', 'bad'); return; }
    const ok = L.isCorrect(problem, picked), s = Store.get();
    state = 'done'; $('fig').classList.add('answered'); things(L.answerOf(problem)).forEach(n => n.classList.add('right')); if (!ok) things(picked).forEach(n => n.classList.add('wrong'));
    if (ok) { const win = Economy.PAY[cfg.payKey][level - 1]; Store.earn(win); Store.set({ [cfg.wins]: s[cfg.wins] + 1 }); Trophies.award(cfg.trophy); setMsg(`Correct! +${win} chips.`, 'good'); }
    else { Store.set({ [cfg.losses]: s[cfg.losses] + 1 }); setMsg('Not this time. Nothing lost.', 'bad'); }
    const r = $('result'); r.textContent = ''; const fin = el('div', `final${ok ? '' : ' bad'}`); fin.appendChild(el('span', 'final-label', ok ? 'You found it' : 'It was here'));
    fin.appendChild(el('div', 'final-text', L.done(problem))); r.appendChild(fin);
    $('bar').classList.add('hidden'); $('after').classList.remove('hidden'); $('play').classList.add('answered'); $('next').focus({ preventScroll: true });
  }

  return { open, close, isOpen, state: () => state, get problem() { return problem; }, get level() { return level; }, get picked() { return picked; } };
}

/** The Science Lab's first station: the periodic table. */
const ElementGame = createPickTable({
  id: 'elm', logic: Elements, payKey: 'elements', wins: 'elementsWins', losses: 'elementsLosses', trophy: 'elements', title: 'Element Match', formula: 'Na = sodium', figureClass: 'pick-pt',
  prompt: 'Find the element you are asked for on the periodic table.', pickedLabel: (L, key) => `You picked ${L.label(key)}.`,
  remember: ['Each tile shows the atomic number (the number of protons) above the symbol. Elements in the same column are in the same group.', 'Some symbols come from old names: Na is sodium, K potassium, Fe iron, Ag silver, Au gold, Pb lead, Hg mercury.'],
});
/** The second: a picture of a cell. */
const CellGame = createPickTable({
  id: 'cel', logic: Cells, payKey: 'cells', wins: 'cellsWins', losses: 'cellsLosses', trophy: 'cells', title: 'Cell Lab', formula: 'click the part', figureClass: 'pick-cell',
  prompt: 'Click the part of the cell you are asked for.',
  remember: ['Every part of a cell has a job, like the rooms of a house. The nucleus is the control room and the mitochondria make the energy.', 'A plant cell also has a stiff cell wall, chloroplasts that make food from sunlight, and a big vacuole.'],
});
