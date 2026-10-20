/* Mini-game: factor ax² + bx + c by "splitting the middle".
   Wager first: the chip bet decides how hard the trinomial is (see TIERS in trinomials.js),
   and it is dealt only after the bet is placed. One shot per trinomial.

   The screen reveals itself in stages so there is never much on it:
     bet     only the four wager cards
     1       only the two number slots (m·n = a·c, m + n = b)
     2       the big rewrite line appears, then step 2 opens:
             GCF of each pair + what is left inside each set of parentheses
     done    the workbench is replaced by "expanded = factored", side by side

   Slots: 0, 1 = the split;  2 = first GCF, 3, 4 = its inside;  5 = second GCF, 6, 7 = its inside.
   The math lives in trinomials.js; this file is only the interface. */
const TrinomialGame = (() => {
  const $ = id => document.getElementById(id);
  const BUILD = 18; // must match Trinomials.BUILD
  const SLOTS = 8;
  const SLOT_NAMES = [
    'Split, first number', 'Split, second number',
    'First pair GCF', 'First pair inside, first term', 'First pair inside, second term',
    'Second pair GCF', 'Second pair inside, first term', 'Second pair inside, second term',
  ];

  let problem = null;
  let slots = Array(SLOTS).fill(null);
  let state = 'idle'; // idle | betting | playing | done
  let bet = 0; // the locked-in wager for the current trinomial
  let wired = false;
  let invStage = null; // which palette is currently built
  const slotEls = [];

  /* x-terms are purple, plain numbers are green-blue, negatives are darker */
  function blockColor(t) {
    const abs = Math.abs(t.k);
    const hue = t.e === 1 ? 270 + ((abs * 17) % 70) : 120 + ((abs * 23) % 100);
    return `hsl(${hue} 60% ${t.k < 0 ? 34 : 50}%)`;
  }
  const blockHTML = t => `<span class="gem-face" style="--gem:${blockColor(t)}">${Trinomials.fmtBlock(t)}</span>`;
  const step1Done = () => !!(slots[0] && slots[1]);
  const stageOf = () => (state === 'betting' ? 'bet' : state === 'done' ? 'done' : step1Done() ? '2' : '1');

  /* ---------- building the interface (once) ---------- */
  function mkSlot(i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot';
    b.dataset.i = i;
    b.addEventListener('click', () => removeAt(i));
    b.addEventListener('dragover', e => e.preventDefault());
    b.addEventListener('drop', e => {
      e.preventDefault();
      try {
        const t = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (Number.isInteger(t.k) && (t.e === 0 || t.e === 1)) place(Trinomials.term(t.k, t.e), i);
      } catch (err) { /* not one of our blocks */ }
    });
    slotEls[i] = b;
    return b;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  const op = (s, cls = 'op') => el('span', cls, s);

  function wire() {
    if (wired) return;
    wired = true;

    const bench = $('tri-bench');

    const s1 = el('div', 'step step1');
    const hint1 = el('p', 'hint');
    hint1.id = 'tri-hint1';
    const row1 = el('div', 'eq-row');
    row1.append(mkSlot(0), op('and'), mkSlot(1));
    s1.append(el('h3', '', 'Step 1: split the middle'), hint1, row1);

    const rewrite = el('div', 'rewrite');
    const expr = el('div', 'rewrite-expr');
    expr.id = 'tri-rewrite';
    rewrite.append(el('div', 'rewrite-label', 'Rewritten'), expr);

    const s2 = el('div', 'step step2');
    const row2 = el('div', 'eq-row');
    row2.append(
      mkSlot(2), op('('), mkSlot(3), op('+'), mkSlot(4), op(')'),
      op('+', 'op big'),
      mkSlot(5), op('('), mkSlot(6), op('+'), mkSlot(7), op(')')
    );
    s2.append(
      el('h3', '', 'Step 2: factor each pair'),
      el('p', 'hint', 'Pull the GCF out of each pair, then drop what is left inside the parentheses.'),
      row2
    );
    bench.append(s1, rewrite, s2);

    $('tri-close').addEventListener('click', close);
    $('tri-clear').addEventListener('click', () => { if (state === 'playing') { slots.fill(null); setMsg(''); render(); } });
    $('tri-craft').addEventListener('click', craft);
    $('tri-next').addEventListener('click', newProblem);
    Trinomials.TIERS.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn bet-card bet';
      b.dataset.bet = t.bet;
      b.innerHTML =
        `<span class="bet-amt">${t.bet} chips</span>` +
        `<span class="bet-desc">${t.desc}</span>` +
        `<span class="bet-win">Win ${Trinomials.payout(t.bet)}</span>`;
      b.addEventListener('click', () => chooseBet(t.bet));
      $('tri-bets').appendChild(b);
    });
    Store.onChange(() => { $('tri-wallet').textContent = `${Store.get().chips} chips`; if (state !== 'idle') render(); });
  }

  /** Stage 1 offers only plain numbers; once step 2 opens the x-terms join them. */
  function buildInventory(numbersOnly) {
    const pal = Trinomials.palette(bet);
    const blocks = [];
    if (!numbersOnly) for (let k = -pal.xMax; k <= pal.xMax; k++) if (k) blocks.push(Trinomials.term(k, 1));
    for (let k = -pal.constMax; k <= pal.constMax; k++) if (k) blocks.push(Trinomials.term(k, 0));
    const inv = $('tri-inventory');
    inv.innerHTML = '';
    blocks.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gem';
      b.draggable = true;
      b.setAttribute('aria-label', `Block ${Trinomials.fmtBlock(t)}`);
      b.innerHTML = blockHTML(t);
      b.addEventListener('click', () => place(t));
      b.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', JSON.stringify(t)));
      inv.appendChild(b);
    });
  }

  /* ---------- open / close / rounds ---------- */
  function open() {
    if (Trinomials.BUILD !== BUILD) {
      UI.dialog({
        title: 'Files out of date',
        html: '<p>Your browser mixed old and new game files. Reload the page with Ctrl+Shift+R (Cmd+Shift+R on Mac) and try again.</p>',
      });
      return;
    }
    wire();
    $('tri').classList.remove('hidden');
    UI.setOpen('tri', true);
    newProblem();
    $('tri-close').focus();
  }

  function close() {
    state = 'idle';
    $('tri').classList.add('hidden');
    UI.setOpen('tri', false);
  }

  const isOpen = () => !$('tri').classList.contains('hidden');

  /** Back to the wager screen. The trinomial is not dealt until a bet is placed. */
  function newProblem() {
    problem = null;
    bet = 0;
    slots = Array(SLOTS).fill(null);
    state = 'betting';
    invStage = null;
    $('tri-result').classList.add('hidden');
    $('tri-result').innerHTML = '';
    $('tri-next').classList.add('hidden');
    $('tri-craft').classList.remove('hidden');
    $('tri').scrollTop = 0;
    setMsg('');
    render();
  }

  function chooseBet(amount) {
    if (state !== 'betting' || amount > Store.get().chips) return;
    bet = amount;
    problem = Trinomials.generate(bet);
    slots = Array(SLOTS).fill(null);
    state = 'playing';
    invStage = null; // force the palette to rebuild
    setMsg('Find the two numbers.');
    render();
  }

  /* ---------- slot actions ---------- */
  function place(term, idx) {
    if (state !== 'playing') return;
    const i = idx === undefined ? slots.indexOf(null) : idx;
    if (i < 0) { setMsg('Every slot is full. Click a block in the bench to take it back out.'); return; }
    if (i >= 2 && !step1Done()) { setMsg('Finish step 1 first.'); return; }
    if (i < 2 && term.e !== 0) { setMsg('Step 1 takes plain numbers, not x-terms.'); return; }
    const wasDone = step1Done();
    slots[i] = term;
    setMsg(!wasDone && step1Done() ? 'Now factor each pair. Blocks keep their sign, so 2x + -3 means 2x - 3.' : '');
    render();
  }

  function removeAt(i) {
    if (state !== 'playing' || slots[i] === null) return;
    slots[i] = null;
    render();
  }

  function craft() {
    if (state !== 'playing' || slots.some(s => s === null)) return;
    const res = Trinomials.check(problem, slots);
    const s = Store.get();
    if (res.ok) {
      const win = Trinomials.payout(bet);
      Store.addChips(win);
      Store.set({ trinomialWins: s.trinomialWins + 1 });
      finish(res, `Correct! You bet ${bet} and won ${win} chips (${Trinomials.multiplier(bet)}x).`, 'good');
    } else {
      const floored = Store.addChips(-bet);
      Store.set({ trinomialLosses: s.trinomialLosses + 1 });
      finish(res, `Not this time. You lose ${bet} chips.` +
        (floored ? ` The house tops you up to ${Store.MIN_CHIPS} chips so you can keep playing.` : ''), 'bad');
    }
  }

  /** The workbench gives way to the answer: expanded and factored, side by side. */
  function finish(res, msg, kind) {
    state = 'done';
    setMsg(msg, kind);
    const sol = Trinomials.solution(problem, slots[0].k);
    const expanded = Trinomials.fmtTrinomial(problem);
    const verdict = ok => (ok ? 'correct' : 'missed');
    const notes = ['the trinomial', 'split the middle term', 'pull the GCF out of each pair', 'factor out the matching inside'];

    $('tri-result').innerHTML =
      `<div class="final ${kind}" role="group" aria-label="${expanded} equals ${sol.final}">` +
        `<div class="final-col"><div class="final-label">Expanded</div><div class="final-expr">${expanded}</div></div>` +
        '<div class="final-eq" aria-hidden="true">=</div>' +
        `<div class="final-col"><div class="final-label">Factored</div><div class="final-expr">${sol.final}</div></div>` +
      '</div>' +
      '<ul class="checks">' +
        `<li class="${res.split ? 'ok' : 'bad'}">Split the middle: ${verdict(res.split)}. The numbers were ${sol.m1} and ${sol.m2}.</li>` +
        `<li class="${res.pull ? 'ok' : 'bad'}">GCF of each pair: ${verdict(res.pull)}</li>` +
        `<li class="${res.match ? 'ok' : 'bad'}">Insides match: ${verdict(res.match)}</li>` +
      '</ul>' +
      '<details class="worked"><summary>Show the steps</summary><ol class="work">' +
        sol.lines.map((l, i) => `<li>${l}<small>${notes[i]}</small></li>`).join('') +
      '</ol></details>';
    $('tri-result').classList.remove('hidden');
    $('tri-craft').classList.add('hidden');
    $('tri-next').classList.remove('hidden');
    $('tri').scrollTop = 0;
    render();
    $('tri-next').focus();
  }

  /* ---------- rendering ---------- */
  function setMsg(text, kind = '') {
    const m = $('tri-msg');
    m.textContent = text;
    m.className = 'msg ' + kind;
  }

  function render() {
    const stage = stageOf();
    $('tri').dataset.state = state;
    $('tri').dataset.stage = stage;

    const chips = Store.get().chips;
    let anyLocked = false;
    document.querySelectorAll('#tri-bets .bet').forEach(btn => {
      const amount = parseInt(btn.dataset.bet, 10);
      const locked = amount > chips;
      anyLocked = anyLocked || locked;
      btn.disabled = locked;
      btn.querySelector('.bet-win').textContent = locked ? `Need ${amount} chips` : `Win ${Trinomials.payout(amount)}`;
    });
    $('tri-lowhint').classList.toggle('hidden', !anyLocked);
    for (let i = 0; i < SLOTS; i++) {
      slotEls[i].innerHTML = slots[i] === null ? '' : blockHTML(slots[i]);
      slotEls[i].setAttribute('aria-label', slots[i] === null
        ? `${SLOT_NAMES[i]}, empty`
        : `${SLOT_NAMES[i]}: ${Trinomials.fmtBlock(slots[i])}. Click to remove.`);
    }

    if (!problem) return; // still on the wager screen

    if (stage !== 'done' && stage !== invStage) { invStage = stage; buildInventory(stage === '1'); }

    const { a, b, c } = problem;
    $('tri-wager').textContent = `Wager: ${bet} chips. Win ${Trinomials.payout(bet)} if you get it right.`;
    $('tri-poly').textContent = Trinomials.fmtTrinomial(problem);
    $('tri-hint1').textContent = `Pick two numbers that multiply to ${a * c} and add to ${b}.`;

    // the big rewrite line: only once both numbers are in, split terms highlighted
    const rewrite = $('tri-rewrite');
    if (step1Done()) {
      const parts = Trinomials.termParts([
        Trinomials.term(a, 2),
        Trinomials.term(slots[0].k, 1),
        Trinomials.term(slots[1].k, 1),
        Trinomials.term(c, 0),
      ]);
      rewrite.innerHTML = parts.map((p, i) => (i === 1 || i === 2 ? `<span class="hl">${p}</span>` : p)).join('');
    } else {
      rewrite.textContent = '';
    }

    const filled = slots.filter(Boolean).length;
    $('tri-craft').disabled = state !== 'playing' || filled < SLOTS;
    $('tri-clear').disabled = state !== 'playing' || filled === 0;
  }

  return { open, close, isOpen };
})();
