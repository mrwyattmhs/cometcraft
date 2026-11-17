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

/* ---------- Multiplication (the area model): what each level deals ---------- */
assert.deepStrictEqual(P.MUL_LEVELS.map(l => [l.level, l.name, l.cells]), [[1, 'Easy', 2], [2, 'Medium', 4], [3, 'Hard', 9]]);
const sumOfCells = (g, v) => P.fromTerms(g.cells.flat().map(x => ({ c: x.c, d: x.d })));
const isMono = f => P.termsOf(f).length === 1, isBin = f => P.termsOf(f).length === 2, isTri = f => P.termsOf(f).length === 3;
{
  const stats = { 1: { shapes: new Set(), degs: new Set(), neg: 0, pos: 0, vars: new Set() }, 2: { squares: 0, diff: 0, other: 0, vars: new Set() }, 3: { binTri: 0, triBin: 0, triTri: 0, sizes: new Set(), binShapes: new Set() } };
  for (let level = 1; level <= 3; level++) {
    const rng = seeded(11 * level); let last = null;
    for (let i = 0; i < 6000; i++) {
      const p = P.mulProblem(level, rng, last); last = p; const [A, B] = p.factors, g = P.mulGrid(p), res = P.mulResult(p), ans = P.mulAnswer(p);
      assert.strictEqual(p.kind, 'mul'); assert.strictEqual(p.level, level); assert.ok(P.VARS.includes(p.v)); assert.strictEqual(p.factors.length, 2, 'two polynomials: one down the side, one across the top');
      assert.strictEqual(g.rows.length, P.termsOf(A).length); assert.strictEqual(g.cols.length, P.termsOf(B).length); assert.ok(g.cells.length === g.rows.length && g.cells.every(r => r.length === g.cols.length), 'a rectangle: a square for each row and column');
      assert.ok(P.equal(sumOfCells(g), res), 'the squares add up to the product'); for (const x of [-3, -1, 0, 2, 5]) assert.ok(evalAt(sumOfCells(g), x) === evalAt(A, x) * evalAt(B, x), 'at x = ' + x);       // (=== so that -0 equals 0)
      g.cells.forEach((row, r) => row.forEach((cell, c) => { assert.strictEqual(cell.c, g.rows[r].c * g.cols[c].c, 'a square is its row times its column'); assert.strictEqual(cell.d, g.rows[r].d + g.cols[c].d); assert.ok(cell.c !== 0); assert.ok(cell.caption.includes('\u00b7')); }));
      const ds = g.cells.flat().map(x => x.d); assert.deepStrictEqual(g.degrees, Array.from({ length: Math.max(...ds) - Math.min(...ds) + 1 }, (_, k) => Math.max(...ds) - k), 'the combine line: every power from the highest to the lowest, none left out');
      assert.strictEqual(ans.cells.length, g.rows.length * g.cols.length); assert.strictEqual(ans.combined.length, g.degrees.length);
      const back = P.fromTerms(g.degrees.map((d, k) => ({ c: ans.combined[k], d }))); assert.ok(P.equal(back, res), 'the combine line holds the whole answer: no power outside it'); assert.ok(g.degrees.length <= 5 && g.degrees.length >= 2);
      assert.ok(Math.max(...ans.cells.map(x => Math.abs(x.c))) <= 64 && ans.combined.every(c => Math.abs(c) <= 99), 'numbers that fit a small box');
      if (level === 1) {
        assert.ok(isMono(A) && isBin(B) && g.rows.length === 1 && g.cols.length === 2 && A.length - 1 <= 2 && A.length - 1 >= 1 && Math.abs(P.termsOf(A)[0].c) <= 6, 'a monomial times a binomial: one row of two squares'); assert.ok(new Set(g.cells[0].map(x => x.d)).size === 2, 'two different powers: nothing to combine, ever');
        stats[1].shapes.add(P.termsOf(B).map(t => t.d).join()); stats[1].degs.add(P.termsOf(A)[0].d); (P.termsOf(A)[0].c < 0 ? stats[1].neg++ : stats[1].pos++); stats[1].vars.add(p.v);
        assert.match(P.mulText(p), new RegExp(`^\u2212?\\d*${p.v}\u00b2?\\(`), 'written like 3x(x + 5)');
      } else if (level === 2) {
        assert.ok(isBin(A) && isBin(B) && P.degree(A) === 1 && P.degree(B) === 1 && g.rows.length === 2 && g.cols.length === 2, 'two binomials, each ax + b'); assert.ok(g.cells.flat().filter(x => x.d === 1).length === 2, 'two squares with the same power in the middle: there is always something to combine');
        if (P.equal(A, B)) { stats[2].squares++; assert.match(P.mulText(p), /^\([^()]+\)\u00b2$/); } else if (A[0] === -B[0] && A[1] === B[1]) { stats[2].diff++; assert.strictEqual(res[1], 0, 'the middle terms cancel'); assert.match(P.mulText(p), /^\([^()]+\)\([^()]+\)$/); } else { stats[2].other++; assert.match(P.mulText(p), /^\([^()]+\)\([^()]+\)$/); } stats[2].vars.add(p.v);
      } else {
        const ft = [isBin(A) ? 'b' : 't', isBin(B) ? 'b' : 't'].join(''); stats[3][ft === 'bt' ? 'binTri' : ft === 'tb' ? 'triBin' : 'triTri']++; assert.ok(['bt', 'tb', 'tt'].includes(ft)); stats[3].sizes.add(`${g.rows.length}x${g.cols.length}`);
        [A, B].filter(isBin).forEach(f => stats[3].binShapes.add(P.termsOf(f).map(t => t.d).join())); [A, B].filter(isTri).forEach(f => assert.deepStrictEqual(P.termsOf(f).map(t => t.d), [2, 1, 0], 'a trinomial is ax\u00b2 + bx + c'));
        assert.ok(new Set(g.cells.flat().map(x => x.d)).size < g.cells.flat().length, 'at least two squares share a power: there are like terms to combine');
      }
    }
  }
  assert.deepStrictEqual([...stats[1].shapes].sort(), ['1,0', '2,0', '2,1'].sort(), 'Easy: the binomial is ax + b, ax\u00b2 + b or ax\u00b2 + bx'); assert.deepStrictEqual([...stats[1].degs].sort(), [1, 2], 'the monomial is a power of 1 or 2'); assert.ok(stats[1].neg > 1000 && stats[1].pos > 1000, 'positive and negative monomials'); assert.strictEqual(stats[1].vars.size, P.VARS.length);
  const s2 = stats[2]; assert.ok(s2.squares > 1400 && s2.squares < 2200 && s2.diff > 150 && s2.other > 3000, `Medium: perfect squares ~30% (${s2.squares}), (ax+b)(ax-b) ~10% (${s2.diff}), the rest ordinary`); assert.strictEqual(s2.vars.size, P.VARS.length);
  const s3 = stats[3]; assert.ok(s3.binTri > 1200 && s3.triBin > 1200 && s3.triTri > 2700 && s3.triTri < 3300, `Hard: a binomial and a trinomial either way round (${s3.binTri}/${s3.triBin}), or two trinomials about half the time (${s3.triTri})`); assert.deepStrictEqual([...s3.sizes].sort(), ['2x3', '3x2', '3x3']); assert.deepStrictEqual([...s3.binShapes].sort(), ['1,0', '2,0', '2,1'].sort());
}

