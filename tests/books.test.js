// Run with: node tests/books.test.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const B = require('../tools/build-books.js');
const DATA = require('../js/books-data.js');

/* ---------- the data file is exactly what the build tool makes from the texts in books/ ---------- */
const fresh = B.buildAll();
assert.deepStrictEqual(DATA, fresh, 'js/books-data.js is out of date: run  node tools/build-books.js');
assert.strictEqual(fs.readFileSync(path.join(__dirname, '..', 'js', 'books-data.js'), 'utf8'), B.render(fresh), 'and it is written byte for byte as the tool writes it');
assert.deepStrictEqual(DATA.map(b => b.id), ['flatland', 'alice', 'tangled']);
assert.deepStrictEqual(DATA.map(b => b.pg), [97, 11, 29042], 'Project Gutenberg ebook numbers');

/* ---------- the pieces ---------- */
// titles
assert.strictEqual(B.pretty('KNOT IV. THE DEAD RECKONING.'), 'Knot IV. The Dead Reckoning.');
assert.strictEqual(B.pretty('KNOT IX. A SERPENT WITH CORNERS.'), 'Knot IX. A Serpent with Corners.');
assert.strictEqual(B.pretty('ANSWERS TO KNOT VIII.'), 'Answers to Knot VIII.');
assert.strictEqual(B.pretty('PREFACE.'), 'Preface.');
assert.strictEqual(B.pretty('PREFACE TO THE SECOND EDITION, 1884.  BY THE EDITOR'), 'Preface to the Second Edition, 1884.  By the Editor');
assert.strictEqual(B.pretty('SECTION 4 Concerning the Women'), 'SECTION 4 Concerning the Women', 'a heading in mixed case is left alone');
// symbols and illustration notes
assert.strictEqual(B.preprocess('AB = [** sqrt](x^2 + y^{3}) [** therefore] 5^{10}'), 'AB = \u221a(x\u00b2 + y\u00b3) \u2234 5\u00b9\u2070');
assert.ok(!B.preprocess('Before. In this version the square root symbol is indicated by [** sqrt], the\nsuperscript by ^, and the therefore symbol by [** therefore]. After.').includes('In this version'), "the transcriber's note about the old notation is dropped");
assert.strictEqual(B.preprocess('a [Illustration] b'), 'a \n\n b', 'a bare illustration marker is dropped');
assert.ok(B.preprocess('a [Illustration: "ONE\nTWO."\n\n_Frontispiece._] b').includes(B.ILL + '"ONE TWO." _Frontispiece._'), 'a caption is kept, even across a blank line');
// blocks
const meta = B.BOOKS.find(b => b.id === 'tangled');
const kinds = text => B.blocks(text, meta, false).map(b => b.t);
assert.deepStrictEqual(kinds('KNOT I.\n\nEXCELSIOR.\n\nSome wrapped\ntext here.'), ['h', 'p'], 'a subtitle joins its heading');
assert.deepStrictEqual(B.blocks('Some wrapped\ntext   here.', meta, false), [{ t: 'p', x: 'Some wrapped text here.' }], 'wrapped lines become one paragraph');
assert.deepStrictEqual(B.blocks('     \u2018How doth\n      the little\n     crocodile', meta, false), [{ t: 'v', x: '\u2018How doth\n marking'.slice(0, 0) + '\u2018How doth\n the little\ncrocodile' }], 'indented lines stay as lines, relative indent kept');
assert.deepStrictEqual(kinds('       *       *       *       *       *'), ['b']);
assert.deepStrictEqual(kinds('[Footnote A: "_Maskee_," means "_without_."]'), ['n']);
assert.deepStrictEqual(kinds('OLD SONG.'), ['s']);
// cutting long blocks
const sentences = Array.from({ length: 80 }, (_, i) => `This is sentence number ${i} of a very long paragraph, with _some italic words ${i}_ in it.`).join(' ');
const parts = B.cut({ t: 'p', x: sentences }, 500);
assert.ok(parts.length > 8 && parts.every(p => p.x.length <= 600), 'a long paragraph is cut into pages of about the limit');
assert.strictEqual(parts.map(p => p.x).join(' '), sentences, 'and the pieces put back together are the paragraph');
assert.ok(parts.every(p => (p.x.match(/_/g) || []).length % 2 === 0), 'never inside an italic span');
assert.deepStrictEqual(B.cut({ t: 'p', x: 'short.' }, 500), [{ t: 'p', x: 'short.' }]);
const verse = Array.from({ length: 60 }, (_, i) => `  line ${i} of the poem`).join('\n');
const vp = B.cut({ t: 'v', x: verse }, 300);
assert.ok(vp.length > 3 && vp.every(p => p.x.length <= 300) && vp.map(p => p.x).join('\n') === verse, 'verse is cut between lines');
const giant = 'word '.repeat(2000).trim() + '.';
assert.strictEqual(B.cut({ t: 'p', x: giant }, 500).map(p => p.x).join(' '), giant, 'even one huge sentence loses nothing');
// pages: a heading starts a page; consecutive headings share it; a heading is never left at the foot
const pg = B.paginate([{ t: 'p', x: 'a'.repeat(300) }, { t: 'h', x: 'ONE' }, { t: 'p', x: 'b'.repeat(300) }, { t: 'h', x: 'TWO' }, { t: 'h', x: 'TWO-B' }, { t: 'p', x: 'c'.repeat(10) }]);
assert.deepStrictEqual(pg.pages.map(p => p.map(b => b.t).join('')), ['p', 'hp', 'hhp']);
assert.deepStrictEqual(pg.chapters, [{ t: 'ONE', p: 2 }, { t: 'TWO', p: 3 }, { t: 'TWO-B', p: 3 }]);
const pg2 = B.paginate([{ t: 'p', x: 'a'.repeat(1400) }, { t: 's', x: 'SUB' }, { t: 'p', x: 'b'.repeat(500) }]);
assert.deepStrictEqual(pg2.pages.map(p => p.map(b => b.t).join('')), ['p', 'sp'], 'a subheading moves to the next page with its text');
const pg3 = B.paginate([{ t: 'h', x: 'ONE' }, { t: 'p', x: 'a'.repeat(1500) }, { t: 'p', x: 'tail.' }, { t: 'h', x: 'TWO' }, { t: 'p', x: 'x' }]);
assert.deepStrictEqual(pg3.pages.map(p => p.map(b => b.t).join('')), ['hpp', 'hp'], 'a tiny last page folds back into its chapter');

