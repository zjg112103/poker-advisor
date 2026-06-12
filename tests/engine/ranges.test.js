import { describe, it, expect } from 'vitest';
import {
  shortDeckHandScore,
  getRangePercent,
  blockerAdjustedRange,
  isHandInRange,
} from '../../js/engine/ranges.js';
import { createCard } from '../../js/engine/card.js';

const c = (rank, suit) => createCard(rank, suit);

describe('Short Deck Hand Scoring', () => {
  it('AA scores highest', () => {
    expect(shortDeckHandScore(c('A', 'spades'), c('A', 'hearts'))).toBe(100);
  });

  it('KK scores second highest', () => {
    expect(shortDeckHandScore(c('K', 'spades'), c('K', 'hearts'))).toBe(93);
  });

  it('suited hands score higher than offsuit', () => {
    const suited = shortDeckHandScore(c('A', 'spades'), c('K', 'spades'));
    const offsuit = shortDeckHandScore(c('A', 'spades'), c('K', 'hearts'));
    expect(suited).toBeGreaterThan(offsuit);
  });

  it('connected hands score higher than gapped', () => {
    const connected = shortDeckHandScore(c('J', 'spades'), c('T', 'hearts'));
    const gapped = shortDeckHandScore(c('J', 'spades'), c('7', 'hearts'));
    expect(connected).toBeGreaterThan(gapped);
  });

  it('66 is the weakest pair', () => {
    expect(shortDeckHandScore(c('6', 'spades'), c('6', 'hearts'))).toBe(44);
  });
});

describe('Blocker Adjusted Range', () => {
  it('AA gives bigger adjustment than 72o for UTG', () => {
    const aaAdj = blockerAdjustedRange([c('A', 'spades'), c('A', 'hearts')], 'UTG', 'raise');
    const weakAdj = blockerAdjustedRange([c('7', 'spades'), c('2', 'hearts')], 'UTG', 'raise');
    expect(aaAdj).toBeGreaterThan(weakAdj);
  });

  it('AKs gives bigger adjustment than AKo (suit blocker)', () => {
    const suitedAdj = blockerAdjustedRange([c('A', 'spades'), c('K', 'spades')], 'CO', 'raise');
    const offsuitAdj = blockerAdjustedRange([c('A', 'spades'), c('K', 'hearts')], 'CO', 'raise');
    expect(suitedAdj).toBeGreaterThan(offsuitAdj);
  });

  it('returns base range when no hole cards (100% range)', () => {
    const base = getRangePercent('BTN', 'raise');
    const adjusted = blockerAdjustedRange([c('2', 'spades'), c('3', 'hearts')], 'BTN', 'raise');
    // Weak cards still give small bonus (connected +1), but should be close
    expect(adjusted).toBeGreaterThanOrEqual(base);
    expect(adjusted).toBeLessThanOrEqual(base + 5);
  });

  it('pair QQ+ gives significant bonus', () => {
    const base = getRangePercent('MP', 'raise');
    const adjusted = blockerAdjustedRange([c('Q', 'spades'), c('Q', 'hearts')], 'MP', 'raise');
    // QQ: pair bonus +3, queen is not ace/king so no high card bonus
    expect(adjusted).toBe(base + 3);
  });

  it('AA gives maximum bonus', () => {
    const base = getRangePercent('UTG', 'raise'); // 15
    const adjusted = blockerAdjustedRange([c('A', 'spades'), c('A', 'hearts')], 'UTG', 'raise');
    // AA: pair bonus +3 (pair >= 12), ace bonus +3 (high=14) = +6
    expect(adjusted).toBe(base + 6);
  });

  it('facing fold returns 0 unchanged', () => {
    const adjusted = blockerAdjustedRange([c('A', 'spades'), c('A', 'hearts')], 'UTG', 'fold');
    expect(adjusted).toBe(0);
  });

  it('facing check returns 100 unchanged', () => {
    const adjusted = blockerAdjustedRange([c('A', 'spades'), c('A', 'hearts')], 'UTG', 'check');
    expect(adjusted).toBe(100);
  });

  it('result is capped at 100', () => {
    // BTN raise is already 45%, even max bonus shouldn't exceed 100
    const adjusted = blockerAdjustedRange([c('A', 'spades'), c('A', 'hearts')], 'BTN', 'raise');
    expect(adjusted).toBeLessThanOrEqual(100);
  });
});

describe('Blocker effect on simulation accuracy', () => {
  it('hero with AA widens opponent ranges compared to hero with 72o', () => {
    // UTG open range is 15%
    const utgBase = getRangePercent('UTG', 'raise');

    const adjWithAA = blockerAdjustedRange([c('A', 'spades'), c('A', 'hearts')], 'UTG', 'raise');
    const adjWith72 = blockerAdjustedRange([c('7', 'spades'), c('2', 'hearts')], 'UTG', 'raise');

    // AA should widen opponent range more (blocks more premium hands)
    expect(adjWithAA).toBeGreaterThan(adjWith72);

    // Both should be >= base (blocker effect only widens range)
    expect(adjWithAA).toBeGreaterThanOrEqual(utgBase);
    expect(adjWith72).toBeGreaterThanOrEqual(utgBase);
  });
});
