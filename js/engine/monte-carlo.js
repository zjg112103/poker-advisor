/**
 * Monte Carlo equity calculation engine for poker hand evaluation.
 * Simulates random board runouts and opponent hands to estimate win probability.
 */
import {
  createStandardDeck,
  createShortDeck,
  shuffleDeck,
  removeCards,
} from './card.js';
import { evaluateHand, compareHands, getHandName } from './hand-evaluator.js';
import { isHandInRange } from './ranges.js';

/**
 * Calculate hand equity using Monte Carlo simulation.
 *
 * @param {Array<Array>} holeCards - Player hands: [[card, card], ...]
 * @param {Array<Array>} knownOpponents - Known opponent hands: [[card, card], ...]
 * @param {Array} board - Community cards already dealt (0-5 cards)
 * @param {object} options - Simulation options
 * @param {number} options.iterations - Number of simulation iterations
 * @param {boolean} [options.shortDeck=false] - Use short deck (36 cards)
 * @param {number} [options.numRandomOpponents=0] - Number of unknown opponents to simulate
 * @param {Array<number>} [options.opponentRanges=[]] - Range % for each random opponent (0-100). 100 = any hand.
 * @returns {Promise<{ equities: number[], handTypeCounts: object[], iterations: number }>}
 */
export function calculateEquity(holeCards, knownOpponents, board, options = {}) {
  const {
    iterations = 1000,
    shortDeck = false,
    numRandomOpponents = 0,
    opponentRanges = [],
  } = options;

  const numHole = holeCards.length;
  const numKnown = knownOpponents.length;
  const numPlayers = numHole + numKnown + numRandomOpponents;
  const boardCardsNeeded = 5 - board.length;
  const boardLen = board.length;

  // Build remaining deck by removing all known cards
  const knownCards = [
    ...holeCards.flat(),
    ...knownOpponents.flat(),
    ...board,
  ];
  const fullDeck = shortDeck ? createShortDeck() : createStandardDeck();
  const remainingDeck = removeCards(fullDeck, knownCards);

  // Counters
  const wins = new Array(numPlayers).fill(0);
  const tieShares = new Array(numPlayers).fill(0);
  const handTypeCounts = new Array(numPlayers).fill(null).map(() => ({}));

  // Pre-allocate reusable structures
  const allHands = new Array(numPlayers);
  for (let i = 0; i < numHole; i++) allHands[i] = holeCards[i];
  for (let i = 0; i < numKnown; i++) allHands[numHole + i] = knownOpponents[i];

  const fullBoard = new Array(5);
  for (let b = 0; b < boardLen; b++) fullBoard[b] = board[b];

  // Main simulation loop
  for (let iter = 0; iter < iterations; iter++) {
    const deck = shuffleDeck([...remainingDeck], iter * 31337 + 7919);
    let di = 0;

    // Deal random opponent hands (with optional range filtering).
    // Each opponent always consumes exactly 2 cards from the deck.
    // For range-constrained opponents, we try to swap with a later pair
    // that matches the range — no extra card consumption.
    for (let i = 0; i < numRandomOpponents; i++) {
      const rangePercent = opponentRanges[i] || 100;
      // Take the next 2 cards as the base hand
      const c1 = deck[di];
      const c2 = deck[di + 1];
      di += 2;

      if (rangePercent < 100 && !isHandInRange(c1, c2, rangePercent)) {
        // Try to find a swap partner in the remaining undealt cards
        let swapped = false;
        for (let scan = di; scan + 1 < deck.length && !swapped; scan += 2) {
          if (isHandInRange(deck[scan], deck[scan + 1], rangePercent)) {
            // Swap: put dealt cards at scan position, use scan cards as hand
            deck[scan] = c1;
            deck[scan + 1] = c2;
            allHands[numHole + numKnown + i] = [deck[scan], deck[scan + 1]];
            // Actually we want the scan cards, so swap properly:
            const s1 = deck[scan], s2 = deck[scan + 1];
            deck[scan] = c1;
            deck[scan + 1] = c2;
            allHands[numHole + numKnown + i] = [s1, s2];
            swapped = true;
          }
        }
        if (!swapped) {
          // No matching pair found — use the dealt cards as-is (soft constraint)
          allHands[numHole + numKnown + i] = [c1, c2];
        }
      } else {
        allHands[numHole + numKnown + i] = [c1, c2];
      }
    }

    // Deal remaining board cards
    for (let b = 0; b < boardCardsNeeded; b++) {
      fullBoard[boardLen + b] = deck[di++];
    }

    // Evaluate each player's best 5-card hand from 7 cards
    const evaluations = new Array(numPlayers);
    for (let p = 0; p < numPlayers; p++) {
      const h = allHands[p];
      evaluations[p] = evaluateHand(
        [h[0], h[1], fullBoard[0], fullBoard[1], fullBoard[2], fullBoard[3], fullBoard[4]],
        { shortDeck }
      );
    }

    // Track hand types for hole cards players
    for (let p = 0; p < numHole; p++) {
      const name = getHandName(evaluations[p], shortDeck);
      handTypeCounts[p][name] = (handTypeCounts[p][name] || 0) + 1;
    }

    // Find the best hand
    let bestIdx = 0;
    for (let i = 1; i < numPlayers; i++) {
      if (compareHands(evaluations[i], evaluations[bestIdx]) > 0) {
        bestIdx = i;
      }
    }

    // Count winners (check for ties)
    let winnerCount = 0;
    for (let i = 0; i < numPlayers; i++) {
      if (compareHands(evaluations[i], evaluations[bestIdx]) === 0) {
        winnerCount++;
      }
    }

    // Record results
    if (winnerCount === 1) {
      wins[bestIdx]++;
    } else {
      for (let i = 0; i < numPlayers; i++) {
        if (compareHands(evaluations[i], evaluations[bestIdx]) === 0) {
          tieShares[i] += 1 / winnerCount;
        }
      }
    }
  }

  // Calculate equities: (wins + tieShares) / iterations
  const equities = new Array(numPlayers);
  for (let i = 0; i < numPlayers; i++) {
    equities[i] = (wins[i] + tieShares[i]) / iterations;
  }

  return Promise.resolve({ equities, handTypeCounts, iterations });
}

/**
 * Calculate the required equity percentage based on pot odds.
 *
 * @param {number} potSize - Current pot size
 * @param {number} callAmount - Amount needed to call
 * @returns {number} Required equity as a percentage (0-100)
 */
export function calculatePotOdds(potSize, callAmount) {
  if (callAmount === 0) return 0;
  return (callAmount / (potSize + callAmount)) * 100;
}
