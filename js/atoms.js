/* ATOM BUILDER, in the Science Lab: you are told which atom to build, and you give its three numbers: PROTONS, NEUTRONS and ELECTRONS.

   Easy    a neutral atom, told the atomic number and the mass number:   "carbon: atomic number 6, mass number 12"   (6, 6, 6)
   Medium  a neutral atom, told only the name and the mass number (look the atomic number up on the periodic table in the lab):   "sodium-23"   (11, 12, 11)
   Hard    ions and isotopes:   "the ion Na+, mass number 23" (11, 12, 10),   "chlorine-37" (17, 20, 17)
   Protons are the atomic number; neutrons are the mass number take away the protons; a neutral atom has as many electrons as protons, and an ion has lost (a + charge) or gained (a - charge)
   electrons. The only thing typed in is each element's common mass number, and tests/atoms.test.js checks it against the periodic table (it is the atomic mass, rounded).
   No DOM here, so it is all unit tested in Node. Like the other booths' modules it has LEVELS, problem, isCorrect, answerOf, steps, done and text, and a view() that tells the window
   to draw a row of three labelled boxes (and `ordered`, because here the first box can only be the protons: each box is marked on its own place). */
const AtomBuilder = (() => {
  const BUILD = 50; // bump together with the ?v= numbers in index.html
  const E = typeof Elements !== 'undefined' ? Elements : require('./elements.js');
  const MINUS = '\u2212';
  /** The common mass number of each element used (the standard atomic mass, rounded). */
  const MASS = { 1: 1, 2: 4, 3: 7, 4: 9, 5: 11, 6: 12, 7: 14, 8: 16, 9: 19, 10: 20, 11: 23, 12: 24, 13: 27, 14: 28, 15: 31, 16: 32, 17: 35, 18: 40, 19: 39, 20: 40, 21: 45, 22: 48, 23: 51, 24: 52, 25: 55, 26: 56, 27: 59, 28: 59,
    29: 64, 30: 65, 31: 70, 32: 73, 33: 75, 34: 79, 35: 80, 36: 84, 47: 108, 50: 119, 53: 127, 54: 131, 56: 137, 74: 184, 78: 195, 79: 197, 80: 201, 82: 207 };
  /** The ions: [atomic number, charge]. Each is the charge the element really takes when it forms an ion. */
  const IONS = [[1, 1], [3, 1], [4, 2], [7, -3], [8, -2], [9, -1], [11, 1], [12, 2], [13, 3], [15, -3], [16, -2], [17, -1], [19, 1], [20, 2], [35, -1]];
  /** The isotopes: [atomic number, mass number]. Each really exists (hydrogen-2 is deuterium, carbon-14 is the one used to date old things). */
  const ISOTOPES = [[1, 2], [1, 3], [6, 13], [6, 14], [8, 18], [17, 37], [19, 41], [26, 54], [29, 65], [35, 81]];
  const LEVELS = [
    { level: 1, name: 'Easy', sample: 'carbon-12', desc: 'A neutral atom. You are told its atomic number and mass number', signed: false },
    { level: 2, name: 'Medium', sample: 'sodium-23', desc: 'A neutral atom, told only its name and mass number. Look the atomic number up', signed: false },
    { level: 3, name: 'Hard', sample: 'Na\u207a, carbon-14', desc: 'Ions (atoms that lost or gained electrons) and isotopes (the same atom with other neutrons)', signed: false },
  ];
  const levelOf = l => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(Number(l)) || 1)) - 1];
  const easySet = () => E.ALL.filter(e => e.z <= 20).map(e => e.z), mediumSet = () => Object.keys(MASS).map(Number).filter(z => z <= 36 || E.levelOf(2).set.includes(z));
  const sup = { 1: '\u207a', 2: '\u00b2\u207a', 3: '\u00b3\u207a', '-1': '\u207b', '-2': '\u00b2\u207b', '-3': '\u00b3\u207b' };
  const ionText = (z, c) => `${E.byZ(z).symbol}${sup[c]}`;
  const name = z => E.byZ(z).name, cap = s => s[0].toUpperCase() + s.slice(1);

  /** A problem: { level, kind: 'neutral' | 'ion' | 'isotope', z, a, charge }. */
  function problem(level, rng = Math.random, last = null) {
    const L = levelOf(level), pick = list => list[Math.floor(rng() * list.length)];
    for (let i = 0; i < 40; i++) {
      let p;
      if (L.level === 1) { const z = pick(easySet()); p = { level: 1, kind: 'neutral', z, a: MASS[z], charge: 0 }; }
      else if (L.level === 2) { const z = pick(mediumSet()); p = { level: 2, kind: 'neutral', z, a: MASS[z], charge: 0 }; }
      else if (rng() < 0.6) { const [z, c] = pick(IONS); p = { level: 3, kind: 'ion', z, a: MASS[z], charge: c }; }
      else { const [z, a] = pick(ISOTOPES); p = { level: 3, kind: 'isotope', z, a, charge: 0 }; }
      if (!last || last.z !== p.z || last.a !== p.a || last.charge !== p.charge) return p;
    }
    return { level: L.level, kind: 'neutral', z: 6, a: 12, charge: 0 };
  }
  const count = level => (levelOf(level).level === 1 ? easySet().length : levelOf(level).level === 2 ? mediumSet().length : IONS.length + ISOTOPES.length);

  /** What you are asked, as a headline and a second line: "Build sodium-23" / "a neutral atom". */
  function view(p) {
    const head = p.kind === 'ion' ? `Build the ion ${ionText(p.z, p.charge)}` : p.level === 1 ? `Build a neutral atom of ${name(p.z).toLowerCase()}` : `Build ${name(p.z).toLowerCase()}-${p.a}`;
    const sub = p.level === 1 ? `atomic number ${p.z} \u00b7 mass number ${p.a}` : p.kind === 'ion' ? `mass number ${p.a}` : p.kind === 'isotope' ? 'an isotope: a neutral atom' : 'a neutral atom';
    return { kind: 'row', head, sub, labels: ['protons', 'neutrons', 'electrons'] };
  }
  const text = p => { const v = view(p); return `${v.head}, ${v.sub}`; };
  /** The three numbers: protons, neutrons, electrons. */
  const answerOf = p => [p.z, p.a - p.z, p.z - p.charge];
  const isCorrect = (p, pr, ne, el) => [pr, ne, el].every(n => typeof n === 'number' && Number.isInteger(n)) && answerOf(p).every((n, i) => n === [pr, ne, el][i]);
  /** "Sodium-23, the ion Na+: 11 protons, 12 neutrons, 10 electrons." */
  const done = p => { const [pr, ne, el] = answerOf(p); return `${cap(name(p.z))}-${p.a}${p.kind === 'ion' ? `, the ion ${ionText(p.z, p.charge)}` : ''}: ${pr} protons, ${ne} neutrons, ${el} electrons.`; };

  function steps(p) {
    const [pr, ne, el] = answerOf(p), c = Math.abs(p.charge), out = [];
    out.push(`Protons are the atomic number. ${cap(name(p.z))} is number ${p.z}, so ${pr} protons.`);
    out.push(`Neutrons are the mass number take away the protons: ${p.a} ${MINUS} ${pr} = ${ne}.`);
    out.push(p.charge === 0 ? `A neutral atom has as many electrons as protons: ${el}.` : p.charge > 0 ? `${ionText(p.z, p.charge)} has lost ${c} electron${c > 1 ? 's' : ''}: ${pr} ${MINUS} ${c} = ${el}.` : `${ionText(p.z, p.charge)} has gained ${c} electron${c > 1 ? 's' : ''}: ${pr} + ${c} = ${el}.`);
    return out;
  }

  return { BUILD, MINUS, MASS, IONS, ISOTOPES, LEVELS, ordered: true, levelOf, problem, count, view, text, answerOf, isCorrect, done, steps, ionText };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AtomBuilder;
