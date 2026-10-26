// Run with: node tests/kelly.test.js
// The kelly-green look has to stay readable. This reads the colours straight out of css/style.css and checks the contrast (WCAG) of every pair of text and background that
// the green windows use, so a future tweak to the green cannot quietly make something hard to read.
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '../css/style.css'), 'utf8');

const block = css.match(/\n\.kelly \{([^}]*)\}/);
assert.ok(block, 'the .kelly block of colours exists');
const tok = {}; for (const m of block[1].matchAll(/--k-([a-z]+):\s*(#[0-9a-fA-F]{6})/g)) tok[m[1]] = m[2].toLowerCase();
assert.deepStrictEqual(Object.keys(tok).sort(), ['card', 'deep', 'edge', 'gold', 'ground', 'ink', 'muted', 'outline', 'soft', 'text'], 'the ten colours of the look');
assert.strictEqual(tok.text, '#ffffff', 'text is white'); assert.strictEqual(tok.soft, '#ffffff', 'the softer text is white too (it is told apart by size and weight, not by a dimmer colour)');
assert.ok(/--k-pop:[^;]*#06200a/.test(block[1]) && tok.outline === '#06200a', 'a dark green outline is available for text that has to stand out');

const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const need = (fg, bg, min, why) => { const r = ratio(fg, bg); assert.ok(r >= min, `${why}: ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1`); return r; };

/* ---------- the window itself is the green asked for: a kelly green, darkened just enough to carry light text ---------- */
const [gr, gg, gb] = [1, 3, 5].map(i => parseInt(tok.ground.slice(i, i + 2), 16));
assert.ok(gg > gr * 2 && gg > gb * 3, `the ground ${tok.ground} is a clearly green colour`);
assert.ok(gg >= 100 && gg <= 140, 'bright enough to read as kelly, not forest or black');

/* ---------- body text: cream, soft and muted, on every surface they sit on ---------- */
for (const fg of ['text', 'soft', 'muted']) for (const bg of ['ground', 'card', 'deep']) need(tok[fg], tok[bg], 4.5, `${fg} text on the ${bg}`);
/* ---------- gold: fine on the cards and the deep green; on the plain ground only for big text ---------- */
need(tok.gold, tok.card, 4.5, 'gold text on a card'); need(tok.gold, tok.deep, 4.5, 'gold text on the deep green (chips)');
need(tok.gold, tok.ground, 3, 'gold on the ground, for the big titles only (28px and up)');
assert.ok(ratio(tok.gold, tok.ground) < 4.5, 'and that is why small gold text is never put straight on the ground (if this ever passes, the note in the CSS can go)');
/* ---------- text on gold buttons and badges ---------- */
need(tok.ink, tok.gold, 4.5, 'dark text on gold');
/* ---------- lines and frames ---------- */
need(tok.edge, tok.card, 3, 'the edge of a card against the card'); need(tok.edge, tok.deep, 3, 'the edge against the deep green'); need(tok.edge, tok.ground, 2.5, 'the window frame against the ground (decorative)');

/* ---------- hover: a card gets a little lighter when the mouse is over it, and the small gold label on it ("New here?") must still be readable ---------- */
const hoverBg = sel => { const m = css.match(new RegExp(sel.replace(/[.:()]/g, '\\$&') + ' \\{ background: (#[0-9a-f]{6})', 'i')); assert.ok(m, `${sel} has a hover colour`); return m[1].toLowerCase(); };
for (const sel of ['.kelly .k-help:hover', '.kelly .bet-card:hover:not(:disabled)']) { const h = hoverBg(sel); assert.notStrictEqual(h, tok.card, `${sel} is visibly different`); need(tok.gold, h, 4.5, `gold text on ${sel}`); need(tok.text, h, 4.5, `white text on ${sel}`); need(tok.muted, h, 4.5, `muted text on ${sel}`); }

/* ---------- the "right" and "wrong" messages: white on a dark pill ---------- */
const pill = sel => { const m = css.match(new RegExp(sel.replace(/[.]/g, '\\.') + ' \\{ background: ([^;]+); color: (#[0-9a-f]{3,6});', 'i')); assert.ok(m, `${sel} has a pill`); return { bg: m[1].replace('var(--k-deep)', tok.deep), fg: m[2].length === 4 ? '#' + [...m[2].slice(1)].map(c => c + c).join('') : m[2] }; };
const good = pill('.kelly .msg.good'), bad = pill('.kelly .msg.bad');
assert.strictEqual(good.fg, '#ffffff'); assert.strictEqual(bad.fg, '#ffffff', 'white even for "Not this time"');
need(good.fg, good.bg, 4.5, 'the "right" message'); need(bad.fg, bad.bg, 4.5, 'the "wrong" message'); assert.notStrictEqual(good.bg, bad.bg, 'right and wrong are told apart by the pill (and by the words)');

/* ---------- the results area after Craft: white text on dark boxes, with a bright marker (the old colours were dark green and dark red on the green) ---------- */
const rule = sel => { const m = css.match(new RegExp('\\n' + sel.replace(/[.]/g, '\\.') + ' \\{([^}]*)\\}')); assert.ok(m, `rule ${sel} exists`); return m[1]; };
const colorOf = body => { const m = body.match(/(?:^|[ ;])color: ([^;]+);/); return m ? m[1].trim() : null; };
['.kelly .checks .ok', '.kelly .checks .bad', '.kelly .checks li', '.kelly .final-expr', '.kelly .work'].forEach(sel => assert.strictEqual(colorOf(rule(sel)), '#fff', `${sel} is white`));
assert.ok(/\.kelly \.final-label, \.kelly \.final\.bad \.final-label \{[^}]*color: #fff/.test(css), 'the labels in the answer boxes are white, right or wrong');
assert.strictEqual(colorOf(rule('.kelly .work small')), 'var(--k-muted)');
need('#ffffff', tok.deep, 4.5, 'the verdict lines sit on the deep green'); need('#ffffff', '#4a1d1d', 4.5, 'white on the "missed" answer box'); need(tok.muted, tok.ground, 4.5, 'the step labels');
const mint = rule('.kelly .checks .ok').match(/border-color: (#[0-9a-f]{6})/i)[1], coral = rule('.kelly .checks .bad').match(/border-color: (#[0-9a-f]{6})/i)[1];
need(mint, tok.deep, 3, 'the "correct" marker against its pill'); need(coral, tok.deep, 3, 'the "missed" marker against its pill'); assert.ok(Math.abs(lum(mint) - lum(coral)) > 0.1, 'the two markers also differ in lightness, not only in hue');
assert.ok(/\.kelly \.gem-face \{ background: color-mix\(in srgb, var\(--gem\) 55%, var\(--k-outline\)\)/.test(css), 'the number tiles are darkened so their white numbers can be read');

/* ---------- the walk-up card (outside the green windows) uses the same colours ---------- */
const hud = css.match(/\.prompt-lesson \{([^}]*)\}/)[1];
assert.ok(hud.includes(`background: ${tok.card}`), 'the walk-up card is the card green'); assert.ok(hud.includes(`border: 2px solid ${tok.gold}`), 'with the gold border'); assert.ok(hud.includes(`color: ${tok.text}`));
assert.ok(new RegExp(`\\.pl-text b \\{[^}]*color: ${tok.gold}`).test(css), 'its label is gold, on the card green'); assert.ok(new RegExp(`\\.pl-time \\{[^}]*background: ${tok.gold}[^}]*color: ${tok.ink}`).test(css));

/* ---------- the drawn art and the level sketches use the same gold and edge as the CSS ---------- */
const art = fs.readFileSync(path.join(__dirname, '../js/lesson-panel.js'), 'utf8'), engine = fs.readFileSync(path.join(__dirname, '../js/parabola-game.js'), 'utf8');
assert.ok(art.includes(tok.gold) && art.includes(tok.deep) && art.includes(tok.muted) && art.includes(tok.text), 'the poster is drawn in the palette');
assert.ok(engine.includes(`stroke="${tok.edge}"`) && engine.includes(`stroke="${tok.gold}"`) && engine.includes(`fill="${tok.text}"`), 'the level sketches are drawn in the palette');
/* ---------- nothing blue is left in the kelly styles (the old navy of the mockup) ---------- */
const kellyCss = css.slice(css.indexOf('/* ---------- the kelly-green look'));
assert.ok(!/#(181c36|232850|0d1020|3b4278|c4c9e8|a9afd6|ffb347)/i.test(kellyCss), 'no navy left in the kelly styles');

console.log('kelly palette tests passed');
