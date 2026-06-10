/**
 * Tests for Monte Carlo equity calculation engine.
 */
import { describe, it, expect } from 'vitest';
import { calculateEquity, calculatePotOdds } from '../../js/engine/monte-carlo.js';
import { createCard } from '../../js/engine/card.js';

const c = (rank, suit) => createCard(rank, suit);

describe('calculateEquity', () => {
  it('AA vs KK should be ~80% equity (standard deck)', async () => {
    const result = await calculateEquity(
      [[c('A', 'spades'), c('A', 'hearts')]],
      [[c('K', 'spades'), c('K', 'hearts')]],
      [],
      { iterations: 5000, shortDeck: false, numRandomOpponents: 0 }
    );
    expect(result.equities[0]).toBeGreaterThan(0.75);
    expect(result.equities[0]).toBeLessThan(0.87);
    expect(result.iterations).toBe(5000);
  });

  it('AA vs KK should be ~77% equity (short deck)', async () => {
    const result = await calculateEquity(
      [[c('A', 'spades'), c('A', 'hearts')]],
      [[c('K', 'spades'), c('K', 'hearts')]],
      [],
      { iterations: 5000, shortDeck: true, numRandomOpponents: 0 }
    );
    expect(result.equities[0]).toBeGreaterThan(0.70);
    expect(result.equities[0]).toBeLessThan(0.82);
    expect(result.iterations).toBe(5000);
  });

  it('equity changes after flop (AK with draws)', async () => {
    // AK offsuit on a flop with straight and flush potential
    // Flop: Qs Js 2c - gives straight draw (needs T) but no flush draw
    const flop = [c('Q', 'spades'), c('J', 'spades'), c('2', 'clubs')];

    const preFlopResult = await calculateEquity(
      [[c('A', 'spades'), c('K', 'hearts')]],
      [],
      [],
      { iterations: 3000, shortDeck: false, numRandomOpponents: 1 }
    );

    const postFlopResult = await calculateEquity(
      [[c('A', 'spades'), c('K', 'hearts')]],
      [],
      flop,
      { iterations: 3000, shortDeck: false, numRandomOpponents: 1 }
    );

    // Post-flop equity should be different from pre-flop
    // With a good flop (straight draw), equity should generally improve
    expect(preFlopResult.equities[0]).toBeGreaterThan(0);
    expect(postFlopResult.equities[0]).toBeGreaterThan(0);
    // The equities should meaningfully differ (not identical)
    expect(Math.abs(postFlopResult.equities[0] - preFlopResult.equities[0])).toBeGreaterThan(0.01);
  });

  it('handles multiple opponents (AA vs 2 random hands, still > 50%)', async () => {
    const result = await calculateEquity(
      [[c('A', 'spades'), c('A', 'hearts')]],
      [],
      [],
      { iterations: 5000, shortDeck: false, numRandomOpponents: 2 }
    );
    expect(result.equities[0]).toBeGreaterThan(0.50);
  });

  it('unknown opponents (AK vs random > 55%)', async () => {
    const result = await calculateEquity(
      [[c('A', 'spades'), c('K', 'hearts')]],
      [],
      [],
      { iterations: 5000, shortDeck: false, numRandomOpponents: 1 }
    );
    expect(result.equities[0]).toBeGreaterThan(0.55);
  });

  it('performance: 10K iterations with 3 random opponents < 3 seconds', async () => {
    const start = Date.now();
    await calculateEquity(
      [[c('A', 'spades'), c('K', 'hearts')]],
      [],
      [],
      { iterations: 10000, shortDeck: false, numRandomOpponents: 3 }
    );
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  it('returns handTypeCounts', async () => {
    const result = await calculateEquity(
      [[c('A', 'spades'), c('A', 'hearts')]],
      [],
      [],
      { iterations: 1000, shortDeck: false, numRandomOpponents: 1 }
    );
    expect(result.handTypeCounts).toBeDefined();
    expect(result.handTypeCounts.length).toBe(2); // holeCards player + 1 random opponent
    expect(typeof result.handTypeCounts[0]).toBe('object');
  });
});

describe('calculatePotOdds', () => {
  it('calculates correct pot odds', () => {
    // Call 100 into a pot of 200: 100 / (200 + 100) = 33.33%
    const odds = calculatePotOdds(200, 100);
    expect(odds).toBeCloseTo(33.33, 1);
  });

  it('returns 0 when callAmount is 0', () => {
    expect(calculatePotOdds(100, 0)).toBe(0);
  });

  it('calculates correct pot odds for even money', () => {
    // Call 100 into a pot of 100: 100 / (100 + 100) = 50%
    const odds = calculatePotOdds(100, 100);
    expect(odds).toBeCloseTo(50, 0);
  });
});
