/* Turns the Project Gutenberg texts in books/ into js/books-data.js: the pages the Little Library reader shows.

   Run:  node tools/build-books.js          (rewrites js/books-data.js; tests/books.test.js fails if it is out of date)

   What it does to a book:
   - cuts it into pages of about PAGE_CHARS characters, so "page 12" is the same page on every screen and every font size
   - starts every chapter on a new page and notes which page, for the Contents list
   - keeps verse and indented blocks as they are, joins ordinary wrapped lines into paragraphs, and marks footnotes, subheadings,
     illustration notes and * * * breaks so the reader can style them
   - keeps the Project Gutenberg title block and license, after the story, on an "About this edition" page
   Nothing in a book is dropped except the two bare "[Illustration]" markers (there are no pictures here) and the line endings.
   Three small symbol fixes are made to A Tangled Tale, because its transcriber spelled them out: [** sqrt] becomes √,
   [** therefore] becomes ∴, and ^2 becomes ². The page text, in order, is checked against the source by the test. */
const fs = require('fs'), path = require('path');

const PAGE_CHARS = 1600;      // a page holds about this much text; one screen at the normal font size
const ILL = '\u0001';         // marks an illustration note while a text is being cut up
const ABOUT = 'About this edition';
const SUP = { 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079' };

const BOOKS = [
  { id: 'flatland', file: 'flatland-97.txt', pg: 97, title: 'Flatland', short: 'Flatland', subtitle: 'A Romance of Many Dimensions', author: 'Edwin A. Abbott', year: 1884, color: '#2f6f8f',
    chapter: /^(PART (\d+|[IVX]+)\b|SECTION \d+\b|PREFACE TO THE SECOND)/, subtitleAfter: /^PART\b/ },
  { id: 'alice', file: 'alice-11.txt', pg: 11, title: 'Alice\u2019s Adventures in Wonderland', subtitle: '', short: 'Alice in Wonderland', author: 'Lewis Carroll', year: 1865, color: '#3f93c9',
    chapter: /^CHAPTER [IVX]+\./, subtitleAfter: null },
  { id: 'tangled', file: 'tangled-29042.txt', pg: 29042, title: 'A Tangled Tale', short: 'A Tangled Tale', subtitle: 'ten puzzles hidden in ten stories', author: 'Lewis Carroll', year: 1885, color: '#8e3b46',
    chapter: /^(KNOT [IVX]+\.|APPENDIX\.|PREFACE\.|CONTENTS\.|ANSWERS TO KNOT\s+[IVX]+\.)$/, subtitleAfter: /^KNOT\b/, dropTitleLine: /^A TANGLED TALE\.?$/ },
];

/* ---------- reading the file ---------- */
function split(raw) {
  const s = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const a = s.indexOf('*** START OF'), b = s.indexOf('*** END OF');
  if (a < 0 || b < 0) throw new Error('no Project Gutenberg start/end markers');
  const headerEnd = a, bodyStart = s.indexOf('\n', a) + 1, footerStart = s.indexOf('\n', b) + 1;
  return { header: s.slice(0, headerEnd), body: s.slice(bodyStart, b), footer: s.slice(footerStart) };
}

/** Symbol fixes and illustration notes, applied before a text is cut into blocks. */
function preprocess(text) {
  return text
    .replace(/\[\*\* sqrt\]/g, '\u221a').replace(/\[\*\* therefore\]/g, '\u2234')
    .replace(/\^\{(\d+)\}|\^(\d)/g, (m, many, one) => (many || one).replace(/\d/g, d => SUP[d]))
    .replace(/In this version the square root symbol is indicated by[\s\S]*?by \u2234\.\s*/, '')   // the transcriber's note about the old notation, which no longer applies
    .replace(/\[Illustration(?::\s*([\s\S]*?))?\]/g, (m, cap) => (cap && cap.trim() ? `\n\n${ILL}${cap.replace(/\s+/g, ' ').trim()}\n\n` : '\n\n'));
}

const squash = s => s.replace(/\s+/g, ' ').trim();
const isCaps = s => { const t = s.replace(/[_\s]/g, ''); return /[A-Z]/.test(t) && t === t.toUpperCase() && !/^[\W\d]+$/.test(t); };

/** Blocks: { t, x } with t one of h (chapter heading), s (subheading), p (paragraph), v (verse or indented), n (note), i (illustration), b (break). */
function blocks(text, book, plain) {
  const out = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    const lines = cur; cur = [];
    const first = lines[0].trim();
    if (first.startsWith(ILL)) { out.push({ t: 'i', x: squash(lines.join(' ').replace(ILL, '')) }); return; }
    if (/^\s*(\*\s+){2,}\*\s*$/.test(lines.join(' '))) { out.push({ t: 'b', x: '* * *' }); return; }
    if (!plain && book.chapter && lines.length <= 2 && book.chapter.test(squash(first))) { out.push({ t: 'h', x: squash(lines.join(' ')) }); return; }
    if (lines.length === 1 && first.length <= 70 && isCaps(first)) { out.push({ t: 's', x: squash(first) }); return; }
    if (/^\[Footnote/.test(first)) { out.push({ t: 'n', x: squash(lines.join(' ')) }); return; }
    const indented = lines.filter(l => /^ {2,}/.test(l)).length;
    if (indented * 2 >= lines.length && lines.length) {
      const min = Math.min(...lines.map(l => l.match(/^ */)[0].length));
      out.push({ t: plain ? 'n' : 'v', x: lines.map(l => l.slice(min).replace(/\s+$/, '')).join('\n') });
      return;
    }
    out.push({ t: plain ? 'n' : 'p', x: squash(lines.join(' ')) });
  };
  text.split('\n').forEach(line => { if (line.trim() === '') flush(); else cur.push(line); });
  flush();
  // a half-title that just repeats the book's name right before the first chapter heading is dropped (it would be stranded at a page foot)
  if (!plain && book.dropTitleLine) for (let i = out.length - 2; i >= 0; i--) if (out[i].t === 's' && book.dropTitleLine.test(out[i].x) && out[i + 1].t === 'h') out.splice(i, 1);
  // a subtitle that belongs to a heading (PART 1 / THIS WORLD, KNOT I. / EXCELSIOR.) joins it
  if (!plain && book.subtitleAfter) {
    for (let i = 0; i < out.length - 1; i++) {
      if (out[i].t === 'h' && book.subtitleAfter.test(out[i].x) && out[i + 1].t === 's') { out[i].x += ' ' + out[i + 1].x; out.splice(i + 1, 1); }
    }
  }
  return out;
}

/* ---------- cutting into pages ---------- */
const balanced = s => (s.match(/_/g) || []).length % 2 === 0;

/** A block too big for one page, split at sentence ends (or lines, for verse), never inside an _italic_ span. */
function cut(block, limit) {
  if (block.x.length <= limit) return [block];
  if (block.t === 'v') {
    const parts = []; let cur = [];
    block.x.split('\n').forEach(line => { if (cur.length && (cur.join('\n') + '\n' + line).length > limit) { parts.push(cur.join('\n')); cur = []; } cur.push(line); });
    if (cur.length) parts.push(cur.join('\n'));
    return parts.map(x => ({ t: 'v', x }));
  }
  const ends = []; const re = /[.!?]["'\u201d\u2019)\]_]*\s+/g; let m;
  while ((m = re.exec(block.x))) ends.push(m.index + m[0].length);
  const parts = []; let start = 0, lastGood = -1;
  for (const e of ends.concat([block.x.length])) {
    const chunk = block.x.slice(start, e);
    if (chunk.length > limit && lastGood > start) { parts.push(block.x.slice(start, lastGood)); start = lastGood; lastGood = -1; }
    if (balanced(block.x.slice(start, e))) lastGood = e;
  }
  if (start < block.x.length) parts.push(block.x.slice(start));
  return parts.map(x => ({ t: block.t, x: x.trim() })).filter(p => p.x);
}

const WIDOW = 380;   // a chapter's last page shorter than this is folded into the page before it, if the two fit together

function paginate(list, limit = PAGE_CHARS) {
  const pages = [], chapters = [], sizes = [];
  let cur = [], size = 0, prevH = false;
  const total = blocksOf => blocksOf.reduce((n, b) => n + b.x.length + 40, 0);
  const flush = (carry = true, endOfChapter = false) => {
    let tail = [];
    while (carry && cur.length > 1 && (cur[cur.length - 1].t === 'h' || cur[cur.length - 1].t === 's')) tail.unshift(cur.pop());   // a heading is never left alone at the foot of a page
    if (cur.length) {
      if (endOfChapter && pages.length && cur[0].t !== 'h' && cur[0].t !== 's' && size < WIDOW && sizes[sizes.length - 1] + size <= limit * 1.3) {
        pages[pages.length - 1].push(...cur); sizes[sizes.length - 1] += size;     // a short tail rejoins its chapter's previous page
      } else { pages.push(cur); sizes.push(size); }
    }
    cur = tail; size = total(tail);
  };
  for (const b of list) {
    if (b.t === 'h' && !prevH) flush(false, true);
    for (const part of cut(b, limit)) {
      const len = part.x.length + 40;
      if (cur.length && size + len > limit) flush();
      cur.push(part); size += len;
      if (part.t === 'h') chapters.push({ t: part.x, p: pages.length + 1 });
    }
    prevH = b.t === 'h';
  }
  flush(false, true);
  return { pages, chapters };
}

/** "KNOT IV. THE DEAD RECKONING." becomes "Knot IV. The Dead Reckoning."; mixed-case headings stay as they are. */
const SMALL = new Set(['of', 'to', 'the', 'a', 'an', 'and', 'in', 'on', 'with', 'for', 'at', 'by']);
function pretty(t) {
  if (t !== t.toUpperCase()) return t;
  let prev = '';
  return t.toLowerCase().split(/(\s+)/).map((w, i) => {
    if (!w.trim()) return w;
    const roman = /^[ivxlcdm]+\.$/.test(w);
    const out = roman ? w.toUpperCase() : (i > 0 && SMALL.has(w.replace(/[^a-z]/g, '')) && !/\.$/.test(prev)) ? w : w[0].toUpperCase() + w.slice(1);
    prev = w; return out;
  }).join('');
}

function buildBook(raw, meta) {
  const { header, body, footer } = split(raw);
  const story = paginate(blocks(preprocess(body), meta, false));
  const credit = `This book comes from Project Gutenberg (ebook #${meta.pg}), where it is free to read. In the United States it is in the public domain. ` +
    'Here the pages are cut to fit the screen, so they are not the pages of the printed book, and the pictures are left out.' +
    (meta.id === 'tangled' ? ' Square roots, \u201ctherefore\u201d signs and exponents are shown with symbols.' : '');
  const aboutBlocks = [{ t: 'h', x: ABOUT }, { t: 'p', x: credit }, ...blocks(header, meta, true), ...blocks(footer, meta, true)];
  const about = paginate(aboutBlocks);
  const pages = story.pages.concat(about.pages.map(p => p));
  const chapters = story.chapters.concat(about.chapters.map(c => ({ t: c.t, p: c.p + story.pages.length })));
  return {
    id: meta.id, title: meta.title, short: meta.short, subtitle: meta.subtitle, author: meta.author, year: meta.year, pg: meta.pg, color: meta.color,
    chapters: chapters.map(c => ({ t: pretty(c.t), p: c.p })),
    pages: pages.map(pg => pg.map(b => [b.t, b.x])),
  };
}

function buildAll(dir = path.join(__dirname, '..', 'books')) {
  return BOOKS.map(meta => buildBook(fs.readFileSync(path.join(dir, meta.file)).toString('utf8'), meta));
}

function render(books) {
  return `/* GENERATED by tools/build-books.js from the Project Gutenberg texts in books/. Do not edit by hand.\n   Each book: its details, a Contents list ({ t: title, p: page }), and pages, each a list of [type, text] blocks. */\n` +
    `const BOOKS_DATA = ${JSON.stringify(books)};\n\nif (typeof module !== 'undefined' && module.exports) module.exports = BOOKS_DATA;\n`;
}

module.exports = { PAGE_CHARS, ILL, ABOUT, BOOKS, split, preprocess, blocks, cut, paginate, pretty, buildBook, buildAll, render };

if (require.main === module) {
  const books = buildAll();
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'books-data.js'), render(books));
  books.forEach(b => console.log(`${b.id}: ${b.pages.length} pages, ${b.chapters.length} contents entries`));
}
