/* The two tables of the Polynomials wing, on one screen design (the window is made the first time you sit down, so there is no markup for it in index.html):
     PolyMulGame  the Multiply table      (overlay #pmul)   Easy 10, Medium 25, Hard 50 chips per right answer
     PolyAddGame  the Add/Sub table       (overlay #padd)   Easy (add) 10, Medium (subtract) 25

   The picture is the way students think about the distributive property: an ARCH from a term outside to each term inside the polynomial it multiplies.
     Multiply:  the two polynomials are written out and an arch runs from EACH TERM of the first to EACH TERM of the second, a colour for each term it starts from.
                Step 1  the answer written out, one blank for each arch, as one line:  (2x + 1)(x + 3)  gives  [ ]x\u00b2 + [ ]x + [ ]x + [ ]  (you fill in 2, 6, 1, 3).
                        The blanks follow the arches in order (the first term across the second polynomial, then the next term across it) and each blank is outlined in
                        its arch's colour. Nothing is worked out for you: no captions, no inline arithmetic. Click into a blank and its arch lights up.
                Step 2  combine like terms, again as one line: [ ]x\u00b2 + [ ]x + [ ]  (2, 7, 3), one blank for each power, highest first, zeros included
                A cubed binomial is two rounds of that, as on paper: (x + 2)(x + 2) first, then that answer times (x + 2). After the first round you see the right answer to
                it (whatever you typed) so the second round starts from the correct polynomial.
     Subtract:  the minus sign is "distributed" with arches too: one from the minus sign to each term of the second polynomial.
                Step 1  the second polynomial written out with its signs changed, as one line of blanks;  Step 2  combine like terms
     Add:       Step 1  combine like terms
   Numbers are typed (a minus sign for a negative). One shot per problem: a right answer pays and counts toward the trophy, a wrong one costs nothing, and either way the
   right answers show with the worked steps. */
const ARC_COLORS = ['#ffc45c', '#7fe3ff', '#ff9ad5'];     // the colour of the arches that start at the 1st, 2nd and 3rd term (and of that term's multiplications in Step 1)

