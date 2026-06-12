/**
 * Board Analysis Module for Short Deck Poker (6+ Hold'em).
 *
 * Analyzes community card texture (wet/dry), detects hero's draws
 * (flush draws, straight draws), and counts outs.
 */

// All possible short-deck straights (6-A consecutive + A-6-7-8-9)
const STRAIGHTS = [
  [6, 7, 8, 9, 10],
  [7, 8, 9, 10, 11],
  [8, 9, 10, 11, 12],
  [9, 10, 11, 12, 13],
  [10, 11, 12, 13, 14],
  [14, 6, 7, 8, 9], // A-low wrap
];

/**
 * Analyze board texture and hero draw possibilities.
 *
 * @param {Array} boardCards - 3-5 community cards
 * @param {Array} holeCards  - hero's 2 hole cards (optional)
 * @returns {{ texture, hasFlushDraw, hasStraightDraw, totalOuts, pairOnBoard, highCard }}
 */
export function analyzeBoard(boardCards, holeCards = []) {
  const board = boardCards || [];
  const all = [...holeCards, ...board];

  // ---- Board suit counts ----
  const boardSuitCnt = {};
  for (const c of board) boardSuitCnt[c.suit] = (boardSuitCnt[c.suit] || 0) + 1;
  const maxBoardSuit = Math.max(...Object.values(boardSuitCnt), 0);

  // ---- Board values ----
  const boardVals = board.map(c => c.value).sort((a, b) => b - a);
  const boardValCnt = {};
  for (const v of boardVals) boardValCnt[v] = (boardValCnt[v] || 0) + 1;
  const pairOnBoard = Object.values(boardValCnt).some(c => c >= 2);

  // ---- Connectedness ----
  const uv = [...new Set(boardVals)].sort((a, b) => a - b);
  let maxRun = 1, run = 1;
  for (let i = 1; i < uv.length; i++) {
    if (uv[i] - uv[i - 1] === 1) { run++; maxRun = Math.max(maxRun, run); }
    else run = 1;
  }
  // A can be low (A-6-7-8-9)
  if (uv.includes(14) && uv.some(v => v >= 6 && v <= 9)) {
    maxRun = Math.max(maxRun, 2);
  }

  // ---- Texture score ----
  let wet = 0;
  if (maxBoardSuit >= 3) wet += 3;
  else if (maxBoardSuit === 2) wet += 1;
  if (maxRun >= 3) wet += 2;
  else if (maxRun >= 2) wet += 1;
  if (pairOnBoard) wet -= 1; // paired boards reduce draw value

  const texture = wet >= 3 ? 'wet' : wet >= 1 ? 'medium' : 'dry';

  // ---- Hero draw detection ----
  let hasFlushDraw = false;
  let hasStraightDraw = false;
  let totalOuts = 0;

  if (holeCards.length === 2 && board.length >= 3) {
    // Flush draw: 4 of same suit among hero+board, hero has ≥1, not yet a flush
    const allSuitCnt = {};
    for (const c of all) allSuitCnt[c.suit] = (allSuitCnt[c.suit] || 0) + 1;

    for (const [suit, cnt] of Object.entries(allSuitCnt)) {
      if (cnt === 4) {
        const heroInSuit = holeCards.filter(c => c.suit === suit).length;
        if (heroInSuit >= 1) {
          hasFlushDraw = true;
          totalOuts += 9 - cnt; // 9 cards per suit in short deck
        }
      }
    }

    // Straight draw: 4 of 5 consecutive values, hero contributes ≥1 hole card
    const allValSet = new Set(all.map(c => c.value));
    const holeVals = holeCards.map(c => c.value);

    for (const s of STRAIGHTS) {
      const have = s.filter(v => allValSet.has(v));
      const missing = s.filter(v => !allValSet.has(v));
      const heroPart = s.some(v => holeVals.includes(v));

      if (heroPart && have.length === 4 && missing.length === 1) {
        hasStraightDraw = true;
        totalOuts += 4; // 4 suits for the missing value
      }
    }
  }

  return {
    texture,         // 'wet' | 'medium' | 'dry'
    hasFlushDraw,
    hasStraightDraw,
    totalOuts,
    pairOnBoard,
    highCard: boardVals[0] || 0,
  };
}
