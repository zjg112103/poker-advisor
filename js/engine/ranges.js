/**
 * Short Deck Poker (6+ Hold'em) — Hand Scoring & Range Tables.
 *
 * Replaces the Chen formula with a scoring system tuned for 36-card short deck
 * where flush > full house and straights are common.
 *
 * Position-based opening ranges derived from 6+ Hold'em theory.
 */

// ---------------------------------------------------------------------------
// Short-deck hand scoring
// ---------------------------------------------------------------------------

const PAIR_SCORES = { 14: 100, 13: 93, 12: 86, 11: 79, 10: 72, 9: 65, 8: 58, 7: 51, 6: 44 };
const HIGH_SCORE  = { 14: 32, 13: 28, 12: 24, 11: 20, 10: 16, 9: 12, 8: 8, 7: 4, 6: 0 };
const LOW_SCORE   = { 14: 20, 13: 17, 12: 14, 11: 12, 10: 10, 9: 8, 8: 6, 7: 3, 6: 0 };

/**
 * Score a short-deck starting hand (0-100).
 * Tuned for 6+ Hold'em: suited bonus is large (flush > full house),
 * connectivity is key (straights common with only 9 ranks).
 */
export function shortDeckHandScore(card1, card2) {
  const high = Math.max(card1.value, card2.value);
  const low  = Math.min(card1.value, card2.value);

  if (card1.value === card2.value) return PAIR_SCORES[high] || 44;

  const isSuited = card1.suit === card2.suit;
  const gap = high - low;

  let score = (HIGH_SCORE[high] || 0) + (LOW_SCORE[low] || 0);

  // Suited bonus — flush beats full house in short deck
  if (isSuited) score += 14;

  // Connectivity — straights are common with only 9 ranks
  if (gap === 1)      score += 12;
  else if (gap === 2) score += 6;
  else if (gap === 3) score += 2;
  else if (gap >= 5)  score -= 4;

  // Both broadway (T+)
  if (high >= 10 && low >= 10) score += 6;

  return Math.max(0, Math.min(100, score));
}

// Backward-compatible alias
export function chenScore(card1, card2) {
  return shortDeckHandScore(card1, card2);
}

// ---------------------------------------------------------------------------
// Position-based range thresholds (hand score ≥ threshold → in range)
// ---------------------------------------------------------------------------

const OPEN_THRESHOLDS  = { UTG: 62, UTG1: 58, MP: 55, MP1: 50, HJ: 47, CO: 42, BTN: 34, SB: 38, BB: 30 };
const CALL_THRESHOLDS  = { UTG: 70, UTG1: 67, MP: 64, MP1: 60, HJ: 57, CO: 52, BTN: 44, SB: 48, BB: 40 };
const THREEBET_THRESHOLDS = { UTG: 80, UTG1: 77, MP: 74, MP1: 70, HJ: 67, CO: 62, BTN: 55, SB: 58, BB: 50 };

export function isInOpenRange(card1, card2, position) {
  return shortDeckHandScore(card1, card2) >= (OPEN_THRESHOLDS[position] || 50);
}
export function isInCallRange(card1, card2, position) {
  return shortDeckHandScore(card1, card2) >= (CALL_THRESHOLDS[position] || 60);
}
export function isIn3BetRange(card1, card2, position) {
  return shortDeckHandScore(card1, card2) >= (THREEBET_THRESHOLDS[position] || 70);
}

// ---------------------------------------------------------------------------
// Position-based opening percentages (for opponent range inference)
// ---------------------------------------------------------------------------

const POSITION_RANGES = {
  UTG:  [15, 20, 8],  UTG1: [17, 22, 9],  MP:  [20, 26, 10],
  MP1:  [23, 30, 11], HJ:   [27, 34, 13],  CO:  [33, 40, 16],
  BTN:  [45, 52, 20], SB:   [38, 46, 15],  BB:  [30, 55, 12],
};
const DEFAULT_RANGE = [25, 35, 12];

export function getRangePercent(position, actionType) {
  const r = POSITION_RANGES[position] || DEFAULT_RANGE;
  if (actionType === 'call') return r[1];
  if (actionType === '3bet' || actionType === 'reraise') return r[2];
  return r[0];
}

export function inferOpponentRange(position, actionType) {
  if (actionType === 'fold') return 0;
  if (actionType === 'check') return 100;
  if (actionType === 'allin') return getRangePercent(position, 'raise');
  return getRangePercent(position, actionType);
}

