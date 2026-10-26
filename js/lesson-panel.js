/* The mini lesson window (overlay #lesson). Opened from a table's "How to play" card, or with L when you walk up to a table that has a lesson.

   - Nothing from YouTube loads until the student presses play. The poster is drawn here.
   - The player is YouTube's privacy-enhanced embed (see Lessons.embedUrl). Closing the window removes it, so the sound stops.
   - It listens for the player's own messages. If none arrive within config.waitMs (a school network that blocks YouTube, say) or the player reports an
     error (embedding switched off for that video), the window shows the same ideas as text, plus a link to open the video in a new tab. */
const LessonPanel = (() => {
  const $ = id => document.getElementById(id);
  const config = { waitMs: 9000 };          // tests shorten this
  let wired = false, lesson = null, mode = 'closed', frame = null, timer = null, opener = null;

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  /** The drawn poster: a little graph with a parabola and its axis. `play` adds the big play button. Used for the poster, the menu card and the walk-up card. */
  function art({ play = false } = {}) {
    let s = '<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" class="lesson-art">';
    s += '<rect width="160" height="90" fill="#0f3a0b"/>';
    for (let x = 20; x < 160; x += 20) s += `<line x1="${x}" y1="0" x2="${x}" y2="90" stroke="#1d5a15" stroke-width="1"/>`;
    for (let y = 15; y < 90; y += 15) s += `<line x1="0" y1="${y}" x2="160" y2="${y}" stroke="#1d5a15" stroke-width="1"/>`;
    s += '<line x1="0" y1="72" x2="160" y2="72" stroke="#e6f4de" stroke-width="1.5"/>';
    s += '<line x1="80" y1="0" x2="80" y2="90" stroke="#ffc45c" stroke-width="1.5" stroke-dasharray="4 3"/>';
    s += '<path d="M34 6 Q80 138 126 6" fill="none" stroke="#ffc45c" stroke-width="3" stroke-linecap="round"/>';
    s += '<rect x="76" y="68" width="8" height="8" fill="#ffffff"/>';
    if (play) s += '<circle cx="80" cy="40" r="17" fill="#ffc45c"/><path d="M74 30v20l17-10z" fill="#10260b"/>';
    return s + '</svg>';
  }

  function wire() {
    if (wired) return;
    wired = true;
    $('lesson-close').addEventListener('click', close);
    $('lesson-back').addEventListener('click', close);
  }

  function clearPlayer() {
    clearTimeout(timer); timer = null;
    window.removeEventListener('message', onMessage);
    frame = null;
    $('lesson-stage').textContent = '';          // removes the iframe, which stops the video
  }

  /** The drawn poster with a big play button. Nothing is fetched yet. */
  function showPoster() {
    clearPlayer();
    mode = 'poster';
    const stage = $('lesson-stage');
    const b = el('button', 'lesson-play');
    b.type = 'button';
    b.setAttribute('aria-label', 'Play the lesson');
    b.innerHTML = art({ play: true });
    b.appendChild(el('span', 'lesson-poster-note', 'Press play to load the video from YouTube'));
    b.addEventListener('click', play);
    stage.appendChild(b);
    b.focus();
  }

  function play() {
    if (mode !== 'poster' || !lesson) return;
    const stage = $('lesson-stage');
    clearPlayer();
    mode = 'loading';
    const f = document.createElement('iframe');
    f.className = 'lesson-frame';
    f.setAttribute('title', `${lesson.title} (YouTube video)`);
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen; web-share');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');   // YouTube needs to know which site is embedding
    f.addEventListener('load', () => {            // say hello so the player starts sending messages
      try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (e) { /* the player may be unreachable */ }
    });
    frame = f;
    f.src = Lessons.embedUrl(lesson, { autoplay: true, origin: window.location.origin });
    stage.appendChild(f);
    const wait = el('p', 'lesson-wait', 'Loading the video\u2026');
    wait.id = 'lesson-wait';
    stage.appendChild(wait);
    window.addEventListener('message', onMessage);
    timer = setTimeout(failed, config.waitMs);
  }

  function onMessage(e) {
    if (!frame || e.source !== frame.contentWindow) return;
    let d = null;
    try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { d = null; }
    if (d && d.event === 'onError') { failed(); return; }
    // any other message means the player is alive
    clearTimeout(timer); timer = null;
    if (mode === 'loading') { mode = 'playing'; const w = $('lesson-wait'); if (w) w.remove(); }
  }

  /** The text version, for when the video cannot load. */
  function failed() {
    if (!lesson || (mode !== 'loading' && mode !== 'playing')) return;
    clearPlayer();
    mode = 'fallback';
    $('lesson-yt').classList.add('hidden');            // the fallback has its own, bigger link
    const box = el('div', 'lesson-fallback');
    box.setAttribute('role', 'status');
    const head = el('div', 'lesson-fb-head');
    head.innerHTML = '<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><rect x="3" y="11" width="28" height="22" rx="3" fill="none" stroke="#ffc45c" stroke-width="3"/><path d="M31 19l10-6v18l-10-6z" fill="none" stroke="#ffc45c" stroke-width="3" stroke-linejoin="round"/><path d="M5 5l34 34" stroke="#ffc45c" stroke-width="3" stroke-linecap="round"/></svg>';
    head.appendChild(el('span', 'lesson-fb-title', "The video isn't loading"));
    box.appendChild(head);
    box.appendChild(el('p', 'lesson-fb-text', 'Some school networks block YouTube. You can open the lesson in a new tab, or read the quick version here.'));
    const open = el('a', 'btn primary lesson-fb-open', 'Open on YouTube');
    open.href = Lessons.watchUrl(lesson); open.target = '_blank'; open.rel = 'noopener';
    box.appendChild(open);
    box.appendChild(el('h3', 'lesson-fb-label', 'The quick version'));
    const ul = el('ul', 'lesson-fb-list');
    lesson.summary.forEach(t => ul.appendChild(el('li', '', t)));
    box.appendChild(ul);
    $('lesson-stage').appendChild(box);
  }

  /** `from` is the element that asked for it (so focus can go back there on close: some browsers do not focus a button when it is clicked). */
  function open(key, from) {
    const L = Lessons.get(key);
    if (!Lessons.valid(L)) return false;
    wire();
    lesson = L;
    opener = from || (document.activeElement !== document.body ? document.activeElement : null);
    $('lesson-heading').textContent = L.heading;
    $('lesson-note').textContent = `Starts at ${Lessons.clock(L.start)}. Plays from YouTube.`;
    const yt = $('lesson-yt'); yt.href = Lessons.watchUrl(L); yt.target = '_blank'; yt.rel = 'noopener';
    yt.classList.remove('hidden');
    $('lesson').classList.remove('hidden');
    UI.setOpen('lesson', true);
    showPoster();
    return true;
  }

  function close() {
    if (!isOpen()) return;
    clearPlayer();
    mode = 'closed'; lesson = null;
    $('lesson').classList.add('hidden');
    UI.setOpen('lesson', false);
    if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    opener = null;
  }

  const isOpen = () => !!$('lesson') && !$('lesson').classList.contains('hidden');
  const state = () => mode;

  return { open, close, isOpen, state, art, config };
})();