function createPolyTable(cfg) {
  const P = cfg.prefix, $ = id => document.getElementById(`${P}-${id}`);
  let problem = null, stages = [], si = 0, level = 1, state = 'idle', wired = false, last = null, stageOk = [], blocks = [], cur = null;
  const isOpen = () => !!document.getElementById(P) && !document.getElementById(P).classList.contains('hidden');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const svgEl = (tag, attrs) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
  const show = which => { $('pick').classList.toggle('hidden', which !== 'pick'); $('play').classList.toggle('hidden', which !== 'play'); document.getElementById(P).dataset.state = which; };
  const MINUS = Polys.MINUS;

  function ensureDom() {
    if (document.getElementById(P)) return;
    const d = document.createElement('div'); d.id = P; d.className = 'overlay hidden kelly'; d.dataset.state = 'idle';
    d.innerHTML =
      `<div class="mc-panel poly-panel" role="dialog" aria-modal="true" aria-labelledby="${P}-title">` +
      `<header class="craft-head"><div class="k-title"><span class="k-wing">Polynomials wing</span><div class="k-titlerow"><span class="k-cube" aria-hidden="true"></span><h2 id="${P}-title"></h2><span class="k-formula" id="${P}-formula"></span></div></div>` +
      `<div class="craft-meta"><span id="${P}-wallet" class="wallet-chip">0 chips</span><button id="${P}-close" class="btn small" type="button">Leave table</button></div></header>` +
      `<div id="${P}-pick"><span class="k-label">Pick a level</span><p class="bet-prompt" id="${P}-intro"></p><div id="${P}-levels" class="bet-grid"></div><div class="cub-ref" id="${P}-ref"></div></div>` +
      `<div id="${P}-play" class="hidden"><p id="${P}-wager" class="wager-line"></p><div class="felt"><div id="${P}-poly" class="poly"></div></div><p id="${P}-hint" class="hint"></p>` +
      `<div id="${P}-steps" class="poly-steps"></div><p id="${P}-msg" class="msg" role="status"></p><div id="${P}-result" class="result hidden"></div>` +
      `<div class="cub-actions"><button id="${P}-check" class="btn primary" type="button">Check my answer</button><button id="${P}-next" class="btn primary hidden" type="button">Next problem</button><button id="${P}-change" class="btn hidden" type="button">Change level</button></div></div></div>`;
    document.body.appendChild(d);
    $('title').textContent = cfg.title; $('formula').textContent = cfg.formula; $('intro').textContent = cfg.intro;
    cfg.reminder.forEach(t => $('ref').appendChild(el('p', '', t))); $('ref').insertBefore(el('span', 'k-label', 'Remember'), $('ref').firstChild);
  }
  function wire() {
    if (wired) return;
    wired = true; ensureDom();
    cfg.levels.forEach(L => {
      const b = el('button', 'btn bet-card bet'); b.type = 'button'; b.dataset.level = L.level;
      b.innerHTML = `<span class="k-ico"><span class="poly-sample">${L.sample}</span></span><span class="bet-amt">${L.name}</span><span class="bet-desc">${L.desc}</span>` +
        `<span class="bet-win"><i class="k-coin" aria-hidden="true"></i><b>${cfg.pay[L.level - 1]} chips</b><em> per answer</em></span>`;
      b.addEventListener('click', () => start(L.level));
      $('levels').appendChild(b);
    });
    $('close').addEventListener('click', close); $('check').addEventListener('click', check); $('next').addEventListener('click', onNext);
    $('change').addEventListener('click', () => { state = 'picking'; show('pick'); const c = $('levels').querySelector('.bet'); if (c) c.focus(); });
    $('wallet').parentNode.insertBefore(Trophies.chip(cfg.trophy), $('wallet'));
    Store.onChange(() => { $('wallet').textContent = `${Store.get().chips} chips`; });
    // Enter moves on once a round or a problem is done (Enter inside a box is handled by the box and goes no further)
    document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.defaultPrevented && isOpen() && (state === 'done' || state === 'between') && !e.repeat && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); onNext(); } });
    window.addEventListener('resize', redraw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  }
  function open() {
    wire();
    $('wallet').textContent = `${Store.get().chips} chips`;
    state = 'picking'; show('pick'); document.getElementById(P).classList.remove('hidden'); UI.setOpen(P, true);
    const c = $('levels').querySelector('.bet'); if (c) c.focus();
  }
  function close() { if (!isOpen()) return; document.getElementById(P).classList.add('hidden'); UI.setOpen(P, false); state = 'idle'; }
  function start(l) { level = cfg.levelOf(l).level; last = null; deal(); }

  /* ---------- a new problem ---------- */
  function deal() {
    problem = cfg.problem(level, Math.random, last); last = problem; stages = cfg.stages(problem); si = 0; stageOk = []; blocks = []; cur = null; state = 'playing';
    $('wager').textContent = `Level: ${cfg.levelOf(level).name}. Pays ${cfg.pay[level - 1]} chips if you get it right.`;
    $('poly').textContent = cfg.text(problem);
    $('hint').textContent = cfg.hint(problem);
    $('steps').textContent = ''; setMsg(''); $('result').classList.add('hidden'); $('result').textContent = '';
    $('check').classList.remove('hidden'); $('next').classList.add('hidden'); $('change').classList.add('hidden');
    show('play'); addStage(0);
  }

  /* ---------- the arches ---------- */
  /** The picture of a distribution: the polynomials written out, with an arch from each term outside to each term inside. */
  function archBlock(st, tag) {
    const box = el('div', 'poly-arch'); box.setAttribute('data-stage', tag); box.setAttribute('role', 'group'); box.setAttribute('aria-label', st.archLabel);
    st.items.forEach(it => {
      if (it.lit !== undefined) { box.appendChild(el('span', 'poly-lit', it.lit)); return; }
      const t = el('span', 'poly-term', it.text); t.dataset.ref = it.ref;
      if (it.color !== null && it.color !== undefined) { t.style.borderBottomColor = ARC_COLORS[it.color % 3]; t.classList.add('from'); }
      box.appendChild(t);
    });
    const svg = svgEl('svg', { class: 'poly-arcs', 'aria-hidden': 'true', focusable: 'false' }); box.appendChild(svg);
    box._st = st; box._svg = svg; box._tag = tag;
    // the arches exist from the start; their shapes are worked out once the picture is on screen
    st.arcs.forEach(a => { svg.appendChild(svgEl('path', { class: 'poly-arc', 'data-from': a.from, 'data-to': a.to, 'data-side': a.side, 'data-color': String(a.color % 3), fill: 'none', stroke: ARC_COLORS[a.color % 3], 'stroke-width': '3', 'stroke-linecap': 'round' })); });
    return box;
  }
  /** Work out where every arch goes, from where its two terms really are on screen. */
  function drawArches(box) {
    const svg = box._svg, st = box._st; if (!svg || !box.isConnected) return;
    const br = box.getBoundingClientRect(), W = Math.max(box.scrollWidth, br.width), H = br.height;
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const center = ref => { const t = box.querySelector(`[data-ref="${ref}"]`); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2 - br.left + box.scrollLeft, top: r.top - br.top, bottom: r.bottom - br.top }; };
    const paths = [...svg.querySelectorAll('path.poly-arc')], count = (key, ref) => st.arcs.filter(a => a[key] === ref).length, rank = (a, key) => st.arcs.filter(b => b[key] === a[key]).indexOf(a);
    svg.querySelectorAll('defs').forEach(d => d.remove());             // one little arrowhead for each colour
    const defs = svgEl('defs');
    ARC_COLORS.forEach((c, k) => { const m = svgEl('marker', { id: `${P}-head-${box._tag}-${k}`, markerWidth: '7', markerHeight: '7', refX: '3.5', refY: '3.5', orient: 'auto', markerUnits: 'userSpaceOnUse' }); m.appendChild(svgEl('path', { d: 'M0,0 L7,3.5 L0,7 z', fill: c })); defs.appendChild(m); });
    svg.insertBefore(defs, svg.firstChild);
    st.arcs.forEach((a, k) => {
      const f = center(a.from), t = center(a.to), path = paths[k]; if (!f || !t || !path) return;
      const above = a.side === 'above', x1 = f.x + (rank(a, 'from') - (count('from', a.from) - 1) / 2) * 7, x2 = t.x + (rank(a, 'to') - (count('to', a.to) - 1) / 2) * 9;
      const y1 = above ? f.top - 3 : f.bottom + 3, y2 = above ? t.top - 5 : t.bottom + 5, h = (Math.min(58, 8 + 2.2 * Math.sqrt(Math.abs(x2 - x1))) + rank(a, 'from') * 3) * (above ? -1 : 1);      // a longer arch goes higher, so the shorter ones nest inside it
      path.setAttribute('d', `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${(y1 + h * 1.35).toFixed(1)}, ${x2.toFixed(1)} ${(y2 + h * 1.35).toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`);
      path.setAttribute('marker-end', `url(#${P}-head-${box._tag}-${a.color % 3})`);
    });
  }
  const redraw = () => blocks.forEach(b => { if (b.arch) drawArches(b.arch); });

  /* ---------- one stage: the arches, Step 1's boxes, Step 2's boxes ---------- */
  /** A box for a whole number (a minus sign allowed). */
  function numBox(label, into) {
    const i = el('input', 'poly-num'); i.type = 'text'; i.inputMode = 'text'; i.autocomplete = 'off'; i.maxLength = 5; i.setAttribute('aria-label', label);
    i.addEventListener('input', () => { const v = i.value.replace(/[\u2212\u2013]/g, '-').replace(/[^0-9-]/g, ''); i.value = (v.startsWith('-') ? '-' : '') + v.replace(/-/g, ''); });
    i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); } });
    into.all.push(i); return i;
  }
  function section(parent, title) { const s = el('section', 'poly-step'); s.appendChild(el('h3', '', title)); parent.appendChild(s); return s; }

  function addStage(k) {
    const st = stages[k], v = problem.v, n = stages.length, wrap = el('div', 'poly-stage'); wrap.dataset.stage = String(k + 1);
    const b = { first: [], second: [], all: [], arch: null, wrap, hover: -1 };
    if (n > 1) wrap.appendChild(el('h3', 'poly-round', st.roundTitle));
    let num = 1;
    if (st.rows.length) {
      const s1 = section(wrap, `Step ${num++}: ${st.firstTitle}`);
      if (st.items) { b.arch = archBlock(st, k + 1); s1.appendChild(b.arch); }
      const line1 = el('div', 'poly-line poly-expand'); s1.appendChild(line1);               // the expanded line: [ ]x\u00b2 + [ ]x + [ ]x + [ ]  (one blank for each arch)
      st.rows.forEach((row, i) => {
        if (i) line1.appendChild(el('span', 'poly-plus', '+'));
        const bx = numBox(row.label, b); bx.dataset.arc = String(i); bx.style.borderColor = ARC_COLORS[row.color % 3]; bx.classList.add('outlined'); b.first.push(bx);
        // the arch of the blank under the pointer lights up (the others fade); with no pointer on a blank, it is the arch of the blank you are typing in
        const show = () => { if (!b.arch) return; const f = b.first.indexOf(document.activeElement), k = b.hover >= 0 ? b.hover : f; b.arch._svg.classList.toggle('focus', k >= 0); b.arch._svg.querySelectorAll('path.poly-arc').forEach((pth, j) => pth.classList.toggle('on', j === k)); };
        bx.addEventListener('focus', show); bx.addEventListener('blur', () => setTimeout(show, 0));
        bx.addEventListener('mouseenter', () => { b.hover = i; show(); }); bx.addEventListener('mouseleave', () => { b.hover = -1; show(); });
        line1.appendChild(bx); line1.appendChild(el('span', 'poly-pow', Polys.power(v, row.d)));
      });
    }
    const s2 = section(wrap, `Step ${num}: Combine like terms.`), line = el('div', 'poly-combine'); s2.appendChild(line);
    st.degrees.forEach((d, i) => {
      if (i) line.appendChild(el('span', 'poly-plus', '+'));
      const bx = numBox(`The number in front of ${d === 0 ? 'the constant term' : Polys.power(v, d)}`, b); b.second.push(bx); line.appendChild(bx); line.appendChild(el('span', 'poly-pow', Polys.power(v, d)));
    });
    $('steps').appendChild(wrap); blocks.push(b); cur = b; si = k;
    requestAnimationFrame(() => requestAnimationFrame(redraw));
    if (b.all[0]) b.all[0].focus();
  }

  /* ---------- reading and checking ---------- */
  const parse = b => { const t = b.value.trim(); return /^-?\d+$/.test(t) ? Number(t) : null; };
  const setMsg = (text, cls) => { const m = $('msg'); m.textContent = text; m.className = `msg${cls ? ' ' + cls : ''}`; };
  function check() {
    if (state !== 'playing') return;
    const first = cur.first.map(parse), second = cur.second.map(parse), missing = cur.all.find(b => parse(b) === null);
    if (missing) { setMsg(`Fill in every box first. Type a minus sign (${MINUS} or -) for a negative number.`, 'bad'); missing.focus(); return; }
    const r = stages[si].check(first, second);
    const mark = (list, marks) => list.forEach((b, i) => { b.style.borderColor = ''; b.classList.add(marks[i] ? 'ok' : 'miss'); b.disabled = true; });      // (the arch-colour outline gives way to green / red)
    mark(cur.first, r.first); mark(cur.second, r.second); stageOk[si] = r.ok;
    if (si < stages.length - 1) {                                        // a round of a cube is done: on to the next one, starting from the right answer
      state = 'between';
      setMsg(r.ok ? 'That round is right! Now multiply that answer by the last factor.' : 'Not quite. The right numbers are marked. The next round starts from the correct answer.', r.ok ? 'good' : 'bad');
      $('check').classList.add('hidden'); $('next').textContent = 'Continue'; $('next').classList.remove('hidden'); $('next').focus({ preventScroll: true });
      return;
    }
    const ok = stageOk.every(Boolean), s = Store.get(); state = 'done';
    if (ok) {
      const win = cfg.pay[level - 1];
      Store.earn(win); Store.set({ [cfg.wins]: s[cfg.wins] + 1 }); Trophies.award(cfg.trophy);
      setMsg(`Correct! +${win} chips.`, 'good');
    } else { Store.set({ [cfg.losses]: s[cfg.losses] + 1 }); setMsg('Not this time. Nothing lost. Here is how it works.', 'bad'); }
    showResult(ok);
    $('check').classList.add('hidden'); $('next').textContent = 'Next problem'; $('next').classList.remove('hidden'); $('change').classList.remove('hidden'); $('next').focus({ preventScroll: true });
  }
  /** The Continue / Next problem button. */
  function onNext() {
    if (state === 'between') { state = 'playing'; setMsg(''); $('next').classList.add('hidden'); $('check').classList.remove('hidden'); addStage(si + 1); }
    else if (state === 'done') deal();
  }
  function showResult(ok) {
    const r = $('result'); r.textContent = '';
    const box = el('div', `final${ok ? '' : ' bad'}`);
    box.appendChild(el('span', 'final-label', ok ? 'Your answer is right' : 'The answer'));
    box.appendChild(el('div', 'final-expr', cfg.answerText(problem)));
    r.appendChild(box);
    const d = el('details', 'worked'); if (!ok) d.open = true;
    d.appendChild(el('summary', '', 'Show the steps'));
    const ol = el('ol', 'work'); cfg.steps(problem).forEach(t => ol.appendChild(el('li', '', t))); d.appendChild(ol);
    r.appendChild(d); r.classList.remove('hidden');
  }

  return {
    open, close, isOpen, state: () => state, get problem() { return problem; }, get level() { return level; }, get boxes() { return cur; },
    get stageIndex() { return si; }, get stageCount() { return stages.length; }, get stages() { return stages; },
  };
}

