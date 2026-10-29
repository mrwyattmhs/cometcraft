// Small helpers shared by the suites.
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../../..');
const TEST = path.resolve(__dirname, '..');
const seeded = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** Copy a value out of the page (or the simulated window) into plain Node data, so assert.deepStrictEqual can compare it. */
const plain = v => JSON.parse(JSON.stringify(v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const text = el => el.textContent.replace(/\s+/g, ' ').trim();
module.exports = { ROOT, TEST, seeded, plain, sleep, read, text };