/* ---------- Multiplication: worked by hand ---------- */
{
  const flat = p => P.mulAnswer(p).cells.map(x => [x.c, x.d]), mk = (v, a, b) => ({ kind: 'mul', level: 2, v, factors: [a, b] });
  const p = mk('x', [3, 1], [5, 1]); assert.strictEqual(P.mulText(p), '(x + 3)(x + 5)'); const g = P.mulGrid(p);
  assert.deepStrictEqual(g.rows.map(t => [t.c, t.d]), [[1, 1], [3, 0]], 'down the left: x and +3'); assert.deepStrictEqual(g.cols.map(t => [t.c, t.d]), [[1, 1], [5, 0]], 'across the top: x and +5');
  assert.deepStrictEqual(flat(p), [[1, 2], [5, 1], [3, 1], [15, 0]], 'x\u00b7x, x\u00b75, 3\u00b7x, 3\u00b75'); assert.deepStrictEqual(P.mulAnswer(p).combined, [1, 8, 15]); assert.deepStrictEqual(g.degrees, [2, 1, 0]);
  const e = { kind: 'mul', level: 1, v: 'x', factors: [[0, 3], [5, 1]] }; assert.strictEqual(P.mulText(e), '3x(x + 5)'); assert.deepStrictEqual(flat(e), [[3, 2], [15, 1]]); assert.deepStrictEqual(P.mulAnswer(e), { cells: [{ c: 3, d: 2 }, { c: 15, d: 1 }], combined: [3, 15] }); assert.deepStrictEqual(P.mulGrid(e).degrees, [2, 1], 'no constant box: there is no constant');
  const e2 = { kind: 'mul', level: 1, v: 'a', factors: [[0, 0, -2], [-4, 0, 1]] }; assert.strictEqual(P.mulText(e2), `${M}2a\u00b2(a\u00b2 ${M} 4)`); assert.deepStrictEqual(flat(e2), [[-2, 4], [8, 2]]); assert.deepStrictEqual(P.mulAnswer(e2).combined, [-2, 0, 8], 'a power with nothing in it is a 0: \u22122a\u2074 + 0a\u00b3 + 8a\u00b2'); assert.deepStrictEqual(P.mulGrid(e2).degrees, [4, 3, 2]);
  const e3 = { kind: 'mul', level: 1, v: 'x', factors: [[0, -1], [2, 3]] }; assert.strictEqual(P.mulText(e3), `${M}x(3x + 2)`); assert.deepStrictEqual(flat(e3), [[-3, 2], [-2, 1]]);
  const q = mk('n', [-4, 1], [-4, 1]); assert.strictEqual(P.mulText(q), `(n ${M} 4)\u00b2`); assert.deepStrictEqual(flat(q), [[1, 2], [-4, 1], [-4, 1], [16, 0]]); assert.deepStrictEqual(P.mulAnswer(q).combined, [1, -8, 16]);
  const c = mk('x', [2, 1], [-2, 1]); assert.deepStrictEqual(P.mulAnswer(c).combined, [1, 0, -4], 'the x terms cancel: the middle box is 0');
  const sq = mk('x', [3, 0, 1], [1, 0, 1]); assert.deepStrictEqual(P.mulGrid(sq).degrees, [4, 3, 2, 1, 0], 'x\u2074 down to the constant, including the powers that are missing'); assert.deepStrictEqual(P.mulAnswer(sq).combined, [1, 0, 4, 0, 3]);
  const bt = { kind: 'mul', level: 3, v: 'x', factors: [[2, 1], [4, -1, 1]] }; assert.strictEqual(P.mulText(bt), `(x + 2)(x\u00b2 ${M} x + 4)`); assert.strictEqual(P.mulGrid(bt).rows.length * P.mulGrid(bt).cols.length, 6, '2 by 3'); assert.deepStrictEqual(flat(bt), [[1, 3], [-1, 2], [4, 1], [2, 2], [-2, 1], [8, 0]]); assert.deepStrictEqual(P.mulAnswer(bt).combined, [1, 1, 2, 8]);
  const tb = { kind: 'mul', level: 3, v: 'x', factors: [[4, -1, 1], [2, 1]] }; assert.deepStrictEqual([P.mulGrid(tb).rows.length, P.mulGrid(tb).cols.length], [3, 2], '3 by 2 the other way round'); assert.deepStrictEqual(P.mulAnswer(tb).combined, [1, 1, 2, 8]);
  const tt = { kind: 'mul', level: 3, v: 'x', factors: [[-3, 1, 1], [-3, 1, 1]] }; assert.strictEqual(P.mulText(tt), `(x\u00b2 + x ${M} 3)\u00b2`); assert.deepStrictEqual(flat(tt).map(a => a[0]), [1, 1, -3, 1, 1, -3, -3, -3, 9]); assert.deepStrictEqual(P.mulAnswer(tt).combined, [1, 2, -5, -6, 9]);
  const big = { kind: 'mul', level: 3, v: 'x', factors: [[1, 2, 1], [3, 0, 1]] }; assert.strictEqual(P.mulGrid(big).degrees.length, 5); assert.deepStrictEqual(P.mulAnswer(big).combined, [1, 2, 4, 6, 3]);
}

