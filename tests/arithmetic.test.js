// Run with: node tests/arithmetic.test.js
const assert = require('assert');
const A = require('../js/arithmetic.js');

const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

// the rules in numbers
assert.strictEqual(A.DURATION_MS, 60000, 'a round is 60 seconds');
assert.strictEqual(A.REWARD, 1, 'one chip per correct answer');
assert.deepStrictEqual([A.LOW, A.HIGH], [1, 10]);
assert.deepStrictEqual(Object.keys(A.OPS), ['add', 'sub', 'mul', 'div']);
assert.deepStrictEqual(Object.values(A.OPS).map(o => o.symbol), ['+', '-', '×', '÷']);
assert.deepStrictEqual(Object.values(A.OPS).map(o => o.table), ['ADDITION TABLE', 'SUBTRACTION TABLE', 'MULTIPLICATION TABLE', 'DIVISION TABLE']);
Object.values(A.OPS).forEach(o => assert.ok(o.rule && o.name && o.table));
assert.throws(() => A.problem('pow'), /unknown/);
assert.throws(() => A.createRound('pow'), /unknown/);

// problems: both numbers 1-10, the right answer, bigger first for subtraction, never a repeat
const rng = seeded(11);
const seen = { add: new Set(), sub: new Set(), mul: new Set(), div: new Set() };
for (const op of ['add', 'sub', 'mul']) {
  let prev = null;
  for (let i = 0; i < 20000; i++) {
    const p = A.problem(op, rng, prev);
    assert.strictEqual(p.op, op);
    assert.ok(Number.isInteger(p.a) && Number.isInteger(p.b) && p.a >= 1 && p.a <= 10 && p.b >= 1 && p.b <= 10, `${p.a}, ${p.b} are from 1 to 10`);
    if (op === 'add') assert.strictEqual(p.answer, p.a + p.b);
    if (op === 'sub') { assert.ok(p.a >= p.b, 'the bigger number comes first'); assert.strictEqual(p.answer, p.a - p.b); assert.ok(p.answer >= 0 && p.answer <= 9, 'no negative answers'); }
    if (op === 'mul') assert.strictEqual(p.answer, p.a * p.b);
    if (prev) assert.ok(p.a !== prev.a || p.b !== prev.b, 'never the same problem twice in a row');
    seen[op].add(`${p.a},${p.b}`);
    prev = p;
  }
}
assert.strictEqual(seen.add.size, 100, 'every pair of numbers from 1 to 10 comes up in addition');
assert.strictEqual(seen.mul.size, 100, 'and in multiplication');
assert.strictEqual(seen.sub.size, 55, 'every bigger-first pair comes up in subtraction');

