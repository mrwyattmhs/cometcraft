/* The CLOCK GAME (overlay #clk): walk up to a clock on a wall (the Arithmetic Academy's classroom clock, or the one in the Science Lab), press E, and practise reading it. The maths and the pictures
   are in clock.js; this file is only the window, made the first time you need it.
     Easy    "Show 4 o'clock"                        SET the short hand: tap a number, drag the hand round, or use the arrows
     Medium  "Point the long hand at 35 minutes"     SET the long hand the same ways (each number is 5 minutes; the ticks are single minutes)
     Hard    "What time does the clock show?"        READ the clock and type the hour and the minutes on the number pad
   One shot per question: a right answer pays the level's chips and counts toward the trophy, a wrong one costs nothing, and either way the right hand is shown, a line says what the clock
   shows, and the worked steps take the controls' place (so the window never grows and never needs scrolling). */
const ClockGame = (() => {
  const P = 'clk', $ = id => document.getElementById(`${P}-${id}`), C = Clock, WIN = Economy.PAY.clock;
  let problem = null, level = 1, state = 'idle', wired = false, last = null, value = null, boxes = [], active = 0, drag = false;
  const isOpen = () => !!document.getElementById(P) && !document.getElementById(P).classList.contains('hidden');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const show = which => { $('pick').classList.toggle('hidden', which !== 'pick'); $('play').classList.toggle('hidden', which !== 'play'); document.getElementById(P).dataset.state = which; };
  const setMsg = (text, cls) => { const m = $('msg'); m.textContent = text; m.className = `msg${cls ? ' ' + cls : ''}`; };
  const mode = () => C.levelOf(level).mode, setting = () => mode() !== 'read', filled = b => /\d/.test(b.value);

  function ensureDom() {
    if (document.getElementById(P)) return;
    const d = document.createElement('div'); d.id = P; d.className = 'overlay hidden kelly'; d.dataset.state = 'idle';
    d.innerHTML =
      `<div class="mc-panel eqn-panel clock-panel" role="dialog" aria-modal="true" aria-labelledby="${P}-title">` +
      `<header class="craft-head"><div class="k-title"><span class="k-wing">Arithmetic Academy</span><div class="k-titlerow"><span class="k-cube" aria-hidden="true"></span><h2 id="${P}-title">Read the Clock</h2><span class="k-formula">3:45</span></div></div>` +
      `<div class="craft-meta"><span id="${P}-wallet" class="wallet-chip">0 chips</span><button id="${P}-close" class="btn small" type="button">Leave the clock</button></div></header>` +
      `<div id="${P}-pick"><span class="k-label">Pick a level</span><p class="bet-prompt">Practise telling the time. A wrong answer never costs you chips.</p><div id="${P}-levels" class="bet-grid"></div>` +
      `<div class="cub-ref"><span class="k-label">Remember</span><p>The short hand shows the hour. The long hand shows the minutes: each number is 5 minutes, so the 1 is 5, the 2 is 10, the 3 is 15 ...</p><p>When the long hand points straight up at the 12, it is o\u2019clock.</p></div></div>` +
      `<div id="${P}-play" class="eqn-play hidden"><div class="eqn-main"><p id="${P}-wager" class="wager-line"></p><p id="${P}-ask" class="clk-ask"></p><div class="felt"><div id="${P}-fig" class="clk-fig"></div>` +
      `<div id="${P}-time" class="clk-time hidden"></div></div><p id="${P}-hint" class="hint"></p><p id="${P}-msg" class="msg" role="status"></p></div>` +
      `<div class="eqn-side"><div id="${P}-ctl" class="clk-ctl"><div id="${P}-nudge" class="clk-nudge"></div><button id="${P}-go" class="btn primary" type="button">Check</button></div><div id="${P}-pad" class="eqn-pad hidden" role="group" aria-label="Number pad"></div>` +
      `<div id="${P}-after" class="eqn-after hidden"><div id="${P}-result" class="result"></div><div class="cub-actions"><button id="${P}-next" class="btn primary" type="button">Next</button><button id="${P}-change" class="btn" type="button">Change level</button></div></div></div></div></div>`;
    document.body.appendChild(d);
  }
  function wire() {
    if (wired) return;
    wired = true; ensureDom();
    C.LEVELS.forEach(lv => {
      const b = el('button', 'btn bet-card bet'); b.type = 'button'; b.dataset.level = lv.level;
      b.innerHTML = `<span class="k-ico"><span class="poly-sample">${lv.sample}</span></span><span class="bet-amt">${lv.name}</span><span class="bet-desc">${lv.desc}</span>` +
        `<span class="bet-win"><i class="k-coin" aria-hidden="true"></i><b>${WIN[lv.level - 1]} chips</b><em> per answer</em></span>`;
      b.addEventListener('click', () => start(lv.level)); $('levels').appendChild(b);
    });
    NumPad.build($('pad'), P, false);                                       // (Hard) the same pad as the booths: its Check key is #clk-check
    $('pad').addEventListener('click', e => { const k = e.target.closest('.eqn-key'), box = boxes[active]; if (!k || state !== 'playing' || k.dataset.key === 'check' || !box) return; NumPad.tap(box, k.dataset.key, false); if ($('msg').classList.contains('bad')) setMsg(''); box.focus({ preventScroll: true }); });
    [['\u25c0', 'one back', -1], ['\u25b6', 'one on', 1]].forEach(([t, name, n]) => { const b = el('button', 'btn clk-step', t); b.type = 'button'; b.dataset.step = n; b.setAttribute('aria-label', name); b.addEventListener('click', () => nudge(n)); $('nudge').appendChild(b); });
    [['\u22125', 'five minutes back', -5], ['+5', 'five minutes on', 5]].forEach(([t, name, n]) => { const b = el('button', 'btn clk-step clk-five', t); b.type = 'button'; b.dataset.step = n; b.setAttribute('aria-label', name); b.addEventListener('click', () => nudge(n)); $('nudge').insertBefore(b, n < 0 ? $('nudge').firstChild : null); });
    $('close').addEventListener('click', close); $('go').addEventListener('click', check); $('check').addEventListener('click', check); $('next').addEventListener('click', () => deal());
    $('change').addEventListener('click', () => { state = 'picking'; show('pick'); const c = $('levels').querySelector('.bet'); if (c) c.focus(); });
    $('wallet').parentNode.insertBefore(Trophies.chip('clock'), $('wallet'));
    Store.onChange(() => { $('wallet').textContent = `${Store.get().chips} chips`; });
    /* setting the hand: tap a number, drag the hand round (a mouse or a finger), or use the arrow keys */
    const fig = $('fig');
    fig.addEventListener('click', e => { const n = e.target.closest('[data-num]'); if (n && setting() && state === 'playing') set(mode() === 'hour' ? Number(n.dataset.num) : (Number(n.dataset.num) * 5) % 60); });
    const aim = e => { const svg = fig.querySelector('svg'), r = svg.getBoundingClientRect(), a = (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI + 360) % 360; set(mode() === 'hour' ? Math.round(a / 30) % 12 || 12 : Math.round(a / 6) % 60); };
    fig.addEventListener('pointerdown', e => { if (!setting() || state !== 'playing') return; drag = true; try { fig.setPointerCapture(e.pointerId); } catch (x) { /* a stand-in event has no pointer to capture */ } aim(e); });
    fig.addEventListener('pointermove', e => { if (drag && state === 'playing') aim(e); });
    ['pointerup', 'pointercancel'].forEach(t => fig.addEventListener(t, () => { drag = false; }));
    fig.addEventListener('keydown', e => {
      if (!setting() || state !== 'playing') return; const big = e.shiftKey && mode() === 'minute' ? 5 : 1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); nudge(big); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); nudge(-big); } else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.defaultPrevented && isOpen() && state === 'done' && !e.repeat && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); deal(); } });
  }
  function open() {
    wire(); $('wallet').textContent = `${Store.get().chips} chips`;
    state = 'picking'; show('pick'); document.getElementById(P).classList.remove('hidden'); UI.setOpen(P, true);
    const c = $('levels').querySelector('.bet'); if (c) c.focus();
  }
  function close() { if (!isOpen()) return; document.getElementById(P).classList.add('hidden'); UI.setOpen(P, false); state = 'idle'; drag = false; }
  function start(l) { level = C.levelOf(l).level; last = null; deal(); }

  /* ---------- the hand you set ---------- */
  const handOf = which => $('fig').querySelector(`[data-hand="${which}"]`), turn = (g, a) => g && g.setAttribute('transform', `rotate(${a.toFixed(2)} 150 150)`);
  /** Move the hand you are setting to a value (Easy: the hour, 1 to 12; Medium: the minute, 0 to 59). */
  function set(v) {
    if (!setting() || state !== 'playing') return;
    value = mode() === 'hour' ? ((Math.round(v) - 1) % 12 + 12) % 12 + 1 : ((Math.round(v) % 60) + 60) % 60;
    const a = C.handsFor(problem, value); turn(handOf(mode() === 'hour' ? 'hour' : 'minute'), mode() === 'hour' ? a.hour : a.minute);
    const svg = $('fig').querySelector('svg'); svg.setAttribute('aria-valuenow', String(value)); svg.setAttribute('aria-valuetext', mode() === 'hour' ? `${value} o\u2019clock` : `${value} minutes`);
  }
  const nudge = d => set(value + d);

  /* ---------- a new question ---------- */
  function deal() {
    problem = C.problem(level, Math.random, last); last = problem; state = 'playing'; boxes = []; active = 0; drag = false;
    $('wager').textContent = `${C.levelOf(level).name}: ${WIN[level - 1]} chips for a right answer`; $('ask').textContent = C.prompt(problem);
    value = C.startValue(problem); const a = C.handsFor(problem, value), fig = $('fig'), tm = $('time'); fig.innerHTML = C.svg({ hour: a.hour, minute: a.minute, label: 'A clock' }); tm.textContent = '';
    const svg = fig.querySelector('svg');
    if (setting()) {
      const g = handOf(mode() === 'hour' ? 'hour' : 'minute'); g.classList.add('clk-set'); svg.classList.add('clk-interactive'); svg.setAttribute('tabindex', '0'); svg.setAttribute('role', 'slider'); svg.setAttribute('aria-label', `Clock: set the ${mode() === 'hour' ? 'short' : 'long'} hand`);
      svg.setAttribute('aria-valuemin', mode() === 'hour' ? '1' : '0'); svg.setAttribute('aria-valuemax', mode() === 'hour' ? '12' : '59'); set(value);
      $('hint').textContent = mode() === 'hour' ? 'Tap a number, drag the short hand, or use the arrow buttons.' : 'Tap a number, drag the long hand, or use the buttons to move it a minute at a time.';
    } else {
      const mk = (label, i) => { const col = el('div', 'abd-col'), b = NumPad.box({ label, onInput: () => { if ($('msg').classList.contains('bad')) setMsg(''); }, onFocus: () => { active = i; }, onEnter: x => { const empty = boxes.find(q => !filled(q)); if (empty && empty !== x && filled(x)) empty.focus(); else check(); } }); col.append(b, el('span', 'abd-cap', label.toLowerCase())); return [b, col]; };
      const [hb, hc] = mk('Hour', 0), [mb, mc] = mk('Minutes', 1); boxes = [hb, mb]; tm.append(hc, el('span', 'clk-colon', ':'), mc);
      $('hint').textContent = 'The short hand shows the hour. The long hand shows the minutes.';
    }
    $('play').classList.toggle('reading', !setting());                        // (a question you answer by typing: its layout has a pad and two boxes to fit)
    $('ctl').classList.toggle('hidden', !setting()); $('pad').classList.toggle('hidden', setting()); tm.classList.toggle('hidden', setting()); $('after').classList.add('hidden'); $('play').classList.remove('answered');
    $('nudge').classList.toggle('clk-minutes', mode() === 'minute'); setMsg(''); $('result').textContent = ''; show('play');
    if (setting()) svg.focus({ preventScroll: true }); else boxes[0].focus({ preventScroll: true });
  }

  function check() {
    if (state !== 'playing') return;
    let ok;
    if (setting()) ok = C.isCorrect(problem, value);
    else {
      const empty = boxes.find(b => !filled(b)); if (empty) { setMsg('Fill in the hour and the minutes first.', 'bad'); empty.focus(); return; }
      const nums = boxes.map(b => Number(b.value)); ok = C.isCorrect(problem, nums[0], nums[1]);
      boxes.forEach((b, i) => { b.disabled = true; b.classList.add(nums[i] === [problem.hour, problem.minute][i] ? 'ok' : 'miss'); });
    }
    state = 'done'; const s = Store.get();
    if (setting()) {                                                         // show where the hand should have been (green), and mark the one you set if it was wrong
      const which = mode() === 'hour' ? 'hour' : 'minute', mine = handOf(which), a = C.handsFor(problem, C.answerOf(problem));
      if (!ok) mine.classList.add('clk-wrong'); const ghost = mine.cloneNode(true); ghost.classList.remove('clk-set', 'clk-wrong'); ghost.classList.add('clk-right'); ghost.removeAttribute('data-hand'); turn(ghost, mode() === 'hour' ? a.hour : a.minute); mine.parentNode.insertBefore(ghost, mine);
    }
    if (ok) { const win = WIN[level - 1]; Store.earn(win); Store.set({ clockWins: s.clockWins + 1 }); Trophies.award('clock'); setMsg(`Correct! +${win} chips.`, 'good'); }
    else { Store.set({ clockLosses: s.clockLosses + 1 }); setMsg('Not this time. Nothing lost.', 'bad'); }
    const r = $('result'); r.textContent = ''; const fin = el('div', `final${ok ? '' : ' bad'}`); fin.appendChild(el('span', 'final-label', ok ? 'You read it right' : 'The answer')); fin.appendChild(el('div', 'final-text', C.done(problem))); r.appendChild(fin);
    const d = el('details', 'worked'); if (!ok) d.open = true; d.appendChild(el('summary', '', 'Show the steps')); const ol = el('ol', 'work'); C.steps(problem).forEach(t => ol.appendChild(el('li', '', t))); d.appendChild(ol); r.appendChild(d);
    $('ctl').classList.add('hidden'); $('pad').classList.add('hidden'); $('after').classList.remove('hidden'); $('play').classList.add('answered'); $('next').focus({ preventScroll: true });
  }

  return { open, close, isOpen, state: () => state, set, nudge, get problem() { return problem; }, get level() { return level; }, get value() { return value; }, get boxes() { return boxes; } };
})();
