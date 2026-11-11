/* The House of Algebra's booths: the window. ONE engine runs every booth, so they cannot drift apart. You pick a level, then you are shown a problem with one or two boxes in it,

       [ ] + 5 = 7          [ ] x 4 = 20          multiply to 32, add to 18:  [ ] and [ ]

   and you put the number in each box, by tapping the on-screen number pad or by typing. One shot per problem: a right answer pays the level's chips and counts toward the booth's trophy, a wrong
   one costs nothing, and either way the worked solution is shown, in the pad's place (so the window never grows and never needs scrolling). Each window is made the first time you walk up to
   its booth (there is no markup for it in index.html).

   createBoothTable(cfg) -> { open, close, isOpen, state, problem, level, box, boxes }
     cfg    { id, logic, payKey, wins, losses, trophy, title, formula, remember: [text, ...], hint? }
     logic  a pure module (equations.js, equations-md.js, number-pairs.js) with: LEVELS ({ level, name, sample, desc, signed? }), levelOf, problem(level, rng, last), isCorrect(problem, ...numbers),
            answerOf, steps, done (the finished statement), text, and EITHER pieces(problem) (an equation with one box in it) OR view(problem) ({ kind: 'diamond', top, bottom, topLabel,
            bottomLabel }: two boxes, a target above them and one below). A level with signed: true can have negative answers, and then the pad's plus-or-minus key works. */
