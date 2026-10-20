/* Overlay bookkeeping + generic dialogs. While any overlay is open the 3D world
   pauses input and the mouse pointer is released. */
const UI = (() => {
  const $ = id => document.getElementById(id);
  const open = new Set();
  let toastTimer = null;

  function setOpen(key, on) {
    if (on) open.add(key); else open.delete(key);
    if (open.size && document.pointerLockElement) document.exitPointerLock();
  }
  const isOpen = () => open.size > 0;
  const has = key => open.has(key);

  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  let trophyTimer = null;
  /** A gold banner, above whatever screen is open, saying a trophy was just earned and where to find it. */
  function trophy(def) {
    const el = $('trophy-banner');
    el.innerHTML = '';
    const a = document.createElement('b'); a.textContent = 'TROPHY EARNED';
    const b = document.createElement('span'); b.textContent = `${def.name}: ${def.goal} ${def.noun}!`;
    const c = document.createElement('small'); c.textContent = 'It is on the shelf in your room in Wilson Hall.';
    el.append(a, b, c);
    el.classList.remove('hidden', 'show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(trophyTimer);
    trophyTimer = setTimeout(() => { el.classList.remove('show'); el.classList.add('hidden'); }, 6500);
  }

  function closeDialog() {
    const root = $('dialog');
    root.classList.add('hidden');
    root.innerHTML = '';
    setOpen('dialog', false);
  }

  function dialog({ title, html, buttons = [{ label: 'Close' }] }) {
    const root = $('dialog');
    root.innerHTML = `
      <div class="mc-panel dialog-panel" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title"></h2>
        <div class="dlg-body">${html}</div>
        <div class="dlg-actions"></div>
      </div>`;
    root.querySelector('#dlg-title').textContent = title;
    const actions = root.querySelector('.dlg-actions');
    buttons.forEach(b => {
      if (b.newRow) { const br = document.createElement('div'); br.className = 'dlg-break'; actions.appendChild(br); }   // start a new row of buttons
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (b.primary ? ' primary' : '');
      btn.textContent = b.label;
      btn.addEventListener('click', () => { closeDialog(); if (b.onClick) b.onClick(); });
      actions.appendChild(btn);
    });
    root.onmousedown = e => { if (e.target === root) closeDialog(); };
    root.classList.remove('hidden');
    setOpen('dialog', true);
    const first = actions.querySelector('button');
    if (first) first.focus();
  }

  function shop(id) {
    const def = CONTENT.shops[id];
    const rows = def.wares.map(w => `
      <li class="ware">
        <span class="ware-icon" aria-hidden="true"></span>
        <span class="ware-name">${w.name}<small>${w.note || ''}</small></span>
        <span class="ware-price">${w.price ? w.price + ' chips' : 'Free'}</span>
        <button type="button" class="btn small" disabled>Soon</button>
      </li>`).join('');
    dialog({ title: def.title, html: `<p>${def.blurb}</p><ul class="wares">${rows}</ul>` });
  }

  return { setOpen, isOpen, has, toast, trophy, dialog, closeDialog, shop };
})();
