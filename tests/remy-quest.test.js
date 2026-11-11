// Run with: node tests/remy-quest.test.js
const assert = require('assert');
const Q = require('../js/remy-quest.js');
const NONE = { step: 'none', answers: 0 };

/* ---------- the numbers and the words that were asked for ---------- */
assert.strictEqual(Q.PETS_TO_START, 10, 'the tenth pet starts it'); assert.strictEqual(Q.ANSWERS, 5); assert.strictEqual(Q.REWARD, 250);
assert.deepStrictEqual(Q.STEPS, ['none', 'find', 'wash', 'vet', 'answers', 'report', 'visit', 'done']);
assert.strictEqual(Q.message('start', NONE).title, "Remy's eyeball fell out!", 'the exact words on the tenth pet');
assert.strictEqual(Q.OK_LINE, 'Remy is ok, she will get used to one eye.'); assert.strictEqual(Q.message('ok', { step: 'visit', answers: 5 }).text, Q.OK_LINE, 'the exact words at the Pet Corner, and nothing else');

/* ---------- petting: nothing for nine pets, the quest on the tenth ---------- */
for (let n = 1; n <= 9; n++) { const r = Q.pet(NONE, n); assert.deepStrictEqual([r.event, r.q.step], ['purr', 'none'], `pet ${n} just purrs`); assert.ok(!Q.hasPatch(r.q)); assert.strictEqual(Q.goal(r.q), null); }
let r = Q.pet(NONE, 10); assert.deepStrictEqual([r.event, r.q.step], ['start', 'find']); assert.ok(Q.hasPatch(r.q) && Q.active(r.q) && !Q.onBed(r.q), 'she wears the patch from this moment');
assert.deepStrictEqual(Q.pet(NONE, 25).event, 'start', 'a save with more than ten pets already starts it on the next pet');

/* ---------- the whole story, in order ---------- */
let q = r.q; const walk = [];
const step = (fn, want, next) => { const out = fn(q); assert.deepStrictEqual([out.event, out.q.step], [want, next], `${want} -> ${next}`); q = out.q; walk.push(next); assert.ok(Q.hasPatch(q), 'the patch never comes off'); };
assert.match(Q.goal(q), /Minesweeper/); step(Q.minesWon, 'found', 'wash'); assert.match(Q.goal(q), /fountain/); step(Q.washed, 'washed', 'vet'); assert.match(Q.goal(q), /Pet Corner/);
step(Q.vet, 'asked', 'answers'); assert.match(Q.goal(q), /5 more right answers/);
for (let n = 1; n <= 4; n++) { step(Q.answered, 'counted', 'answers'); assert.strictEqual(q.answers, n); assert.ok(Q.goal(q).includes(`${5 - n} more right answer${5 - n === 1 ? '' : 's'}`), Q.goal(q)); assert.strictEqual(Q.vet(q).event, 'waiting', 'the Pet Corner sends you back until you have five'); assert.strictEqual(Q.vet(q).q.step, 'answers'); }
step(Q.answered, 'ready', 'report'); assert.strictEqual(Q.goal(q), 'Go back to the Pet Corner.'); step(Q.vet, 'ok', 'visit'); assert.strictEqual(Q.goal(q), 'Go and pet Remy.');
assert.ok(!Q.onBed(q), 'not on the bed until you have been to see her'); step(s => Q.pet(s, 40), 'finish', 'done');
assert.ok(Q.onBed(q) && Q.hasPatch(q) && !Q.active(q), 'done: on your bed in the dorm, still with her patch (the eye never comes back)'); assert.strictEqual(Q.goal(q), null, 'and nothing left on the tracker');
assert.deepStrictEqual(walk, ['wash', 'vet', 'answers', 'answers', 'answers', 'answers', 'answers', 'report', 'visit', 'done']);
assert.deepStrictEqual([Q.pet(q, 99).event, Q.pet(q, 99).q.step], ['purr', 'done'], 'after that, petting her just makes her purr');