function createBoothTable(cfg) {
  const P = cfg.id, L = cfg.logic, $ = id => document.getElementById(`${P}-${id}`), signedTable = L.LEVELS.some(l => l.signed);
  let problem = null, level = 1, state = 'idle', wired = false, last = null, boxes = [], active = 0;
  const isOpen = () => !!document.getElementById(P) && !document.getElementById(P).classList.contains('hidden');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const show = which => { $('pick').classList.toggle('hidden', which !== 'pick'); $('play').classList.toggle('hidden', which !== 'play'); document.getElementById(P).dataset.state = which; };
  const filled = b => /\d/.test(b.value), signedNow = () => !!L.levelOf(level).signed;
  const setMsg = (text, cls) => { const m = $('msg'); m.textContent = text; m.className = `msg${cls ? ' ' + cls : ''}`; };

  function ensureDom() {
    if (document.getElementById(P)) return;
    const d = document.createElement('div'); d.id = P; d.className = 'overlay hidden kelly'; d.dataset.state = 'idle';
    d.innerHTML =
      `<div class="mc-panel eqn-panel" role="dialog" aria-modal="true" aria-labelledby="${P}-title">` +
      `<header class="craft-head"><div class="k-title"><span class="k-wing">House of Algebra</span><div class="k-titlerow"><span class="k-cube" aria-hidden="true"></span><h2 id="${P}-title">${cfg.title}</h2><span class="k-formula">${cfg.formula}</span></div></div>` +
      `<div class="craft-meta"><span id="${P}-wallet" class="wallet-chip">0 chips</span><button id="${P}-close" class="btn small" type="button">Leave booth</button></div></header>` +
      `<div id="${P}-pick"><span class="k-label">Pick a level</span><p class="bet-prompt">${cfg.prompt || 'Find the number that goes in the box.'} A wrong answer never costs you chips.</p><div id="${P}-levels" class="bet-grid"></div>` +
      `<div class="cub-ref"><span class="k-label">Remember</span>${cfg.remember.map(t => `<p>${t}</p>`).join('')}</div></div>` +
      `<div id="${P}-play" class="eqn-play hidden">` +
      `<div class="eqn-main"><p id="${P}-wager" class="wager-line"></p><div class="felt"><div id="${P}-eq" class="eqn-line" role="group"></div></div><p id="${P}-hint" class="hint">${cfg.hint || 'Tap the number pad, or type, to fill the box.'}</p><p id="${P}-msg" class="msg" role="status"></p></div>` +
      `<div class="eqn-side"><div id="${P}-pad" class="eqn-pad" role="group" aria-label="Number pad"></div>` +
      `<div id="${P}-after" class="eqn-after hidden"><div id="${P}-result" class="result"></div><div class="cub-actions"><button id="${P}-next" class="btn primary" type="button">Next problem</button><button id="${P}-change" class="btn" type="button">Change level</button></div></div></div>` +
      `</div></div>`;
    document.body.appendChild(d);
  }

  /* ---------- the number pad ----------
     Without negatives it is a phone's keypad, 7 8 9 / 4 5 6 / 1 2 3 / backspace 0 Check. A booth with negative answers gets a fourth column for backspace, plus-or-minus and 0, with Check as a
     wide key underneath, so it is no taller. Tapping a key acts on the box you last touched; mousedown is cancelled so that box keeps its focus. */
  const PAD = { back: ['\u232b', 'Backspace'], sign: ['\u00b1', 'Plus or minus'], check: ['Check', 'Check my answer'] };
  function buildPad() {
    const pad = $('pad'), order = signedTable ? ['7', '8', '9', 'back', '4', '5', '6', 'sign', '1', '2', '3', '0', 'check'] : ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'back', '0', 'check'];
    if (signedTable) pad.classList.add('eqn-pad4');
    order.forEach(k => {
      const [label, name] = PAD[k] || [k, k], b = el('button', 'btn eqn-key', label); b.type = 'button'; b.dataset.key = k; b.setAttribute('aria-label', name);
      if (PAD[k]) b.id = `${P}-${k}`; if (k === 'check') b.classList.add('primary', 'eqn-keycheck');
      pad.appendChild(b);
    });
    pad.addEventListener('mousedown', e => e.preventDefault());
    pad.addEventListener('click', e => {
      const k = e.target.closest('.eqn-key'), box = boxes[active]; if (!k || state !== 'playing' || k.dataset.key === 'check' || !box) return;
      const key = k.dataset.key, neg = box.value.startsWith('-'), digits = box.value.replace('-', '');
      if (key === 'back') box.value = box.value.slice(0, -1);
      else if (key === 'sign') { if (signedNow()) box.value = (neg ? '' : '-') + digits; }
      else if (digits.length < 3) box.value += key;
      if ($('msg').classList.contains('bad')) setMsg(''); box.focus({ preventScroll: true });
    });
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
    buildPad();
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

  /* ---------- a new problem ---------- */
  /** A box: a real input. It does not summon a phone's keyboard (the pad is the input) but a physical keyboard types into it: digits only, and a leading minus sign on a level with negatives. */
  function makeBox(i, n) {
    const b = el('input', 'eqn-box'); b.type = 'text'; b.inputMode = 'none'; b.autocomplete = 'off'; b.maxLength = 4;
    b.setAttribute('aria-label', n === 1 ? 'The missing number' : i === 0 ? 'First number' : 'Second number');
    b.addEventListener('input', () => { const neg = signedNow() && b.value.trim().startsWith('-'); b.value = (neg ? '-' : '') + b.value.replace(/[^0-9]/g, '').slice(0, 3); if ($('msg').classList.contains('bad')) setMsg(''); });
    b.addEventListener('focus', () => { active = i; });
    b.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return; e.preventDefault(); e.stopPropagation();
      const empty = boxes.find(x => !filled(x)); if (empty && empty !== b && filled(b)) empty.focus(); else check();          // Enter in a filled box moves on to an empty one; otherwise it checks
    });
    return b;
  }
  function deal() {
    problem = L.problem(level, Math.random, last); last = problem; state = 'playing'; boxes = []; active = 0;
    $('wager').textContent = `${L.levelOf(level).name}: ${Economy.PAY[cfg.payKey][level - 1]} chips for a right answer`;
    const line = $('eq'), v = L.view ? L.view(problem) : { kind: 'line', pieces: L.pieces(problem) }; line.textContent = '';
    if (v.kind === 'diamond') {                                             // two targets and two boxes: the product above, the two numbers either side of a cross, the sum below
      line.className = 'eqn-line nbg'; line.setAttribute('aria-label', `Two numbers that ${L.text(problem)}`);
      const top = el('div', 'nbg-top'); top.append(el('span', 'nbg-cap', v.topLabel), el('span', 'nbg-num', v.top));
      const bot = el('div', 'nbg-bot'); bot.append(el('span', 'nbg-num', v.bottom), el('span', 'nbg-cap', v.bottomLabel));
      const cross = el('span', 'nbg-x'); cross.setAttribute('aria-hidden', 'true');
      boxes = [makeBox(0, 2), makeBox(1, 2)]; line.append(top, boxes[0], cross, boxes[1], bot);
    } else {                                                                // an equation with one box in it
      line.className = 'eqn-line'; line.setAttribute('aria-label', `The equation ${L.text(problem).replace('[ ]', 'box')}`);
      v.pieces.forEach(pc => {
        if (pc.box) { const b = makeBox(0, 1); boxes.push(b); line.appendChild(b); }
        else line.appendChild(el('span', pc.eq ? 'eqn-eq' : pc.op ? 'eqn-op' : 'eqn-num', pc.eq ? '=' : pc.op ? pc.op : String(pc.num)));
      });
    }
    if ($('sign')) $('sign').disabled = !signedNow();                       // the plus-or-minus key only works on a level that has negative answers
    setMsg(''); $('result').textContent = '';
    $('pad').classList.remove('hidden'); $('after').classList.add('hidden'); $('play').classList.remove('answered');   // the number pad is back (the result and its buttons were in its place)
    show('play'); boxes[0].focus();
  }

  function check() {
    if (state !== 'playing') return;
    const empty = boxes.find(b => !filled(b));
    if (empty) { setMsg(boxes.length > 1 ? 'Fill in both boxes first.' : 'Tap or type a number into the box first.', 'bad'); empty.focus(); return; }
    const nums = boxes.map(b => Number(b.value)), ok = L.isCorrect(problem, ...nums), s = Store.get(), left = [].concat(L.answerOf(problem));
    state = 'done';
    boxes.forEach((b, i) => { const at = left.indexOf(nums[i]); if (at >= 0) left.splice(at, 1); b.disabled = true; b.classList.add(ok || at >= 0 ? 'ok' : 'miss'); });      // each box is marked on its own: a number that IS one of the answers is green
    if (ok) { const win = Economy.PAY[cfg.payKey][level - 1]; Store.earn(win); Store.set({ [cfg.wins]: s[cfg.wins] + 1 }); Trophies.award(cfg.trophy); setMsg(`Correct! +${win} chips.`, 'good'); }
    else { Store.set({ [cfg.losses]: s[cfg.losses] + 1 }); setMsg('Not this time. Nothing lost.', 'bad'); }
    showResult(ok);
    $('pad').classList.add('hidden'); $('after').classList.remove('hidden'); $('play').classList.add('answered'); $('next').focus({ preventScroll: true });   // the worked solution takes the pad's place, so the window never grows
  }
  function showResult(ok) {
    const r = $('result'); r.textContent = '';
    const fin = el('div', `final${ok ? '' : ' bad'}`);
    fin.appendChild(el('span', 'final-label', ok ? 'Your answer is right' : 'The answer'));
    L.done(problem).split(' and ').forEach(t => fin.appendChild(el('div', 'final-expr', t)));          // a statement with two halves (the Numbers Game's product and sum) gets a line for each
    r.appendChild(fin);
    const d = el('details', 'worked'); if (!ok) d.open = true; d.appendChild(el('summary', '', 'Show the steps'));
    const ol = el('ol', 'work'); L.steps(problem).forEach(t => ol.appendChild(el('li', '', t))); d.appendChild(ol); r.appendChild(d);
  }

  return { open, close, isOpen, state: () => state, get problem() { return problem; }, get level() { return level; }, get box() { return boxes[0]; }, get boxes() { return boxes; } };
}

