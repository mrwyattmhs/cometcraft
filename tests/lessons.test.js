// Run with: node tests/lessons.test.js
const assert = require('assert');
const L = require('../js/lessons.js');

/* ---------- the vertex lesson is the video that was asked for, starting at 2:18 ---------- */
const v = L.get('vertex');
assert.ok(v, 'there is a vertex lesson');
assert.strictEqual(v.id, 'ykh8kmLbBVY', 'the video id from https://youtu.be/ykh8kmLbBVY');
assert.strictEqual(v.start, 138, '2:18 is 138 seconds (the shared link said t=137, which is 2:17)');
assert.strictEqual(L.clock(v.start), '2:18');
assert.strictEqual(L.watchUrl(v), 'https://youtu.be/ykh8kmLbBVY?t=138');

/* ---------- every lesson is complete ---------- */
assert.ok(L.keys().length >= 1);
L.keys().forEach(k => assert.ok(L.valid(L.get(k)), `lesson ${k} is valid`));
assert.ok(L.get('vertex').summary.length >= 3, 'the text version has the main ideas');
assert.ok(L.get('vertex').summary[0].includes('y = a(x \u2212 h)\u00b2 + k'), 'the text version states vertex form with a real minus sign and a squared symbol');

/* ---------- lookups cannot be tricked ---------- */
assert.strictEqual(L.get('nope'), null);
assert.strictEqual(L.get('constructor'), null, 'inherited object properties are not lessons');
assert.strictEqual(L.get('__proto__'), null);
assert.strictEqual(L.get(undefined), null);

/* ---------- a bad video id or start never makes a lesson ---------- */
const good = { id: 'ykh8kmLbBVY', start: 0, title: 't', heading: 'h', blurb: 'b', summary: ['s'] };
assert.ok(L.valid(good));
assert.ok(!L.valid({ ...good, id: 'short' }), 'too short');
assert.ok(!L.valid({ ...good, id: 'ykh8kmLbBVY&x=1' }), 'no extra characters in the id');
assert.ok(!L.valid({ ...good, id: 'ykh8kmLbBV"' }), 'no quotes in the id');
assert.ok(!L.valid({ ...good, start: -1 }));
assert.ok(!L.valid({ ...good, start: 1.5 }));
assert.ok(!L.valid({ ...good, summary: [] }));
assert.ok(!L.valid({ ...good, summary: [''] }));
assert.ok(!L.valid(null));

/* ---------- clock ---------- */
assert.deepStrictEqual([0, 5, 59, 60, 61, 137, 138, 600, 3725].map(L.clock), ['0:00', '0:05', '0:59', '1:00', '1:01', '2:17', '2:18', '10:00', '62:05']);

/* ---------- the embedded player: privacy mode, starts at 2:18, suggestions limited to the channel ---------- */
const parse = u => { const x = new URL(u); return { host: x.host, path: x.pathname, q: Object.fromEntries(x.searchParams) }; };
const plain = parse(L.embedUrl(v));
assert.strictEqual(plain.host, 'www.youtube-nocookie.com', 'the privacy-enhanced domain, not youtube.com');
assert.strictEqual(plain.path, '/embed/ykh8kmLbBVY');
assert.strictEqual(plain.q.start, '138');
assert.strictEqual(plain.q.rel, '0', 'related videos only from the same channel');
assert.strictEqual(plain.q.enablejsapi, '1', 'the panel can hear whether the player started');
assert.strictEqual(plain.q.playsinline, '1');
assert.ok(!('autoplay' in plain.q), 'no autoplay unless asked');
assert.ok(!('origin' in plain.q), 'no origin unless it is a real web address');
assert.strictEqual(parse(L.embedUrl(v, { autoplay: true })).q.autoplay, '1');
assert.strictEqual(parse(L.embedUrl(v, { origin: 'https://mrwyattmhs.github.io' })).q.origin, 'https://mrwyattmhs.github.io');
['null', 'file://', 'http://localhost:99999x', '', 'javascript:alert(1)', 'https://a.b/path', 'https://a b', 'http://x.y"onload="1'].forEach(o => assert.ok(!('origin' in parse(L.embedUrl(v, { origin: o })).q), `origin ${JSON.stringify(o)} is ignored`));
assert.ok(!L.embedUrl(v).includes('youtube.com/embed'), 'never the cookie-setting domain');

console.log('lessons tests passed');
