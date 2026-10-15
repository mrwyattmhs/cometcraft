/* Blocky student avatars: backpack, pencil in hand, simple walk cycle.
   Model faces +z in local space. Proportions: 1.8 blocks tall. */
const Avatar = (() => {
  const hex = n => '#' + n.toString(16).padStart(6, '0');

  const PALETTES = {
    skin: [0xf1c9a5, 0xd9a37a, 0xa8744f, 0x6b4630],
    hair: [0x2b1a10, 0x5a3a1a, 0xc9a14a, 0x1a1a1a, 0xa04a2a],
    shirt: [0x2f6fdb, 0xd94a4a, 0x3fae5a, 0xe0a030, 0x8a4fd0, 0xf06fb0],
    pants: [0x2b3a67, 0x3a3a3a, 0x5a4a3a],
    pack: [0xd94a4a, 0x3fae5a, 0xe0a030, 0x2f6fdb],
  };
  const pick = list => list[Math.floor(Math.random() * list.length)];

  function randomLook() {
    return {
      skin: pick(PALETTES.skin), hair: pick(PALETTES.hair), shirt: pick(PALETTES.shirt),
      pants: pick(PALETTES.pants), pack: pick(PALETTES.pack),
    };
  }

  function faceTexture(skin, hair, kind) {
    const c = document.createElement('canvas');
    c.width = c.height = 8;
    const g = c.getContext('2d');
    g.fillStyle = hex(skin);
    g.fillRect(0, 0, 8, 8);
    g.fillStyle = hex(hair);
    if (kind === 'front') {
      g.fillRect(0, 0, 8, 2);
      g.fillRect(0, 2, 1, 1); g.fillRect(7, 2, 1, 1);
      g.fillStyle = '#ffffff'; g.fillRect(1, 4, 2, 1); g.fillRect(5, 4, 2, 1);
      g.fillStyle = '#2a3d8f'; g.fillRect(2, 4, 1, 1); g.fillRect(5, 4, 1, 1);
      g.fillStyle = '#8a4a3a'; g.fillRect(3, 6, 2, 1);
    } else if (kind === 'side') {
      g.fillRect(0, 0, 8, 3);
    } else if (kind === 'back' || kind === 'top') {
      g.fillRect(0, 0, 8, 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return new THREE.MeshLambertMaterial({ map: t });
  }

  const lambert = color => new THREE.MeshLambertMaterial({ color });

  /** A pencil lying along local z; the sharpened tip is at +z. The shaft color can be changed later. */
  function makePencil(len = 0.7, shaftColor = 0xf2c230) {
    const g = new THREE.Group();
    const shaftMat = lambert(shaftColor);
    const add = (w, h, d, mat, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.z = z;
      g.add(m);
    };
    add(0.06, 0.06, len * 0.72, shaftMat, 0);                                   // shaft
    add(0.062, 0.062, len * 0.1, lambert(0xb8bcc4), -len * 0.41);                // metal band
    add(0.06, 0.06, len * 0.1, lambert(0xf08aa0), -len * 0.5);                   // eraser
    add(0.046, 0.046, len * 0.1, lambert(0xe6c79a), len * 0.41);                 // sharpened wood
    add(0.02, 0.02, len * 0.05, new THREE.MeshBasicMaterial({ color: 0x2a2a2a }), len * 0.48); // graphite
    g.userData.shaftMat = shaftMat;
    return g;
  }
  const setPencilColor = (pencil, color) => pencil.userData.shaftMat.color.setHex(color);

  function limb(w, h, d, mat, x, y, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = -h / 2;
    pivot.add(m);
    return pivot;
  }

  function make(look = randomLook()) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    // shirt, pants and shoes are shared materials so dress() can recolor them in one go
    const mats = { shirt: lambert(look.shirt), pants: lambert(look.pants), shoe: lambert(0x2a2a2a) };

    // torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.675, 0.225), mats.shirt);
    torso.position.y = 1.0125;
    body.add(torso);

    // head: [+x, -x, +y, -y, +z (front), -z]
    const side = faceTexture(look.skin, look.hair, 'side');
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), [
      side, side,
      faceTexture(look.skin, look.hair, 'top'),
      lambert(look.skin),
      faceTexture(look.skin, look.hair, 'front'),
      faceTexture(look.skin, look.hair, 'back'),
    ]);
    head.position.y = 1.575;
    body.add(head);

    // backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.14), lambert(look.pack));
    pack.position.set(0, 1.05, -0.185);
    body.add(pack);

    // arms (pivot at shoulder) with skin-colored hands
    const armL = limb(0.225, 0.675, 0.225, mats.shirt, -0.3375, 1.35, 0);
    const armR = limb(0.225, 0.675, 0.225, mats.shirt, 0.3375, 1.35, 0);
    [armL, armR].forEach(a => {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.14, 0.225), lambert(look.skin));
      hand.position.y = -0.605;
      a.add(hand);
      body.add(a);
    });

    // legs (pivot at hip) with shoes
    const legL = limb(0.225, 0.675, 0.225, mats.pants, -0.1125, 0.675, 0);
    const legR = limb(0.225, 0.675, 0.225, mats.pants, 0.1125, 0.675, 0);
    [legL, legR].forEach(l => {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.1, 0.28), mats.shoe);
      shoe.position.set(0, -0.625, 0.025);
      l.add(shoe);
      body.add(l);
    });

    // pencil held out in the right hand
    const pencil = makePencil();
    pencil.position.set(0, -0.62, 0.05);
    pencil.rotation.x = 0.55;
    armR.add(pencil);

    root.userData.parts = { body, armL, armR, legL, legR, head, torso };
    root.userData.mats = mats;
    root.userData.pencil = pencil;
    return root;
  }

  /* ---------- dressing: shirt emblem, hats, and the whole outfit ---------- */
  const M_GLYPH = ['#...#', '##.##', '#.#.#', '#...#', '#...#']; // a block M, 13 blocks

  /** A white block letter on the front of the shirt. Only 'M' exists so far. */
  function setEmblem(root, emblem) {
    const torso = root.userData.parts.torso;
    if (root.userData.emblem) { torso.remove(root.userData.emblem); root.userData.emblem = null; }
    if (emblem !== 'M') return;
    const u = 0.062;
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x555555 });
    const geo = new THREE.BoxGeometry(u, u, 0.03);
    M_GLYPH.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== '#') return;
      const cube = new THREE.Mesh(geo, mat);
      cube.position.set((c - 2) * u, (2 - r) * u + 0.03, 0.1125 + 0.012);
      g.add(cube);
    }));
    torso.add(g);
    root.userData.emblem = g;
  }

  /** hat: { type: 'cap' | 'beanie', color } or null. Sits on top of the head (head is a 0.45 cube). */
  function setHat(root, hat) {
    const head = root.userData.parts.head;
    if (root.userData.hat) { head.remove(root.userData.hat); root.userData.hat = null; }
    if (!hat) return;
    const g = new THREE.Group();
    const mat = lambert(hat.color);
    const piece = (w, h, d, m, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      g.add(mesh);
    };
    if (hat.type === 'cap') {
      piece(0.48, 0.13, 0.48, mat, 0, 0.27, 0);                       // crown
      piece(0.44, 0.03, 0.2, lambert(hat.color), 0, 0.215, 0.33);     // brim, out the front
    } else {
      piece(0.5, 0.2, 0.5, mat, 0, 0.3, 0);                           // beanie
      piece(0.1, 0.1, 0.1, lambert(0xf4f1ea), 0, 0.45, 0);            // pom-pom
    }
    head.add(g);
    root.userData.hat = g;
  }

  /** outfit comes from Catalog.outfitFor(). */
  function dress(root, outfit) {
    const m = root.userData.mats;
    m.shirt.color.setHex(outfit.shirt.color);
    m.pants.color.setHex(outfit.pants.color);
    m.shoe.color.setHex(outfit.shoes.color);
    setEmblem(root, outfit.shirt.emblem);
    setHat(root, outfit.hat);
    setPencilColor(root.userData.pencil, outfit.pencil.color);
  }

  /** moving: 0..1 blend between idle and walking. t: seconds. */
  function animate(root, moving, t) {
    const p = root.userData.parts;
    const swing = Math.sin(t * 9) * 0.75 * moving;
    p.legL.rotation.x = swing;
    p.legR.rotation.x = -swing;
    p.armL.rotation.x = -swing;
    p.armR.rotation.x = -0.85 + swing * 0.12;
    p.body.position.y = Math.abs(Math.sin(t * 9)) * 0.035 * moving;
  }

  return { make, animate, makePencil, setPencilColor, dress, setEmblem, setHat, randomLook, defaultLook: { skin: 0xf1c9a5, hair: 0x5a3a1a, shirt: 0x2f6fdb, pants: 0x2b3a67, pack: 0xd94a4a } };
})();
