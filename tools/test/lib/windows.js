// Every window in the game: how to open it, where it is in the page, and the states a player sees. Used by the tour and by the structure checks.
const open = js => async page => { await page.evaluate(js => (0, eval)(js), js); };
const click = sel => async page => { const ok = await page.evaluate(s => { const b = document.querySelector(s); if (b) { b.click(); return true; } return false; }, sel); if (!ok) throw new Error('nothing to click: ' + sel); };
const seq = (...fs) => async (page, g) => { for (const f of fs) { await f(page, g); await g.sleep(450); } };

/** name -> { open: how it opens, root: its element, wing: it has the wing/icon/title header } */
const WINDOWS = {
  practice:  { open: `CraftingGame.open('practice')`, root: '#craft', wing: true },   trinomial: { open: `TrinomialGame.open()`, root: '#tri', wing: true },
  radical:   { open: `RadicalGame.open()`, root: '#rad', wing: true },                parabola:  { open: `ParabolaGame.open()`, root: '#par', wing: true },
  lines:     { open: `LinesGame.open()`, root: '#lin', wing: true },                  coaster:   { open: `CoasterGame.open()`, root: '#cst', wing: true },
  vertex:    { open: `VertexGame.open()`, root: '#vtx', wing: true },                 cubes:     { open: `CubesGame.open()`, root: '#cub', wing: true },
  multiply:  { open: `PolyMulGame.open()`, root: '#pmul', wing: true },               addsub:    { open: `PolyAddGame.open()`, root: '#padd', wing: true },
  shop:      { open: `Shop.open('style')`, root: '#shop', wing: true },               hints:     { open: `UI.shop('hints')`, root: '#dialog' },
  trophies:  { open: `TrophyCase.open()`, root: '#tcase', wing: true },               arith:     { open: `ArithmeticGame.open('add')`, root: '#arith', wing: true },
  usmap:     { open: `MapGame.open()`, root: '#usmap', wing: true },                  library:   { open: `LittleLibrary.open()`, root: '#lib', wing: true },
  dorm:      { open: `DormPlanner.open(__primeTime.dorm.dormRoom)`, root: '#dorm', wing: true },
  mines:     { open: `__primeTime.minesMenu.open()`, root: '#mines' },               lesson:    { open: `(typeof LessonPanel !== 'undefined') && LessonPanel.open()`, root: '#lesson' },
};
/** Extra states: [name, async (page, g) => put the window in that state]. Each is scanned for readable text. */
const STATES = [
  ['practice:open', open(WINDOWS.practice.open)],
  ['trinomial:menu', open(WINDOWS.trinomial.open)], ['trinomial:play', seq(open(WINDOWS.trinomial.open), click('#tri .bet-card, #tri .bet'))],
  ['radical:menu', open(WINDOWS.radical.open)], ['radical:play', seq(open(WINDOWS.radical.open), click('#rad .bet-card, #rad .bet'))],
  ['parabola:menu', open(WINDOWS.parabola.open)], ['parabola:play', seq(open(WINDOWS.parabola.open), click('#par .bet-card, #par .bet'))],
  ['vertex:menu', open(WINDOWS.vertex.open)], ['vertex:play', seq(open(WINDOWS.vertex.open), click('#vtx .bet-card, #vtx .bet'))],
  ['lines:menu', open(WINDOWS.lines.open)], ['lines:play', seq(open(WINDOWS.lines.open), click('#lin .bet-card, #lin .bet'))],
  ['coaster:menu', open(WINDOWS.coaster.open)], ['coaster:play', seq(open(WINDOWS.coaster.open), click('#cst .bet-card, #cst .bet, #cst button[data-level]'))],
  ['cubes:menu', open(WINDOWS.cubes.open)], ['cubes:play', seq(open(WINDOWS.cubes.open), click('#cub .bet'))],
  ['multiply:menu', open(WINDOWS.multiply.open)], ['multiply:play', seq(open(WINDOWS.multiply.open), click('#pmul .bet'))],
  ['addsub:menu', open(WINDOWS.addsub.open)], ['addsub:play', seq(open(WINDOWS.addsub.open), click('#padd-levels .bet:nth-child(2)'))],
  ['shop:open', open(WINDOWS.shop.open)], ['hints:open', open(WINDOWS.hints.open)], ['trophies:open', open(WINDOWS.trophies.open)],
  ['arith:rules', open(WINDOWS.arith.open)], ['arith:play', seq(open(WINDOWS.arith.open), click('#arith-start'))],
  ['usmap:open', open(WINDOWS.usmap.open)], ['library:open', open(WINDOWS.library.open)], ['library:reader', seq(open(WINDOWS.library.open), click('.lib-open'))],
  ['dorm:open', open(WINDOWS.dorm.open)], ['mines:menu', open(WINDOWS.mines.open)],
  ['dialog:board', open(`UI.dialog({ title: CONTENT.board.title, html: CONTENT.board.html })`)],
  ['start:open', async page => { await page.evaluate(() => document.getElementById('start-screen').classList.remove('hidden')); }],
];
module.exports = { WINDOWS, STATES };