/* ---------- typing a term ---------- */
{
  const T = (s, v = 'x') => P.parseTerm(s, v), want = (s, c, d, v = 'x') => assert.deepStrictEqual(T(s, v), { c, d }, `"${s}" is ${c} to the power ${d}`);
  want('15', 15, 0); want('0', 0, 0); want(`${M}6x`, -6, 1); want('-6x', -6, 1); want('x\u00b2', 1, 2); want('x', 1, 1); want(`${M}x`, -1, 1); want('x^3', 1, 3); want('4x^2', 4, 2); want('4x\u00b2', 4, 2); want(`${M}12x\u2074`, -12, 4); want('+5', 5, 0); want('+3x', 3, 1); want(' 5 x ', 5, 1); want('X\u00b2', 1, 2); want('7n', 7, 1, 'n'); want('n^2', 1, 2, 'n'); want(`\u2212a`, -1, 1, 'a'); want('2t\u00b3', 2, 3, 't'); want('x^1', 1, 1); want('3x^10', 3, 10);
  for (const bad of ['', ' ', M, '-', '+', 'y', '5y', 'x2', '5xx', 'x\u00b2x', '2x\u00b2y', 'x^', '3.5', '1/2', '--5', '5-', '\u00b2', '^2', 'x^-2', 'two', null, undefined]) assert.strictEqual(T(bad), null, `"${bad}" is not a term in x`);
  assert.strictEqual(T('5y', 'x'), null, 'the wrong letter is not accepted'); assert.deepStrictEqual(T('5y', 'y'), { c: 5, d: 1 }); P.VARS.forEach(v => assert.deepStrictEqual(T(`${M}3${v}\u00b3`, v), { c: -3, d: 3 }));
  /* what a keyboard types is tidied */
  const tidy = (s, v = 'x') => P.tidyTerm(s, v);
  assert.strictEqual(tidy('-6x^2'), `${M}6x\u00b2`); assert.strictEqual(tidy('X'), 'x'); assert.strictEqual(tidy('6xx'), '6x'); assert.strictEqual(tidy('123'), '12', 'two digits at most'); assert.strictEqual(tidy('6y'), '6', 'only the problem\'s variable'); assert.strictEqual(tidy('6y', 'y'), '6y'); assert.strictEqual(tidy('--5'), `${M}5`); assert.strictEqual(tidy('5-'), '5', 'a minus sign only goes at the front');
  assert.strictEqual(tidy('x^7'), 'x'); assert.strictEqual(tidy('x^4'), 'x\u2074'); assert.strictEqual(tidy('3x^'), '3x^', 'a ^ waits for its digit (the keyboard types one key at a time)'); assert.strictEqual(tidy('3x^2'), '3x\u00b2'); assert.strictEqual(tidy('^2'), '', 'no power without a variable'); assert.strictEqual(tidy('^'), ''); assert.strictEqual(tidy('3^x'), '3', 'a ^ before the variable goes'); assert.strictEqual(tidy('x^^2'), 'x^', 'two carets: the first waits'); assert.strictEqual(P.parseTerm(tidy('3x^'), 'x'), null, 'and a term still waiting for its power is not an answer yet'); assert.strictEqual(tidy('4x\u00b3'), '4x\u00b3'); assert.strictEqual(tidy(''), ''); assert.strictEqual(tidy(null), ''); assert.strictEqual(tidy('a b!c'), '', 'letters that are not the variable go'); assert.strictEqual(tidy(`${M}`), M); assert.strictEqual(tidy('x5'), 'x', 'nothing after the variable but its power');
  for (const s of ['15', `${M}6x`, 'x\u00b2', `${M}12x\u2074`, '7']) assert.strictEqual(tidy(s), s, `"${s}" is already tidy`);
  /* the pad */
  const tap = (keys, v = 'x', start = '') => keys.reduce((t, k) => P.padTap(t, k, v), start);
  assert.strictEqual(tap(['neg', '6', 'v2']), `${M}6x\u00b2`); assert.strictEqual(tap(['1', '5']), '15'); assert.strictEqual(tap(['1', '2', '3']), '12', 'two digits at most'); assert.strictEqual(tap(['v1']), 'x'); assert.strictEqual(tap(['neg', 'v3'], 'n'), `${M}n\u00b3`); assert.strictEqual(tap(['4', 'v4']), '4x\u2074');
  assert.strictEqual(tap(['6', 'v2', '5']), '6x\u00b2', 'no digits after the variable'); assert.strictEqual(tap(['6', 'v2', 'v1']), '6x', 'a new power replaces the old one'); assert.strictEqual(tap(['6', 'v3', 'v2']), '6x\u00b2');
  assert.strictEqual(tap(['neg']), M); assert.strictEqual(tap(['neg', 'neg']), ''); assert.strictEqual(tap(['5', 'neg']), `${M}5`, 'the minus key flips the sign wherever you are'); assert.strictEqual(tap(['neg', '5', 'neg']), '5'); assert.strictEqual(tap(['6', 'v2', 'neg']), `${M}6x\u00b2`);
  assert.strictEqual(tap(['back']), ''); assert.strictEqual(tap(['1', '2', 'back']), '1'); assert.strictEqual(tap(['6', 'v2', 'back']), '6', 'backspace takes the variable and its power off in one go'); assert.strictEqual(tap(['neg', '6', 'back']), M); assert.strictEqual(tap(['neg', '6', 'back', 'back']), '', 'and then the sign'); assert.strictEqual(tap(['v2', 'back']), ''); assert.strictEqual(tap(['neg', 'v2', 'back']), M);
  assert.strictEqual(P.padTap('5', 'nonsense', 'x'), '5'); assert.strictEqual(P.padTap(null, '3', 'x'), '3'); assert.strictEqual(P.padTap(undefined, 'back', 'x'), ''); assert.strictEqual(P.padTap('garbage', '4', 'x'), '4', 'text that is not a term starts again');
  for (const [keys, c, d] of [[['neg', '6', 'v2'], -6, 2], [['v1'], 1, 1], [['1', '5'], 15, 0], [['neg', 'v1'], -1, 1], [['9', 'v4'], 9, 4]]) assert.deepStrictEqual(P.parseTerm(tap(keys), 'x'), { c, d }, 'what the pad types is what the parser reads');
}

