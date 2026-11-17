/* THE DAILY QUEST: each day the village has one quest, a topic to practise: "Get 10 Multiply Table answers right", "Win 3 games of Minesweeper". Finish it before midnight and it pays 200 chips,
   once. There is no trophy for it.

     the topic    picked by the calendar, so everybody gets the same one and reloading cannot re-roll it. The 24 games are shuffled into a fixed order, one cycle of 24 days at a time (the shuffle is
                  seeded by the cycle number): each game comes up once a cycle, and the same game never comes two days running.
     the count    10 right answers, except the games where one answer is a whole puzzle: 3 for Minesweeper, the Sandbox and the Polynomial Coaster, and 5 for the Practice table's dice rounds.
     the progress is read from the save: your count of right answers in that game now, less your count when the day began. So no game knows about the quest, and it counts whatever the way you
                  get a right answer (the same way the Remy's Eye quest notices booth answers).
     the screen   a tracker under the chips while you play (not on the title or pause screen, and gone once the quest is done); a quest-style popup whenever you press Q; and a popup when you finish.
                  Nothing pops up by itself when you start: the title screen is left alone.

   Two parts. The first is the maths of it with no DOM and no game: dayKey, topicFor, sync, progress, step and every word it says, unit tested in Node (tests/daily.test.js). The second, attach(),
   connects it to the game: the save, the tracker, the popups, the reward and the midnight check. */
