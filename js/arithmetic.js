/* Pure logic for the timed arithmetic practice (no DOM, no THREE, unit tested in Node).

   A round lasts 60 seconds. Problems come one after another: two numbers from 1 to 10, added,
   subtracted (the bigger one first, so no negative answers), multiplied, or divided (always a times-table
   fact turned around, so every answer is a whole number from 1 to 10). Each correct answer
   earns 1 chip. A wrong answer earns nothing and you move on to the next problem, so there is
   no guessing your way through one problem.

   Time is passed in by the caller (now, in milliseconds), so a whole round can be tested instantly. */
const Arithmetic = (() => {
  const BUILD = 29; // bump together with arithmetic-game.js and the ?v= numbers in index.html
  const E = typeof Economy !== 'undefined' ? Economy : require('./economy.js');
  const DURATION_MS = 60000;
  /** Chips for every correct answer at a table (the amounts live in economy.js). */
  const rewardFor = op => E.PAY.arithmetic[op];
  const LOW = 1, HIGH = 10;  // both numbers come from 1 to 10

  const OPS = {
    add: {
      key: 'add', name: 'Addition', symbol: '+', table: 'ADDITION TABLE',
      rule: 'Each problem adds two numbers from 1 to 10.',
      make: (a, b) => ({ a, b, answer: a + b }),
    },
    sub: {
      key: 'sub', name: 'Subtraction', symbol: '-', table: 'SUBTRACTION TABLE',
      rule: 'Each problem subtracts one number from 1 to 10 from another. The bigger number always comes first, so there are no negative answers.',
      make: (a, b) => (a >= b ? { a, b, answer: a - b } : { a: b, b: a, answer: b - a }),
    },
    mul: {
      key: 'mul', name: 'Multiplication', symbol: '×', table: 'MULTIPLICATION TABLE',
      rule: 'Each problem multiplies two numbers from 1 to 10.',
      make: (a, b) => ({ a, b, answer: a * b }),
    },
    div: {
      key: 'div', name: 'Division', symbol: '÷', table: 'DIVISION TABLE',
      rule: 'Each problem divides evenly: it is a times-table fact turned around, like 56 ÷ 7. The answer is always a whole number from 1 to 10, and you never divide by 1.',
      bLow: 2,   // the divisor starts at 2: dividing by 1 is not practice
      make: (q, d) => ({ a: q * d, b: d, answer: q }),
    },
  };

  const pick = (rng, low = LOW) => low + Math.floor(rng() * (HIGH - low + 1));

  /** One problem, never the same numbers twice in a row. */
  function problem(op, rng = Math.random, previous = null) {
    const spec = OPS[op];
    if (!spec) throw new Error(`unknown operation: ${op}`);
    let p;
    for (let i = 0; i < 50; i++) {
      p = { op, symbol: spec.symbol, ...spec.make(pick(rng), pick(rng, spec.bLow)) };
      if (!previous || p.a !== previous.a || p.b !== previous.b) break;
    }
    return p;
  }

  /** One timed round. phase: ready -> running -> done. */
  function createRound(op, { durationMs = DURATION_MS, rng = Math.random } = {}) {
    if (!OPS[op]) throw new Error(`unknown operation: ${op}`);
    let phase = 'ready', endsAt = 0, current = null, correct = 0;
    const missed = [];
    let attempts = 0;

    const round = {
      op, durationMs,
      get phase() { return phase; },
      get current() { return current; },
      get correct() { return correct; },
      get missed() { return missed; },
      get attempts() { return attempts; },

      start(now) {
        phase = 'running';
        endsAt = now + durationMs;
        current = problem(op, rng, null);
      },

      /** Milliseconds left. */
      remaining(now) {
        if (phase === 'ready') return durationMs;
        if (phase === 'done') return 0;
        return Math.max(0, endsAt - now);
      },

      /** Call as time passes. Returns the phase, which becomes 'done' when time is up. */
      tick(now) {
        if (phase === 'running' && now >= endsAt) phase = 'done';
        return phase;
      },

      /** text is what the student typed. Returns { late } if time had run out, { ignored } if there was
          nothing sensible to check (so nothing changes), or { ok, problem, given } after an answer. */
      submit(text, now) {
        if (round.tick(now) !== 'running') return { late: true };
        const t = String(text).trim();
        if (!/^\d{1,3}$/.test(t)) return { ignored: true };
        const given = Number(t);
        const solved = current;
        const ok = given === solved.answer;
        attempts++;
        if (ok) correct++;
        else missed.push({ ...solved, given });
        current = problem(op, rng, solved);
        return { ok, problem: solved, given };
      },

      summary() {
        return {
          op, correct, attempts, missed: missed.map(m => ({ ...m })),
          accuracy: attempts ? correct / attempts : 0,
          chips: correct * rewardFor(op),
        };
      },
    };
    return round;
  }

  return { BUILD, DURATION_MS, rewardFor, LOW, HIGH, OPS, problem, createRound };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Arithmetic;
