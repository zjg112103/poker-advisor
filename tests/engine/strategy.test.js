import { describe, it, expect } from 'vitest';
import { getRecommendation, getPreflopRecommendation } from '../../js/engine/strategy.js';

describe('getRecommendation', () => {
  it('FOLD when equity much lower than pot odds', () => {
    const result = getRecommendation({
      equity: 20,
      potOdds: 33,
      potSize: 100,
      callAmount: 50,
      stage: 'flop',
      position: 'MP',
      isShortDeck: false,
      numPlayers: 4,
    });

    expect(result.action).toBe('FOLD');
    expect(result.confidence).toBeDefined();
    expect(result.reason).toBeTruthy();
  });

  it('CALL when equity slightly above pot odds', () => {
    const result = getRecommendation({
      equity: 40,
      potOdds: 33,
      potSize: 100,
      callAmount: 50,
      stage: 'flop',
      position: 'MP',
      isShortDeck: false,
      numPlayers: 4,
    });

    expect(result.action).toBe('CALL');
    expect(result.confidence).toBe('MEDIUM');
  });

  it('RAISE when equity much higher than pot odds', () => {
    const result = getRecommendation({
      equity: 75,
      potOdds: 33,
      potSize: 100,
      callAmount: 50,
      stage: 'flop',
      position: 'BTN',
      isShortDeck: false,
      numPlayers: 3,
    });

    expect(result.action).toBe('RAISE');
    expect(result.raiseAmount).toBeDefined();
    expect(result.raiseAmount).toBeGreaterThan(0);
  });

  it('RAISE with suggested amount (80% vs 25%, potSize=200, callAmount=50)', () => {
    const result = getRecommendation({
      equity: 80,
      potOdds: 25,
      potSize: 200,
      callAmount: 50,
      stage: 'flop',
      position: 'CO',
      isShortDeck: false,
      numPlayers: 2,
    });

    expect(result.action).toBe('RAISE');
    expect(result.raiseAmount).toBeDefined();
    expect(result.raiseAmount).toBeGreaterThan(0);
    // Raise amount should be based on potSize
    expect(result.raiseAmount).toBeGreaterThan(100);
  });

  it('CHECK when callAmount=0 and equity is low (30%)', () => {
    const result = getRecommendation({
      equity: 30,
      potOdds: 0,
      potSize: 100,
      callAmount: 0,
      stage: 'flop',
      position: 'BB',
      isShortDeck: false,
      numPlayers: 3,
    });

    expect(result.action).toBe('CHECK');
  });

  it('BET when callAmount=0 and equity is high (>60%)', () => {
    const result = getRecommendation({
      equity: 70,
      potOdds: 0,
      potSize: 100,
      callAmount: 0,
      stage: 'flop',
      position: 'BTN',
      isShortDeck: false,
      numPlayers: 3,
    });

    expect(result.action).toBe('BET');
    expect(result.betAmount).toBeDefined();
    expect(result.betAmount).toBe(50); // potSize * 0.5
  });

  it('provides confidence level (HIGH/MEDIUM/LOW)', () => {
    const validConfidences = ['HIGH', 'MEDIUM', 'LOW'];

    const result1 = getRecommendation({
      equity: 50,
      potOdds: 30,
      potSize: 100,
      callAmount: 50,
      stage: 'flop',
      position: 'MP',
      isShortDeck: false,
      numPlayers: 3,
    });
    expect(validConfidences).toContain(result1.confidence);

    const result2 = getRecommendation({
      equity: 45,
      potOdds: 40,
      potSize: 100,
      callAmount: 50,
      stage: 'turn',
      position: 'MP',
      isShortDeck: false,
      numPlayers: 3,
    });
    expect(validConfidences).toContain(result2.confidence);
  });
});

describe('getPreflopRecommendation', () => {
  it('returns valid action for a strong hand', () => {
    const result = getPreflopRecommendation({
      holeCards: [
        { rank: 'A', suit: 'spades', value: 14 },
        { rank: 'K', suit: 'hearts', value: 13 },
      ],
      position: 'BTN',
      numPlayers: 6,
      isShortDeck: false,
      actions: [],
    });

    expect(['RAISE', 'CALL', 'FOLD']).toContain(result.action);
    expect(result.confidence).toBeDefined();
    expect(result.reason).toBeTruthy();
  });

  it('FOLD with weak hand in early position', () => {
    const result = getPreflopRecommendation({
      holeCards: [
        { rank: '2', suit: 'spades', value: 2 },
        { rank: '7', suit: 'hearts', value: 7 },
      ],
      position: 'UTG',
      numPlayers: 9,
      isShortDeck: false,
      actions: [],
    });

    expect(result.action).toBe('FOLD');
  });

  it('RAISE with pocket aces', () => {
    const result = getPreflopRecommendation({
      holeCards: [
        { rank: 'A', suit: 'spades', value: 14 },
        { rank: 'A', suit: 'hearts', value: 14 },
      ],
      position: 'MP',
      numPlayers: 6,
      isShortDeck: false,
      actions: [],
    });

    expect(result.action).toBe('RAISE');
  });
});
