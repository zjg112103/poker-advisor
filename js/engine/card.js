/**
 * Card types and deck module for poker hand evaluation.
 * Provides card creation, deck generation, seeded shuffle, and card removal.
 */

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const SHORT_RANKS = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];

export const SUIT_SYMBOLS = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
};

export const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/**
 * Create a card object from rank and suit.
 * @param {string} rank - One of RANKS characters
 * @param {string} suit - One of SUITS strings
 * @returns {{ rank: string, suit: string, value: number }}
 */
export function createCard(rank, suit) {
  return { rank, suit, value: RANK_VALUES[rank] };
}

/**
 * Convert a card to a human-readable string like "A♠".
 * @param {{ rank: string, suit: string }} card
 * @returns {string}
 */
export function cardToString(card) {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

/**
 * Convert a card to a unique identifier string like "A_spades".
 * @param {{ rank: string, suit: string }} card
 * @returns {string}
 */
export function cardToId(card) {
  return `${card.rank}_${card.suit}`;
}

/**
 * Create a standard 52-card deck.
 * @returns {Array<{ rank: string, suit: string, value: number }>}
 */
export function createStandardDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

/**
 * Create a short 36-card deck (ranks 6 through A only).
 * @returns {Array<{ rank: string, suit: string, value: number }>}
 */
export function createShortDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of SHORT_RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

/**
 * xorshift32 PRNG - deterministic pseudo-random number generator.
 * @param {number} seed - Initial seed value
 * @returns {function(): number} A function that returns a random 32-bit integer each call
 */
function xorshift32(seed) {
  let state = seed >>> 0; // ensure unsigned 32-bit
  return function () {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

/**
 * Shuffle a deck in-place using a seeded xorshift32 PRNG (Fisher-Yates).
 * @param {Array} deck - The deck array to shuffle
 * @param {number} seed - Seed for deterministic shuffling
 * @returns {Array} The same deck array, shuffled
 */
export function shuffleDeck(deck, seed) {
  const rng = xorshift32(seed);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = rng() % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Return a new deck with the specified cards removed.
 * Uses cardToId for identity comparison.
 * @param {Array} deck - Source deck
 * @param {Array} cards - Cards to remove
 * @returns {Array} New deck array without the removed cards
 */
export function removeCards(deck, cards) {
  const removeIds = new Set(cards.map(cardToId));
  return deck.filter((card) => !removeIds.has(cardToId(card)));
}
