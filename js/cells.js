/* CELL LAB, in the Science Lab: you are shown a picture of a cell and asked to click one of its parts.

   Easy    an animal cell, six parts, asked by NAME:   "Click the nucleus"
   Medium  a plant cell, seven parts, asked by NAME:   "Click the chloroplast"
   Hard    a plant cell with eleven parts, asked by JOB:   "Click the part that turns food into energy"
   The picture is built here as SVG text (no DOM), and it only draws the parts a level uses, so Easy is a simple picture and Hard a busy one. Nothing in it is labelled: the labels would give the answers away.
   Every drawn part carries data-key="nucleus" etc. (the window finds what you clicked with that), and a part that appears more than once (the mitochondria, the ribosomes) counts anywhere you click it.
   No DOM here, so it is all unit tested in Node (tests/cells.test.js). */
const Cells = (() => {
  const BUILD = 52; // bump together with the ?v= numbers in index.html
  /** name: what it is called; job: what it does, as a sentence ("The nucleus holds ..."); clue: the job as a phrase after "the part that" (each clue fits one part only). */
  const PARTS = {
    membrane: { name: 'cell membrane', job: 'controls what goes into and out of the cell', clue: 'controls what goes into and out of the cell' },
    cytoplasm: { name: 'cytoplasm', job: 'is the jelly that fills the cell and holds the other parts', clue: 'is the jelly that fills the cell' },
    nucleus: { name: 'nucleus', job: 'holds the cell\u2019s DNA and controls what the cell does', clue: 'holds the DNA and controls the cell' },
    nucleolus: { name: 'nucleolus', job: 'is the dark spot inside the nucleus that makes ribosomes', clue: 'is the dark spot inside the nucleus' },
    mitochondrion: { name: 'mitochondrion', job: 'turns food into energy for the cell', clue: 'turns food into energy' },
    ribosome: { name: 'ribosome', job: 'builds proteins (the tiny dots)', clue: 'builds proteins' },
    lysosome: { name: 'lysosome', job: 'breaks down waste and worn-out parts', clue: 'breaks down waste' },
    golgi: { name: 'Golgi body', job: 'packages proteins and sends them where they are needed', clue: 'packages proteins and sends them out' },
    er: { name: 'endoplasmic reticulum', job: 'is a folded network of tubes that helps make and move proteins', clue: 'is a folded network of tubes that moves proteins' },
    vacuole: { name: 'vacuole', job: 'stores water and nutrients (it is huge in a plant cell)', clue: 'stores water and nutrients' },
    chloroplast: { name: 'chloroplast', job: 'makes food from sunlight (photosynthesis)', clue: 'makes food from sunlight' },
    wall: { name: 'cell wall', job: 'is the stiff outer layer that holds a plant cell in shape', clue: 'is the stiff outer layer of a plant cell' },
  };
  const LEVELS = [
    { level: 1, name: 'Easy', cell: 'animal', byJob: false, sample: 'the nucleus', desc: 'An animal cell. Click the part with the name you are given', parts: ['membrane', 'cytoplasm', 'nucleus', 'mitochondrion', 'ribosome', 'lysosome'] },
    { level: 2, name: 'Medium', cell: 'plant', byJob: false, sample: 'the chloroplast', desc: 'A plant cell, with its wall, chloroplasts and big vacuole', parts: ['wall', 'membrane', 'cytoplasm', 'nucleus', 'chloroplast', 'vacuole', 'mitochondrion'] },
    { level: 3, name: 'Hard', cell: 'plant', byJob: true, sample: 'turns food into energy', desc: 'A busy plant cell. You are told the job: click the part that does it', parts: ['wall', 'membrane', 'cytoplasm', 'nucleus', 'nucleolus', 'mitochondrion', 'chloroplast', 'vacuole', 'ribosome', 'er', 'golgi'] },
  ];
  const levelOf = l => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(Number(l)) || 1)) - 1];
  const part = key => PARTS[key];

  /** A problem: { level, part } (click this part). Never the same part twice in a row. */
  function problem(level, rng = Math.random, last = null) {
    const L = levelOf(level);
    for (let i = 0; i < 40; i++) { const k = L.parts[Math.floor(rng() * L.parts.length)]; if (!last || last.part !== k) return { level: L.level, part: k }; }
    return { level: L.level, part: L.parts[0] };
  }
  const count = level => levelOf(level).parts.length;
  /** What you are asked: "Click the nucleus", or on Hard "Click the part that holds the DNA and controls the cell". */
  const prompt = p => (levelOf(p.level).byJob ? `Click the part that ${PARTS[p.part].clue}` : `Click the ${PARTS[p.part].name}`);
  const answerOf = p => p.part;
  const isCorrect = (p, key) => key === p.part;
  /** What the answer card says: "The nucleus holds the cell's DNA and controls what the cell does." (every job starts with a verb) */
  const done = p => `The ${PARTS[p.part].name} ${PARTS[p.part].job}.`;

  /* ---------- the pictures ---------- */
  const ANIMAL = {
    cytoplasm: '<ellipse cx="240" cy="170" rx="215" ry="150" fill="#bfe8c9"/>',
    membrane: '<ellipse cx="240" cy="170" rx="215" ry="150" fill="none" stroke="#e0709b" stroke-width="12"/><ellipse cx="240" cy="170" rx="215" ry="150" fill="none" stroke="transparent" stroke-width="30"/>',
    nucleus: '<ellipse cx="235" cy="160" rx="70" ry="60" fill="#9b7bd6" stroke="#5b3fa0" stroke-width="4"/>',
    mitochondrion: [[110, 110, -25], [372, 150, 20]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="42" ry="22" fill="#ff9a62" stroke="#c4561f" stroke-width="3"/><path d="M-28 0 q7 -14 14 0 t14 0 t14 0 t14 0" fill="none" stroke="#c4561f" stroke-width="3"/></g>`).join(''),
    ribosome: [[190, 78], [208, 62], [228, 82], [176, 96], [246, 66], [262, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#2b2b6e"/>`).join(''),
    lysosome: '<g transform="translate(250 268)"><circle r="21" fill="#ffe27a" stroke="#b8932a" stroke-width="3"/><circle cx="-7" cy="-5" r="3" fill="#8a6a10"/><circle cx="6" cy="-7" r="3" fill="#8a6a10"/><circle cx="1" cy="7" r="3" fill="#8a6a10"/></g>',
  };
  const PLANT = {
    cytoplasm: '<rect x="26" y="23" width="428" height="294" rx="20" fill="#cdeccf"/>',
    membrane: '<rect x="26" y="23" width="428" height="294" rx="20" fill="none" stroke="#e0709b" stroke-width="8"/><rect x="26" y="23" width="428" height="294" rx="20" fill="none" stroke="transparent" stroke-width="22"/>',
    wall: '<rect x="14" y="11" width="452" height="318" rx="26" fill="none" stroke="#3f8f3a" stroke-width="14"/><rect x="14" y="11" width="452" height="318" rx="26" fill="none" stroke="transparent" stroke-width="26"/>',
    vacuole: '<rect x="170" y="70" width="250" height="200" rx="90" fill="#b9e3f7" stroke="#4a9cc7" stroke-width="4"/>',
    nucleus: '<ellipse cx="95" cy="170" rx="52" ry="48" fill="#9b7bd6" stroke="#5b3fa0" stroke-width="4"/>',
    nucleolus: '<circle cx="95" cy="170" r="16" fill="#4b2f88"/>',
    chloroplast: [[95, 62], [105, 284], [300, 296], [235, 46]].map(([x, y]) => `<g transform="translate(${x} ${y})"><ellipse rx="34" ry="17" fill="#4fb84a" stroke="#27782a" stroke-width="3"/><path d="M-18 0 h36 M-14 -7 h28 M-14 7 h28" stroke="#27782a" stroke-width="3"/></g>`).join(''),
    mitochondrion: '<g transform="translate(120 232) rotate(-15)"><ellipse rx="34" ry="17" fill="#ff9a62" stroke="#c4561f" stroke-width="3"/><path d="M-22 0 q6 -11 11 0 t11 0 t11 0 t11 0" fill="none" stroke="#c4561f" stroke-width="3"/></g>',
    ribosome: [[45, 226], [58, 242], [40, 250], [72, 228], [52, 264]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#2b2b6e"/>`).join(''),
    er: '<path d="M300 52 q10 -14 20 0 t20 0 t20 0 t20 0 t20 0 M300 64 q10 -14 20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#d46aa8" stroke-width="7" stroke-linecap="round"/>',
    golgi: '<g fill="none" stroke="#f2a43a" stroke-width="8" stroke-linecap="round"><path d="M352 282 q35 -10 70 0"/><path d="M352 292 q35 -10 70 0"/><path d="M352 302 q35 -10 70 0"/><path d="M352 312 q35 -10 70 0"/></g>',
  };
  const DRAWINGS = { animal: ANIMAL, plant: PLANT };
  /** The order the layers are drawn in: the cell body first, then the parts inside it, then the outlines on top. */
  const ORDER = ['cytoplasm', 'vacuole', 'nucleus', 'nucleolus', 'er', 'golgi', 'mitochondrion', 'chloroplast', 'ribosome', 'lysosome', 'membrane', 'wall'];
  /** The picture for a level: SVG text. Every part is a group with data-key (and tabindex, so the keyboard can reach it). */
  function figure(level) {
    const L = levelOf(level), draw = DRAWINGS[L.cell];
    const layers = ORDER.filter(k => L.parts.includes(k)).map(k => `<g class="cell-part" data-key="${k}" tabindex="0" role="button" aria-label="A part of the cell">${draw[k]}</g>`).join('');
    return `<svg class="cell-svg" viewBox="0 0 480 340" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="A picture of ${L.cell === 'animal' ? 'an animal' : 'a plant'} cell">${layers}</svg>`;
  }

  return { BUILD, PARTS, LEVELS, ORDER, levelOf, part, problem, count, prompt, answerOf, isCorrect, done, figure };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Cells;
