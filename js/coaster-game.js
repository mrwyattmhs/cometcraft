/* The Polynomial Coaster table: build a minecart track from a polynomial, then ride it.

   Ported from https://github.com/mrwyattmhs/polynomial-coaster (MIT) with a Minecraft look. The maths, the checking, the hints and the stars are in coaster.js
   (unit tested); this file draws the stage and runs the screens. There is no cart animation: when you press Ride the result is shown at once, with the
   minecart at the end of the true track (powered gold rails) or, if you made a mistake, a TNT block at the spot where the cart comes off.

   Every star pays chips (10 on Factored form, 20 on Factor first), a wrong ride costs nothing, and every ride you clear counts toward the Polynomial Coaster trophy. */
const CoasterGame = (() => {
  const BUILD = 38; // must match Coaster.BUILD
  const C = Coaster;
  const root = () => document.getElementById('cst');
  const app = () => document.getElementById('cst-app');
  const $ = id => document.getElementById(`cst-${id}`);
  const isOpen = () => !root().classList.contains('hidden');
  const star = '\u2605', hollow = '\u2606';
  let wired = false, S = { screen: 'start' };

  const payNote = mode => `${Economy.PAY.coaster[mode]} chips a star`;

  /* ---------- the stage ---------- */
  const cartSVG = (X, Y, a, extra = '') => `<g class="cst-cart" transform="translate(${X.toFixed(1)} ${Y.toFixed(1)}) rotate(${a.toFixed(1)})${extra}">` +
    '<rect class="body" x="-17" y="-21" width="34" height="14"/><rect class="inner" x="-13" y="-18" width="26" height="6"/>' +
    '<rect class="wheel" x="-14" y="-9" width="9" height="9"/><rect class="wheel" x="5" y="-9" width="9" height="9"/>' +
    '<rect class="head" x="-5" y="-33" width="12" height="12"/><rect class="hair" x="-5" y="-33" width="12" height="4"/><rect class="eye" x="-2" y="-27" width="2" height="2"/><rect class="eye" x="3" y="-27" width="2" height="2"/></g>';

  function stageSVG() {
    const p = S.prob, easy = S.mode === 'easy', truth = S.phase === 'revealed';
    let s = `<svg id="cst-stage" viewBox="0 0 ${C.W} ${C.H}" role="group" aria-label="Coordinate plane for the track">`;
    for (let x = -6; x <= 6; x++) s += `<line class="cst-gl" x1="${C.px(x)}" y1="30" x2="${C.px(x)}" y2="${C.H - 30}"/>`;
    [-150, -100, -50, 50, 100, 150].forEach(dy => { s += `<line class="cst-gl" x1="12" y1="${C.CY + dy}" x2="${C.W - 12}" y2="${C.CY + dy}"/>`; });
    s += `<line class="cst-ay" x1="${C.CX}" y1="24" x2="${C.CX}" y2="${C.H - 24}"/><line class="cst-ax" x1="10" y1="${C.CY}" x2="${C.W - 10}" y2="${C.CY}"/>`;
    for (let x = -6; x <= 6; x++) s += `<line class="cst-tick" x1="${C.px(x)}" y1="${C.CY - 5}" x2="${C.px(x)}" y2="${C.CY + 5}"/>`;
    s += `<text class="cst-axl" x="${C.W - 14}" y="${C.CY - 10}">x</text>`;

    // the track: the true graph on powered (gold) rails once the ride is won or the answer is shown, otherwise your own sketch on iron rails
    if (S.phase === 'success' || S.phase === 'revealed') s += `<g><path class="cst-ties" d="${S.track.d}"/><path class="cst-gold" d="${S.track.d}"/><path class="cst-red" d="${S.track.d}"/></g>`;
    else C.buildSketch(S).runs.forEach(r => { s += `<g><path class="cst-ties" d="${r.d}"/><path class="cst-rail" d="${r.d}"/></g>`; });
    // where the cart came off: a TNT block, with the cart tipped over beside it
    if (S.phase === 'fail' && S.crash) {
      const c = S.crash;
      s += cartSVG(c.X - 22, c.Y - 4, c.a + 38, '');
      s += `<g class="cst-tnt" transform="translate(${c.X.toFixed(1)} ${(c.Y - 4).toFixed(1)})"><rect class="body" x="-14" y="-14" width="28" height="28"/><rect class="band" x="-11" y="-5" width="22" height="10"/><text x="0" y="3">TNT</text></g>`;
    }
    // the two ends: block buttons, up and down, on each side
    ['left', 'right'].forEach(side => {
      const cx = side === 'left' ? C.LEFT : C.RIGHT;
      s += `<text class="cst-endlabel" x="${cx}" y="${C.CY - C.HH - 30}">${side} end</text>`;
      ['up', 'down'].forEach(dir => {
        const cy = dir === 'up' ? C.CY - C.HH : C.CY + C.HH, chosen = truth ? p[side] : S.sel[side], on = chosen === dir;
        const flag = S.flag && S.flag.key === 'e-' + side && on;
        const arrow = dir === 'up' ? 'M0 -10 L10 0 L4 0 L4 10 L-4 10 L-4 0 L-10 0 Z' : 'M0 10 L10 0 L4 0 L4 -10 L-4 -10 L-4 0 L-10 0 Z';
        s += `<g class="cst-node${on ? ' on' : ''}${flag ? ' flag' : ''}" data-action="end" data-side="${side}" data-dir="${dir}" data-key="e-${side}-${dir}" tabindex="0" role="button" aria-pressed="${on}" aria-label="${side} end goes ${dir}" transform="translate(${cx} ${cy})">` +
          `<rect class="hit" x="-26" y="-26" width="52" height="52"/><rect class="cst-blk" x="-18" y="-18" width="36" height="36"/><path class="cst-arrow" d="${arrow}"/></g>`;
      });
    });
    // the zeros: a block on the axis at each x you can click
    S.spotXs.forEach(x => {
      const st = truth ? (p.truth[x] || 'unset') : (S.spots[x] || 'unset'), flag = S.flag && S.flag.key === 's-' + x;
      const word = st === 'cross' ? 'pass' : st === 'bounce' ? 'bounce' : '';
      const glyph = st === 'cross' ? '<path class="cst-glyph" d="M-10 9 L10 -9"/>' : st === 'bounce' ? '<path class="cst-glyph" d="M-10 -8 L-10 3 L-5 8 L5 8 L10 3 L10 -8"/>' : (easy ? '<text class="cst-q" y="6">?</text>' : '');
      const r = (st === 'unset' && !easy) ? 8 : 14;
      s += `<g class="cst-spot st-${st}${flag ? ' flag' : ''}" data-action="spot" data-x="${x}" data-key="s-${x}" tabindex="0" role="button" aria-label="x equals ${C.fmt(x)}, ${word || 'not set'}" transform="translate(${C.px(x)} ${C.CY})">` +
        `<rect class="hit" x="-24" y="-24" width="48" height="48"/><rect class="cst-blk" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}"/>${glyph}<text class="cst-tl" y="36">${C.fmt(x)}</text><text class="cst-sw" y="52">${word}</text></g>`;
    });
    // the cart waits at the end of the true track after a clean ride
    if (S.phase === 'success' && S.cart) s += cartSVG(S.cart.X, S.cart.Y, S.cart.a);
    if (S.phase === 'success') {
      const n = S.lastStars;
      s += `<g transform="translate(${C.CX} 74)">`;
      for (let i = 0; i < n; i++) s += `<text class="cst-spark" x="${(i - (n - 1) / 2) * 40}" y="0">${star}</text>`;
      s += '</g>';
    }
    return s + '</svg>';
  }

  /** Keep a line of maths on ONE line: it starts at its normal size and shrinks only as far as it must to fit the width (never below min). Returns the size used. */
  function fitLine(el, base, min) {
    let size = base; el.style.fontSize = size + 'px';
    while (el.scrollWidth > el.clientWidth + 0.5 && size > min) { size -= 1; el.style.fontSize = size + 'px'; }
    return size;
  }
  function fitAll() {
    const a = app(), e = a.querySelector('.cst-eq'), m = a.querySelector('.cst-fb .math');
    if (e) fitLine(e, 34, 15);
    if (m) fitLine(m, 26, 13);
  }

  /* ---------- the screens ---------- */
  function dotsHTML() {
    let h = '';
    for (let i = 0; i < C.RIDES; i++) { const r = S.results[i]; h += `<span class="cst-dot${r ? ' s' + r.stars : ''}${i === S.ride && !(S.results.length > i) ? ' now' : ''}"></span>`; }
    return h;
  }
  function startHTML() {
    let h = '<p class="cst-intro">Build the track from the equation, then ride it. Get the ends and the zeros right and the minecart makes the whole ride. Every star pays chips, and a wrong ride never costs you.</p><div class="bet-grid">';
    C.MODES.forEach(m => { h += `<button class="btn bet-card bet" type="button" data-action="mode" data-mode="${m.id}" data-key="m-${m.id}"><span class="bet-amt">${m.tag}: ${m.name}</span><span class="bet-desc">${m.blurb}</span><span class="bet-win">Pays ${payNote(m.id)}</span></button>`; });
    h += '<button class="btn bet-card bet" type="button" disabled aria-disabled="true"><span class="bet-amt">Expert: Synthetic division</span><span class="bet-desc">Coming soon.</span><span class="bet-win">Locked</span></button></div>';
    return h + '<div class="cst-how"><h3>How a ride works</h3><ol><li>Click an end point on each side. The track starts to draw as you click.</li><li>Click each zero to choose pass through or bounce.</li><li>Press Ride. The minecart comes off at the first mistake, and a TNT block marks the spot.</li></ol></div>';
  }
  function gameHTML() {
    const p = S.prob, easy = S.mode === 'easy', last = S.ride + 1 >= C.RIDES;
    let h = `<div class="cst-top"><button class="btn small" type="button" data-action="menu" data-key="menu">Modes</button><span class="cst-modename">${easy ? 'Factored form' : 'Factor first'}</span>` +
      `<span class="cst-dots" role="img" aria-label="Ride ${S.ride + 1} of ${C.RIDES}">${dotsHTML()}</span><span class="cst-score">${S.total} ${star}</span></div>`;
    // the stage and, under it, how the ride went; on the right, the equation, what to do next, the hints and the buttons
    let fb = '';
    const moreHints = S.hints < S.hintList.length, hintLabel = S.hints ? 'Another hint' : 'Hint';
    if (S.phase === 'fail') {
      fb = `<div class="cst-fb bad" id="cst-fb" tabindex="-1" role="status"><h3>The minecart derailed</h3><p>${S.msg}</p><div class="cst-row"><button class="btn primary" type="button" data-action="retry" data-key="retry">Fix my track</button>` +
        `<button class="btn" type="button" data-action="hint" data-key="hint"${moreHints ? '' : ' disabled'}>${hintLabel}</button><button class="btn" type="button" data-action="reveal" data-key="reveal">Show me the answer</button></div></div>`;
    }
    if (S.phase === 'success') {
      const st = S.lastStars, stars = star.repeat(st) + hollow.repeat(3 - st), head = st === 3 ? 'Smooth ride!' : st === 2 ? 'Made it!' : 'Made it. Keep going.';
      fb = `<div class="cst-fb good" id="cst-fb" tabindex="-1" role="status"><h3>${head} <span aria-label="${st} of 3 stars">${stars}</span> +${S.lastChips} chips</h3><div class="why">${C.explainHTML(S)}</div>` +
        `<div class="cst-row"><button class="btn primary" type="button" data-action="next" data-key="next">${last ? 'See results' : 'Next ride'}</button></div></div>`;
    }
    if (S.phase === 'revealed') {
      fb = `<div class="cst-fb info" id="cst-fb" tabindex="-1" role="status"><h3>Here is the full track</h3><div class="why">${C.explainHTML(S)}</div><div class="cst-row"><button class="btn primary" type="button" data-action="next" data-key="next">${last ? 'See results' : 'Next ride'}</button></div></div>`;
    }
    h += `<div class="cst-eq" id="cst-eq">${C.fOf}${easy ? C.factoredHTML(p) : C.polyHTML(p.coeffs)}</div>`;         // a row of its own, the full width of the window, so a long one has room
    h += `<div class="cst-main"><div class="cst-left"><div class="cst-stage">${stageSVG()}</div></div><div class="cst-right">`;
    if (S.phase === 'edit') {                                  // while you build: what to do, what is missing, any hints, and the buttons
      h += `<p class="cst-sub">${easy ? 'Read the factors to build the track.' : 'Factor it to find the real zeros, then build the track.'}</p>`;
      h += `<p class="cst-status" aria-live="polite">${C.statusText(S)}</p>`;
    }
    if ((S.phase === 'edit' || S.phase === 'fail') && S.hints > 0) h += '<ul class="cst-hints">' + S.hintList.slice(0, S.hints).map(t => `<li class="cst-hint">${t}</li>`).join('') + '</ul>';
    if (S.phase === 'edit') h += `<div class="cst-row"><button class="btn primary" type="button" data-action="ride" data-key="ride"${C.canRide(S) ? '' : ' disabled'}>Ride</button><button class="btn" type="button" data-action="hint" data-key="hint"${moreHints ? '' : ' disabled'}>${hintLabel}</button></div>`;
    return h + fb + '</div></div>';
  }
  function endHTML() {
    const e = S.errors, tot = e.ends + e.behavior + e.zeros;
    let h = `<div class="cst-big">Run complete: ${S.total} of ${C.RIDES * 3} ${star} and ${S.chipsEarned} chips</div><div class="cst-results">` +
      S.results.map((r, i) => `<div class="cst-res"><small>Ride ${i + 1}</small>${r.stars ? star.repeat(r.stars) + hollow.repeat(3 - r.stars) : 'Answer shown'}</div>`).join('') + '</div>';
    h += tot > 0 ? `<p class="cst-intro">Where the minecart came off: ends ${e.ends}, pass vs. bounce ${e.behavior}, missed or extra zeros ${e.zeros}.</p>` : '<p class="cst-intro">No derailments. A clean run.</p>';
    return h + '<div class="cst-row"><button class="btn primary" type="button" data-action="again" data-key="again">Ride again</button><button class="btn" type="button" data-action="menu" data-key="menu">Pick another mode</button></div>';
  }
  function render() {
    const a = app(), ae = document.activeElement, fk = ae && ae.dataset ? ae.dataset.key : null;
    root().dataset.state = S.screen;
    a.innerHTML = S.screen === 'start' ? startHTML() : S.screen === 'end' ? endHTML() : gameHTML();
    fitAll();
    if (S.fbFresh) {
      const fb = a.querySelector('#cst-fb');
      if (fb) { fb.focus(); if (fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest' }); }
      S.fbFresh = false; return;
    }
    if (fk) { const el = a.querySelector(`[data-key="${fk}"]`); if (el && el.focus) el.focus({ preventScroll: true }); }
  }

  /* ---------- running a ride ---------- */
  function startRun(mode) { S = Object.assign(C.newRun(mode), { screen: 'game', chipsEarned: 0, cart: null, lastStars: 0, lastChips: 0, fbFresh: false }); nextRide(); }
  function nextRide() { C.deal(S); S.cart = null; render(); }

  /** Press Ride: the result is shown at once. A clean ride pays, counts for the trophy and shows the true track with the minecart at the end; a mistake puts TNT where the cart comes off. */
  function ride() {
    if (S.phase !== 'edit' || !C.canRide(S)) return;
    const r = C.derail(S); if (!r) return;
    const st = Store.get();
    if (r.ok) {
      const stars = C.starsFor(S.wrong, S.hints), chips = C.payFor(S.mode, stars);
      S.lastStars = stars; S.lastChips = chips; S.total += stars; S.chipsEarned += chips; S.results.push({ stars });
      const end = S.track.poseAt(S.track.total - 34); S.cart = { X: end.X, Y: end.Y, a: end.a };         // waiting at the end, a little way in so the end block does not cover it
      S.phase = 'success'; S.fbFresh = true;
      Store.earn(chips); Store.set({ coasterWins: (st.coasterWins || 0) + 1 }); Trophies.award('coaster');
    } else {
      S.wrong++; S.phase = 'fail'; S.crash = { X: r.mark.X, Y: r.mark.Y, a: r.mark.a };
      S.flag = { key: r.fail.k === 'zero' ? 's-' + r.fail.x : 'e-' + r.fail.k }; S.errors[r.kind]++; S.msg = r.message; S.fbFresh = true;
      Store.set({ coasterDerails: (st.coasterDerails || 0) + 1 });
    }
    render();
  }

  function act(t) {
    const a = t.dataset.action;
    if (a === 'mode') return startRun(t.dataset.mode);
    if (a === 'menu') { S = { screen: 'start' }; return render(); }
    if (a === 'again') return startRun(S.mode);
    if (S.screen !== 'game') return;
    if (a === 'end' && S.phase === 'edit') { S.sel[t.dataset.side] = t.dataset.dir; if (S.flag && S.flag.key === 'e-' + t.dataset.side) S.flag = null; return render(); }
    if (a === 'spot' && S.phase === 'edit') {
      const x = +t.dataset.x, nx = C.nextSpot(S.mode, S.spots[x]);
      if (nx) S.spots[x] = nx; else delete S.spots[x];
      if (S.flag && S.flag.key === 's-' + x) S.flag = null;
      return render();
    }
    if (a === 'hint') { S.hints = Math.min(S.hintList.length, S.hints + 1); return render(); }
    if (a === 'ride') return ride();
    if (a === 'retry') { S.phase = 'edit'; S.crash = null; return render(); }
    if (a === 'reveal') { S.results.push({ stars: 0 }); S.phase = 'revealed'; S.cart = null; S.flag = null; S.crash = null; S.fbFresh = true; return render(); }
    if (a === 'next') { if (S.ride + 1 >= C.RIDES) { S.screen = 'end'; return render(); } S.ride++; return nextRide(); }
  }

  /* ---------- opening and closing ---------- */
  function wire() {
    if (wired) return;
    wired = true;
    $('wallet').parentNode.insertBefore(Trophies.chip('coaster'), $('wallet'));
    Store.onChange(() => { $('wallet').textContent = `${Store.get().chips} chips`; });
    $('close').addEventListener('click', close);
    window.addEventListener('resize', () => { if (isOpen()) fitAll(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (isOpen()) fitAll(); });
    const a = app();
    a.addEventListener('click', e => { const t = e.target.closest('[data-action]'); if (t && !t.disabled) act(t); });
    a.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g[data-action]')) { e.preventDefault(); act(e.target); } });
  }
  function open() {
    if (C.BUILD !== BUILD) {
      UI.dialog({ title: 'Files out of date', html: '<p>Your browser mixed old and new game files. Reload the page with Ctrl+Shift+R (Cmd+Shift+R on Mac) and try again.</p>' });
      return;
    }
    wire();
    $('wallet').textContent = `${Store.get().chips} chips`;
    $('pay').textContent = `${Economy.PAY.coaster.easy} to ${Economy.PAY.coaster.factor} chips a star`;
    S = { screen: 'start' };
    root().classList.remove('hidden');
    UI.setOpen('cst', true);
    render();
    root().scrollTop = 0;
    $('close').focus();
  }
  function close() { root().classList.add('hidden'); UI.setOpen('cst', false); }

  return { BUILD, open, close, isOpen, fitLine, status: () => JSON.parse(JSON.stringify(Object.assign({}, S, { track: undefined }))) };
})();
