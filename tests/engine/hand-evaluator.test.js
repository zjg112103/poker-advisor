/**
 * Tests for hand-evaluator module.
 * Covers all 10 hand rankings, compareHands, and short deck differences.
 */
import { describe, it, expect } from 'vitest';
import { createCard } from '../../js/engine/card.js';
import {
  evaluateHand,
  compareHands,
  getHandName,
} from '../../js/engine/hand-evaluator.js';

const c = (rank, suit) => createCard(rank, suit);

describe('hand-evaluator', () => {
  // ---------------------------------------------------------------
  // 1. Royal flush (rank 9)
  // ---------------------------------------------------------------
  it('detects royal flush', () => {
    const cards = [
      c('T', 'spades'), c('J', 'spades'), c('Q', 'spades'),
      c('K', 'spades'), c('A', 'spades'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(9);
  });

  // ---------------------------------------------------------------
  // 2. Straight flush (rank 8)
  // ---------------------------------------------------------------
  it('detects straight flush', () => {
    const cards = [
      c('5', 'hearts'), c('6', 'hearts'), c('7', 'hearts'),
      c('8', 'hearts'), c('9', 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(8);
  });

  // ---------------------------------------------------------------
  // 3. Four of a kind (rank 7)
  // ---------------------------------------------------------------
  it('detects four of a kind', () => {
    const cards = [
      c('K', 'spades'), c('K', 'hearts'), c('K', 'diamonds'),
      c('K', 'clubs'), c('2', 'spades'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(7);
  });

  // ---------------------------------------------------------------
  // 4. Full house (rank 6 standard)
  // ---------------------------------------------------------------
  it('detects full house', () => {
    const cards = [
      c('Q', 'spades'), c('Q', 'hearts'), c('Q', 'diamonds'),
      c('J', 'spades'), c('J', 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(6);
  });

  // ---------------------------------------------------------------
  // 5. Flush (rank 5 standard)
  // ---------------------------------------------------------------
  it('detects flush', () => {
    const cards = [
      c('2', 'clubs'), c('5', 'clubs'), c('7', 'clubs'),
      c('J', 'clubs'), c('A', 'clubs'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(5);
  });

  // ---------------------------------------------------------------
  // 6. Straight (rank 4) including A-low wheel
  // ---------------------------------------------------------------
  it('detects straight', () => {
    const cards = [
      c('7', 'spades'), c('8', 'hearts'), c('9', 'diamonds'),
      c('T', 'clubs'), c('J', 'spades'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(4);
  });

  it('detects A-2-3-4-5 wheel straight (standard)', () => {
    const cards = [
      c('A', 'spades'), c('2', 'hearts'), c('3', 'diamonds'),
      c('4', 'clubs'), c('5', 'spades'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(4);
  });

  // ---------------------------------------------------------------
  // 7. Three of a kind (rank 3)
  // ---------------------------------------------------------------
  it('detects three of a kind', () => {
    const cards = [
      c('8', 'spades'), c('8', 'hearts'), c('8', 'diamonds'),
      c('2', 'clubs'), c('K', 'spades'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(3);
  });

  // ---------------------------------------------------------------
  // 8. Two pair (rank 2)
  // ---------------------------------------------------------------
  it('detects two pair', () => {
    const cards = [
      c('J', 'spades'), c('J', 'hearts'), c('3', 'diamonds'),
      c('3', 'clubs'), c('A', 'spades'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(2);
  });

  // ---------------------------------------------------------------
  // 9. One pair (rank 1)
  // ---------------------------------------------------------------
  it('detects one pair', () => {
    const cards = [
      c('9', 'spades'), c('9', 'hearts'), c('2', 'diamonds'),
      c('5', 'clubs'), c('K', 'spades'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(1);
  });

  // ---------------------------------------------------------------
  // 10. High card (rank 0)
  // ---------------------------------------------------------------
  it('detects high card', () => {
    const cards = [
      c('2', 'spades'), c('5', 'hearts'), c('7', 'diamonds'),
      c('J', 'clubs'), c('K', 'spades'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(0);
  });

  // ---------------------------------------------------------------
  // 11. compareHands works correctly
  // ---------------------------------------------------------------
  describe('compareHands', () => {
    it('returns positive when first hand wins', () => {
      const a = evaluateHand([
        c('T', 'spades'), c('J', 'spades'), c('Q', 'spades'),
        c('K', 'spades'), c('A', 'spades'),
      ]);
      const b = evaluateHand([
        c('9', 'hearts'), c('9', 'diamonds'), c('2', 'clubs'),
        c('5', 'spades'), c('K', 'hearts'),
      ]);
      expect(compareHands(a, b)).toBeGreaterThan(0);
    });

    it('returns negative when second hand wins', () => {
      const a = evaluateHand([
        c('2', 'spades'), c('5', 'hearts'), c('7', 'diamonds'),
        c('J', 'clubs'), c('K', 'spades'),
      ]);
      const b = evaluateHand([
        c('K', 'spades'), c('K', 'hearts'), c('K', 'diamonds'),
        c('K', 'clubs'), c('2', 'spades'),
      ]);
      expect(compareHands(a, b)).toBeLessThan(0);
    });

    it('returns 0 on tie', () => {
      const a = evaluateHand([
        c('A', 'spades'), c('K', 'spades'), c('Q', 'spades'),
        c('J', 'spades'), c('T', 'spades'),
      ]);
      const b = evaluateHand([
        c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts'),
        c('J', 'hearts'), c('T', 'hearts'),
      ]);
      expect(compareHands(a, b)).toBe(0);
    });

    it('resolves kicker differences within same rank', () => {
      const a = evaluateHand([
        c('A', 'spades'), c('A', 'hearts'), c('K', 'diamonds'),
        c('2', 'clubs'), c('3', 'spades'),
      ]);
      const b = evaluateHand([
        c('A', 'diamonds'), c('A', 'clubs'), c('Q', 'spades'),
        c('2', 'hearts'), c('3', 'diamonds'),
      ]);
      // Both are one pair of Aces, but a has K kicker vs Q kicker
      expect(compareHands(a, b)).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------
  // 12. Short deck: flush beats full house
  // ---------------------------------------------------------------
  describe('short deck ranking differences', () => {
    it('flush beats full house in short deck', () => {
      const flushHand = evaluateHand(
        [
          c('6', 'spades'), c('7', 'spades'), c('8', 'spades'),
          c('T', 'spades'), c('K', 'spades'),
        ],
        { shortDeck: true },
      );
      const fullHouseHand = evaluateHand(
        [
          c('Q', 'spades'), c('Q', 'hearts'), c('Q', 'diamonds'),
          c('J', 'spades'), c('J', 'hearts'),
        ],
        { shortDeck: true },
      );
      expect(compareHands(flushHand, fullHouseHand)).toBeGreaterThan(0);
    });

    // ---------------------------------------------------------------
    // 13. Short deck: A-6-7-8-9 is a valid straight
    // ---------------------------------------------------------------
    it('A-6-7-8-9 is a valid straight in short deck', () => {
      const cards = [
        c('A', 'spades'), c('6', 'hearts'), c('7', 'diamonds'),
        c('8', 'clubs'), c('9', 'spades'),
      ];
      const result = evaluateHand(cards, { shortDeck: true });
      expect(result.rank).toBe(4);
    });

    it('A-2-3-4-5 is NOT a straight in short deck', () => {
      const cards = [
        c('A', 'spades'), c('2', 'hearts'), c('3', 'diamonds'),
        c('4', 'clubs'), c('5', 'spades'),
      ];
      const result = evaluateHand(cards, { shortDeck: true });
      expect(result.rank).not.toBe(4);
    });

    // ---------------------------------------------------------------
    // 14. Standard: full house beats flush (confirm opposite)
    // ---------------------------------------------------------------
    it('full house beats flush in standard deck', () => {
      const fullHouseHand = evaluateHand([
        c('Q', 'spades'), c('Q', 'hearts'), c('Q', 'diamonds'),
        c('J', 'spades'), c('J', 'hearts'),
      ]);
      const flushHand = evaluateHand([
        c('2', 'spades'), c('5', 'spades'), c('7', 'spades'),
        c('J', 'spades'), c('A', 'spades'),
      ]);
      expect(compareHands(fullHouseHand, flushHand)).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------
  // Extra: 6-7 card enumeration (best of C(n,5))
  // ---------------------------------------------------------------
  describe('6-7 card enumeration', () => {
    it('finds best hand from 6 cards', () => {
      // 5 cards are high card, but 6th card makes a pair
      const cards = [
        c('2', 'spades'), c('5', 'hearts'), c('7', 'diamonds'),
        c('J', 'clubs'), c('K', 'spades'), c('K', 'hearts'),
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(1); // pair of Ks
    });

    it('finds best hand from 7 cards', () => {
      // 7 cards contain a flush
      const cards = [
        c('2', 'spades'), c('5', 'spades'), c('9', 'spades'),
        c('J', 'spades'), c('A', 'spades'),
        c('K', 'hearts'), c('3', 'diamonds'),
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(5); // flush in spades
    });
  });

  // ---------------------------------------------------------------
  // getHandName Chinese names
  // ---------------------------------------------------------------
  describe('getHandName', () => {
    it('returns correct Chinese name for each rank', () => {
      const cases = [
        { cards: [c('2', 'spades'), c('5', 'hearts'), c('7', 'diamonds'), c('J', 'clubs'), c('K', 'spades')], expected: '高牌' },
        { cards: [c('9', 'spades'), c('9', 'hearts'), c('2', 'diamonds'), c('5', 'clubs'), c('K', 'spades')], expected: '一对' },
        { cards: [c('J', 'spades'), c('J', 'hearts'), c('3', 'diamonds'), c('3', 'clubs'), c('A', 'spades')], expected: '两对' },
        { cards: [c('8', 'spades'), c('8', 'hearts'), c('8', 'diamonds'), c('2', 'clubs'), c('K', 'spades')], expected: '三条' },
        { cards: [c('7', 'spades'), c('8', 'hearts'), c('9', 'diamonds'), c('T', 'clubs'), c('J', 'spades')], expected: '顺子' },
        { cards: [c('2', 'clubs'), c('5', 'clubs'), c('7', 'clubs'), c('J', 'clubs'), c('A', 'clubs')], expected: '同花' },
        { cards: [c('Q', 'spades'), c('Q', 'hearts'), c('Q', 'diamonds'), c('J', 'spades'), c('J', 'hearts')], expected: '葫芦' },
        { cards: [c('K', 'spades'), c('K', 'hearts'), c('K', 'diamonds'), c('K', 'clubs'), c('2', 'spades')], expected: '四条' },
        { cards: [c('5', 'hearts'), c('6', 'hearts'), c('7', 'hearts'), c('8', 'hearts'), c('9', 'hearts')], expected: '同花顺' },
        { cards: [c('T', 'spades'), c('J', 'spades'), c('Q', 'spades'), c('K', 'spades'), c('A', 'spades')], expected: '皇家同花顺' },
      ];
      for (const { cards, expected } of cases) {
        const result = evaluateHand(cards);
        expect(getHandName(result)).toBe(expected);
      }
    });

    it('returns correct Chinese name with short deck flush/full house swap', () => {
      const flushCards = [
        c('6', 'spades'), c('7', 'spades'), c('8', 'spades'),
        c('T', 'spades'), c('K', 'spades'),
      ];
      const result = evaluateHand(flushCards, { shortDeck: true });
      // In short deck, flush rank value is 6, getHandName should still return 同花
      expect(getHandName(result, true)).toBe('同花');
    });
  });
});
