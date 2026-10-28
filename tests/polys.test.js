// Run with: node tests/polys.test.js
const assert = require('assert');
const P = require('../js/polys.js');

const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const M = P.MINUS;
const evalAt = (p, x) => p.reduce((s, c, d) => s + c * x ** d, 0);
const termsList = p => P.termsOf(p);

/* ---------- the arithmetic ---------- */
assert.deepStrictEqual(P.mul([3, 1], [5, 1]), [15, 8, 1]);                       // (x + 3)(x + 5)
assert.deepStrictEqual(P.mul([2, 1], [-2, 1]), [-4, 0, 1]);                      // (x + 2)(x - 2) = x^2 - 4: the x terms cancel and the zero stays in the list
assert.deepStrictEqual(P.mul(P.mul([2, 1], [2, 1]), [2, 1]), [8, 12, 6, 1]);     // (x + 2)^3
assert.deepStrictEqual(P.add([0, 2, 3], [4, -5, 1]), [4, -3, 4]); assert.deepStrictEqual(P.sub([0, 2, 3], [4, -5, 1]), [-4, 7, 2]);
assert.deepStrictEqual(P.neg([1, -2, 0, 3]), [-1, 2, 0, -3]); assert.ok(Object.is(P.neg([0])[0], 0), 'no negative zero');
assert.deepStrictEqual(P.trim([1, 2, 0, 0]), [1, 2]); assert.strictEqual(P.degree([5, 0, 0]), 0); assert.strictEqual(P.degree([0, 0, 4]), 2); assert.ok(P.equal([1, 2, 0], [1, 2]));
assert.deepStrictEqual(termsList([15, 8, 1]), [{ c: 1, d: 2 }, { c: 8, d: 1 }, { c: 15, d: 0 }], 'highest power first'); assert.deepStrictEqual(termsList([0, 0, 3]), [{ c: 3, d: 2 }], 'no zero terms');
assert.deepStrictEqual(P.fromTerms([{ c: 2, d: 2 }, { c: -1, d: 0 }]), [-1, 0, 2]);
for (let i = 0; i < 300; i++) { const r = seeded(i), a = [1, 2, 3].map(() => Math.floor(r() * 9) - 4), b = [1, 2, 3].map(() => Math.floor(r() * 9) - 4), x = Math.floor(r() * 11) - 5;
  assert.ok(evalAt(P.mul(a, b), x) === evalAt(a, x) * evalAt(b, x), 'multiplying polynomials multiplies their values'); assert.ok(evalAt(P.add(a, b), x) === evalAt(a, x) + evalAt(b, x)); assert.ok(evalAt(P.sub(a, b), x) === evalAt(a, x) - evalAt(b, x)); }

/* ---------- how they read ---------- */
assert.strictEqual(P.fmt([15, 8, 1], 'x'), 'x\u00b2 + 8x + 15'); assert.strictEqual(P.fmt([-9, 0, 1], 'x'), `x\u00b2 ${M} 9`); assert.strictEqual(P.fmt([-3, 1], 'y'), `y ${M} 3`);
assert.strictEqual(P.fmt([1, -1], 'x'), `${M}x + 1`); assert.strictEqual(P.fmt([0, 0, 0, 1], 'n'), 'n\u00b3'); assert.strictEqual(P.fmt([0, 0, 0, 0, -2], 'x'), `${M}2x\u2074`); assert.strictEqual(P.fmt([0], 'x'), '0');
assert.strictEqual(P.fmt([4, 0, -1], 'a'), `${M}a\u00b2 + 4`); assert.strictEqual(P.fmt([-6, 11, -6, 1], 'x'), `x\u00b3 ${M} 6x\u00b2 + 11x ${M} 6`);
assert.strictEqual(P.termText(-3, 2, 'x'), `${M}3x\u00b2`); assert.strictEqual(P.termText(1, 1, 'x'), 'x'); assert.strictEqual(P.termText(-1, 0, 'x'), `${M}1`); assert.strictEqual(P.termText(15, 0, 'x'), '15');
assert.strictEqual(P.paren([3, 1], 'x'), '(x + 3)');

