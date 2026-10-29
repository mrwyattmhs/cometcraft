// The simulated browser: jsdom with the game's own files loaded (index.html's markup plus every js/ file in the order index.html lists them), Three.js r128, and stubs for
// the canvas and WebGL. Fast (a second or two) and exact for anything that does not need real layout or real pixels.
//   const s = sim.create();  s.T.Store, s.T.PolyMulGame ...  s.$('id'), s.click(el), s.key('KeyE'), await s.frames(5), s.G (the game's __primeTime), s.errors
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const { ROOT, TEST, read, sleep } = require('./util');
const EXPOSE = ['Store', 'UI', 'Player', 'Economy', 'Trophies', 'World', 'CONTENT', 'Polys', 'PolyMulGame', 'PolyAddGame', 'Cubes', 'CubesGame', 'Minesweeper', 'Minefield', 'MinesMenu', 'CasinoInterior', 'CraftingGame',
  'TrinomialGame', 'RadicalGame', 'ParabolaGame', 'VertexGame', 'LinesGame', 'CoasterGame', 'Shop', 'TrophyCase', 'MapGame', 'ArithmeticGame', 'LittleLibrary', 'DormPlanner', 'Factoring', 'Trinomials', 'Radicals'];

function create() {
  let html = read('index.html');
  const scripts = [...html.matchAll(/<script src="(js\/[^"?]+)(?:\?v=\d+)?"><\/script>/g)].map(m => m[1]);
  html = html.replace(/<link[^>]*>/g, '').replace(/<script src="[^"]*"><\/script>/g, '');          // we load the local files ourselves, and nothing from the network
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, errors = [];
  w.addEventListener('error', e => errors.push(e.message));
  w.HTMLCanvasElement.prototype.getContext = function () { return new Proxy({}, { get: (t, k) => k === 'measureText' ? s => ({ width: String(s).length * 8 }) : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true }); };
  w.HTMLElement.prototype.focus = function () { this.ownerDocument.__focused = this; };
  w.matchMedia = () => ({ matches: true });
  w.eval(fs.readFileSync(path.join(TEST, 'node_modules/three/build/three.js'), 'utf8'));
  w.THREE.WebGLRenderer = function () { return { setPixelRatio() {}, setSize() {}, render() {} }; };
  const code = scripts.map(f => read(f)).join('\n;\n') + `\n;window.__T = {${EXPOSE.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')}};`;
  w.eval(code);
  const doc = w.document, $ = id => doc.getElementById(id);
  return {
    w, doc, $, errors, T: w.__T, G: w.__primeTime,
    click: el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })),
    key: (code, type = 'keydown') => w.dispatchEvent(new w.KeyboardEvent(type, { code, key: code === 'Enter' ? 'Enter' : code, bubbles: true })),
    frames: n => sleep(n * 17),
    /** Make Math.random deterministic inside the game (so a table deals the problem you want to test). */
    seed(n) { const { seeded } = require('./util'); w.Math.random = seeded(n); },
    start() { this.click($('play')); },
    /** Run a line of game code (like "PolyMulGame.open()") with the game's names in scope. */
    exec(js) { const names = [...Object.keys(this.T), '__primeTime'], vals = [...Object.values(this.T), this.G]; return new w.Function(...names, `return (${js});`)(...vals); },
  };
}
module.exports = { create };
