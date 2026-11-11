/* REMY'S EYE: a small quest that starts the tenth time you pet Remy, the village cat.

     the 10th pet   "Remy's eyeball fell out!"  She wears an eye patch from then on, for good: the eye never comes back.
     1. find it     the eyeball bounced onto the Minesweeper field behind Wilson Hall: win a game there to dig it up
     2. wash it     in the fountain in the park
     3. the vet     take it to the Pet Corner; the shopkeeper wants 5 right answers from the House of Algebra's booths first; go back, and: "Remy is ok, she will get used to one eye."
                    (and the eyeball is gone: nothing more is seen of it)
     4. go see her  pet Remy. The quest is done (250 chips), and from then on she is lying on your bed whenever you go into Wilson Hall. Outside she still wanders the village.

   Walking up to any of the places gives a reminder of what to do there (or, if you are early, of what to do first), and petting Remy repeats the current step.

   Two parts. The first is the story as a state machine with every word it says: no DOM, no game, unit tested in Node (tests/remy-quest.test.js). The second, attach(), connects it to the
   world: Remy's eye patch, the save, the tracker on screen, the reminders, the fountain's prompt, the Pet Corner, and the cat on the bed. */
const RemyQuest = (() => {
  const BUILD = 45; // bump together with the ?v= numbers in index.html
  const PETS_TO_START = 10, ANSWERS = 5, REWARD = 250;
  const STEPS = ['none', 'find', 'wash', 'vet', 'answers', 'report', 'visit', 'done'];
  const OK_LINE = 'Remy is ok, she will get used to one eye.';

  /** A saved quest, made safe: { step, answers }. */
  function clean(q) {
    const step = q && STEPS.includes(q.step) ? q.step : 'none', n = q && Number.isInteger(q.answers) ? Math.max(0, Math.min(ANSWERS, q.answers)) : 0;
    return { step, answers: step === 'answers' ? n : step === 'none' || step === 'find' || step === 'wash' || step === 'vet' ? 0 : ANSWERS };
  }
  const at = (q, step) => clean(q).step === step, left = q => ANSWERS - clean(q).answers;
  /** She wears the patch from the moment the eye falls out, for good. */
  const hasPatch = q => clean(q).step !== 'none';
  /** Once the quest is done she is on your bed whenever you are in the dorm. */
  const onBed = q => at(q, 'done');
  const active = q => hasPatch(q) && !onBed(q);

  /* ---------- what happens: each returns { q, event } (event is null when nothing changes) ---------- */
  /** You petted Remy; pets is the count including this one. */
  function pet(q, pets) {
    const c = clean(q);
    if (c.step === 'none') return pets >= PETS_TO_START ? { q: { step: 'find', answers: 0 }, event: 'start' } : { q: c, event: 'purr' };
    if (c.step === 'visit') return { q: { step: 'done', answers: ANSWERS }, event: 'finish' };
    return { q: c, event: c.step === 'done' ? 'purr' : 'hint' };
  }
  /** You won a game of Minesweeper. */
  const minesWon = q => (at(q, 'find') ? { q: { step: 'wash', answers: 0 }, event: 'found' } : { q: clean(q), event: null });
  /** You washed it in the fountain. */
  const washed = q => (at(q, 'wash') ? { q: { step: 'vet', answers: 0 }, event: 'washed' } : { q: clean(q), event: null });
  /** You asked at the Pet Corner. A null event means the quest has nothing to say there, and the shop just opens. */
  function vet(q) {
    const c = clean(q);
    if (c.step === 'vet') return { q: { step: 'answers', answers: 0 }, event: 'asked' };
    if (c.step === 'answers') return { q: c, event: 'waiting' };
    if (c.step === 'report') return { q: { step: 'visit', answers: ANSWERS }, event: 'ok' };
    return { q: c, event: null };
  }
  /** You got an answer right at a booth in the House of Algebra. */
  function answered(q) {
    const c = clean(q); if (c.step !== 'answers') return { q: c, event: null };
    const n = c.answers + 1; return n >= ANSWERS ? { q: { step: 'report', answers: ANSWERS }, event: 'ready' } : { q: { step: 'answers', answers: n }, event: 'counted' };
  }

  /* ---------- what it says ---------- */
  /** The one line on the tracker for the step you are on (null when there is no quest to show). */
  function goal(q) {
    const c = clean(q);
    return { none: null, done: null,
      find: 'Find the eyeball: win a game of Minesweeper, behind Wilson Hall.',
      wash: 'Wash the eyeball in the fountain in the park.',
      vet: 'Take the eyeball to the Pet Corner, on the street of shops.',
      answers: `Get ${left(c)} more right answer${left(c) === 1 ? '' : 's'} at the House of Algebra's booths, then go back to the Pet Corner.`,
      report: 'Go back to the Pet Corner.',
      visit: 'Go and pet Remy.' }[c.step];
  }
  /** What a message box says for an event: { title, text } (or null). */
  function message(event, q) {
    return {
      start: { title: "Remy's eyeball fell out!", text: 'It bounced away toward the Minesweeper field behind Wilson Hall. Win a game there to dig it up.' },
      found: { title: 'You dug up the eyeball!', text: 'It is filthy. Wash it in the fountain in the park.' },
      washed: { title: 'The eyeball is clean.', text: 'Take it to the Pet Corner, on the street of shops. They will know what to do.' },
      asked: { title: 'The Pet Corner', text: `The shopkeeper looks at the eyeball, then at Remy. "Before I try anything, show me you are careful. Get ${ANSWERS} answers right at the booths in the House of Algebra, then come back."` },
      waiting: { title: 'The Pet Corner', text: `"Not yet. ${left(q)} more right answer${left(q) === 1 ? '' : 's'} at the House of Algebra, then come back."` },
      ok: { title: 'The Pet Corner', text: OK_LINE },
      finish: { title: 'Remy purrs.', text: `She is going to be fine. You earned ${REWARD} chips. From now on she will be on your bed whenever you visit Wilson Hall.` },
    }[event] || null;
  }
  /** What a short pop-up says for an event that has no message box. */
  function toast(event, q) {
    return { purr: 'Remy purrs.', hint: `Remy purrs. ${goal(q)}`, counted: `${clean(q).answers} of ${ANSWERS} right answers for the Pet Corner.`, ready: `That is ${ANSWERS} right answers. Go back to the Pet Corner.` }[event] || null;
  }
  /** The reminder you get for walking up to one of the quest's places: 'field', 'fountain', 'petshop' or 'house'. Null when the quest has nothing to say there. */
  function reminder(q, place) {
    const c = clean(q), early = 'You need the eyeball first. It is in the Minesweeper field behind Wilson Hall.', dirty = 'Wash the eyeball first, in the fountain in the park.';
    if (!active(c)) return null;
    return ({
      field: { find: "Remy's eye is somewhere in this field. Win a game of Minesweeper to dig it up." },
      fountain: { find: early, wash: 'This is the fountain. Press E to wash the eyeball.' },
      petshop: { find: early, wash: dirty, vet: 'Press E to ask the Pet Corner about Remy.', answers: `The Pet Corner wants ${left(c)} more right answer${left(c) === 1 ? '' : 's'} from the House of Algebra first.`, report: 'Press E to tell the Pet Corner you are done.' },
      house: { answers: `Get ${left(c)} more right answer${left(c) === 1 ? '' : 's'} at any booth inside, for the Pet Corner.` },
    }[place] || {})[c.step] || null;
  }

  /* ====================================================================== in the game ====================================================================== */
  /** Connect the quest to the world. env: { hub, dorm, dormRoom, getZone }. Returns { pet(), vet(), q() }: pet is Remy's action, vet is asked by the Pet Corner's (true: the quest handled it). */
  function attach({ hub, dorm, dormRoom, getZone }) {
    const q = () => clean(Store.get().remyQuest), spot = label => hub.interactables.find(i => i.label === label || i.baseLabel === label);
    const remy = hub.npcs.find(n => n.name === 'Remy'), petShop = spot('Browse the Pet Corner'); if (petShop) petShop.baseLabel = petShop.label;
    const say = (event, state) => { const m = message(event, state), t = toast(event, state); if (m) UI.dialog({ title: m.title, html: `<p>${m.text}</p>` }); else if (t) UI.toast(t); };
    const apply = r => {
      if (r.event && r.event !== 'purr' && r.event !== 'hint' && r.event !== 'waiting') Store.set({ remyQuest: r.q });
      if (r.event === 'finish') Store.earn(REWARD);
      say(r.event, r.q); refresh(); return r.event;
    };

    /* ----- the fountain's prompt (only while there is an eyeball to wash) and the Pet Corner's label ----- */
    const plaza = hub.park.plaza, wash = { x: plaza.x, z: plaza.z, r: 3.4, label: 'Wash the eyeball', action: () => apply(washed(q())) };
    const tracker = document.getElementById('quest'), bed = Pets.make('cat', 'calico'); let bedKey = '';
    Pets.setEyePatch(bed, true); Pets.lie(bed); bed.visible = false; dorm.group.add(bed);
    function refresh() {
      const c = q(), has = hub.interactables.includes(wash);
      if (c.step === 'wash' && !has) hub.interactables.push(wash); else if (c.step !== 'wash' && has) hub.interactables.splice(hub.interactables.indexOf(wash), 1);
      if (petShop) petShop.label = c.step === 'vet' || c.step === 'answers' || c.step === 'report' ? 'Ask the Pet Corner about Remy' : petShop.baseLabel;
      if (remy) Pets.setEyePatch(remy.avatar, hasPatch(c));
      const g = goal(c); if (tracker) { tracker.classList.toggle('hidden', !g); tracker.innerHTML = g ? `<b>Remy's Eye</b><span>${g}</span>` : ''; }
      bedKey = '';                                                          // the cat on the bed is placed again on the next frame in the dorm
    }

    /* ----- wins: a game of Minesweeper, and right answers at the booths, are noticed from the save (so the games know nothing about the quest) ----- */
    const wins = s => ({ mines: s.minesWins || 0, booths: (s.missingWins || 0) + (s.muldivWins || 0) + (s.numbersWins || 0) }); let seen = wins(Store.get());
    let shown = JSON.stringify(q());
    Store.onChange(s => {
      const key = JSON.stringify(clean(s.remyQuest)); if (key !== shown) { shown = key; refresh(); }      // the save changed under us (a reset, a load): show what it says now
      const now = wins(s), before = seen; seen = now;
      if (now.mines > before.mines && at(s.remyQuest, 'find')) apply(minesWon(q()));
      for (let i = before.booths; i < now.booths && at(Store.get().remyQuest, 'answers'); i++) apply(answered(q()));
    });

    /* ----- reminders: walking up to one of the places says what to do there (once each time you arrive) ----- */
    const places = () => [['field', spot('Play Minesweeper')], ['fountain', { x: plaza.x, z: plaza.z }], ['petshop', petShop], ['house', spot('Enter the House of Algebra')]].filter(p => p[1]);
    let near = null;
    hub.animated.push(() => {
      if (!active(q()) || getZone() !== hub || UI.isOpen()) return;
      const here = places().find(([, p]) => Math.hypot(Player.x - p.x, Player.z - p.z) < 5.5), name = here ? here[0] : null;
      if (name && name !== near) { const text = reminder(q(), name); if (text) UI.toast(text); }
      near = name;
    });

    /* ----- once it is all over: Remy lying on your bed whenever you are in the dorm (on the floor in the middle of the room if you have no bed) ----- */
    dorm.animated.push((dt, t) => {
      bed.visible = onBed(q()); if (!bed.visible) return;
      const items = dormRoom.get(), key = JSON.stringify(items);
      if (key !== bedKey) { bedKey = key; const p = bedSpot(items, dormRoom.origin); bed.position.set(p.x, p.y, p.z); bed.rotation.y = p.yaw; }
      bed.userData.parts.tail.rotation.y = Math.sin(t * 1.4) * 0.25;
    });
    refresh();
    return { q, pet() { const counted = Store.countRemyPet(); return counted ? apply(pet(q(), Store.get().remyPets)) : (UI.toast('Remy purrs.'), 'purr'); }, vet() { const r = vet(q()); return r.event ? (apply(r), true) : false; }, refresh, bed };
  }

  /** Where Remy lies in the room: on the bed (the bottom bunk of a bunk bed), a little toward its foot; with no bed, on the floor in the free cell nearest the middle of the room. */
  function bedSpot(items, origin) {
    const it = items.find(i => i.type === 'bed') || items.find(i => i.type === 'bunk');
    if (it) {
      const f = Dorm.footprint(it.type, it.rot), yaw = -Dorm.mod4(it.rot) * Math.PI / 2, off = 0.3;                         // the model's foot is at +z before it is turned
      return { x: origin.x0 + it.x + f.w / 2 + Math.sin(yaw) * off, y: it.type === 'bed' ? 0.82 : 0.7, z: origin.z0 + it.z + f.d / 2 + Math.cos(yaw) * off, yaw: yaw + Math.PI / 2, on: it.type };   // she lies across the bed
    }
    const taken = new Set(); items.forEach(i => { const f = Dorm.footprint(i.type, i.rot); for (let x = 0; x < f.w; x++) for (let z = 0; z < f.d; z++) taken.add(`${i.x + x},${i.z + z}`); });
    const cells = []; for (let x = 0; x < Dorm.ROOM.w; x++) for (let z = 0; z < Dorm.ROOM.d; z++) if (!taken.has(`${x},${z}`)) cells.push([x, z]);
    const mid = [Dorm.ROOM.w / 2 - 0.5, Dorm.ROOM.d / 2 - 0.5]; cells.sort((a, b) => Math.hypot(a[0] - mid[0], a[1] - mid[1]) - Math.hypot(b[0] - mid[0], b[1] - mid[1]));
    const c = cells[0] || [Math.floor(mid[0]), Math.floor(mid[1])];
    return { x: origin.x0 + c[0] + 0.5, y: 0, z: origin.z0 + c[1] + 0.5, yaw: 0, on: 'floor' };
  }

  return { BUILD, PETS_TO_START, ANSWERS, REWARD, STEPS, OK_LINE, clean, hasPatch, onBed, active, pet, minesWon, washed, vet, answered, goal, message, toast, reminder, bedSpot, attach };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = RemyQuest;
