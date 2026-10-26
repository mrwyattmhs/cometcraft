/* The Minesweeper window (overlay #mines) and the small panel (#mines-hud) that shows while you play.
   The window has two screens: the level picker, and the result after a game ends. It wears the kelly-green look. Opened with E at the sign, or R near the field. */
const MinesMenu = (() => {
  function create(field) {
    const $ = id => document.getElementById(id);
    const M = Minesweeper;
    let wired = false, opener = null, timer = null, hudKey = '';
    const isOpen = () => !!$('mines') && !$('mines').classList.contains('hidden');
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

    /** A little picture of the grid: the squares, drawn smaller as there are more of them. */
    function sketch(L) {
      const cell = 64 / L.size, gap = Math.min(0.9, cell * 0.14), x0 = (120 - 64) / 2;
      let s = '<svg width="120" height="72" viewBox="0 0 120 72" aria-hidden="true" focusable="false">';
      for (let z = 0; z < L.size; z++) for (let x = 0; x < L.size; x++) {
        const dug = (x * 7 + z * 13 + L.size) % 6 === 0;
        s += `<rect x="${(x0 + x * cell + gap / 2).toFixed(2)}" y="${(4 + z * cell + gap / 2).toFixed(2)}" width="${(cell - gap).toFixed(2)}" height="${(cell - gap).toFixed(2)}" fill="${dug ? '#8a5a38' : '#62b94a'}"/>`;
      }
      return s + '</svg>';
    }

    function wire() {
      if (wired) return;
      wired = true;
      const box = $('mines-levels');
      M.LEVELS.forEach(L => {
        const b = el('button', 'btn bet-card bet'); b.type = 'button'; b.dataset.level = L.level;
        b.innerHTML = `<span class="k-ico">${sketch(L)}</span><span class="bet-amt">${L.name}</span>` +
          `<span class="bet-desc">${L.size} \u00d7 ${L.size} squares, ${L.mines} bombs</span>` +
          `<span class="bet-win"><i class="k-coin" aria-hidden="true"></i><b>${Economy.PAY.mines[L.level - 1]} chips</b><em> for each win</em></span>`;
        b.addEventListener('click', () => { field.start(L.level); close(); UI.toast('Dig the grass: click or X. Flag a bomb: right-click or F.'); });
        box.appendChild(b);
      });
      $('mines-close').addEventListener('click', close);
      $('mines-again').addEventListener('click', () => { field.start(field.level); close(); });
      $('mines-pick').addEventListener('click', () => { show('menu'); const c = $('mines-levels').querySelector('.bet'); if (c) c.focus(); });
      $('mines-look').addEventListener('click', close);
    }

    function show(state) {
      $('mines').dataset.state = state;
      $('mines-menu').classList.toggle('hidden', state !== 'menu');
      $('mines-result').classList.toggle('hidden', state === 'menu');
    }

    function refresh() {
      const s = Store.get();
      $('mines-wallet').textContent = `${s.chips} chips`;
      $('mines-trophy').textContent = `${Trophies.progressText(s.solved || {}, s.trophies || [], 'mines')}. Games won: ${s.minesWins || 0}. Games lost: ${s.minesLosses || 0}.`;
    }

    function open(state = 'menu', info) {
      wire();
      if (!isOpen()) opener = document.activeElement !== document.body ? document.activeElement : null;
      refresh();
      show(state);
      if (state !== 'menu') {
        const won = state === 'won', s = Store.get();
        $('mines-result-title').textContent = won ? 'You cleared the field!' : 'BOOM!';
        $('mines-result-text').textContent = won ? `+${info.pay} chips. Every safe square dug and every bomb flagged.` : 'You dug a bomb. No chips lost: try again.';
        $('mines-result-trophy').textContent = won ? Trophies.progressText(s.solved || {}, s.trophies || [], 'mines') : '';
        $('mines-result').dataset.result = state;
      }
      $('mines').classList.remove('hidden');
      UI.setOpen('mines', true);
      const first = state === 'menu' ? $('mines-levels').querySelector('.bet') : $('mines-again');
      if (first) first.focus();
    }
    function close() {
      if (!isOpen()) return;
      clearTimeout(timer); timer = null;
      $('mines').classList.add('hidden');
      UI.setOpen('mines', false);
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
      opener = null;
    }

    // when a game ends, let the explosion or the cheer be seen for a moment before the window comes up
    field.on(ev => {
      if (ev.type === 'start') { clearTimeout(timer); timer = null; }
      else if (ev.type === 'boom') flash();
      else if (ev.type === 'win') { clearTimeout(timer); timer = setTimeout(() => open('won', ev), 1100); }
      else if (ev.type === 'lose') { clearTimeout(timer); timer = setTimeout(() => open('lost', ev), 2000); }
    });
    function flash() {
      const f = $('boom-flash'); if (!f) return;
      f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    }

    /** The panel at the top of the screen while you are near the field. */
    function updateHud(player, visible) {
      const h = $('mines-hud'); if (!h) return;
      const s = field.status();
      const show = !!(visible && s && field.contains(player.x, player.z, 10));
      h.classList.toggle('hidden', !show);
      if (!show) return;
      const key = JSON.stringify([s.state, s.bombsLeft, s.hint, s.level]);
      if (key === hudKey) return;
      hudKey = key;
      const tip = 'Click or X: dig \u00b7 Right-click or F: flag \u00b7 R: menu';
      if (s.state === 'won') h.innerHTML = `<b>You won! +${s.pay} chips</b> <small>R: play again</small>`;
      else if (s.state === 'lost') h.innerHTML = '<b>BOOM!</b> <small>R: try again</small>';
      else h.innerHTML = `<b>${s.name} \u00b7 ${s.size} \u00d7 ${s.size}</b> <span>Bombs left <strong>${s.bombsLeft}</strong></span> <span>Wins pay ${s.pay} chips</span> <small>${s.hint || tip}</small>`;
    }

    return { open, close, isOpen, updateHud, state: () => ($('mines') ? $('mines').dataset.state : '') };
  }
  return { create };
})();