/* ---------- each book: nothing lost, nothing out of order ---------- */
const words = s => s.replace(/_/g, '').split(/\s+/).filter(w => w && w !== '*');
const pageWords = pages => words(pages.flat().map(b => b[1]).join(' '));
const SET = new Set(['h', 's', 'p', 'v', 'n', 'i', 'b']);
let totalPages = 0;
DATA.forEach(book => {
  const meta = B.BOOKS.find(m => m.id === book.id);
  const raw = fs.readFileSync(path.join(__dirname, '..', 'books', meta.file)).toString('utf8');
  const { header, body, footer } = B.split(raw);
  const about = book.chapters.find(c => c.t === B.ABOUT);
  assert.ok(about && about.p === book.chapters[book.chapters.length - 1].p, `${book.id}: the About page comes last`);
  const story = pageWords(book.pages.slice(0, about.p - 1)), aboutW = pageWords(book.pages.slice(about.p - 1));
  let src = words(B.preprocess(body).replace(new RegExp(B.ILL, 'g'), '')).join(' ');
  if (book.id === 'tangled') src = src.replace('A TANGLED TALE. KNOT I.', 'KNOT I.');            // the repeated half-title line
  assert.strictEqual(story.join(' '), src, `${book.id}: every word of the story is on the pages, once, in order`);
  const tail = words(header).concat(words(footer)).join(' ');
  assert.ok(aboutW.join(' ').endsWith(tail), `${book.id}: the Project Gutenberg title block and license are kept in full`);
  assert.ok(/Project Gutenberg/.test(aboutW.join(' ')) && /public domain/.test(aboutW.slice(0, 80).join(' ')), `${book.id}: and the page says where the book comes from`);

  // shape
  assert.ok(book.pages.length >= 100 && book.pages.length <= 260, `${book.id}: ${book.pages.length} pages is a sensible book`);
  totalPages += book.pages.length;
  book.pages.forEach((page, i) => {
    assert.ok(page.length > 0, `${book.id} p${i + 1}: not empty`);
    const chars = page.reduce((n, b) => n + b[1].length, 0);
    assert.ok(chars <= B.PAGE_CHARS * 1.3, `${book.id} p${i + 1}: ${chars} characters fits a screen`);
    page.forEach(b => {
      assert.ok(SET.has(b[0]) && typeof b[1] === 'string' && b[1].length > 0, `${book.id} p${i + 1}: a known block type with text`);
      assert.ok((b[1].match(/_/g) || []).length % 2 === 0, `${book.id} p${i + 1}: italic marks are paired in "${b[1].slice(0, 40)}"`);
      assert.ok(!/\[\*\*|\^\d/.test(b[1]), `${book.id} p${i + 1}: no unconverted symbols`);
      assert.ok(!/\r|\u0001/.test(b[1]), `${book.id} p${i + 1}: no stray control characters`);
    });
    const last = page[page.length - 1][0];
    const next = book.pages[i + 1];
    if (next && next[0][0] !== 'h') assert.ok(last !== 'h' && !(last === 's' && page.length > 1), `${book.id} p${i + 1}: where the text runs on, a heading is not left at the foot of the page`);
    const firstNonH = page.findIndex(b => b[0] !== 'h');
    assert.ok(firstNonH === -1 || page.slice(firstNonH).every(b => b[0] !== 'h'), `${book.id} p${i + 1}: a chapter heading is at the top of its page`);
  });
  // the Contents list
  book.chapters.forEach((c, i) => {
    assert.ok(Number.isInteger(c.p) && c.p >= 1 && c.p <= book.pages.length, `${book.id}: "${c.t}" points at a real page`);
    if (i) assert.ok(c.p >= book.chapters[i - 1].p, `${book.id}: the Contents list is in page order`);
    assert.ok(book.pages[c.p - 1].some(b => b[0] === 'h' && B.pretty(b[1]) === c.t || b[0] === 'h' && c.t === B.ABOUT), `${book.id}: "${c.t}" is a heading on page ${c.p}`);
  });
  assert.ok(book.title && book.author && book.year > 1800 && /^#[0-9a-f]{6}$/.test(book.color));
});

/* ---------- what is in each book ---------- */
const byId = Object.fromEntries(DATA.map(b => [b.id, b]));
const chap = (id, re) => byId[id].chapters.filter(c => re.test(c.t)).length;
assert.strictEqual(chap('flatland', /^SECTION \d+/), 22, 'Flatland has 22 sections'); assert.strictEqual(chap('flatland', /^Part/i), 2); assert.strictEqual(byId.flatland.chapters.filter(c => /^Preface/.test(c.t)).length, 1);
assert.ok(byId.flatland.chapters.some(c => c.t === 'Preface to the Second and Revised Edition, 1884. By the Editor'), 'the preface title is tidied, and a word after a period is capitalized');
assert.strictEqual(chap('alice', /^CHAPTER [IVX]+\./), 12, 'Alice has 12 chapters');
assert.strictEqual(chap('tangled', /^Knot [IVX]+\./), 10, 'A Tangled Tale has 10 knots'); assert.strictEqual(chap('tangled', /^Answers to Knot/), 10, 'and 10 sets of answers');
const text = id => byId[id].pages.flat().map(b => b[1]).join('\n');
assert.ok(text('flatland').includes('I call our world Flatland, not because we call it so'));
assert.ok(text('flatland').includes('SECTION 22') && /Pentagon|Hexagon/.test(text('flatland')));
assert.ok(text('alice').includes('\u2018Curiouser and curiouser!\u2019') && text('alice').includes('Down the Rabbit-Hole'));
assert.ok(/Alice\u2019s Evidence/.test(text('alice')) && /THE END/.test(text('alice')));
assert.ok(text('tangled').includes('Mad Mathesis') && text('tangled').includes('KNOT I. EXCELSIOR.') && text('tangled').includes('A MARLBOROUGH BOY'));
assert.strictEqual(byId.tangled.pages.flat().filter(b => b[0] === 'i').length, 5, 'five captioned illustrations are noted in A Tangled Tale');
assert.strictEqual(byId.flatland.pages.flat().filter(b => b[0] === 'i').length + byId.alice.pages.flat().filter(b => b[0] === 'i').length, 0);
assert.ok(/\u221a\(?/.test(text('tangled')) && /\u2234/.test(text('tangled')) && /12\u00b2 \+ 5\u00b2/.test(text('tangled')) && !text('tangled').includes('^'), 'square roots, therefore signs and exponents are shown as symbols: \u221a(12\u00b2 + 5\u00b2) = \u221a169 = 13');
// verse keeps its lines
const croc = byId.alice.pages.flat().find(b => b[1].includes('How doth the little crocodile'));
assert.ok(croc && croc[0] === 'v' && croc[1].split('\n').length === 4 && /^\u2018How doth the little crocodile\n /.test(croc[1]), 'the crocodile poem keeps its four lines and its indents');
// footnotes and the italics survive
assert.ok(byId.tangled.pages.flat().some(b => b[0] === 'n' && /^\[Footnote A:/.test(b[1])), 'footnotes are marked');
assert.ok(/_Problem\._/.test(text('tangled')), 'italic marks are kept for the reader to draw');
// the book's own first words open page 1
const page1 = id => byId[id].pages[0].map(b => b[1]).join('\n');
assert.ok(/Flatland by Edwin A\. Abbott/.test(page1('flatland')) && /ALICE\u2019S ADVENTURES IN WONDERLAND/.test(page1('alice')) && /A TANGLED TALE/.test(page1('tangled')), 'each book opens on its own title page');
console.log(`book tests passed (${DATA.map(b => `${b.id} ${b.pages.length}`).join(', ')} pages)`);
