/* While a shop or the closet is open, the camera swings around to show the student's avatar so they can
   see what they are trying on. Standing at a shop door, the avatar's front usually faces a wall, so
   compute() tries the front first and then works around to the first spot that is clear.

   The panel covers the right side of the screen, so the avatar is nudged to the left and a pet being
   tried on is parked on its other side, toward the middle of the screen. */
const Showcase = (() => {
  const DIST = 3.3;      // how far the camera stands from the avatar
  const EYE = 1.4;       // camera height
  const LOOK_Y = 1.0;    // roughly the avatar's chest
  const SHIFT = -0.28;   // turn the view a little right so the avatar sits left of center
  const TRY = [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, Math.PI];
  // Two passes: comfortable clearance first, then tighter clearance and shorter distances for tight
  // spots (the strip behind the casino, the gap between a table and the wall).
  const PASSES = [
    { clear: 0.5, dists: [DIST, 2.6, 2.0] },
    { clear: 0.2, dists: [DIST, 2.6, 2.0, 1.5] },
  ];

  /** pl: { x, z, yaw }. Returns where the camera goes and where the avatar and a pet should face and stand. */
  function compute(zone, pl) {
    let cx = null, cz = null, forced = false;
    search:
    for (const { clear, dists } of PASSES) {
      for (const d of dists) {
        // first the directions around where the student is facing, then the four compass directions
        // (walls and narrow strips run along the axes, so those find the gaps the others miss)
        const dirs = [...TRY.map(a => pl.yaw + a), 0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
        for (const y of dirs) {
          const x = pl.x - Math.sin(y) * d, z = pl.z - Math.cos(y) * d;
          if (!World.Collide.blocked(zone, x, z, clear)) { cx = x; cz = z; break search; }
        }
      }
    }
    if (cx === null) { // nowhere clear at all: come in close and accept it
      cx = pl.x - Math.sin(pl.yaw) * 1.5;
      cz = pl.z - Math.cos(pl.yaw) * 1.5;
      forced = true;
    }
    const dx = pl.x - cx, dz = pl.z - cz;
    const base = Math.atan2(-dx, -dz);                 // camera yaw that looks straight at the avatar
    const pitch = Math.atan2(LOOK_Y - EYE, Math.hypot(dx, dz));

    // the camera's right-hand side is toward the middle of the screen (the avatar sits left of it)
    const rx = Math.cos(base), rz = -Math.sin(base);
    let gx = pl.x + rx * 1.1, gz = pl.z + rz * 1.1;
    if (World.Collide.blocked(zone, gx, gz, 0.3)) { gx = pl.x - rx * 1.1; gz = pl.z - rz * 1.1; }
    if (World.Collide.blocked(zone, gx, gz, 0.3)) { gx = pl.x; gz = pl.z; }

    return {
      cx, cz, eye: EYE, forced,
      face: Math.atan2(cx - pl.x, cz - pl.z),          // the avatar turns to face the camera
      yaw: base + SHIFT, pitch,
      petGoal: { x: gx, z: gz },
    };
  }

  return { compute, DIST, EYE };
})();
