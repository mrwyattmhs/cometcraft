// Run with: node tests/library.test.js
const assert = require('assert');
const L = require('../js/library.js');

// the three books
assert.deepStrictEqual(L.BOOKS.map(b => b.short), ['Flatland', 'Alice in Wonderland', 'A Tangled Tale'], 'short titles for the covers');
assert.deepStrictEqual(L.BOOKS.map(b => b.id), ['flatland', 'alice', 'tangled']);
assert.deepStrictEqual(L.BOOKS.map(b => b.title), ['Flatland', 'Alice\u2019s Adventures in Wonderland', 'A Tangled Tale']);
L.BOOKS.forEach(b => { assert.strictEqual(b.pageCount, b.pages.length); assert.strictEqual(L.get(b.id), b); });
assert.strictEqual(L.get('nope'), null);
const fl = L.get('flatland'), al = L.get('alice');

// page numbers stay inside the book
assert.strictEqual(L.clampPage(fl, 5), 5); assert.strictEqual(L.clampPage(fl, 0), 1); assert.strictEqual(L.clampPage(fl, -9), 1);
assert.strictEqual(L.clampPage(fl, 99999), fl.pageCount); assert.strictEqual(L.clampPage(fl, 7.9), 7);
assert.strictEqual(L.clampPage(fl, 'abc'), 1); assert.strictEqual(L.clampPage(fl, NaN), 1); assert.strictEqual(L.clampPage(fl, undefined), 1); assert.strictEqual(L.clampPage(fl, '12'), 12);
// what is typed in the "go to page" box
assert.strictEqual(L.parsePage(fl, '12'), 12); assert.strictEqual(L.parsePage(fl, ' 12 '), 12); assert.strictEqual(L.parsePage(fl, '0'), 1);
assert.strictEqual(L.parsePage(fl, '5000'), fl.pageCount, 'past the end goes to the last page');
['', 'abc', '1.5', '-3', '1e3', '12 13', '\u0663'].forEach(t => assert.strictEqual(L.parsePage(fl, t), null, `"${t}" is not a page number`));
// bookmarks
assert.strictEqual(L.started({}, 'flatland'), false); assert.strictEqual(L.started(undefined, 'flatland'), false); assert.strictEqual(L.started({ flatland: 1 }, 'flatland'), true);
assert.strictEqual(L.resumePage(fl, {}), 1, 'no bookmark: the first page');
assert.strictEqual(L.resumePage(fl, { flatland: 40 }), 40); assert.strictEqual(L.resumePage(fl, { alice: 40 }), 1, 'a bookmark belongs to one book');
assert.strictEqual(L.resumePage(fl, { flatland: 99999 }), fl.pageCount, 'a bookmark past the end (a shorter edition) is pulled back');
// contents
assert.strictEqual(L.chapterAt(fl, 1), null, 'the title page is before the first chapter');
assert.strictEqual(L.chapterAt(al, 2).t, 'CHAPTER I. Down the Rabbit-Hole');
assert.strictEqual(L.chapterAt(al, 12).t, 'CHAPTER II. The Pool of Tears'); assert.strictEqual(L.chapterAt(al, 11).t, 'CHAPTER I. Down the Rabbit-Hole', 'a chapter runs until the next begins');
assert.strictEqual(L.chapterAt(al, al.pageCount).t, 'About this edition');
// progress
assert.strictEqual(L.percent(fl, 1), 1); assert.strictEqual(L.percent(fl, fl.pageCount), 100); assert.strictEqual(L.percent(al, 71), 50);
// text size
assert.deepStrictEqual(L.FONT_SIZES, [18, 21, 24, 28, 33]); assert.strictEqual(L.FONT_SIZES[L.DEFAULT_FONT], 24);
assert.deepStrictEqual([-5, 0, 2, 4, 9, 2.5, 'x', undefined].map(L.fontIndex), [0, 0, 2, 4, 4, 2, 2, 2]);
// italics
assert.deepStrictEqual(L.runs('plain'), [{ x: 'plain', em: false }]);
assert.deepStrictEqual(L.runs('a _b_ c'), [{ x: 'a ', em: false }, { x: 'b', em: true }, { x: ' c', em: false }]);
assert.deepStrictEqual(L.runs('_all_'), [{ x: 'all', em: true }]);
assert.deepStrictEqual(L.runs('_one_ _two_'), [{ x: 'one', em: true }, { x: ' ', em: false }, { x: 'two', em: true }]);
assert.deepStrictEqual(L.runs('a stray _ mark'), [{ x: 'a stray _ mark', em: false }], 'a lone underscore is just text');
assert.deepStrictEqual(L.runs(''), []);
assert.strictEqual(L.plainText([['h', 'CHAPTER I.'], ['p', 'Alice _said_ hello.']]), 'CHAPTER I.\nAlice said hello.');
// every page of every book can be drawn: runs never lose or invent text
L.BOOKS.forEach(b => b.pages.forEach((pg, i) => pg.forEach(blk => assert.strictEqual(L.runs(blk[1]).map(r => r.x).join(''), blk[1].replace(/_([^_]+)_/g, '$1'), `${b.id} p${i + 1}`))));
console.log('library tests passed');
