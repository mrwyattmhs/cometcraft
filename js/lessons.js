/* Mini lessons: a short YouTube video that goes with a table. Pure data and helpers (no DOM, no network), so they can be tested in Node.

   To add a lesson, add an entry to DATA and give the table a `lesson: '<key>'` (in casino-interior.js for the walk-up prompt, in the table's own config for its
   menu card). `start` is in seconds (138 = 2:18). Nothing from YouTube is loaded until a student presses play: the poster is drawn here, not fetched. */
const Lessons = (() => {
  const DATA = {
    vertex: {
      id: 'ykh8kmLbBVY',
      start: 138,
      title: 'Vertex form mini lesson',
      heading: 'Vertex form',
      blurb: 'A short lesson on vertex form, then you try it yourself.',
      // shown when the video cannot load (school networks often block YouTube): the same ideas, in text
      summary: [
        'Vertex form is y = a(x \u2212 h)\u00b2 + k.',
        'The vertex is the point (h, k), and the axis of symmetry is the line x = h.',
        'The sign of a says which way the parabola opens, and a bigger a makes it steeper.',
      ],
    },
  };

  const ID_OK = /^[A-Za-z0-9_-]{11}$/;
  const keys = () => Object.keys(DATA);
  const get = key => (Object.prototype.hasOwnProperty.call(DATA, key) ? DATA[key] : null);

  /** A lesson is usable only if its video id looks like a YouTube id (so nothing odd can end up in a link) and it has the text the panel shows. */
  function valid(L) {
    return !!L && ID_OK.test(L.id) && Number.isInteger(L.start) && L.start >= 0 && !!L.title && !!L.heading && !!L.blurb
      && Array.isArray(L.summary) && L.summary.length >= 1 && L.summary.every(s => typeof s === 'string' && s.length > 0);
  }

  /** 138 -> "2:18" */
  const clock = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  /** The plain link, for "Open on YouTube". */
  const watchUrl = L => `https://youtu.be/${L.id}?t=${L.start}`;

  /** The embedded player, in YouTube's privacy-enhanced mode (youtube-nocookie.com). rel=0 keeps the suggestions to the same channel. enablejsapi lets the panel
      hear whether the player really started, so it can show the text version if it did not. `origin` is added only for a real web address. */
  function embedUrl(L, { autoplay = false, origin = '' } = {}) {
    const q = [`start=${L.start}`, 'rel=0', 'playsinline=1', 'modestbranding=1', 'iv_load_policy=3', 'enablejsapi=1'];
    if (autoplay) q.push('autoplay=1');
    if (/^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/.test(origin)) q.push(`origin=${encodeURIComponent(origin)}`);
    return `https://www.youtube-nocookie.com/embed/${L.id}?${q.join('&')}`;
  }

  return { DATA, keys, get, valid, clock, watchUrl, embedUrl };
})();

if (typeof module !== 'undefined') module.exports = Lessons;
