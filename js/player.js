/* Player state + movement. yaw = 0 faces -z. Rendering lives in main.js. */
const Player = {
  x: 0, z: 0, yaw: 0, pitch: 0,
  radius: 0.35, eye: 1.62,
  lift: 0,                 // how high your feet are off the ground (you can only float in the sandbox)
  moveAmt: 0, bobT: 0,
  third: false,
  keys: {},

  teleport(x, z, yaw) {
    this.x = x; this.z = z; this.yaw = yaw; this.pitch = 0; this.lift = 0;
  },

  look(dx, dy) {
    this.yaw -= dx * 0.0024;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - dy * 0.0024));
  },

  update(dt, zone) {
    const k = this.keys;
    let f = 0, s = 0;
    if (k.KeyW || k.ArrowUp) f += 1;
    if (k.KeyS || k.ArrowDown) f -= 1;
    if (k.KeyD) s += 1;
    if (k.KeyA) s -= 1;
    if (k.ArrowLeft) this.yaw += 1.9 * dt;
    if (k.ArrowRight) this.yaw -= 1.9 * dt;

    // in the sandbox Space floats you up and Shift floats you down (so you can reach the tops of tall builds);
    // everywhere else Shift is sprint
    const sb = zone.sandbox;
    const building = !!sb && sb.contains(this.x, this.z);
    const shift = !!(k.ShiftLeft || k.ShiftRight);
    const len = Math.hypot(f, s);
    const speed = shift && !building ? 7.2 : 4.4;
    let vx = 0, vz = 0;
    if (len > 0) {
      f /= len; s /= len;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      vx = (fx * f + rx * s) * speed;
      vz = (fz * f + rz * s) * speed;
    }

    // axis-separated so you slide along walls instead of sticking
    const nx = this.x + vx * dt, nz = this.z + vz * dt;
    if (!World.Collide.blocked(zone, nx, this.z, this.radius, this.lift)) this.x = nx;
    if (!World.Collide.blocked(zone, this.x, nz, this.radius, this.lift)) this.z = nz;
    this.lift = sb ? sb.stepLift(this, dt, building ? (k.Space ? 1 : 0) - (shift ? 1 : 0) : -1) : 0;

    const moving = len > 0 ? 1 : 0;
    this.moveAmt += (moving - this.moveAmt) * Math.min(1, dt * 10);
    this.bobT += dt * moving * (speed > 5 ? 1.5 : 1);
  },
};
