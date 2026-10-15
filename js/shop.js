/* The shop windows and the closet. One panel serves all of them:
     Accessories   pencils and graphing calculators
     Style Shop    shirts, pants, hats, shoes
     Pet Corner    pets
     Closet (C)    everything you own, to switch outfits
   The panel sits on the right so the 3D view stays visible: main.js swings the camera around to
   show the avatar, and every "Try on" is applied to it live before you spend anything.

   What each item is, and what it costs, lives in catalog.js. Ownership and the wallet live in store.js. */
const Shop = (() => {
  const $ = id => document.getElementById(id);

  // a tab shows one slot, or one kind within a slot (Pencils and Calculators both fill the accessory slot)
  const TAB = (label, slot, kind = null) => ({ key: kind ? `${slot}:${kind}` : slot, label, slot, kind });
  const SHOPS = {
    accessories: {
      title: 'Accessories Shop',
      blurb: 'Pencils and graphing calculators. You hold one at a time, so a calculator replaces your pencil.',
      tabs: [TAB('Pencils', 'accessory', 'pencil'), TAB('Calculators', 'accessory', 'calculator')],
    },
    style: {
      title: 'Style Shop',
      blurb: 'Shirts, pants, hats, and shoes. Try anything on before you buy.',
      tabs: [TAB('Shirts', 'shirt'), TAB('Pants', 'pants'), TAB('Hats', 'hat'), TAB('Shoes', 'shoes')],
    },
    pets: {
      title: 'Pet Corner',
      blurb: 'A pet follows you around the village and into the casino.',
      tabs: [TAB('Pets', 'pet')],
    },
  };
  const CLOSET = {
    title: 'Closet',
    blurb: 'Everything you own. Pick what to wear.',
    tabs: Catalog.SLOTS.map(slot => TAB(Catalog.SLOT_LABEL[slot], slot)),
  };

  let def = null;
  let mode = 'shop';          // shop | closet
  let tab = null;             // the open tab (one of def.tabs)
  let previews = {};          // slot -> item id being tried on (not owned, not saved)
  let confirmId = null;       // the item whose Buy button is waiting for a second click
  let wired = false;
  const listeners = [];

  const equippedIds = () => ({ ...Store.get().equipped, ...previews });
  const outfit = () => Catalog.outfitFor(equippedIds());
  const emit = () => { const o = outfit(); listeners.forEach(fn => fn(o)); };
  const isOpen = () => !$('shop').classList.contains('hidden');

  function setMsg(text, kind = '') {
    const m = $('shop-msg');
    m.textContent = text;
    m.className = 'msg ' + kind;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function button(label, cls, onClick, disabled = false) {
    const b = el('button', cls, label);
    b.type = 'button';
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- actions ---------- */
  function equip(item) {
    if (!Store.equip(item.slot, item.id)) return;
    delete previews[item.slot];
    confirmId = null;
    setMsg(item.none ? `${item.name}.` : `${item.name} equipped.`);
    render();
    emit();
  }

  function tryOn(item) {
    confirmId = null;
    if (previews[item.slot] === item.id) delete previews[item.slot];
    else previews[item.slot] = item.id;
    setMsg('');
    render();
    emit();
  }

  function stopTrying() {
    previews = {};
    setMsg('');
    render();
    emit();
  }

  /** Two clicks: the first asks "are you sure", the second spends the chips. */
  function buy(item) {
    if (confirmId !== item.id) { confirmId = item.id; render(); return; }
    confirmId = null;
    if (!Store.spend(item.price)) { setMsg(`You need ${item.price - Store.get().chips} more chips.`, 'bad'); render(); return; }
    Store.own(item.id);
    Store.equip(item.slot, item.id);
    delete previews[item.slot];
    setMsg(`Bought the ${item.name} for ${item.price} chips. It's equipped.`, 'good');
    render();
    emit();
  }

  /* ---------- rendering ---------- */
  function card(item, chips) {
    const owned = Store.owns(item.id);
    const worn = Store.get().equipped[item.slot] === item.id;
    const trying = previews[item.slot] === item.id;
    const li = el('li', 'item' + (worn ? ' equipped' : '') + (trying ? ' trying' : ''));

    const sw = el('span', 'swatch', item.glyph || '');
    sw.style.setProperty('--sw', item.none ? '#8b8b8b' : '#' + item.color.toString(16).padStart(6, '0'));
    sw.setAttribute('aria-hidden', 'true');

    const name = el('span', 'item-name', item.name);
    const note = el('small');
    if (owned) note.textContent = worn ? 'Equipped' : 'Owned';
    else note.textContent = Catalog.canAfford(chips, item) ? `${item.price} chips` : `Need ${item.price - chips} more chips`;
    name.append(note);

    const actions = el('span', 'item-actions');
    if (owned) {
      actions.append(button(worn ? 'Equipped' : 'Equip', 'btn small' + (worn ? '' : ' primary'), () => equip(item), worn));
    } else {
      actions.append(
        button(trying ? 'Stop' : 'Try on', 'btn small', () => tryOn(item)),
        button(confirmId === item.id ? `Confirm ${item.price}` : `Buy ${item.price}`, 'btn small primary', () => buy(item), !Catalog.canAfford(chips, item))
      );
    }
    li.append(sw, name, actions);
    return li;
  }

  function render() {
    if (!def) return;
    const chips = Store.get().chips;
    $('shop-title').textContent = def.title;
    $('shop-blurb').textContent = def.blurb;
    $('shop-wallet').textContent = `${chips} chips`;

    const tabs = $('shop-tabs');
    tabs.innerHTML = '';
    tabs.classList.toggle('hidden', def.tabs.length < 2);
    def.tabs.forEach(t => {
      const b = button(t.label, 'btn small tab' + (t === tab ? ' selected' : ''), () => {
        tab = t; confirmId = null; setMsg(''); render();
      });
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      tabs.appendChild(b);
    });

    const trying = Object.values(previews).map(id => Catalog.find(id).name);
    $('shop-try').classList.toggle('hidden', trying.length === 0);
    $('shop-try-text').textContent = trying.length ? `Trying on: ${trying.join(', ')}` : '';

    const list = $('shop-items');
    list.innerHTML = '';
    Catalog.forSlot(tab.slot, { includeNone: mode === 'closet', kind: tab.kind })
      .filter(it => mode === 'shop' || Store.owns(it.id))
      .forEach(it => list.appendChild(card(it, chips)));
    if (!list.children.length) list.appendChild(el('li', 'item empty', 'Nothing here yet. Buy something in a shop.'));
  }

  /* ---------- opening and closing ---------- */
  function wire() {
    if (wired) return;
    wired = true;
    $('shop-close').addEventListener('click', close);
    $('shop-try-stop').addEventListener('click', stopTrying);
    Store.onChange(() => { if (def && isOpen()) render(); });
  }

  function show(d, m) {
    wire();
    def = d; mode = m; tab = d.tabs[0];
    previews = {}; confirmId = null;
    $('shop').classList.remove('hidden');
    UI.setOpen('shop', true);
    setMsg('');
    render();
    emit();
    $('shop-close').focus();
  }

  const open = id => show(SHOPS[id], 'shop');
  const openCloset = () => show(CLOSET, 'closet');

  function close() {
    if (!isOpen()) return;
    previews = {};
    confirmId = null;
    $('shop').classList.add('hidden');
    UI.setOpen('shop', false);
    emit(); // back to what is actually equipped
  }

  return {
    SHOPS, open, openCloset, close, isOpen, outfit,
    onChange: fn => listeners.push(fn),
  };
})();
