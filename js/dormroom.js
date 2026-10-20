/* Your dorm room's furniture in 3D. The list of what you placed lives in Store (and is cleaned up by Dorm.sanitize); this file
   builds each piece as a small model out of boxes, puts it on the room's grid, and makes it solid so you walk around it.
   Every model is built facing south (+z) and is turned by Dorm's quarter turns. The planner (dorm-planner.js) changes the list
   and calls set(). */
const DormRoom = (() => {
  /** origin: the world position of the room grid's top-left corner. */
  function attach(zone, origin = { x0: 3, z0: 2 }) {
    const H = World.helpers, T = THREE;
    const { box, lambert, glow, textPlane, PX_FONT } = H;
    const root = new T.Group();
    zone.group.add(root);
    let items = [], rects = [];

    /* ----- the five models: x is the width, z the depth, and the front is +z; the origin is the middle of the floor space ----- */
    const wood = lambert(0x7a4a26), pine = lambert(0xc89b62), dark = lambert(0x24262c);
    const models = {
      bed(g) {
        box(g, wood, 1.0, 0.3, 2.0, 0, 0.35, 0);
        [[-0.42, -0.92], [0.42, -0.92], [-0.42, 0.92], [0.42, 0.92]].forEach(([x, z]) => box(g, wood, 0.1, 0.2, 0.1, x, 0.1, z));
        box(g, lambert(0xdfe9f6), 0.9, 0.22, 1.86, 0, 0.61, 0);
        box(g, lambert(0x4a78c8), 0.92, 0.1, 1.2, 0, 0.77, 0.36);
        box(g, lambert(0xffffff), 0.6, 0.14, 0.38, 0, 0.78, -0.7);
        box(g, wood, 1.0, 0.85, 0.1, 0, 0.62, -0.96); box(g, wood, 1.0, 0.4, 0.08, 0, 0.55, 0.96);
      },
      bunk(g) {
        const frame = lambert(0x3b4a66);
        [[-0.45, -0.95], [0.45, -0.95], [-0.45, 0.95], [0.45, 0.95]].forEach(([x, z]) => box(g, frame, 0.1, 2.3, 0.1, x, 1.15, z));
        [[0.4, 0xdbe6f2, 0xc84a4a], [1.5, 0xdbe6f2, 0x4a9a6a]].forEach(([y, mat, blanket]) => {
          box(g, frame, 0.96, 0.1, 1.96, 0, y, 0); box(g, lambert(mat), 0.88, 0.18, 1.84, 0, y + 0.14, 0);
          box(g, lambert(blanket), 0.9, 0.08, 1.1, 0, y + 0.26, 0.36); box(g, lambert(0xffffff), 0.6, 0.12, 0.36, 0, y + 0.26, -0.7);
        });
        box(g, frame, 0.05, 0.4, 1.7, -0.46, 2.0, 0);                                         // the upper rail
        [-0.22, 0.22].forEach(x => box(g, frame, 0.06, 1.6, 0.06, x, 0.9, 1.04));              // the ladder
        [0.35, 0.7, 1.05, 1.4].forEach(y => box(g, frame, 0.5, 0.05, 0.05, 0, y, 1.04));
      },
      tv(g) {
        box(g, wood, 1.9, 0.5, 0.7, 0, 0.25, 0);
        [-0.48, 0.48].forEach(x => { box(g, lambert(0x8d6338), 0.88, 0.38, 0.03, x, 0.27, 0.36); box(g, lambert(0xe8c35a), 0.05, 0.05, 0.04, x * 0.2 + (x > 0 ? 0.3 : -0.3), 0.27, 0.38); });
        box(g, dark, 0.3, 0.1, 0.2, 0, 0.55, -0.1);
        box(g, dark, 1.35, 0.82, 0.08, 0, 1.03, -0.1);
        const screen = textPlane(1.2, 0.68, (c, cv) => {
          ['#c9c9c9', '#d6d62a', '#2ad6d6', '#2ad62a', '#d62ad6', '#d62a2a', '#2a2ad6'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * cv.width / 7, 0, cv.width / 7 + 1, cv.height * 0.72); });
          c.fillStyle = '#10121a'; c.fillRect(0, cv.height * 0.72, cv.width, cv.height * 0.28);
          c.fillStyle = '#f4f1e6'; c.font = PX_FONT(cv.height * 0.14); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PRIME TIME', cv.width / 2, cv.height * 0.86);
        }, 80);
        screen.position.set(0, 1.03, -0.055); g.add(screen);
        [-0.78, 0.78].forEach(x => box(g, dark, 0.1, 0.5, 0.12, x, 0.8, -0.05));              // speakers
        box(g, lambert(0xf2f2f2), 0.34, 0.07, 0.26, -0.5, 0.54, 0.12);                        // a game console on top
      },
      desk(g) {
        box(g, pine, 1.9, 0.07, 0.75, 0, 0.76, 0);
        box(g, lambert(0xb98d5c), 0.5, 0.72, 0.7, -0.7, 0.36, 0);
        [[-0.7, 0xe8c35a]].forEach(([x, k]) => [0.2, 0.5].forEach(y => box(g, lambert(k), 0.08, 0.04, 0.04, x, y, 0.36)));
        box(g, pine, 0.06, 0.72, 0.7, 0.9, 0.36, 0); box(g, pine, 1.9, 0.5, 0.04, 0, 0.5, -0.33);
        box(g, dark, 0.25, 0.02, 0.18, 0, 0.81, -0.2); box(g, dark, 0.05, 0.2, 0.04, 0, 0.92, -0.22);
        box(g, dark, 0.72, 0.46, 0.05, 0, 1.2, -0.22);
        const screen = textPlane(0.66, 0.4, (c, cv) => {
          const gr = c.createLinearGradient(0, 0, cv.width, cv.height); gr.addColorStop(0, '#2d6fdb'); gr.addColorStop(1, '#7d5fd0');
          c.fillStyle = gr; c.fillRect(0, 0, cv.width, cv.height);
          [['#f7e98e', 8, 8], ['#f6b0c8', 8, 34], ['#b9f0b0', 8, 60]].forEach(([col, x, y]) => { c.fillStyle = col; c.fillRect(x, y, 18, 18); });
          c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(cv.width * 0.34, cv.height * 0.18, cv.width * 0.54, cv.height * 0.5);
          c.fillStyle = '#243024'; c.font = PX_FONT(cv.height * 0.1); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PRIME TIME', cv.width * 0.61, cv.height * 0.43);
          c.fillStyle = '#10121a'; c.fillRect(0, cv.height * 0.9, cv.width, cv.height * 0.1);
        }, 90);
        screen.position.set(0, 1.2, -0.193); g.add(screen);
        box(g, dark, 0.5, 0.025, 0.17, 0, 0.81, 0.12); box(g, dark, 0.07, 0.03, 0.11, 0.45, 0.81, 0.12);
        box(g, dark, 0.22, 0.45, 0.42, 0.72, 1.01, -0.18); box(g, glow(0x4aa3ff), 0.03, 0.03, 0.03, 0.72, 1.18, 0.04);
        // a chair, mostly tucked under the desk so it stays inside the desk's space
        const cm = lambert(0x3a3f4a);
        box(g, cm, 0.5, 0.07, 0.5, 0, 0.5, 0.28); box(g, cm, 0.5, 0.55, 0.07, 0, 0.82, 0.52); box(g, dark, 0.06, 0.4, 0.06, 0, 0.27, 0.28);
        box(g, dark, 0.5, 0.04, 0.06, 0, 0.05, 0.28); box(g, dark, 0.06, 0.04, 0.5, 0, 0.05, 0.28);
      },
      dresser(g) {
        box(g, lambert(0xa87b4f), 0.92, 0.82, 0.52, 0, 0.41, 0);
        [0.2, 0.45, 0.7].forEach(y => { box(g, lambert(0xb98d5c), 0.8, 0.2, 0.03, 0, y, 0.275); box(g, lambert(0xe8c35a), 0.08, 0.05, 0.04, 0, y, 0.3); });
        box(g, lambert(0x4a3a2a), 0.14, 0.05, 0.14, -0.25, 0.85, 0); box(g, lambert(0x4a3a2a), 0.04, 0.25, 0.04, -0.25, 0.98, 0);
        box(g, glow(0xffe0a0), 0.3, 0.2, 0.3, -0.25, 1.18, 0);                                // a little lamp
        box(g, lambert(0xe8c35a), 0.22, 0.18, 0.03, 0.2, 0.94, 0);                            // a photo frame
      },
    };

    /** Replace the furniture with a list (cleaned up first), rebuild the models, and make them solid. */
    function set(next) {
      items = Dorm.sanitize(next);
      while (root.children.length) root.remove(root.children[0]);
      rects.forEach(r => { const at = zone.colliders.indexOf(r); if (at >= 0) zone.colliders.splice(at, 1); });
      rects = [];
      items.forEach(it => {
        const f = Dorm.footprint(it.type, it.rot);
        const group = new T.Group();
        models[it.type](group);
        group.position.set(origin.x0 + it.x + f.w / 2, 0, origin.z0 + it.z + f.d / 2);
        group.rotation.y = -Dorm.mod4(it.rot) * Math.PI / 2;
        group.userData.item = it;
        root.add(group);
        const r = { minX: origin.x0 + it.x + 0.03, maxX: origin.x0 + it.x + f.w - 0.03, minZ: origin.z0 + it.z + 0.03, maxZ: origin.z0 + it.z + f.d - 0.03 };
        zone.colliders.push(r); rects.push(r);
      });
      return items;
    }

    // start from what was saved; if the save had something that does not fit, fix the save too
    const saved = Store.get().dorm, clean = Dorm.sanitize(saved);
    set(clean);
    if (JSON.stringify(saved) !== JSON.stringify(clean)) Store.set({ dorm: clean });

    return {
      set, get: () => items.map(o => ({ ...o })), root,
      origin,
      /** Save a new list: clean it, show it, and remember it. */
      save(next) { const list = set(next); Store.set({ dorm: list }); return list; },
      /** Just inside the door, facing into the room: where you stand when the planner opens or closes. */
      entry: { x: origin.x0 + Dorm.DOOR.x + 0.5, z: origin.z0 + Dorm.DOOR.z + 0.5, yaw: -Math.PI / 2 },
      count: () => root.children.length,
    };
  }
  return { attach };
})();
