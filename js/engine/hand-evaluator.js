/**
 * Hand evaluator module for poker hand ranking.
 * Supports standard (52-card) and short deck (36-card) rankings.
 *
 * CRITICAL: In short deck, flush beats full house (flush is harder to make).
 * Rank mapping is swapped between modes internally via adjustRank().
 */

// Hand rank constants (standard ordering)
const HAND_RANKS = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9,
};

// Chinese names indexed by standard rank value
const HAND_NAMES_STANDARD = [
  '高牌',   // 0
  '一对',   // 1
  '两对',   // 2
  '三条',   // 3
  '顺子',   // 4
  '同花',   // 5
  '葫芦',   // 6
  '四条',   // 7
  '同花顺', // 8
  '皇家同花顺', // 9
];

// In short deck: flush(6) > full house(5)
const HAND_NAMES_SHORT_DECK = [
  '高牌',   // 0
  '一对',   // 1
  '两对',   // 2
  '三条',   // 3
  '顺子',   // 4
  '葫芦',   // 5  (full house demoted)
  '同花',   // 6  (flush promoted)
  '四条',   // 7
  '同花顺', // 8
  '皇家同花顺', // 9
];

/**
 * Adjust the raw hand rank for short deck ordering.
 * In short deck, flush (raw 5) and full house (raw 6) are swapped.
 * @param {number} rank - Standard rank value
 * @param {boolean} shortDeck - Whether using short deck rules
 * @returns {number} Adjusted rank value
 */
function adjustRank(rank, shortDeck) {
  if (!shortDeck) return rank;
  if (rank === HAND_RANKS.FLUSH) return 6;
  if (rank === HAND_RANKS.FULL_HOUSE) return 5;
  return rank;
}

/**
 * Generate all C(n,5) combinations from an array.
 * @param {Array} arr - Source array (length 5-7)
 * @returns {Array<Array>} Array of 5-element combinations
 */
function combinations5(arr) {
  const n = arr.length;
  const results = [];
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            results.push([arr[i], arr[j], arr[k], arr[l], arr[m]]);
          }
        }
      }
    }
  }
  return results;
}

/**
 * Check if 5 cards form a straight, return the high value or 0.
 * @param {number[]} values - Sorted descending card values
 * @param {boolean} shortDeck - Whether using short deck rules
 * @returns {number} High card value of straight, or 0 if not a straight
 */
function getStraightHigh(values, shortDeck) {
  // Standard unique values check
  const unique = [...new Set(values)];
  if (unique.length !== 5) return 0;

  // Check normal straight: highest - lowest === 4 and all consecutive
  if (unique[0] - unique[4] === 4) return unique[0];

  // Check wheel (A-2-3-4-5): standard only
  if (!shortDeck && unique[0] === 14 && unique[1] === 5 && unique[2] === 4
      && unique[3] === 3 && unique[4] === 2) {
    return 5; // 5-high straight
  }

  // Check short deck A-low: A-6-7-8-9
  if (shortDeck && unique[0] === 14 && unique[1] === 9 && unique[2] === 8
      && unique[3] === 7 && unique[4] === 6) {
    return 9; // 9-high straight
  }

  return 0;
}

/**
 * Evaluate exactly 5 cards and return hand result.
 * @param {Array} cards - Exactly 5 card objects
 * @param {boolean} shortDeck - Whether using short deck rules
 * @returns {{ rank: number, kickers: number[], cards: Array }}
 */
function evaluate5(cards, shortDeck) {
  const values = cards.map((c) => c.value).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);

  // Check flush: all same suit
  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  const straightHigh = getStraightHigh(values, shortDeck);
  const isStraight = straightHigh > 0;

  // Count rank occurrences
  const counts = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  const countEntries = Object.entries(counts)
    .map(([v, c]) => ({ value: Number(v), count: c }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  let rank;
  let kickers;

  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      // A-K-Q-J-T suited = royal flush
      rank = HAND_RANKS.ROYAL_FLUSH;
      kickers = [14];
    } else {
      rank = HAND_RANKS.STRAIGHT_FLUSH;
      kickers = [straightHigh];
    }
  } else if (countEntries[0].count === 4) {
    rank = HAND_RANKS.FOUR_OF_A_KIND;
    kickers = [countEntries[0].value, countEntries[1].value];
  } else if (countEntries[0].count === 3 && countEntries[1].count === 2) {
    rank = HAND_RANKS.FULL_HOUSE;
    kickers = [countEntries[0].value, countEntries[1].value];
  } else if (isFlush) {
    rank = HAND_RANKS.FLUSH;
    kickers = values;
  } else if (isStraight) {
    rank = HAND_RANKS.STRAIGHT;
    kickers = [straightHigh];
  } else if (countEntries[0].count === 3) {
    rank = HAND_RANKS.THREE_OF_A_KIND;
    kickers = [
      countEntries[0].value,
      ...countEntries.slice(1).map((e) => e.value).sort((a, b) => b - a),
    ];
  } else if (countEntries[0].count === 2 && countEntries[1].count === 2) {
    rank = HAND_RANKS.TWO_PAIR;
    const pairs = [countEntries[0].value, countEntries[1].value].sort((a, b) => b - a);
    const kicker = countEntries[2].value;
    kickers = [...pairs, kicker];
  } else if (countEntries[0].count === 2) {
    rank = HAND_RANKS.ONE_PAIR;
    const pairValue = countEntries[0].value;
    const rest = countEntries.slice(1).map((e) => e.value).sort((a, b) => b - a);
    kickers = [pairValue, ...rest];
  } else {
    rank = HAND_RANKS.HIGH_CARD;
    kickers = values;
  }

  // Adjust rank for short deck (swap flush and full house)
  rank = adjustRank(rank, shortDeck);

  return { rank, kickers, cards: [...cards] };
}

/**
 * Evaluate the best 5-card poker hand from 5-7 cards.
 * @param {Array} cards - 5 to 7 card objects
 * @param {object} [options] - Options
 * @param {boolean} [options.shortDeck=false] - Use short deck rankings
 * @returns {{ rank: number, kickers: number[], cards: Array }}
 */
export function evaluateHand(cards, options = {}) {
  const { shortDeck = false } = options;

  if (cards.length === 5) {
    return evaluate5(cards, shortDeck);
  }

  if (cards.length === 6 || cards.length === 7) {
    const combos = combinations5(cards);
    let best = null;
    for (const combo of combos) {
      const result = evaluate5(combo, shortDeck);
      if (!best || compareHands(result, best) > 0) {
        best = result;
      }
    }
    return best;
  }

  throw new Error(`evaluateHand requires 5-7 cards, got ${cards.length}`);
}

/**
 * Compare two hand evaluation results.
 * @param {{ rank: number, kickers: number[] }} a
 * @param {{ rank: number, kickers: number[] }} b
 * @returns {number} Positive if a > b, negative if a < b, 0 if tie
 */
export function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const av = a.kickers[i] || 0;
    const bv = b.kickers[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * Get the Chinese name for a hand evaluation result.
 * @param {{ rank: number }} result - Hand evaluation result
 * @param {boolean} [isShortDeck=false] - Whether using short deck naming
 * @returns {string} Chinese hand name
 */
export function getHandName(result, isShortDeck = false) {
  const names = isShortDeck ? HAND_NAMES_SHORT_DECK : HAND_NAMES_STANDARD;
  return names[result.rank] || '未知';
}