// ---------------------------------------------------------------------------
// Blocker-adjusted range estimation
// ---------------------------------------------------------------------------

/**
 * Adjust opponent range based on hero's hole cards (blocker effects).
 *
 * When hero holds cards that block premium hands from opponent's range,
 * opponent's effective range widens (more medium hands fill in).
 *
 * @param {Array} holeCards - hero's 2 hole cards
 * @param {string} position - opponent's position
 * @param {string} actionType - opponent's action type
 * @returns {number} adjusted range percentage (0-100)
 */
export function blockerAdjustedRange(holeCards, position, actionType) {
  // Use inferOpponentRange for proper fold→0 / check→100 handling
  const base = inferOpponentRange(position, actionType);
  if (base === 0 || base >= 100) return base;

  const [c1, c2] = holeCards;
  const high = Math.max(c1.value, c2.value);
  const low  = Math.min(c1.value, c2.value);
  const isPair   = c1.value === c2.value;
  const isSuited = c1.suit === c2.suit;

  let bonus = 0;

  // --- Pair blocker: removes combos of that pair rank ---
  if (isPair) {
    if (high >= 12) bonus += 3;   // QQ+: blocks many premium hands
    else if (high >= 9) bonus += 2; // 99-JJ: moderate blocking
    else bonus += 1;               // 66-88: small impact
  }

  // --- Ace blocker: blocks all Ax premium combos ---
  if (high === 14) bonus += 3;
  else if (low === 14) bonus += 3;

  // --- King blocker: blocks Kx strong combos ---
  if (high === 13) bonus += 1;
  if (low === 13 && high !== 14) bonus += 1;

  // --- Suit blocker: hero's suited cards reduce opponent flush draws ---
  if (isSuited) bonus += 1;

  // --- Connected blocker: reduces opponent straight possibilities ---
  if (!isPair && high - low <= 2) bonus += 1;

  return Math.min(100, base + bonus);
}

// ---------------------------------------------------------------------------
// Range ↔ percentile conversion (used by monte-carlo range filtering)
// ---------------------------------------------------------------------------

let _sortedScores = null;

function getSortedScores() {
  if (_sortedScores) return _sortedScores;
  const values = [14, 13, 12, 11, 10, 9, 8, 7, 6];
  const scores = [];

  for (let i = 0; i < values.length; i++) {
    for (let j = i; j < values.length; j++) {
      const suitedA = { value: values[i], suit: 's' };
      const suitedB = { value: values[j], suit: 's' };
      const offsuitB = { value: values[j], suit: 'o' };

      if (values[i] === values[j]) {
        scores.push({ score: shortDeckHandScore(suitedA, suitedB), combos: 6 });
      } else {
        scores.push({ score: shortDeckHandScore(suitedA, suitedB), combos: 4 });
        scores.push({ score: shortDeckHandScore(suitedA, offsuitB), combos: 12 });
      }
    }
  }

  scores.sort((a, b) => b.score - a.score);
  _sortedScores = scores;
  return scores;
}

export function getRangeThreshold(percent) {
  if (percent >= 100) return 0;
  const scores = getSortedScores();
  const totalCombos = 630; // short deck: 54 pairs + 144 suited + 432 offsuit
  const targetCombos = Math.round(totalCombos * percent / 100);
  let cum = 0;
  for (const entry of scores) {
    cum += entry.combos;
    if (cum >= targetCombos) return entry.score;
  }
  return 0;
}

export function isHandInRange(card1, card2, rangePercent) {
  if (rangePercent >= 100) return true;
  return shortDeckHandScore(card1, card2) >= getRangeThreshold(rangePercent);
}

// ---------------------------------------------------------------------------
// EV & bet sizing utilities
// ---------------------------------------------------------------------------

export function calculateEV(equity, pot, call) {
  return equity * (pot + call) - (1 - equity) * call;
}

export function suggestBetSize(equity) {
  if (equity >= 0.8) return { fraction: 0.75, reason: '强牌价值下注' };
  if (equity >= 0.65) return { fraction: 0.5,  reason: '中等价值下注' };
  if (equity >= 0.55) return { fraction: 0.33, reason: '薄价值下注' };
  return { fraction: 0.25, reason: '试探性下注' };
}
