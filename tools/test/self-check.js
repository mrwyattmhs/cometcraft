#!/usr/bin/env node
/* Test the tests. From the project folder:   node tools/test/self-check.js   (add --slow to include the real-browser mutations, about 8 more minutes; add --only TEXT to run just the breaks whose description contains TEXT)

   A suite that quietly stopped checking what it claims to is worse than no suite. So this copies the project to a temporary folder, breaks one thing at a time in the COPY (the project
   itself is never touched), runs the suite that is supposed to notice, and requires it to FAIL. Every line below says what was broken and which suite caught it. If one is not caught,
   that suite has a hole: fix the suite, not this list.  Add a line here whenever a bug slips through a suite. */
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), slow = process.argv.includes('--slow'), only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].toLowerCase() : null;

/** [what is broken, file, text to find, text to put instead, suite that must fail, slow?] */
const MUTATIONS = [
  ['a right answer no longer earns trophy progress (Polynomials)', 'js/poly-game.js', ' Trophies.award(cfg.trophy);', '', 'sim:polynomials'],
  ['Enter in a box checks AND skips to the next problem (Polynomials)', 'js/poly-game.js', 'e.preventDefault(); e.stopPropagation(); check(); }', 'e.preventDefault(); check(); }', 'sim:polynomials'],
  ['the minus sign is not distributed with arches (Polynomials)', 'js/poly-game.js', "items: sub ? [{ lit:", "items: false ? [{ lit:", 'sim:polynomials'],
  ['the minus sign\'s arches go to the wrong terms (Add/Sub)', 'js/poly-game.js', "to: `R${j}`, color: 0, side: 'above'", "to: `R${j + 1}`, color: 0, side: 'above'", 'sim:polynomials'],
  ['a square\'s power is ignored when it is checked (the area model)', 'js/polys.js', 'return !!g && g.c === t.c && g.d === t.d;', 'return !!g && g.c === t.c;', 'unit:polys'],
  ['Hard pays 40, not 50 (Economy)', 'js/economy.js', 'polymul: [10, 25, 50]', 'polymul: [10, 25, 40]', 'unit:economy'],
  ['Hard pays 40, not 50 (Economy): the Multiply table\'s window also pins the displayed pay', 'js/economy.js', 'polymul: [10, 25, 50]', 'polymul: [10, 25, 40]', 'sim:area'],
  ['Enter in a box checks AND skips ahead (Cubes)', 'js/cubes-game.js', 'e.preventDefault(); e.stopPropagation(); check(); }', 'e.preventDefault(); check(); }', 'sim:cubes'],
  ['the Cubes trophy is never awarded', 'js/cubes-game.js', " Trophies.award('cubes');", '', 'sim:cubes'],
  ['a window loses the green template (Parabola)', 'index.html', '<div id="par" class="overlay hidden kelly"', '<div id="par" class="overlay hidden"', 'sim:windows'],
  ['an old-style header is left on a window (Library)', 'index.html', '<header class="craft-head">\n        <div class="k-title">\n          <span class="k-wing">Park</span>', '<header class="craft-head">\n        <div class="k-title">\n          <span class="k-nowing">Park</span>', 'sim:windows'],
  ['the minefield moves back beside the dorm\'s lamp', 'js/minesweeper.js', 'const PLOT_AT = { x0: 30.8, z0: 25.0 };', 'const PLOT_AT = { x0: 24.8, z0: 25.0 };', 'sim:world'],
  ['the coaster table goes back to the Graphing wing', 'js/casino-interior.js', 'coaster: { x: 7.5, z: -30.5 }', 'coaster: { x: 39, z: 5.2 }', 'sim:world'],
  ['a tree is planted on the minefield', 'js/world.js', '[31, 2], [47, 20], [54, 28]', '[31, 2], [47, 20], [36, 30]', 'sim:world'],
  ['the multiplication of polynomials is wrong', 'js/polys.js', 'r[i + j] += a * b;', 'r[i + j] += a + b;', 'unit:polys'],
  ['a trophy sentence names the wrong wing', 'js/trophies.js', "at the Polynomial Coaster table in the casino's Polynomials wing", "at the Polynomial Coaster table in the casino's Graphing wing", 'unit:trophies'],
  ['the casino plan loses a table', 'js/casino-interior.js', 'cubes: { x: -39, z: 5.2 },', '', 'unit:casino'],
  ['version numbers disagree (one link in index.html says 1)', 'index.html', `css/style.css?v=${require('../bundle').versions().number}`, 'css/style.css?v=1', 'VERSION'],
  // the House of Algebra and the Missing Number
  ['the equation checker accepts the wrong number (the box is added to, but it subtracts)', 'js/equations.js', 'add1: n + p.a,', 'add1: n - p.a,', 'unit:equations'],
  ['a right answer at either equation booth earns no trophy progress', 'js/booth-game.js', ' Trophies.award(cfg.trophy);', '', 'sim:equations'],
  ['Enter in the box checks AND skips to the next problem (the booths)', 'js/numpad.js', "if (e.key !== 'Enter') return; e.preventDefault(); e.stopPropagation();", "if (e.key !== 'Enter') return;", 'sim:equations'],
  ['Missing Number Hard pays 40, not 50', 'js/economy.js', 'missing: [10, 25, 50],', 'missing: [10, 25, 40],', 'unit:economy'],
  ['a guitar goes missing from the stage', 'js/house.js', "guitarOnStand(g, -4.2, y0, -9.6, { body: 0x2563c9, trim: 0xf0e6d0, turn: 0.2 });", '', 'sim:house'],
  ['you can walk onto the stage', 'js/house.js', 'solid(zone, 0, sc, 22, stageD); ', '', 'sim:house'],
  ['the first booth is moved away from the stage', 'js/house.js', "{ id: 'missing', unit: 1, x: -13.3, z: -2.5, face: 'E',", "{ id: 'missing', unit: 1, x: -13.3, z: 8.5, face: 'E',", 'sim:house'],
  ['the Missing Number trophy no longer says where the booth is', 'js/trophies.js', 'at the Missing Number booth in the House of Algebra.', 'at the Missing Number booth.', 'sim:house'],
  ['a shop faces the wrong way (away from the street)', 'js/world.js', "{ id: 'hints', x: -14, z: 7, face: 'S' }", "{ id: 'hints', x: -14, z: 7, face: 'N' }", 'sim:world'],
  ['a tree is planted in the middle of the street', 'js/world.js', '[-33, 2],', '[-20, 13.5],', 'sim:world'],
  ['the House\'s door prompt is inside the building', 'js/house.js', "interact(zone, x1 + 2.6, cz, 2.4, 'Enter the House of Algebra', actions.enterHouse);", "interact(zone, x1 - 2.6, cz, 2.4, 'Enter the House of Algebra', actions.enterHouse);", 'sim:world'],
  // the second booth (Multiply and Divide), the shelf and the trophy case
  ['the multiply-and-divide checker accepts the wrong number (the box is multiplied, but it adds)', 'js/equations-md.js', 'mul1: n * p.a,', 'mul1: n + p.a,', 'unit:equations-md'],
  ['the Multiply and Divide booth awards the wrong trophy', 'js/booth-game.js', "trophy: 'muldiv', title: 'Multiply & Divide'", "trophy: 'missing', title: 'Multiply & Divide'", 'sim:equations'],
  ['Multiply and Divide Hard pays 40, not 50', 'js/economy.js', 'muldiv: [10, 25, 50],', 'muldiv: [10, 25, 40],', 'unit:economy'],
  ['the Multiply and Divide booth is taken out of the House', 'js/house.js', "    { id: 'muldiv', unit: 2, x: 13.3, z: -2.5, face: 'W',", "    { id: 'muldiv-gone', unit: 2, x: 13.3, z: 8.5, face: 'W',", 'sim:house'],
  ['an unused placeholder booth is added back', 'js/house.js', "symbols: ['times', 'plus'], color: 0xb48cff, fg: '#d9c2ff' },\n  ];", "symbols: ['times', 'plus'], color: 0xb48cff, fg: '#d9c2ff' },\n    { id: 'unit4', unit: 4, x: 13.3, z: 3, face: 'W', title: 'UNIT 4', sub: 'COMING SOON', label: 'Peek at the Unit 4 booth', symbols: ['box'], color: 0x888888, fg: '#cccccc' },\n  ];", 'sim:house'],
  ['the shelf goes back to nine to a board', 'js/trophies.js', 'SHELF_CAPACITY = 10, MAX_SHELVES', 'SHELF_CAPACITY = 9, MAX_SHELVES', 'unit:trophies'],
  // the Kelly Green set with gold outlines, and where the House and the street stand
  ['a piece of the Kelly Green set costs 400, not 5,000', 'js/catalog.js', "add('pants', 'kelly-gold', 'Kelly Green Pants, gold outline', { color: KELLY, outline: 'gold', price: PREMIUM });", "add('pants', 'kelly-gold', 'Kelly Green Pants, gold outline', { color: KELLY, outline: 'gold', price: BASIC });", 'unit:catalog'],
  ['the avatar is never given its gold outlines', 'js/avatar.js', '    setOutlines(root, outfit);\n', '', 'sim:wardrobe'],
  ['the cap gets no gold outline', 'js/avatar.js', 'if (hat.outline) { const f = edgeFrame(w, h, d);', 'if (false) { const f = edgeFrame(w, h, d);', 'sim:wardrobe'],
  ['the shop swatch loses its gold edge', 'js/shop.js', "if (item.outline) sw.classList.add('outlined');", '', 'sim:wardrobe'],
  ['5,000 is written 5000 in the shop', 'js/shop.js', "const money = n => n.toLocaleString('en-US');", 'const money = n => String(n);', 'sim:wardrobe'],
  ['the House is moved back next to the casino', 'js/house.js', 'z0: -13.5, z1: -0.5, cz: -7,', 'z0: -22, z1: -9, cz: -15.5,', 'sim:world'],
  ['the street of shops is moved back north (without its shops)', 'js/world.js', 'const STREET = { x0: -53, x1: -6.4, z: 13.5 };', 'const STREET = { x0: -53, x1: -6.4, z: 10 };', 'sim:world'],
  // the number pad in the equation booths
  ['a digit key is missing from the number pad', 'js/numpad.js', "['7', '8', '9', '4', '5', '6', '1', '2', '3', 'back', '0', 'check']", "['7', '8', '9', '4', '5', '6', '1', '2', 'back', '0', 'check']", 'sim:equations'],
  ['tapping a digit does nothing', 'js/numpad.js', 'else if (digits.length < 3) box.value += key;', 'else if (false) box.value += key;', 'sim:equations'],
  ['the box summons the phone keyboard again', 'js/numpad.js', "b.inputMode = 'none';", "b.inputMode = 'numeric';", 'sim:equations'],
  ['the number pad stays on screen after you answer', 'js/booth-game.js', "$('pad').classList.add('hidden'); $('after').classList.remove('hidden');", "$('after').classList.remove('hidden');", 'sim:equations'],
  ['the pad\'s Check key is not the Check button', 'js/numpad.js', 'if (SPECIAL[k]) b.id = `${prefix}-${k}`;', 'if (SPECIAL[k]) b.id = `${prefix}-x${k}`;', 'sim:equations'],
  // the Numbers Game (two numbers with a given product and sum) and the booth engine's two boxes and plus-or-minus key
  ['the Numbers Game accepts any pair with the right product, whatever it adds to', 'js/number-pairs.js', 'x * y === p.product && x + y === p.sum;', 'x * y === p.product;', 'unit:number-pairs'],
  ['the plus-or-minus key works on Easy, where no answer is negative', 'js/numpad.js', "if (signedNow) box.value = (neg ? '' : '-') + digits;", "box.value = (neg ? '' : '-') + digits;", 'sim:numbers'],
  ['taps always go into the first box', 'js/booth-game.js', "onFocus: () => { active = i; },", '', 'sim:numbers'],
  ['Enter in the first box checks instead of moving to the empty one', 'js/booth-game.js', 'if (empty && empty !== b && filled(b)) empty.focus(); else check();', 'check();', 'sim:numbers'],
  ['a right number beside a wrong one is marked wrong too', 'js/booth-game.js', "b.classList.add(ok || at >= 0 ? 'ok' : 'miss');", "b.classList.add(ok ? 'ok' : 'miss');", 'sim:numbers'],
  ['the Numbers Game awards another booth\'s trophy', 'js/booth-game.js', "trophy: 'numbers', title: 'Numbers Game'", "trophy: 'missing', title: 'Numbers Game'", 'sim:numbers'],
  ['Numbers Game Hard pays 40, not 50', 'js/economy.js', 'numbers: [10, 25, 50],', 'numbers: [10, 25, 40],', 'unit:economy'],
  ['the Numbers Game booth is taken out of the House', 'js/house.js', "    { id: 'numbers', unit: 3, x: -13.3, z: 3, face: 'E',", "    { id: 'numbers-gone', unit: 3, x: -13.3, z: 3, face: 'E',", 'sim:house'],
  // Remy's Eye, the quest
  ['the quest starts on the ninth pet', 'js/remy-quest.js', 'const PETS_TO_START = 10,', 'const PETS_TO_START = 9,', 'unit:remy-quest'],
  ['the Pet Corner says something else', 'js/remy-quest.js', "const OK_LINE = 'Remy is ok, she will get used to one eye.';", "const OK_LINE = 'Remy is fine.';", 'unit:remy-quest'],
  ['the eye comes back at the end (the patch comes off)', 'js/remy-quest.js', "const hasPatch = q => clean(q).step !== 'none';", "const hasPatch = q => clean(q).step !== 'none' && clean(q).step !== 'done';", 'unit:remy-quest'],
  ['a Minesweeper win skips straight to the Pet Corner', 'js/remy-quest.js', "{ q: { step: 'wash', answers: 0 }, event: 'found' }", "{ q: { step: 'vet', answers: 0 }, event: 'found' }", 'unit:remy-quest'],
  ['the quest\'s reward is never paid', 'js/remy-quest.js', "      if (r.event === 'finish') Store.earn(REWARD);\n", '', 'sim:quest'],
  ['the fountain never gets its prompt', 'js/remy-quest.js', "if (c.step === 'wash' && !has) hub.interactables.push(wash); else if", 'if', 'sim:quest'],
  ['the Pet Corner opens its shop over the quest\'s message', 'js/main.js', "if (id === 'pets' && quest.vet()) return;", "if (id === 'pets') quest.vet();", 'sim:quest'],
  ['Remy is on the bed before the quest is done', 'js/remy-quest.js', 'bed.visible = onBed(q()); if (!bed.visible) return;', 'bed.visible = hasPatch(q()); if (!bed.visible) return;', 'sim:quest'],
  ['on a bunk bed Remy floats at the height of a single bed', 'js/remy-quest.js', "y: it.type === 'bed' ? 0.82 : 0.7,", 'y: 0.82,', 'sim:quest'],
  ['walking up to a place gives no reminder', 'js/remy-quest.js', 'const text = reminder(q(), name); if (text) UI.toast(text);', 'reminder(q(), name);', 'sim:quest'],
  ['a pet inside the cooldown is counted (mashing E starts the quest)', 'js/store.js', '    if (nowMs - lastRemyPet < REMY_COOLDOWN_MS) return false;\n', '', 'sim:quest'],
  ['Remy gets no eye patch', 'js/remy-quest.js', 'if (remy) Pets.setEyePatch(remy.avatar, hasPatch(c));', '', 'sim:quest'],
  // the Science Lab: Element Match, Cell Lab, Atom Builder, the lab itself, the bigger map and the three-board shelf
  ['helium is drawn one column from the edge of the table', 'js/elements.js', 'col: z === 1 ? 1 : 18 };', 'col: z === 1 ? 1 : 17 };', 'unit:elements'],
  ['aluminium is called a nonmetal-ish element, not a post-transition metal', 'js/elements.js', 'POST = [13, 31,', 'POST = [31,', 'unit:elements'],
  ['two cell parts share the same clue', 'js/cells.js', "clue: 'packages proteins and sends them out'", "clue: 'breaks down waste'", 'unit:cells'],
  ['an ion\'s electrons go the wrong way (a + ion gains instead of losing)', 'js/atoms.js', 'p.z - p.charge];', 'p.z + p.charge];', 'unit:atoms'],
  ['sodium\'s mass number is 24', 'js/atoms.js', '11: 23,', '11: 24,', 'unit:atoms'],
  ['Enter on the part you already picked only re-picks it', 'js/pick-game.js', "if (e.key === 'Enter' && state === 'playing' && picked != null && String(t.dataset.key) === String(picked)) check(); else choose(t.dataset.key);", 'choose(t.dataset.key);', 'sim:science'],
  ['a wrong pick is not lit red', 'js/pick-game.js', "if (!ok) things(picked).forEach(n => n.classList.add('wrong'));", '', 'sim:science'],
  ['a right pick earns no trophy progress (Element Match and Cell Lab)', 'js/pick-game.js', ' Trophies.award(cfg.trophy);', '', 'sim:science'],
  ['the Atom Builder marks its boxes by whether the number is anywhere in the answer', 'js/booth-game.js', 'const at = L.ordered ? (nums[i] === left[i] ? i : -1) : left.indexOf(nums[i]);', 'const at = left.indexOf(nums[i]);', 'sim:science'],
  ['Element Match Hard pays 40, not 50', 'js/economy.js', 'elements: [10, 25, 50],', 'elements: [10, 25, 40],', 'unit:economy'],
  ['the Atom Builder station is missing from the lab', 'js/lab.js', "    { id: 'atoms', label: 'Use the Atom Builder', x: 10.4, z: 0, color: 0xff6ad5 },\n", '', 'sim:lab'],
  ['the lab benches are not solid (you can walk through them)', 'js/lab.js', 'solid(zone, x, z, w + 0.1, d + 0.1);', '', 'sim:lab'],
  ['a bench stands in the middle of the path to the lab', 'js/world.js', "addBenchFacing(zone, -38, STREET.z - 4.4, 'S');", "addBenchFacing(zone, -38, STREET.z - 0.4, 'S');", 'sim:world'],
  ['the lab is built outside the village\'s edge', 'js/lab.js', 'x0: -70, x1: -53, z0: 5.5,', 'x0: -80, x1: -53, z0: 5.5,', 'sim:world'],
  ['the dorm trophies go back to 78% size and poke into the board above', 'js/dormroom.js', 'TROPHY_SCALE = 0.66;', 'TROPHY_SCALE = 0.78;', 'sim:shelf'],
  ['the lowest trophy board is lowered into the bunk beds', 'js/dormroom.js', 'boardY: [3.15, 2.75, 2.35]', 'boardY: [3.15, 2.75, 2.2]', 'sim:shelf'],
  ['the shelf is limited to two boards again', 'js/trophies.js', 'MAX_SHELVES = 3;', 'MAX_SHELVES = 2;', 'unit:trophies'],
  ['the quest tracker and lab: the Science Lab\'s door prompt is moved inside the building', 'js/lab.js', "interact(zone, x1 + 2.6, cz, 2.4, 'Enter the Science Lab', actions.enterLab);", "interact(zone, x1 - 2.6, cz, 2.4, 'Enter the Science Lab', actions.enterLab);", 'sim:world'],
  // reading the clock: the maths, the live wall clocks, the game
  ['the long hand is drawn at five degrees a minute, not six', 'js/clock.js', 'const minuteAngle = (m, s = 0) => ((m + s / 60) * 6) % 360;', 'const minuteAngle = (m, s = 0) => ((m + s / 60) * 5) % 360;', 'unit:clock'],
  ['the short hand stays on the hour instead of creeping toward the next', 'js/clock.js', '(((h % 12) + m / 60 + s / 3600) * 30) % 360', '(((h % 12) + s / 3600) * 30) % 360', 'unit:clock'],
  ['midnight shows 0 instead of 12', 'js/clock.js', 'h: h24 % 12 || 12,', 'h: h24 % 12,', 'unit:clock'],
  ['the Hard answer only needs the hour right', 'js/clock.js', 'return whole(a) && whole(b) && a === p.hour && b === p.minute;', 'return whole(a) && whole(b) && a === p.hour;', 'unit:clock'],
  ['the hand you set starts on the answer', 'js/clock.js', '(p.hour + 4) % 12 + 1 :', 'p.hour :', 'unit:clock'],
  ['the 12 is missing from the face', 'js/clock.js', 'for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6,', 'for (let n = 1; n < 12; n++) { const a = n * Math.PI / 6,', 'unit:clock'],
  ['the hands block clicks meant for the numbers under them (the long hand rests on the 12)', 'js/clock.js', ' pointer-events="none" transform=', ' transform=', 'unit:clock'],
  ['a wall clock is drawn once and never ticks', 'js/clock.js', 'if (key === lastSecond) return;', 'return;', 'sim:clock'],
  ['a wall clock always shows 3:00', 'js/clock.js', 'function redraw() { const d = parts(),', 'function redraw() { const d = { h: 3, m: 0, s: 0 },', 'sim:clock'],
  ['a minute hand pushed back from 0 goes negative instead of round to 59', 'js/clock-game.js', ": ((Math.round(v) % 60) + 60) % 60;", ": Math.round(v) % 60;", 'sim:clock'],
  ['the right hand is not shown after a wrong answer', 'js/clock-game.js', "ghost.classList.add('clk-right');", '', 'sim:clock'],
  ['Enter on the face does not check', 'js/clock-game.js', "e.preventDefault(); e.stopPropagation(); check(); }\n    });", "e.preventDefault(); e.stopPropagation(); }\n    });", 'sim:clock'],
  ['the Hard boxes are not marked by their own place', 'js/clock-game.js', "b.classList.add(nums[i] === [problem.hour, problem.minute][i] ? 'ok' : 'miss')", "b.classList.add('ok')", 'sim:clock'],
  ['the classroom clock has no walk-up prompt', 'js/world.js', "    interact(zone, 6, 10.2, 2.4, 'Read the classroom clock', () => actions.openTable('clock'));\n", '', 'sim:clock'],
  ['the shared pad lets a box take five digits', 'js/numpad.js', 'else if (digits.length < 3) box.value += key;', 'else if (digits.length < 5) box.value += key;', 'sim:science'],
  ['the clock game pays 40 on Hard', 'js/economy.js', 'clock: [10, 25, 50],', 'clock: [10, 25, 40],', 'unit:economy'],
  // the Multiply table as an area model
  ['the combine line is one box short (the lowest power is left out)', 'js/polys.js', 'degrees: Array.from({ length: hi - lo + 1 }', 'degrees: Array.from({ length: hi - lo }', 'unit:polys'],
  ['the variable key drops the minus sign you typed', 'js/polys.js', 'return `${neg}${digits}${v}${n[1]', 'return `${digits}${v}${n[1]', 'unit:polys'],
  ['a square typed with the wrong letter is accepted', 'js/polys.js', "if (letter && letter !== String(v).toLowerCase()) return null;", '', 'unit:polys'],
  ['a caret typed after the variable is thrown away at once, so x^2 cannot be typed', 'js/polys.js', '2212^${L}', '2212${L}', 'unit:polys'],
  ['a wrong square is not corrected after checking', 'js/area-game.js', 'b.dataset.typed = b.value; b.value = Polys.termText(want.cells[i].c, want.cells[i].d, v); }', 'b.dataset.typed = b.value; }', 'sim:area'],
  ['the head of the column is not the one that lights up', 'js/area-game.js', 'Number(h.dataset.col) === j && i >= 0', 'Number(h.dataset.col) === j + 1 && i >= 0', 'sim:area'],
  ['a narrow screen opens the steps too (a phone then scrolls)', 'js/area-game.js', 'if (!r.ok && !narrow) d.open = true;', 'if (!r.ok) d.open = true;', 'sim:area'],
  ['the Multiply table pays the Easy amount at every level', 'js/area-game.js', 'Store.earn(WIN[level - 1]); Store.set({ polymulWins', 'Store.earn(WIN[0]); Store.set({ polymulWins', 'sim:area'],
  // chess: the engine, the window, the save, the pay, the trophy, the table
  ['a rook captured on its home square keeps its castling right', 'js/chess.js', 'lose(m.f); lose(m.t); this.castle = cast;', 'lose(m.f); this.castle = cast;', 'unit:chess'],
  ['en passant is never offered', 'js/chess.js', ' else if (t === this.ep) add(', ' else if (false && t === this.ep) add(', 'unit:chess'],
  ['a pawn that reaches the end can only become a queen', 'js/chess.js', 'for (const pr of [Q, R, B, N]) add(s, t1, p, 0, pr);', 'for (const pr of [Q]) add(s, t1, p, 0, pr);', 'unit:chess'],
  ['a game is only drawn by repetition the fourth time', 'js/chess.js', 'this.repetitions() >= 3', 'this.repetitions() >= 4', 'unit:chess'],
  ['the fifty-move rule waits for sixty moves', 'js/chess.js', 'p.half >= 100', 'p.half >= 120', 'unit:chess'],
  ['a saved game with an illegal move is half-believed instead of thrown away', 'js/chess.js', 'if (!m) return null; game.play(m); }', 'if (!m) continue; game.play(m); }', 'unit:chess'],
  ['a saved move with a stray letter is accepted', 'js/chess.js', ': !promo)) || null;', ': true)) || null;', 'unit:chess'],
  ['Medium never has a lapse', 'js/chess.js', 'L = base.lapse && r() < base.lapse ? LEVELS.easy : base;', 'L = base;', 'unit:chess'],
  ['a checkmate is scored as a draw (so the search cannot see mates)', 'js/chess.js', 'return check ? -MATE + ply : 0;', 'return 0;', 'unit:chess'],
  ['Easy looks two moves ahead', 'js/chess.js', "easy: { name: 'Easy', depth: 1,", "easy: { name: 'Easy', depth: 2,", 'unit:chess'],
  ['Hard may think for three seconds', 'js/chess.js', "hard: { name: 'Hard', depth: 6, ms: 900,", "hard: { name: 'Hard', depth: 6, ms: 3000,", 'unit:chess'],
  ['a Hard win pays the Medium amount', 'js/economy.js', 'chess: [100, 200, 300],', 'chess: [100, 200, 200],', 'sim:chess'],
  ['coming back to a finished game forgets that it is finished', 'js/chess-game.js', 'if (c.over) over = describe(c.result);', 'if (c.over) over = null;', 'sim:chess'],
  ['resigning is counted as a draw', 'js/chess-game.js', "const result = resigned ? 'loss' :", "const result = resigned ? 'draw' :", 'sim:chess'],
  ['a draw counts toward the trophy', 'js/chess-game.js', "if (result === 'win') { Store.earn(over.pay);", "if (result !== 'loss') { Store.earn(over.pay);", 'sim:chess'],
  ['the computer\'s move still arrives after you have left the table', 'js/chess-game.js', 'if (!isOpen()) return; seq++; thinking = false; resignAt = 0;', 'if (!isOpen()) return; thinking = false; resignAt = 0;', 'sim:chess'],
  ['a pawn always becomes a queen, whatever you pick', 'js/chess-game.js', 'commit(ms.find(m => m.pr === t));', 'commit(ms.find(m => m.pr === 5));', 'sim:chess'],
  ['the keyboard is not turned round when the board is flipped', 'js/chess-game.js', 'const f = (cursor & 7) + (flipped ? -dx : dx), r = (cursor >> 4) + (flipped ? -dy : dy);', 'const f = (cursor & 7) + dx, r = (cursor >> 4) + dy;', 'sim:chess'],
  ['Escape with a piece picked up also leaves the table', 'js/chess-game.js', "if (e.key === 'Escape' && sel != null) { e.preventDefault(); e.stopPropagation(); select(null);", "if (e.key === 'Escape' && sel != null) { e.preventDefault(); select(null);", 'sim:chess'],
  ['a move is not saved', 'js/chess-game.js', 'finish(false); save(); render(); computerMove(); }', 'finish(false); render(); computerMove(); }', 'sim:chess'],
  ['Escape does not close the chess window', 'js/main.js', 'else if (ChessGame.isOpen()) ChessGame.close();', '', 'sim:chess'],
  ['the prompt at the table does nothing', 'js/main.js', 'openChess: () => ChessGame.open(),', 'openChess: () => {},', 'sim:chess'],
  ['the save believes any chess level', 'js/store.js', "level = ['easy', 'medium', 'hard'].includes(c.level) ? c.level : ''", 'level = c.level || \'\'', 'unit:store-daily'],
  ['the save keeps any number of chess moves', 'js/store.js', '.slice(0, 600), over: c.over === true', ', over: c.over === true', 'unit:store-daily'],
  ['the chess quest asks for five wins', 'js/daily.js', "t('chess', 1,", "t('chess', 5,", 'unit:daily'],
  ['the chess trophy takes a hundred wins', 'js/trophies.js', "symbol: 'knight', color: 0xf0d9a0, goal: 10,", "symbol: 'knight', color: 0xf0d9a0, goal: 100,", 'unit:trophies'],
  ['you can walk through the chess table', 'js/world.js', 'solid(zone, tx, tz, 1.5, 1.5); solid(zone, tx - 1.3, tz, 0.2, 0.2);', 'solid(zone, tx - 1.3, tz, 0.2, 0.2);', 'sim:world'],
  ['the chess table is built far from the library', 'js/world.js', 'library.x - 3.4, library.z + 2.0', 'library.x - 13.4, library.z + 2.0', 'sim:world'],
  // the daily quest
  ['the daily reward is 100, not 200', 'js/daily.js', 'const REWARD = 200;', 'const REWARD = 100;', 'unit:daily'],
  ['a cycle can start with the game the last one ended on (the same game two days running)', 'js/daily.js', 'if (cycle > 0 && ids[0] ===', 'if (false && ids[0] ===', 'unit:daily'],
  ['the quest counts right answers in every game, not just its own', 'js/daily.js', 'whole((solved || {})[d.id]) - d.base));', 'Object.values(solved || {}).reduce((a, b) => a + b, 0) - d.base));', 'unit:daily'],
  ['a finished quest finishes again (a second reward)', 'js/daily.js', 's.complete && !d.done ?', 's.complete ?', 'unit:daily'],
  ['a new quest starts from zero, not from your count that day (answers from before count)', 'js/daily.js', 'base: whole((solved || {})[topic.id]), done: false', 'base: 0, done: false', 'unit:daily'],
  ['yesterday\'s quest carries over into the next day', 'js/daily.js', 'if (c.day !== key || c.id !== topic.id) return fresh(key, solved);', 'if (c.id !== topic.id) return fresh(key, solved);', 'unit:daily'],
  ['finishing the quest pays nothing', 'js/daily.js', 'Store.set({ daily: r.d }); Store.earn(REWARD);', 'Store.set({ daily: r.d });', 'sim:daily'],
  ['the midnight check never starts a new day', 'js/daily.js', 'if (clean(Store.get().daily).day === key) return false;', 'return false;', 'sim:daily'],
  ['Q does not open the quest', 'js/main.js', "if (e.code === 'KeyQ' && !e.repeat) daily.open();", '', 'sim:daily'],
  ['the tracker shows on the title screen (nothing holds it back at the start)', 'js/daily.js', 'let paused = false, held = true;', 'let paused = false, held = false;', 'sim:daily'],
  ['the tracker stays on screen after the quest is finished', 'js/daily.js', "el.classList.toggle('hidden', held || s.done);", "el.classList.toggle('hidden', held);", 'sim:daily'],
  ['pressing Play does not bring the tracker back', 'js/main.js', 'daily.hold(false);', '', 'sim:daily'],
  ['the save lets any game id through into the daily quest', 'js/store.js', "id: typeof d.id === 'string' && /^[a-z]{2,12}$/.test(d.id) ? d.id : ''", 'id: d.id', 'unit:store-daily'],
  ['the save believes a daily quest that asks for thousands', 'js/store.js', 'need: Math.min(99, whole(d.need))', 'need: whole(d.need)', 'unit:store-daily'],
  // the real browser: slow
  ['white text on a cream card (the old Lines bug)', 'css/style.css', '.kelly .lin-steps li.active { background: #1e6314;', '.kelly .lin-steps li.active { background: #fff6cf;', 'browser:tour', true],
  ['a Polynomials window is fixed wider than a phone', 'css/style.css', '.poly-panel { width: min(960px, 100%); padding: 24px 28px 28px; }', '.poly-panel { width: 960px; padding: 24px 28px 28px; }', 'browser:play-polys', true],
  ['blanks lose their arch-colour outline', 'js/poly-game.js', "bx.style.borderColor = ARC_COLORS[row.color % 3]; bx.classList.add('outlined');", "bx.classList.add('outlined');", 'browser:play-polys', true],
  ['the Missing Number box shrinks too small to type in', 'css/style.css', '.kelly .eqn-box { box-sizing: border-box; width: 120px; height: 80px;', '.kelly .eqn-box { box-sizing: border-box; width: 120px; height: 30px;', 'browser:play-equations', true],
  ['the gold outlines are built but never drawn (an invisible material)', 'js/avatar.js', 'new THREE.MeshBasicMaterial({ color: GOLD });', 'new THREE.MeshBasicMaterial({ color: GOLD, visible: false });', 'browser:wardrobe', true],
  ['the pad keys grow far too big for a short phone', 'css/style.css', '.kelly .eqn-key { min-height: 44px; font-size: 22px; }', '.kelly .eqn-key { min-height: 150px; font-size: 22px; }', 'browser:play-equations', true],
  ['the level cards keep their long descriptions on a phone', 'css/style.css', '  .kelly .eqn-panel .bet-desc { display: none; }\n', '  .kelly .eqn-panel .bet-desc { display: block; }\n', 'browser:play-equations', true],
  ['the Numbers Game\'s answer lines are too big and wrap', 'css/style.css', '#nbg .eqn-after .final-expr { font-size: 23px; white-space: nowrap; }', '#nbg .eqn-after .final-expr { font-size: 44px; white-space: normal; }', 'browser:play-numbers', true],
  ['the quest tracker sits on top of the chip counter', 'css/style.css', '#trackers { position: absolute; top: 64px; left: 12px;', '#trackers { position: absolute; top: 10px; left: 12px;', 'browser:quest', true],
  ['the trophy case needs a fourth row for 23 trophies (seven columns, not eight)', 'js/trophy-case.js', 'list.length > 21 ? 8 : list.length > 18 ? 7', 'list.length > 18 ? 7', 'browser:tour', true],
  ['the rectangle\'s squares are far too tall for the Hard window', 'css/style.css', '.kelly .area-cell { width: 100%; height: 58px;', '.kelly .area-cell { width: 100%; height: 120px;', 'browser:play-area', true],
  ['the row headings are not level with their rows', 'css/style.css', '.area { display: grid; gap: 6px; align-items: center; }', '.area { display: grid; gap: 6px; align-items: start; }', 'browser:play-area', true],
  ['the pause screen leaves the tracker showing behind it', 'js/main.js', 'daily.hold(true);', '', 'browser:daily', true],
  ['the chess board is a fixed size, too big for a phone', 'css/style.css', '--bs: min(calc(100vw - 64px), calc(100svh - 270px), 560px); }', '--bs: 560px; }', 'browser:chess', true],
  ['the latest move in the move list is highlighted in a light colour that costs its text its contrast', 'css/style.css', '.ch-moves .m.cur { background: rgba(0, 0, 0, .4);', '.ch-moves .m.cur { background: rgba(129, 224, 76, .35);', 'browser:chess', true],
  ['the daily tracker lies on top of Remy\'s tracker', 'css/style.css', '#daily { border-color: #ffc45c; }', '#daily { border-color: #ffc45c; position: absolute; top: 0; left: 0; }', 'browser:daily', true],
  ['the quest popup\'s small gold text is gold on green again (too faint)', 'css/style.css', 'letter-spacing: .08em; text-transform: uppercase; color: #fff3cf; }', 'letter-spacing: .08em; text-transform: uppercase; color: #ffc45c; }', 'browser:daily', true],
  ['the quest popup\'s heading is enormous and the popup runs off a phone', 'css/style.css', '.dlg-body .dq-task { margin: 6px 0 10px; font: 800 28px/1.15', '.dlg-body .dq-task { margin: 6px 0 10px; font: 800 120px/1.15', 'browser:daily', true],
  ['the clock face is far too big for the Hard window', 'css/style.css', '.clk-svg { height: min(240px, 34vh);', '.clk-svg { height: min(430px, 60vh);', 'browser:play-clock', true],
  ['the periodic table\'s tiles are too tall to fit the window', 'css/style.css', '.pt { display: grid; grid-template-columns: repeat(18, minmax(31px, 1fr)); gap: 3px; --tile: 40px;', '.pt { display: grid; grid-template-columns: repeat(18, minmax(31px, 1fr)); gap: 3px; --tile: 74px;', 'browser:play-science', true],
  ['the archway is walled off', 'js/casino-interior.js', 'box(g, \'wallGild\', 2 * ARCH.halfWidth, HH - ARCH.height, WALL, 0, ARCH.height + (HH - ARCH.height) / 2, nz);', 'solid(zone, 0, nz, 2 * ARCH.halfWidth, WALL, HH);', 'browser:walk', true],
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'selfcheck-'));
fs.cpSync(ROOT, tmp, { recursive: true, filter: p => !/(^|\/)(node_modules|\.git|dist|\.cache)(\/|$)|\.test-cache\.json$/.test(path.relative(ROOT, p)) });
fs.symlinkSync(path.join(ROOT, 'tools/test/node_modules'), path.join(tmp, 'tools/test/node_modules'));