/* ---------- Multiplication: what each level deals ---------- */
assert.deepStrictEqual(P.MUL_LEVELS.map(l => [l.level, l.name]), [[1, 'Easy'], [2, 'Medium'], [3, 'Hard']]);
const isBin = (f, powers) => termsList(f).length === 2 && termsList(f).map(t => t.d).join() === powers.join();
const isTri = f => termsList(f).map(t => t.d).join() === '2,1,0';
const allNonzero = f => termsList(f).every(t => t.c !== 0);
{
  const stats = { 1: { squares: 0, conj: 0, n: 0 }, 2: { binFirst: 0, triFirst: 0, shapes: new Set() }, 3: { cubes: 0, squares: 0 } };
  for (let level = 1; level <= 3; level++) {
    const rng = seeded(level * 101); let last = null;
    for (let i = 0; i < 4000; i++) {
      const p = P.mulProblem(level, rng, last); last = p;
      assert.strictEqual(p.kind, 'mul'); assert.strictEqual(p.level, level); assert.ok(P.VARS.includes(p.v));
      p.factors.forEach(f => assert.ok(allNonzero(f) && f.every(Number.isInteger) && f.every(c => Math.abs(c) <= 9), 'whole numbers, every listed term really there'));
      const stages = P.mulStages(p), res = P.mulResult(p);
      assert.strictEqual(stages.length, p.factors.length - 1, 'a distribution for each factor after the first');
      assert.ok(P.equal(stages[stages.length - 1].result, res), 'the stages end at the answer');
      stages.forEach((st, k) => {
        assert.ok(P.equal(st.left, k ? stages[k - 1].result : p.factors[0]), 'each stage starts from the answer before it'); assert.ok(P.equal(st.right, p.factors[k + 1]));
        assert.strictEqual(st.products.length, st.leftTerms.length * st.rightTerms.length, 'one product for each arch: every term of one times every term of the other');
        assert.ok(P.equal(P.fromTerms(st.products.map(x => ({ c: x.c, d: x.d }))), st.result), 'the products add up to the stage\'s answer');
        st.products.forEach(x => { assert.strictEqual(x.c, st.leftTerms[x.i].c * st.rightTerms[x.j].c); assert.strictEqual(x.d, st.leftTerms[x.i].d + st.rightTerms[x.j].d); });
        assert.deepStrictEqual(st.products.map(x => [x.i, x.j]), st.leftTerms.flatMap((_, i) => st.rightTerms.map((__, j) => [i, j])), 'in the order: the first term across all of the other polynomial, then the next');
        const ans = P.stageAnswer(st); assert.strictEqual(ans.combined.length, P.degree(st.result) + 1, 'one combine box for each power, zeros included'); assert.strictEqual(st.degrees[0], P.degree(st.result), 'the highest power first');
        assert.deepStrictEqual(ans.combined, st.degrees.map(d => st.result[d] || 0)); assert.ok(P.checkStage(st, ans).ok, 'the right answer is right');
      });
      if (level === 1) { assert.strictEqual(p.factors.length, 2); p.factors.forEach(f => assert.ok(isBin(f, [1, 0]) && [1, 2, 3].includes(f[1]))); assert.strictEqual(stages[0].products.length, 4); stats[1].n++;
        if (P.equal(p.factors[0], p.factors[1])) { stats[1].squares++; assert.match(P.mulText(p), /^\([^()]+\)\u00b2$/); } else assert.match(P.mulText(p), /^\([^()]+\)\([^()]+\)$/);
        if (!P.equal(p.factors[0], p.factors[1]) && p.factors[0][1] === p.factors[1][1] && p.factors[0][0] === -p.factors[1][0]) stats[1].conj++; }
      if (level === 2) { assert.strictEqual(p.factors.length, 2); const [a, b] = p.factors, bin = termsList(a).length === 2 ? a : b, tri = bin === a ? b : a; assert.ok(termsList(bin).length === 2 && isTri(tri), 'a binomial and a trinomial');
        stats[2][bin === a ? 'binFirst' : 'triFirst']++; stats[2].shapes.add(termsList(bin).map(t => t.d).join()); assert.strictEqual(stages[0].products.length, 6); assert.match(P.mulText(p), /^\([^()]+\)\([^()]+\)$/); }
      if (level === 3) { const f = p.factors; assert.ok(f.every(q => P.equal(q, f[0])), 'one factor, repeated');
        if (f.length === 3) { assert.ok(isBin(f[0], [1, 0])); stats[3].cubes++; assert.deepStrictEqual(stages.map(st => st.products.length), [4, 6], 'a cube is (x + a)(x + a) first, then that answer times (x + a)'); assert.match(P.mulText(p), /^\([^()]+\)\u00b3$/); }
        else { assert.strictEqual(f.length, 2); assert.ok(isTri(f[0])); stats[3].squares++; assert.deepStrictEqual(stages.map(st => st.products.length), [9], 'a squared trinomial is one distribution of nine products'); assert.match(P.mulText(p), /^\([^()]+\)\u00b2$/); } }
    }
  }
  assert.ok(stats[1].squares / stats[1].n > 0.25 && stats[1].squares / stats[1].n < 0.35, `about three in ten Easy problems are perfect squares (${stats[1].squares})`);
  assert.ok(stats[1].conj > 100, 'and conjugates like (x + 2)(x - 2) come up too');
  assert.ok(stats[2].binFirst > 1500 && stats[2].triFirst > 1500, 'Medium puts the binomial first about half the time'); assert.deepStrictEqual([...stats[2].shapes].sort(), ['1,0', '2,0', '2,1'], 'three shapes of binomial');
  assert.ok(stats[3].cubes > 1500 && stats[3].squares > 1500, 'Hard deals both cubed binomials and squared trinomials');
}
console.log('ok  what every level deals');

