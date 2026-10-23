/* The Little Library's screens: the shelf where you pick a book, and the full-screen reader.

   Walk up to the little library by the park fountain and press E. Pick a book and it fills the screen. The reader turns pages with the
   buttons, the arrow keys, PageUp and PageDown, or a swipe; the slider and the page box jump to any page; Contents jumps to a chapter.
   Your place is saved every time you turn a page (the red ribbon), so the shelf offers to continue where you stopped.

   The pages, and the rules for them, live in library.js and books-data.js. Everything on the page is drawn as plain text, never as HTML. */
const LittleLibrary = (() => {
  const $ = id => document.getElementById(id);
  const BUILD = 26; // must match Library.BUILD
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  let wired = false, book = null, page = 1, fontIdx = Library.DEFAULT_FONT;
  const shelfOpen = () => !$('lib').classList.contains('hidden');
  const readerOpen = () => !$('reader').classList.contains('hidden');
  const isOpen = () => shelfOpen() || readerOpen();

  /* ---------- the shelf ---------- */
  function renderShelf() {
    const box = $('lib-books');
    box.textContent = '';
    const reading = Store.get().reading || {};
    Library.BOOKS.forEach(b => {
      const card = el('div', 'lib-book'); card.dataset.book = b.id;
      const cover = el('div', 'lib-cover'); cover.style.background = b.color;
      cover.append(el('span', 'lib-cover-title', b.short || b.title), el('span', 'lib-cover-author', b.author));
      const info = el('div', 'lib-info');
      info.append(el('h3', '', b.title));
      if (b.subtitle) info.append(el('div', 'lib-sub', b.subtitle));
      info.append(el('div', 'lib-sub', `${b.author}, ${b.year}`));
      const has = Library.started(reading, b.id), at = Library.resumePage(b, reading);
      const meta = el('div', 'lib-meta', has ? `Page ${at} of ${b.pageCount}` : `${b.pageCount} pages`);
      meta.classList.add(has ? 'started' : 'fresh');
      info.append(meta);
      if (has) { const bar = el('div', 'lib-bar'), fill = el('i'); fill.style.width = `${Library.percent(b, at)}%`; bar.append(fill); info.append(bar); }
      const actions = el('div', 'lib-actions');
      const open = el('button', 'lib-btn lib-open', has ? `Continue at page ${at}` : 'Read'); open.type = 'button';
      open.addEventListener('click', () => openBook(b.id));
      actions.append(open);
      if (has && at > 1) {
        const again = el('button', 'lib-btn quiet lib-restart', 'Start over'); again.type = 'button';
        again.addEventListener('click', () => openBook(b.id, { fresh: true }));
        actions.append(again);
      }
      info.append(actions);
      card.append(cover, info);
      box.append(card);
    });
  }

  /* ---------- the page ---------- */
  function drawBlock(type, text) {
    const tag = { h: 'h3', s: 'h4', v: 'pre' }[type] || 'p';
    const node = el(tag, `rb-${type}`);
    if (type === 'i') node.append(el('span', '', 'Picture not shown: '));
    Library.runs(text).forEach(r => node.append(r.em ? el('em', '', r.x) : document.createTextNode(r.x)));
    return node;
  }

  function show(n, save = true) {
    page = Library.clampPage(book, n);
    const art = $('reader-page');
    art.textContent = '';
    book.pages[page - 1].forEach(b => art.append(drawBlock(b[0], b[1])));
    const ch = Library.chapterAt(book, page);
    $('reader-chapter').textContent = ch ? ch.t : '';
    $('reader-ribbon').textContent = '';
    $('reader-ribbon').append(el('span', '', 'page'), el('b', '', String(page)));
    $('reader-slider').value = page;
    const box = $('reader-pageno'); if (document.activeElement !== box) box.value = page;
    $('reader-prev').disabled = page <= 1;
    $('reader-next').disabled = page >= book.pageCount;
    const sel = $('reader-contents'); sel.value = ch ? String(ch.p) + '|' + book.chapters.indexOf(ch) : '';
    $('reader-scroll').scrollTop = 0;
    if (save) Store.set({ reading: { ...(Store.get().reading || {}), [book.id]: page } });
  }

  const goTo = n => { if (readerOpen()) show(n); };
  const next = () => { if (readerOpen() && page < book.pageCount) show(page + 1); };
  const prev = () => { if (readerOpen() && page > 1) show(page - 1); };

  function applyFont() {
    fontIdx = Library.fontIndex(fontIdx);
    const px = Library.FONT_SIZES[fontIdx] + 'px';
    $('reader-page').style.fontSize = px;
    document.querySelector('.reader-ribbon-wrap').style.fontSize = px;     // its width is in em too, so it must match the page's or the ribbon drifts onto the text
    $('reader-smaller').disabled = fontIdx <= 0;
    $('reader-bigger').disabled = fontIdx >= Library.FONT_SIZES.length - 1;
  }
  function resize(step) { fontIdx = Library.fontIndex(fontIdx + step); applyFont(); Store.set({ readerFont: fontIdx }); }

  /** The page box and its Go button: a real page number goes there; anything else says what to type. */
  function jump() {
    const box = $('reader-pageno'), n = Library.parsePage(book, box.value);
    if (n === null) {
      $('reader-msg').textContent = `Type a page number from 1 to ${book.pageCount}.`;
      box.value = page; box.select();
      return;
    }
    $('reader-msg').textContent = '';
    show(n);
    box.value = n;
  }

  /* ---------- wiring ---------- */
  function wire() {
    if (wired) return;
    wired = true;
    $('lib-close').addEventListener('click', close);
    $('reader-back').addEventListener('click', closeReader);
    $('reader-prev').addEventListener('click', prev);
    $('reader-next').addEventListener('click', next);
    $('reader-smaller').addEventListener('click', () => resize(-1));
    $('reader-bigger').addEventListener('click', () => resize(1));
    $('reader-go').addEventListener('click', jump);
    $('reader-pageno').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); jump(); } });
    $('reader-pageno').addEventListener('input', () => { $('reader-msg').textContent = ''; });
    // clicking or tapping into the box selects the number, so typing replaces it (the first mouse-up would otherwise drop the selection)
    let justFocused = false;
    $('reader-pageno').addEventListener('focus', e => { e.target.select(); justFocused = true; });
    $('reader-pageno').addEventListener('mouseup', e => { if (justFocused) { e.preventDefault(); justFocused = false; } });
    $('reader-pageno').addEventListener('blur', () => { justFocused = false; });
    $('reader-slider').addEventListener('input', e => { $('reader-msg').textContent = ''; show(parseInt(e.target.value, 10)); });
    $('reader-contents').addEventListener('change', e => { const p = parseInt(e.target.value, 10); if (p >= 1) show(p); });
    window.addEventListener('keydown', e => {
      if (!readerOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) && e.key !== 'PageDown' && e.key !== 'PageUp') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      else if (e.key === 'Home') { e.preventDefault(); show(1); }
      else if (e.key === 'End') { e.preventDefault(); show(book.pageCount); }
    });
    let sx = null, sy = null;                                   // swipe sideways to turn the page
    const scroller = $('reader-scroll');
    scroller.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    scroller.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = sy = null;
      if (Math.abs(dx) > 70 && Math.abs(dy) < 50) { if (dx < 0) next(); else prev(); }
    }, { passive: true });
  }

  /* ---------- open and close ---------- */
  function open() {
    if (Library.BUILD !== BUILD) {
      UI.dialog({ title: 'Files out of date', html: '<p>Your browser mixed old and new game files. Reload the page with Ctrl+Shift+R (Cmd+Shift+R on Mac) and try again.</p>' });
      return;
    }
    wire();
    renderShelf();
    $('reader').classList.add('hidden'); UI.setOpen('reader', false);
    $('lib').classList.remove('hidden'); UI.setOpen('lib', true);
  }

  /** opts.fresh: start at page 1 instead of your bookmark. */
  function openBook(id, opts = {}) {
    const b = Library.get(id);
    if (!b) return false;
    wire();
    book = b;
    fontIdx = Library.fontIndex(Store.get().readerFont);
    $('reader-title').textContent = b.title;
    const sel = $('reader-contents');
    sel.textContent = '';
    b.chapters.forEach((c, i) => { const o = el('option', '', c.t); o.value = c.p + '|' + i; sel.append(o); });
    const slider = $('reader-slider'); slider.max = b.pageCount;
    $('reader-total').textContent = b.pageCount;
    $('reader-pageno').maxLength = 6;
    $('reader-msg').textContent = '';
    applyFont();
    $('lib').classList.add('hidden'); UI.setOpen('lib', false);
    $('reader').classList.remove('hidden'); UI.setOpen('reader', true);
    show(opts.fresh ? 1 : Library.resumePage(b, Store.get().reading));
    $('reader-scroll').focus({ preventScroll: true });
    return true;
  }

  /** Close the reader and go back to the shelf (your place is already saved). */
  function closeReader() {
    $('reader').classList.add('hidden'); UI.setOpen('reader', false);
    renderShelf();
    $('lib').classList.remove('hidden'); UI.setOpen('lib', true);
  }

  function close() {
    $('reader').classList.add('hidden'); UI.setOpen('reader', false);
    $('lib').classList.add('hidden'); UI.setOpen('lib', false);
  }

  /** Escape: the reader goes back to the shelf, and the shelf closes. */
  function back() { if (readerOpen()) closeReader(); else if (shelfOpen()) close(); }

  return {
    BUILD, isOpen, isReading: readerOpen, open, openBook, close, back, goTo, next, prev,
    bigger: () => resize(1), smaller: () => resize(-1),
    /** For tests and screen readers: where you are. */
    state: () => ({ book: book ? book.id : null, page, font: fontIdx }),
  };
})();