/* ---------- describing a distribution for the screen ---------- */
/** A polynomial as pieces of a line: a bracket, each term (with its sign) as its own piece that the arches can point at, and a bracket. `ownerColors`: the terms get a colour, because they are where arches start. */
function polyPieces(poly, v, prefix, ownerColors) {
  const out = [{ lit: '(' }];
  Polys.termsOf(poly).forEach((t, k) => {
    const text = k === 0 ? Polys.termText(t.c, t.d, v) : `${t.c < 0 ? Polys.MINUS : '+'} ${Polys.termText(Math.abs(t.c), t.d, v)}`;
    if (k) out.push({ lit: ' ' });
    out.push({ ref: `${prefix}${k}`, text, color: ownerColors ? k : null });
  });
  out.push({ lit: ')' });
  return out;
}

/* ---------- the Multiply table ---------- */
const PolyMulGame = createPolyTable({
  prefix: 'pmul', title: 'Multiply Table', formula: '(a + b)(c + d)', trophy: 'polymul', wins: 'polymulWins', losses: 'polymulLosses',
  levels: Polys.MUL_LEVELS, levelOf: Polys.mulLevelOf, pay: Economy.PAY.polymul,
  intro: 'Multiply the polynomials, then combine like terms. A wrong answer never costs you chips.',
  reminder: ['Distribute: draw an arch from each term of the first polynomial to each term of the second, and do each multiplication. Multiply the numbers, and add the powers: (3x)(2x\u00b2) = 6x\u00b3.', 'Like terms have the same power of the variable: 5x and 3x make 8x. A power that is missing gets a 0.'],
  problem: Polys.mulProblem, text: Polys.mulText,
  hint: p => (p.factors.length > 2 ? 'A cube is two rounds: multiply the first two factors and combine, then multiply that answer by the last factor. Type a minus sign for a negative number.' : 'Each arch is one multiplication. Fill in the blanks in the order of the arches, then combine like terms. Type a minus sign for a negative number.'),
  stages: p => Polys.mulStages(p).map((st, k) => ({
    roundTitle: k === 0 ? `Round 1: multiply the first two factors, ${Polys.paren(st.left, p.v)}${Polys.paren(st.right, p.v)}` : `Round 2: multiply that answer by the last factor, ${Polys.paren(st.left, p.v)}${Polys.paren(st.right, p.v)}`,
    firstTitle: 'Distribute: multiply along every arch and write out the answer.',
    archLabel: `${Polys.fmt(st.left, p.v)} times ${Polys.fmt(st.right, p.v)}: each term of the first is multiplied by each term of the second`,
    items: [...polyPieces(st.left, p.v, 'L', true), ...polyPieces(st.right, p.v, 'R', false)],
    arcs: st.products.map(x => ({ from: `L${x.i}`, to: `R${x.j}`, color: x.i % 3, side: x.i % 2 === 0 ? 'above' : 'below' })),
    rows: st.products.map(x => ({ caption: x.caption, label: `The number for ${x.caption}`, d: x.d, color: x.i % 3 })),
    degrees: st.degrees, result: st.result,
    check: (first, second) => { const r = Polys.checkStage(st, { products: first, combined: second }); return { ok: r.ok, first: r.products, second: r.combined }; },
  })),
  answerText: p => `${Polys.mulText(p)} = ${Polys.fmt(Polys.mulResult(p), p.v)}`, steps: Polys.mulSteps,
});

