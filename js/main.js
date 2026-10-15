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
    await Promise.race([document.fonts.load('20px Silkscreen'), new Promise(r => setTimeout(r, 1500))]);
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
    openShop: id => (id === 'hints' ? UI.shop(id) : Shop.open(id)),
    petRemy: () => UI.toast('Remy purrs.'),
    readBoard: () => UI.dialog({ title: CONTENT.board.title, html: CONTENT.board.html }),
    openTable: m => {
      if (m === 'trinomial') TrinomialGame.open();
      else if (m === 'radical') RadicalGame.open();
      else if (m === 'parabola') ParabolaGame.open();
      else if (m === 'vertex') VertexGame.open();
      else CraftingGame.open(m);
    },
  };
  const hub = World.buildHub(actions);
  const casino = World.buildCasino(actions);
  scene.add(hub.group, casino.group);

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

  /* ---------- what the student is wearing, and the pet trailing them ---------- */
  const follower = Pets.createFollower(scene);
  const behind = () => ({ x: Player.x + Math.sin(Player.yaw) * 1.2, z: Player.z + Math.cos(Player.yaw) * 1.2 });

  function applyOutfit(o) {
    Avatar.dress(me, o);
    Avatar.setPencilColor(viewPencil, o.pencil.color);
    const at = behind();
    follower.set(o.pet, at.x, at.z);
  }
  Shop.onChange(applyOutfit);   // fires for try-ons, purchases, and equips
  applyOutfit(Shop.outfit());   // whatever was saved last time

  /* ---------- HUD ---------- */
  Store.onChange(s => { $('chips').textContent = s.chips; });
  const promptEl = $('prompt');
  let focused = null;

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

  canvas.addEventListener('mousedown', () => {
    if (!started || UI.isOpen()) return;
    dragging = true;
    if (!locked) requestLock();
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('mousemove', e => {
    if (!started || UI.isOpen()) return;
    if (locked || dragging) Player.look(e.movementX || 0, e.movementY || 0);
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Escape') {
      if (CraftingGame.isOpen()) CraftingGame.close();
      else if (TrinomialGame.isOpen()) TrinomialGame.close();
      else if (RadicalGame.isOpen()) RadicalGame.close();
      else if (ParabolaGame.isOpen()) ParabolaGame.close();
      else if (VertexGame.isOpen()) VertexGame.close();
      else if (Shop.isOpen()) Shop.close();
      else if (!$('dialog').classList.contains('hidden')) UI.closeDialog();
      return;
    }
    if (!started || UI.isOpen()) return;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    Player.keys[e.code] = true;
    if (e.code === 'KeyE' && !e.repeat && focused) focused.action();
    if (e.code === 'KeyV') Player.third = !Player.third;
    if (e.code === 'KeyC' && !e.repeat) Shop.openCloset();
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
    viewPencil.visible = !seen;
    me.position.set(Player.x, 0, Player.z);
    me.rotation.y = showcase ? showcase.face + Math.sin(t * 0.9) * 0.35 : Player.yaw + Math.PI;
    Avatar.animate(me, showcase ? 0 : Player.moveAmt, Player.bobT * 2.2);
    follower.update(dt, t, zone, Player, showcase ? showcase.petGoal : null);

    const bob = Math.sin(Player.bobT * 9) * 0.035 * Player.moveAmt;
    camera.rotation.set(Player.pitch, Player.yaw, 0);
    if (showcase) {
      camera.position.set(showcase.cx, showcase.eye, showcase.cz);
      camera.rotation.set(showcase.pitch, showcase.yaw, 0);
    } else if (Player.third) {
      const cp = Math.cos(Player.pitch);
      const fx = -Math.sin(Player.yaw) * cp, fy = Math.sin(Player.pitch), fz = -Math.cos(Player.yaw) * cp;
      camera.position.set(Player.x - fx * 3.6, Math.max(0.5, Player.eye - fy * 3.6), Player.z - fz * 3.6);
    } else {
      camera.position.set(Player.x, Player.eye + bob, Player.z);
      viewPencil.position.y = -0.28 + Math.sin(Player.bobT * 9) * 0.012 * Player.moveAmt;
    }

    // nearest interactable within reach
    let best = null, bestD = Infinity;
    if (started && !UI.isOpen()) {
      for (const it of zone.interactables) {
        const d = Math.hypot(it.x - Player.x, it.z - Player.z);
        if (d < it.r && d < bestD) { best = it; bestD = d; }
      }
    }
    if (best !== focused) {
      focused = best;
      if (best) promptEl.innerHTML = `<span class="key">E</span>${best.label}`;
      promptEl.classList.toggle('hidden', !best);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // a handle for tests and the browser console; nothing in the game reads it
  window.__primeTime = { scene, camera, me, follower, hub, casino, setZone, getZone: () => zone, getShowcase: () => showcase };
})();
