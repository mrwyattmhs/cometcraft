/* Wires everything together: renderer, input, zone switching, interaction prompts. */
(async function main() {
  const $ = id => document.getElementById(id);
  const startScreen = $('start-screen');
  const startMsg = $('start-msg');

  if (typeof THREE === 'undefined') {
    startMsg.textContent = 'Three.js could not load from the CDN. Check your connection and reload.';
    $('play').classList.add('hidden');
    return;
  }

  // let the pixel font load so canvas signs use it
  try {
    await Promise.race([Promise.all([document.fonts.load('20px Silkscreen'), document.fonts.load('40px "Great Vibes"')]), new Promise(r => setTimeout(r, 1500))]);
  } catch (e) { /* fall back to monospace */ }

  const canvas = $('view');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    startMsg.textContent = 'This browser could not start WebGL, which the 3D world needs.';
    $('play').classList.add('hidden');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 220);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  /* ---------- zones ---------- */
  const actions = {
    enterCasino: () => setZone(casino, casino.spawn),
    leaveCasino: () => setZone(hub, { x: 0, z: -15.5, yaw: Math.PI }),
    enterSchool: () => setZone(school, school.spawn),
    leaveSchool: () => setZone(hub, World.SCHOOL_EXIT),
    enterDorm: () => setZone(dorm, dorm.spawn),
    leaveDorm: () => setZone(hub, World.DORM_EXIT),
    openPlanner: () => DormPlanner.open(dorm.dormRoom),
    openShop: id => (id === 'hints' ? UI.shop(id) : Shop.open(id)),
    petRemy: () => { UI.toast('Remy purrs.'); Store.countRemyPet(); },   // the count is saved but never shown
    readBoard: () => UI.dialog({ title: CONTENT.board.title, html: CONTENT.board.html }),
    openArithmetic: op => ArithmeticGame.open(op),
    openMap: () => MapGame.open(),
    openMines: () => minesMenu.open(),
    openLibrary: () => LittleLibrary.open(),
    openTable: m => {
      if (m === 'trinomial') TrinomialGame.open();
      else if (m === 'cubes') CubesGame.open();
      else if (m === 'polymul') PolyMulGame.open();
      else if (m === 'polyadd') PolyAddGame.open();
      else if (m === 'radical') RadicalGame.open();
      else if (m === 'lines') LinesGame.open();
      else if (m === 'coaster') CoasterGame.open();
      else if (m === 'parabola') ParabolaGame.open();
      else if (m === 'vertex') VertexGame.open();
      else CraftingGame.open(m);
    },
  };
  const hub = World.buildHub(actions);
  const casino = World.buildCasino(actions);
  const school = World.buildSchool(actions);
  const dorm = World.buildDorm(actions);
  scene.add(hub.group, casino.group, school.group, dorm.group);

  let zone = hub;
  function setZone(next, spawn) {
    zone.group.visible = false;
    zone = next;
    zone.group.visible = true;
    scene.background = new THREE.Color(zone.fog[0]);
    scene.fog = new THREE.Fog(zone.fog[0], zone.fog[1], zone.fog[2]);
    Player.teleport(spawn.x, spawn.z, spawn.yaw);
    follower.teleport(Player.x + Math.sin(Player.yaw) * 1.2, Player.z + Math.cos(Player.yaw) * 1.2);
    UI.toast(zone.name);
  }
  casino.group.visible = false;
  school.group.visible = false;
  dorm.group.visible = false;
  scene.background = new THREE.Color(hub.fog[0]);
  scene.fog = new THREE.Fog(hub.fog[0], hub.fog[1], hub.fog[2]);
  Player.teleport(hub.spawn.x, hub.spawn.z, hub.spawn.yaw);

  /* ---------- the player: avatar (third person) + pencil view model (first person) ---------- */
  const me = Avatar.make(Avatar.defaultLook);
  me.visible = false;
  scene.add(me);

  const viewPencil = Avatar.makePencil(0.55);
  viewPencil.rotation.order = 'YXZ';
  viewPencil.rotation.set(-0.45, Math.PI + 0.25, 0);
  viewPencil.position.set(0.32, -0.28, -0.55);
  camera.add(viewPencil);

  // a graphing calculator takes the pencil's place in the lower-right of the view (one accessory at a time)
  const viewCalc = new THREE.Group();
  viewCalc.rotation.order = 'YXZ';
  viewCalc.rotation.set(-0.3, -0.35, 0.08);
  viewCalc.position.set(0.36, -0.32, -0.62);
  camera.add(viewCalc);
  let hasCalc = false;

  /* ---------- what the student is wearing, and the pet trailing them ---------- */
  const follower = Pets.createFollower(scene);
  const behind = () => ({ x: Player.x + Math.sin(Player.yaw) * 1.2, z: Player.z + Math.cos(Player.yaw) * 1.2 });

  function applyOutfit(o) {
    Avatar.dress(me, o);
    const calc = o.accessory.kind === 'calculator';
    if (!calc) Avatar.setPencilColor(viewPencil, o.accessory.color);
    viewCalc.clear();
    hasCalc = calc;
    if (calc) viewCalc.add(Avatar.makeCalculator(o.accessory.color, 1.25));
    const at = behind();
    follower.set(o.pet, at.x, at.z);
  }
  Shop.onChange(applyOutfit);   // fires for try-ons, purchases, and equips
  applyOutfit(Shop.outfit());   // whatever was saved last time

  /* ---------- HUD ---------- */
  Store.onChange(s => { $('chips').textContent = s.chips; });
  const promptEl = $('prompt');

  /** The prompt for the nearest thing you can use. A table with a mini lesson gets a second card under it: "Learn to play", with L. */
  function showPrompt(it) {
    if (!it) { promptEl.classList.add('hidden'); promptEl.classList.remove('has-lesson'); return; }
    const L = it.lesson && Lessons.get(it.lesson);
    if (L) {
      promptEl.classList.add('has-lesson');
      promptEl.innerHTML = `<div class="prompt-main"><span class="key">E</span>${it.label}</div>` +
        `<button type="button" class="prompt-lesson" tabindex="-1" data-lesson="${it.lesson}">` +
        `<span class="pl-thumb">${LessonPanel.art({ play: true })}<span class="pl-time">${Lessons.clock(L.start)}</span></span>` +
        `<span class="pl-text"><b>Learn to play</b><span>${L.title}</span></span><span class="key">L</span></button>`;
    } else {
      promptEl.classList.remove('has-lesson');
      promptEl.innerHTML = `<span class="key">E</span>${it.label}`;
    }
    promptEl.classList.remove('hidden');
  }
  promptEl.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.prompt-lesson'); if (b) LessonPanel.open(b.dataset.lesson); });
  let focused = null;

  /* ---------- the sandbox: you can only build while you are standing in it ---------- */
  const sandbox = hub.sandbox;
  const inSandbox = () => zone === hub && sandbox.contains(Player.x, Player.z);

  /** Place or break a block where you are aiming. announce: say why it did nothing, instead of staying quiet. */
  function sandboxAct(kind, announce) {
    if (zone !== hub) return;
    if (!sandbox.contains(Player.x, Player.z)) { if (announce) UI.toast('You can only build inside the sandbox.'); return; }
    if (Player.third || showcase) { if (announce) UI.toast('Press V for first person, then build.'); return; }
    const r = sandbox.act(kind, Player);
    if (!r.ok) { UI.toast(r.reason); return; }
    // never leave a pet stuck inside a block you just placed
    const pet = follower.group;
    if (pet && World.Collide.blocked(hub, pet.position.x, pet.position.z, 0.2)) {
      const b = behind();
      follower.teleport(b.x, b.z);
      if (World.Collide.blocked(hub, b.x, b.z, 0.2)) follower.teleport(Player.x, Player.z);
    }
  }

  function sandboxKey(code) {
    if (code === 'KeyF') sandboxAct('place', true);
    else if (code === 'KeyX') sandboxAct('break', true);
    else if (!inSandbox()) return;                      // the rest only mean something in the sandbox
    else if (code === 'Enter') {
      const r = sandbox.check();
      UI.toast(r.solved && !r.again ? `Solved! +${Blueprint.LEVELS[sandbox.state.level].pay} chips` : r.empty ? 'Build something first.' : r.again ? 'Already solved. Press N.' : 'Not yet. Look at the marks on the board.');
    }
    else if (code === 'KeyH') { if (sandbox.hint()) UI.toast('A hint is on the board.'); }
    else if (code === 'KeyN') { sandbox.newPuzzle(); UI.toast('New blueprint.'); }
  }

  let hudKey = '', mapKey = '';
  sandbox.onFontsLoaded(() => { mapKey = ''; });
  function updateSandboxHud() {
    const el = $('sandbox-hud');
    const here = started && !UI.isOpen() && inSandbox();
    if (!here) { if (hudKey) { el.classList.add('hidden'); hudKey = ''; mapKey = ''; } return; }
    const h = sandbox.hud();
    const k = h.title + '|' + h.lines.join('|');
    if (k !== hudKey) {
      hudKey = k;
      const box = $('sandbox-text');
      box.innerHTML = '';
      const t = document.createElement('b'); t.textContent = h.title; box.appendChild(t);
      h.lines.forEach(line => { const d = document.createElement('div'); d.textContent = line; box.appendChild(d); });
      el.classList.remove('hidden');
    }
    // the top-down map: redraw only when something it shows has changed
    const mk = [sandbox.cells().length, sandbox.cells().reduce((n, c) => n + c[0] * 7 + c[1] * 13 + c[2] * 31, 0), Math.round(Player.x * 5), Math.round(Player.z * 5), Math.round(Player.yaw * 12), Math.round(Player.lift * 5)].join(',');
    if (mk !== mapKey) { mapKey = mk; sandbox.drawMap($('sandbox-map'), Player); }
  }

  /* ---------- Minesweeper: the field behind the dorm ---------- */
  const mines = hub.mines;
  const minesMenu = MinesMenu.create(mines);
  const minesHere = () => zone === hub && mines.contains(Player.x, Player.z, 0.6);
  let minesToastAt = 0;
  /** Dig ('dig') or flag ('flag') the square under the crosshair. announce: say why nothing happened (for a key press; a click that is only looking around stays quiet). */
  function minesAct(kind, announce) {
    if (Player.third || showcase) { if (announce) UI.toast('Press V for first person, then dig.'); return; }
    const r = kind === 'flag' ? mines.flag(Player) : mines.dig(Player);
    if (r.ok) return;
    const say = { nogame: 'Pick a level first: press R, or press E at the sign.', noaim: announce ? 'Aim at a square of grass.' : '', flagged: 'Take the flag off first (F).', open: 'That square is already dug.', over: 'This game is over. Press R to play again.' }[r.reason];
    const now = performance.now();
    if (say && now - minesToastAt > 1500) { minesToastAt = now; UI.toast(say); }
  }

  /* ---------- input ---------- */
  let started = false;
  let locked = false;
  let dragging = false;

  function requestLock() {
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* drag-to-look still works */ }
  }

  function showStart(text) {
    startMsg.textContent = text;
    $('play').textContent = started ? 'Resume' : 'Play';
    startScreen.classList.remove('hidden');
  }

  $('play').addEventListener('click', () => {
    started = true;
    startScreen.classList.add('hidden');
    requestLock();
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (!locked && started && !UI.isOpen()) showStart('Paused. Click Resume to keep exploring.');
  });

  // left click breaks a block, right click places one (both only count inside the sandbox)
  const sandboxClick = button => {
    if (minesHere()) { if (button === 0) minesAct('dig', false); else if (button === 2) minesAct('flag', false); return; }   // on the minefield, the mouse digs and flags
    if (button === 2) sandboxAct('place', false); else if (button === 0) sandboxAct('break', false);
  };
  let click = null;
  canvas.addEventListener('mousedown', e => {
    if (!started || UI.isOpen()) return;
    dragging = true;
    click = { button: e.button, moved: 0 };
    if (!locked) requestLock();
    else sandboxClick(e.button);                       // the mouse is captured: act right away
  });
  window.addEventListener('mouseup', () => {
    // without a captured mouse, a click that did not drag acts on release (a drag is looking around)
    if (dragging && click && !locked && click.moved < 5) sandboxClick(click.button);
    dragging = false; click = null;
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('mousemove', e => {
    if (!started || UI.isOpen()) return;
    if (click) click.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
    if (locked || dragging) Player.look(e.movementX || 0, e.movementY || 0);
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      if (LessonPanel.isOpen()) LessonPanel.close();
      else if (minesMenu.isOpen()) minesMenu.close();
      else if (CraftingGame.isOpen()) CraftingGame.close();
      else if (TrinomialGame.isOpen()) TrinomialGame.close();
      else if (CubesGame.isOpen()) CubesGame.close();
      else if (PolyMulGame.isOpen()) PolyMulGame.close();
      else if (PolyAddGame.isOpen()) PolyAddGame.close();
      else if (RadicalGame.isOpen()) RadicalGame.close();
      else if (LinesGame.isOpen()) LinesGame.close();
      else if (CoasterGame.isOpen()) CoasterGame.close();
      else if (TrophyCase.isOpen()) TrophyCase.close();
      else if (ParabolaGame.isOpen()) ParabolaGame.close();
      else if (VertexGame.isOpen()) VertexGame.close();
      else if (Shop.isOpen()) Shop.close();
      else if (ArithmeticGame.isOpen()) ArithmeticGame.close();
      else if (MapGame.isOpen()) MapGame.close();
      else if (LittleLibrary.isOpen()) LittleLibrary.back();
      else if (DormPlanner.isOpen()) DormPlanner.close();
      else if (!$('dialog').classList.contains('hidden')) UI.closeDialog();
      return;
    }
    if (!started || UI.isOpen()) return;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    Player.keys[e.code] = true;
    if (e.code === 'KeyE' && !e.repeat && focused) focused.action();
    if (e.code === 'KeyL' && !e.repeat && focused && focused.lesson) LessonPanel.open(focused.lesson);
    if (e.code === 'KeyV') Player.third = !Player.third;
    if (e.code === 'KeyC' && !e.repeat) Shop.openCloset();
    if (!e.repeat && minesHere() && ['KeyF', 'KeyX'].includes(e.code)) minesAct(e.code === 'KeyF' ? 'flag' : 'dig', true);   // on the minefield F flags and X digs
    else if (!e.repeat && ['KeyF', 'KeyX', 'Enter', 'KeyH', 'KeyN'].includes(e.code)) sandboxKey(e.code);
    if (!e.repeat && e.code === 'KeyR' && zone === hub && mines.contains(Player.x, Player.z, 6)) minesMenu.open();   // R near the field: pick a new game
  });
  window.addEventListener('keyup', e => { Player.keys[e.code] = false; });
  window.addEventListener('blur', () => { Player.keys = {}; });

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- loop ---------- */
  let last = performance.now();
  let showcase = null;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (started && !UI.isOpen()) Player.update(dt, zone);
    else if (!started) Player.yaw += dt * 0.05; // slow idle pan behind the start screen

    World.updateNPCs(zone, dt, t);
    zone.animated.forEach(fn => fn(dt, t));

    // while a shop or the closet is open, swing the camera round to show the avatar
    if (UI.has('shop')) {
      const moved = showcase && (showcase.px !== Player.x || showcase.pz !== Player.z || showcase.pyaw !== Player.yaw || showcase.zone !== zone);
      if (!showcase || moved) showcase = { ...Showcase.compute(zone, Player), px: Player.x, pz: Player.z, pyaw: Player.yaw, zone };
    } else showcase = null;

    // player avatar + camera
    const seen = Player.third || !!showcase;
    me.visible = seen;
    viewPencil.visible = !seen && !hasCalc;
    viewCalc.visible = !seen && hasCalc;
    me.position.set(Player.x, Player.lift, Player.z);
    me.rotation.y = showcase ? showcase.face + Math.sin(t * 0.9) * 0.35 : Player.yaw + Math.PI;
    Avatar.animate(me, showcase ? 0 : Player.moveAmt, Player.bobT * 2.2);
    follower.update(dt, t, zone, Player, showcase ? showcase.petGoal : null);
    sandbox.showAim(Player, started && !UI.isOpen() && zone === hub && !Player.third && !showcase);
    updateSandboxHud();
    mines.update(dt, t, Player, started && !UI.isOpen() && zone === hub && !Player.third && !showcase);
    minesMenu.updateHud(Player, zone === hub && started && !UI.isOpen());
    if (mines.shaking > 0) canvas.style.transform = `translate(${((Math.random() - 0.5) * mines.shaking * 22).toFixed(1)}px, ${((Math.random() - 0.5) * mines.shaking * 22).toFixed(1)}px)`;
    else if (canvas.style.transform) canvas.style.transform = '';

    const bob = Math.sin(Player.bobT * 9) * 0.035 * Player.moveAmt;
    camera.rotation.set(Player.pitch, Player.yaw, 0);
    if (showcase) {
      camera.position.set(showcase.cx, showcase.eye, showcase.cz);
      camera.rotation.set(showcase.pitch, showcase.yaw, 0);
    } else if (Player.third) {
      const cp = Math.cos(Player.pitch);
      const fx = -Math.sin(Player.yaw) * cp, fy = Math.sin(Player.pitch), fz = -Math.cos(Player.yaw) * cp;
      camera.position.set(Player.x - fx * 3.6, Math.max(0.5, Player.eye + Player.lift - fy * 3.6), Player.z - fz * 3.6);
    } else {
      camera.position.set(Player.x, Player.eye + Player.lift + bob, Player.z);
      viewPencil.position.y = -0.28 + Math.sin(Player.bobT * 9) * 0.012 * Player.moveAmt;
      viewCalc.position.y = -0.32 + Math.sin(Player.bobT * 9 + 1) * 0.012 * Player.moveAmt;
    }

    // nearest interactable within reach
    let best = null, bestD = Infinity;
    if (started && !UI.isOpen()) {
      for (const it of zone.interactables) {
        const d = Math.hypot(it.x - Player.x, it.z - Player.z);
        if (d < it.r && d < bestD) { best = it; bestD = d; }
      }
    }
    if (best !== focused) { focused = best; showPrompt(best); }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // a handle for tests and the browser console; nothing in the game reads it
  window.__primeTime = { scene, camera, me, follower, sandbox, mines, minesMenu, dorm, viewPencil, viewCalc, hub, casino, school, setZone, getZone: () => zone, getShowcase: () => showcase };
})();