/* ---------- Multiplication: checking ---------- */
{
  const p = { kind: 'mul', level: 2, v: 'x', factors: [[3, 1], [5, 1]] }, right = { cells: ['x\u00b2', '5x', '3x', '15'], combined: [1, 8, 15] }, bad = patch => P.checkMul(p, { ...right, ...patch });
  assert.ok(P.checkMul(p, right).ok); assert.deepStrictEqual(P.checkMul(p, right).cells, [true, true, true, true]); assert.deepStrictEqual(P.checkMul(p, right).combined, [true, true, true]);
  assert.ok(P.checkMul(p, { cells: ['x^2', '+5x', '3 x', '15'], combined: [1, 8, 15] }).ok, 'however a term is typed: x^2 for x\u00b2, a plus sign, a space');
  for (let i = 0; i < 4; i++) { const cells = right.cells.slice(); cells[i] = '99x'; const r = bad({ cells }); assert.ok(!r.ok); assert.deepStrictEqual(r.cells, [0, 1, 2, 3].map(k => k !== i), 'only square ' + (i + 1) + ' is wrong'); assert.ok(r.combined.every(Boolean), 'the combine line is marked by itself'); }
  assert.deepStrictEqual(bad({ cells: ['x', '5x', '3x', '15'] }).cells, [false, true, true, true], 'x for x\u00b2: the right number, the wrong power'); assert.deepStrictEqual(bad({ cells: ['x\u00b2', '5', '3x', '15'] }).cells, [true, false, true, true], 'the power forgotten'); assert.deepStrictEqual(bad({ cells: ['x\u00b2', '5x', '3x', '15x'] }).cells, [true, true, true, false], 'a constant given a power');
  assert.deepStrictEqual(bad({ cells: ['y\u00b2', '5x', '3x', '15'] }).cells, [false, true, true, true], 'the wrong letter'); assert.deepStrictEqual(bad({ cells: [`${M}x\u00b2`, '5x', '3x', '15'] }).cells, [false, true, true, true], 'the wrong sign'); assert.deepStrictEqual(bad({ cells: ['', '5x', null, '15'] }).cells, [false, true, false, true], 'blanks are wrong');
  for (const v of [NaN, 1.5, '8', null, undefined, Infinity]) assert.deepStrictEqual(bad({ combined: [1, v, 15] }).combined, [true, false, true], `${v} is not a number for the combine line`);
  assert.deepStrictEqual(bad({ combined: [1, 7, 15] }).combined, [true, false, true]); assert.ok(!bad({ combined: [1, 7, 15] }).ok); assert.deepStrictEqual(bad({ combined: [1, 8, 15] }).combined, [true, true, true]); assert.ok(bad({ combined: [1, 7, 15] }).cells.every(Boolean), 'right squares, wrong sum: the squares stay right');
  assert.deepStrictEqual(P.checkMul(p, { cells: ['x', 'x', 'x', 'x'], combined: [1, 8, 15] }).combined, [true, true, true], 'wrong squares, right sum: the sum is judged against the true answer');
  for (const a of [undefined, null, {}, { cells: right.cells }, { combined: right.combined }, { cells: 'no', combined: 'no' }]) { const r = P.checkMul(p, a); assert.ok(!r.ok, 'nothing, or half an answer, is not right'); assert.strictEqual(r.cells.length, 4); assert.strictEqual(r.combined.length, 3); }
  assert.ok(!P.checkMul(p, { cells: right.cells.slice(0, 3), combined: [1, 8, 15] }).ok && P.checkMul(p, { cells: right.cells.slice(0, 3), combined: [1, 8, 15] }).cells[3] === false, 'a missing square is wrong'); assert.ok(!P.checkMul(p, { cells: right.cells, combined: [1, 8] }).ok, 'a missing box is wrong'); assert.ok(P.checkMul(p, { cells: right.cells, combined: [1, 8, 15, 99] }).ok, 'an extra number past the end is ignored');
  /* every problem, answered the way the screen would type it, is right; and the combine line of the easy kind has two boxes */
  for (let level = 1; level <= 3; level++) { const rng = seeded(40 + level); for (let i = 0; i < 800; i++) { const pr = P.mulProblem(level, rng), w = P.mulAnswer(pr); assert.ok(P.checkMul(pr, { cells: w.cells.map(x => P.termText(x.c, x.d, pr.v)), combined: w.combined }).ok, P.mulText(pr)); assert.ok(P.checkMul(pr, { cells: w.cells.map(x => (x.d === 0 ? String(x.c) : `${x.c}${pr.v}^${x.d}`)), combined: w.combined }).ok, 'typed with a caret too'); } }
}

