/* The Cubes Table (overlay #cub), in the Factoring wing: factor a sum or a difference of cubes by filling in boxes.
   Level first (Easy, or Medium with a GCF to take out first), then a polynomial such as  2x^3 + 16  and the shape of the answer with empty boxes:

       Easy:    ( x [+/-] [  ] )( x^2 [+/-] [  ] x + [  ] )
       Medium:  [  ] ( x [+/-] [  ] )( x^2 [+/-] [  ] x + [  ] )

   You type the numbers and tap each sign to flip it (they start as "?", so every sign is a choice). One shot per problem: a right answer pays the level's chips,
   a wrong one costs nothing, and either way the worked solution is shown. The math is in cubes.js; this file is only the screen. */
const CubesGame = (() => {
  const $ = id => document.getElementById(id);
  const BOXES = ['g', 's1', 'a', 's2', 'b', 'c'];
  const LABELS = {
    g: 'The GCF, outside the parentheses', s1: 'The sign in the first factor', a: 'The number in the first factor',
    s2: 'The sign in the middle of the second factor', b: 'The number in the middle of the second factor', c: 'The last number of the second factor',
  };
  let problem = null, level = 1, state = 'idle', wired = false, last = null;
  const sign = { s1: 0, s2: 0 };          // 0 = not chosen yet, 1 = plus, -1 = minus
  const els = {};
  const isOpen = () => !!$('cub') && !$('cub').classList.contains('hidden');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const show = which => { $('cub-pick').classList.toggle('hidden', which !== 'pick'); $('cub-play').classList.toggle('hidden', which !== 'play'); $('cub').dataset.state = which; };

  function wire() {
    if (wired) return;
    wired = true;
    Cubes.LEVELS.forEach(L => {
      const b = el('button', 'btn bet-card bet'); b.type = 'button'; b.dataset.level = L.level;
      b.innerHTML = `<span class="k-ico"><span class="cub-sample">${L.sample}</span></span><span class="bet-amt">${L.name}</span><span class="bet-desc">${L.desc}</span>` +
        `<span class="bet-win"><i class="k-coin" aria-hidden="true"></i><b>${Economy.PAY.cubes[L.level - 1]} chips</b><em> per answer</em></span>`;
      b.addEventListener('click', () => start(L.level));
      $('cub-levels').appendChild(b);
    });
    $('cub-close').addEventListener('click', close);
    $('cub-check').addEventListener('click', check);
    $('cub-next').addEventListener('click', () => deal());
    $('cub-change').addEventListener('click', () => { state = 'picking'; show('pick'); const c = $('cub-levels').querySelector('.bet'); if (c) c.focus(); });
    $('cub-wallet').parentNode.insertBefore(Trophies.chip('cubes'), $('cub-wallet'));
    Store.onChange(() => { $('cub-wallet').textContent = `${Store.get().chips} chips`; });
  }

  function open() {
    wire();
    $('cub-wallet').textContent = `${Store.get().chips} chips`;
    state = 'picking'; show('pick');
    $('cub').classList.remove('hidden'); UI.setOpen('cub', true);
    const c = $('cub-levels').querySelector('.bet'); if (c) c.focus();
  }
  function close() { if (!isOpen()) return; $('cub').classList.add('hidden'); UI.setOpen('cub', false); state = 'idle'; }

  function start(l) { level = Cubes.levelOf(l).level; last = null; deal(); }

  /* ---------- a new problem ---------- */
  function deal() {
    problem = Cubes.problem(level, Math.random, last); last = problem;
    state = 'playing'; sign.s1 = sign.s2 = 0;
    const L = Cubes.levelOf(level);
    $('cub-wager').textContent = `Level: ${L.name}. Pays ${Economy.PAY.cubes[level - 1]} chips if you get it right.`;
    $('cub-poly').textContent = Cubes.polyText(problem);
    $('cub-hint').textContent = level === 1 ? 'Factor the sum or difference of cubes. Fill in every box, and tap a sign to change it.' : 'Take out the GCF first, then factor the cubes. Fill in every box, and tap a sign to change it.';
    buildForm();
    setMsg(''); $('cub-result').classList.add('hidden'); $('cub-result').textContent = '';
    $('cub-check').classList.remove('hidden'); $('cub-next').classList.add('hidden'); $('cub-change').classList.add('hidden');
    show('play');
    const first = els[level === 1 ? 's1' : 'g']; if (first) first.focus();
  }

  const lit = text => el('span', 'cub-lit', text);
  function numBox(key) {
    const i = el('input', 'cub-num'); i.type = 'text'; i.inputMode = 'numeric'; i.autocomplete = 'off'; i.maxLength = 3; i.dataset.box = key; i.setAttribute('aria-label', LABELS[key]);
    i.addEventListener('input', () => { i.value = i.value.replace(/[^0-9]/g, ''); });
    i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); } });     // (stopPropagation: the same Enter must not also move on to the next problem)
    els[key] = i; return i;
  }
  function signBox(key) {
    const b = el('button', 'cub-sign', '?'); b.type = 'button'; b.dataset.box = key; b.setAttribute('aria-label', `${LABELS[key]}: not chosen yet. Press to change.`);
    b.addEventListener('click', () => {
      if (state !== 'playing') return;
      sign[key] = sign[key] === 1 ? -1 : 1;                                 // ? -> + -> - -> + ...
      b.textContent = sign[key] === 1 ? '+' : Cubes.MINUS; b.classList.add('chosen');
      b.setAttribute('aria-label', `${LABELS[key]}: ${sign[key] === 1 ? 'plus' : 'minus'}. Press to change.`);
    });
    els[key] = b; return b;
  }
  function buildForm() {
    const f = $('cub-form'), v = problem.v; f.textContent = '';
    if (level === 2) f.appendChild(numBox('g'));
    f.append(lit('('), lit(v), signBox('s1'), numBox('a'), lit(')'), lit('('), lit(`${v}\u00b2`), signBox('s2'), numBox('b'), lit(v), lit('+'), numBox('c'), lit(')'));
    if (level === 1) delete els.g;
  }

  /* ---------- reading and checking ---------- */
  function read() {
    const ans = {}, missing = [];
    for (const k of BOXES) {
      if (k === 'g' && level === 1) { ans.g = 1; continue; }
      if (k === 's1' || k === 's2') { if (!sign[k]) missing.push(k); ans[k] = sign[k]; continue; }
      const v = els[k] && els[k].value.trim(); if (!v) missing.push(k); ans[k] = v ? Number(v) : null;
    }
    return { ans, missing };
  }
  function setMsg(text, cls) { const m = $('cub-msg'); m.textContent = text; m.className = `msg${cls ? ' ' + cls : ''}`; }

  function check() {
    if (state !== 'playing') return;
    const { ans, missing } = read();
    if (missing.length) { setMsg('Fill in every box first, and tap each sign to choose + or \u2212.', 'bad'); const b = els[missing[0]]; if (b) b.focus(); return; }
    const ok = Cubes.isCorrect(problem, ans), marks = Cubes.boxesOk(problem, ans), s = Store.get();
    state = 'done';
    BOXES.forEach(k => { const b = els[k]; if (!b) return; b.classList.add(marks[k] ? 'ok' : 'miss'); b.disabled = true; });
    if (ok) {
      const win = Economy.PAY.cubes[level - 1];
      Store.earn(win); Store.set({ cubesWins: s.cubesWins + 1 }); Trophies.award('cubes');
      setMsg(`Correct! +${win} chips.`, 'good');
    } else {
      Store.set({ cubesLosses: s.cubesLosses + 1 });
      setMsg('Not this time. Nothing lost. Here is how it works.', 'bad');
    }
    showResult(ok);
    $('cub-check').classList.add('hidden'); $('cub-next').classList.remove('hidden'); $('cub-change').classList.remove('hidden'); $('cub-next').focus({ preventScroll: true });   // (keep the view where it is: the student is looking at the problem they just answered)
  }

  function showResult(ok) {
    const r = $('cub-result'); r.textContent = '';
    const box = el('div', `final${ok ? '' : ' bad'}`);
    box.appendChild(el('span', 'final-label', ok ? 'Your answer is right' : 'The answer'));
    box.appendChild(el('div', 'final-expr', `${Cubes.polyText(problem)} = ${Cubes.answerText(problem)}`));
    r.appendChild(box);
    const d = el('details', 'worked'); if (!ok) d.open = true;
    d.appendChild(el('summary', '', 'Show the steps'));
    const ol = el('ol', 'work'); Cubes.steps(problem).forEach(t => ol.appendChild(el('li', '', t))); d.appendChild(ol);
    r.appendChild(d); r.classList.remove('hidden');
  }

  /* keys: Enter goes to the next problem once one is done (Escape is handled in main.js) */
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.defaultPrevented && isOpen() && state === 'done' && !e.repeat && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); deal(); } });

  return { open, close, isOpen, state: () => state, get problem() { return problem; }, get level() { return level; } };
})();
