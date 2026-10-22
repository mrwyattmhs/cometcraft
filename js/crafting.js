/* Mini-game: throw d20s, then craft their sum out of prime gems. The live product is shown, retries are free, and a solved round
   pays by the number of dice you threw (2 dice 10 chips, 3 dice 25, 4 dice 50). */
const CraftingGame = (() => {
  const $ = id => document.getElementById(id);
  const GRID = 9;
  const PRIMES = Factoring.primesUpTo(100);
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let diceCount = 3;
  let state = 'idle'; // idle | rolling | playing | done
  let round = null;
  let slots = Array(GRID).fill(null);
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
    $('craft-wallet').parentNode.insertBefore(Trophies.chip('practice'), $('craft-wallet'));
    Store.onChange(() => { $('craft-wallet').textContent = `${Store.get().chips} chips`; if (round) render(); });
  }

  /* ---------- open / close ---------- */
  function open() {
    wire();
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
    setMsg('Break the number into primes. Click a gem, or drag it into the grid.');
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

    if (!ok) {
      setMsg(`Not yet. Your primes multiply to ${prod}, and the target is ${round.sum}.`, 'bad');
      shake();
      return;
    }
    const reward = Factoring.practiceReward(diceCount);
    Store.earn(reward);
    Store.set({ practiceWins: s.practiceWins + 1 });
    Trophies.award('practice');
    finish(`Crafted! +${reward} chips. Solved in ${round.placements} placement${round.placements === 1 ? '' : 's'}.`, 'good');
  }

  function finish(msg, kind) {
    state = 'done';
    setMsg(msg, kind);
    const f = round.factors;
    $('result').innerHTML = `<div class="factor-line">${round.sum} = ${Factoring.toExponentForm(f)}${f.length === 1 ? ' (prime)' : ''}</div>`;   // the finished tree is already beside the game
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
    $('craft-pay').textContent = `Pays ${Factoring.practiceReward(diceCount)} chips`;

    document.querySelectorAll('#grid .slot').forEach((el, i) => {
      el.innerHTML = slots[i] === null ? '' : gemHTML(slots[i]);
      el.setAttribute('aria-label', slots[i] === null ? `Slot ${i + 1}, empty` : `Slot ${i + 1}, prime ${slots[i]}. Click to remove.`);
    });

    const placed = slots.filter(Boolean);
    const prod = placed.length ? Factoring.product(placed) : null;
    const out = $('output');
    let shown, match;
    shown = prod === null ? '' : prod;
    match = round && prod === round.sum;
    $('output-val').textContent = shown;
    out.classList.toggle('match', !!match);

    $('btn-craft').disabled = state !== 'playing' || !placed.length;
    $('btn-clear').disabled = state !== 'playing' || !placed.length;
    renderTree(placed);
  }

  /* ---------- the factor tree, growing beside the game ---------- */
  // Every prime you place splits a leaf off the number that is left (the logic is Factoring.treeSteps). The drawing area is always big
  // enough for the longest tree any throw can need, so it never changes size or jumps: the tree just fills in from the top left.
  const TREE = { stepX: 48, rowH: 44, nw: 42, nh: 28, pad: 6 };
  const TREE_W = Factoring.MAX_TREE_FACTORS * TREE.stepX + TREE.nw + 2 * TREE.pad;
  const TREE_H = (Factoring.MAX_TREE_FACTORS - 1) * TREE.rowH + TREE.nh + 2 * TREE.pad;

  function treeSVG(sum, placed) {
    const t = Factoring.treeSteps(sum, placed);
    const { stepX, rowH, nw, nh, pad } = TREE;
    const X = col => pad + nw / 2 + col * stepX, Y = lvl => pad + nh / 2 + lvl * rowH;
    const label = sum ? `Factor tree for ${sum}. ${t.done ? 'It is all factored.' : `${t.left} is left to factor.`}` : 'Factor tree. Waiting for the dice.';
    let out = `<svg class="tree" viewBox="0 0 ${TREE_W} ${TREE_H}" role="img" aria-label="${label}">`;
    t.lines.forEach(([pc, pl, cc, cl]) => {
      out += `<line x1="${X(pc)}" y1="${Y(pl) + nh / 2}" x2="${X(cc)}" y2="${Y(cl) - nh / 2}" stroke="#555" stroke-width="3"/>`;
    });
    t.nodes.forEach(nd => {
      const prime = nd.kind === 'prime', pending = nd.kind === 'pending';
      const fill = prime ? gemColor(nd.v) : pending ? '#f7f7f7' : '#e4e4e4';
      const ink = prime ? '#ffffff' : pending ? '#555555' : '#222222';
      out += `<rect class="node ${nd.kind}" x="${X(nd.col) - nw / 2}" y="${Y(nd.lvl) - nh / 2}" width="${nw}" height="${nh}" fill="${fill}" stroke="${pending ? '#666' : '#373737'}" stroke-width="3"${pending ? ' stroke-dasharray="6 3"' : ''}/>` +
             `<text x="${X(nd.col)}" y="${Y(nd.lvl)}" text-anchor="middle" dominant-baseline="central" font-family="Silkscreen, 'Courier New', monospace" font-size="14" fill="${ink}">${nd.v}</text>`;
    });
    return out + '</svg>';
  }

  function renderTree(placed) {
    const sum = round && state !== 'rolling' ? round.sum : null;
    const t = Factoring.treeSteps(sum, placed);
    $('tree-live').innerHTML = treeSVG(sum, placed);
    $('tree-note').textContent = sum === null ? 'Throw the dice to start the tree.'
      : t.done ? 'All factored!'
      : placed.length ? `Left to factor: ${t.left}` : `Place a prime and watch ${sum} split.`;
    const m = $('tree-misfits');
    m.classList.toggle('hidden', !t.misfits.length);
    m.innerHTML = t.misfits.length ? 'Does not fit: ' + t.misfits.map(p => `<span class="tree-chip">${p}</span>`).join('') : '';
  }

  return { open, close, isOpen };
})();