/* ---------- Multiplication: worked by hand ---------- */
{
  const stage = p => P.mulStages(p)[0];
  const p = { kind: 'mul', level: 1, v: 'x', factors: [[3, 1], [5, 1]] };                                      // (x + 3)(x + 5)
  assert.strictEqual(P.mulText(p), '(x + 3)(x + 5)');
  assert.deepStrictEqual(stage(p).products.map(x => [x.caption, x.c, x.d, x.i, x.j]), [['x \u00b7 x', 1, 2, 0, 0], ['x \u00b7 5', 5, 1, 0, 1], ['3 \u00b7 x', 3, 1, 1, 0], ['3 \u00b7 5', 15, 0, 1, 1]], 'x across (x + 5), then 3 across (x + 5): four arches');
  assert.deepStrictEqual(P.stageAnswer(stage(p)), { products: [1, 5, 3, 15], combined: [1, 8, 15] });
  // the teacher's own example: (2x + 1)(x + 3) is written out as [ ]x\u00b2 + [ ]x + [ ]x + [ ] and filled in 2, 6, 1, 3; combined it is [ ]x\u00b2 + [ ]x + [ ] and filled in 2, 7, 3
  { const ex = { kind: 'mul', level: 1, v: 'x', factors: [[1, 2], [3, 1]] }, st = stage(ex);
    assert.strictEqual(P.mulText(ex), '(2x + 1)(x + 3)'); assert.deepStrictEqual(st.products.map(x => x.c), [2, 6, 1, 3], 'the four blanks of the expanded line'); assert.deepStrictEqual(st.products.map(x => P.power('x', x.d)), ['x\u00b2', 'x', 'x', ''], 'the powers printed after the blanks: [ ]x\u00b2 + [ ]x + [ ]x + [ ]');
    assert.deepStrictEqual(st.degrees.map(d => P.power('x', d)), ['x\u00b2', 'x', ''], 'and the combine line: [ ]x\u00b2 + [ ]x + [ ]'); assert.deepStrictEqual(P.stageAnswer(st).combined, [2, 7, 3], 'combined: 2, 7, 3'); assert.strictEqual(P.fmt(st.result, 'x'), '2x\u00b2 + 7x + 3'); }
  const q = { kind: 'mul', level: 1, v: 'n', factors: [[-4, 1], [-4, 1]] };                                      // (n - 4)^2
  assert.strictEqual(P.mulText(q), `(n ${M} 4)\u00b2`); assert.deepStrictEqual(P.stageAnswer(stage(q)), { products: [1, -4, -4, 16], combined: [1, -8, 16] }); assert.deepStrictEqual(stage(q).products.map(x => x.caption), ['n \u00b7 n', `n \u00b7 (${M}4)`, `(${M}4) \u00b7 n`, `(${M}4) \u00b7 (${M}4)`]);
  const c = { kind: 'mul', level: 1, v: 'x', factors: [[2, 1], [-2, 1]] };                                      // (x + 2)(x - 2)
  assert.deepStrictEqual(P.stageAnswer(stage(c)), { products: [1, -2, 2, -4], combined: [1, 0, -4] }, 'the x terms cancel: the middle combine box is 0');
  const m = { kind: 'mul', level: 2, v: 'x', factors: [[2, 1], [4, -1, 1]] };                                    // (x + 2)(x^2 - x + 4)
  assert.deepStrictEqual(P.stageAnswer(stage(m)), { products: [1, -1, 4, 2, -2, 8], combined: [1, 1, 2, 8] }); assert.deepStrictEqual(stage(m).products.map(x => x.d), [3, 2, 1, 2, 1, 0]);
  const h = { kind: 'mul', level: 3, v: 'x', factors: [[2, 1], [2, 1], [2, 1]] };                               // (x + 2)^3: (x + 2)(x + 2) first, then that times (x + 2)
  assert.strictEqual(P.mulText(h), '(x + 2)\u00b3'); const hs = P.mulStages(h);
  assert.deepStrictEqual(hs.map(st => P.stageAnswer(st)), [{ products: [1, 2, 2, 4], combined: [1, 4, 4] }, { products: [1, 2, 4, 8, 4, 8], combined: [1, 6, 12, 8] }], 'round one gives x\u00b2 + 4x + 4; round two multiplies that by x + 2');
  assert.strictEqual(P.fmt(hs[0].result, 'x'), 'x\u00b2 + 4x + 4'); assert.deepStrictEqual(hs[1].products.map(x => x.caption), ['x\u00b2 \u00b7 x', 'x\u00b2 \u00b7 2', '4x \u00b7 x', '4x \u00b7 2', '4 \u00b7 x', '4 \u00b7 2']);
  const s = { kind: 'mul', level: 3, v: 'x', factors: [[-3, 1, 1], [-3, 1, 1]] };                                // (x^2 + x - 3)^2
  assert.deepStrictEqual(P.stageAnswer(stage(s)), { products: [1, 1, -3, 1, 1, -3, -3, -3, 9], combined: [1, 2, -5, -6, 9] }); assert.strictEqual(P.mulText(s), `(x\u00b2 + x ${M} 3)\u00b2`);
  const big = { kind: 'mul', level: 2, v: 'y', factors: [[3, 0, 1], [-1, 2, 1]] };                               // (y^2 + 3)(y^2 + 2y - 1)
  assert.deepStrictEqual(P.stageAnswer(stage(big)).combined, [1, 2, 2, 6, -3], 'degree 4: five combine boxes');
  console.log('ok  worked by hand');

  /* ---------- Multiplication: the checker ---------- */
  const st = stage(p), right = P.stageAnswer(st), bad = patch => P.checkStage(st, { ...right, ...patch });
  assert.ok(P.checkStage(st, right).ok); assert.deepStrictEqual(P.checkStage(st, right).products, [true, true, true, true]);
  assert.ok(!bad({ products: [1, 5, 3, 14] }).ok && !bad({ products: [1, 5, 3, 14] }).products[3] && bad({ products: [1, 5, 3, 14] }).products[2], 'one wrong product is marked');
  assert.ok(!bad({ combined: [1, 8, 16] }).ok && bad({ combined: [1, 8, 16] }).combined.join() === 'true,true,false');
  assert.ok(!bad({ combined: [1, 5, 15] }).ok, 'forgetting to combine 5x + 3x');
  assert.ok(!bad({ combined: [1, 8] }).ok, 'a missing box'); assert.ok(!bad({ products: [1, 5, 3] }).ok);
  [NaN, 1.5, '8', null, undefined, Infinity].forEach(v => assert.ok(!P.checkStage(st, { products: right.products, combined: [1, v, 15] }).ok, `not a number: ${v}`));
  [undefined, null, {}, { products: right.products }, { combined: right.combined }].forEach(a => assert.strictEqual(P.checkStage(st, a).ok, false));
  const two = { kind: 'mul', level: 1, v: 'x', factors: [[1, 2], [-3, 1]] };                                     // (2x + 1)(x - 3)
  assert.deepStrictEqual(P.stageAnswer(stage(two)), { products: [2, -6, 1, -3], combined: [2, -5, -3] }); assert.ok(!P.checkStage(stage(two), { products: [2, 6, 1, -3], combined: [2, 7, -3] }).ok, 'a sign slip'); assert.ok(!P.checkStage(stage(two), { products: [1, -6, 1, -3], combined: [1, -5, -3] }).ok, 'x times 2x is 2x squared, not x squared');
  // a cube: round two is checked against the CORRECT round one, whatever was typed in round one
  assert.ok(P.checkStage(hs[1], P.stageAnswer(hs[1])).ok); assert.ok(!P.checkStage(hs[1], { products: [1, 2, 4, 8, 4, 8], combined: [1, 6, 12, 9] }).ok);
  console.log('ok  checking multiplication');

  /* ---------- Multiplication: the worked solution ---------- */
  const ws = P.mulSteps(p);
  assert.strictEqual(ws.length, 3); assert.match(ws[0], /^Multiply every term of the first polynomial by every term of the second \(4 products\): x \u00b7 x = x\u00b2, x \u00b7 5 = 5x, 3 \u00b7 x = 3x, 3 \u00b7 5 = 15\.$/); assert.match(ws[1], /^Combine like terms .*: x: 5 \+ 3 = 8\.$/); assert.strictEqual(ws[2], 'So (x + 3)(x + 5) = x\u00b2 + 8x + 15.');
  assert.ok(P.mulSteps(c)[1].includes(`x: (${M}2) + 2 = 0`), 'the x terms of (x + 2)(x - 2) cancel, and the step says so');
  const cs = P.mulSteps(h); assert.strictEqual(cs.length, 5, 'a cube: multiply and combine, multiply and combine, the answer');
  assert.match(cs[0], /^First, multiply the first two factors: \(x \+ 2\)\(x \+ 2\) \(4 products\)/); assert.match(cs[1], /, so x\u00b2 \+ 4x \+ 4\.$/); assert.match(cs[2], /^Now multiply that answer by the last factor, \(x \+ 2\): \(x\u00b2 \+ 4x \+ 4\)\(x \+ 2\) \(6 products\)/); assert.strictEqual(cs[4], 'So (x + 2)\u00b3 = x\u00b3 + 6x\u00b2 + 12x + 8.');
  for (let level = 1; level <= 3; level++) { const rng = seeded(7 * level); for (let i = 0; i < 200; i++) { const pr = P.mulProblem(level, rng), sv = P.mulSteps(pr), n = P.mulStages(pr).length; assert.strictEqual(sv.length, 2 * n + 1); assert.ok(sv[sv.length - 1].endsWith(`${P.fmt(P.mulResult(pr), pr.v)}.`), 'the last step ends with the answer'); } }
}