/** Unit 1: the Missing Number, in the booth nearest the stage on the west wall. */
const EquationGame = createBoothTable({
  id: 'eqn', logic: Equations, payKey: 'missing', wins: 'missingWins', losses: 'missingLosses', trophy: 'missing', title: 'Missing Number', formula: '[ ] + 5 = 7',
  remember: ['The box holds the number that makes the equation true: [ ] + 5 = 7 is true when the box is 2, because 2 + 5 = 7.', 'To undo adding, take away. To undo taking away, put back.'],
});
/** Unit 2: Multiply and Divide, in the booth across the aisle from it. */
const MulDivGame = createBoothTable({
  id: 'eqm', logic: EquationsMD, payKey: 'muldiv', wins: 'muldivWins', losses: 'muldivLosses', trophy: 'muldiv', title: 'Multiply & Divide', formula: '[ ] \u00d7 4 = 20',
  remember: ['The box holds the number that makes the equation true: [ ] \u00d7 4 = 20 is true when the box is 5, because 5 \u00d7 4 = 20.', 'To undo multiplying, divide. To undo dividing, multiply.'],
});
/** Unit 3: the Numbers Game (two numbers with a given product and sum: the step that splits the middle term), next to the Missing Number on the west wall. */
const NumbersGame = createBoothTable({
  id: 'nbg', logic: NumberPairs, payKey: 'numbers', wins: 'numbersWins', losses: 'numbersLosses', trophy: 'numbers', title: 'Numbers Game', formula: '\u00d7 32, + 18',
  prompt: 'Find the two numbers that multiply to the top number and add to the bottom one.', hint: 'Tap a box, then the number pad (or type).',
  remember: ['16 and 2 multiply to 32 and add to 18. The order does not matter.', 'This is how you split the middle term: x\u00b2 + 18x + 32 = (x + 16)(x + 2).'],
});