let missed = 0, ran = 0;
console.log(`breaking things in a copy (${tmp}), one at a time${slow ? ', including the slow browser ones' : ''}:\n`);
for (const [what, file, find, put, suite, isSlow] of MUTATIONS) {
  if (only && !what.toLowerCase().includes(only)) continue;                                  // --only TEXT: just the breaks whose description contains TEXT
  if (isSlow && !slow) { console.log(`  (skipped, slow)  ${what}`); continue; }
  const f = path.join(tmp, file), orig = fs.readFileSync(f, 'utf8');
  if (!orig.includes(find)) { console.log(`  ?  ${what}: the text to break was not found in ${file} (the code changed: update this line)`); missed++; continue; }
  fs.writeFileSync(f, orig.replace(find, put));
  const args = suite === 'VERSION' ? ['tools/bundle.js', '--version'] : ['tools/test/run.js', '--suite', suite];
  const t0 = Date.now(), r = spawnSync('node', args, { cwd: tmp, encoding: 'utf8', timeout: 600000 });
  fs.writeFileSync(f, orig); ran++;
  const caught = r.status !== 0;
  console.log(`  ${caught ? 'caught' : 'NOT CAUGHT'}  ${what}  [${suite}, ${((Date.now() - t0) / 1000).toFixed(0)}s]`);
  if (!caught) missed++;
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${missed ? `${missed} problem${missed > 1 ? 's' : ''}: a suite has a hole` : `all ${ran} deliberate breaks were caught`}`);
process.exit(missed ? 1 : 0);
