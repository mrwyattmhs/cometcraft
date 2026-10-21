/* The Little Library's logic: what the books are, which page to open on, and how a page of text is drawn.
   No DOM and no THREE here, so it is unit tested in Node (tests/library.test.js). The pages themselves come from books-data.js,
   which tools/build-books.js makes from the Project Gutenberg texts in books/. The screen is reader-game.js. */
const Library = (() => {
  const BUILD = 20; // bump together with the ?v= numbers in index.html
  const DATA = typeof BOOKS_DATA !== 'undefined' ? BOOKS_DATA : require('./books-data.js');

  /** Text sizes in pixels, smallest to largest. The middle one is the starting size. */
  const FONT_SIZES = [18, 21, 24, 28, 33];
  const DEFAULT_FONT = 2;

  const BOOKS = DATA.map(b => ({ ...b, pageCount: b.pages.length }));
  const byId = Object.fromEntries(BOOKS.map(b => [b.id, b]));
  const get = id => byId[id] || null;

  /** A page number kept inside the book: whole, at least 1, at most the last page. Nonsense becomes page 1. */
  const clampPage = (book, n) => Math.min(book.pageCount, Math.max(1, Math.floor(Number(n)) || 1));

  /** What someone typed in the "go to page" box: the page, or null if it is not a number at all. */
  function parsePage(book, text) {
    const t = String(text).trim();
    if (!/^\d{1,6}$/.test(t)) return null;
    return clampPage(book, parseInt(t, 10));
  }

  /** Has this person started the book? (They have a saved place.) */
  const started = (reading, id) => !!(reading && reading[id] >= 1);

  /** The page to open on: your bookmark if you have one, else the first page. */
  const resumePage = (book, reading) => (started(reading, book.id) ? clampPage(book, reading[book.id]) : 1);

  /** The Contents entry a page belongs to (the last one that begins on or before it), or null before the first. */
  function chapterAt(book, page) {
    let found = null;
    for (const c of book.chapters) { if (c.p <= page) found = c; else break; }
    return found;
  }

  /** How far through: 0 to 100, whole percent. The About page counts as the end. */
  const percent = (book, page) => Math.round(100 * Math.min(page, book.pageCount) / book.pageCount);

  const fontIndex = i => Math.min(FONT_SIZES.length - 1, Math.max(0, Number.isInteger(i) ? i : DEFAULT_FONT));

  /** Text with _italic_ marks, as pieces to draw: [{ x: 'text', em: false }, { x: 'italic text', em: true }, ...]. A stray underscore is drawn as it is. */
  function runs(text) {
    const out = [];
    const re = /_([^_]+)_/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ x: text.slice(last, m.index), em: false });
      out.push({ x: m[1], em: true });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ x: text.slice(last), em: false });
    return out;
  }

  /** The words on a page with the italic marks taken off, for tests and screen readers. */
  const plainText = page => page.map(b => runs(b[1]).map(r => r.x).join('')).join('\n');

  return { BUILD, FONT_SIZES, DEFAULT_FONT, BOOKS, get, clampPage, parsePage, started, resumePage, chapterAt, percent, fontIndex, runs, plainText };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Library;
