/* Mini-game: simplify a square root by pairing prime factors.
   Level first: the level you pick decides how big the radicand is (see TIERS in radicals.js), and the radical is dealt only after
   you pick. One shot per radical. A correct answer pays the level's chips; a wrong one costs nothing.

   The screen reveals itself one step at a time:
     bet   only the four level cards
     1     break the number into primes (drop prime gems in)
     2     click two equal primes to pair them
     3     pick what comes outside and what stays inside the radical
     done  the workbench is replaced by "original = simplified", side by side

   The math lives in radicals.js; this file is only the interface. */
const RadicalGame = (() => {
  const $ = id => document.getElementById(id);
  const BUILD = 27; // must match Radicals.BUILD
  const MAX_FACTORS = 9;
  const PRIMES = Factoring.primesUpTo(100);

  let problem = null;
  let state = 'idle';       // idle | betting | playing | done
  let step = '1';           // 1 | 2 | 3 while playing
  let level = 0;                // the level of the current radical (1 to 4)
  let factors = [];         // the student's primes, ascending
  let pairs = [];           // [[i, j], ...] indexes into factors
  let sel = null;           // index of the tile waiting for a partner
  let outSlot = null;       // step 3 answers
  let inSlot = null;
  let wired = false;
  let lastN = null;
  let invKey = null;

  /* ---------- small helpers ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  const primeColor = p => `hsl(${(Math.max(0, PRIMES.indexOf(p)) * 137.5) % 360} 62% 50%)`;
  const numColor = n => `hsl(${120 + ((n * 23) % 100)} 60% 48%)`;
  const gem = (label, color) => `<span class="gem-face" style="--gem:${color}">${label}</span>`;
  const primeGem = p => gem(p, primeColor(p));
  const numGem = n => gem(n, numColor(n));

  const RADICAL_SIGN = '<svg class="rad-sign" viewBox="0 0 20 40" preserveAspectRatio="none" aria-hidden="true"><path d="M1 24 L5 20 L10 38 L19 1"/></svg>';
  /** A square-root sign drawn in CSS around whatever nodes you give it. */
  function radicalEl(children, label) {
    const wrap = el('span', 'rad');
    wrap.setAttribute('role', 'group');
    if (label) wrap.setAttribute('aria-label', label);
    wrap.innerHTML = RADICAL_SIGN;
    const body = el('span', 'rad-body');
    children.forEach(c => body.append(c));
    wrap.append(body);
    return wrap;
  }
  /** The same thing as an HTML string, for the answer panel. */
  const radicalHTML = inner =>
    `<span class="rad" role="img" aria-label="square root of ${inner}">${RADICAL_SIGN}<span class="rad-body">${inner}</span></span>`;

  /* ---------- building the interface (once) ---------- */
  function wire() {
    if (wired) return;
    wired = true;

    Radicals.TIERS.forEach(t => {
      const b = el('button', 'btn bet-card bet');
      b.type = 'button';
      b.dataset.level = t.level;
      b.innerHTML =
        `<span class="bet-amt">${t.name}</span>` +
        `<span class="bet-desc">${t.desc}</span>` +
        `<span class="bet-win">Pays ${t.pay} chips</span>`;
      b.addEventListener('click', () => chooseLevel(t.level));
      $('rad-bets').appendChild(b);
    });
    $('rad-wallet').parentNode.insertBefore(Trophies.chip('radical'), $('rad-wallet'));

    $('rad-close').addEventListener('click', close);
    $('rad-done1').addEventListener('click', () => goStep('2'));
    $('rad-back2').addEventListener('click', () => goStep('1'));
    $('rad-done2').addEventListener('click', () => goStep('3'));
    $('rad-back3').addEventListener('click', () => goStep('2'));
    $('rad-craft').addEventListener('click', craft);
    $('rad-next').addEventListener('click', newRound);
    Store.onChange(() => { $('rad-wallet').textContent = `${Store.get().chips} chips`; if (state !== 'idle') render(); });
  }

  /** The palette changes with the step: primes for step 1, plain numbers for step 3. */
  function buildPalette(kind) {
    const pal = Radicals.palette(level);
    const inv = $('rad-inventory');
    inv.innerHTML = '';
    $('rad-inv-title').textContent = kind === 'primes' ? 'Prime gems' : 'Numbers';
    const items = kind === 'primes' ? pal.primes : Array.from({ length: pal.numMax }, (_, i) => i + 1);
    items.forEach(v => {
      const b = el('button', 'gem');
      b.type = 'button';
      b.setAttribute('aria-label', kind === 'primes' ? `Prime ${v}` : `Number ${v}`);
      b.innerHTML = kind === 'primes' ? primeGem(v) : numGem(v);
      b.addEventListener('click', () => (kind === 'primes' ? addFactor(v) : placeNumber(v)));
      inv.appendChild(b);
    });
  }

  /* ---------- open / close / rounds ---------- */
  function open() {
    if (Radicals.BUILD !== BUILD) {
      UI.dialog({
        title: 'Files out of date',
        html: '<p>Your browser mixed old and new game files. Reload the page with Ctrl+Shift+R (Cmd+Shift+R on Mac) and try again.</p>',
      });
      return;
    }
    wire();
    $('rad').classList.remove('hidden');
    UI.setOpen('rad', true);
    newRound();
    $('rad-close').focus();
  }

  function close() {
    state = 'idle';
    $('rad').classList.add('hidden');
    UI.setOpen('rad', false);
  }

  const isOpen = () => !$('rad').classList.contains('hidden');

  /** Back to the level screen. Nothing is dealt until a level is chosen. */
  function newRound() {
    problem = null;
    level = 0;
    factors = []; pairs = []; sel = null; outSlot = null; inSlot = null;
    step = '1';
    state = 'betting';
    invKey = null;
    $('rad-result').innerHTML = '';
    $('rad').scrollTop = 0;
    setMsg('');
    render();
  }

  function chooseLevel(chosen) {
    if (state !== 'betting') return;
    level = chosen;
    let p = Radicals.generate(level);
    for (let tries = 0; tries < 6 && p.n === lastN; tries++) p = Radicals.generate(level); // avoid an immediate repeat
    problem = p;
    lastN = p.n;
    factors = []; pairs = []; sel = null; outSlot = null; inSlot = null;
    step = '1';
    state = 'playing';
    invKey = null;
    setMsg('Break the number into primes.');
    render();
  }

  function goStep(next) {
    if (state !== 'playing') return;
    if (next === '2') {
      if (!factors.length) return;
      pairs = []; sel = null;
      setMsg('Click two equal numbers to pair them.');
    } else if (next === '3') {
      outSlot = null; inSlot = null;
      setMsg('');
    } else {
      pairs = []; sel = null;
      setMsg('');
    }
    step = next;
    render();
  }

  /* ---------- step 1: factors ---------- */
  function addFactor(p) {
    if (state !== 'playing' || step !== '1') return;
    if (factors.length >= MAX_FACTORS) { setMsg('That is the most you can place. Click a gem in the radical to take it back out.'); return; }
    factors.push(p);
    factors.sort((a, b) => a - b);
    setMsg('');
    render();
  }

  function removeFactor(i) {
    if (state !== 'playing' || step !== '1') return;
    factors.splice(i, 1);
    render();
  }

  /* ---------- step 2: pairs ---------- */
  function clickTile(i) {
    if (state !== 'playing' || step !== '2') return;
    if (sel === null) { sel = i; setMsg(''); }
    else if (sel === i) { sel = null; }
    else if (factors[sel] === factors[i]) { pairs.push([sel, i]); sel = null; setMsg(''); }
    else { setMsg('A pair needs two equal numbers.'); sel = i; }
    render();
  }

  function unpair(pi) {
    if (state !== 'playing' || step !== '2') return;
    pairs.splice(pi, 1);
    render();
  }

  /** The factors as a radical: pairs boxed together, loose tiles after them. */
  function factorRadical(interactive) {
    const used = new Set(pairs.flat());
    const nodes = [];
    pairs.forEach(([i, j], pi) => {
      const box = el(interactive ? 'button' : 'div', 'pair-box');
      if (interactive) {
        box.type = 'button';
        box.setAttribute('aria-label', `Pair of ${factors[i]}s. Click to split them.`);
        box.addEventListener('click', () => unpair(pi));
      }
      box.innerHTML = primeGem(factors[i]) + primeGem(factors[j]);
      nodes.push(box);
    });
    factors.forEach((p, i) => {
      if (used.has(i)) return;
      const t = el(interactive ? 'button' : 'div', 'tile' + (sel === i ? ' sel' : ''));
      if (interactive) {
        t.type = 'button';
        t.setAttribute('aria-label', sel === i ? `${p}, selected` : `${p}, not paired`);
        t.setAttribute('aria-pressed', sel === i ? 'true' : 'false');
        t.addEventListener('click', () => clickTile(i));
      }
      t.innerHTML = primeGem(p);
      nodes.push(t);
    });
    return radicalEl(nodes, `square root of ${factors.join(' times ')}`);
  }

  /* ---------- step 3: inside and outside ---------- */
  function placeNumber(n) {
    if (state !== 'playing' || step !== '3') return;
    if (outSlot === null) outSlot = n;
    else if (inSlot === null) inSlot = n;
    else { setMsg('Both slots are full. Click one to take it back out.'); return; }
    setMsg('');
    render();
  }

  function slotButton(value, label, onClear) {
    const b = el('button', 'slot');
    b.type = 'button';
    b.innerHTML = value === null ? '' : numGem(value);
    b.setAttribute('aria-label', value === null ? `${label}, empty` : `${label}: ${value}. Click to remove.`);
    b.addEventListener('click', onClear);
    return b;
  }

  /* ---------- crafting ---------- */
  function craft() {
    if (state !== 'playing' || step !== '3' || outSlot === null || inSlot === null) return;
    const res = Radicals.check(problem, { factors, pairs, outside: outSlot, inside: inSlot });
    const s = Store.get();
    if (res.ok) {
      const win = Radicals.payout(level);
      Store.earn(win);
      Store.set({ radicalWins: (s.radicalWins || 0) + 1 });
      Trophies.award('radical');
      finish(res, `Correct! +${win} chips.`, 'good');
    } else {
      Store.set({ radicalLosses: (s.radicalLosses || 0) + 1 });
      finish(res, 'Not this time. Nothing lost. Here is how it works.', 'bad');
    }
  }

  /** The workbench gives way to the answer: original and simplified, side by side. */
  function finish(res, msg, kind) {
    state = 'done';
    setMsg(msg, kind);
    const sol = Radicals.solution(problem);
    const verdict = ok => (ok ? 'correct' : 'missed');
    const notes = ['the radical', 'break into primes', 'group equal pairs', 'each pair comes out as one number', 'multiply the outside'];

    $('rad-result').innerHTML =
      `<div class="final ${kind}" role="group" aria-label="square root of ${problem.n} equals ${sol.answer}">` +
        `<div class="final-col"><div class="final-label">Original</div><div class="final-expr">${radicalHTML(problem.n)}</div></div>` +
        '<div class="final-eq" aria-hidden="true">=</div>' +
        `<div class="final-col"><div class="final-label">Simplified</div><div class="final-expr">${sol.outside > 1 ? `<span class="coef">${sol.outside}</span>` : ''}${radicalHTML(sol.inside)}</div></div>` +
      '</div>' +
      '<ul class="checks">' +
        `<li class="${res.factors ? 'ok' : 'bad'}">Prime factors: ${verdict(res.factors)}. ${problem.n} = ${Factoring.toExponentForm(problem.factors)}.</li>` +
        `<li class="${res.pairs ? 'ok' : 'bad'}">Pairs: ${verdict(res.pairs)}</li>` +
        `<li class="${res.answer ? 'ok' : 'bad'}">Inside and outside: ${verdict(res.answer)}</li>` +
      '</ul>' +
      '<details class="worked"><summary>Show the steps</summary><ol class="work">' +
        sol.lines.map((l, i) => `<li>${l}<small>${notes[i]}</small></li>`).join('') +
      '</ol></details>';
    $('rad').scrollTop = 0;
    render();
    $('rad-next').focus();
  }

  /* ---------- rendering ---------- */
  function setMsg(text, kind = '') {
    const m = $('rad-msg');
    m.textContent = text;
    m.className = 'msg ' + kind;
  }

  const show = (id, on) => $(id).classList.toggle('hidden', !on);

  function render() {
    const stage = state === 'betting' ? 'bet' : state === 'done' ? 'done' : step;
    $('rad').dataset.state = state;
    $('rad').dataset.stage = stage;

    // one thing at a time
    show('rad-bet-row', stage === 'bet');
    show('rad-wager', stage === '1' || stage === '2' || stage === '3');
    show('rad-felt', stage === '1' || stage === '2' || stage === '3');
    show('rad-s1', stage === '1');
    show('rad-s2', stage === '2');
    show('rad-s3', stage === '3');
    show('rad-inv-wrap', stage === '1' || stage === '3');
    show('rad-craft', stage === '3');
    show('rad-next', stage === 'done');
    show('rad-result', stage === 'done');
    if (!problem) return;

    $('rad-wager').textContent = `Level: ${Radicals.tierFor(level).name}. Pays ${Radicals.payout(level)} chips if you get it right.`;
    const radicand = $('rad-radicand');
    radicand.innerHTML = '';
    radicand.append(radicalEl([document.createTextNode(String(problem.n))], `square root of ${problem.n}`));

    if (stage === '1' || stage === '3') {
      const key = stage === '1' ? 'primes' : 'numbers';
      if (invKey !== key) { invKey = key; buildPalette(key); }
    }

    if (stage === '1') {
      $('rad-hint1').textContent = `Break ${problem.n} into prime factors. Drop in as many gems as it takes.`;
      const row = $('rad-factors');
      row.innerHTML = '';
      const nodes = factors.map((p, i) => {
        const b = el('button', 'tile');
        b.type = 'button';
        b.setAttribute('aria-label', `Prime ${p}. Click to remove.`);
        b.innerHTML = primeGem(p);
        b.addEventListener('click', () => removeFactor(i));
        return b;
      });
      if (factors.length < MAX_FACTORS) nodes.push(el('span', 'tile ghost'));
      row.append(radicalEl(nodes, 'your prime factors'));
      $('rad-done1').disabled = factors.length === 0;
    }

    if (stage === '2') {
      const host = $('rad-pairing');
      host.innerHTML = '';
      host.append(factorRadical(true));
      $('rad-pair-count').textContent = `${pairs.length} pair${pairs.length === 1 ? '' : 's'} made`;
    }

    if (stage === '3') {
      const host = $('rad-summary');
      host.innerHTML = '';
      host.append(factorRadical(false));
      const row = $('rad-answer');
      row.innerHTML = '';
      row.append(
        slotButton(outSlot, 'Outside the radical', () => { outSlot = null; render(); }),
        radicalEl([slotButton(inSlot, 'Inside the radical', () => { inSlot = null; render(); })], 'square root of the inside number')
      );
      $('rad-craft').disabled = outSlot === null || inSlot === null;
    }
  }

  return { open, close, isOpen };
})();
