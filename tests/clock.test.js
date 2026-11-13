// Run with: node tests/clock.test.js
const assert = require('assert');
const C = require('../js/clock.js');
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

/* ---------- where the hands point ---------- */
near(C.hourAngle(12), 0, '12:00'); near(C.hourAngle(3), 90, '3:00'); near(C.hourAngle(6), 180, '6:00'); near(C.hourAngle(9), 270, '9:00'); near(C.hourAngle(4, 30), 135, '4:30: halfway from the 4 to the 5'); near(C.hourAngle(12, 30), 15, '12:30'); near(C.hourAngle(11, 59, 59), 359.99166666666667, '11:59:59');
near(C.minuteAngle(0), 0, ':00'); near(C.minuteAngle(15), 90, ':15'); near(C.minuteAngle(30), 180, ':30'); near(C.minuteAngle(35), 210, ':35 is at the 7'); near(C.minuteAngle(59), 354, ':59'); near(C.minuteAngle(0, 30), 3, 'half way through the first minute'); near(C.secondAngle(45), 270, '45 s');
for (let h = 1; h <= 12; h++) for (let m = 0; m < 60; m++) { const a = C.hourAngle(h, m); assert.ok(a >= 0 && a < 360, `${h}:${m} hour angle in range`); if (m === 0) near(a, (h % 12) * 30, `${h}:00 sits exactly on its number`); }
for (let m = 0; m < 60; m += 5) near(C.minuteAngle(m), (m / 5) * 30, `minute ${m} is on number ${m / 5 || 12}`);

/* ---------- the time of a Date ---------- */
assert.deepStrictEqual(C.parts(new Date(2026, 10, 12, 16, 35, 10)), { h: 4, h24: 16, m: 35, s: 10 }); assert.deepStrictEqual(C.parts(new Date(2026, 0, 1, 0, 5, 0)), { h: 12, h24: 0, m: 5, s: 0 }, 'midnight is 12'); assert.strictEqual(C.parts(new Date(2026, 0, 1, 12, 0, 0)).h, 12, 'noon is 12'); assert.strictEqual(C.parts(new Date(2026, 0, 1, 13, 0, 0)).h, 1);
assert.strictEqual(C.format(4, 5), '4:05'); assert.strictEqual(C.format(12, 0), '12:00'); assert.strictEqual(C.format(9, 59), '9:59');
{ const d = new Date(2026, 5, 5, 7, 7, 7); C.setNow(() => d); assert.strictEqual(C.now(), d, 'the time can be set (tests do)'); assert.strictEqual(C.parts().h, 7); C.setNow(); assert.ok(Math.abs(C.now().getTime() - Date.now()) < 1000, 'and put back to the real time'); }

/* ---------- the levels and their problems ---------- */
assert.deepStrictEqual(C.LEVELS.map(l => [l.level, l.name, l.mode]), [[1, 'Easy', 'hour'], [2, 'Medium', 'minute'], [3, 'Hard', 'read']]); assert.ok(C.LEVELS.every(l => l.sample && l.desc)); assert.strictEqual(C.levelOf(9).level, 3); assert.strictEqual(C.levelOf(0).level, 1); assert.strictEqual(C.levelOf('x').level, 1);
assert.deepStrictEqual([1, 2, 3].map(C.count), [12, 59, 720]);
for (const L of C.LEVELS) {
  const rng = seeded(120 + L.level); let last = null; const seen = new Set(); let fives = 0, n = 20000;
  for (let i = 0; i < n; i++) {
    const p = C.problem(L.level, rng, last); last = p; seen.add(`${p.hour}:${p.minute}`); assert.strictEqual(p.level, L.level);
    if (L.level === 1) assert.ok(Number.isInteger(p.hour) && p.hour >= 1 && p.hour <= 12 && p.minute === undefined); if (L.level === 2) assert.ok(Number.isInteger(p.minute) && p.minute >= 1 && p.minute <= 59 && p.hour === undefined);
    if (L.level === 3) assert.ok(p.hour >= 1 && p.hour <= 12 && p.minute >= 0 && p.minute <= 59 && Number.isInteger(p.hour) && Number.isInteger(p.minute)); if (L.level > 1 && p.minute % 5 === 0) fives++;
    assert.ok(C.isCorrect(p, ...[].concat(C.answerOf(p)))); assert.ok(C.prompt(p).length > 5); assert.strictEqual(C.steps(p).length, 3); assert.ok(C.done(p).length > 10);
    const s = C.startValue(p); if (L.level === 1) { assert.ok(s >= 1 && s <= 12 && s !== p.hour, 'the hand you set never starts on the answer'); } if (L.level === 2) assert.ok(s >= 0 && s <= 59 && s !== p.minute); if (L.level === 3) assert.strictEqual(s, null);
  }
  assert.strictEqual(seen.size, C.count(L.level), `${L.name}: every problem turns up`); if (L.level > 1) assert.ok(fives / n > 0.5 && fives / n < 0.7, `about half the minutes are on the fives (${(fives / n).toFixed(2)})`);
  const r2 = seeded(5); let l2 = null; for (let i = 0; i < 3000; i++) { const p = C.problem(L.level, r2, l2); assert.ok(!l2 || p.hour !== l2.hour || p.minute !== l2.minute, 'never the same twice in a row'); l2 = p; } assert.deepStrictEqual(C.problem(L.level, seeded(9)), C.problem(L.level, seeded(9)));
}