/* ---------- Multiplication: the worked steps ---------- */
{
  const p = { kind: 'mul', level: 2, v: 'x', factors: [[3, 1], [5, 1]] };
  assert.deepStrictEqual(P.mulSteps(p), ['Row 1 (x): x \u00b7 x = x\u00b2, x \u00b7 5 = 5x.', 'Row 2 (3): 3 \u00b7 x = 3x, 3 \u00b7 5 = 15.', 'Combine like terms (the same power of x): 5x + 3x = 8x.', 'So (x + 3)(x + 5) = x\u00b2 + 8x + 15.']);
  const e = { kind: 'mul', level: 1, v: 'x', factors: [[0, 3], [5, 1]] }; assert.deepStrictEqual(P.mulSteps(e), ['Row 1 (3x): 3x \u00b7 x = 3x\u00b2, 3x \u00b7 5 = 15x.', 'There are no like terms to combine: write the terms in order.', 'So 3x(x + 5) = 3x\u00b2 + 15x.']);
  const c = { kind: 'mul', level: 2, v: 'x', factors: [[2, 1], [-2, 1]] }; assert.strictEqual(P.mulSteps(c)[2], `Combine like terms (the same power of x): ${M}2x + 2x = 0.`, 'the x terms of (x + 2)(x \u2212 2) cancel, and the step says so: 0, not 0x');
  const neg = { kind: 'mul', level: 2, v: 'n', factors: [[-4, 1], [-4, 1]] }; assert.strictEqual(P.mulSteps(neg)[0], `Row 1 (n): n \u00b7 n = n\u00b2, n \u00b7 (${M}4) = ${M}4n.`); assert.strictEqual(P.mulSteps(neg)[1], `Row 2 (${M}4): (${M}4) \u00b7 n = ${M}4n, (${M}4) \u00b7 (${M}4) = 16.`); assert.strictEqual(P.mulSteps(neg)[2], `Combine like terms (the same power of n): ${M}4n ${M} 4n = ${M}8n.`);
  const tt = { kind: 'mul', level: 3, v: 'x', factors: [[-3, 1, 1], [-3, 1, 1]] }; assert.strictEqual(P.mulSteps(tt).length, 5, 'three rows, the combining, the answer');
  for (let level = 1; level <= 3; level++) { const rng = seeded(7 * level); for (let i = 0; i < 300; i++) { const pr = P.mulProblem(level, rng), st = P.mulSteps(pr), g = P.mulGrid(pr); assert.strictEqual(st.length, g.rows.length + 2, 'a line for each row, the combining, the answer'); assert.ok(st.every(t => t.length <= 130), `short enough for a narrow column: ${st.find(t => t.length > 130)}`); assert.ok(st[st.length - 1].startsWith(`So ${P.mulText(pr)} = `) && st[st.length - 1].endsWith(P.fmt(P.mulResult(pr), pr.v) + '.')); assert.ok(st.slice(0, g.rows.length).every((t, k) => t.startsWith(`Row ${k + 1} (`) && (t.match(/ = /g) || []).length === g.cols.length), 'one product for each square in the row'); if (level === 1) assert.ok(st[1].startsWith('There are no like terms')); else assert.ok(st[g.rows.length].startsWith('Combine like terms'), 'Medium and Hard always have something to combine'); } }
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