/* ---------- the Add/Subtract table ---------- */
const PolyAddGame = createPolyTable({
  prefix: 'padd', title: 'Add/Sub Table', formula: 'P \u00b1 Q', trophy: 'polyadd', wins: 'polyaddWins', losses: 'polyaddLosses',
  levels: Polys.ADD_LEVELS, levelOf: Polys.addLevelOf, pay: Economy.PAY.polyadd,
  intro: 'Add or subtract the polynomials by combining like terms. A wrong answer never costs you chips.',
  reminder: ['Like terms have the same power of the variable: 3x\u00b2 and 5x\u00b2 make 8x\u00b2. A power that is missing gets a 0.', `Subtracting is distributing a minus sign: an arch from the ${Polys.MINUS} to every term changes every sign: ${Polys.MINUS}(x\u00b2 ${Polys.MINUS} 5x + 4) = ${Polys.MINUS}x\u00b2 + 5x ${Polys.MINUS} 4.`],
  problem: Polys.addProblem, text: Polys.addText,
  hint: p => (p.op < 0 ? 'Distribute the minus sign (the arches), then combine like terms. Type a minus sign for a negative number.' : 'Combine like terms. Type a minus sign for a negative number.'),
  stages: p => {
    const terms = Polys.termsOf(p.Q), res = Polys.addResult(p), degs = Polys.addDegrees(p), sub = p.op < 0;
    return [{
      firstTitle: 'Distribute the minus sign: write out the second polynomial with every sign changed.',
      archLabel: `the minus sign is distributed to each term of ${Polys.fmt(p.Q, p.v)}`,
      items: sub ? [{ lit: `${Polys.paren(p.P, p.v)} ` }, { ref: 'S', text: Polys.MINUS, color: 0 }, { lit: ' ' }, ...polyPieces(p.Q, p.v, 'R', false)] : null,
      arcs: sub ? terms.map((t, j) => ({ from: 'S', to: `R${j}`, color: 0, side: 'above' })) : [],
      rows: sub ? terms.map(t => ({ caption: `${Polys.MINUS}(${Polys.termText(t.c, t.d, p.v)})`, label: `The new term for ${Polys.MINUS}(${Polys.termText(t.c, t.d, p.v)})`, d: t.d, color: 0 })) : [],
      degrees: degs, result: res,
      check: (first, second) => { const r = Polys.checkAdd(p, { distributed: sub ? first : [], combined: second }); return { ok: r.ok, first: r.distributed, second: r.combined }; },
    }];
  },
  answerText: p => `${Polys.addText(p)} = ${Polys.fmt(Polys.addResult(p), p.v)}`, steps: Polys.addSteps,
});
