/* Every payout in the game, in one place, so they are easy to tune. No wagering anywhere: a correct answer pays, a wrong one
   costs nothing. Harder levels pay more.

   Levels run Easy, Medium, Hard, Expert. A game with three levels uses Easy, Medium, Hard. */
const Economy = (() => {
  const BUILD = 32; // bump together with the ?v= numbers in index.html
  const LEVELS = ['Easy', 'Medium', 'Hard', 'Expert'];
  const PAY = {
    // casino tables (chips for each correct answer, by level)
    practice: { 2: 10, 3: 25, 4: 50 },     // by the number of dice you throw: 2 is Easy, 3 Medium, 4 Hard
    radical: [10, 25, 50, 100],
    trinomial: [10, 25, 50, 100],
    parabola: [25, 50, 100],
    vertex: [25, 50, 100],
    coaster: { easy: 10, factor: 20 },     // chips PER STAR on a Polynomial Coaster ride (3 stars for a clean ride, so up to 30 on Factored form and 60 on Factor first); a ride you give up on pays nothing
    lines: 25,                             // every line graphed pays the same, in any form (slope-intercept, point-slope or standard)
    // Arithmetic Academy: chips for each correct answer
    arithmetic: { add: 2, sub: 2, mul: 4, div: 5 },
    // the wall map: chips for each state found on the first try
    map: 5,
    // the sandbox: chips for each blueprint solved, by level
    blueprint: [50, 100, 150, 200],
    // Minesweeper next to the sandbox: chips for each game WON, by level (Easy 10 x 10, Medium 15 x 15, Hard 18 x 18). Losing, or giving up, pays nothing and costs nothing.
    mines: [100, 200, 300],
  };
  /** The name of a level: levelName(2, 4) is "Medium". */
  const levelName = level => LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level - 1))];
  return { BUILD, LEVELS, PAY, levelName };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Economy;