/* ---------- what is asked, and what is right ---------- */
assert.strictEqual(C.prompt({ level: 1, hour: 4 }), 'Show 4 o\u2019clock'); assert.strictEqual(C.prompt({ level: 2, minute: 35 }), 'Point the long hand at 35 minutes'); assert.strictEqual(C.prompt({ level: 2, minute: 1 }), 'Point the long hand at 1 minute'); assert.strictEqual(C.prompt({ level: 3, hour: 4, minute: 35 }), 'What time does the clock show?');
const e = { level: 1, hour: 4 }, m = { level: 2, minute: 35 }, h = { level: 3, hour: 4, minute: 35 }, h0 = { level: 3, hour: 12, minute: 0 };
assert.ok(C.isCorrect(e, 4) && !C.isCorrect(e, 5) && !C.isCorrect(e, 16) && !C.isCorrect(e, 4.5) && !C.isCorrect(e, '4') && !C.isCorrect(e, NaN) && !C.isCorrect(e, undefined));
assert.ok(C.isCorrect(m, 35) && !C.isCorrect(m, 34) && !C.isCorrect(m, 7) && !C.isCorrect(m, 36) && C.isCorrect({ level: 2, minute: 30 }, 30) && !C.isCorrect(m, '35') && !C.isCorrect(m, 35.5), '7 is the number, not the minute');
assert.ok(C.isCorrect({ level: 2, minute: 5 }, 65) === true && C.isCorrect({ level: 2, minute: 5 }, -55) === true, 'a hand that has gone round is on the same place');
assert.ok(C.isCorrect(h, 4, 35) && !C.isCorrect(h, 5, 35) && !C.isCorrect(h, 4, 34) && !C.isCorrect(h, 35, 4) && !C.isCorrect(h, 4) && !C.isCorrect(h, 4, '35') && !C.isCorrect(h, 4, NaN) && !C.isCorrect(h, 16, 35), 'both, and in the right boxes');
assert.ok(C.isCorrect(h0, 12, 0) && !C.isCorrect(h0, 0, 0) && !C.isCorrect(h0, 12, 60));
assert.strictEqual(C.answerOf(e), 4); assert.strictEqual(C.answerOf(m), 35); assert.deepStrictEqual(C.answerOf(h), [4, 35]);

/* ---------- the hands the picture shows ---------- */
assert.deepStrictEqual(C.handsFor(e, 4), { hour: 120, minute: 0 }); assert.deepStrictEqual(C.handsFor(e, 12), { hour: 0, minute: 0 }, 'the 12 is straight up'); assert.deepStrictEqual(C.handsFor(m, 35), { hour: null, minute: 210 }, 'Medium draws only the long hand');
{ const a = C.handsFor(h, null); near(a.hour, 4 * 30 + 35 / 2, 'the short hand is part-way to the 5 at 4:35'); near(a.minute, 210, 'the long hand is at the 7'); } { const a = C.handsFor({ level: 3, hour: 12, minute: 45 }, null); near(a.hour, 22.5, '12:45: the short hand has moved on from the 12'); }
assert.strictEqual(C.startValue({ level: 1, hour: 4 }), 9); assert.strictEqual(C.startValue({ level: 1, hour: 12 }), 5); assert.strictEqual(C.startValue({ level: 2, minute: 35 }), 55); assert.strictEqual(C.startValue({ level: 2, minute: 50 }), 10);

/* ---------- the explanations ---------- */
assert.strictEqual(C.done(e), '4 o\u2019clock: the short hand points at the 4 and the long hand points at the 12.'); assert.strictEqual(C.done(m), '35 minutes: the long hand points at the 7.'); assert.strictEqual(C.done({ level: 2, minute: 33 }), '33 minutes: the long hand is 3 ticks past the 6.');
assert.strictEqual(C.done({ level: 2, minute: 1 }), '1 minute: the long hand is 1 tick past the 12.', 'one minute, not one minutes'); assert.strictEqual(C.done({ level: 2, minute: 2 }), '2 minutes: the long hand is 2 ticks past the 12.'); assert.strictEqual(C.done(h), '4:35: the short hand is past the 4, and the long hand points at the 7.'); assert.strictEqual(C.done(h0), '12:00: the short hand is on the 12, and the long hand points at the 12.');
assert.strictEqual(C.done({ level: 3, hour: 9, minute: 52 }), '9:52: the short hand is past the 9, and the long hand is 2 ticks past the 10.');
assert.deepStrictEqual(C.steps(h), ['The short hand tells the hour: it is between the 4 and the 5, so the hour is 4.', 'The long hand tells the minutes: it points at the 7, and 7 \u00d7 5 = 35.', 'So the time is 4:35.']);
assert.strictEqual(C.steps({ level: 3, hour: 12, minute: 20 })[0], 'The short hand tells the hour: it is between the 12 and the 1, so the hour is 12.'); assert.strictEqual(C.steps(h0)[0], 'The short hand tells the hour: it points right at the 12.'); assert.strictEqual(C.steps(h0)[1], 'The long hand tells the minutes: it points straight up, at the 12, so there are 0 minutes.', 'on the hour: no confusing 12 \u00d7 5');
assert.strictEqual(C.steps({ level: 3, hour: 3, minute: 33 })[1], 'The long hand tells the minutes: it is 3 ticks past the 6: 30 + 3 = 33.'); assert.deepStrictEqual(C.steps(e), ['The short hand shows the hour.', 'On the hour the long hand points straight up, at the 12.', 'So the short hand points at the 4.']); assert.strictEqual(C.steps(m)[1], 'Each number is 5 minutes: 1 is 5, 2 is 10, 3 is 15 ...');
for (const L of C.LEVELS) { const rng = seeded(7); for (let i = 0; i < 400; i++) assert.ok(C.steps(C.problem(L.level, rng)).every(t => t.length <= 100), 'each step fits a narrow column'); }