/* ======================================================================== ADD AND SUBTRACT ======================================================================== */
assert.deepStrictEqual(P.ADD_LEVELS.map(l => [l.level, l.name, l.op]), [[1, 'Easy', 1], [2, 'Medium', -1]]);
{
  const seen = { tri: 0, bin: 0, zero: 0, shapes: new Set(), vars: new Set() };
  for (let level = 1; level <= 2; level++) {
    const rng = seeded(level * 211); let last = null;
    for (let i = 0; i < 4000; i++) {
      const p = P.addProblem(level, rng, last); last = p;
      assert.strictEqual(p.kind, 'add'); assert.strictEqual(p.op, level === 1 ? 1 : -1, 'Easy adds, Medium subtracts'); seen.vars.add(p.v);
      [p.P, p.Q].forEach(f => { const n = termsList(f).length; assert.ok(n === 2 || n === 3, 'a binomial or a trinomial'); assert.ok(P.degree(f) <= 2 && termsList(f).every(t => Math.abs(t.c) <= 9 && t.c !== 0)); if (n === 3) { seen.tri++; assert.ok(isTri(f)); } else { seen.bin++; seen.shapes.add(termsList(f).map(t => t.d).join()); } });
      assert.ok(termsList(p.P).some(t => p.Q[t.d]), 'there is always something to combine');
      const ans = P.addAnswer(p), res = P.addResult(p), n = Math.max(P.degree(p.P), P.degree(p.Q));
      assert.ok(P.equal(res, p.op > 0 ? P.add(p.P, p.Q) : P.sub(p.P, p.Q))); assert.deepStrictEqual(ans.combined, Array.from({ length: n + 1 }, (_, k) => res[n - k] || 0), 'one combine box for each power, highest first, zeros included');
      if (ans.combined.some(c => c === 0)) seen.zero++;
      if (p.op < 0) { assert.deepStrictEqual(ans.distributed, termsList(p.Q).map(t => -t.c), 'the second polynomial with its signs changed'); assert.strictEqual(ans.distributed.length, termsList(p.Q).length); } else assert.deepStrictEqual(ans.distributed, [], 'nothing to distribute when adding');
      assert.ok(P.checkAdd(p, ans).ok);
      assert.strictEqual(P.addSteps(p).length, p.op < 0 ? 3 : 2); assert.ok(P.addSteps(p).slice(-1)[0].endsWith(`${P.fmt(res, p.v)}.`));
    }
  }
  assert.ok(seen.tri > 3000 && seen.bin > 3000, 'a real mix of binomials and trinomials'); assert.deepStrictEqual([...seen.shapes].sort(), ['1,0', '2,0', '2,1']); assert.ok(seen.zero > 200, 'a power sometimes cancels to 0'); assert.strictEqual(seen.vars.size, P.VARS.length);
  const sub = { kind: 'add', level: 2, v: 'x', op: -1, P: [0, 2, 3], Q: [4, -5, 1] };                              // (3x^2 + 2x) - (x^2 - 5x + 4)
  assert.strictEqual(P.addText(sub), `(3x\u00b2 + 2x) ${M} (x\u00b2 ${M} 5x + 4)`); assert.deepStrictEqual(P.addAnswer(sub), { distributed: [-1, 5, -4], combined: [2, 7, -4] });
  const sum = { kind: 'add', level: 1, v: 'x', op: 1, P: [0, 2, 3], Q: [4, -5, 1] };
  assert.strictEqual(P.addText(sum), `(3x\u00b2 + 2x) + (x\u00b2 ${M} 5x + 4)`); assert.deepStrictEqual(P.addAnswer(sum), { distributed: [], combined: [4, -3, 4] });
  const steps = P.addSteps(sub);
  assert.match(steps[0], new RegExp(`^Distribute the minus sign: change the sign of every term in \\(x\u00b2 ${M} 5x \\+ 4\\), so ${M}\\(x\u00b2 ${M} 5x \\+ 4\\) = ${M}x\u00b2 \\+ 5x ${M} 4\\.$`));
  assert.match(steps[1], /^Combine like terms: x\u00b2: 3 \+ \(\u22121\) = 2; x: 2 \+ 5 = 7; numbers: \(\u22124\) = \u22124\.$/); assert.strictEqual(steps[2], `So ${P.addText(sub)} = 2x\u00b2 + 7x ${M} 4.`);
  // checking, including forgetting to distribute the minus
  const rightS = P.addAnswer(sub);
  assert.ok(P.checkAdd(sub, rightS).ok);
  assert.ok(!P.checkAdd(sub, { distributed: [-1, 5, -4], combined: [4, -3, 4] }).ok, 'combined as if it were addition');
  assert.ok(!P.checkAdd(sub, { distributed: [-1, -5, -4], combined: [2, 7, -4] }).ok && P.checkAdd(sub, { distributed: [-1, -5, -4], combined: [2, 7, -4] }).distributed.join() === 'true,false,true', 'only the term whose sign was not changed is marked');
  assert.ok(!P.checkAdd(sub, { distributed: [1, -5, 4], combined: [2, 7, -4] }).ok, 'not distributed at all');
  assert.ok(!P.checkAdd(sum, { distributed: [], combined: [4, -3, 5] }).ok); assert.ok(P.checkAdd(sum, { distributed: [], combined: [4, -3, 4] }).ok);
  assert.ok(!P.checkAdd(sub, { combined: [2, 7, -4] }).ok, 'the distribute boxes are not optional for subtraction'); assert.ok(!P.checkAdd(sub, { distributed: [-1, 5, -4], combined: [2, 7] }).ok);
  [NaN, 0.5, '7', null].forEach(v => assert.ok(!P.checkAdd(sub, { distributed: [-1, 5, -4], combined: [2, v, -4] }).ok));
  // a cancelled power is a 0 box
  const cancel = { kind: 'add', level: 1, v: 'x', op: 1, P: [0, 3, 1], Q: [2, -3, 0] };                              // (x^2 + 3x) + (-3x + 2)
  assert.deepStrictEqual(P.addAnswer(cancel).combined, [1, 0, 2]); assert.match(P.addSteps(cancel)[0], /x: 3 \+ \(\u22123\) = 0/);
  console.log('ok  adding and subtracting');
}

/* ---------- the dealer never repeats, and is deterministic ---------- */
for (const [fn, n] of [[P.mulProblem, 3], [P.addProblem, 2]]) for (let level = 1; level <= n; level++) {
  const rng = seeded(31 + level); let last = null;
  for (let i = 0; i < 3000; i++) { const p = fn(level, rng, last); assert.ok(!last || JSON.stringify(p) !== JSON.stringify(last), 'never the same one twice in a row'); last = p; }
  assert.deepStrictEqual(fn(level, seeded(5)), fn(level, seeded(5)), 'the same seed deals the same problem');
}
assert.strictEqual(P.mulLevelOf(9).level, 3); assert.strictEqual(P.mulLevelOf(0).level, 1); assert.strictEqual(P.addLevelOf(9).level, 2); assert.strictEqual(P.addLevelOf('x').level, 1);
assert.ok(P.MUL_LEVELS.every(l => l.sample && l.desc) && P.ADD_LEVELS.every(l => l.sample && l.desc));
console.log('polys tests passed');
