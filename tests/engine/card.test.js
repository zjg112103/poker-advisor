import { describe, it, expect } from 'vitest';
import {
  RANKS,
  SHORT_RANKS,
  SUITS,
  SUIT_SYMBOLS,
  RANK_VALUES,
  createCard,
  cardToString,
  cardToId,
  createStandardDeck,
  createShortDeck,
  shuffleDeck,
  removeCards,
} from '../../js/engine/card.js';

describe('Card Constants', () => {
  it('RANKS has all 13 ranks in correct order', () => {
    expect(RANKS).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']);
    expect(RANKS).toHaveLength(13);
  });

  it('SHORT_RANKS has 9 ranks (6 through A)', () => {
    expect(SHORT_RANKS).toEqual(['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']);
    expect(SHORT_RANKS).toHaveLength(9);
  });

  it('SUITS has 4 suits', () => {
    expect(SUITS).toEqual(['spades', 'hearts', 'diamonds', 'clubs']);
    expect(SUITS).toHaveLength(4);
  });

  it('SUIT_SYMBOLS maps suits to correct symbols', () => {
    expect(SUIT_SYMBOLS).toEqual({
      spades: '\u2660',
      hearts: '\u2665',
      diamonds: '\u2666',
      clubs: '\u2663',
    });
  });

  it('RANK_VALUES maps each rank to its numeric value', () => {
    expect(RANK_VALUES).toEqual({
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
    });
  });
});

describe('createCard', () => {
  it('returns an object with rank, suit, and value', () => {
    const card = createCard('A', 'spades');
    expect(card).toEqual({ rank: 'A', suit: 'spades', value: 14 });
  });

  it('maps T to value 10', () => {
    const card = createCard('T', 'hearts');
    expect(card).toEqual({ rank: 'T', suit: 'hearts', value: 10 });
  });

  it('maps 2 to value 2', () => {
    const card = createCard('2', 'diamonds');
    expect(card).toEqual({ rank: '2', suit: 'diamonds', value: 2 });
  });
});

describe('cardToString', () => {
  it('produces "A\u2660" for ace of spades', () => {
    const card = createCard('A', 'spades');
    expect(cardToString(card)).toBe('A\u2660');
  });

  it('produces "T\u2665" for ten of hearts', () => {
    const card = createCard('T', 'hearts');
    expect(cardToString(card)).toBe('T\u2665');
  });

  it('produces "2\u2666" for two of diamonds', () => {
    const card = createCard('2', 'diamonds');
    expect(cardToString(card)).toBe('2\u2666');
  });

  it('produces "K\u2663" for king of clubs', () => {
    const card = createCard('K', 'clubs');
    expect(cardToString(card)).toBe('K\u2663');
  });
});

describe('cardToId', () => {
  it('produces "A_spades" for ace of spades', () => {
    const card = createCard('A', 'spades');
    expect(cardToId(card)).toBe('A_spades');
  });

  it('produces "T_hearts" for ten of hearts', () => {
    const card = createCard('T', 'hearts');
    expect(cardToId(card)).toBe('T_hearts');
  });
});

describe('createStandardDeck', () => {
  it('has 52 cards', () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(52);
  });

  it('contains every rank-suit combination', () => {
    const deck = createStandardDeck();
    const ids = new Set(deck.map(cardToId));
    for (const rank of RANKS) {
      for (const suit of SUITS) {
        expect(ids.has(`${rank}_${suit}`)).toBe(true);
      }
    }
  });

  it('has no duplicate cards', () => {
    const deck = createStandardDeck();
    const ids = deck.map(cardToId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(52);
  });
});

describe('createShortDeck', () => {
  it('has 36 cards', () => {
    const deck = createShortDeck();
    expect(deck).toHaveLength(36);
  });

  it('contains no cards with ranks 2, 3, 4, 5', () => {
    const deck = createShortDeck();
    const ranks = new Set(deck.map((c) => c.rank));
    expect(ranks.has('2')).toBe(false);
    expect(ranks.has('3')).toBe(false);
    expect(ranks.has('4')).toBe(false);
    expect(ranks.has('5')).toBe(false);
  });

  it('contains only ranks 6 through A', () => {
    const deck = createShortDeck();
    const ranks = new Set(deck.map((c) => c.rank));
    expect(ranks).toEqual(new Set(SHORT_RANKS));
  });

  it('has no duplicate cards', () => {
    const deck = createShortDeck();
    const ids = deck.map(cardToId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(36);
  });
});

describe('shuffleDeck', () => {
  it('returns the same deck object (in-place shuffle)', () => {
    const deck = createStandardDeck();
    const result = shuffleDeck(deck, 12345);
    expect(result).toBe(deck);
  });

  it('contains the same cards after shuffle', () => {
    const deck = createStandardDeck();
    const originalIds = new Set(deck.map(cardToId));
    shuffleDeck(deck, 42);
    const shuffledIds = new Set(deck.map(cardToId));
    expect(shuffledIds).toEqual(originalIds);
  });

  it('produces a different order with a given seed', () => {
    const deck1 = createStandardDeck();
    const deck2 = createStandardDeck();
    shuffleDeck(deck1, 100);
    shuffleDeck(deck2, 200);
    const order1 = deck1.map(cardToId).join(',');
    const order2 = deck2.map(cardToId).join(',');
    expect(order1).not.toBe(order2);
  });

  it('is deterministic with the same seed', () => {
    const deck1 = createStandardDeck();
    const deck2 = createStandardDeck();
    shuffleDeck(deck1, 999);
    shuffleDeck(deck2, 999);
    const order1 = deck1.map(cardToId).join(',');
    const order2 = deck2.map(cardToId).join(',');
    expect(order1).toBe(order2);
  });

  it('still has 52 cards after shuffle', () => {
    const deck = createStandardDeck();
    shuffleDeck(deck, 777);
    expect(deck).toHaveLength(52);
  });
});

describe('removeCards', () => {
  it('returns a new deck without the removed cards', () => {
    const deck = createStandardDeck();
    const toRemove = [createCard('A', 'spades'), createCard('K', 'hearts')];
    const result = removeCards(deck, toRemove);
    expect(result).toHaveLength(50);
  });

  it('does not modify the original deck', () => {
    const deck = createStandardDeck();
    const originalLength = deck.length;
    const toRemove = [createCard('A', 'spades')];
    removeCards(deck, toRemove);
    expect(deck).toHaveLength(originalLength);
  });

  it('removed cards are not present in result', () => {
    const deck = createStandardDeck();
    const toRemove = [createCard('A', 'spades'), createCard('K', 'hearts')];
    const result = removeCards(deck, toRemove);
    const resultIds = new Set(result.map(cardToId));
    expect(resultIds.has('A_spades')).toBe(false);
    expect(resultIds.has('K_hearts')).toBe(false);
  });

  it('preserves all other cards', () => {
    const deck = createStandardDeck();
    const toRemove = [createCard('A', 'spades')];
    const result = removeCards(deck, toRemove);
    const resultIds = new Set(result.map(cardToId));
    expect(resultIds.has('A_hearts')).toBe(true);
    expect(resultIds.has('K_spades')).toBe(true);
    expect(resultIds.has('2_clubs')).toBe(true);
  });

  it('works with short deck', () => {
    const deck = createShortDeck();
    const toRemove = [createCard('6', 'spades'), createCard('A', 'clubs')];
    const result = removeCards(deck, toRemove);
    expect(result).toHaveLength(34);
    const resultIds = new Set(result.map(cardToId));
    expect(resultIds.has('6_spades')).toBe(false);
    expect(resultIds.has('A_clubs')).toBe(false);
  });
});
