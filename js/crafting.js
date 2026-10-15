/* Mini-game: throw d20s, then craft their sum out of prime gems.
   Both modes share this one grid; the mode only changes the rules:
     practice: live product, free retries, small flat reward
     wager:    hidden product, bet chips, one shot, bigger payout */
const CraftingGame = (() => {
  const $ = id => document.getElementById(id);
  const GRID = 9;
  const BETS = [10, 25, 50, 100];
  const PRIMES = Factoring.primesUpTo(100);
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let mode = 'practice';
  let diceCount = 3;
  let state = 'idle'; // idle | rolling | playing | done
  let round = null;
  let slots = Array(GRID).fill(null);
  let bet = 10;
  let timer = null;
  let wired = false;

  const gemColor = p => `hsl(${(Math.max(0, PRIMES.indexOf(p)) * 137.5) % 360} 62% 50%)`;
  const gemHTML = p => `<span class="gem-face" style="--gem:${gemColor(p)}">${p}</span>`;

  /* ---------- wiring ---------- */
  function wire() {
    if (wired) return;
    wired = true;

    const grid = $('grid');
    for (let i = 0; i < GRID; i++) {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'slot';
      s.dataset.i = i;
      s.addEventListener('click', () => removeAt(i));
      s.addEventListener('dragover', e => e.preventDefault());
      s.addEventListener('drop', e => {
        e.preventDefault();
        const p = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (PRIMES.includes(p)) place(p, i);
      });
      grid.appendChild(s);
    }

    $('craft-close').addEventListener('click', close);
    $('btn-clear').addEventListener('click', () => { if (state === 'playing') { slots.fill(null); setMsg(''); render(); } });
    $('btn-craft').addEventListener('click', craft);
    $('btn-next').addEventListener('click', newRound);
    $('dice-count').addEventListener('change', e => { diceCount = parseInt(e.target.value, 10); newRound(); });
    document.querySelectorAll('#bet-row .bet').forEach(b => {
      b.addEventListener('click', () => {
        if (state === 'playing' || state === 'rolling') { bet = parseInt(b.dataset.bet, 10); render(); }
      });
    });
    Store.onChange(() => { $('craft-wallet').textContent = `${Store.get().chips} chips`; if (round) render(); });
  }

  /* ---------- open / close ---------- */
  function open(m) {
    wire();
    mode = m;
    $('craft-title').textContent = m === 'practice' ? 'Practice Table' : 'Wager Table';
    $('bet-row').classList.toggle('hidden', m !== 'wager');
    $('dice-count').value = String(diceCount);
    $('craft').classList.remove('hidden');
    UI.setOpen('craft', true);
    newRound();
    $('craft-close').focus();
  }

  function close() {
    clearInterval(timer);
    state = 'idle';
    $('craft').classList.add('hidden');
    UI.setOpen('craft', false);
  }

  const isOpen = () => !$('craft').classList.contains('hidden');

  /* ---------- rounds ---------- */
  function newRound() {
    clearInterval(timer);
    const chips = Store.get().chips;
    if (bet > chips) bet = Math.max(...BETS.filter(b => b <= chips), BETS[0]);

    round = { ...Factoring.rollDice(diceCount), placements: 0 };
    round.factors = Factoring.primeFactors(round.sum);
    slots = Array(GRID).fill(null);
    state = 'rolling';

    $('dice-row').innerHTML = round.dice.map(() => '<div class="die rolling"><span>?</span></div>').join('');
    $('dice-sum').textContent = '';
    $('target').textContent = '?';
    $('result').classList.add('hidden');
    $('result').innerHTML = '';
    $('btn-next').classList.add('hidden');
    $('btn-craft').classList.remove('hidden');
    setMsg('Rolling...');
    buildInventory();
    render();

    if (reduceMotion()) { revealDice(); return; }
    const faces = [...document.querySelectorAll('#dice-row .die span')];
    const stopAt = faces.map((_, i) => 650 + i * 260);
    const t0 = performance.now();
    timer = setInterval(() => {
      const t = performance.now() - t0;
      faces.forEach((el, i) => {
        if (t < stopAt[i]) el.textContent = 1 + Math.floor(Math.random() * 20);
        else {
          el.textContent = round.dice[i];
          el.parentElement.classList.remove('rolling');
        }
      });
      if (t >= stopAt[stopAt.length - 1]) { clearInterval(timer); revealDice(); }
    }, 70);
  }

  function revealDice() {
    document.querySelectorAll('#dice-row .die').forEach((el, i) => {
      el.classList.remove('rolling');
      el.firstElementChild.textContent = round.dice[i];
    });
    state = 'playing';
    $('dice-sum').textContent = `${round.dice.join(' + ')} = ${round.sum}`;
    $('target').textContent = round.sum;
    setMsg(mode === 'practice'
      ? 'Break the number into primes. Click a gem, or drag it into the grid.'
      : 'Pick your bet, then craft. You only get one shot.');
    render();
  }

  function buildInventory() {
    const inv = $('inventory');
    inv.innerHTML = '';
    Factoring.primesUpTo(diceCount * 20).forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gem';
      b.draggable = true;
      b.setAttribute('aria-label', `Prime ${p}`);
      b.innerHTML = gemHTML(p);
      b.addEventListener('click', () => place(p));
      b.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', String(p)));
      inv.appendChild(b);
    });
  }

  /* ---------- grid actions ---------- */
  function place(p, idx) {
    if (state !== 'playing') return;
    const i = idx === undefined ? slots.indexOf(null) : idx;
    if (i < 0) { setMsg('The grid is full. Click a slot to take a prime back out.'); return; }
    slots[i] = p;
    round.placements++;
    setMsg('');
    render();
  }

  function removeAt(i) {
    if (state !== 'playing' || slots[i] === null) return;
    slots[i] = null;
    render();
  }

  function craft() {
    if (state !== 'playing') return;
    const placed = slots.filter(Boolean);
    if (!placed.length) { setMsg('Place at least one prime first.', 'bad'); return; }
    const prod = Factoring.product(placed);
    const ok = Factoring.isValidFactorization(placed, round.sum);
    const s = Store.get();

    if (mode === 'practice') {
      if (!ok) {
        setMsg(`Not yet. Your primes multiply to ${prod}, and the target is ${round.sum}.`, 'bad');
        shake();
        return;
      }
      const reward = Factoring.practiceReward(diceCount);
      Store.addChips(reward);
      Store.set({ practiceWins: s.practiceWins + 1 });
      finish(`Crafted! +${reward} chips. Solved in ${round.placements} placement${round.placements === 1 ? '' : 's'}.`, 'good');
    } else if (ok) {
      const win = Factoring.wagerPayout(bet, round.factors);
      Store.addChips(win);
      Store.set({ wagerWins: s.wagerWins + 1 });
      finish(`Correct! You bet ${bet} and won ${win} chips (${Factoring.wagerMultiplier(round.factors)}x).`, 'good');
    } else {
      const floored = Store.addChips(-bet);
      Store.set({ wagerLosses: s.wagerLosses + 1 });
      finish(`Not this time. You lose ${bet} chips. Your primes multiply to ${prod}.` +
        (floored ? ` The house tops you up to ${Store.MIN_CHIPS} chips so you can keep playing.` : ''), 'bad');
    }
  }

  function finish(msg, kind) {
    state = 'done';
    setMsg(msg, kind);
    const f = round.factors;
    $('result').innerHTML =
      `<div class="factor-line">${round.sum} = ${Factoring.toExponentForm(f)}${f.length === 1 ? ' (prime)' : ''}</div>` +
      `<div class="tree-wrap">${treeSVG(round.sum)}</div>`;
    $('result').classList.remove('hidden');
    $('btn-craft').classList.add('hidden');
    $('btn-next').classList.remove('hidden');
    render();
    $('btn-next').focus();
  }

  /* ---------- rendering ---------- */
  function setMsg(text, kind = '') {
    const el = $('craft-msg');
    el.textContent = text;
    el.className = 'msg ' + kind;
  }

  function shake() {
    if (reduceMotion()) return;
    const g = $('grid');
    g.classList.remove('shake');
    void g.offsetWidth;
    g.classList.add('shake');
  }

  function render() {
    $('craft').dataset.state = state;
    $('craft').dataset.mode = mode;

    document.querySelectorAll('#grid .slot').forEach((el, i) => {
      el.innerHTML = slots[i] === null ? '' : gemHTML(slots[i]);
      el.setAttribute('aria-label', slots[i] === null ? `Slot ${i + 1}, empty` : `Slot ${i + 1}, prime ${slots[i]}. Click to remove.`);
    });

    const placed = slots.filter(Boolean);
    const prod = placed.length ? Factoring.product(placed) : null;
    const out = $('output');
    let shown, match;
    if (mode === 'practice') {
      shown = prod === null ? '' : prod;
      match = round && prod === round.sum;
    } else {
      shown = state === 'done' ? (prod === null ? '' : prod) : '?';
      match = state === 'done' && round && prod === round.sum;
    }
    $('output-val').textContent = shown;
    out.classList.toggle('match', !!match);
    out.classList.toggle('miss', mode === 'wager' && state === 'done' && !match);

    $('btn-craft').disabled = state !== 'playing' || !placed.length;
    $('btn-clear').disabled = state !== 'playing' || !placed.length;

    const chips = Store.get().chips;
    document.querySelectorAll('#bet-row .bet').forEach(b => {
      const v = parseInt(b.dataset.bet, 10);
      b.disabled = v > chips || state === 'done';
      b.classList.toggle('selected', v === bet);
      b.setAttribute('aria-pressed', v === bet ? 'true' : 'false');
    });
  }

  /* ---------- factor tree (shown after every round) ---------- */
  function treeSVG(n) {
    const f = Factoring.primeFactors(n);
    const k = f.length;
    const stepX = 58, rowH = 52, nw = 44, nh = 30, pad = 6;
    const minCol = k > 1 ? 0 : 1;
    const X = col => pad + nw / 2 + (col - minCol) * stepX;
    const Y = lvl => pad + nh / 2 + lvl * rowH;
    const nodes = [], lines = [];
    let rem = n;
    for (let i = 0; i < k - 1; i++) {
      nodes.push({ v: rem, col: i + 1, lvl: i, prime: false });
      nodes.push({ v: f[i], col: i, lvl: i + 1, prime: true });
      lines.push([i + 1, i, i, i + 1], [i + 1, i, i + 2, i + 1]);
      rem /= f[i];
    }
    nodes.push({ v: rem, col: k, lvl: k - 1, prime: true });

    const W = (k - minCol) * stepX + nw + pad * 2;
    const H = (k - 1) * rowH + nh + pad * 2;
    let s = `<svg class="tree" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Factor tree for ${n}">`;
    lines.forEach(([pc, pl, cc, cl]) => {
      s += `<line x1="${X(pc)}" y1="${Y(pl) + nh / 2}" x2="${X(cc)}" y2="${Y(cl) - nh / 2}" stroke="#555" stroke-width="3"/>`;
    });
    nodes.forEach(nd => {
      const fill = nd.prime ? gemColor(nd.v) : '#e4e4e4';
      const ink = nd.prime ? '#ffffff' : '#222222';
      s += `<rect x="${X(nd.col) - nw / 2}" y="${Y(nd.lvl) - nh / 2}" width="${nw}" height="${nh}" fill="${fill}" stroke="#373737" stroke-width="3"/>` +
           `<text x="${X(nd.col)}" y="${Y(nd.lvl)}" text-anchor="middle" dominant-baseline="central" font-family="Silkscreen, 'Courier New', monospace" font-size="14" fill="${ink}">${nd.v}</text>`;
    });
    return s + '</svg>';
  }

  return { open, close, isOpen };
})();