/* ---------- out of order: nothing happens, and nothing is skipped ---------- */
for (const s of Q.STEPS) {
  const at = Q.clean({ step: s, answers: 2 });
  if (s !== 'find') assert.deepStrictEqual([Q.minesWon(at).event, Q.minesWon(at).q.step], [null, s], `a Minesweeper win does nothing at "${s}"`);
  if (s !== 'wash') assert.deepStrictEqual([Q.washed(at).event, Q.washed(at).q.step], [null, s], `washing does nothing at "${s}"`);
  if (s !== 'answers') assert.deepStrictEqual([Q.answered(at).event, Q.answered(at).q.step], [null, s], `a right answer does nothing at "${s}"`);
  if (!['vet', 'answers', 'report'].includes(s)) assert.strictEqual(Q.vet(at).event, null, `at "${s}" the Pet Corner is just a shop`);
  if (!['none', 'visit'].includes(s)) assert.strictEqual(Q.pet(at, 50).q.step, s, `petting does not move the story on at "${s}"`);
}
assert.strictEqual(Q.pet({ step: 'wash', answers: 0 }, 12).event, 'hint'); assert.strictEqual(Q.toast('hint', { step: 'wash', answers: 0 }), 'Remy purrs. Wash the eyeball in the fountain in the park.', 'petting her during the quest repeats the step');

/* ---------- reminders at the places ---------- */
const R = (s, place, n = 0) => Q.reminder({ step: s, answers: n }, place);
assert.match(R('find', 'field'), /Win a game of Minesweeper to dig it up/); assert.match(R('find', 'fountain'), /You need the eyeball first/); assert.match(R('find', 'petshop'), /You need the eyeball first/); assert.strictEqual(R('find', 'house'), null);
assert.match(R('wash', 'fountain'), /Press E to wash the eyeball/); assert.match(R('wash', 'petshop'), /Wash the eyeball first/); assert.strictEqual(R('wash', 'field'), null);
assert.match(R('vet', 'petshop'), /Press E to ask the Pet Corner about Remy/); assert.strictEqual(R('vet', 'fountain'), null);
assert.strictEqual(R('answers', 'house', 3), 'Get 2 more right answers at any booth inside, for the Pet Corner.'); assert.strictEqual(R('answers', 'house', 4), 'Get 1 more right answer at any booth inside, for the Pet Corner.'); assert.match(R('answers', 'petshop', 1), /wants 4 more right answers/);
assert.match(R('report', 'petshop', 5), /Press E to tell the Pet Corner you are done/); assert.strictEqual(R('report', 'house', 5), null);
for (const place of ['field', 'fountain', 'petshop', 'house']) { assert.strictEqual(R('none', place), null, 'no reminders before the quest'); assert.strictEqual(R('done', place), null, 'or after it'); assert.strictEqual(R('visit', place), null); }
for (const s of ['find', 'wash', 'vet', 'answers', 'report']) assert.ok(['field', 'fountain', 'petshop', 'house'].some(pl => R(s, pl, 1)), `step "${s}" has a reminder somewhere`);

/* ---------- every message exists, and a bad save is made safe ---------- */
for (const e of ['start', 'found', 'washed', 'asked', 'waiting', 'ok', 'finish']) { const m = Q.message(e, { step: 'answers', answers: 2 }); assert.ok(m && m.title && m.text, `a message for ${e}`); }
assert.match(Q.message('finish', q).text, /250 chips/); assert.match(Q.message('finish', q).text, /on your bed/); assert.match(Q.message('asked', q).text, /5 answers right/); assert.match(Q.message('waiting', { step: 'answers', answers: 3 }).text, /2 more right answers/);
for (const e of ['purr', 'hint', 'counted', 'ready']) assert.ok(Q.toast(e, { step: 'answers', answers: 2 }), `a pop-up for ${e}`); assert.strictEqual(Q.message('purr', NONE), null);
assert.deepStrictEqual(Q.clean(undefined), NONE); assert.deepStrictEqual(Q.clean({ step: 'nonsense', answers: 3 }), NONE); assert.deepStrictEqual(Q.clean({ step: 'answers', answers: 99 }), { step: 'answers', answers: 5 });
assert.deepStrictEqual(Q.clean({ step: 'answers', answers: -4 }), { step: 'answers', answers: 0 }); assert.deepStrictEqual(Q.clean({ step: 'wash', answers: 3 }), { step: 'wash', answers: 0 }); assert.deepStrictEqual(Q.clean({ step: 'done' }), { step: 'done', answers: 5 });
console.log('remy-quest tests passed');
