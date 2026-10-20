/* The chalkboard timed practice at the Addition, Subtraction, Multiplication and Division tables.
   Three pages, white chalk on green:
     rules   how it works, your best score, and a Start button
     play    a 60-second countdown, a problem, your typed answer, and a number pad
     done    how many you solved, the chips you earned, and the ones that got away

   Type with the keyboard (Enter to submit) or tap the number pad. Every correct answer pays 1 chip
   right away. The rules of a round live in arithmetic.js; this file is the screen. */
const ArithmeticGame = (() => {
  const $ = id => document.getElementById(id);
  let chipEl = null;
  /** The "Trophy: 37 of 100" label for whichever table is open. */
  function mountTrophyChip() {
    if (chipEl) chipEl.remove();
    chipEl = Trophies.chip(op);
    $('arith-wallet').parentNode.insertBefore(chipEl, $('arith-wallet'));
  }
  const BUILD = 19; // must match Arithmetic.BUILD
  const MAX_DIGITS = 3;
  const SAID = { add: 'plus', sub: 'minus', mul: 'times', div: 'divided by' };   // for screen readers
  const TICK_MS = 100;

  /** The clock is swappable so tests can run a whole minute instantly. */
  const clock = {
    now: () => performance.now(),
    every: (fn, ms) => setInterval(fn, ms),
    stop: id => clearInterval(id),
  };

  let op = 'add';
  let round = null;
  let stage = 'idle';      // idle | rules | play | done
  let typed = '';
  let timerId = null;
  let wired = false;

  const spec = () => Arithmetic.OPS[op];
  const isOpen = () => !$('arith').classList.contains('hidden');
  const show = (id, on) => $(id).classList.toggle('hidden', !on);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const eq = p => `${p.a} ${p.symbol} ${p.b} = ${p.answer}`;

  /* ---------- building the screen (once) ---------- */
  function wire() {
    if (wired) return;
    wired = true;

    const pad = $('arith-pad');
    ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'Del', '0', 'Enter'].forEach(k => {
      const b = el('button', 'chalk-key' + (k.length > 1 ? ' wide' : ''), k === 'Del' ? '⌫' : k === 'Enter' ? '↵' : k);
      b.type = 'button';
      b.tabIndex = -1;   // keyboard users type; this keeps Enter from "pressing" a pad key twice
      b.setAttribute('aria-label', k === 'Del' ? 'Delete' : k === 'Enter' ? 'Enter' : k);
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => (k === 'Del' ? backspace() : k === 'Enter' ? submit() : typeDigit(k)));
      pad.appendChild(b);
    });

    $('arith-start').addEventListener('click', startRound);
    $('arith-close').addEventListener('click', close);
    $('arith-again').addEventListener('click', () => showRules());
    $('arith-leave').addEventListener('click', close);

    window.addEventListener('keydown', e => {
      if (!isOpen() || stage !== 'play' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); if (!e.repeat) typeDigit(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); if (!e.repeat) backspace(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) submit(); }   // preventDefault: no stray button presses
    });

    Store.onChange(() => { $('arith-wallet').textContent = `${Store.get().chips} chips`; });
  }

  /* ---------- open and close ---------- */
  function open(which) {
    if (Arithmetic.BUILD !== BUILD) {
      UI.dialog({
        title: 'Files out of date',
        html: '<p>Your browser mixed old and new game files. Reload the page with Ctrl+Shift+R (Cmd+Shift+R on Mac) and try again.</p>',
      });
      return;
    }
    if (!Arithmetic.OPS[which]) return;
    wire();
    op = which;
    $('arith').classList.remove('hidden');
    UI.setOpen('arith', true);
    showRules();
  }

  function close() {
    stopTimer();
    stage = 'idle';
    round = null;
    $('arith').classList.add('hidden');
    UI.setOpen('arith', false);
  }

  function stopTimer() {
    if (timerId !== null) { clock.stop(timerId); timerId = null; }
  }

  /* ---------- page 1: the rules ---------- */
  function showRules() {
    stopTimer();
    stage = 'rules';
    round = Arithmetic.createRound(op);
    typed = '';
    const s = spec();
    $('arith-title').textContent = s.name;

    const list = $('arith-rule-list');
    mountTrophyChip();
    list.innerHTML = '';
    [
      `You have ${Arithmetic.DURATION_MS / 1000} seconds. Solve as many problems as you can.`,
      s.rule,
      'Type your answer and press Enter, or tap the number pad.',
      `Every correct answer earns ${Arithmetic.rewardFor(op)} chips, right away.`,
      'A wrong answer earns nothing, and you move on to the next one.',
    ].forEach(t => list.appendChild(el('li', '', t)));

    const best = Store.get().arithBest[op];
    $('arith-best').textContent = best ? `Your best: ${best} solved in one round.` : 'No score yet. Set the first one!';
    render();
    $('arith-start').focus();
  }

  /* ---------- page 2: the round ---------- */
  function startRound() {
    if (stage !== 'rules') return;
    stage = 'play';
    typed = '';
    round.start(clock.now());
    setFeedback('', '');
    stopTimer();
    timerId = clock.every(tick, TICK_MS);
    render();
  }

  function tick() {
    if (stage !== 'play') return;
    if (round.tick(clock.now()) === 'done') finish();
    else renderTimer();
  }

  function typeDigit(d) {
    if (stage !== 'play' || typed.length >= MAX_DIGITS) return;
    typed += d;
    renderAnswer();
  }

  function backspace() {
    if (stage !== 'play') return;
    typed = typed.slice(0, -1);
    renderAnswer();
  }

  function submit() {
    if (stage !== 'play') return;
    const r = round.submit(typed, clock.now());
    if (r.late) { finish(); return; }
    if (r.ignored) { setFeedback('Type your answer first.', 'hint'); return; }
    typed = '';
    if (r.ok) {
      const pay = Arithmetic.rewardFor(op);
      Store.earn(pay);
      Trophies.award(op);
      setFeedback(`Yes! +${pay} chips`, 'good');
    } else {
      setFeedback(`Not quite: ${eq(r.problem)}`, 'bad');
    }
    render();
  }

  function setFeedback(text, kind) {
    const f = $('arith-feedback');
    f.textContent = text;
    f.className = 'chalk-feedback ' + kind;
  }

  /* ---------- page 3: the results ---------- */
  function finish() {
    stopTimer();
    stage = 'done';
    const sum = round.summary();
    const isBest = Store.recordBest(op, sum.correct);
    const best = Store.get().arithBest[op];

    $('arith-score-big').textContent = String(sum.correct);
    $('arith-score-label').textContent = sum.correct === 1 ? 'problem solved' : 'problems solved';
    $('arith-earned').textContent = `Chips earned: ${sum.chips}`;
    $('arith-best-line').textContent = isBest ? `New personal best! (${best})` : `Your best: ${best || 0}`;
    $('arith-best-line').classList.toggle('new', isBest);
    $('arith-missed-count').textContent = sum.missed.length ? `Missed: ${sum.missed.length}` : 'Missed: none. Nice!';

    const list = $('arith-missed');
    list.innerHTML = '';
    sum.missed.slice(0, 6).forEach(m => list.appendChild(el('li', '', `${eq(m)}  (you typed ${m.given})`)));
    show('arith-missed-wrap', sum.missed.length > 0);
    render();
    $('arith-again').focus();
  }

  /* ---------- drawing ---------- */
  function renderTimer() {
    const ms = round.remaining(clock.now());
    const secs = Math.ceil(ms / 1000);
    $('arith-time').textContent = String(secs);
    $('arith-time').classList.toggle('low', secs <= 10);
    $('arith-bar').style.width = `${Math.max(0, Math.min(100, (ms / round.durationMs) * 100))}%`;
  }

  function renderAnswer() {
    $('arith-answer').textContent = typed;
  }

  function render() {
    $('arith').dataset.stage = stage;
    show('arith-rules', stage === 'rules');
    show('arith-play', stage === 'play');
    show('arith-done', stage === 'done');
    $('arith-wallet').textContent = `${Store.get().chips} chips`;
    if (stage === 'play') {
      const p = round.current;
      $('arith-problem').textContent = `${p.a} ${p.symbol} ${p.b} = ?`;
      $('arith-problem').setAttribute('aria-label', `${p.a} ${SAID[op]} ${p.b} equals what`);
      $('arith-score').textContent = `${round.correct} correct`;
      renderAnswer();
      renderTimer();
    }
  }

  return { open, close, isOpen, clock, get stage() { return stage; } };
})();