// division: always a times-table fact turned around, so it always comes out even
{
  const rngD = seeded(23); let prev = null; const quotients = new Set(), divisors = new Set(), dividends = new Set();
  for (let i = 0; i < 30000; i++) {
    const p = A.problem('div', rngD, prev);
    assert.strictEqual(p.op, 'div'); assert.strictEqual(p.symbol, '÷');
    assert.ok(Number.isInteger(p.a) && Number.isInteger(p.b) && Number.isInteger(p.answer));
    assert.strictEqual(p.a % p.b, 0, `${p.a} ÷ ${p.b} comes out even`);
    assert.strictEqual(p.answer, p.a / p.b, 'the answer is the exact quotient');
    assert.ok(p.answer >= 1 && p.answer <= 10, `the answer ${p.answer} is from 1 to 10`);
    assert.ok(p.b >= 2 && p.b <= 10, `the divisor ${p.b} is from 2 to 10: never divide by 1`);
    assert.ok(p.a >= 2 && p.a <= 100, 'the dividend is a times-table product');
    assert.strictEqual(p.answer * p.b, p.a, 'multiplying back gives the dividend');
    if (prev) assert.ok(p.a !== prev.a || p.b !== prev.b, 'never the same problem twice in a row');
    seen.div.add(`${p.a},${p.b}`); quotients.add(p.answer); divisors.add(p.b); dividends.add(p.a);
    prev = p;
  }
  assert.strictEqual(seen.div.size, 90, 'every one of the 9 divisors x 10 answers comes up (90 problems)');
  assert.deepStrictEqual([...quotients].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepStrictEqual([...divisors].sort((a, b) => a - b), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  // each divisor is about equally likely (the 2 is not favored just because 1 is skipped)
  const count = {}; const rngC = seeded(31);
  for (let i = 0; i < 18000; i++) { const p = A.problem('div', rngC, null); count[p.b] = (count[p.b] || 0) + 1; }
  Object.values(count).forEach(n => assert.ok(n > 1700 && n < 2300, `divisors are evenly spread (${n} of 18000)`));
  // the rule text tells students what to expect
  assert.ok(/times-table/.test(A.OPS.div.rule) && /whole number/.test(A.OPS.div.rule) && /never divide by 1/.test(A.OPS.div.rule));
  // a full division round: right answers score, wrong ones do not, a decimal is not accepted
  const rd = A.createRound('div', { rng: seeded(9) }); rd.start(0);
  const first = rd.current;
  assert.deepStrictEqual({ ...rd.submit('2.5', 10) }, { ignored: true }, 'a decimal answer is ignored, not marked wrong');
  assert.strictEqual(rd.current, first, 'and you stay on the same problem');
  assert.strictEqual(rd.submit(String(first.answer), 20).ok, true);
  const second = rd.current; assert.strictEqual(rd.submit(String(second.answer + 1), 30).ok, false);
  const sum = rd.summary(); assert.deepStrictEqual([sum.correct, sum.attempts, sum.chips, sum.missed.length], [1, 2, 1, 1]);
  assert.strictEqual(sum.missed[0].symbol, '÷');
}
// a stuck random source still terminates
assert.strictEqual(A.problem('add', () => 0, { a: 1, b: 1 }).answer, 2);

// a full round, driven by a fake clock
const round = A.createRound('add', { rng: seeded(5) });
assert.strictEqual(round.phase, 'ready');
assert.strictEqual(round.remaining(0), 60000);
assert.strictEqual(round.current, null, 'no problem until you press start');
assert.deepStrictEqual(round.submit('5', 100), { late: true }, 'nothing counts before start');
round.start(1000);
assert.strictEqual(round.phase, 'running');
assert.ok(round.current && round.current.op === 'add');
assert.strictEqual(round.remaining(1000), 60000);
assert.strictEqual(round.remaining(31000), 30000);
assert.strictEqual(round.remaining(61000), 0);
assert.strictEqual(round.tick(60999), 'running', 'one millisecond left is still running');
assert.strictEqual(round.tick(61000), 'done');
const r2 = A.createRound('add', { rng: seeded(5) });
r2.start(0);

// answering: right answers score, wrong ones don't, and either way you move on
let t = 0;
const solve = (r, right = true) => {
  const cur = r.current;
  const text = String(right ? cur.answer : cur.answer + 1);
  const res = r.submit(text, t += 700);
  return { cur, res };
};
let { cur, res } = solve(r2, true);
assert.deepStrictEqual([res.ok, res.given, res.problem.answer], [true, cur.answer, cur.answer]);
assert.strictEqual(r2.correct, 1);
assert.ok(r2.current !== cur && (r2.current.a !== cur.a || r2.current.b !== cur.b), 'a new problem comes up');
({ cur, res } = solve(r2, false));
assert.strictEqual(res.ok, false);
assert.strictEqual(r2.correct, 1, 'a wrong answer earns nothing');
assert.strictEqual(r2.missed.length, 1);
assert.deepStrictEqual([r2.missed[0].a, r2.missed[0].b, r2.missed[0].answer, r2.missed[0].given], [cur.a, cur.b, cur.answer, cur.answer + 1]);
assert.strictEqual(r2.attempts, 2);
assert.ok(r2.current.a !== cur.a || r2.current.b !== cur.b, 'and you move on to the next one');
// nothing to check: nothing changes
const before = { c: r2.correct, a: r2.attempts, p: r2.current };
for (const junk of ['', '   ', 'abc', '-3', '3.5', '1234', '4 5', '+5']) assert.deepStrictEqual(r2.submit(junk, t += 10), { ignored: true }, `"${junk}" is ignored`);
assert.deepStrictEqual([r2.correct, r2.attempts, r2.current], [before.c, before.a, before.p], 'ignored input changes nothing, and the problem stays');
// typed answers can have leading zeros or spaces
const lead = r2.current; assert.strictEqual(r2.submit(` 0${lead.answer} `, t += 10).ok, true);

// a 60-second sprint at one answer a second: exactly 60 chances, the last one at the buzzer is too late
const sprint = A.createRound('mul', { rng: seeded(99) });
sprint.start(0);
let correct = 0;
for (let s = 1; s <= 70; s++) {
  const res = sprint.submit(String(sprint.current ? sprint.current.answer : 0), s * 1000);
  if (res.late) { assert.ok(s >= 60, 'only after the time is up'); continue; }
  assert.ok(s <= 59, `answer ${s} at ${s}s counted`);
  if (res.ok) correct++;
}
assert.strictEqual(correct, 59, 'answers at 1s..59s count; the one at exactly 60s is late');
assert.strictEqual(sprint.phase, 'done');
assert.deepStrictEqual(sprint.submit('1', 99999), { late: true }, 'nothing counts after time is up');
const sum = sprint.summary();
assert.deepStrictEqual([sum.correct, sum.attempts, sum.chips, sum.accuracy, sum.missed.length], [59, 59, 59, 1, 0]);
assert.strictEqual(sum.chips, sum.correct * A.REWARD, 'one chip per correct answer');

// subtraction and multiplication rounds work the same way
for (const op of ['sub', 'mul']) {
  const rr = A.createRound(op, { rng: seeded(3) }); rr.start(0);
  for (let i = 1; i <= 5; i++) assert.strictEqual(rr.submit(String(rr.current.answer), i * 100).ok, true);
  assert.strictEqual(rr.correct, 5);
  assert.strictEqual(rr.summary().chips, 5);
}
// a short custom round ends on time
const short = A.createRound('add', { durationMs: 5000, rng: seeded(1) }); short.start(0);
assert.strictEqual(short.remaining(2000), 3000); assert.strictEqual(short.tick(5000), 'done');
// seeded rounds are reproducible
const seq = seed => { const r = A.createRound('add', { rng: seeded(seed) }); r.start(0); const out = []; for (let i = 0; i < 8; i++) { out.push(r.current.answer); r.submit(String(r.current.answer), i + 1); } return out.join(); };
assert.strictEqual(seq(7), seq(7));
assert.notStrictEqual(seq(7), seq(8));

// ---- the save state: best scores and earning ----
function freshStore(saved) {
  const storage = {};
  if (saved !== undefined) storage['primetime.save.v1'] = JSON.stringify(saved);
  global.localStorage = { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); } };
  delete require.cache[require.resolve('../js/store.js')];
  return { S: require('../js/store.js'), storage };
}
let { S, storage } = freshStore();
assert.deepStrictEqual({ ...S.get().arithBest }, { add: 0, sub: 0, mul: 0, div: 0 });
assert.strictEqual(S.recordBest('add', 0), false, 'a score of zero is not a best');
assert.strictEqual(S.recordBest('add', 12), true); assert.strictEqual(S.get().arithBest.add, 12);
assert.strictEqual(S.recordBest('add', 12), false, 'tying is not a new best');
assert.strictEqual(S.recordBest('add', 9), false);
assert.strictEqual(S.recordBest('mul', 7), true);
assert.deepStrictEqual({ ...S.get().arithBest }, { add: 12, sub: 0, mul: 7, div: 0 }, 'each table keeps its own');
assert.strictEqual(S.recordBest('div', 9), true); assert.strictEqual(S.get().arithBest.div, 9, 'division has its own best');
assert.strictEqual(S.recordBest('div', 9), false); assert.strictEqual(S.recordBest('div', 4), false, 'only a higher score counts');
assert.deepStrictEqual({ ...S.get().arithBest }, { add: 12, sub: 0, mul: 7, div: 9 });
assert.strictEqual(S.recordBest('div', 5), false); assert.strictEqual(S.recordBest('sub', 2.5), false);
assert.ok(JSON.parse(storage['primetime.save.v1']).arithBest.add === 12, 'saved');
// earning adds exactly what was earned, even from zero chips (no 10-chip floor)
S.set({ chips: 0 });
assert.strictEqual(S.earn(1), true); assert.strictEqual(S.get().chips, 1, 'a first +1 is +1, not +10');
assert.strictEqual(S.earn(1), true); assert.strictEqual(S.get().chips, 2);
assert.strictEqual(S.earn(0), false); assert.strictEqual(S.earn(-3), false); assert.strictEqual(S.earn(1.5), false);
assert.strictEqual(S.get().chips, 2);
// old saves gain best scores of zero, damaged ones are repaired
({ S } = freshStore({ chips: 321, owned: ['hat-cap-red'] }));
assert.deepStrictEqual({ ...S.get().arithBest }, { add: 0, sub: 0, mul: 0, div: 0 }); assert.strictEqual(S.get().chips, 321);
({ S } = freshStore({ arithBest: { add: 14, sub: 'lots', mul: -3, extra: 1 } }));
assert.deepStrictEqual({ ...S.get().arithBest }, { add: 14, sub: 0, mul: 0, div: 0 });
// a save from before division existed keeps its scores and starts division at 0
({ S } = freshStore({ chips: 77, arithBest: { add: 31, sub: 22, mul: 18 } }));
assert.deepStrictEqual({ ...S.get().arithBest }, { add: 31, sub: 22, mul: 18, div: 0 }, 'an old save gains a division score of 0 and loses nothing'); assert.strictEqual(S.get().chips, 77);
({ S } = freshStore({ arithBest: 'nope' }));
assert.deepStrictEqual({ ...S.get().arithBest }, { add: 0, sub: 0, mul: 0, div: 0 });

console.log('arithmetic tests passed');
