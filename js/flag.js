/* The flag of the United States, drawn to the official specification (Executive Order 10834, 1959):
   proportions are in units of the flag's hoist (its height) = 1.

     length (fly)           1.9
     13 stripes             each 1/13 tall, red first and red last (7 red, 6 white)
     the blue union         7 stripes tall (7/13 = 0.5385) and 0.76 wide, in the upper corner by the staff
     50 white stars         nine rows that alternate 6 and 5 stars, points up, each 0.0616 across

   Stars sit on a grid: rows at 1/10 steps of the union's height, columns at 1/12 steps of its width (the six-star rows
   use the odd columns 1, 3, 5, 7, 9, 11 and the five-star rows the even ones 2, 4, 6, 8, 10).

   HANGING IT: the US Flag Code (4 U.S.C. 7(i)) says that against a wall, horizontally or vertically, "the union
   should be uppermost and to the flag's own right, that is, to the observer's left." So a flag on a wall is drawn with the
   blue field in the observer's upper left, which is how this picture is laid out: the blue field is at the top left of the
   image. Whoever places it has to face the picture toward the room without mirroring it. */
const Flag = (() => {
  const SPEC = {
    hoist: 1, fly: 1.9, stripes: 13,
    union: { hoist: 7 / 13, fly: 0.76 },
    starDiameter: 0.0616, starRows: 9, starRowCounts: [6, 5, 6, 5, 6, 5, 6, 5, 6],
  };
  const COLORS = { red: '#B22234', white: '#FFFFFF', blue: '#3C3B6E' };   // Old Glory Red, White, Old Glory Blue

  /** The 50 star centers, in flag units measured from the union's top-left corner. */
  function stars() {
    const C = SPEC.union.hoist, D = SPEC.union.fly, out = [];
    SPEC.starRowCounts.forEach((count, row) => {
      for (let k = 0; k < count; k++) {
        const column = count === 6 ? 2 * k + 1 : 2 * k + 2;     // odd columns for six-star rows, even for five-star rows
        out.push({ x: column * D / 12, y: (row + 1) * C / 10, row });
      }
    });
    return out;
  }

  /** A five-pointed star with one point straight up: outer radius R, inner radius R times 0.38197 (a regular pentagram). */
  function star(ctx, cx, cy, R) {
    const r = R * 0.381966;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** Draw the flag filling a w x h canvas (w should be 1.9 x h). The union is in the top-left corner. */
  function draw(ctx, w, h) {
    const stripe = h / SPEC.stripes;
    for (let i = 0; i < SPEC.stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? COLORS.red : COLORS.white;
      ctx.fillRect(0, i * stripe, w, stripe + (i < SPEC.stripes - 1 ? 0.6 : 0));   // a hair of overlap so no seam shows
    }
    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(0, 0, SPEC.union.fly * h, SPEC.union.hoist * h);
    ctx.fillStyle = COLORS.white;
    stars().forEach(s => star(ctx, s.x * h, s.y * h, SPEC.starDiameter * h / 2));
  }

  return { SPEC, COLORS, stars, draw };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Flag;