const DailyQuest = (() => {
  const BUILD = 50; // bump together with the ?v= numbers in index.html
  const REWARD = 200;
  const G = typeof Trophies !== 'undefined' ? Trophies : require('./trophies.js');
  const whole = v => Math.max(0, Math.floor(Number(v)) || 0);

  /** Every topic: the game (its trophy id), how many right answers, what you do, and where to go. */
  const t = (id, need, task, where) => ({ id, need, task, where });
  const ACADEMY = 'the Arithmetic Academy, across the road from the shops', FACTORING = 'the Factoring wing of the casino (the archway on the left of the hall)', GRAPHING = 'the Graphing wing of the casino (the archway on the right of the hall)',
    POLYS = 'the Polynomials wing of the casino (the archway straight ahead)', HOUSE = 'the House of Algebra, at the north end of the street of shops', LAB = 'the Science Lab, at the end of the path past the last shop';
  const TOPICS = [
    t('add', 10, n => `Get ${n} Addition problems right`, `${ACADEMY}: the Addition table`),
    t('sub', 10, n => `Get ${n} Subtraction problems right`, `${ACADEMY}: the Subtraction table`),
    t('mul', 10, n => `Get ${n} Multiplication problems right`, `${ACADEMY}: the Multiplication table`),
    t('div', 10, n => `Get ${n} Division problems right`, `${ACADEMY}: the Division table`),
    t('map', 10, n => `Get ${n} states right on the State Map`, `the big map on the wall of ${ACADEMY}`),
    t('clock', 10, n => `Read ${n} clocks correctly`, 'the clock on the wall of the Arithmetic Academy\u2019s classroom, or the one in the Science Lab'),
    t('practice', 5, n => `Solve ${n} Practice Table rounds`, `${FACTORING}: the Practice table`),
    t('radical', 10, n => `Get ${n} Radical Table problems right`, `${FACTORING}: the Radical table`),
    t('trinomial', 10, n => `Get ${n} Trinomial Table problems right`, `${FACTORING}: the Trinomial table`),
    t('cubes', 10, n => `Get ${n} Cubes Table problems right`, `${FACTORING}: the Cubes table`),
    t('lines', 10, n => `Get ${n} Lines Table problems right`, `${GRAPHING}: the Lines table`),
    t('parabola', 10, n => `Get ${n} Parabola Table problems right`, `${GRAPHING}: the Parabola table`),
    t('vertex', 10, n => `Get ${n} Vertex Table problems right`, `${GRAPHING}: the Vertex table`),
    t('polymul', 10, n => `Get ${n} Multiply Table problems right`, `${POLYS}: the Multiply table`),
    t('polyadd', 10, n => `Get ${n} Add/Sub Table problems right`, `${POLYS}: the Add/Sub table`),
    t('coaster', 3, n => `Build ${n} Polynomial Coaster tracks that work`, `${POLYS}: the Polynomial Coaster`),
    t('missing', 10, n => `Get ${n} Missing Number problems right`, `${HOUSE}: the Missing Number booth`),
    t('muldiv', 10, n => `Get ${n} Multiply & Divide problems right`, `${HOUSE}: the Multiply & Divide booth`),
    t('numbers', 10, n => `Get ${n} Numbers Game problems right`, `${HOUSE}: the Numbers Game booth`),
    t('elements', 10, n => `Find ${n} elements correctly in Element Match`, `${LAB}: the periodic table wall`),
    t('cells', 10, n => `Click ${n} cell parts correctly in Cell Lab`, `${LAB}: the microscope`),
    t('atoms', 10, n => `Build ${n} atoms correctly in Atom Builder`, `${LAB}: the atom model`),
    t('blueprint', 3, n => `Solve ${n} blueprints in the Sandbox`, 'the Sandbox, behind the Arithmetic Academy'),
    t('mines', 3, n => `Win ${n} games of Minesweeper`, 'the minefield behind Wilson Hall'),
  ];
  const byId = Object.fromEntries(TOPICS.map(x => [x.id, x]));

  /* ---------- the calendar ---------- */
  const pad2 = n => String(n).padStart(2, '0');
  /** The local calendar day as "2026-11-16" (the quest changes at your own midnight). */
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  /** A day as a whole number, so consecutive days differ by one: days since 1970 for that calendar date. */
  const dayNumber = key => { const [y, m, d] = key.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
  function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  /** One cycle's shuffle of the topics, seeded by the cycle number: the same for everyone, every time. */
  function shuffled(cycle) {
    const rng = mulberry32(Math.imul(cycle + 1, 2654435761) ^ 0x9e3779b9), ids = TOPICS.map(x => x.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return ids;
  }
  /** The order of a cycle's days. If its shuffle would start with the game the last cycle ended on, the first two swap, so the same game never comes on two days running. */
  function orderOf(cycle) {
    const ids = shuffled(cycle);
    if (cycle > 0 && ids[0] === shuffled(cycle - 1)[ids.length - 1]) [ids[0], ids[1]] = [ids[1], ids[0]];
    return ids;
  }
  /** The topic for a day. */
  function topicFor(key) { const n = TOPICS.length, d = dayNumber(key), cycle = Math.floor(d / n); return byId[orderOf(cycle)[d - cycle * n]]; }

  /* ---------- the save ---------- */
  /** What the save holds, made safe. */
  function clean(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return { day: /^\d{4}-\d{2}-\d{2}$/.test(r.day) ? r.day : '', id: byId[r.id] ? r.id : '', need: whole(r.need), base: whole(r.base), done: r.done === true };
  }
  /** A new day's quest: your count in that game right now is where it starts from. */
  function fresh(key, solved) { const topic = topicFor(key); return { day: key, id: topic.id, need: topic.need, base: whole((solved || {})[topic.id]), done: false }; }
  /** Today's quest, from what the save holds: a new day (or a save that never had one, or one for the wrong game) starts a new quest. A count that has gone DOWN (a reset) is taken as the start. */
  function sync(raw, key, solved) {
    const c = clean(raw), topic = topicFor(key);
    if (c.day !== key || c.id !== topic.id) return fresh(key, solved);
    return { day: key, id: topic.id, need: topic.need, base: Math.min(c.base, whole((solved || {})[topic.id])), done: c.done };
  }
  /** How many right answers you have made today in the quest's game, up to the number it asks. */
  const progress = (d, solved) => Math.min(d.need, Math.max(0, whole((solved || {})[d.id]) - d.base));
  /** { topic, task, where, got, need, left, complete (enough answers), done (the reward was paid) } */
  function status(d, solved) {
    const topic = byId[d.id], got = topic ? progress(d, solved) : 0;
    return { topic, task: topic ? topic.task(d.need) : '', where: topic ? topic.where : '', got, need: d.need, left: d.need - got, complete: !!topic && d.need > 0 && got >= d.need, done: d.done };
  }
  /** One step: if the answers are all in and the reward has not been paid, the quest is finished: { d, event: 'complete' }. */
  function step(d, solved) { const s = status(d, solved); return s.complete && !d.done ? { d: { ...d, done: true }, event: 'complete' } : { d, event: null }; }

  /* ---------- the words ---------- */
  /** The tracker's second line (the tracker is gone once the quest is done). */
  const trackerText = s => `${s.task} (${s.got}/${s.need})`;
  /** The quest card inside a popup. kicker is its small heading ("Your quest for today"). */
  function cardHtml(s, kicker) {
    const pct = s.need ? Math.round(100 * s.got / s.need) : 0;
    return `<div class="dq-card${s.done ? ' dq-done' : ''}"><span class="dq-kicker">${kicker}</span><h3 class="dq-task">${s.task}</h3>` +
      `<div class="dq-bar" role="progressbar" aria-label="Quest progress" aria-valuemin="0" aria-valuemax="${s.need}" aria-valuenow="${s.got}"><i style="width:${pct}%"></i></div>` +
      `<p class="dq-count">${s.done ? 'Complete!' : `${s.got} of ${s.need}${s.got === 0 ? '' : s.left === 1 ? ': one to go!' : ''}`}</p>` +
      `<p class="dq-where"><b>Where:</b> ${s.where}.</p><p class="dq-reward"><b>Reward:</b> ${REWARD} chips<small> (once a day, new quest at midnight)</small></p></div>`;
  }
  const finishHtml = s => `<div class="dq-card dq-done"><span class="dq-kicker">Quest complete</span><h3 class="dq-task">${s.task}</h3><p class="dq-count">You earned ${REWARD} chips!</p><p class="dq-reward">A new quest comes tomorrow.</p></div>`;

  /* ====================================================================== joining it to the game ====================================================================== */
  /** Connect the quest to the page: the tracker (#daily), the popups, the reward and the midnight check. Returns { open, check, current, hold, pause, resume, status }.
      The tracker is held back (hidden) while the title or pause screen is up, and for good once the quest is done. While it is paused nothing is paid and no popup opens (the tests pause it, so that a day's reward never lands in the middle of another game's arithmetic). */
  function attach() {
    const el = document.getElementById('daily'), nowDate = () => (typeof Clock !== 'undefined' ? Clock.now() : new Date()), solved = () => Store.get().solved || {};
    let paused = false, held = true;                                         // (the title screen is up when the page loads)
    const current = () => sync(Store.get().daily, dayKey(nowDate()), solved());
    /** Today's quest into the save (a new day starts one), and the tracker. Pays out if the answers are all in. */
    function update() {
      const d = current(), saved = clean(Store.get().daily);
      if (JSON.stringify(d) !== JSON.stringify(saved)) Store.set({ daily: d });
      const r = paused ? { d, event: null } : step(d, solved());
      if (r.event === 'complete') { Store.set({ daily: r.d }); Store.earn(REWARD); UI.dialog({ title: 'Quest complete!', html: finishHtml(status(r.d, solved())), buttons: [{ label: 'Great!', primary: true }] }); }
      draw();
    }
    function draw() {
      if (!el) return; const s = status(current(), solved());
      el.classList.toggle('hidden', held || s.done); el.innerHTML = s.done ? '' : `<b>Daily quest</b><span>${trackerText(s)}</span>`;
    }
    function open() {
      const s = status(current(), solved());
      UI.dialog({ title: 'Daily Quest', html: cardHtml(s, s.done ? 'Today\u2019s quest' : 'Your quest for today'), buttons: [{ label: 'Got it', primary: true }] });
    }
    /** Hold the tracker back (the title screen or the pause screen is up) or let it show (you are playing). */
    function hold(on) { held = on; draw(); }
    /** The midnight check: if the day has turned over while you were playing, today's quest is a new one. */
    function check() {
      const key = dayKey(nowDate()); if (clean(Store.get().daily).day === key) return false;
      update(); if (!paused) UI.toast('A new daily quest is ready! Press Q to see it.'); return true;
    }
    Store.onChange(update);
    setInterval(check, 30000); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    update();
    return { open, check, current, hold, status: () => status(current(), solved()), pause() { paused = true; }, resume() { paused = false; update(); }, get paused() { return paused; } };
  }

  return { BUILD, REWARD, TOPICS, byId, dayKey, dayNumber, orderOf, topicFor, clean, fresh, sync, progress, status, step, trackerText, cardHtml, finishHtml, attach };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = DailyQuest;