/* ---------- the labelled SVG face ---------- */
{ const s = C.svg({ hour: 120, minute: 0 }), nums = [...s.matchAll(/data-num="(\d+)"/g)].map(x => Number(x[1]));
  assert.ok(s.startsWith('<svg ') && s.endsWith('</svg>') && s.includes('viewBox="0 0 300 300"')); assert.strictEqual((s.match(/pointer-events="none"/g) || []).length, 2, 'the hands let clicks through to the numbers under them (on Easy the long hand rests on the 12)'); assert.deepStrictEqual(nums, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'every hour is labelled, 1 to 12'); assert.deepStrictEqual([...s.matchAll(/<text[^>]*>(\d+)<\/text>/g)].map(x => Number(x[1])), nums, 'with its number written on the face');
  assert.strictEqual((s.match(/<line x1/g) || []).length, 60 + 2, '60 ticks and two hands'); assert.strictEqual((s.match(/stroke-width="4"/g) || []).length, 12, 'twelve bigger ticks, one at each hour'); assert.ok(s.includes('data-hand="hour" pointer-events="none" transform="rotate(120.00 150 150)"') && s.includes('data-hand="minute" pointer-events="none" transform="rotate(0.00 150 150)"') && !/NaN|undefined|null/.test(s));
  const only = C.svg({ hour: null, minute: 210 }); assert.ok(!only.includes('data-hand="hour"') && only.includes('data-hand="minute" pointer-events="none" transform="rotate(210.00 150 150)"'), 'a hand left out is not drawn'); assert.ok(C.svg({ label: 'Clock A' }).includes('aria-label="Clock A"') && !C.svg().includes('data-hand'), 'no hands at all if none are given'); }

/* ---------- the canvas face for a wall: every hour labelled, every hand where the time says (a recording stand-in for the canvas) ---------- */
function recorder() { const log = { text: [], lines: [], arcs: 0 }, ctx = { _p: null, clearRect() {}, beginPath() {}, arc() { log.arcs++; }, fill() {}, stroke() {}, fillText(t, x, y) { log.text.push([t, x, y]); }, moveTo(x, y) { this._p = [x, y]; }, lineTo(x, y) { log.lines.push({ from: this._p, to: [x, y], width: this.lineWidth, color: this.strokeStyle }); } }; return { log, ctx }; }
{ const cv = { width: 200, height: 200 }, R = 100, { log, ctx } = recorder(); C.drawCanvas(ctx, cv, { h: 4, m: 35, s: 10 });
  assert.deepStrictEqual(log.text.map(t => t[0]), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], 'the wall clock labels every hour'); assert.strictEqual(log.lines.length, 60 + 3, '60 ticks and three hands'); const angleOf = ([x, y]) => (Math.atan2(x - R, R - y) * 180 / Math.PI + 360) % 360;
  const [hr, mn, sc] = log.lines.slice(60); near(angleOf(hr.to), C.hourAngle(4, 35, 10), 'the short hand points where 4:35:10 says'); near(angleOf(mn.to), C.minuteAngle(35, 10), 'the long hand'); near(angleOf(sc.to), 60, 'the second hand (10 s)'); assert.ok(Math.hypot(hr.to[0] - R, hr.to[1] - R) < Math.hypot(mn.to[0] - R, mn.to[1] - R), 'the short hand is shorter'); assert.strictEqual(sc.color, '#c0392b', 'the second hand is red');
  const twelve = log.text.find(t => t[0] === '12'), six = log.text.find(t => t[0] === '6'), three = log.text.find(t => t[0] === '3'); assert.ok(twelve[2] < six[2] && three[1] > twelve[1], '12 is at the top, 6 at the bottom, 3 on the right'); const bare = recorder(); C.drawCanvas(bare.ctx, cv, null); assert.strictEqual(bare.log.lines.length, 60, 'no hands without a time'); }
console.log('clock tests passed');
