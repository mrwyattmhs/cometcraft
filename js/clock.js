/* READING THE CLOCK. Every clock in the game shows the real time, with all twelve hours labelled, and walking up to one and pressing E starts the clock game. This file is all the clock
   knowledge in one place:
     the maths     time -> where the hands point (hourAngle, minuteAngle), and the three levels of the game
     two faces     svg(): the labelled face the game window draws and you set or read;  drawCanvas(): the same face on a canvas, for a clock on a wall
     live()        a clock on a wall that shows the real time, ticking along with a second hand
   The game, in clock-game.js, has three levels:
     Easy    "Show 4 o'clock":  point the SHORT hand at the hour you are asked for (tap the number, drag the hand, or use the arrows)
     Medium  "Point the long hand at 35 minutes":  set the LONG hand to the minute you are asked for (each number is 5 minutes; the ticks are single minutes)
     Hard    "What time does the clock show?":  READ the clock and type the hour and the minutes
   The maths has no DOM, so it is unit tested in Node (tests/clock.test.js). Hands are angles in degrees, clockwise from 12. */
const Clock = (() => {
  const BUILD = 51; // bump together with the ?v= numbers in index.html

  /* ---------- the time ---------- */
  let nowFn = () => new Date();
  /** The time right now. Tests swap it (setNow) to make every clock in the game show a time they choose. */
  const now = () => nowFn();
  const setNow = fn => { nowFn = fn || (() => new Date()); };
  const hourAngle = (h, m = 0, s = 0) => (((h % 12) + m / 60 + s / 3600) * 30) % 360;
  const minuteAngle = (m, s = 0) => ((m + s / 60) * 6) % 360;
  const secondAngle = s => (s * 6) % 360;
  /** { h: 1 to 12, h24, m, s } for a Date (the real time by default). */
  function parts(d = now()) { const h24 = d.getHours(); return { h: h24 % 12 || 12, h24, m: d.getMinutes(), s: d.getSeconds() }; }
  const pad2 = n => String(n).padStart(2, '0');
  /** "4:05" */
  const format = (h, m) => `${h}:${pad2(m)}`;

  /* ---------- the game ---------- */
  const LEVELS = [
    { level: 1, name: 'Easy', mode: 'hour', sample: '3 o\u2019clock', desc: 'Point the short hand at the hour you are asked for' },
    { level: 2, name: 'Medium', mode: 'minute', sample: '35 minutes', desc: 'Point the long hand at the minutes you are asked for' },
    { level: 3, name: 'Hard', mode: 'read', sample: '4:35', desc: 'Read the time the clock shows, and type it' },
  ];
  const levelOf = l => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(Number(l)) || 1)) - 1];
  const between = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  /** A problem: Easy { level, hour }, Medium { level, minute }, Hard { level, hour, minute }. Never the same twice in a row. About half the minutes are on the fives (the easy ones to read). */
  function problem(level, rng = Math.random, last = null) {
    const L = levelOf(level);
    for (let i = 0; i < 40; i++) {
      const fives = rng() < 0.55, p = { level: L.level };
      if (L.level === 1) p.hour = between(rng, 1, 12);
      else if (L.level === 2) p.minute = fives ? 5 * between(rng, 1, 11) : between(rng, 1, 59);
      else { p.hour = between(rng, 1, 12); p.minute = fives ? 5 * between(rng, 0, 11) : between(rng, 0, 59); }
      if (!last || last.hour !== p.hour || last.minute !== p.minute) return p;
    }
    return L.level === 1 ? { level: 1, hour: 3 } : L.level === 2 ? { level: 2, minute: 20 } : { level: 3, hour: 4, minute: 35 };
  }
  /** How many different problems a level can deal. */
  const count = level => [12, 59, 12 * 60][levelOf(level).level - 1];
  const prompt = p => (p.level === 1 ? `Show ${p.hour} o\u2019clock` : p.level === 2 ? `Point the long hand at ${p.minute} minute${p.minute === 1 ? '' : 's'}` : 'What time does the clock show?');
  /** The answer: the hour (Easy), the minute (Medium), or [hour, minute] (Hard). */
  const answerOf = p => (p.level === 1 ? p.hour : p.level === 2 ? p.minute : [p.hour, p.minute]);
  /** Is it right? Easy: the hour (1 to 12). Medium: the minute (60 is the same place as 0). Hard: the hour and the minutes, both. */
  function isCorrect(p, a, b) {
    const whole = v => typeof v === 'number' && Number.isInteger(v);
    if (p.level === 1) return whole(a) && a === p.hour;
    if (p.level === 2) return whole(a) && ((a % 60) + 60) % 60 === p.minute;
    return whole(a) && whole(b) && a === p.hour && b === p.minute;
  }
  /** Where the hand you set starts, never already on the answer: Easy 5 hours on, Medium 20 minutes on. */
  const startValue = p => (p.level === 1 ? (p.hour + 4) % 12 + 1 : p.level === 2 ? (p.minute + 20) % 60 : null);
  /** The hands the picture shows, as angles (null is a hand that is not drawn). value is where the hand you set is now (Easy: the hour, Medium: the minute). */
  function handsFor(p, value) {
    if (p.level === 1) return { hour: hourAngle(value), minute: 0 };                    // the long hand rests at 12: it is o'clock
    if (p.level === 2) return { hour: null, minute: minuteAngle(value) };               // only the long hand: this level is about minutes
    return { hour: hourAngle(p.hour, p.minute), minute: minuteAngle(p.minute) };        // as a real clock would: the short hand creeps toward the next hour
  }
  const numeral = n => n || 12;
  /** The answer as a sentence. */
  function done(p) {
    if (p.level === 1) return `${p.hour} o\u2019clock: the short hand points at the ${p.hour} and the long hand points at the 12.`;
    const k = Math.floor(p.minute / 5), r = p.minute % 5;
    const where = r === 0 ? `points at the ${numeral(k)}` : `is ${r} tick${r > 1 ? 's' : ''} past the ${numeral(k)}`;
    if (p.level === 2) return `${p.minute} minute${p.minute === 1 ? '' : 's'}: the long hand ${where}.`;
    return `${format(p.hour, p.minute)}: the short hand is ${p.minute === 0 ? 'on' : 'past'} the ${p.hour}, and the long hand ${where}.`;
  }
  /** The worked solution, a line at a time (short: it is read in a narrow column). */
  function steps(p) {
    const k = Math.floor((p.minute || 0) / 5), r = (p.minute || 0) % 5, next = p.hour % 12 + 1;
    const mins = p.minute === 0 ? 'it points straight up, at the 12, so there are 0 minutes' : r === 0 ? `it points at the ${numeral(k)}, and ${numeral(k)} \u00d7 5 = ${p.minute}` : `it is ${r} tick${r > 1 ? 's' : ''} past the ${numeral(k)}: ${k * 5} + ${r} = ${p.minute}`;
    if (p.level === 1) return ['The short hand shows the hour.', `On the hour the long hand points straight up, at the 12.`, `So the short hand points at the ${p.hour}.`];
    if (p.level === 2) return ['The long hand shows the minutes.', 'Each number is 5 minutes: 1 is 5, 2 is 10, 3 is 15 ...', `For ${p.minute} minutes: ${mins}.`];
    return [p.minute === 0 ? `The short hand tells the hour: it points right at the ${p.hour}.` : `The short hand tells the hour: it is between the ${p.hour} and the ${next}, so the hour is ${p.hour}.`,
      `The long hand tells the minutes: ${mins}.`, `So the time is ${format(p.hour, p.minute)}.`];
  }

  /* ---------- the face for the game window: SVG, every hour labelled ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  /** The clock as SVG text (300 wide): a cream face, 60 ticks, the numerals 1 to 12 (each tappable: data-num), and the hands as groups (data-hand) that turn about the centre. hour and minute
      are angles (or null to leave a hand out). */
  function svg({ hour = null, minute = null, label = 'A clock' } = {}) {
    const c = 150, ticks = [], nums = [];
    for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30, big = i % 5 === 0, r1 = big ? 119 : 126, x = Math.sin(a), y = -Math.cos(a); ticks.push(`<line x1="${(c + x * r1).toFixed(2)}" y1="${(c + y * r1).toFixed(2)}" x2="${(c + x * 134).toFixed(2)}" y2="${(c + y * 134).toFixed(2)}" stroke="#2a2a2a" stroke-width="${big ? 4 : 1.6}" stroke-linecap="round"/>`); }
    for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6, x = c + Math.sin(a) * 98, y = c - Math.cos(a) * 98; nums.push(`<g class="clk-numeral" data-num="${n}"><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="19" fill="transparent"/><text x="${x.toFixed(2)}" y="${(y + 1).toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-family="Nunito, Arial, sans-serif" font-size="30" font-weight="800" fill="#1d1d1d">${n}</text></g>`); }
    const hand = (cls, which, angle, len, w) => (angle === null ? '' : `<g class="clk-hand ${cls}" data-hand="${which}" pointer-events="none" transform="rotate(${angle.toFixed(2)} ${c} ${c})"><line x1="${c}" y1="${c + 12}" x2="${c}" y2="${c - len}" stroke-width="${w}" stroke-linecap="round"/></g>`);
    return `<svg class="clk-svg" viewBox="0 0 300 300" xmlns="${NS}" role="group" aria-label="${label}"><circle cx="150" cy="150" r="144" fill="#f7f1d8" stroke="#2a2a2a" stroke-width="7"/>${ticks.join('')}${nums.join('')}` +
      `${hand('clk-hour', 'hour', hour, 70, 12)}${hand('clk-minute', 'minute', minute, 108, 7)}<circle cx="150" cy="150" r="9" fill="#2a2a2a"/></svg>`;
  }

  /* ---------- the face for a clock on a wall: the same face, drawn on a canvas, with a second hand ---------- */
  /** Draw a clock face on a canvas context: cv is the canvas (square). d is { h, m, s } (1 to 12, minutes, seconds), or null for no hands. */
  function drawCanvas(c, cv, d) {
    const R = cv.width / 2, at = (a, r) => [R + Math.sin(a * Math.PI / 180) * r, R - Math.cos(a * Math.PI / 180) * r];
    c.clearRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#f7f1d8'; c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2a2a2a'; c.lineWidth = R * 0.05; c.stroke(); c.lineCap = 'round';
    for (let i = 0; i < 60; i++) { const big = i % 5 === 0, [x1, y1] = at(i * 6, R * (big ? 0.83 : 0.88)), [x2, y2] = at(i * 6, R * 0.93); c.lineWidth = R * (big ? 0.035 : 0.012); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
    c.fillStyle = '#1d1d1d'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${Math.round(R * 0.22)}px Arial, sans-serif`;
    for (let n = 1; n <= 12; n++) { const [x, y] = at(n * 30, R * 0.68); c.fillText(String(n), x, y + R * 0.01); }
    if (!d) return;
    const hand = (a, r, w, color) => { const [x, y] = at(a, r), [bx, by] = at(a + 180, R * 0.1); c.strokeStyle = color; c.lineWidth = R * w; c.beginPath(); c.moveTo(bx, by); c.lineTo(x, y); c.stroke(); };
    hand(hourAngle(d.h, d.m, d.s), R * 0.48, 0.075, '#1d1d1d'); hand(minuteAngle(d.m, d.s), R * 0.74, 0.05, '#1d1d1d'); hand(secondAngle(d.s), R * 0.82, 0.02, '#c0392b');
    c.fillStyle = '#1d1d1d'; c.beginPath(); c.arc(R, R, R * 0.06, 0, Math.PI * 2); c.fill();
  }
  /** A clock on a wall that shows the REAL time (Clock.now()), redrawn each second while its room is on screen. opts: { x, y, z, rotY, size } in the room's own coordinates. Returns the mesh;
      mesh.userData.shown is the time it last drew ({ h, m, s }), which is what tests read. Every clock in the game is made this way. */
  function live(zone, { x, y, z, rotY = 0, size = 1.3, ppu = 100 }) {
    const T = THREE, cv = document.createElement('canvas'); cv.width = cv.height = Math.round(size * ppu);
    const tex = new T.CanvasTexture(cv); tex.anisotropy = 4;
    const mesh = new T.Mesh(new T.PlaneGeometry(size, size), new T.MeshBasicMaterial({ map: tex, transparent: true }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotY; mesh.userData.kind = 'clock'; zone.group.add(mesh);
    let lastSecond = -1;
    function redraw() { const d = parts(), key = Math.floor(now().getTime() / 1000); if (key === lastSecond) return; lastSecond = key; drawCanvas(cv.getContext('2d'), cv, d); tex.needsUpdate = true; mesh.userData.shown = { h: d.h, m: d.m, s: d.s }; }
    redraw(); zone.animated.push(redraw);
    return mesh;
  }

  return { BUILD, LEVELS, now, setNow, parts, hourAngle, minuteAngle, secondAngle, format, levelOf, problem, count, prompt, answerOf, isCorrect, startValue, handsFor, done, steps, svg, drawCanvas, live };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Clock;
