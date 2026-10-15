/* Blocky pets built from boxes, like everything else here. They face +z and stand on y = 0.
   make() builds one, animate() walks it, and createFollower() makes one trail a student
   around the village and through the casino door.

   Pets for sale come from catalog.js (dog, cat, rabbit in several colors). 'calico' is a
   cat-only variant reserved for Remy, the town cat, who is not for sale. */
const Pets = (() => {
  const T = THREE;
  const lam = c => new T.MeshLambertMaterial({ color: c });

  const PALETTES = {
    dog: {
      golden: { body: 0xd9a441, dark: 0xb07a24, belly: 0xf0d28a, nose: 0x222222 },
      brown:  { body: 0x7a4a26, dark: 0x5a3418, belly: 0xb08060, nose: 0x181818 },
      black:  { body: 0x2a2a2e, dark: 0x18181b, belly: 0x4a4a52, nose: 0x0e0e0e },
    },
    cat: {
      orange: { body: 0xe58a2f, dark: 0xc16a1c, belly: 0xf6d3a0, nose: 0xf29aa6 },
      gray:   { body: 0x8e949c, dark: 0x6c7279, belly: 0xc9cdd2, nose: 0xf29aa6 },
      black:  { body: 0x242428, dark: 0x151518, belly: 0x3c3c42, nose: 0xd9808c },
      white:  { body: 0xf1efe8, dark: 0xd9d6cc, belly: 0xffffff, nose: 0xf29aa6 },
      // light brown and white, for Remy
      calico: { body: 0xf4f1ea, dark: 0xe6e1d8, belly: 0xffffff, nose: 0xf29aa6, patch: 0xc79a6a, tan: 0xa8794f },
    },
    rabbit: {
      white: { body: 0xf2f2f2, dark: 0xd8d8d8, belly: 0xffffff, nose: 0xf29aa6 },
      brown: { body: 0x9b6a43, dark: 0x7a4f2e, belly: 0xd8bc9a, nose: 0xd9808c },
      gray:  { body: 0xa9aeb5, dark: 0x868b92, belly: 0xdfe2e5, nose: 0xf29aa6 },
    },
  };

  /** A box added to a group. */
  function part(g, w, h, d, mat, x, y, z) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }
  /** A leg that swings from its top. */
  function leg(g, mat, x, y, z, w, h, d) {
    const pivot = new T.Group();
    pivot.position.set(x, y, z);
    part(pivot, w, h, d, mat, 0, -h / 2, 0);
    g.add(pivot);
    return pivot;
  }

  const BUILDERS = {
    dog(g, p) {
      const m = lam(p.body), md = lam(p.dark), mb = lam(p.belly), mn = lam(p.nose), eye = lam(0x151515);
      part(g, 0.34, 0.3, 0.62, m, 0, 0.38, 0);
      part(g, 0.22, 0.16, 0.04, mb, 0, 0.36, 0.32);                       // chest
      const legs = [
        leg(g, md, -0.1, 0.24, 0.2, 0.1, 0.24, 0.1), leg(g, md, 0.1, 0.24, 0.2, 0.1, 0.24, 0.1),
        leg(g, md, -0.1, 0.24, -0.2, 0.1, 0.24, 0.1), leg(g, md, 0.1, 0.24, -0.2, 0.1, 0.24, 0.1),
      ];
      const head = new T.Group();
      head.position.set(0, 0.58, 0.36);
      g.add(head);
      part(head, 0.26, 0.24, 0.24, m, 0, 0, 0);
      part(head, 0.14, 0.1, 0.12, mb, 0, -0.05, 0.17);                    // snout
      part(head, 0.06, 0.05, 0.04, mn, 0, -0.02, 0.24);                   // nose
      [-0.07, 0.07].forEach(x => part(head, 0.04, 0.04, 0.02, eye, x, 0.04, 0.125));
      [-0.15, 0.15].forEach(x => part(head, 0.07, 0.15, 0.1, md, x, -0.03, -0.02)); // floppy ears
      const tail = new T.Group();
      tail.position.set(0, 0.5, -0.31);
      part(tail, 0.06, 0.06, 0.22, m, 0, 0, -0.1);
      tail.rotation.x = 0.7;
      g.add(tail);
      return { legs, tail, head };
    },

    cat(g, p) {
      const m = lam(p.body), md = lam(p.dark), mb = lam(p.belly), mn = lam(p.nose), eye = lam(0x3f9a4a);
      const calico = p.patch !== undefined;
      const patch = calico ? lam(p.patch) : null, tan = calico ? lam(p.tan) : null;
      part(g, 0.26, 0.24, 0.5, m, 0, 0.3, 0);
      part(g, 0.18, 0.12, 0.04, mb, 0, 0.28, 0.26);                       // chest
      const legs = [
        leg(g, m, -0.08, 0.18, 0.17, 0.08, 0.18, 0.08), leg(g, m, 0.08, 0.18, 0.17, 0.08, 0.18, 0.08),
        leg(g, m, -0.08, 0.18, -0.17, 0.08, 0.18, 0.08), leg(g, m, 0.08, 0.18, -0.17, 0.08, 0.18, 0.08),
      ];
      const head = new T.Group();
      head.position.set(0, 0.48, 0.3);
      g.add(head);
      part(head, 0.22, 0.2, 0.2, m, 0, 0, 0);
      part(head, 0.035, 0.03, 0.02, mn, 0, -0.03, 0.105);                 // nose
      [-0.055, 0.055].forEach(x => part(head, 0.04, 0.05, 0.02, eye, x, 0.02, 0.105));
      const ears = [-0.075, 0.075].map(x => part(head, 0.07, 0.09, 0.04, m, x, 0.14, -0.02));
      const tail = new T.Group();
      tail.position.set(0, 0.36, -0.25);
      const tailMat = calico ? tan : m;
      part(tail, 0.05, 0.05, 0.32, tailMat, 0, 0, -0.16);
      if (calico) part(tail, 0.052, 0.052, 0.07, m, 0, 0, -0.325);       // white tip
      tail.rotation.x = 1.0;
      g.add(tail);

      if (calico) {
        // light brown patches on a white cat: a saddle over the back, a spot on one flank,
        // and one side of the face (including that ear). Slightly oversized so they sit on top.
        part(g, 0.275, 0.13, 0.27, patch, 0, 0.36, -0.1);               // back
        part(g, 0.27, 0.12, 0.12, patch, 0, 0.35, 0.16);                // shoulders
        part(g, 0.01, 0.1, 0.14, tan, 0.135, 0.28, -0.12);              // flank spot
        part(head, 0.115, 0.205, 0.205, patch, -0.055, 0, 0);           // half the face
        ears[0].material = patch;                                       // matching ear
        part(head, 0.07, 0.07, 0.205, tan, 0.06, 0.07, 0);              // small tan mark on the other side
      }
      return { legs, tail, head };
    },

    rabbit(g, p) {
      const m = lam(p.body), md = lam(p.dark), mb = lam(p.belly), mn = lam(p.nose), eye = lam(0x151515);
      part(g, 0.26, 0.24, 0.38, m, 0, 0.27, 0);
      const legs = [
        leg(g, md, -0.07, 0.15, 0.13, 0.06, 0.15, 0.06), leg(g, md, 0.07, 0.15, 0.13, 0.06, 0.15, 0.06),
        leg(g, md, -0.1, 0.17, -0.1, 0.09, 0.17, 0.16), leg(g, md, 0.1, 0.17, -0.1, 0.09, 0.17, 0.16),
      ];
      const head = new T.Group();
      head.position.set(0, 0.42, 0.2);
      g.add(head);
      part(head, 0.2, 0.18, 0.2, m, 0, 0, 0);
      part(head, 0.04, 0.035, 0.02, mn, 0, -0.03, 0.105);                 // nose
      [-0.06, 0.06].forEach(x => part(head, 0.035, 0.04, 0.02, eye, x, 0.03, 0.105));
      [-0.05, 0.05].forEach(x => {
        const ear = part(head, 0.06, 0.26, 0.04, m, x, 0.22, -0.03);      // long ears
        ear.rotation.x = -0.2;
        part(head, 0.03, 0.2, 0.01, mb, x, 0.22, -0.005).rotation.x = -0.2; // pale inner ear
      });
      const tail = new T.Group();
      tail.position.set(0, 0.3, -0.21);
      part(tail, 0.11, 0.11, 0.11, lam(0xffffff), 0, 0, -0.03);           // cotton tail
      g.add(tail);
      return { legs, tail, head };
    },
  };

  /** kind: 'dog' | 'cat' | 'rabbit'. variant: a key in PALETTES[kind]. */
  function make(kind, variant) {
    const pal = PALETTES[kind] && PALETTES[kind][variant];
    if (!pal) throw new Error(`no ${variant} ${kind}`);
    const root = new T.Group();
    const body = new T.Group(); // everything lives in here so hopping can lift the whole pet
    root.add(body);
    const parts = BUILDERS[kind](body, pal);
    root.userData = { kind, variant, parts, body };
    return root;
  }

  const GAIT = [1, -1, -1, 1]; // diagonal pairs swing together

  /** moving: 0..1 blend between standing and walking. t: seconds. */
  function animate(pet, moving, t) {
    const { kind, parts, body } = pet.userData;
    const swing = Math.sin(t * (kind === 'rabbit' ? 10 : 12)) * 0.7 * moving;
    parts.legs.forEach((l, i) => { l.rotation.x = swing * GAIT[i]; });
    body.position.y = kind === 'rabbit' ? Math.abs(Math.sin(t * 10)) * 0.12 * moving : Math.abs(Math.sin(t * 12)) * 0.012 * moving;
    if (kind === 'dog') parts.tail.rotation.y = Math.sin(t * 13) * 0.55 * (0.35 + 0.65 * (1 - moving)); // wags harder when stopped
    else if (kind === 'cat') parts.tail.rotation.y = Math.sin(t * 2.2) * 0.3;
  }

  const wrapAngle = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

  /** A pet that trails its owner. set() swaps the pet, update() runs every frame.
      A goal point overrides following (the shop uses that to park the pet beside the avatar). */
  function createFollower(scene) {
    let pet = null, spec = null, chasing = false, yaw = 0, moving = 0;
    const same = (a, b) => (!a && !b) || (!!a && !!b && a.kind === b.kind && a.variant === b.variant);

    return {
      get group() { return pet; },
      get spec() { return spec; },

      set(next, x = 0, z = 0) {
        if (same(spec, next)) return;
        if (pet) scene.remove(pet);
        spec = next ? { kind: next.kind, variant: next.variant } : null;
        pet = spec ? make(spec.kind, spec.variant) : null;
        chasing = false; moving = 0;
        if (pet) { pet.position.set(x, 0, z); scene.add(pet); }
      },

      teleport(x, z) {
        if (!pet) return;
        pet.position.set(x, 0, z);
        chasing = false;
      },

      update(dt, t, zone, owner, goal) {
        if (!pet) return;
        const p = pet.position;
        let tx = owner.x, tz = owner.z, want = false;

        if (goal) {
          tx = goal.x; tz = goal.z;
          want = Math.hypot(tx - p.x, tz - p.z) > 0.12;
        } else {
          const d = Math.hypot(owner.x - p.x, owner.z - p.z);
          if (d > 14) { p.set(owner.x + 0.9, 0, owner.z + 0.9); chasing = false; }     // lost: catch up instantly
          else {
            if (!chasing && d > 2.6) chasing = true;                                    // fell behind
            if (chasing && d < 1.5) chasing = false;                                    // close enough
            want = chasing;
          }
        }

        let speed = 0;
        if (want) {
          const d = Math.hypot(tx - p.x, tz - p.z);
          speed = Math.min(6.5, 1.8 + d * 1.6);
          const step = Math.min(speed * dt, d);
          const nx = p.x + ((tx - p.x) / d) * step, nz = p.z + ((tz - p.z) / d) * step;
          if (!World.Collide.blocked(zone, nx, p.z, 0.25)) p.x = nx;
          if (!World.Collide.blocked(zone, p.x, nz, 0.25)) p.z = nz;
        }
        moving += ((speed > 0 ? 1 : 0) - moving) * Math.min(1, dt * 10);

        // face where it is heading, or look at its owner when standing still
        const fx = want ? tx - p.x : owner.x - p.x, fz = want ? tz - p.z : owner.z - p.z;
        if (Math.hypot(fx, fz) > 0.01) yaw += wrapAngle(Math.atan2(fx, fz) - yaw) * Math.min(1, dt * 8);
        pet.rotation.y = yaw;
        animate(pet, moving, t);
      },
    };
  }

  return { PALETTES, make, animate, createFollower };
})();
